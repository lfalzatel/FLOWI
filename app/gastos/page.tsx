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
import { TrendingDown, Plus, Download } from 'lucide-react';
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
  const [showExport, setShowExport] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'month' | 'week' | 'day'>('all');
  const [filterValue, setFilterValue] = useState(new Date().toISOString().split('T')[0].substring(0, 7));
  const [searchQuery, setSearchQuery] = useState(''); // Estado del buscador universal
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

  // Filtrado compuesto: Fecha + Buscador universal
  const filteredTransactions = transactions.filter(t => {
    // 1. Filtrado por fecha
    let matchesDate = true;
    if (filterType !== 'all') {
      const d = t.date instanceof Date 
        ? t.date 
        : (t.date && typeof (t.date as any).toDate === 'function')
          ? (t.date as any).toDate()
          : new Date(t.date as any);
      const dateStr = d.toISOString().split('T')[0];
      
      if (filterType === 'month') {
        matchesDate = dateStr.startsWith(filterValue);
      } else if (filterType === 'week') {
        matchesDate = getISOWeekString(d) === filterValue;
      } else {
        matchesDate = dateStr === filterValue;
      }
    }

    if (!matchesDate) return false;

    // 2. Filtrado por buscador universal (descripción, categoría, monto)
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase().trim();
    const matchesCategory = t.category.toLowerCase().includes(query);
    const matchesDesc = (t.description || '').toLowerCase().includes(query);
    const matchesAmount = t.amount.toString().includes(query);

    return matchesCategory || matchesDesc || matchesAmount;
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
                         ${isTechTheme ? 'rounded-none bg-accent/20 border border-accent text-accent hover:bg-accent/30 font-mono uppercase tracking-widest text-xs font-bold' : `rounded-2xl bg-gradient-to-r from-accent to-accent-dim ${theme === 'light' ? 'text-white' : 'text-black'} font-semibold text-sm shadow-lg shadow-accent/20 hover:opacity-90 active:scale-[0.97]`}`}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nueva transacción</span>
            </button>
          </div>
        </div>

        <DateFilter 
          transactions={transactions}
          filterType={filterType} 
          filterValue={filterValue} 
          onChangeType={setFilterType} 
          onChangeValue={setFilterValue} 
        />

        {/* Buscador Universal */}
        <div className="mb-4 relative">
          <input
            type="text"
            placeholder={isTechTheme ? "SEARCH_QUERY > ESCRIBE CATEGORÍA, DESC O VALOR..." : "Buscar por categoría, descripción o monto..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`
              w-full py-2.5 pl-10 pr-4 text-xs focus:outline-none transition-all
              ${isTechTheme
                ? 'bg-white/5 text-white placeholder-white/35 border-accent/20 rounded-none focus:border-accent font-mono'
                : theme === 'light'
                  ? 'bg-black/[0.04] text-black placeholder-black/40 border-black/10 rounded-2xl focus:border-accent focus:bg-white'
                  : 'bg-white/5 text-white placeholder-white/35 border-white/5 rounded-2xl focus:border-accent/40 focus:bg-white/10'
              }
            `}
          />
          <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${theme === 'light' ? 'text-black/40' : 'text-white/40'}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${theme === 'light' ? 'text-black/40 hover:text-black' : 'text-white/40 hover:text-white'}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

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

        {/* Chart */}
        <div className="mb-6">
          <ExpenseChart transactions={filteredTransactions} filterType={filterType} filterValue={filterValue} type="gasto" />
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

      {showExport && (
        <ExportReportModal
          onClose={() => setShowExport(false)}
          title="Gastos"
          transactions={filteredTransactions}
          filterType={filterType}
          filterValue={filterValue}
        />
      )}
    </div>
  );
}

