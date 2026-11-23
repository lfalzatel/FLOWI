// Prueba de "Hoy puedes gastar" (lib/dailyBudget.ts): cuota diaria con la plata real de las cuentas.
// Uso: node scripts/test-daily-budget.mjs   (sale con código 1 si alguna falla)
import { loadTs, tester } from './lib/load-ts.mjs';

const B = await loadTs('lib/dailyBudget.ts');
const { eq, done } = tester();
const now = new Date('2026-11-22T18:00:00');
const next = new Date('2026-12-02T00:00:00'); // 10 días desde hoy (contando hoy)
const g = (amount, when, extra = {}) => ({ userId: 'u', type: 'gasto', amount, category: 'Mercado', date: new Date(when), ...extra });

{
  const r = B.getDailyBudget([], 0, 100000, now, 0, { cash: 1000000, cardDebt: 300000, nextIncome: next });
  eq('libre = cuentas − tarjetas − compromisos', r.freeAtStartOfDay, 600000);
  eq('días hasta el próximo ingreso', r.daysLeft, 10);
  eq('cuota de hoy', Math.round(r.todayAllowance), 60000);
}
{
  // Gastó 20.000 hoy (ya salió de las cuentas): la cuota de la mañana no cambia
  const r = B.getDailyBudget([g(20000, '2026-11-22T10:00:00')], 0, 0, now, 0, { cash: 980000, cardDebt: 0, nextIncome: next });
  eq('lo de hoy se suma de vuelta para la cuota de la mañana', Math.round(r.todayAllowance), 100000);
  eq('lleva gastado hoy', r.spentToday, 20000);
  eq('le queda hoy', Math.round(r.remainingToday), 80000);
}
{
  // Compra de hoy con tarjeta de pago fijo: no salió de las cuentas ni sube lo apartado
  const r = B.getDailyBudget([g(30000, '2026-11-22T09:00:00')], 0, 0, now, 0, { cash: 1000000, cardDebt: 150000, nextIncome: next, fixedCardToday: 30000 });
  eq('pago fijo: no infla la cuota de la mañana', Math.round(r.todayAllowance), 85000);
  eq('pago fijo: la compra cuenta en lo de hoy', r.spentToday, 30000);
}
{
  const r = B.getDailyBudget([], 0, 0, now, 0, { cash: 57042, cardDebt: 701022, nextIncome: next });
  eq('debe más de lo que tiene: cuota 0, sin negativos', r.todayAllowance, 0);
}
{
  // Gasto fijo de hoy (arriendo): no cuenta como gasto del día
  const r = B.getDailyBudget([g(800000, '2026-11-22T08:00:00', { category: 'Arriendo', isFixed: true })], 0, 0, now, 0, { cash: 500000, cardDebt: 0, nextIncome: next });
  eq('gasto fijo no cuenta en lo de hoy', r.spentToday, 0);
}

done();
