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
    const cardDebt = Math.max(0, states.filter(s => s.account.kind === 'credito' && s.balance < 0).reduce((sum, s) => sum - s.balance, 0) - cardLoans);
    return { cash, cardDebt, cardLoans, nextIncome: estimateNextIncome(transactions), states };
  }, [accounts, transfers, transactions, investments, debts, loading, error]);
}
