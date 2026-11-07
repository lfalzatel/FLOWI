import { Investment } from './firestore';

// Cálculos de "Mis inversiones" (CDT).
// Si el banco informa los intereses del periodo se usan tal cual; si no, se estiman con la
// tasa efectiva anual: capital × ((1 + E.A.)^(días/360) − 1), con días contados como los bancos
// colombianos (meses de 30 días, año de 360: 18 oct → 29 ene = 101 días). Lo ganado a la fecha se reparte
// en proporción a los días corridos (los CDT pagan al vencer, así que es lo que "llevas").

const DAY = 86400000;

export const DEFAULT_WITHHOLDING = 4; // % de retención en la fuente sobre los rendimientos de un CDT

export function parseDay(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const daysBetween = (a: Date, b: Date) => Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY);

// Días entre dos fechas con la convención 30/360 de los bancos
export function days360(a: Date, b: Date): number {
  let d1 = a.getDate(), d2 = b.getDate();
  if (d1 === 31) d1 = 30;
  if (d2 === 31 && d1 === 30) d2 = 30;
  return (b.getFullYear() - a.getFullYear()) * 360 + (b.getMonth() - a.getMonth()) * 30 + (d2 - d1);
}

export function addMonthsKey(start: string, months: number): string {
  const d = parseDay(start);
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d.getDate(), last));
  return dayKey(target);
}

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function estimateInterest(amount: number, rateEA: number, days: number): number {
  if (amount <= 0 || rateEA <= 0 || days <= 0) return 0;
  return Math.round(amount * (Math.pow(1 + rateEA / 100, days / 360) - 1));
}

export interface InvestmentStatus {
  termDays: number;
  elapsedDays: number;
  daysLeft: number;         // negativo si ya venció
  progress: number;         // 0..1
  interest: number;         // intereses brutos del periodo
  isEstimate: boolean;
  earnedToDate: number;
  withholding: number;
  netInterest: number;
  netAtMaturity: number;    // capital + intereses − retención
  matured: boolean;
}

export function investmentStatus(inv: Investment, now = new Date()): InvestmentStatus {
  const start = parseDay(inv.startDate);
  const end = parseDay(inv.maturityDate);
  const termDays = Math.max(1, days360(start, end));
  const realTerm = Math.max(1, daysBetween(start, end));
  const daysLeft = daysBetween(now, end);
  const progress = Math.min(1, Math.max(0, daysBetween(start, now)) / realTerm);
  const elapsedDays = Math.round(termDays * progress);
  const isEstimate = !(inv.bankInterest && inv.bankInterest > 0);
  const interest = isEstimate ? estimateInterest(inv.amount, inv.rateEA, termDays) : Math.round(inv.bankInterest!);
  const withholding = Math.round(interest * (inv.withholdingPct ?? DEFAULT_WITHHOLDING) / 100);
  const netInterest = interest - withholding;
  return {
    termDays, elapsedDays, daysLeft, progress, interest, isEstimate,
    earnedToDate: Math.round(interest * progress),
    withholding, netInterest,
    netAtMaturity: inv.amount + netInterest,
    matured: daysLeft <= 0,
  };
}

export interface PortfolioSummary {
  active: Investment[];
  invested: number;
  earnedToDate: number;
  netInterest: number;
  avgRate: number;          // E.A. promedio ponderada por capital
  next: { inv: Investment; daysLeft: number } | null;
}

export function portfolioSummary(investments: Investment[], now = new Date()): PortfolioSummary {
  const active = investments.filter(i => i.status === 'activo');
  let invested = 0, earned = 0, net = 0, weighted = 0;
  let next: PortfolioSummary['next'] = null;
  for (const inv of active) {
    const s = investmentStatus(inv, now);
    invested += inv.amount;
    earned += s.earnedToDate;
    net += s.netInterest;
    weighted += inv.amount * inv.rateEA;
    if (!next || s.daysLeft < next.daysLeft) next = { inv, daysLeft: s.daysLeft };
  }
  return { active, invested, earnedToDate: earned, netInterest: net, avgRate: invested ? weighted / invested : 0, next };
}

// Activos primero, por fecha de vencimiento; luego los cerrados
export function sortInvestments(list: Investment[]): Investment[] {
  return [...list].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'activo' ? -1 : 1;
    return a.maturityDate.localeCompare(b.maturityDate);
  });
}

export function formatDay(s: string): string {
  return parseDay(s).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function whenText(daysLeft: number): string {
  if (daysLeft < 0) return `venció hace ${-daysLeft} ${daysLeft === -1 ? 'día' : 'días'}`;
  if (daysLeft === 0) return 'vence hoy';
  if (daysLeft === 1) return 'vence mañana';
  return `vence en ${daysLeft} días`;
}
