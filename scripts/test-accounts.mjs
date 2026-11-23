// Prueba de cuentas, tarjetas, préstamos vinculados y patrimonio (lib/accounts.ts).
// Uso: node scripts/test-accounts.mjs   (sale con código 1 si alguna falla)
import { loadTs, tester } from './lib/load-ts.mjs';

const A = await loadTs('lib/accounts.ts');
const { eq, done } = tester();

const base = '2026-11-01T00:00:00.000Z';
const acc = (id, kind, extra = {}) => ({ id, userId: 'u', name: id, kind, methods: [id], baseBalance: 0, baseAt: base, ...extra });
const bbva = acc('BBVA', 'banco', { isDefault: true, baseBalance: 100000 });
const nequi = acc('Nequi', 'billetera', { baseBalance: 50000 });
const visa = acc('Visa', 'credito', { creditLimit: 2000000 });
const credi = acc('Crediagil', 'credito', { creditLimit: 5100000 });
const d = (s) => new Date(s);
const gasto = (id, amount, extra = {}) => ({ id, userId: 'u', type: 'gasto', amount, category: 'Mercado', date: d('2026-11-10T12:00:00'), ...extra });
const ingreso = (id, amount, extra = {}) => ({ id, userId: 'u', type: 'ingreso', amount, category: 'Salario', date: d('2026-11-10T12:00:00'), ...extra });
const bal = (states, id) => states.find(s => s.account.id === id)?.balance;

// ── Saldos básicos ──
{
  const st = A.accountStates([bbva, nequi], [gasto('g1', 20000), ingreso('i1', 30000, { paymentMethod: 'Nequi' })], []);
  eq('gasto sin medio va a la principal', bal(st, 'BBVA'), 80000);
  eq('ingreso por Nequi va a Nequi', bal(st, 'Nequi'), 80000);
}
{
  const old = gasto('g0', 10000, { date: d('2026-10-20T12:00:00') });
  eq('gasto anterior al saldo inicial no cuenta', bal(A.accountStates([bbva], [old], []), 'BBVA'), 100000);
  eq('…salvo que se pida contarlo', bal(A.accountStates([bbva], [{ ...old, countBefore: 'BBVA' }], []), 'BBVA'), 90000);
}

// ── Tarjeta de crédito y abonos ──
{
  const compra = gasto('g2', 300000, { paymentMethod: 'Visa' });
  const abono = { id: 't1', userId: 'u', fromId: 'BBVA', toId: 'Visa', amount: 50000, date: '2026-11-15T12:00:00.000Z' };
  const st = A.accountStates([bbva, visa], [compra], [abono]);
  eq('compra con tarjeta: la tarjeta debe', bal(st, 'Visa'), -250000);
  eq('el abono sale del banco', bal(st, 'BBVA'), 50000);
}

// ── Gasto compartido: el abono de un amigo entra a la cuenta elegida ──
{
  const sh = gasto('g3', 0, { paymentMethod: 'Visa', shared: { total: 382939, paidByMe: true, people: [{ name: 'Leidy', amount: 382939,
    payments: [{ id: 'p1', amount: 100000, at: '2026-11-20T10:00:00.000Z', accountId: 'Nequi' }] }] } });
  const st = A.accountStates([bbva, nequi, visa], [sh], []);
  eq('lo pagado con la tarjeta sale de la tarjeta', bal(st, 'Visa'), -382939);
  eq('el abono de Leidy entra a Nequi', bal(st, 'Nequi'), 150000);
}

// ── Préstamo vinculado a una tarjeta: ocupa cupo y no se cuenta dos veces ──
{
  const loan = { id: 'dc', userId: 'u', title: 'Préstamo Claudia', totalAmount: 700000, paidAmount: 0, status: 'pending', direction: 'debo',
    accountId: 'Crediagil', interestRate: 0, createdAt: d('2026-11-05T12:00:00') };
  const other = { id: 'dx', userId: 'u', title: 'Otro', totalAmount: 100000, paidAmount: 20000, status: 'pending', direction: 'debo', createdAt: d('2026-11-01T12:00:00') };
  const st = A.accountStates([bbva, credi], [], [], [], [loan, other]);
  eq('el préstamo aparece en la tarjeta', bal(st, 'Crediagil'), -700000);
  eq('debtOwedNow sin intereses', A.debtOwedNow(other), 80000);
  const w = A.netWorth(st, [], [loan, other]);
  eq('patrimonio: tarjeta 700.000, préstamos solo el otro 80.000', [w.cards, w.debts], [700000, 80000]);
  eq('patrimonio total', w.total, 100000 - 700000 - 80000);
  const paid = A.accountStates([bbva, credi], [], [], [], [{ ...loan, paidAmount: 200000 }]);
  eq('al abonar el préstamo baja la tarjeta', bal(paid, 'Crediagil'), -500000);
}

// ── Lo que se aparta para las tarjetas en "Hoy puedes gastar" ──
{
  const now = d('2026-11-22T18:00:00');
  const compras = [gasto('c1', 600000, { paymentMethod: 'Visa', date: d('2026-11-10T12:00:00') }),
                   gasto('c2', 30000, { paymentMethod: 'Visa', date: d('2026-11-22T09:00:00') })];
  const total = A.cardReserves(A.accountStates([bbva, visa], compras, []), now);
  eq('pago total: aparta todo lo que se debe', [total.cardDebt, total.cardOwed, total.anyFixed], [630000, 630000, false]);

  const fijo = { ...visa, payMode: 'fijo', payAmount: 150000 };
  const abono = { id: 't2', userId: 'u', fromId: 'BBVA', toId: 'Visa', amount: 100000, date: '2026-11-15T12:00:00.000Z' };
  const r = A.cardReserves(A.accountStates([bbva, fijo], compras, [abono]), now);
  eq('pago fijo: aparta el pago menos lo abonado este mes', r.cardDebt, 50000);
  eq('pago fijo: compras de hoy con la tarjeta', r.fixedCardToday, 30000);
  eq('pago fijo: debe en total', r.cardOwed, 530000);
  const r2 = A.cardReserves(A.accountStates([bbva, fijo], [gasto('c3', 40000, { paymentMethod: 'Visa' })], []), now);
  eq('pago fijo mayor que la deuda: aparta solo la deuda', r2.cardDebt, 40000);

  const loan = { id: 'dc', userId: 'u', title: 'P', totalAmount: 700000, paidAmount: 0, status: 'pending', direction: 'debo', accountId: 'Crediagil', createdAt: d('2026-11-05T12:00:00') };
  const r3 = A.cardReserves(A.accountStates([bbva, credi], [], [], [], [loan]), now);
  eq('préstamo en tarjeta: no se aparta (va por cuotas)', [r3.cardDebt, r3.cardLoans], [0, 700000]);
}

done();
