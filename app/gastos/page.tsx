'use client';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { TransactionList } from '@/components/dashboard/TransactionList';
import { AddExpenseModal } from '@/components/forms/AddExpenseModal';
import { useAuth } from '@/hooks/useAuth';
import { useExpenses } from '@/hooks/useExpenses';
import { Transaction } from '@/lib/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TrendingDown } from 'lucide-react';

export default function GastosPage() {
  const { user, loading: authLoading } = useAuth();
  const { transactions, loading: expensesLoading, refresh } = useExpenses('gasto');
  const router = useRouter();
  
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] text-white flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white flex flex-col">
      <Header />
      
      <main className="flex-1 p-4 pb-24">
        <div className="mb-6">
          <h1 className="text-3xl font-syne font-bold text-white">Mis Gastos</h1>
          <p className="text-white/40 text-sm mt-1">Historial completo de tus salidas</p>
        </div>

        {/* Card de Total */}
        <div className="relative overflow-hidden rounded-3xl p-6 mb-6"
             style={{
               background: 'linear-gradient(135deg, #2E0D0D 0%, #0A1929 50%, #150D2E 100%)',
               border: '1px solid rgba(239, 68, 68, 0.15)',
             }}>
          {/* Decorative circles */}
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full
                          bg-red-500/5 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full
                          bg-blue-500/5 blur-xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-xl bg-red-500/15 flex items-center justify-center">
                <TrendingDown className="w-3.5 h-3.5 text-red-400" />
              </div>
              <span className="text-xs font-medium text-white/50">Total Gastado</span>
            </div>

            <p className="font-syne font-bold text-4xl text-white mb-1 leading-none">
              ${transactions.reduce((sum, e) => sum + e.amount, 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-white/30">Este mes</p>
          </div>
        </div>

        {/* Lista */}
        <TransactionList 
          transactions={transactions} 
          onEdit={(tx) => setEditingTransaction(tx)} 
        />
      </main>

      <BottomNav onSuccess={refresh} />

      {/* Modal de Edición */}
      {editingTransaction && (
        <AddExpenseModal
          onClose={() => setEditingTransaction(null)}
          onSuccess={refresh}
          transactionToEdit={editingTransaction}
        />
      )}
    </div>
  );
}
