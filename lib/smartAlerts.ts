// Alertas inteligentes: avisos que FLOWI da solo (sin que la persona cree un recordatorio).
// - Presupuesto del mes: al llegar al 80 % y al pasar el 100 %.
// - Presupuesto de cada categoría (Presupuestos → por categoría): al 80 % y al 100 %.
// - Gasto raro: una categoría que este mes va bastante por encima de lo normal (lib/spendingAlerts.ts).
// Cada alerta tiene una clave con el mes, para avisar una sola vez por mes (ver components/alerts).
import type { Transaction } from './firestore';
import { detectUnusualSpending } from './spendingAlerts';

export interface SmartAlert {
  key: string;      // única por mes: "2026-11|global|80", "2026-11|cat|Mercado|100", "2026-11|raro|Domicilios"
  kind: 'global' | 'category' | 'unusual';
  level: 80 | 100 | null;
  label?: string;   // categoría
  spent: number;
  limit: number;    // presupuesto, o lo normal en un gasto raro
  pct: number;      // % usado del presupuesto, o % de más en un gasto raro
}

const toDate = (v: any): Date => (v instanceof Date ? v : v?.toDate ? v.toDate() : new Date(v));
export const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/**
 * @param resolveLabel convierte la categoría guardada en el nombre con el que se guarda su presupuesto
 *                     (el mismo de Presupuestos → por categoría)
 * @param skipGlobal   true si la persona ya tiene su propia "Alerta de presupuesto" en Recordatorios
 */
export function computeSmartAlerts(opts: {
  transactions: Transaction[];
  budget?: number;
  categoryBudgets?: Record<string, number>;
  resolveLabel?: (category: string) => string;
  minDiff?: number;
  skipGlobal?: boolean;
  now?: Date;
}): SmartAlert[] {
  const now = opts.now ?? new Date();
  const mk = monthKey(now);
  const resolve = opts.resolveLabel ?? ((c: string) => c);
  const level = (pct: number): 80 | 100 | null => (pct >= 100 ? 100 : pct >= 80 ? 80 : null);

  let total = 0;
  const byLabel = new Map<string, number>();
  for (const t of opts.transactions) {
    if (t.type !== 'gasto') continue;
    const d = toDate(t.date);
    if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) continue;
    const a = Number(t.amount) || 0;
    total += a;
    if (t.category) {
      const l = resolve(t.category);
      byLabel.set(l, (byLabel.get(l) || 0) + a);
    }
  }

  const out: SmartAlert[] = [];
  const budget = opts.budget || 0;
  if (budget > 0 && !opts.skipGlobal) {
    const pct = Math.round((total / budget) * 100);
    const lv = level(pct);
    if (lv) out.push({ key: `${mk}|global|${lv}`, kind: 'global', level: lv, spent: total, limit: budget, pct });
  }

  for (const [label, limit] of Object.entries(opts.categoryBudgets || {})) {
    if (!(limit > 0)) continue;
    const spent = byLabel.get(label) || 0;
    const pct = Math.round((spent / limit) * 100);
    const lv = level(pct);
    if (lv) out.push({ key: `${mk}|cat|${label}|${lv}`, kind: 'category', level: lv, label, spent, limit, pct });
  }

  for (const u of detectUnusualSpending(opts.transactions, now, opts.minDiff ?? 30000)) {
    out.push({ key: `${mk}|raro|${u.category}`, kind: 'unusual', level: null, label: u.category, spent: u.current, limit: u.usual, pct: u.pct });
  }
  return out;
}

/**
 * Las que faltan por avisar. Si en el mismo mes ya se avisó el 100 %, no se avisa además el 80 %
 * (pasa cuando un solo gasto grande cruza las dos líneas).
 */
export function pendingAlerts(alerts: SmartAlert[], seen: Set<string>): SmartAlert[] {
  return alerts.filter(a => {
    if (seen.has(a.key)) return false;
    if (a.level === 80 && seen.has(a.key.replace(/\|80$/, '|100'))) return false;
    if (a.level === 80 && alerts.some(b => b.key === a.key.replace(/\|80$/, '|100'))) return false;
    return true;
  });
}
