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
import { TrendingUp } from 'lucide-react';

export default function IngresosPage() {
  const { user, loading: authLoading } = useAuth();
  const { transactions, loading: expensesLoading, refresh } = useExpenses('ingreso');
  const router = useRouter();
  
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'month' | 'day'>('all');
  const [filterValue, setFilterValue] = useState(new Date().toISOString().split('T')[0].substring(0, 7));

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

  const filteredTransactions = transactions.filter(t => {
    if (filterType === 'all') {
      return true;
    }
    const d = t.date instanceof Date 
      ? t.date 
      : (t.date && typeof (t.date as any).toDate === 'function')
        ? (t.date as any).toDate()
        : new Date(t.date as any);
    const dateStr = d.toISOString().split('T')[0];
    if (filterType === 'month') {
      return dateStr.startsWith(filterValue);
    } else {
      return dateStr === filterValue;
    }
  });

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white flex flex-col">
      <Header />
      
      <main className="flex-1 p-4 pb-24">
        <div className="mb-6">
          <h1 className="text-3xl font-syne font-bold text-white">Mis Ingresos</h1>
          <p className="text-white/40 text-sm mt-1">Historial completo de tus entradas</p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-3 rounded-2xl mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'all' ? 'bg-accent text-black font-semibold' : 'text-white/40 hover:text-white'
              }`}
            >
              Todo
            </button>
            <button
              onClick={() => {
                setFilterType('month');
                setFilterValue(new Date().toISOString().split('T')[0].substring(0, 7));
              }}
              className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'month' ? 'bg-accent text-black font-semibold' : 'text-white/40 hover:text-white'
              }`}
            >
              Mes
            </button>
            <button
              onClick={() => {
                setFilterType('day');
                setFilterValue(new Date().toISOString().split('T')[0]);
              }}
              className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'day' ? 'bg-accent text-black font-semibold' : 'text-white/40 hover:text-white'
              }`}
            >
              Día
            </button>
          </div>
          
          <div className="flex-1">
            {filterType !== 'all' && (
              <input
                type={filterType === 'month' ? 'month' : 'date'}
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                className="w-full bg-transparent text-white text-sm focus:outline-none border-none text-right"
              />
            )}
          </div>
        </div>

        {/* Card de Total */}
        <div className="relative overflow-hidden rounded-3xl p-6 mb-6"
             style={{
               background: 'linear-gradient(135deg, #0D2E1F 0%, #0A1929 50%, #150D2E 100%)',
               border: '1px solid rgba(0,229,160,0.15)',
             }}>
          {/* Decorative circles */}
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full
                          bg-accent/5 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full
                          bg-blue-500/5 blur-xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-xl bg-accent/15 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-accent" />
              </div>
              <span className="text-xs font-medium text-white/50">Total Ingresado</span>
            </div>

            <p className="font-syne font-bold text-4xl text-white mb-1 leading-none">
              ${filteredTransactions.reduce((sum, e) => sum + e.amount, 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-white/30">{filterType === 'all' ? 'Total' : filterType === 'month' ? 'Este mes' : 'Este día'}</p>
          </div>
        </div>

        {/* Lista */}
        <TransactionList 
          transactions={filteredTransactions} 
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
