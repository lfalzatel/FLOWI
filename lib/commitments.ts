import { Debt, Reminder, Transaction, isFixedExpenseCategory } from './firestore';
import { dateKey, isPayable, lastPaymentFor, monthlyOccursIn } from './reminderDue';
import { aliasKey } from './categories';

// Próximos compromisos del mes: pagos fijos que aún no aparecen registrados este mes.
// Salen de dos fuentes que se cruzan entre sí:
//  - los gastos fijos del mes pasado (de ahí sale el valor y el día habitual)
//  - los recordatorios mensuales o de una vez (de ahí sale la fecha exacta de vencimiento)
//  - las cuotas de deudas con día de pago (se cubren al registrar un abono ese mes)
// Un compromiso desaparece cuando se registra un gasto fijo parecido este mes, cuando el
// recordatorio se marca con "Ya lo pagué" o cuando la persona lo omite para este mes.

export interface Commitment {
  key: string;               // estable dentro del mes, sirve para omitirlo
  title: string;
  category: string;
  dueDate: Date;
  amount: number | null;     // lo pagado el mes pasado; null si solo hay recordatorio
  reminder?: Reminder;       // si viene (o se cruzó) con un recordatorio
  debt?: Debt;               // cuota de una deuda: se paga registrando un abono
  exactDate: boolean;        // true = fecha del recordatorio; false = día habitual de pago
  daysLeft: number;          // negativo = ya pasó la fecha
}

// Compromiso del mes que ya quedó cubierto (para la lista "Ya pagados")
export interface PaidCommitment {
  key: string;
  title: string;
  category: string;
  dueDate: Date;
  amount: number | null;     // lo que se pagó (o el valor esperado si se marcó a mano)
  paidAt: Date | null;       // cuándo se registró el pago (null = marcado con "Ya lo pagué")
  how: 'registrado' | 'marcado' | 'abono';
}

export interface CommitmentsSummary {
  pending: Commitment[];
  pendingTotal: number;      // suma de los que tienen valor conocido
  paidCount: number;         // compromisos de este mes que ya están cubiertos
  paid: PaidCommitment[];
  month: string;             // YYYY-MM del cálculo
}

// Palabras que no ayudan a reconocer un pago ("Admin septiembre" vs "Administración noviembre")
const STOPWORDS = new Set([
  'pago', 'pagar', 'cuota', 'mensual', 'factura', 'para', 'del', 'los', 'las', 'con', 'mes',
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre',
  'setiembre', 'octubre', 'noviembre', 'diciembre',
]);

// Minúsculas, sin tildes y con nombres repetidos unificados (Play Store = Google Play)
function normalize(s: string): string {
  return aliasKey(s);
}

function tokens(...parts: (string | undefined)[]): string[] {
  const out = new Set<string>();
  for (const p of parts) {
    for (const w of normalize(p || '').split(/[^a-z0-9]+/)) {
      if (w.length >= 4 && !STOPWORDS.has(w) && !/^\d+$/.test(w)) out.add(w);
    }
  }
  return Array.from(out);
}

// "music" ~ "musica", "admin" ~ "administracion"
function sameWord(a: string, b: string): boolean {
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.length >= 5 && long.startsWith(short);
}

function toDate(v: any): Date {
  if (v instanceof Date) return v;
  if (v && typeof v.toDate === 'function') return v.toDate();
  return new Date(v);
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function dayInMonth(year: number, month: number, day: number): Date {
  const last = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, last));
}

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Entrada para omitir un compromiso solo en un mes ("2026-11|epm")
export function skipEntry(month: string, key: string): string {
  return `${month}|${key}`;
}

const isFixedTx = (t: Transaction) => t.type === 'gasto' && (t.isFixed !== undefined ? t.isFixed : isFixedExpenseCategory(t.category));

interface Group {
  key: string;
  category: string;
  title: string;
  amount: number;
  day: number;
  words: string[];
  txs: { amount: number; words: string[] }[];
  merchants: Set<string>;    // comercios de esos pagos (para cruzar recordatorios con comercio)
}

export function getCommitments(
  transactions: Transaction[],
  reminders: Reminder[],
  skipped: string[] = [],
  now = new Date(),
  debts: Debt[] = [],
): CommitmentsSummary {
  const today = startOfDay(now);
  const year = today.getFullYear();
  const month = today.getMonth();
  const thisMonth = monthKey(today);
  const lastMonth = monthKey(new Date(year, month - 1, 1));

  const fixedThisMonth: Transaction[] = [];
  const fixedLastMonth: Transaction[] = [];
  for (const t of transactions) {
    if (!isFixedTx(t)) continue;
    const m = monthKey(toDate(t.date));
    if (m === thisMonth) fixedThisMonth.push(t);
    else if (m === lastMonth) fixedLastMonth.push(t);
  }

  // 1. Pagos fijos del mes pasado, agrupados por categoría (dos facturas de Claro = un compromiso)
  const byCategory = new Map<string, Group>();
  for (const t of fixedLastMonth) {
    const key = normalize(t.category || 'otros');
    const day = toDate(t.date).getDate();
    const tx = { amount: t.amount, words: tokens(t.description) };
    const g = byCategory.get(key);
    if (g) {
      g.amount += t.amount;
      g.day = Math.min(g.day, day);
      g.words = Array.from(new Set(g.words.concat(tx.words)));
      g.txs.push(tx);
      if (t.merchant) g.merchants.add(normalize(t.merchant));
      g.title = t.category; // varios pagos en la categoría: se nombra por la categoría
    } else {
      byCategory.set(key, { key, category: t.category, title: t.description?.trim() || t.category, amount: t.amount, day, words: tokens(t.category, t.description), txs: [tx], merchants: new Set(t.merchant ? [normalize(t.merchant)] : []) });
    }
  }
  const groups = Array.from(byCategory.values());

  // Palabras repetidas en varios pagos (p. ej. el nombre del edificio) no sirven para distinguirlos
  const wordCount = new Map<string, number>();
  for (const g of groups) for (const w of g.words) wordCount.set(w, (wordCount.get(w) || 0) + 1);
  const distinctive = (ws: string[]) => ws.filter(w => (wordCount.get(w) || 0) <= 1);

  const matches = (catA: string | undefined, wordsA: string[], catB: string | undefined, wordsB: string[]) => {
    if (catA && catB && normalize(catA) === normalize(catB)) return true;
    const a = distinctive(wordsA);
    return a.some(x => wordsB.some(y => sameWord(x, y)));
  };

  const thisMonthWords = fixedThisMonth.map(t => ({ tx: t, category: t.category, words: tokens(t.category, t.description) }));
  const findPaidThisMonth = (category: string | undefined, words: string[]) =>
    thisMonthWords.find(t => matches(category, words, t.category, t.words))?.tx;
  const paidThisMonth = (category: string | undefined, words: string[]) => !!findPaidThisMonth(category, words);

  const items: Commitment[] = [];
  const paid: PaidCommitment[] = [];
  let paidCount = 0;
  const addPaid = (p: Omit<PaidCommitment, 'paidAt' | 'amount' | 'how'>, tx: Transaction | undefined, expected: number | null) => {
    paidCount++;
    paid.push({ ...p, amount: tx ? tx.amount : expected, paidAt: tx ? toDate(tx.date) : null, how: tx ? 'registrado' : 'marcado' });
  };

  const usedGroups = new Set<string>();
  // 2. Recordatorios de pago con vencimiento este mes
  const dueReminders: { r: Reminder; due: Date; words: string[]; group?: Group }[] = [];
  for (const r of reminders) {
    if (!r.active || !isPayable(r)) continue;
    let due: Date | null = null;
    if (r.type === 'monthly' && r.dayOfMonth) {
      if (monthlyOccursIn(r, year, month)) due = dayInMonth(year, month, r.dayOfMonth);
      else {
        // No toca este mes: que el pago del mes pasado tampoco aparezca como pendiente
        const g = r.category
          ? groups.find(x => normalize(x.category) === normalize(r.category!))
          : groups.find(x => matches(undefined, tokens(r.title), x.category, x.words));
        if (g) usedGroups.add(g.key);
      }
    }
    else if (r.type === 'yearly' && r.date) {
      const [, m, d] = r.date.split('-').map(Number);
      if (m - 1 === month) due = dayInMonth(year, month, d);
    }
    else if (r.type === 'once' && r.date?.startsWith(thisMonth)) {
      const [y, m, d] = r.date.split('-').map(Number);
      due = new Date(y, m - 1, d);
    }
    if (!due) continue;
    const words = tokens(r.title, r.category);
    // Con categoría, solo cuenta un pago de esa misma categoría (las palabras sueltas como el nombre de
    // la ciudad confunden: "Claro Manizales" no es "Aguas de Manizales"); sin categoría, por palabras
    // Mismo nombre que un pago fijo del mes pasado = el mismo compromiso, aunque la categoría
    // no coincida (recordatorio "Google AI pro" en Play Store y el pago "Google AI pro" en Google)
    const sameTitle = groups.find(g => normalize(g.title) === normalize(r.title));
    // Con comercio (Alcanos, Google AI Pro): solo los pagos de ese comercio, aunque estén en otra
    // categoría o en la categoría vieja con el nombre del comercio; nunca otro de la misma categoría
    const mer = r.merchant ? normalize(r.merchant) : '';
    const group = sameTitle
      ?? (mer ? groups.find(g => g.merchants.has(mer) || normalize(g.category) === mer) : undefined)
      ?? (!mer && r.category ? groups.find(g => normalize(g.category) === normalize(r.category!)) : undefined)
      ?? (!mer && !r.category ? groups.find(g => matches(undefined, words, g.category, g.words)) : undefined);
    dueReminders.push({ r, due, words, group });
  }

  for (const { r, due, words, group } of dueReminders) {
    if (group) usedGroups.add(group.key);

    // Varios recordatorios en la misma categoría (Claro panorama y Claro Manizales): cada uno toma
    // el pago del mes pasado que más se le parece, y se reconoce como pagado solo por su nombre
    const shared = !!group && dueReminders.filter(x => x.group === group).length > 1;
    const ownWords = shared ? words.filter(w => !tokens(group!.category).includes(w)) : words;
    const merchantPay = r.merchant ? lastPaymentFor(r, transactions) : null;
    let amount: number | null = r.amount && r.amount > 0 ? r.amount : merchantPay ? merchantPay.amount : group ? group.amount : null;
    if (shared && !(r.amount && r.amount > 0) && !merchantPay) {
      const best = group!.txs.find(t => ownWords.some(w => t.words.some(x => sameWord(w, x))));
      amount = best ? best.amount : null;
    }

    const key = r.id ? `r:${r.id}` : `t:${normalize(r.title)}`;
    if (amount === null) {
      const sharedCat = reminders.some(o => o !== r && o.active && o.category && r.category && normalize(o.category) === normalize(r.category));
      amount = lastPaymentFor(r, transactions, sharedCat)?.amount ?? null;
    }

    // Varios recordatorios del mismo comercio (EPM: "Luz Manizales" y "EPM APTO 101"): un pago solo
    // cubre el recordatorio cuyo nombre se le parece, no todos los de ese comercio
    const sameMerchant = r.merchant
      ? reminders.filter(o => o !== r && o.active && isPayable(o) && o.merchant && normalize(o.merchant) === normalize(r.merchant!))
      : [];
    const otherWords = new Set(sameMerchant.flatMap(o => tokens(o.title)));
    const ownTitleWords = tokens(r.title).filter(w => !otherWords.has(w));
    const isThisOne = (t: Transaction) => sameMerchant.length === 0
      || normalize(t.description || '') === normalize(r.title)
      || tokens(t.description).some(x => ownTitleWords.some(w => sameWord(w, x)));
    // Un pago de otra categoría que tiene su propio recordatorio (Agua → "Aguas de Manizales")
    // no cubre este recordatorio aunque sea del mismo comercio (EPM Manizales cobra varias cosas)
    const belongsToOther = (t: Transaction) => !!r.category && !!t.category
      && normalize(t.category) !== normalize(r.category)
      && reminders.some(o => o !== r && o.active && isPayable(o) && !!o.category && normalize(o.category) === normalize(t.category));
    const merchantPaid = (t: Transaction) => !!r.merchant && isThisOne(t) && !belongsToOther(t) && (
      normalize(t.merchant || '') === normalize(r.merchant) || normalize(t.category) === normalize(r.merchant)
      || (!!group && normalize(t.category) === normalize(group.category) && normalize(t.description || '') === normalize(group.title)));
    const marked = (r.paidDates || []).includes(dateKey(due));
    const coveringTx = r.merchant ? fixedThisMonth.find(merchantPaid) : shared
      ? fixedThisMonth.find(t => normalize(t.category) === normalize(group!.category) && tokens(t.description).some(x => ownWords.some(w => sameWord(w, x))))
      : r.category
        ? fixedThisMonth.find(t => normalize(t.category) === normalize(r.category!)
            || (!!group && normalize(t.category) === normalize(group.category) && normalize(t.description || '') === normalize(r.title)))
        : findPaidThisMonth(undefined, words) || (group ? findPaidThisMonth(group.category, group.words) : undefined);
    if (marked || coveringTx) {
      addPaid({ key, title: r.title, category: r.category || group?.category || '', dueDate: due }, marked ? undefined : coveringTx, amount);
      continue;
    }
    if (skipped.includes(skipEntry(thisMonth, key))) continue;

    items.push({
      key, title: r.title, category: r.category || group?.category || '',
      dueDate: due, amount, reminder: r, exactDate: true,
      daysLeft: Math.round((due.getTime() - today.getTime()) / 86400000),
    });
  }

  // 3. Pagos fijos del mes pasado sin recordatorio
  for (const g of groups) {
    if (usedGroups.has(g.key)) continue;
    const key = `c:${g.key}`;
    const paidTx = findPaidThisMonth(g.category, g.words);
    if (paidTx) { addPaid({ key, title: g.title, category: g.category, dueDate: dayInMonth(year, month, g.day) }, paidTx, g.amount); continue; }
    if (skipped.includes(skipEntry(thisMonth, key))) continue;
    const due = dayInMonth(year, month, g.day);
    items.push({
      key, title: g.title, category: g.category, dueDate: due, amount: g.amount, exactDate: false,
      daysLeft: Math.round((due.getTime() - today.getTime()) / 86400000),
    });
  }

  // 4. Cuotas de deudas (las que yo debo) con día de pago
  for (const d of debts) {
    if (d.status !== 'pending' || d.direction === 'me_deben' || !d.paymentDay || !d.installment || !d.id) continue;
    const due = dayInMonth(year, month, d.paymentDay);
    const start = toDate(d.createdAt);
    // La primera cuota se paga al mes siguiente de tomar el crédito
    if (!isNaN(start.getTime()) && due.getTime() - start.getTime() < 20 * 86400000) continue;
    const key = `d:${d.id}`;
    const payNow = (d.payments || []).find(p => monthKey(toDate(p.date)) === thisMonth);
    if (payNow) {
      paidCount++;
      paid.push({ key, title: `Cuota ${d.title}`, category: 'Deudas', dueDate: due, amount: (payNow as any).amount ?? d.installment, paidAt: toDate(payNow.date), how: 'abono' });
      continue;
    }
    if (skipped.includes(skipEntry(thisMonth, key))) continue;
    items.push({
      key, title: `Cuota ${d.title}`, category: 'Deudas', dueDate: due, amount: d.installment, debt: d, exactDate: true,
      daysLeft: Math.round((due.getTime() - today.getTime()) / 86400000),
    });
  }

  items.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  return {
    pending: items,
    pendingTotal: items.reduce((s, c) => s + (c.amount || 0), 0),
    paidCount,
    paid: paid.sort((a, b) => (b.paidAt?.getTime() ?? b.dueDate.getTime()) - (a.paidAt?.getTime() ?? a.dueDate.getTime())),
    month: thisMonth,
  };
}

/**
 * Compromisos de cualquier mes (YYYY-MM): el actual con la fecha de hoy; un mes pasado como
 * quedó al final de ese mes; un mes futuro como se ve el primer día (con los pagos de este mes).
 */
export function getCommitmentsForMonth(
  month: string, transactions: Transaction[], reminders: Reminder[], skipped: string[] = [], debts: Debt[] = [], now = new Date(),
): CommitmentsSummary {
  const [y, m] = month.split('-').map(Number);
  const current = monthKey(now);
  const ref = month === current ? now : month < current ? new Date(y, m, 0, 23, 59) : new Date(y, m - 1, 1, 0, 1);
  return getCommitments(transactions, reminders, skipped, ref, debts);
}

export function commitmentWhen(c: Commitment): string {
  const day = c.dueDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }).replace('.', '');
  if (!c.exactDate) return c.daysLeft < 0 ? `Lo sueles pagar el ${c.dueDate.getDate()}` : `Hacia el ${day}`;
  if (c.daysLeft < -1) return `Venció hace ${-c.daysLeft} días`;
  if (c.daysLeft === -1) return 'Venció ayer';
  if (c.daysLeft === 0) return 'Vence hoy';
  if (c.daysLeft === 1) return 'Vence mañana';
  return `Vence el ${day}`;
}
