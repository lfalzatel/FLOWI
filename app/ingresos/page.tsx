'use client';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { TransactionList } from '@/components/dashboard/TransactionList';
import { AddExpenseModal } from '@/components/forms/AddExpenseModal';
import { ExportReportModal } from '@/components/forms/ExportReportModal';
import { ExpenseChart } from '@/components/dashboard/ExpenseChart';
import { useAuth } from '@/hooks/useAuth';
import { useExpenses } from '@/hooks/useExpenses';
import { Transaction } from '@/lib/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TrendingUp, Plus, Download } from 'lucide-react';
import { getISOWeekString, getLocalDateString, getLocalMonthString } from '@/lib/dateUtils';
import { DateFilter } from '@/components/dashboard/DateFilter';
import { useTheme } from '@/components/ThemeProvider';
import { AnimatedNumber } from '@/components/dashboard/AnimatedNumber';

export default function IngresosPage() {
  const { user, loading: authLoading } = useAuth();
  const { transactions, loading: expensesLoading, refresh } = useExpenses('ingreso');
  const router = useRouter();
  
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'month' | 'week' | 'day'>('all');
  const [filterValue, setFilterValue] = useState(getLocalMonthString());
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';

  useEffect(() => {
    if (!authLoading && !user) {
      if (sessionStorage.getItem('justLoggedOut') === 'true') {
        sessionStorage.removeItem('justLoggedOut');
        router.push('/login?logout=true');
      } else {
        router.push('/login');
      }
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
    const dateStr = getLocalDateString(d);
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
            <h1 className={`${isTechTheme ? 'font-mono font-bold text-3xl text-accent uppercase tracking-widest' : 'text-3xl font-syne font-bold text-text-primary'}`}>Mis Ingresos</h1>
            <p className={`mt-1 ${isTechTheme ? 'font-mono text-accent/70 tracking-wide text-xs uppercase' : 'text-text-secondary text-sm'}`}>Historial completo de tus entradas</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Download Report Button */}
            <button
              onClick={() => setShowExport(true)}
              className={`w-9 h-9 flex items-center justify-center border transition-all ${isTechTheme ? 'rounded-none border-accent/30 hover:border-accent text-accent' : 'rounded-xl border-white/5 bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-primary'}`}
              title="Descargar Reporte"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowAdd(true)}
              className={`flex items-center gap-2 px-4 py-2.5 transition-all
                          bg-gradient-to-br from-accent to-accent-dim
                          ${theme === 'light' ? 'text-white' : 'text-black'}
                          font-semibold text-sm shadow-lg shadow-accent/20
                          hover:opacity-90 active:scale-[0.97]
                          ${isTechTheme ? 'rounded-none font-mono uppercase tracking-widest' : 'rounded-2xl'}`}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nueva transacción</span>
            </button>
          </div>
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
        <div key={`${filterType}-${filterValue}`} className="relative overflow-hidden rounded-3xl p-6 mb-6 bg-card border border-accent/20 shadow-sm animate-card-mix">
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
              <span className={`text-xs font-medium ${isTechTheme ? 'font-mono text-accent/70 tracking-wide uppercase' : 'text-text-secondary'}`}>Total Ingresado</span>
            </div>

            <p className={`mb-1 leading-none ${isTechTheme ? 'font-mono font-bold text-[clamp(24px,8vw,36px)] text-accent tracking-wider' : 'font-syne font-bold text-[clamp(24px,8vw,36px)] text-accent'}`}>
              <AnimatedNumber value={filteredTransactions.reduce((sum, e) => sum + e.amount, 0)} prefix="$" />
            </p>
            <p className={`text-xs ${isTechTheme ? 'font-mono text-accent/50 uppercase tracking-widest' : 'text-text-muted'}`}>{filterType === 'all' ? 'Total' : filterType === 'month' ? 'Este mes' : 'Este día'}</p>
          </div>
        </div>

        {/* Chart */}
        <div className="mb-6">
          <ExpenseChart transactions={filteredTransactions} filterType={filterType} filterValue={filterValue} type="ingreso" />
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
          initialType="ingreso"
          onClose={() => {
            setEditingTransaction(null);
            setShowAdd(false);
          }}
          onSuccess={refresh}
          transactionToEdit={editingTransaction || undefined}
        />
      )}

      {showExport && (
        <ExportReportModal
          onClose={() => setShowExport(false)}
          title="Ingresos"
          transactions={filteredTransactions}
          filterType={filterType}
          filterValue={filterValue}
        />
      )}
    </div>
  );
}
