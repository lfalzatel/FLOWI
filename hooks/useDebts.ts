'use client';
import { useData } from '@/components/DataProvider';

import { calculateDebtInterest } from '@/lib/firestore';

export function useDebts() {
  const { debts, loadingDebts: loading, error } = useData();

  const refresh = async () => {}; // No-op para mantener compatibilidad

  // Calcular el total pendiente de deudas incluyendo intereses.
  // Las que "me deben" van aparte: no son plata que yo tenga que pagar.
  const pendingOf = (direction: 'debo' | 'me_deben') => debts
    .filter(d => d.status === 'pending' && (d.direction || 'debo') === direction)
    .reduce((sum, d) => {
      const basePending = Math.max(0, d.totalAmount - d.paidAmount);
      const interestData = calculateDebtInterest(d);
      return sum + basePending + interestData.accumulatedInterest;
    }, 0);
  const totalDeudas = pendingOf('debo');
  const totalMeDeben = pendingOf('me_deben');

  return { debts, loading, error, refresh, totalDeudas, totalMeDeben };
}
