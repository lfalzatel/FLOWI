'use client';
import { AnimatedNumber } from '@/components/dashboard/AnimatedNumber';
import Link from 'next/link';
import { ChevronRight, Landmark } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useInvestments } from '@/hooks/useInvestments';
import { formatCurrency } from '@/lib/format';
import { formatDay, portfolioSummary, whenText } from '@/lib/investments';

// Tarjeta compacta de Inicio con lo ahorrado e invertido (CDT, Nu, fondos…); solo aparece si hay algo activo
export function InvestmentsSummaryCard({ currency = 'COP' }: { currency?: string }) {
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  const { investments, loading, error } = useInvestments();
  if (loading || error) return null;
  const s = portfolioSummary(investments);
  if (!s.active.length) return null;
  const card = isTechTheme ? 'bg-glass border border-accent/25 rounded-none' : 'glass-card rounded-3xl';
  const soon = s.next && s.next.daysLeft <= 3;

  return (
    <Link href="/servicios/inversiones" className={`${card} flex items-center gap-3 p-4 hover:-translate-y-0.5 transition-transform`}>
      <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center shrink-0"><Landmark className="w-5 h-5 text-accent" /></div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-text-muted">Ahorro e inversiones · llevas {formatCurrency(s.earnedToDate, currency)} ganados</p>
        <p className={`text-sm font-bold ${isTechTheme ? 'text-accent uppercase font-mono' : 'text-text-primary font-syne'}`}><AnimatedNumber value={s.invested} format={(n: number) => formatCurrency(n, currency)} /></p>
        {s.next && (
          <p className={`text-[11px] ${soon ? 'text-amber-500' : 'text-text-muted'}`}>
            {s.next.inv.bank}: {whenText(s.next.daysLeft)} ({formatDay(s.next.inv.maturityDate)})
          </p>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
    </Link>
  );
}
