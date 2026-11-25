// Alertas de gasto raro: categorías en las que este mes vas gastando bastante más de lo normal.
// Compara lo gastado del día 1 a hoy con lo que gastaste en el MISMO tramo (del 1 al mismo día) en
// los 3 meses anteriores, para no comparar medio mes contra meses completos.
// Solo gastos del día a día: los fijos (arriendo, servicios) se pagan una vez y darían falsas alarmas.
import type { Transaction } from './firestore';

export interface SpendingAlert {
  category: string;
  current: number;  // lo gastado este mes hasta hoy
  usual: number;    // promedio de los meses anteriores en el mismo tramo
  pct: number;      // cuánto más, en %
}

const toDate = (v: any): Date => (v instanceof Date ? v : v?.toDate ? v.toDate() : new Date(v));

/**
 * @param minDiff diferencia mínima en plata para avisar (evita alertas por montos pequeños)
 * @param ratio cuánto más que lo normal para considerarlo raro (1.4 = 40 % más)
 */
export function detectUnusualSpending(transactions: Transaction[], now = new Date(), minDiff = 30000, ratio = 1.4): SpendingAlert[] {
  const day = now.getDate();
  const sumFor = (y: number, m: number) => {
    const last = new Date(y, m + 1, 0).getDate();
    const until = new Date(y, m, Math.min(day, last), 23, 59, 59, 999);
    const from = new Date(y, m, 1);
    const out = new Map<string, number>();
    for (const t of transactions) {
      if (t.type !== 'gasto' || t.isFixed) continue;
      const d = toDate(t.date);
      if (d < from || d > until) continue;
      out.set(t.category, (out.get(t.category) || 0) + (Number(t.amount) || 0));
    }
    return out;
  };

  const current = sumFor(now.getFullYear(), now.getMonth());
  const past = [1, 2, 3].map(k => {
    const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
    return sumFor(d.getFullYear(), d.getMonth());
  });

  const alerts: SpendingAlert[] = [];
  current.forEach((spent, category) => {
    const history = past.map(m => m.get(category) || 0).filter(v => v > 0);
    if (history.length < 2) return; // sin costumbre todavía: no se puede decir que es raro
    const usual = history.reduce((a, b) => a + b, 0) / history.length;
    if (spent >= usual * ratio && spent - usual >= minDiff) {
      alerts.push({ category, current: spent, usual: Math.round(usual), pct: Math.round((spent / usual - 1) * 100) });
    }
  });
  return alerts.sort((a, b) => (b.current - b.usual) - (a.current - a.usual)).slice(0, 2);
}
