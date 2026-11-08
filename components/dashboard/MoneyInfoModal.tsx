'use client';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { X, ArrowRight } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { AccountIcon } from '@/components/accounts/AccountIcon';
import { RealMoneyInfo } from '@/hooks/useRealMoney';
import { formatCurrency } from '@/lib/format';

// Al tocar "Dinero disponible": la plata que hay en cada cuenta y el atajo para ajustarlas
export function MoneyInfoModal({ real, pendingCommitments, currency = 'COP', onClose }: {
  real: RealMoneyInfo; pendingCommitments: number; currency?: string; onClose: () => void;
}) {
  const { theme } = useTheme();
  const isTech = theme === 'cyberpunk' || theme === 'kiloCode';
  const f = (n: number) => formatCurrency(Math.round(n), currency);
  const spend = real.states.filter(s => s.account.kind !== 'credito' && s.account.purpose !== 'ahorro');
  const saving = real.states.filter(s => s.account.kind !== 'credito' && s.account.purpose === 'ahorro');
  const cards = real.states.filter(s => s.account.kind === 'credito');
  const free = real.cash - real.cardDebt - pendingCommitments;
  if (typeof document === 'undefined') return null;

  const row = (s: typeof real.states[number]) => (
    <li key={s.account.id} className="flex items-center gap-3 py-2">
      <span className={`w-9 h-9 shrink-0 flex items-center justify-center bg-glass border ${isTech ? 'rounded-none border-accent/30' : 'rounded-xl border-glass-border'}`}>
        <AccountIcon account={s.account} className="w-5 h-5 text-lg flex items-center justify-center" />
      </span>
      <span className="flex-1 min-w-0 text-sm text-text-secondary truncate">{s.account.name}</span>
      <span className={`text-sm font-semibold tabular-nums ${s.balance < 0 ? 'text-red-400' : 'text-text-primary'}`}>
        {s.account.kind === 'credito' && s.balance < 0 ? `Debes ${f(-s.balance)}` : `${s.balance < 0 ? '−' : ''}${f(Math.abs(s.balance))}`}
      </span>
    </li>
  );

  return createPortal(
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${isTech ? 'font-mono' : ''}`}>
      <div className={`absolute inset-0 ${theme === 'light' ? 'bg-black/10' : 'bg-black/40'}`} onClick={onClose} aria-hidden="true" />
      <div className={`w-full max-w-md relative z-10 animate-fade-in-up max-h-[88dvh] overflow-y-auto glass-dropdown p-5 ${isTech ? 'rounded-none border border-accent/50' : 'rounded-3xl'}`}
           onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className={isTech ? 'font-bold text-lg text-accent uppercase' : 'font-syne font-bold text-lg text-text-primary'}>Dinero disponible</h2>
            <p className="text-xs text-text-muted">La plata que tienes hoy en tus cuentas para gastar</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="p-1 -mr-1 text-text-secondary hover:text-text-primary"><X className="w-5 h-5" /></button>
        </div>

        <ul className={`divide-y ${isTech ? 'divide-accent/15' : 'divide-glass-border'}`}>{spend.map(row)}</ul>
        <div className={`flex justify-between pt-2 mt-1 border-t ${isTech ? 'border-accent/30' : 'border-glass-border'}`}>
          <span className="text-sm font-bold text-text-primary">Total para gastar</span>
          <span className="text-sm font-bold text-accent tabular-nums">{f(real.cash)}</span>
        </div>

        {(pendingCommitments > 0 || real.cardDebt > 0) && (
          <div className={`mt-4 p-3 text-xs space-y-1 ${isTech ? 'rounded-none bg-accent/5 border border-accent/20' : 'rounded-2xl bg-white/5 border border-glass-border'}`}>
            {pendingCommitments > 0 && <p className="flex justify-between text-text-secondary"><span>Compromisos por pagar este mes</span><span className="tabular-nums">− {f(pendingCommitments)}</span></p>}
            {real.cardDebt > 0 && <p className="flex justify-between text-text-secondary"><span>Lo que debes en tarjetas</span><span className="tabular-nums">− {f(real.cardDebt)}</span></p>}
            <p className="flex justify-between font-bold text-text-primary pt-1"><span>Te queda libre</span><span className={`tabular-nums ${free < 0 ? 'text-red-400' : ''}`}>{free < 0 ? '−' : ''}{f(Math.abs(free))}</span></p>
          </div>
        )}

        {(saving.length > 0 || cards.length > 0) && (
          <>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-text-muted">No cuentan para gastar</p>
            <ul className={`divide-y ${isTech ? 'divide-accent/15' : 'divide-glass-border'}`}>{[...saving, ...cards].map(row)}</ul>
          </>
        )}

        <p className="mt-4 text-[11px] text-text-muted leading-snug">
          Si algún saldo no coincide con tu banco, ajústalo en Cuentas y patrimonio. Desde ahí, tus gastos e ingresos lo mantienen al día.
        </p>
        <Link href="/servicios/cuentas" onClick={onClose}
              className={`mt-3 w-full flex items-center justify-center gap-2 py-3 font-bold transition-all active:scale-[0.98] ${isTech ? 'rounded-none bg-accent/20 border border-accent text-accent uppercase text-sm' : `rounded-xl bg-accent ${theme === 'light' ? 'text-white' : 'text-black'}`}`}>
          Ver y ajustar mis cuentas <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>,
    document.body,
  );
}
