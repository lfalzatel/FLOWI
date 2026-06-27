'use client';
import { useState, useEffect } from 'react';
import { TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

interface Props {
  balance:       number;
  totalGastos:   number;
  totalIngresos: number;
  totalDeudas:   number;
}

import { AnimatedNumber } from './AnimatedNumber';

export function BalanceCard({ balance, totalGastos, totalIngresos, totalDeudas }: Props) {
  const { theme } = useTheme();
  const isCyberpunk = theme === 'cyberpunk' || theme === 'kiloCode';
  const isLight = theme === 'light';

  const cardGradient = isLight 
    ? 'linear-gradient(135deg, var(--bg-card) 0%, #F9FAFB 100%)' 
    : isCyberpunk
      ? 'linear-gradient(135deg, #0A0A16 0%, #070714 100%)'
      : 'linear-gradient(135deg, #0D2E1F 0%, #0A1929 50%, #150D2E 100%)';

  return (
    <div className="space-y-4">
      {/* Main balance */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 animate-card-mix shadow-sm"
           style={{
             background: cardGradient,
             border: '1px solid var(--glass-border)',
             animationDelay: '0.05s',
             borderRadius: isCyberpunk ? '0' : '1.5rem',
             clipPath: isCyberpunk ? 'polygon(0 20px, 20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' : 'none'
           }}>
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
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-xl bg-accent/15 flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5 text-accent" />
            </div>
            <span className={`text-xs font-medium ${isCyberpunk ? 'font-mono text-accent/70 uppercase tracking-wider' : 'text-text-secondary'}`}>Dinero disponible</span>
          </div>

          <p className={`mb-3 leading-none ${isCyberpunk ? 'font-mono font-bold text-[clamp(24px,8vw,44px)] tracking-wider' : 'font-syne font-bold text-[clamp(24px,8vw,44px)]'} ${balance < 0 ? 'text-[var(--red)]' : 'text-accent'}`}>
            <AnimatedNumber value={balance} delay={0.05} />
          </p>

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
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card p-4 rounded-2xl animate-card-mix" style={{ animationDelay: '0.15s' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-[var(--red)]/15 flex items-center justify-center">
              <TrendingDown className="w-3 h-3 text-[var(--red)]" />
            </div>
            <span className={`text-[11px] font-medium ${isCyberpunk ? 'font-mono text-[var(--red)]/70 uppercase tracking-wider' : 'text-text-secondary'}`}>Gastos</span>
          </div>
          <p className={`${isCyberpunk ? 'font-mono font-bold text-[clamp(11px,3.8vw,18px)] text-[var(--red)] tracking-wider' : 'font-syne font-bold text-[clamp(11px,3.8vw,18px)] text-[var(--red)]'}`}><AnimatedNumber value={totalGastos} delay={0.15} /></p>
        </div>
        <div className="glass-card p-4 rounded-2xl animate-card-mix" style={{ animationDelay: '0.25s' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-accent/15 flex items-center justify-center">
              <TrendingUp className="w-3 h-3 text-accent" />
            </div>
            <span className={`text-[11px] font-medium ${isCyberpunk ? 'font-mono text-accent/70 uppercase tracking-wider' : 'text-text-secondary'}`}>Ingresos</span>
          </div>
          <p className={`${isCyberpunk ? 'font-mono font-bold text-[clamp(11px,3.8vw,18px)] text-accent tracking-wider' : 'font-syne font-bold text-[clamp(11px,3.8vw,18px)] text-accent'}`}><AnimatedNumber value={totalIngresos} delay={0.25} /></p>
        </div>
        
        {/* Tarjeta de Deudas a lo ancho */}
        <div className="glass-card p-4 rounded-2xl col-span-2 animate-card-mix" style={{ animationDelay: '0.35s' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-[var(--yellow)]/15 flex items-center justify-center">
              <TrendingDown className="w-3 h-3 text-[var(--yellow)]" />
            </div>
            <span className={`text-[11px] font-medium ${isCyberpunk ? 'font-mono text-[var(--yellow)]/70 uppercase tracking-wider' : 'text-text-secondary'}`}>Deudas Pendientes</span>
          </div>
          <p className={`${isCyberpunk ? 'font-mono font-bold text-[clamp(12px,5vw,18px)] text-[var(--yellow)] tracking-wider' : 'font-syne font-bold text-[clamp(12px,5vw,18px)] text-[var(--yellow)]'}`}><AnimatedNumber value={totalDeudas} delay={0.35} /></p>
        </div>
      </div>
    </div>
  );
}
