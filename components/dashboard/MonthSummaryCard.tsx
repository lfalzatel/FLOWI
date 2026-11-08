'use client';
import Link from 'next/link';
import { useMemo } from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useCategories } from '@/hooks/useCategories';
import { Transaction } from '@/lib/firestore';
import { createCategoryResolver } from '@/lib/categoryGroups';
import { buildMonthSummary, shiftMonth } from '@/lib/monthSummary';
import { getLocalMonthString } from '@/lib/dateUtils';
import { formatCurrency } from '@/lib/format';

// Inicio, del día 1 al 10: "Tu resumen de octubre" con el primer hallazgo y el enlace al resumen completo
export function MonthSummaryCard({ transactions, currency = 'COP' }: { transactions: Transaction[]; currency?: string }) {
  const { theme } = useTheme();
  const isTech = theme === 'cyberpunk' || theme === 'kiloCode';
  const { allCategories } = useCategories();
  const month = shiftMonth(getLocalMonthString(), -1);
  const s = useMemo(() => buildMonthSummary(transactions, month, createCategoryResolver(allCategories), (n) => formatCurrency(Math.round(n), currency)),
    [transactions, month, allCategories, currency]);
  if (new Date().getDate() > 10 || !s.hasData) return null;
  const first = s.insights[0];
  const card = isTech ? 'bg-glass border border-accent/25 rounded-none' : 'glass-card rounded-3xl';
  return (
    <Link href={`/servicios/resumen?mes=${month}`} className={`${card} flex items-center gap-3 p-4 hover:-translate-y-0.5 transition-transform`}>
      <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center shrink-0"><Sparkles className="w-5 h-5 text-accent" /></div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold capitalize ${isTech ? 'text-accent uppercase font-mono' : 'text-text-primary font-syne'}`}>Tu resumen de {s.monthName}</p>
        <p className="text-xs text-text-secondary leading-snug">{first ? `${first.emoji} ${first.text}` : 'Mira en qué se fue tu plata el mes pasado.'}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
    </Link>
  );
}
