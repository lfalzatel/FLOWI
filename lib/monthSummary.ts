import { Transaction, isFixedExpenseCategory } from './firestore';
import { BudgetPillar, pillarOf } from './categoryGroups';
import { getLocalDateString, getLocalMonthString } from './dateUtils';

// Resumen de un mes: totales, comparación con el mes anterior y hallazgos en palabras sencillas.
// Se calcula siempre desde los movimientos (no se guarda), así cualquier mes se puede revisar.

type Resolver = (label: string, type?: 'gasto' | 'ingreso') => { label: string; group: string };

export interface CategoryLine {
  label: string;
  amount: number;
  prev: number;
  change: number | null; // % frente al mes anterior (null si no hubo gasto antes)
}

export interface Insight {
  emoji: string;
  text: string;
  tone: 'good' | 'bad' | 'info';
}

export interface MonthSummary {
  month: string;          // YYYY-MM
  prevMonth: string;
  monthName: string;      // "octubre"
  prevName: string;
  ingresos: number;
  gastos: number;
  balance: number;
  prevGastos: number;
  prevIngresos: number;
  gastosChange: number | null;
  savingsRate: number | null; // % de los ingresos que sobró
  categories: CategoryLine[];  // ordenadas de mayor a menor gasto
  pillars: Record<BudgetPillar, number>;
  biggest: Transaction | null;
  smallCount: number;
  smallTotal: number;
  daysWithoutSpending: number;
  daysInMonth: number;
  avgDaily: number;
  fixed: number;
  variable: number;
  insights: Insight[];
  hasData: boolean;
}

const SMALL = 20000; // "gasto hormiga": variable y menor a esto

function toDate(v: any): Date {
  if (v instanceof Date) return v;
  if (v && typeof v.toDate === 'function') return v.toDate();
  return new Date(v);
}

const pct = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : null);
const isFixedTx = (t: Transaction) => (t.isFixed !== undefined ? t.isFixed : isFixedExpenseCategory(t.category));

export function monthNameOf(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('es-CO', { month: 'long' });
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  return getLocalMonthString(new Date(y, m - 1 + delta, 1));
}

export function buildMonthSummary(
  transactions: Transaction[], month: string, resolve: Resolver, fmt: (n: number) => string, now = new Date(),
): MonthSummary {
  const prevMonth = shiftMonth(month, -1);
  const cur: Transaction[] = [], prev: Transaction[] = [];
  for (const t of transactions) {
    const m = getLocalMonthString(toDate(t.date));
    if (m === month) cur.push(t); else if (m === prevMonth) prev.push(t);
  }
  const sum = (list: Transaction[], type: 'gasto' | 'ingreso') => list.filter(t => t.type === type).reduce((s, t) => s + t.amount, 0);
  const ingresos = sum(cur, 'ingreso'), gastos = sum(cur, 'gasto');
  const prevIngresos = sum(prev, 'ingreso'), prevGastos = sum(prev, 'gasto');

  const byCat = (list: Transaction[]) => {
    const map = new Map<string, number>();
    for (const t of list) if (t.type === 'gasto') {
      const label = resolve(t.category).label;
      map.set(label, (map.get(label) || 0) + t.amount);
    }
    return map;
  };
  const curCat = byCat(cur), prevCat = byCat(prev);
  const categories: CategoryLine[] = Array.from(curCat.entries())
    .map(([label, amount]) => ({ label, amount, prev: prevCat.get(label) || 0, change: pct(amount, prevCat.get(label) || 0) }))
    .sort((a, b) => b.amount - a.amount);

  const pillars: Record<BudgetPillar, number> = { necesidades: 0, deseos: 0, ahorro: 0 };
  let fixed = 0, variable = 0, smallCount = 0, smallTotal = 0;
  let biggest: Transaction | null = null;
  const spendDays = new Set<string>();
  for (const t of cur) {
    if (t.type !== 'gasto') continue;
    const r = resolve(t.category);
    pillars[pillarOf(r.label, r.group)] += t.amount;
    if (isFixedTx(t)) fixed += t.amount;
    else {
      variable += t.amount;
      spendDays.add(getLocalDateString(toDate(t.date)));
      if (t.amount < SMALL) { smallCount++; smallTotal += t.amount; }
    }
    if (!biggest || t.amount > biggest.amount) biggest = t;
  }

  const [y, m] = month.split('-').map(Number);
  const total = new Date(y, m, 0).getDate();
  const isCurrent = month === getLocalMonthString(now);
  const daysInMonth = isCurrent ? now.getDate() : total; // en el mes en curso, solo los días que van
  const daysWithoutSpending = Math.max(0, daysInMonth - spendDays.size);
  const avgDaily = daysInMonth ? variable / daysInMonth : 0;
  const savingsRate = ingresos > 0 ? ((ingresos - gastos) / ingresos) * 100 : null;
  const gastosChange = pct(gastos, prevGastos);
  const monthName = monthNameOf(month), prevName = monthNameOf(prevMonth);

  // ── Hallazgos ──
  const insights: Insight[] = [];
  const r1 = (n: number) => Math.round(Math.abs(n));
  if (gastos > 0 && gastosChange !== null && Math.abs(gastosChange) >= 3) {
    insights.push(gastosChange > 0
      ? { emoji: '📈', tone: 'bad', text: `Gastaste ${r1(gastosChange)} % más que en ${prevName} (${fmt(gastos - prevGastos)} más).` }
      : { emoji: '📉', tone: 'good', text: `Gastaste ${r1(gastosChange)} % menos que en ${prevName} (${fmt(prevGastos - gastos)} menos). ¡Bien!` });
  }
  if (ingresos > 0) {
    insights.push(ingresos >= gastos
      ? { emoji: '💰', tone: 'good', text: `Te sobraron ${fmt(ingresos - gastos)}: el ${r1(savingsRate || 0)} % de lo que te ingresó.` }
      : { emoji: '⚠️', tone: 'bad', text: `Gastaste ${fmt(gastos - ingresos)} más de lo que te ingresó.` });
  }
  // Categoría que más subió y la que más bajó (cambios que importan: ≥ 20 % y ≥ $30.000)
  const ups = categories.filter(c => c.prev > 0 && c.change !== null && c.change >= 20 && c.amount - c.prev >= 30000)
    .sort((a, b) => (b.amount - b.prev) - (a.amount - a.prev));
  if (ups[0]) insights.push({ emoji: '🔺', tone: 'bad', text: `Gastaste ${r1(ups[0].change!)} % más en ${ups[0].label} que en ${prevName} (+${fmt(ups[0].amount - ups[0].prev)}).` });
  const downs = Array.from(prevCat.entries())
    .map(([label, p]) => ({ label, prev: p, amount: curCat.get(label) || 0 }))
    .filter(c => c.prev - c.amount >= 30000 && (c.prev - c.amount) / c.prev >= 0.2)
    .sort((a, b) => (b.prev - b.amount) - (a.prev - a.amount));
  if (downs[0]) insights.push({ emoji: '🔻', tone: 'good', text: `Bajaste ${r1(((downs[0].prev - downs[0].amount) / downs[0].prev) * 100)} % en ${downs[0].label} (−${fmt(downs[0].prev - downs[0].amount)}).` });
  if (categories[0] && gastos > 0) {
    insights.push({ emoji: '🏆', tone: 'info', text: `Lo que más se llevó tu plata: ${categories[0].label}, con ${fmt(categories[0].amount)} (${r1((categories[0].amount / gastos) * 100)} % de tus gastos).` });
  }
  const nuevos = categories.filter(c => c.prev === 0 && c.amount >= 50000);
  if (nuevos[0]) insights.push({ emoji: '🆕', tone: 'info', text: `Gasto nuevo este mes: ${nuevos[0].label} (${fmt(nuevos[0].amount)}).` });
  if (smallCount >= 5) {
    insights.push({ emoji: '🐜', tone: smallTotal >= 100000 ? 'bad' : 'info', text: `${smallCount} gastos pequeños (menos de ${fmt(SMALL)}) sumaron ${fmt(smallTotal)}.` });
  }
  if (daysInMonth > 0 && daysWithoutSpending > 0) {
    insights.push({ emoji: '🗓️', tone: 'good', text: `${daysWithoutSpending} ${daysWithoutSpending === 1 ? 'día' : 'días'} sin gastos del día a día.` });
  }
  if (biggest) insights.push({ emoji: '💸', tone: 'info', text: `Tu gasto más grande: ${biggest.description?.trim() || biggest.category} por ${fmt(biggest.amount)}.` });
  if (ingresos > 0 && gastos > 0) {
    const needs = (pillars.necesidades / ingresos) * 100, wants = (pillars.deseos / ingresos) * 100;
    if (wants > 30) insights.push({ emoji: '🎯', tone: 'bad', text: `En estilo de vida se fue el ${r1(wants)} % de tus ingresos; la regla 50/30/20 sugiere máximo 30 %.` });
    else if (needs > 50) insights.push({ emoji: '🎯', tone: 'info', text: `Tus necesidades se llevaron el ${r1(needs)} % de tus ingresos; lo ideal es cerca del 50 %.` });
  }

  return {
    month, prevMonth, monthName, prevName, ingresos, gastos, balance: ingresos - gastos, prevGastos, prevIngresos,
    gastosChange, savingsRate, categories, pillars, biggest, smallCount, smallTotal, daysWithoutSpending,
    daysInMonth, avgDaily, fixed, variable, insights, hasData: cur.length > 0,
  };
}
