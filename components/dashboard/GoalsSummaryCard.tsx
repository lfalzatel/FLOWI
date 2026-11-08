'use client';
import { AnimatedNumber } from '@/components/dashboard/AnimatedNumber';
import Link from 'next/link';
import { ChevronRight, Target } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useGoals } from '@/hooks/useGoals';
import { formatCurrency } from '@/lib/format';
import { Goal } from '@/lib/firestore';
import { goalProgress, isGoalDone } from '@/lib/goals';

// Tarjeta compacta de Inicio: la meta de ahorro más prioritaria, o una invitación a crear la primera
// `demoGoals` reemplaza las metas reales durante el recorrido guiado
export function GoalsSummaryCard({ currency = 'COP', demoGoals }: { currency?: string; demoGoals?: Goal[] }) {
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  const real = useGoals();
  const goals = demoGoals || real.goals;

  if (!demoGoals && (real.loading || real.error)) return null;

  const active = goals.filter(g => !isGoalDone(g));
  const top = active[0];
  const card = isTechTheme ? 'bg-glass border border-accent/25 rounded-none' : 'glass-card rounded-3xl';

  if (!top) {
    return (
      <Link href="/servicios/metas" className={`${card} flex items-center gap-3 p-4 hover:-translate-y-0.5 transition-transform`}>
        <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center shrink-0"><Target className="w-5 h-5 text-accent" /></div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${isTechTheme ? 'text-accent uppercase font-mono' : 'text-text-primary'}`}>
            {goals.length ? '¡Cumpliste tus metas! ¿Vamos por otra?' : '¿Para qué estás ahorrando?'}
          </p>
          <p className="text-xs text-text-muted">Crea una meta y te digo cuándo la lograrías.</p>
        </div>
        <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
      </Link>
    );
  }

  const pct = Math.round(goalProgress(top) * 100);
  return (
    <Link href="/servicios/metas" className={`${card} block p-4 hover:-translate-y-0.5 transition-transform`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-medium ${isTechTheme ? 'text-accent/70 uppercase font-mono tracking-wide' : 'text-text-secondary'}`}>
          Metas de ahorro{active.length > 1 ? ` · ${active.length} activas` : ''}
        </span>
        <ChevronRight className="w-4 h-4 text-text-muted" />
      </div>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{top.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className={`font-semibold truncate ${isTechTheme ? 'text-accent text-sm uppercase font-mono' : 'text-text-primary'}`}>{top.name}</p>
            <span className="text-xs font-bold text-accent shrink-0">{pct}%</span>
          </div>
          <div className={`mt-1.5 h-2 overflow-hidden bg-glass ${isTechTheme ? 'rounded-none' : 'rounded-full'}`}>
            <div className={`h-full bg-gradient-to-r from-accent-dim to-accent ${isTechTheme ? '' : 'rounded-full'}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[11px] text-text-muted mt-1">{formatCurrency(top.savedAmount, currency)} de <AnimatedNumber value={top.targetAmount} format={(n: number) => formatCurrency(n, currency)} /></p>
        </div>
      </div>
    </Link>
  );
}
