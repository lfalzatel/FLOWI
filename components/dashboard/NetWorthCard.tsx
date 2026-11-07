'use client';
import Link from 'next/link';
import { useMemo } from 'react';
import { ChevronRight, Wallet } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useAccounts } from '@/hooks/useAccounts';
import { useInvestments } from '@/hooks/useInvestments';
import { useDebts } from '@/hooks/useDebts';
import { formatCurrency } from '@/lib/format';
import { accountStates, netWorth } from '@/lib/accounts';
import { Transaction } from '@/lib/firestore';

// Tarjeta de Inicio con el patrimonio neto; solo aparece cuando hay cuentas registradas
export function NetWorthCard({ transactions, currency = 'COP' }: { transactions: Transaction[]; currency?: string }) {
  const { theme } = useTheme();
  const isTech = theme === 'cyberpunk' || theme === 'kiloCode';
  const { accounts, transfers, loading, error } = useAccounts();
  const { investments } = useInvestments();
  const { debts } = useDebts();
  const states = useMemo(() => accountStates(accounts, transactions, transfers), [accounts, transactions, transfers]);
  const worth = useMemo(() => netWorth(states, investments, debts), [states, investments, debts]);
  if (loading || error || !states.length) return null;
  const fmt = (n: number) => formatCurrency(Math.round(n), currency);
  const card = isTech ? 'bg-glass border border-accent/25 rounded-none' : 'glass-card rounded-3xl';

  return (
    <Link href="/servicios/cuentas" className={`${card} flex items-center gap-3 p-4 hover:-translate-y-0.5 transition-transform`}>
      <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center shrink-0"><Wallet className="w-5 h-5 text-accent" /></div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-text-muted">Tu patrimonio neto</p>
        <p className={`text-sm font-bold ${worth.total < 0 ? 'text-[var(--red)]' : isTech ? 'text-accent' : 'text-text-primary'} ${isTech ? 'uppercase font-mono' : 'font-syne'}`}>
          {worth.total < 0 ? '−' : ''}{fmt(Math.abs(worth.total))}
        </p>
        <p className="text-[11px] text-text-muted truncate">
          Cuentas {fmt(worth.accounts)}{worth.investments ? ` · CDT ${fmt(worth.investments)}` : ''}{worth.liabilities ? ` · debes ${fmt(worth.liabilities)}` : ''}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
    </Link>
  );
}
