import { Transaction, isFixedExpenseCategory } from './firestore';
import { getLocalDateString, getLocalMonthString } from './dateUtils';

// "Hoy puedes gastar": lo que queda libre repartido entre los días que faltan, contando hoy.
// Los gastos variables de hoy se descuentan de la cuota de hoy y no de los días siguientes.
//  - Modo "mes" (sin cuentas): ingresos del mes (o presupuesto) − gastos del mes − compromisos
//    por pagar − lo que se fue a CDT, hasta fin de mes.
//  - Modo "cuentas" (con cuentas para gastar): la plata real de esas cuentas − lo que se debe en
//    tarjetas − compromisos por pagar, hasta el día del próximo ingreso.

export interface DailyBudget {
  hasBase: boolean;      // hay ingresos o presupuesto con qué calcular
  base: number;           // ingresos del mes, o el presupuesto si no hay ingresos
  baseIsBudget: boolean;
  spentMonth: number;     // todos los gastos del mes (igual que la tarjeta Gastos)
  pendingCommitments: number;
  savedMonth: number;     // plata del mes que se fue a CDT (ahorro, no gasto)
  freeAtStartOfDay: number; // lo libre para repartir desde hoy hasta fin de mes
  todayAllowance: number; // cuota para hoy al empezar el día
  spentToday: number;     // gastos variables de hoy
  remainingToday: number; // negativo = se pasó hoy
  daysLeft: number;       // incluye hoy
  tomorrowAllowance: number | null; // cuota de cada día desde mañana con lo que va hoy (null el último día)
  mode: 'mes' | 'cuentas';
  cash: number;           // modo cuentas: plata en las cuentas para gastar
  cardDebt: number;       // modo cuentas: lo que se debe en tarjetas de crédito
  nextIncome: Date | null; // modo cuentas: fecha estimada del próximo ingreso
}

export interface RealMoney {
  cash: number;
  cardDebt: number;
  nextIncome: Date;
}

// Fecha probable del próximo ingreso principal: el día del mes en que llegó el ingreso más grande
// del último mes con ingresos. Si no hay historial, el primero del mes siguiente.
export function estimateNextIncome(transactions: Transaction[], now = new Date()): Date {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let usualDay: number | null = null;
  for (let back = 1; back <= 3 && usualDay === null; back++) {
    const ref = getLocalMonthString(new Date(now.getFullYear(), now.getMonth() - back, 1));
    const incomes = transactions.filter(t => t.type === 'ingreso' && getLocalMonthString(toDate(t.date)) === ref);
    if (incomes.length) usualDay = toDate(incomes.reduce((a, b) => (b.amount > a.amount ? b : a)).date).getDate();
  }
  if (usualDay === null) return new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const at = (y: number, m: number) => new Date(y, m, Math.min(usualDay!, new Date(y, m + 1, 0).getDate()));
  const thisMonth = at(today.getFullYear(), today.getMonth());
  return thisMonth > today ? thisMonth : at(today.getFullYear(), today.getMonth() + 1);
}

function toDate(v: any): Date {
  if (v instanceof Date) return v;
  if (v && typeof v.toDate === 'function') return v.toDate();
  return new Date(v);
}

const isFixedTx = (t: Transaction) => t.isFixed !== undefined ? t.isFixed : isFixedExpenseCategory(t.category);

export function getDailyBudget(transactions: Transaction[], budget = 0, pendingCommitments = 0, now = new Date(), savedMonth = 0, real?: RealMoney | null): DailyBudget {
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

  if (real) {
    const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const daysLeft = Math.max(1, Math.round((real.nextIncome.getTime() - today0.getTime()) / 86400000));
    // Los gastos de hoy ya salieron de las cuentas: se suman de vuelta para la cuota de la mañana
    const freeAtStartOfDay = real.cash - real.cardDebt - pendingCommitments + spentToday;
    const todayAllowance = Math.max(0, freeAtStartOfDay / daysLeft);
    return {
      hasBase: true, base: real.cash, baseIsBudget: false, spentMonth: gastos, pendingCommitments, savedMonth: 0,
      freeAtStartOfDay, todayAllowance, spentToday, remainingToday: todayAllowance - spentToday, daysLeft,
      tomorrowAllowance: daysLeft > 1 ? Math.max(0, (freeAtStartOfDay - spentToday) / (daysLeft - 1)) : null,
      mode: 'cuentas', cash: real.cash, cardDebt: real.cardDebt, nextIncome: real.nextIncome,
    };
  }

  const base = ingresos > 0 ? ingresos : budget;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(1, daysInMonth - now.getDate() + 1);
  const freeAtStartOfDay = base - gastos - pendingCommitments - savedMonth + spentToday;
  const todayAllowance = Math.max(0, freeAtStartOfDay / daysLeft);

  return {
    hasBase: base > 0,
    base,
    baseIsBudget: ingresos <= 0 && budget > 0,
    spentMonth: gastos,
    pendingCommitments,
    savedMonth,
    freeAtStartOfDay,
    todayAllowance,
    spentToday,
    remainingToday: todayAllowance - spentToday,
    daysLeft,
    tomorrowAllowance: daysLeft > 1 ? Math.max(0, (freeAtStartOfDay - spentToday) / (daysLeft - 1)) : null,
    mode: 'mes', cash: 0, cardDebt: 0, nextIncome: null,
  };
}
