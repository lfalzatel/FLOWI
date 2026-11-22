'use client';
import { useMemo } from 'react';
import { useAccounts } from '@/hooks/useAccounts';
import { useExpenses } from '@/hooks/useExpenses';
import { useInvestments } from '@/hooks/useInvestments';
import { useDebts } from '@/hooks/useDebts';
import { accountStates, debtOwedNow, type AccountState } from '@/lib/accounts';
import type { Debt } from '@/lib/firestore';

// Todo lo que debes, como en la página de Deudas: los préstamos que no viven en una tarjeta
// más lo que debes en cada tarjeta de crédito (que ya incluye los préstamos vinculados a ella).
export interface DebtTotals {
  total: number;
  loans: { debt: Debt; left: number }[];                                 // préstamos fuera de tarjetas
  cards: { state: AccountState; owed: number; linked: { debt: Debt; left: number }[] }[];
}

export function useDebtTotals(): DebtTotals {
  const { debts } = useDebts();
  const { accounts, transfers } = useAccounts();
  const { transactions } = useExpenses();
  const { investments } = useInvestments();
  return useMemo(() => {
    const states = accountStates(accounts, transactions, transfers, investments, debts);
    const cards = states
      .filter(s => s.account.kind === 'credito' && s.balance < 0)
      .map(s => ({
        state: s,
        owed: -s.balance,
        linked: s.movements.filter(m => m.kind === 'debt').map(m => ({ debt: (m as { debt: Debt }).debt, left: -m.amount })),
      }));
    const inCard = new Set(cards.flatMap(c => c.linked.map(l => l.debt.id)));
    const loans = debts
      .filter(d => d.status === 'pending' && (d.direction || 'debo') === 'debo' && !inCard.has(d.id))
      .map(d => ({ debt: d, left: debtOwedNow(d) }));
    const total = loans.reduce((s, l) => s + l.left, 0) + cards.reduce((s, c) => s + c.owed, 0);
    return { total, loans, cards };
  }, [debts, accounts, transfers, transactions, investments]);
}
