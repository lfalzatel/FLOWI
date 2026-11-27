// Gastos compartidos: la persona registra el gasto y con quién lo compartió (los demás no necesitan FLOWI).
//  - "Yo pagué": el gasto queda con TU parte; las otras personas te deben la suya.
//  - "Pagó otra persona": el gasto queda con tu parte y tú le debes eso a quien pagó.
// En Cuentas y patrimonio el dinero se mueve cuando de verdad sale o entra:
// si pagaste tú, sale el total y entra lo que te van devolviendo; si pagó otro, sale tu parte cuando le pagas.
import { normalizeText } from '@/lib/categories';

// Abono: parte de lo pendiente que ya se pagó (y a qué cuenta entró o de cuál salió)
export interface SharedPayment {
  id?: string;               // para sincronizar con el amigo (fl_shared_links)
  amount: number;
  at: string;                // ISO
  accountId?: string | null; // cuenta donde entró (o de donde salió); sin ella, la cuenta del gasto
}

export interface SharedPerson {
  name: string;
  amount: number;            // lo que le toca (o lo que le debes, si pagó esa persona)
  settledAt?: string | null; // ISO: cuándo quedó saldado
  payments?: SharedPayment[];
  absorbed?: number;         // lo que nunca pagó y asumiste como gasto tuyo
  friendUid?: string | null; // es tu amigo en FLOWI: el gasto le llega a su app (lib/sharedLinks.ts)
}

/** Lo que ya se pagó de la parte de esa persona. Saldado sin abonos (antes de existir los abonos) = todo. */
export function paidOf(p: SharedPerson): number {
  if (p.payments?.length) return p.payments.reduce((s, x) => s + (x.amount || 0), 0);
  return p.settledAt && !p.absorbed ? p.amount : 0;
}

/** Lo que falta de la parte de esa persona. */
export function remainingOf(p: SharedPerson): number {
  return Math.max(0, Math.round((p.amount - paidOf(p) - (p.absorbed || 0)) * 100) / 100);
}

export interface SharedInfo {
  total: number;      // lo que costó todo (si pagó otro, igual a tu parte)
  paidByMe: boolean;
  people: SharedPerson[];
}

type TxLike = {
  id?: string;
  type: string;
  amount: number;
  description?: string;
  category: string;
  date: Date | { toDate(): Date };
  shared?: SharedInfo | null;
};

const toDate = (d: TxLike['date']) => (d instanceof Date ? d : d.toDate());

export const personKey = (name: string) => normalizeText(name.trim());

/** Reparte en partes iguales entre las otras personas y tú, en pesos enteros. Devuelve lo de cada otra persona. */
export function equalShares(total: number, others: number, cents = false): number[] {
  if (others <= 0 || total <= 0) return Array(Math.max(others, 0)).fill(0);
  const unit = cents ? 100 : 1;
  const each = Math.floor((total * unit) / (others + 1)) / unit;
  return Array(others).fill(each);
}

/** Tu parte cuando pagaste tú: el total menos lo de los demás. */
export function myPart(info: SharedInfo): number {
  if (!info.paidByMe) return info.people[0]?.amount ?? info.total;
  return info.total - info.people.reduce((s, p) => s + (p.amount || 0) - (p.absorbed || 0), 0);
}

/** Lo que te deben todavía en este gasto (si pagaste tú). */
export function pendingToMe(info: SharedInfo | null | undefined): number {
  if (!info?.paidByMe) return 0;
  return info.people.reduce((s, p) => s + remainingOf(p), 0);
}

/** Lo que debes todavía en este gasto (si pagó otra persona). */
export function pendingFromMe(info: SharedInfo | null | undefined): number {
  if (!info || info.paidByMe) return 0;
  return info.people.reduce((s, p) => s + remainingOf(p), 0);
}

/** Movimientos de dinero real de un gasto o ingreso, para Cuentas y patrimonio. */
export function moneyMoves(t: TxLike): { date: Date; amount: number; label: string; accountId?: string | null }[] {
  const label = t.description?.trim() || t.category;
  const date = toDate(t.date);
  const s = t.type === 'gasto' ? t.shared : null;
  if (!s) return [{ date, amount: t.type === 'ingreso' ? t.amount : -t.amount, label }];
  if (s.paidByMe) {
    const moves: { date: Date; amount: number; label: string; accountId?: string | null }[] = [{ date, amount: -s.total, label }];
    for (const p of s.people) {
      if (p.payments?.length) {
        for (const x of p.payments) moves.push({ date: new Date(x.at), amount: x.amount, label: `${p.name} te abonó · ${label}`, accountId: x.accountId });
      } else if (p.settledAt && !p.absorbed) {
        moves.push({ date: new Date(p.settledAt), amount: p.amount, label: `${p.name} te pagó · ${label}` });
      }
    }
    return moves;
  }
  const payer = s.people[0];
  if (!payer) return [];
  if (payer.payments?.length) {
    return payer.payments.map(x => ({ date: new Date(x.at), amount: -x.amount, label: `Le abonaste a ${payer.name} · ${label}`, accountId: x.accountId }));
  }
  return payer.settledAt ? [{ date: new Date(payer.settledAt), amount: -payer.amount, label: `Le pagaste a ${payer.name} · ${label}` }] : [];
}

export interface SharedEntry<T> {
  tx: T;
  index: number;            // posición de la persona en shared.people
  amount: number;
  pending: number;          // lo que falta (después de abonos)
  paid: number;             // lo que ya se abonó
  toMe: boolean;            // true: esa persona te debe; false: tú le debes
  settled: boolean;
  date: Date;
}

export interface PersonBalance<T> {
  key: string;
  name: string;
  owesMe: number;   // pendiente que te debe
  iOwe: number;     // pendiente que le debes
  net: number;      // > 0 te debe, < 0 le debes
  entries: SharedEntry<T>[]; // del más reciente al más antiguo
}

/** Saldo con cada persona, a partir de los gastos compartidos. Los pendientes primero, de mayor a menor. */
export function sharedBalances<T extends TxLike>(transactions: T[]): PersonBalance<T>[] {
  const map = new Map<string, PersonBalance<T>>();
  for (const t of transactions) {
    const s = t.type === 'gasto' ? t.shared : null;
    if (!s) continue;
    s.people.forEach((p, index) => {
      const key = personKey(p.name);
      if (!key) return;
      const b = map.get(key) || { key, name: p.name.trim(), owesMe: 0, iOwe: 0, net: 0, entries: [] };
      const pending = remainingOf(p);
      const settled = pending <= 0;
      if (!settled) {
        if (s.paidByMe) b.owesMe += pending; else b.iOwe += pending;
      }
      b.entries.push({ tx: t, index, amount: p.amount, pending, paid: paidOf(p), toMe: s.paidByMe, settled, date: toDate(t.date) });
      map.set(key, b);
    });
  }
  const list = Array.from(map.values());
  list.forEach(b => {
    b.net = b.owesMe - b.iOwe;
    b.entries.sort((a, c) => c.date.getTime() - a.date.getTime());
  });
  return list.sort((a, c) => Math.abs(c.net) - Math.abs(a.net) || a.name.localeCompare(c.name));
}

/** Nombres usados antes, del más reciente al más antiguo (para sugerirlos al compartir). */
export function knownPeople(transactions: TxLike[]): string[] {
  const seen = new Map<string, { name: string; at: number }>();
  for (const t of transactions) {
    if (!t.shared) continue;
    const at = toDate(t.date).getTime();
    for (const p of t.shared.people) {
      const k = personKey(p.name);
      if (!k) continue;
      const prev = seen.get(k);
      if (!prev || prev.at < at) seen.set(k, { name: p.name.trim(), at });
    }
  }
  return Array.from(seen.values()).sort((a, b) => b.at - a.at).map(x => x.name);
}

/** Copia de shared con las personas indicadas saldadas (o pendientes otra vez). Con abonos previos (o una cuenta), lo que faltaba entra como un abono más. */
export function withSettled(info: SharedInfo, indexes: number[], settled: boolean, when = new Date(), accountId?: string | null): SharedInfo {
  return {
    ...info,
    people: info.people.map((p, i) => {
      if (!indexes.includes(i)) return p;
      if (!settled) return { ...p, settledAt: null, payments: [], absorbed: 0 };
      const rest = remainingOf(p);
      if (!p.payments?.length && !accountId) return { ...p, settledAt: when.toISOString() };
      const payments = [...(p.payments || []), ...(rest > 0 ? [{ amount: rest, at: when.toISOString(), accountId: accountId ?? null }] : [])];
      return { ...p, settledAt: when.toISOString(), payments };
    }),
  };
}

/** Copia de shared con un abono de esa persona. Si con él se completa, queda saldada. */
export function withPayment(info: SharedInfo, index: number, amount: number, when = new Date(), accountId?: string | null): SharedInfo {
  return {
    ...info,
    people: info.people.map((p, i) => {
      if (i !== index) return p;
      const base: SharedPayment[] = p.payments?.length ? p.payments : p.settledAt && !p.absorbed ? [{ amount: p.amount, at: p.settledAt }] : [];
      const id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
      const next: SharedPerson = { ...p, payments: [...base, { id, amount, at: when.toISOString(), accountId: accountId ?? null }] };
      return { ...next, settledAt: remainingOf(next) <= 0 ? when.toISOString() : null };
    }),
  };
}

/** Copia de shared sin el abono indicado (para corregir uno mal registrado). */
export function withoutPayment(info: SharedInfo, index: number, paymentIdx: number): SharedInfo {
  return {
    ...info,
    people: info.people.map((p, i) => {
      if (i !== index) return p;
      const next: SharedPerson = { ...p, payments: (p.payments || []).filter((_, j) => j !== paymentIdx) };
      return { ...next, settledAt: remainingOf(next) <= 0 ? next.settledAt ?? null : null };
    }),
  };
}

/** Lo que esa persona nunca te pagó pasa a ser gasto tuyo. Devuelve el nuevo shared y cuánto sube tu gasto. */
export function withAbsorbed(info: SharedInfo, index: number, when = new Date()): { shared: SharedInfo; added: number } {
  const p = info.people[index];
  const added = p ? remainingOf(p) : 0;
  return {
    added,
    shared: {
      ...info,
      people: info.people.map((x, i) => (i === index ? { ...x, absorbed: (x.absorbed || 0) + added, settledAt: when.toISOString() } : x)),
    },
  };
}

// ── Enlace para que la otra persona lo anote en su FLOWI ──────────────────────────────

export interface ShareLinkItem { d: string; a: number; c: string; f: string } // descripción, monto, categoría, fecha YYYY-MM-DD
export interface ShareLinkData { p?: string; i: ShareLinkItem[] }             // p: nombre de quien cobra


function toBase64Url(s: string) {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '==='.slice((b64.length + 3) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, ch => ch.charCodeAt(0)));
}

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Misma dirección que lib/appUrl.ts (aquí sin importar, para que las pruebas lo carguen solo)
const APP_URL = 'https://flowi-9af82.web.app';

export function shareLink(data: ShareLinkData, base = APP_URL): string {
  const compact: ShareLinkData = {
    ...(data.p ? { p: data.p.slice(0, 40) } : {}),
    i: data.i.slice(0, 10).map(x => ({ d: x.d.slice(0, 60), a: Math.round(x.a * 100) / 100, c: x.c.slice(0, 40), f: x.f })),
  };
  return `${base}/compartido?g=${toBase64Url(JSON.stringify(compact))}`;
}

/** Lee el enlace; devuelve null si está dañado o trae datos raros. */
export function readShareLink(g: string | null): ShareLinkData | null {
  if (!g || g.length > 4000) return null;
  try {
    const raw = JSON.parse(fromBase64Url(g));
    if (!raw || !Array.isArray(raw.i)) return null;
    const items: ShareLinkItem[] = raw.i.slice(0, 10).flatMap((x: any) => {
      const a = Number(x?.a);
      const f = typeof x?.f === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.f) ? x.f : '';
      if (!Number.isFinite(a) || a <= 0 || a > 1e10 || !f) return [];
      return [{ d: String(x.d ?? '').slice(0, 60), a: Math.round(a * 100) / 100, c: String(x.c ?? '').slice(0, 40), f }];
    });
    if (!items.length) return null;
    return { ...(typeof raw.p === 'string' && raw.p.trim() ? { p: raw.p.trim().slice(0, 40) } : {}), i: items };
  } catch {
    return null;
  }
}

/** Mensaje de WhatsApp para cobrarle a una persona lo pendiente (con enlace para anotarlo e invitación a FLOWI). */
export function chargeMessage<T extends TxLike>(
  person: PersonBalance<T>,
  fmt: (n: number) => string,
  myName?: string,
  locale: string = 'es-CO',
): string {
  const pending = person.entries.filter(e => e.toMe && !e.settled);
  const first = person.name.split(/\s+/)[0];
  const lines = pending.slice(0, 10).map(e => {
    const what = e.tx.description?.trim() || e.tx.category;
    const when = e.date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    // Con quién más se compartió (sin contar a esta persona)
    const others = (e.tx.shared?.people || []).filter((_, i) => i !== e.index).map(p => p.name.split(/\s+/)[0]).filter(Boolean);
    const withWho = others.length ? ` · también con ${others.slice(0, 3).join(', ')}` : '';
    const paid = e.paid > 0 ? ` (ya abonaste ${fmt(e.paid)})` : '';
    return `• ${what} (${when}): ${fmt(e.pending)}${paid}${withWho}`;
  });
  const total = pending.reduce((s, e) => s + e.pending, 0);
  // Si tú también le debes algo, se descuenta y se cobra solo la diferencia
  const mine = person.entries.filter(e => !e.toMe && !e.settled);
  const minus = mine.reduce((s, e) => s + e.pending, 0);
  const offset = minus > 0 ? [
    `Menos lo que yo te debo:`,
    ...mine.slice(0, 10).map(e => `• ${e.tx.description?.trim() || e.tx.category}: ${fmt(e.pending)}`),
    `Queda en: ${fmt(total - minus)}`,
  ] : [];
  const link = shareLink({
    p: myName?.split(/\s+/)[0],
    i: pending.map(e => ({ d: e.tx.description?.trim() || e.tx.category, a: e.pending, c: e.tx.category, f: dayKey(e.date) })),
  });
  return [
    `Hola ${first} 👋`,
    pending.length === 1 ? 'Tienes un gasto compartido conmigo:' : 'Tienes estos gastos compartidos conmigo:',
    ...lines,
    ...(pending.length > 1 || minus > 0 ? [`Total: ${fmt(total)}`] : []),
    ...offset,
    '',
    `Si usas FLOWI, anótalo con un toque: ${link}`,
    '',
    `¿Aún no la tienes? FLOWI te ayuda a llevar el control de tus gastos, gratis: ${APP_URL}`,
  ].join('\n');
}

export const whatsappUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
