// Prueba de las alertas de gasto raro (lib/spendingAlerts.ts).
// Uso: node scripts/test-spending-alerts.mjs   (sale con código 1 si alguna falla)
import { loadTs, tester } from './lib/load-ts.mjs';

const A = await loadTs('lib/spendingAlerts.ts');
const { eq, done } = tester();
const now = new Date('2026-11-15T18:00:00'); // mitad de mes
const g = (amount, when, category = 'Restaurantes', extra = {}) => ({ userId: 'u', type: 'gasto', amount, category, date: new Date(when), ...extra });

// Costumbre: ~100.000 en restaurantes del 1 al 15 en agosto, septiembre y octubre
const history = [g(100000, '2026-08-10'), g(90000, '2026-09-08'), g(110000, '2026-10-12')];

{
  const r = A.detectUnusualSpending([...history, g(160000, '2026-11-05')], now);
  eq('avisa cuando va 60 % más', r.length, 1);
  eq('categoría', r[0]?.category, 'Restaurantes');
  eq('lo normal es el promedio del mismo tramo', r[0]?.usual, 100000);
  eq('porcentaje', r[0]?.pct, 60);
}
{
  const r = A.detectUnusualSpending([...history, g(120000, '2026-11-05')], now);
  eq('20 % más no es raro', r.length, 0);
}
{
  // Lo gastado después del día 15 en meses anteriores no cuenta (se compara el mismo tramo)
  const r = A.detectUnusualSpending([...history, g(500000, '2026-10-25'), g(160000, '2026-11-05')], now);
  eq('solo cuenta del 1 al mismo día', r[0]?.usual, 100000);
}
{
  const r = A.detectUnusualSpending([g(50000, '2026-10-12'), g(200000, '2026-11-05')], now);
  eq('con un solo mes de historia no avisa', r.length, 0);
}
{
  const r = A.detectUnusualSpending([...history.map(t => ({ ...t, isFixed: true })), g(300000, '2026-11-02', 'Restaurantes', { isFixed: true })], now);
  eq('los gastos fijos no cuentan', r.length, 0);
}
{
  const small = [g(10000, '2026-08-10', 'Tinto'), g(10000, '2026-09-10', 'Tinto'), g(10000, '2026-10-10', 'Tinto'), g(25000, '2026-11-05', 'Tinto')];
  eq('diferencias pequeñas no alertan', A.detectUnusualSpending(small, now).length, 0);
}

done();
