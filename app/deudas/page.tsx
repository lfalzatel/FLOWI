'use client';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { useDebts } from '@/hooks/useDebts';
import { Debt } from '@/lib/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CreditCard, Plus, Check, Clock } from 'lucide-react';
import { AddDebtModal } from '@/components/forms/AddDebtModal';
import { useTheme } from '@/components/ThemeProvider';

export default function DeudasPage() {
  const { theme } = useTheme();
  const isCyberpunk = theme === 'cyberpunk' || theme === 'kiloCode';
  const { user, loading: authLoading } = useAuth();
  const { debts, loading: debtsLoading, refresh, totalDeudas } = useDebts();
  const router = useRouter();
  
  const [showAdd, setShowAdd] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);

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

  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

  return (
    <div className="min-h-screen flex flex-col bg-deep">
      <Header />
      
      <main className="flex-1 max-w-2xl lg:max-w-none mx-auto w-full space-y-6 animate-fade-in-up p-4 pb-24">
        {/* Header section */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Mis Finanzas</span>
            <h1 className="font-syne font-bold text-3xl text-text-primary">Deudas</h1>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl
                       bg-gradient-to-r from-accent to-accent-dim text-black
                       font-semibold text-sm shadow-lg shadow-accent/20
                       hover:opacity-90 active:scale-[0.97] transition-all"
          >
            <Plus className="w-4 h-4" />
            Nueva Deuda
          </button>
        </div>

        {/* Premium Card for Total Debts */}
        <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-card border border-orange-500/20 shadow-sm">
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-orange-500/10 blur-2xl pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-xl bg-orange-500/15 flex items-center justify-center">
                <CreditCard className="w-3.5 h-3.5 text-orange-400" />
              </div>
              <span className="text-xs font-medium text-text-secondary">Total Pendiente</span>
            </div>

            <p className="font-syne font-bold text-4xl text-orange-400 mb-1 leading-none">
              {fmt(totalDeudas)}
            </p>
            <p className="text-xs text-text-muted">Suma de todas tus deudas activas</p>
          </div>
        </div>

        {/* Debts List */}
        <div className="space-y-3">
          <h2 className="font-syne font-semibold text-base text-text-primary">Todas las deudas</h2>
          
          {debtsLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => (
                <div key={i} className="glass-card h-20 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : debts.length === 0 ? (
            <div className="glass-card rounded-2xl p-6 text-center text-text-muted text-sm">
              No tienes deudas registradas. ¡Buen trabajo!
            </div>
          ) : (
            <div className="space-y-2">
              {debts.map((debt) => {
                const pending = debt.totalAmount - debt.paidAmount;
                const progress = (debt.paidAmount / debt.totalAmount) * 100;
                const displayLabel = isCyberpunk ? debt.title.toUpperCase().replace(/\s+/g, '_') : debt.title;
                
                return (
                  <div
                    key={debt.id}
                    onClick={() => setSelectedDebt(debt)}
                    className="glass-card p-4 rounded-2xl hover:bg-white/[0.04] transition-colors cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className={`text-text-primary font-medium text-sm ${isCyberpunk ? 'font-mono' : ''}`}>{displayLabel}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {debt.status === 'paid' ? (
                            <span className="flex items-center gap-0.5 text-[10px] text-accent font-medium">
                              <Check className="w-3 h-3" /> Liquidada
                            </span>
                          ) : (
                            <span className="flex items-center gap-0.5 text-[10px] text-orange-400 font-medium">
                              <Clock className="w-3 h-3" /> Pendiente
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-text-primary font-bold text-sm ${isCyberpunk ? 'font-mono' : ''}`}>{fmt(pending)}</p>
                        <p className="text-[10px] text-text-muted">Total: {fmt(debt.totalAmount)}</p>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${debt.status === 'paid' ? 'bg-accent' : 'bg-orange-500'}`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[9px] text-text-muted">Pagado: {fmt(debt.paidAmount)}</span>
                      <span className="text-[9px] text-text-muted">{Math.round(progress)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <BottomNav onSuccess={refresh} />

      {showAdd && (
        <AddDebtModal onClose={() => setShowAdd(false)} onSuccess={refresh} />
      )}
      
      {selectedDebt && (
        <AddDebtModal
          onClose={() => setSelectedDebt(null)}
          onSuccess={refresh}
          debtToEdit={selectedDebt}
        />
      )}
    </div>
  );
}



