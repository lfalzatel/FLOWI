'use client';
import { useData } from '@/components/DataProvider';

import { calculateDebtInterest } from '@/lib/firestore';

export function useDebts() {
  const { debts, loadingDebts: loading, error } = useData();

  const refresh = async () => {}; // No-op para mantener compatibilidad

  // Calcular el total pendiente de deudas incluyendo intereses
  const totalDeudas = debts
    .filter(d => d.status === 'pending')
    .reduce((sum, d) => {
      const basePending = Math.max(0, d.totalAmount - d.paidAmount);
      const interestData = calculateDebtInterest(d);
      return sum + basePending + interestData.accumulatedInterest;
    }, 0);

  return { debts, loading, error, refresh, totalDeudas };
}
