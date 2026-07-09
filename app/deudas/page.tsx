'use client';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { useDebts } from '@/hooks/useDebts';
import { calculateDebtInterest, deleteDebt, updateDebt, type Debt } from '@/lib/firestore';
import { formatCurrency } from '@/lib/format';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CreditCard, Plus, Check, Clock, Download } from 'lucide-react';
import { AddDebtModal } from '@/components/forms/AddDebtModal';
import { ExportReportModal } from '@/components/forms/ExportReportModal';
import { useTheme } from '@/components/ThemeProvider';
import { AnimatedNumber } from '@/components/dashboard/AnimatedNumber';

export default function DeudasPage() {
  const { theme } = useTheme();
  const isCyberpunk = theme === 'cyberpunk' || theme === 'kiloCode';
  const { user, profile, loading: authLoading } = useAuth();
  const { debts, loading: debtsLoading, refresh } = useDebts();
  const router = useRouter();
  
  const [showAdd, setShowAdd] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);

  // Calcular el total de deudas acumulando dinámicamente los intereses generados
  const totalDeudasConInteres = debts
    .filter(d => d.status !== 'paid')
    .reduce((sum, d) => {
      const basePending = d.totalAmount - d.paidAmount;
      const interestData = calculateDebtInterest(d);
      return sum + basePending + interestData.accumulatedInterest;
    }, 0);

  const activeDebts = debts.filter(d => d.status !== 'paid');
  const paidDebts = debts.filter(d => d.status === 'paid');

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

  const fmt = (n: number) => formatCurrency(n, profile?.currency);

  return (
    <div className="min-h-screen flex flex-col bg-deep">
      <Header />
      
      <main className="flex-1 max-w-2xl lg:max-w-none mx-auto w-full space-y-6 animate-fade-in-up stagger p-4 pb-24">
        {/* Header section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`${isCyberpunk ? 'font-mono font-bold text-3xl text-accent uppercase tracking-widest' : 'font-syne font-bold text-3xl text-text-primary'}`}>Deudas</h1>
            <p className={`mt-1 ${isCyberpunk ? 'font-mono text-accent/70 tracking-wide text-xs uppercase' : 'text-text-secondary text-sm'}`}>Historial y control de préstamos</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Download Report Button */}
            <button
              onClick={() => setShowExport(true)}
              className={`w-9 h-9 flex items-center justify-center border transition-all ${isCyberpunk ? 'rounded-none border-accent/30 hover:border-accent text-accent' : 'rounded-xl border-white/5 bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-primary'}`}
              title="Descargar Reporte"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className={`flex items-center justify-center w-10 h-10 transition-all
                          bg-gradient-to-br from-accent to-accent-dim
                          ${theme === 'light' ? 'text-white' : 'text-black'}
                          font-semibold text-sm shadow-lg shadow-accent/20
                          hover:opacity-90 active:scale-[0.97]
                          ${isCyberpunk ? 'rounded-none' : 'rounded-2xl'}`}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Premium Card for Total Debts */}
        <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-card border border-orange-500/20 shadow-sm">
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-orange-500/10 blur-2xl pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-xl bg-orange-500/15 flex items-center justify-center">
                <CreditCard className="w-3.5 h-3.5 text-orange-400" />
              </div>
              <span className={`text-xs font-medium ${isCyberpunk ? 'font-mono text-orange-400/70 tracking-wide uppercase' : 'text-text-secondary'}`}>Total Pendiente</span>
            </div>

            <p className={`mb-1 leading-none ${isCyberpunk ? 'font-mono font-bold text-[clamp(24px,8vw,36px)] text-orange-400 tracking-wider' : 'font-syne font-bold text-[clamp(24px,8vw,36px)] text-orange-400'}`}>
              <AnimatedNumber value={totalDeudasConInteres} prefix="$" />
            </p>
            <p className={`text-xs ${isCyberpunk ? 'font-mono text-orange-400/50 uppercase tracking-widest' : 'text-text-muted'}`}>Suma de todas tus deudas activas</p>
          </div>
        </div>

        {/* Debts List */}
        <div className="space-y-3">
          <h2 className={`${isCyberpunk ? 'font-mono font-bold text-base text-accent uppercase tracking-wide border-b border-accent/20 pb-1' : 'font-syne font-semibold text-base text-text-primary'}`}>Todas las deudas</h2>
          
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
            <div className="space-y-6">
              {/* Deudas Activas */}
              {activeDebts.length > 0 && (
                <div className="space-y-2">
                  <h3 className={`text-xs font-semibold mb-2 uppercase tracking-widest ${isCyberpunk ? 'text-orange-400' : 'text-text-secondary'}`}>Activas ({activeDebts.length})</h3>
                  {activeDebts.map((debt, i) => {
                    const interestData = calculateDebtInterest(debt);
                    const basePending = debt.totalAmount - debt.paidAmount;
                    const pending = basePending + interestData.accumulatedInterest;
                    const progress = (debt.paidAmount / debt.totalAmount) * 100;
                    const displayLabel = isCyberpunk ? debt.title.toUpperCase().replace(/\s+/g, '_') : debt.title;

                    return (
                      <div
                        key={debt.id}
                        onClick={() => setSelectedDebt(debt)}
                        className="glass-card p-4 rounded-2xl hover:bg-white/[0.04] transition-colors cursor-pointer animate-card-mix"
                        style={{ animationDelay: `${i * 0.1}s` }}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className={`text-text-primary font-medium text-sm ${isCyberpunk ? 'font-mono' : ''}`}>{displayLabel}</p>
                            {debt.description && (
                              <p className={`text-xs text-text-muted mt-0.5 max-w-[200px] sm:max-w-md line-clamp-1 italic ${isCyberpunk ? 'font-mono' : ''}`}>
                                {debt.description}
                              </p>
                            )}
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="flex items-center gap-0.5 text-[10px] text-orange-400 font-medium">
                                <Clock className="w-3 h-3" /> Pendiente
                                {debt.interestRate ? (
                                  <span className="ml-1.5 bg-red-500/10 text-red-400 border border-red-500/20 px-1 rounded text-[9px] uppercase tracking-wider">
                                    {debt.interestRate}% EA
                                  </span>
                                ) : null}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-text-primary font-bold text-sm ${isCyberpunk ? 'font-mono' : ''}`}>
                              <AnimatedNumber value={pending} prefix="$" delay={i * 0.1} />
                            </p>
                            {interestData.accumulatedInterest > 0 ? (
                              <p className="text-[10px] text-red-400 font-mono font-medium">
                                +${interestData.accumulatedInterest.toLocaleString('es-MX', { maximumFractionDigits: 0 })} Int.
                              </p>
                            ) : (
                              <p className="text-[10px] text-text-muted">Total: {fmt(debt.totalAmount)}</p>
                            )}
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-orange-500"
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

              {/* Historial de Deudas Liquidadas */}
              {paidDebts.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h3 className={`text-xs font-semibold mb-2 uppercase tracking-widest ${isCyberpunk ? 'text-accent' : 'text-text-muted'}`}>Liquidadas ({paidDebts.length})</h3>
                  {paidDebts.map((debt, i) => {
                    const displayLabel = isCyberpunk ? debt.title.toUpperCase().replace(/\s+/g, '_') : debt.title;

                    return (
                      <div
                        key={debt.id}
                        onClick={() => setSelectedDebt(debt)}
                        className="glass-card p-4 rounded-2xl hover:bg-white/[0.04] transition-colors cursor-pointer opacity-60 hover:opacity-100 transition-opacity animate-card-mix"
                        style={{ animationDelay: `${i * 0.1}s` }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className={`text-text-primary font-medium text-sm line-through ${isCyberpunk ? 'font-mono' : ''}`}>{displayLabel}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="flex items-center gap-0.5 text-[10px] text-accent font-medium">
                                <Check className="w-3 h-3" /> Liquidada
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-accent font-bold text-sm ${isCyberpunk ? 'font-mono' : ''}`}>
                              ${debt.totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-[10px] text-text-muted">Saldado completo</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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

      {showExport && (
        <ExportReportModal
          onClose={() => setShowExport(false)}
          title="Deudas"
          debts={debts}
          filterType="all"
          filterValue="all"
        />
      )}
    </div>
  );
}



