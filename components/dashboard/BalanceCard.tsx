'use client';
import { useState, useEffect } from 'react';
import { CalendarCheck, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { AnimatedNumber } from './AnimatedNumber';
import { formatCurrency } from '@/lib/format';
import { DailyBudget } from '@/lib/dailyBudget';
import { BalanceInfoModal } from './BalanceInfoModal';
import { MoneyInfoModal } from './MoneyInfoModal';
import { RealMoneyInfo } from '@/hooks/useRealMoney';

interface Props {
  real?: RealMoneyInfo | null;   // con cuentas: la plata real (solo en el mes actual)
  pendingCommitments?: number;
  balance:       number;
  totalGastos:   number;
  totalIngresos: number;
  totalDeudas:   number;
  today?:        DailyBudget | null; // solo al mirar el mes actual
  currency?:     string;
}

export function BalanceCard({ balance: periodBalance, totalGastos, totalIngresos, totalDeudas, today, currency, real, pendingCommitments = 0 }: Props) {
  // Con cuentas para gastar, el disponible es la plata que de verdad hay en ellas
  const balance = real ? real.cash : periodBalance;
  const [showMoney, setShowMoney] = useState(false);
  const { theme } = useTheme();
  const isCyberpunk = theme === 'cyberpunk' || theme === 'kiloCode';
  const isLight = theme === 'light';

  const [absorbingId, setAbsorbingId] = useState<string | null>(null);
  const [info, setInfo] = useState<'today' | 'debts' | null>(null);

  useEffect(() => {
    const handleAbsorb = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.targetCId) {
        setAbsorbingId(detail.targetCId);
        const timer = setTimeout(() => setAbsorbingId(null), 1600);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('absorb-total-impact', handleAbsorb);
    return () => window.removeEventListener('absorb-total-impact', handleAbsorb);
  }, []);

  const cardGradient = isLight 
    ? 'linear-gradient(135deg, var(--bg-card) 0%, #F9FAFB 100%)' 
    : isCyberpunk
      ? 'linear-gradient(135deg, #0A0A16 0%, #070714 100%)'
      : 'linear-gradient(135deg, #0D2E1F 0%, #0A1929 50%, #150D2E 100%)';

  return (
    <div className="space-y-4">
      {/* Main balance */}
      <div 
        id="balance-card" 
        onClick={real ? () => setShowMoney(true) : undefined}
        role={real ? 'button' : undefined}
        aria-label={real ? 'Ver la plata de cada cuenta' : undefined}
        data-points-capsule="true" 
        className={`relative overflow-hidden rounded-3xl p-6 md:p-8 animate-card-mix shadow-sm transition-all duration-300 ${
          absorbingId === 'balance-card' ? 'scale-[1.03] ring-2 ring-accent shadow-[0_0_40px_rgba(0,229,160,0.6)]' : ''
        }`}
        style={{
          background: cardGradient,
          border: '1px solid var(--glass-border)',
          animationDelay: '0.05s',
          borderRadius: isCyberpunk ? '0' : '1.5rem',
          clipPath: isCyberpunk ? 'polygon(0 20px, 20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' : 'none'
        }}
      >
        {/* Decorative circles */}
        {!isLight && !isCyberpunk && (
          <>
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full
                            bg-accent/5 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full
                            bg-blue-500/5 blur-xl pointer-events-none" />
          </>
        )}

        <div className="relative z-10">
          {/* Las dos cifras más importantes, juntas al abrir la app */}
          <div className={today ? 'grid grid-cols-2 gap-3' : ''}>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 shrink-0 rounded-xl bg-accent/15 flex items-center justify-center">
                  <Wallet className="w-3.5 h-3.5 text-accent" />
                </div>
                <span className={`text-xs font-medium ${isCyberpunk ? 'font-mono text-accent/70 uppercase tracking-wider' : 'text-text-secondary'}`}>Dinero disponible</span>
                {real && !today && <span className="text-[10px] text-text-muted">· en tus cuentas · toca para ver</span>}
              </div>
              <p className={`mb-1 leading-none ${isCyberpunk ? 'font-mono font-bold tracking-wider' : 'font-syne font-bold'} ${today ? 'text-[clamp(16px,5vw,30px)]' : 'text-[clamp(24px,8vw,44px)]'} ${balance < 0 ? 'text-[var(--red)]' : 'text-accent'}`}>
                <AnimatedNumber value={balance} delay={0.05} />
              </p>
              <p className={`text-[10px] mb-3 ${isCyberpunk ? 'font-mono text-accent/50' : 'text-text-muted'}`}>
                {real ? (today ? 'En tus cuentas · toca para ver' : 'Lo que tienes hoy') : 'Ingresos − gastos del periodo'}
              </p>
            </div>

            {today && (
              <button type="button" data-tour="today"
                      onClick={(e) => { e.stopPropagation(); setInfo('today'); }}
                      className={`min-w-0 text-left pl-3 border-l ${isLight ? 'border-black/10' : 'border-white/10'} active:scale-[0.98] transition-transform`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 shrink-0 rounded-xl bg-accent/15 flex items-center justify-center">
                    <CalendarCheck className="w-3.5 h-3.5 text-accent" />
                  </div>
                  <span className={`text-xs font-medium ${isCyberpunk ? 'font-mono text-accent/70 uppercase tracking-wider' : 'text-text-secondary'}`}>
                    {today.remainingToday < 0 ? 'Hoy te pasaste' : 'Hoy puedes gastar'}
                  </span>
                </div>
                <p className={`mb-1 leading-none ${isCyberpunk ? 'font-mono tracking-wider' : 'font-syne'} font-bold text-[clamp(16px,5vw,30px)] ${today.remainingToday < 0 ? 'text-[var(--red)]' : 'text-accent'}`}>
                  <AnimatedNumber value={Math.abs(today.remainingToday)} delay={0.1} />
                </p>
                <p className={`text-[10px] mb-3 leading-tight ${isCyberpunk ? 'font-mono text-accent/50' : 'text-text-muted'}`}>
                  {!today.hasBase
                    ? 'Registra tus ingresos del mes'
                    : today.spentToday > 0
                      ? `Llevas ${formatCurrency(today.spentToday, currency)} de ${formatCurrency(today.todayAllowance, currency)}`
                      : `Cuota de hoy · quedan ${today.daysLeft} días`}
                </p>
              </button>
            )}
          </div>

          {/* Balance Neto con deudas incluidas */}
          <div className="pt-2 border-t border-white/5 flex items-center justify-between">
            <span className={`text-[10px] ${isCyberpunk ? 'font-mono text-accent/50 uppercase tracking-wider' : 'text-text-muted'}`}>
              Balance Neto (Con Deudas)
            </span>
            <span className={`text-xs font-bold ${isCyberpunk ? 'font-mono' : 'font-syne'} ${(balance - totalDeudas) < 0 ? 'text-red-400' : 'text-accent/80'}`}>
              ${(balance - totalDeudas).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Gastos + Ingresos row + Deudas */}
      <div className="grid grid-cols-2 gap-3" data-tour="totals">
        {/* Tarjeta Total Gastos */}
        <div 
          id="total-gastos-card" 
          className={`glass-card p-4 rounded-2xl animate-card-mix transition-all duration-300 ${
            absorbingId === 'total-gastos-card' ? 'scale-110 border-red-500/80 shadow-[0_0_35px_rgba(239,68,68,0.7)]' : ''
          }`} 
          style={{ animationDelay: '0.15s' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-[var(--red)]/15 flex items-center justify-center">
              <TrendingDown className="w-3 h-3 text-[var(--red)]" />
            </div>
            <span className={`text-[11px] font-medium ${isCyberpunk ? 'font-mono text-[var(--red)]/70 uppercase tracking-wider' : 'text-text-secondary'}`}>Gastos</span>
          </div>
          <p className={`${isCyberpunk ? 'font-mono font-bold text-[clamp(11px,3.8vw,18px)] text-[var(--red)] tracking-wider' : 'font-syne font-bold text-[clamp(11px,3.8vw,18px)] text-[var(--red)]'} ${absorbingId === 'total-gastos-card' ? 'drop-shadow-[0_0_12px_rgba(239,68,68,0.9)]' : ''}`}>
            <AnimatedNumber value={totalGastos} delay={0.15} />
          </p>
        </div>

        {/* Tarjeta Total Ingresos */}
        <div 
          id="total-ingresos-card" 
          className={`glass-card p-4 rounded-2xl animate-card-mix transition-all duration-300 ${
            absorbingId === 'total-ingresos-card' ? 'scale-110 border-accent/80 shadow-[0_0_35px_rgba(0,229,160,0.7)]' : ''
          }`} 
          style={{ animationDelay: '0.25s' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-accent/15 flex items-center justify-center">
              <TrendingUp className="w-3 h-3 text-accent" />
            </div>
            <span className={`text-[11px] font-medium ${isCyberpunk ? 'font-mono text-accent/70 uppercase tracking-wider' : 'text-text-secondary'}`}>Ingresos</span>
          </div>
          <p className={`${isCyberpunk ? 'font-mono font-bold text-[clamp(11px,3.8vw,18px)] text-accent tracking-wider' : 'font-syne font-bold text-[clamp(11px,3.8vw,18px)] text-accent'} ${absorbingId === 'total-ingresos-card' ? 'drop-shadow-[0_0_12px_rgba(0,229,160,0.9)]' : ''}`}>
            <AnimatedNumber value={totalIngresos} delay={0.25} />
          </p>
        </div>
        
        {/* Tarjeta de Deudas a lo ancho */}
        <button
          type="button"
          onClick={() => setInfo('debts')}
          data-tour="debts"
          id="total-deudas-card" 
          className={`glass-card p-4 rounded-2xl text-left active:scale-[0.98] hover:-translate-y-0.5 col-span-2 animate-card-mix transition-all duration-300 ${
            absorbingId === 'total-deudas-card' ? 'scale-105 border-yellow-500/80 shadow-[0_0_35px_rgba(245,158,11,0.7)]' : ''
          }`} 
          style={{ animationDelay: '0.35s' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-[var(--yellow)]/15 flex items-center justify-center">
              <TrendingDown className="w-3 h-3 text-[var(--yellow)]" />
            </div>
            <span className={`text-[11px] font-medium ${isCyberpunk ? 'font-mono text-[var(--yellow)]/70 uppercase tracking-wider' : 'text-text-secondary'}`}>Deudas Pendientes</span>
          </div>
          <p className={`${isCyberpunk ? 'font-mono font-bold text-[clamp(12px,5vw,18px)] text-[var(--yellow)] tracking-wider' : 'font-syne font-bold text-[clamp(12px,5vw,18px)] text-[var(--yellow)]'} ${absorbingId === 'total-deudas-card' ? 'drop-shadow-[0_0_12px_rgba(245,158,11,0.9)]' : ''}`}>
            <AnimatedNumber value={totalDeudas} delay={0.35} />
          </p>
          <p className={`text-[10px] mt-0.5 ${isCyberpunk ? 'font-mono text-accent/50' : 'text-text-muted'}`}>Toca para ver el detalle</p>
        </button>

      </div>

      {info === 'today' && today && <BalanceInfoModal kind="today" today={today} currency={currency} onClose={() => setInfo(null)} />}
      {showMoney && real && <MoneyInfoModal real={real} pendingCommitments={pendingCommitments} monthBalance={periodBalance} currency={currency} onClose={() => setShowMoney(false)} />}
      {info === 'debts' && <BalanceInfoModal kind="debts" balance={balance} currency={currency} onClose={() => setInfo(null)} />}
    </div>
  );
}
