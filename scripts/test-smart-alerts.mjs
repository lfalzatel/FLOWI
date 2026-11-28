// Prueba de las alertas inteligentes (lib/smartAlerts.ts).
// Uso: node scripts/test-smart-alerts.mjs   (sale con código 1 si alguna falla)
import { loadTs, tester } from './lib/load-ts.mjs';

const A = await loadTs('lib/smartAlerts.ts');
const { eq, done } = tester();
const now = new Date('2026-11-20T12:00:00');
const g = (amount, when, category = 'Mercado') => ({ userId: 'u', type: 'gasto', amount, category, date: new Date(when) });

// Presupuesto global 1.000.000: 850.000 este mes → 80 %; lo de octubre no cuenta
const tx = [g(500000, '2026-11-02'), g(350000, '2026-11-15', 'Domicilios'), g(900000, '2026-10-10')];
let r = A.computeSmartAlerts({ transactions: tx, budget: 1000000, now, minDiff: 30000 });
eq('global al 80 %', r.map(a => a.key), ['2026-11|global|80']);
eq('porcentaje global', r[0].pct, 85);

// Si ya tiene su propia alerta en Recordatorios no se repite la global
r = A.computeSmartAlerts({ transactions: tx, budget: 1000000, now, skipGlobal: true });
eq('sin global si ya hay recordatorio', r.length, 0);

// Presupuesto por categoría: Mercado 400.000 → 125 % (100); Domicilios 400.000 → 87 % (80)
r = A.computeSmartAlerts({ transactions: tx, categoryBudgets: { Mercado: 400000, Domicilios: 400000, Ropa: 100000 }, now });
eq('categorías al 80 y 100 %', r.map(a => a.key).sort(), ['2026-11|cat|Domicilios|80', '2026-11|cat|Mercado|100']);

// El nombre de la categoría se resuelve igual que en Presupuestos
r = A.computeSmartAlerts({ transactions: [g(90000, '2026-11-03', 'super')], categoryBudgets: { Mercado: 100000 }, resolveLabel: c => (c === 'super' ? 'Mercado' : c), now });
eq('resuelve alias', r.map(a => a.key), ['2026-11|cat|Mercado|80']);

// Sin presupuesto no hay avisos de presupuesto
eq('sin presupuesto, sin avisos', A.computeSmartAlerts({ transactions: tx, now }).length, 0);

// Pendientes: no repetir las ya vistas y no avisar 80 % si ya va en 100 %
const all = [
  { key: '2026-11|global|80', level: 80 }, { key: '2026-11|global|100', level: 100 },
  { key: '2026-11|cat|Mercado|80', level: 80 }, { key: '2026-11|raro|Domicilios', level: null },
];
eq('pendientes', A.pendingAlerts(all, new Set(['2026-11|raro|Domicilios'])).map(a => a.key), ['2026-11|global|100', '2026-11|cat|Mercado|80']);
eq('80 después de 100 no avisa', A.pendingAlerts([{ key: '2026-11|cat|Ropa|80', level: 80 }], new Set(['2026-11|cat|Ropa|100'])).length, 0);

// Gasto raro: costumbre ~100.000 en restaurantes y este mes 300.000
const hist = [g(100000, '2026-08-10', 'Restaurantes'), g(90000, '2026-09-08', 'Restaurantes'), g(110000, '2026-10-12', 'Restaurantes'), g(300000, '2026-11-05', 'Restaurantes')];
r = A.computeSmartAlerts({ transactions: hist, now });
eq('gasto raro', r.map(a => a.key), ['2026-11|raro|Restaurantes']);
eq('% de más', r[0].pct, 200);

done();
