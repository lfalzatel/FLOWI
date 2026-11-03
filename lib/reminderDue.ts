import { Reminder } from './firestore';

// Vencimientos de recordatorios de pago: cada ocurrencia (fecha) se marca como pagada por separado,
// y lo que no se ha pagado sigue apareciendo aunque ya haya vencido.

// Solo se revisan atrasos desde que existe "Ya lo pagué", para no inundar de vencidos viejos
const TRACKING_START = new Date(2026, 10, 1);
const UPCOMING_DAYS = 7;

export const PAYABLE_TYPES: Reminder['type'][] = ['once', 'weekly', 'monthly'];

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

// Ocurrencias cercanas: la anterior, la actual y la siguiente
function occurrences(r: Reminder, today: Date): Date[] {
  if (r.type === 'monthly' && r.dayOfMonth) {
    return [-1, 0, 1].map(o => monthlyDate(today.getFullYear(), today.getMonth() + o, r.dayOfMonth!));
  }
  if (r.type === 'weekly' && r.dayOfWeek !== undefined) {
    const base = new Date(today);
    base.setDate(today.getDate() + (r.dayOfWeek - today.getDay()));
    return [-7, 0, 7].map(o => { const d = new Date(base); d.setDate(base.getDate() + o); return d; });
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

export interface ReminderDue {
  reminder: Reminder;
  dueDate: Date;
  daysLeft: number; // negativo = vencido hace N días
}

// El vencimiento pendiente más antiguo (vencido o dentro de los próximos 7 días), o null
export function getPendingDue(r: Reminder, now = new Date()): ReminderDue | null {
  if (!r.active || !PAYABLE_TYPES.includes(r.type)) return null;
  const today = startOfDay(now);
  const created = toDate(r.createdAt);
  const since = created && startOfDay(created) > TRACKING_START ? startOfDay(created) : TRACKING_START;

  for (const occ of occurrences(r, today)) {
    const daysLeft = Math.round((occ.getTime() - today.getTime()) / 86400000);
    // Ocurrencias pasadas anteriores a la creación (o al inicio del seguimiento) no cuentan como atrasos
    if (daysLeft < 0 && occ < since) continue;
    if (isOccurrencePaid(r, occ)) continue;
    if (daysLeft > UPCOMING_DAYS) return null;
    return { reminder: r, dueDate: occ, daysLeft };
  }
  return null;
}

export function getPendingDues(reminders: Reminder[], now = new Date()): ReminderDue[] {
  return reminders
    .map(r => getPendingDue(r, now))
    .filter((d): d is ReminderDue => d !== null)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

export function dueLabel(daysLeft: number): string {
  if (daysLeft < -1) return `Vencido hace ${-daysLeft} días`;
  if (daysLeft === -1) return 'Venció ayer';
  if (daysLeft === 0) return '¡Vence hoy!';
  if (daysLeft === 1) return 'Mañana';
  return `Faltan ${daysLeft} días`;
}
