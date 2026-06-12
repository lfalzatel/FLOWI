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
import { TrendingDown, Plus } from 'lucide-react';
import { getISOWeekString } from '@/lib/dateUtils';
import { DateFilter } from '@/components/dashboard/DateFilter';
import { useTheme } from '@/components/ThemeProvider';
import { AnimatedNumber } from '@/components/dashboard/AnimatedNumber';

export default function GastosPage() {
  const { user, loading: authLoading } = useAuth();
  const { transactions, loading: expensesLoading, refresh } = useExpenses('gasto');
  const router = useRouter();
  
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'month' | 'week' | 'day'>('all');
  const [filterValue, setFilterValue] = useState(new Date().toISOString().split('T')[0].substring(0, 7));
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-deep flex flex-col items-center justify-center">
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
    } else if (filterType === 'week') {
      return getISOWeekString(d) === filterValue;
    } else {
      return dateStr === filterValue;
    }
  });

  return (
    <div className="min-h-screen bg-deep flex flex-col">
      <Header />
      
      <main className="flex-1 p-4 pb-24 max-w-2xl mx-auto w-full animate-fade-in-up stagger">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className={`${isTechTheme ? 'font-mono font-bold text-3xl text-accent uppercase tracking-widest' : 'text-3xl font-syne font-bold text-text-primary'}`}>Mis Gastos</h1>
            <p className={`mt-1 ${isTechTheme ? 'font-mono text-accent/70 tracking-wide text-xs uppercase' : 'text-text-secondary text-sm'}`}>Historial completo de tus salidas</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className={`flex items-center gap-2 px-4 py-2.5 transition-all
                       ${isTechTheme ? 'rounded-none bg-accent/20 border border-accent text-accent hover:bg-accent/30 font-mono uppercase tracking-widest text-xs font-bold' : `rounded-2xl bg-gradient-to-r from-accent to-accent-dim ${theme === 'light' ? 'text-white' : 'text-black'} font-semibold text-sm shadow-lg shadow-accent/20 hover:opacity-90 active:scale-[0.97]`}`}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nueva transacción</span>
          </button>
        </div>

        {/* Filter */}
        <DateFilter 
          transactions={transactions}
          filterType={filterType} 
          filterValue={filterValue} 
          onChangeType={setFilterType} 
          onChangeValue={setFilterValue} 
        />

        {/* Card de Total */}
        <div key={`${filterType}-${filterValue}`} className="relative overflow-hidden rounded-3xl p-6 mb-6 bg-card border border-[var(--red)]/20 shadow-sm animate-card-mix">
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
              <span className={`text-xs font-medium ${isTechTheme ? 'font-mono text-accent/70 tracking-wide uppercase' : 'text-text-secondary'}`}>Total Gastado</span>
            </div>

            <p className={`mb-1 leading-none ${isTechTheme ? 'font-mono font-bold text-[clamp(24px,8vw,36px)] text-[var(--red)] tracking-wider' : 'font-syne font-bold text-[clamp(24px,8vw,36px)] text-[var(--red)]'}`}>
              <AnimatedNumber value={filteredTransactions.reduce((sum, e) => sum + e.amount, 0)} prefix="$" />
            </p>
            <p className={`text-xs ${isTechTheme ? 'font-mono text-accent/50 uppercase tracking-widest' : 'text-text-muted'}`}>{filterType === 'all' ? 'Total' : filterType === 'month' ? 'Este mes' : 'Este día'}</p>
          </div>
        </div>

        {/* Lista */}
        <TransactionList 
          transactions={filteredTransactions} 
          onEdit={(tx) => setEditingTransaction(tx)} 
          animationKey={`${filterType}-${filterValue}`}
        />
      </main>

      <BottomNav onSuccess={refresh} />

      {/* Modal de Edición o Adición */}
      {(editingTransaction || showAdd) && (
        <AddExpenseModal
          initialType="gasto"
          onClose={() => {
            setEditingTransaction(null);
            setShowAdd(false);
          }}
          onSuccess={refresh}
          transactionToEdit={editingTransaction || undefined}
        />
      )}
    </div>
  );
}

