'use client';
import { useMemo } from 'react';
import { useAccounts } from '@/hooks/useAccounts';
import { useExpenses } from '@/hooks/useExpenses';
import { useInvestments } from '@/hooks/useInvestments';
import { useDebts } from '@/hooks/useDebts';
import { AccountState, accountStates } from '@/lib/accounts';
import { RealMoney, estimateNextIncome } from '@/lib/dailyBudget';

export interface RealMoneyInfo extends RealMoney {
  states: AccountState[]; // todas las cuentas con su saldo (para mostrarlas)
  cardLoans: number;      // préstamos vinculados a tarjetas: se ven en la tarjeta pero se pagan en cuotas (no se reservan)
  cardOwed: number;       // todo lo que se debe en tarjetas por compras (sin los préstamos vinculados)
  anyFixed: boolean;      // alguna tarjeta se paga con un pago fijo al mes
}

// Plata real para "Dinero disponible" y "Hoy puedes gastar": saldo de las cuentas para gastar (no las
// de ahorro) y lo que se debe en tarjetas. null si la persona no tiene cuentas para gastar
// (entonces se usa el cálculo del mes: ingresos − gastos).
export function useRealMoney(): RealMoneyInfo | null {
  const { accounts, transfers, loading, error } = useAccounts();
  const { transactions } = useExpenses();
  const { investments } = useInvestments();
  const { debts } = useDebts();
  return useMemo(() => {
    if (loading || error) return null;
    const states = accountStates(accounts, transactions, transfers, investments, debts);
    const spend = states.filter(s => s.account.kind !== 'credito' && s.account.purpose !== 'ahorro');
    if (!spend.length) return null;
    const cash = spend.reduce((sum, s) => sum + s.balance, 0);
    const cardLoans = states.reduce((sum, s) => sum + s.movements.filter(m => m.kind === 'debt').reduce((x, m) => x - m.amount, 0), 0);
    // Lo que se aparta por cada tarjeta: todo lo que se debe (si la pagas completa) o solo el pago fijo del mes
    const now = new Date();
    const cards = states.filter(s => s.account.kind === 'credito').map(s => {
      const loans = s.movements.filter(m => m.kind === 'debt').reduce((x, m) => x - m.amount, 0);
      const owed = Math.max(0, -s.balance - loans);
      const a = s.account;
      if (a.payMode !== 'fijo' || !(a.payAmount && a.payAmount > 0)) return { state: s, owed, reserve: owed, fixed: false };
      // Abonos a la tarjeta en este mes: ya cuentan para el pago del mes
      const paidThisMonth = s.movements
        .filter(m => m.kind === 'transfer' && m.amount > 0 && m.date.getFullYear() === now.getFullYear() && m.date.getMonth() === now.getMonth())
        .reduce((x, m) => x + m.amount, 0);
      const today = s.movements
        .filter(m => m.kind === 'tx' && m.amount < 0 && m.date.toDateString() === now.toDateString())
        .reduce((x, m) => x - m.amount, 0);
      return { state: s, owed, reserve: Math.max(0, Math.min(owed, a.payAmount - paidThisMonth)), fixed: true, today };
    });
    const fixedCardToday = cards.reduce((sum, c) => sum + ((c as { today?: number }).today || 0), 0);
    const cardDebt = cards.reduce((sum, c) => sum + c.reserve, 0);
    const cardOwed = cards.reduce((sum, c) => sum + c.owed, 0);
    const anyFixed = cards.some(c => c.fixed && c.owed > 0);
    return { cash, cardDebt, cardOwed, anyFixed, fixedCardToday, cardLoans, nextIncome: estimateNextIncome(transactions), states };
  }, [accounts, transfers, transactions, investments, debts, loading, error]);
}
