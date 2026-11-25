// Prueba del calendario de tu plata (lib/cashCalendar.ts).
// Uso: node scripts/test-cash-calendar.mjs   (sale con código 1 si alguna falla)
import { loadTs, tester } from './lib/load-ts.mjs';

const C = await loadTs('lib/cashCalendar.ts');
const { eq, done } = tester();
const now = new Date('2026-11-20T10:00:00');
const tx = (type, amount, when, category, extra = {}) => ({ userId: 'u', type, amount, category, date: new Date(when), ...extra });

{
  // Sueldo del mes pasado el 25 (aún no llega este mes) y gastos diarios de 10.000 en los últimos 60 días
  const daily = Array.from({ length: 60 }, (_, i) => tx('gasto', 10000, new Date(now.getTime() - (i + 1) * 86400000), 'Mercado'));
  const txs = [tx('ingreso', 2000000, '2026-10-25T08:00:00', 'Sueldo', { description: 'Sueldo' }), ...daily];
  const cal = C.buildCashCalendar({
    start: 300000, now, transactions: txs,
    commitments: [{ title: 'Arriendo', dueDate: new Date('2026-11-23'), amount: 800000 }, { title: 'Internet', dueDate: new Date('2026-11-18'), amount: 90000 }],
  });
  eq('gasto diario normal', cal.dailySpend, 10000);
  eq('días de hoy a fin de mes', cal.days.length, 11);
  eq('lo vencido se cuenta hoy', cal.days[0].balance, 300000 - 90000);
  eq('el 23 se descuenta el arriendo', cal.days[3].balance, 210000 - 3 * 10000 - 800000);
  eq('el día más bajo es antes del sueldo', cal.lowest.date.getDate(), 24);
  eq('el 25 llega el sueldo esperado', cal.days[5].events.some(e => e.kind === 'ingreso' && e.amount === 2000000), true);
  eq('con cuánto termina el mes', cal.end, 210000 - 800000 + 2000000 - 10 * 10000);
}
{
  // El sueldo de este mes ya llegó: no se espera otra vez
  const txs = [tx('ingreso', 2000000, '2026-10-15', 'Sueldo'), tx('ingreso', 2000000, '2026-11-15', 'Sueldo')];
  eq('ingreso ya recibido no se espera', C.expectedIncomes(txs, now).length, 0);
}
{
  // Su día habitual ya pasó y no ha llegado: se espera desde hoy
  const r = C.expectedIncomes([tx('ingreso', 500000, '2026-10-05', 'Ventas')], now);
  eq('atrasado: se cuenta desde hoy', r[0]?.day, 20);
}
{
  const r = C.averageDailySpend([tx('gasto', 600000, '2026-11-01', 'Arriendo', { isFixed: true })], now);
  eq('los gastos fijos no son gasto diario', r, 0);
}

done();
