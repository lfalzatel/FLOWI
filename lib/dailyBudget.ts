import { Transaction, isFixedExpenseCategory } from './firestore';
import { getLocalDateString, getLocalMonthString } from './dateUtils';

// "Hoy puedes gastar": lo que queda libre del mes (ingresos o presupuesto, menos gastos y menos
// compromisos por pagar) repartido entre los días que faltan, contando hoy. Los gastos variables
// de hoy se descuentan de la cuota de hoy y no de los días siguientes.

export interface DailyBudget {
  hasBase: boolean;      // hay ingresos o presupuesto con qué calcular
  base: number;           // ingresos del mes, o el presupuesto si no hay ingresos
  baseIsBudget: boolean;
  spentMonth: number;     // todos los gastos del mes (igual que la tarjeta Gastos)
  pendingCommitments: number;
  freeAtStartOfDay: number; // lo libre para repartir desde hoy hasta fin de mes
  todayAllowance: number; // cuota para hoy al empezar el día
  spentToday: number;     // gastos variables de hoy
  remainingToday: number; // negativo = se pasó hoy
  daysLeft: number;       // incluye hoy
  tomorrowAllowance: number | null; // cuota de cada día desde mañana con lo que va hoy (null el último día)
}

function toDate(v: any): Date {
  if (v instanceof Date) return v;
  if (v && typeof v.toDate === 'function') return v.toDate();
  return new Date(v);
}

const isFixedTx = (t: Transaction) => t.isFixed !== undefined ? t.isFixed : isFixedExpenseCategory(t.category);

export function getDailyBudget(transactions: Transaction[], budget = 0, pendingCommitments = 0, now = new Date()): DailyBudget {
  const month = getLocalMonthString(now);
  const today = getLocalDateString(now);
  let ingresos = 0, gastos = 0, spentToday = 0;
  for (const t of transactions) {
    const day = getLocalDateString(toDate(t.date));
    if (!day.startsWith(month)) continue;
    if (t.type === 'ingreso') ingresos += t.amount;
    else {
      gastos += t.amount;
      if (day === today && !isFixedTx(t)) spentToday += t.amount;
    }
  }

  const base = ingresos > 0 ? ingresos : budget;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(1, daysInMonth - now.getDate() + 1);
  const freeAtStartOfDay = base - gastos - pendingCommitments + spentToday;
  const todayAllowance = Math.max(0, freeAtStartOfDay / daysLeft);

  return {
    hasBase: base > 0,
    base,
    baseIsBudget: ingresos <= 0 && budget > 0,
    spentMonth: gastos,
    pendingCommitments,
    freeAtStartOfDay,
    todayAllowance,
    spentToday,
    remainingToday: todayAllowance - spentToday,
    daysLeft,
    tomorrowAllowance: daysLeft > 1 ? Math.max(0, (freeAtStartOfDay - spentToday) / (daysLeft - 1)) : null,
  };
}
