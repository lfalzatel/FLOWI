// Calendario de tu plata: cuánto tendrías cada día de hoy a fin de mes.
// Empieza con la plata de hoy, resta los pagos pendientes en su fecha, suma los ingresos que se
// esperan (los del mes pasado que este mes aún no llegan) y resta un gasto diario normal (promedio
// de los gastos del día a día). Es una estimación para responder "¿me alcanza hasta fin de mes?".
import type { Transaction } from './firestore';

export interface CalEvent { title: string; amount: number; kind: 'pago' | 'ingreso' }
export interface CalDay { date: Date; balance: number; events: CalEvent[] }
export interface CashCalendar {
  days: CalDay[];              // de hoy al último día del mes
  lowest: CalDay;              // el día con menos plata
  end: number;                 // con cuánto terminarías el mes
  dailySpend: number;          // gasto diario normal que se descuenta
  expectedIncome: CalEvent[];  // ingresos que se esperan este mes
}

const toDate = (v: any): Date => (v instanceof Date ? v : v?.toDate ? v.toDate() : new Date(v));
const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameMonth = (d: Date, y: number, m: number) => d.getFullYear() === y && d.getMonth() === m;

/** Gasto diario normal: gastos del día a día (sin fijos) de los últimos `days` días, por día. */
export function averageDailySpend(transactions: Transaction[], now: Date, days = 60): number {
  const from = new Date(dayStart(now).getTime() - days * 86400000);
  const to = dayStart(now);
  let sum = 0;
  for (const t of transactions) {
    if (t.type !== 'gasto' || t.isFixed) continue;
    const d = toDate(t.date);
    if (d >= from && d < to) sum += Number(t.amount) || 0;
  }
  return Math.round(sum / days);
}

/** Ingresos que se esperan este mes: por categoría, lo del mes pasado que este mes todavía no llega. */
export function expectedIncomes(transactions: Transaction[], now: Date): { title: string; amount: number; day: number }[] {
  const y = now.getFullYear(), m = now.getMonth();
  const prev = new Date(y, m - 1, 1);
  const last = new Map<string, { sum: number; day: number; big: number; title: string }>();
  const thisMonth = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== 'ingreso') continue;
    const d = toDate(t.date);
    const amt = Number(t.amount) || 0;
    if (sameMonth(d, prev.getFullYear(), prev.getMonth())) {
      const e = last.get(t.category) || { sum: 0, day: d.getDate(), big: 0, title: t.description?.trim() || t.category };
      e.sum += amt;
      if (amt > e.big) { e.big = amt; e.day = d.getDate(); e.title = t.description?.trim() || t.category; }
      last.set(t.category, e);
    } else if (sameMonth(d, y, m)) {
      thisMonth.set(t.category, (thisMonth.get(t.category) || 0) + amt);
    }
  }
  const out: { title: string; amount: number; day: number }[] = [];
  const lastDay = new Date(y, m + 1, 0).getDate();
  last.forEach((e, category) => {
    const missing = e.sum - (thisMonth.get(category) || 0);
    if (missing <= e.sum * 0.3) return; // ya llegó (o casi todo)
    // Si su día habitual ya pasó y no ha llegado, se cuenta desde hoy (va atrasado)
    out.push({ title: e.title, amount: Math.round(missing), day: Math.min(lastDay, Math.max(e.day, now.getDate())) });
  });
  return out;
}

export function buildCashCalendar(opts: {
  start: number;                                         // plata de hoy
  now: Date;
  commitments: { title: string; dueDate: Date; amount: number | null }[];
  transactions: Transaction[];
}): CashCalendar {
  const { start, now, commitments, transactions } = opts;
  const y = now.getFullYear(), m = now.getMonth();
  const today = now.getDate();
  const lastDay = new Date(y, m + 1, 0).getDate();
  const dailySpend = averageDailySpend(transactions, now);
  const incomes = expectedIncomes(transactions, now);

  const days: CalDay[] = [];
  let balance = start;
  for (let d = today; d <= lastDay; d++) {
    const date = new Date(y, m, d);
    const events: CalEvent[] = [];
    for (const c of commitments) {
      if (!c.amount) continue;
      const due = dayStart(c.dueDate);
      // Lo vencido que no se ha pagado se cuenta hoy
      const day = due < dayStart(now) ? today : sameMonth(due, y, m) ? due.getDate() : -1;
      if (day === d) events.push({ title: c.title, amount: -c.amount, kind: 'pago' });
    }
    for (const i of incomes) if (i.day === d) events.push({ title: i.title, amount: i.amount, kind: 'ingreso' });
    balance += events.reduce((s, e) => s + e.amount, 0);
    if (d > today) balance -= dailySpend; // hoy ya está contado en la plata de hoy
    days.push({ date, balance: Math.round(balance), events });
  }
  const lowest = days.reduce((a, b) => (b.balance < a.balance ? b : a), days[0]);
  return {
    days, lowest, end: days[days.length - 1].balance, dailySpend,
    expectedIncome: incomes.map(i => ({ title: i.title, amount: i.amount, kind: 'ingreso' as const })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Calendario completo (vistas Mes / Semana / Día): días pasados con lo que realmente pasó y días
// futuros con la plata proyectada, hasta `monthsAhead` meses adelante. En los meses siguientes al
// actual se repiten los gastos fijos y los ingresos del último mes completo en su mismo día.

export interface DayInfo {
  date: Date;
  past: boolean;               // día anterior a hoy: muestra lo que pasó
  net: number;                 // pasado: entró − salió ese día
  balance: number | null;      // hoy y futuro (dentro del límite): plata proyectada
  events: CalEvent[];          // pasado: movimientos reales · futuro: pagos e ingresos esperados
}

export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Gastos fijos e ingresos del último mes completo, para repetirlos en los meses siguientes. */
function recurringFromLastMonth(transactions: Transaction[], now: Date) {
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const out: { title: string; amount: number; day: number; kind: 'pago' | 'ingreso' }[] = [];
  const seen = new Map<string, { title: string; amount: number; day: number; kind: 'pago' | 'ingreso' }>();
  for (const t of transactions) {
    const d = toDate(t.date);
    if (!sameMonth(d, prev.getFullYear(), prev.getMonth())) continue;
    if (t.type === 'gasto' && !t.isFixed) continue;
    const kind = t.type === 'ingreso' ? 'ingreso' : 'pago';
    const k = `${kind}|${t.category}`;
    const e = seen.get(k) || { title: t.description?.trim() || t.category, amount: 0, day: d.getDate(), kind };
    e.amount += Number(t.amount) || 0;
    seen.set(k, e);
  }
  seen.forEach(v => out.push(v));
  return out;
}

/** Información de cada día entre `from` y `to` (incluidos). */
export function buildCalendarRange(opts: {
  start: number; now: Date; from: Date; to: Date; monthsAhead?: number;
  commitments: { title: string; dueDate: Date; amount: number | null }[];
  transactions: Transaction[];
}): Map<string, DayInfo> {
  const { start, now, from, to, commitments, transactions, monthsAhead = 3 } = opts;
  const today = dayStart(now);
  const limit = new Date(now.getFullYear(), now.getMonth() + monthsAhead + 1, 0); // último día proyectado
  const out = new Map<string, DayInfo>();

  // Pasado: movimientos reales por día
  const byDay = new Map<string, CalEvent[]>();
  for (const t of transactions) {
    const d = toDate(t.date);
    if (d >= today) continue;
    const k = dayKey(d);
    const list = byDay.get(k) || [];
    list.push({ title: t.description?.trim() || t.category, amount: t.type === 'ingreso' ? t.amount : -t.amount, kind: t.type === 'ingreso' ? 'ingreso' : 'pago' });
    byDay.set(k, list);
  }

  // Futuro: proyección día a día desde hoy hasta el final del rango (o el límite)
  const projEnd = new Date(Math.min(to.getTime(), limit.getTime()));
  const projected = new Map<string, { balance: number; events: CalEvent[] }>();
  if (projEnd >= today) {
    const dailySpend = averageDailySpend(transactions, now);
    const incomesNow = expectedIncomes(transactions, now);
    const recurring = recurringFromLastMonth(transactions, now);
    let balance = start;
    for (let d = new Date(today); d <= projEnd; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      const events: CalEvent[] = [];
      const inThisMonth = sameMonth(d, today.getFullYear(), today.getMonth());
      if (inThisMonth) {
        for (const c of commitments) {
          if (!c.amount) continue;
          const due = dayStart(c.dueDate);
          const day = due < today ? today.getDate() : sameMonth(due, d.getFullYear(), d.getMonth()) ? due.getDate() : -1;
          if (day === d.getDate()) events.push({ title: c.title, amount: -c.amount, kind: 'pago' });
        }
        for (const i of incomesNow) if (i.day === d.getDate()) events.push({ title: i.title, amount: i.amount, kind: 'ingreso' });
      } else {
        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        for (const r of recurring) if (Math.min(r.day, lastDay) === d.getDate()) events.push({ title: r.title, amount: r.kind === 'ingreso' ? r.amount : -r.amount, kind: r.kind });
      }
      balance += events.reduce((s, e) => s + e.amount, 0);
      if (d > today) balance -= dailySpend;
      projected.set(dayKey(d), { balance: Math.round(balance), events });
    }
  }

  for (let d = dayStart(from); d <= to; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    const k = dayKey(d);
    const past = d < today;
    const real = byDay.get(k) || [];
    const p = projected.get(k);
    out.set(k, {
      date: new Date(d), past,
      net: past ? real.reduce((s, e) => s + e.amount, 0) : 0,
      balance: past ? null : p ? p.balance : null,
      events: past ? real : p ? p.events : [],
    });
  }
  return out;
}
