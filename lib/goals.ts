import { Goal, GoalPriority, Transaction } from './firestore';

// Cálculos de Metas de ahorro: capacidad real de ahorro, reparto por prioridad y fecha estimada.

export const PRIORITY_WEIGHT: Record<GoalPriority, number> = { alta: 3, media: 2, baja: 1 };
export const PRIORITY_LABEL: Record<GoalPriority, string> = { alta: 'Alta', media: 'Media', baja: 'Baja' };

export const GOAL_EMOJIS = ['🎯', '🏠', '🚗', '🏍️', '✈️', '🎓', '💻', '📱', '💍', '👶', '🐶', '🏥', '🛡️', '🎁', '🎄', '💰'];

export function isGoalDone(goal: Goal): boolean {
  return goal.targetAmount > 0 && goal.savedAmount >= goal.targetAmount;
}

export function goalProgress(goal: Goal): number {
  if (goal.targetAmount <= 0) return 0;
  return Math.min(1, goal.savedAmount / goal.targetAmount);
}

const createdMs = (g: Goal) => (g.createdAt instanceof Date ? g.createdAt.getTime() : 0);

// Activas primero (por prioridad y antigüedad); las cumplidas al final
export function sortGoals(goals: Goal[]): Goal[] {
  return [...goals].sort((a, b) => {
    const doneDiff = Number(isGoalDone(a)) - Number(isGoalDone(b));
    if (doneDiff) return doneDiff;
    const prioDiff = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
    if (prioDiff) return prioDiff;
    return createdMs(a) - createdMs(b);
  });
}

function toDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export interface SavingCapacity {
  monthly: number;      // promedio mensual de (ingresos − gastos), nunca negativo
  monthsUsed: number;   // cuántos meses con movimientos entraron en el promedio
  rawAverage: number;   // promedio sin recortar (puede ser negativo)
}

// Promedio de lo que te sobró en los últimos meses completos (sin contar el mes en curso)
export function getSavingCapacity(transactions: Transaction[], monthsBack = 3, now = new Date()): SavingCapacity {
  const months = new Map<string, number>();
  for (let i = 1; i <= monthsBack; i++) {
    months.set(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)), 0);
  }
  const withData = new Set<string>();
  for (const t of transactions) {
    const d = toDate(t.date);
    if (!d) continue;
    const key = monthKey(d);
    if (!months.has(key)) continue;
    withData.add(key);
    months.set(key, months.get(key)! + (t.type === 'ingreso' ? t.amount : -t.amount));
  }
  if (withData.size === 0) return { monthly: 0, monthsUsed: 0, rawAverage: 0 };
  const total = Array.from(withData).reduce((s, k) => s + months.get(k)!, 0);
  const rawAverage = total / withData.size;
  return { monthly: Math.max(0, Math.round(rawAverage)), monthsUsed: withData.size, rawAverage };
}

// Reparte la capacidad mensual entre las metas activas según su prioridad
export function allocateCapacity(goals: Goal[], monthly: number): Map<string, number> {
  const active = goals.filter(g => g.id && !isGoalDone(g));
  const totalWeight = active.reduce((s, g) => s + PRIORITY_WEIGHT[g.priority], 0);
  const shares = new Map<string, number>();
  for (const g of active) {
    shares.set(g.id!, totalWeight ? (monthly * PRIORITY_WEIGHT[g.priority]) / totalWeight : 0);
  }
  return shares;
}

// Meses que quedan hasta la fecha límite (YYYY-MM), contando el mes en curso
export function monthsUntil(deadline: string, now = new Date()): number {
  const [y, m] = deadline.split('-').map(Number);
  return (y - now.getFullYear()) * 12 + (m - 1 - now.getMonth()) + 1;
}

export interface GoalProjection {
  remaining: number;
  monthsAtPace: number | null;  // null si al ritmo actual no se llega
  etaDate: Date | null;
  monthsToDeadline: number | null;
  requiredPerMonth: number | null;
  onTrack: boolean | null;      // null si no tiene fecha límite
}

export function projectGoal(goal: Goal, monthlyShare: number, now = new Date()): GoalProjection {
  const remaining = Math.max(0, goal.targetAmount - goal.savedAmount);
  const monthsAtPace = remaining === 0 ? 0 : monthlyShare > 0 ? Math.ceil(remaining / monthlyShare) : null;
  // El mes en curso cuenta como la primera cuota (igual que en monthsUntil)
  const etaDate = monthsAtPace === null ? null : new Date(now.getFullYear(), now.getMonth() + Math.max(0, monthsAtPace - 1), 1);
  const monthsToDeadline = goal.deadline ? monthsUntil(goal.deadline, now) : null;
  const requiredPerMonth = monthsToDeadline === null ? null : monthsToDeadline > 0 ? Math.ceil(remaining / monthsToDeadline) : remaining;
  const onTrack = monthsToDeadline === null
    ? null
    : remaining === 0 || (monthsAtPace !== null && monthsAtPace <= Math.max(0, monthsToDeadline));
  return { remaining, monthsAtPace, etaDate, monthsToDeadline, requiredPerMonth, onTrack };
}

export function formatMonthYear(d: Date): string {
  return d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
}

export function formatMonthsText(months: number): string {
  if (months <= 0) return 'este mes';
  if (months === 1) return '1 mes';
  if (months < 12) return `${months} meses`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return `${years} ${years === 1 ? 'año' : 'años'}${rest ? ` y ${rest} ${rest === 1 ? 'mes' : 'meses'}` : ''}`;
}
