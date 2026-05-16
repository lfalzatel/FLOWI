'use client';
import { TrendingDown, TrendingUp, Wallet } from 'lucide-react';

interface Props {
  balance:       number;
  totalGastos:   number;
  totalIngresos: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
}

export function BalanceCard({ balance, totalGastos, totalIngresos }: Props) {
  return (
    <div className="space-y-4">
      {/* Main balance */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-8"
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
              <Wallet className="w-3.5 h-3.5 text-accent" />
            </div>
            <span className="text-xs font-medium text-white/50">Balance total</span>
          </div>

          <p className="font-syne font-bold text-4xl md:text-5xl text-white mb-1 leading-none">
            {fmt(balance)}
          </p>
          <p className="text-xs text-white/30">Este mes</p>
        </div>
      </div>

      {/* Gastos + Ingresos row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card p-4 rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-red-500/15 flex items-center justify-center">
              <TrendingDown className="w-3 h-3 text-red-400" />
            </div>
            <span className="text-[11px] text-white/40 font-medium">Gastos</span>
          </div>
          <p className="font-syne font-bold text-lg text-red-400">{fmt(totalGastos)}</p>
        </div>
        <div className="glass-card p-4 rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-accent/15 flex items-center justify-center">
              <TrendingUp className="w-3 h-3 text-accent" />
            </div>
            <span className="text-[11px] text-white/40 font-medium">Ingresos</span>
          </div>
          <p className="font-syne font-bold text-lg text-accent">{fmt(totalIngresos)}</p>
        </div>
      </div>
    </div>
  );
}
