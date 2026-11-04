import { Transaction, isFixedExpenseCategory } from './firestore';
import { getLocalMonthString } from './dateUtils';

// "Cerrar el mes": durante los primeros días de cada mes se invita a revisar cómo fue el anterior,
// mover lo que sobró a una meta y dejarlo cerrado. Los meses cerrados quedan en el perfil.

export const CLOSE_OFFER_DAYS = 15;

export interface MonthReview {
  month: string;          // YYYY-MM
  label: string;          // "octubre"
  ingresos: number;
  gastos: number;
  fijos: number;
  variables: number;
  result: number;         // ingresos − gastos (negativo = faltó)
  topCategories: { category: string; amount: number }[];
  prevGastos: number | null; // gastos del mes anterior a ese, para comparar
  count: number;
}

function toDate(v: any): Date {
  if (v instanceof Date) return v;
  if (v && typeof v.toDate === 'function') return v.toDate();
  return new Date(v);
}

const isFixedTx = (t: Transaction) => t.isFixed !== undefined ? t.isFixed : isFixedExpenseCategory(t.category);

export function previousMonth(now = new Date()): string {
  return getLocalMonthString(new Date(now.getFullYear(), now.getMonth() - 1, 1));
}

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('es-CO', { month: 'long' });
}

export function getMonthReview(transactions: Transaction[], month: string): MonthReview {
  const [y, m] = month.split('-').map(Number);
  const before = getLocalMonthString(new Date(y, m - 2, 1));
  let ingresos = 0, fijos = 0, variables = 0, count = 0, prevGastos = 0, prevCount = 0;
  const byCategory = new Map<string, number>();

  for (const t of transactions) {
    const key = getLocalMonthString(toDate(t.date));
    if (key === before && t.type === 'gasto') { prevGastos += t.amount; prevCount++; }
    if (key !== month) continue;
    count++;
    if (t.type === 'ingreso') { ingresos += t.amount; continue; }
    if (isFixedTx(t)) fijos += t.amount; else variables += t.amount;
    byCategory.set(t.category, (byCategory.get(t.category) || 0) + t.amount);
  }

  const gastos = fijos + variables;
  return {
    month,
    label: monthLabel(month),
    ingresos, gastos, fijos, variables,
    result: ingresos - gastos,
    topCategories: Array.from(byCategory.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3),
    prevGastos: prevCount ? prevGastos : null,
    count,
  };
}

// El mes anterior por cerrar, si toca mostrar la invitación (null si no)
export function monthToClose(transactions: Transaction[], closedMonths: string[] = [], now = new Date()): string | null {
  if (now.getDate() > CLOSE_OFFER_DAYS) return null;
  const month = previousMonth(now);
  if (closedMonths.includes(month)) return null;
  const hasData = transactions.some(t => getLocalMonthString(toDate(t.date)) === month);
  return hasData ? month : null;
}
