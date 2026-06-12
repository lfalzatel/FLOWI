'use client';
import { useData } from '@/components/DataProvider';

export function useDebts() {
  const { debts, loadingDebts: loading, error } = useData();

  const refresh = async () => {}; // No-op para mantener compatibilidad

  // Calcular el total pendiente de deudas
  const totalDeudas = debts
    .filter(d => d.status === 'pending')
    .reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0);

  return { debts, loading, error, refresh, totalDeudas };
}
