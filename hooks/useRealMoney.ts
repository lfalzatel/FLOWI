'use client';
import { useMemo } from 'react';
import { useAccounts } from '@/hooks/useAccounts';
import { useExpenses } from '@/hooks/useExpenses';
import { useInvestments } from '@/hooks/useInvestments';
import { accountStates } from '@/lib/accounts';
import { RealMoney, estimateNextIncome } from '@/lib/dailyBudget';

// Plata real para "Hoy puedes gastar": saldo de las cuentas para gastar (no las de ahorro) y lo que
// se debe en tarjetas. null si la persona no tiene cuentas para gastar (se usa el cálculo del mes).
export function useRealMoney(): RealMoney | null {
  const { accounts, transfers, loading, error } = useAccounts();
  const { transactions } = useExpenses();
  const { investments } = useInvestments();
  return useMemo(() => {
    if (loading || error) return null;
    const states = accountStates(accounts, transactions, transfers, investments);
    const spend = states.filter(s => s.account.kind !== 'credito' && s.account.purpose !== 'ahorro');
    if (!spend.length) return null;
    const cash = spend.reduce((sum, s) => sum + s.balance, 0);
    const cardDebt = states.filter(s => s.account.kind === 'credito' && s.balance < 0).reduce((sum, s) => sum - s.balance, 0);
    return { cash, cardDebt, nextIncome: estimateNextIncome(transactions) };
  }, [accounts, transfers, transactions, investments, loading, error]);
}
