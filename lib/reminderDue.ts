import { Reminder, Transaction } from './firestore';

// Vencimientos de recordatorios de pago: cada ocurrencia (fecha) se marca como pagada por separado,
// y lo que no se ha pagado sigue apareciendo aunque ya haya vencido.

// Solo se revisan atrasos desde que existe "Ya lo pagué", para no inundar de vencidos viejos
const TRACKING_START = new Date(2026, 10, 1);
const UPCOMING_DAYS = 7;

export const PAYABLE_TYPES: Reminder['type'][] = ['once', 'weekly', 'monthly', 'yearly'];

// Un recordatorio anual sin categoría es una fecha (cumpleaños), no un pago
export function isPayable(r: Reminder): boolean {
  if (!PAYABLE_TYPES.includes(r.type)) return false;
  return r.type !== 'yearly' || !!r.category;
}

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function monthlyDate(year: number, month: number, day: number): Date {
  const last = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, last)); // día 31 → último día del mes
}

// ¿Un recordatorio mensual toca en este mes? (los "cada N meses" solo en los meses que corresponden)
export function monthlyOccursIn(r: Pick<Reminder, 'everyMonths' | 'startMonth'>, year: number, month: number): boolean {
  const every = r.everyMonths && r.everyMonths > 1 ? r.everyMonths : 1;
  if (every === 1 || !r.startMonth) return true;
  const [sy, sm] = r.startMonth.split('-').map(Number);
  const diff = (year * 12 + month) - (sy * 12 + (sm - 1));
  return ((diff % every) + every) % every === 0;
}

// Ocurrencias cercanas: la anterior, la actual y la siguiente
function occurrences(r: Reminder, today: Date): Date[] {
  if (r.type === 'monthly' && r.dayOfMonth) {
    const every = r.everyMonths && r.everyMonths > 1 ? r.everyMonths : 1;
    const out: Date[] = [];
    for (let o = -every; o <= every; o++) {
      const ref = new Date(today.getFullYear(), today.getMonth() + o, 1);
      if (monthlyOccursIn(r, ref.getFullYear(), ref.getMonth())) out.push(monthlyDate(ref.getFullYear(), ref.getMonth(), r.dayOfMonth!));
    }
    // La anterior a hoy, y las siguientes
    const past = out.filter(d => d < today);
    return [...past.slice(-1), ...out.filter(d => d >= today)].slice(0, 3);
  }
  if (r.type === 'weekly' && r.dayOfWeek !== undefined) {
    const base = new Date(today);
    base.setDate(today.getDate() + (r.dayOfWeek - today.getDay()));
    return [-7, 0, 7].map(o => { const d = new Date(base); d.setDate(base.getDate() + o); return d; });
  }
  if (r.type === 'yearly' && r.date) {
    const [, m, d] = r.date.split('-').map(Number);
    if (m && d) return [-1, 0, 1].map(o => monthlyDate(today.getFullYear() + o, m - 1, d));
  }
  if (r.type === 'once' && r.date) {
    const [y, m, d] = r.date.split('-').map(Number);
    if (y && m && d) return [new Date(y, m - 1, d)];
  }
  return [];
}

function toDate(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v.toDate === 'function') return v.toDate();
  return null;
}

export function isOccurrencePaid(r: Reminder, occurrence: Date): boolean {
  return (r.paidDates || []).includes(dateKey(occurrence));
}

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const words = (s: string) => normalize(s).split(/[^a-z0-9]+/).filter(w => w.length >= 4);

// Días alrededor del vencimiento en que un gasto registrado cuenta como el pago de esa vez
const PAY_WINDOW: Partial<Record<Reminder['type'], [number, number]>> = {
  weekly: [3, 3], monthly: [20, 10], yearly: [45, 30], once: [45, 30],
};

// ¿Ya hay un gasto registrado que corresponde a este vencimiento? (misma categoría y fecha cercana).
// Si otro recordatorio comparte la categoría, el gasto también debe nombrarlo (Claro panorama vs. Claro Manizales).
function isCoveredByExpense(r: Reminder, occurrence: Date, transactions: Transaction[], sharedCategory: boolean): boolean {
  if (!r.category) return false;
  const [before, after] = PAY_WINDOW[r.type] || [0, 0];
  const from = occurrence.getTime() - before * 86400000;
  const to = occurrence.getTime() + (after + 1) * 86400000;
  const category = normalize(r.category);
  const titleWords = words(r.title).filter(w => !words(r.category!).includes(w));
  const merchant = r.merchant ? normalize(r.merchant) : '';
  return transactions.some(t => {
    if (t.type !== 'gasto') return false;
    const byMerchant = !!merchant && (normalize(t.merchant || '') === merchant || normalize(t.category || '') === merchant);
    if (!byMerchant && normalize(t.category || '') !== category) return false;
    const when = toDate(t.date)?.getTime() ?? 0;
    if (when < from || when > to) return false;
    if (byMerchant || !sharedCategory || !titleWords.length) return true;
    const desc = words(`${t.description || ''} ${t.merchant || ''}`);
    return titleWords.some(w => desc.includes(w));
  });
}

export interface ReminderDue {
  reminder: Reminder;
  dueDate: Date;
  daysLeft: number; // negativo = vencido hace N días
}

// El vencimiento pendiente más antiguo (vencido o dentro de los próximos 7 días), o null
export function getPendingDue(r: Reminder, now = new Date(), transactions: Transaction[] = [], sharedCategory = false): ReminderDue | null {
  if (!r.active || !isPayable(r)) return null;
  const today = startOfDay(now);
  const created = toDate(r.createdAt);
  const since = created && startOfDay(created) > TRACKING_START ? startOfDay(created) : TRACKING_START;

  for (const occ of occurrences(r, today)) {
    const daysLeft = Math.round((occ.getTime() - today.getTime()) / 86400000);
    // Ocurrencias pasadas anteriores a la creación (o al inicio del seguimiento) no cuentan como atrasos
    if (daysLeft < 0 && occ < since) continue;
    if (isOccurrencePaid(r, occ) || isCoveredByExpense(r, occ, transactions, sharedCategory)) continue;
    if (daysLeft > UPCOMING_DAYS) return null;
    return { reminder: r, dueDate: occ, daysLeft };
  }
  return null;
}

export function getPendingDues(reminders: Reminder[], now = new Date(), transactions: Transaction[] = []): ReminderDue[] {
  return reminders
    .map(r => getPendingDue(r, now, transactions, isCategoryShared(r, reminders)))
    .filter((d): d is ReminderDue => d !== null)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

// Último pago registrado de un recordatorio: el gasto más reciente de su categoría (si otro
// recordatorio comparte la categoría, el gasto debe nombrarlo, como "Claro Manizales").
// Sirve para mostrar y reservar su valor sin tener que escribirlo a mano.
export function lastPaymentFor(r: Reminder, transactions: Transaction[], sharedCategory = false): { amount: number; date: Date } | null {
  // Con comercio: solo pagos de ese comercio (Claude no se mezcla con ChatGPT en "Apps e IA")
  if (r.merchant) {
    const mer = normalize(r.merchant);
    let hit: { amount: number; date: Date } | null = null;
    for (const t of transactions) {
      if (t.type !== 'gasto') continue;
      const ok = normalize(t.merchant || '') === mer || normalize(t.category || '') === mer
        || words(t.description || '').some(w => words(r.merchant!).includes(w));
      const when = toDate(t.date);
      if (ok && when && (!hit || when > hit.date)) hit = { amount: t.amount, date: when };
    }
    if (hit) return hit;
  }
  if (!r.category) return null;
  const category = normalize(r.category);
  const titleWords = words(r.title).filter(w => !words(r.category!).includes(w));
  const limit = Date.now() - 400 * 86400000;
  let best: { amount: number; date: Date } | null = null;
  for (const t of transactions) {
    if (t.type !== 'gasto' || normalize(t.category || '') !== category) continue;
    const when = toDate(t.date);
    if (!when || when.getTime() < limit) continue;
    if (sharedCategory && titleWords.length) {
      const desc = words(`${t.description || ''} ${t.merchant || ''}`);
      if (!titleWords.some(w => desc.includes(w))) continue;
    }
    if (!best || when > best.date) best = { amount: t.amount, date: when };
  }
  return best;
}

export function isCategoryShared(r: Reminder, reminders: Reminder[]): boolean {
  if (!r.category) return false;
  const c = normalize(r.category);
  return reminders.some(o => o !== r && o.active && o.category && normalize(o.category) === c);
}

export function dueLabel(daysLeft: number): string {
  if (daysLeft < -1) return `Vencido hace ${-daysLeft} días`;
  if (daysLeft === -1) return 'Venció ayer';
  if (daysLeft === 0) return '¡Vence hoy!';
  if (daysLeft === 1) return 'Mañana';
  return `Faltan ${daysLeft} días`;
}
