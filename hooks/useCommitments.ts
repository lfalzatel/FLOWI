'use client';
import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useReminders } from '@/hooks/useReminders';
import { useDebts } from '@/hooks/useDebts';
import { Transaction } from '@/lib/firestore';
import { getCommitments } from '@/lib/commitments';

// Compromisos pendientes del mes actual (gastos fijos habituales + recordatorios de pago)
export function useCommitments(transactions: Transaction[]) {
  const { profile } = useAuth();
  const { reminders, loading } = useReminders();
  const { debts } = useDebts();
  const skips = profile?.commitmentSkips;
  const summary = useMemo(
    () => getCommitments(transactions, reminders, skips || [], new Date(), debts),
    [transactions, reminders, skips, debts],
  );
  return { ...summary, loading };
}
