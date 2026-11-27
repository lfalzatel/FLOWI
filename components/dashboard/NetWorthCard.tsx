'use client';
import { tr } from '@/lib/i18n';
import { AnimatedNumber } from '@/components/dashboard/AnimatedNumber';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, Wallet, X } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useAccounts } from '@/hooks/useAccounts';
import { useInvestments } from '@/hooks/useInvestments';
import { useDebts } from '@/hooks/useDebts';
import { formatCurrency } from '@/lib/format';
import { MONEY_TEXT, toneOf } from '@/lib/moneyTone';
import { KIND_LABEL, accountStates, netWorth } from '@/lib/accounts';
import { AccountIcon } from '@/components/accounts/AccountIcon';
import { Transaction } from '@/lib/firestore';

// Tarjeta de Inicio con el patrimonio neto; solo aparece cuando hay cuentas registradas.
// Al tocarla se abre el resumen: cuánto hay en cada cuenta (con los colores de Cuentas) y los totales.
export function NetWorthCard({ transactions, currency = 'COP' }: { transactions: Transaction[]; currency?: string }) {
  const { theme } = useTheme();
  const isTech = theme === 'cyberpunk' || theme === 'kiloCode';
  const isLight = theme === 'light' || theme === 'nova';
  const { accounts, transfers, loading, error } = useAccounts();
  const { investments } = useInvestments();
  const { debts } = useDebts();
  const [open, setOpen] = useState(false);
  const states = useMemo(() => accountStates(accounts, transactions, transfers, investments, debts), [accounts, transactions, transfers, investments, debts]);
  const worth = useMemo(() => netWorth(states, investments, debts), [states, investments, debts]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  if (loading || error || !states.length) return null;
  const fmt = (n: number) => formatCurrency(n, currency);
  const card = isTech ? 'bg-glass border border-accent/25 rounded-none' : 'glass-card rounded-3xl';
  const box = isTech ? 'rounded-none' : 'rounded-2xl';
  // Primero las cuentas con más plata; las tarjetas de crédito al final
  const sorted = [...states].sort((a, b) => (a.account.kind === 'credito' ? 1 : 0) - (b.account.kind === 'credito' ? 1 : 0) || b.balance - a.balance);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} data-tour="networth"
              className={`${card} w-full text-left flex items-center gap-3 p-4 hover:-translate-y-0.5 transition-transform`}>
        <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center shrink-0"><Wallet className="w-5 h-5 text-accent" /></div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-text-muted">{tr('Tu patrimonio neto')}</p>
          <p className={`text-sm font-bold ${worth.total < 0 ? 'text-money-neg' : 'text-money-pos'} ${isTech ? 'uppercase font-mono' : 'font-syne'}`}>
            {worth.total < 0 ? '−' : ''}<AnimatedNumber value={Math.abs(worth.total)} format={fmt} />
          </p>
          <p className="text-[11px] text-text-muted truncate">
            {tr('Cuentas')} {fmt(worth.accounts)}{worth.investments ? ` · CDT ${fmt(worth.investments)}` : ''}{worth.liabilities ? ` · ${tr('debes {m}', { m: fmt(worth.liabilities) })}` : ''}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div className={`fixed inset-0 z-[110] flex items-center justify-center p-4 ${isTech ? 'font-mono' : ''}`} role="dialog" aria-modal="true" aria-label={tr('Tu patrimonio neto')}>
          <div className={`absolute inset-0 ${isLight ? 'bg-black/30' : 'bg-black/60'}`} onClick={() => setOpen(false)} aria-hidden="true" />
          <div className={`relative w-full max-w-md max-h-[85dvh] overflow-y-auto glass-dropdown p-5 space-y-4 animate-fade-in-up ${isTech ? 'rounded-none border border-accent/50' : 'rounded-[28px]'}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-text-secondary">{tr('Tu patrimonio neto')}</p>
                <p className={`text-3xl font-bold leading-tight ${worth.total < 0 ? 'text-money-neg' : 'text-money-pos'} ${isTech ? '' : 'font-syne'}`}>
                  {worth.total < 0 ? '−' : ''}{fmt(Math.abs(worth.total))}
                </p>
                <p className="text-[11px] text-text-muted">{tr('Tienes {a} · debes {b}', { a: fmt(worth.assets), b: fmt(worth.liabilities) })}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label={tr('Cerrar')} className="p-1 -mr-1 text-text-secondary"><X className="w-5 h-5" /></button>
            </div>

            {/* Cada cuenta con su saldo de hoy */}
            <section className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">{tr('En cada cuenta')}</p>
              {sorted.map(st => {
                const a = st.account;
                const owes = a.kind === 'credito' && st.balance < 0;
                const cls = owes ? MONEY_TEXT.debt : MONEY_TEXT[toneOf(st.balance, a.purpose === 'ahorro' ? 'save' : 'pos')];
                return (
                  <div key={a.id} className={`flex items-center gap-3 px-3 py-2.5 border border-glass-border ${box}`}>
                    <AccountIcon account={a} className="w-7 h-7 text-xl flex items-center justify-center shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-text-primary truncate">{a.name}</span>
                      <span className="block text-[11px] text-text-muted">{tr(KIND_LABEL[a.kind])}</span>
                    </span>
                    <span className={`text-sm font-bold tabular-nums shrink-0 ${cls}`}>
                      {owes ? `${tr('Debes')} ` : st.balance < -0.5 ? '−' : ''}{fmt(Math.abs(st.balance))}
                    </span>
                  </div>
                );
              })}
            </section>

            {/* Lo demás que suma o resta */}
            {(worth.investments > 0 || worth.owedToMe > 0 || worth.debts > 0) && (
              <section className="space-y-1 pt-1 border-t border-glass-border">
                {worth.investments > 0 && <p className="flex justify-between text-sm py-1"><span className="text-text-secondary">{tr('En CDT')}</span><span className={`font-semibold ${MONEY_TEXT.save}`}>{fmt(worth.investments)}</span></p>}
                {worth.owedToMe > 0 && <p className="flex justify-between text-sm py-1"><span className="text-text-secondary">{tr('Te deben')}</span><span className={`font-semibold ${MONEY_TEXT.pos}`}>{fmt(worth.owedToMe)}</span></p>}
                {worth.debts > 0 && <p className="flex justify-between text-sm py-1"><span className="text-text-secondary">{tr('Debes en préstamos')}</span><span className={`font-semibold ${MONEY_TEXT.debt}`}>−{fmt(worth.debts)}</span></p>}
              </section>
            )}

            <Link href="/servicios/cuentas" onClick={() => setOpen(false)}
                  className={`flex items-center justify-center gap-1.5 w-full py-2.5 text-sm font-semibold border border-accent/50 text-accent hover:bg-accent/10 ${box}`}>
              {tr('Ver Cuentas y patrimonio')} <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
