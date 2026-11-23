'use client';
import { currentLocale, tr } from '@/lib/i18n';
import { useState } from 'react';
import { ChevronDown, ArrowDownToLine, ArrowUpFromLine, Scale, Sparkles, RefreshCw } from 'lucide-react';
import type { Account, Investment } from '@/lib/firestore';

// Historial de un ahorro, CDT o fondo: cada depósito, retiro, ajuste de saldo y pago, con la fecha y
// de qué cuenta salió o a cuál llegó. Así se puede revisar movimiento por movimiento, no solo el total.

type Move = { at: string; amount: number; label: string; account?: string; kind: 'in' | 'out' | 'adjust' | 'pay' };

export function investmentMoves(inv: Investment, accounts: Account[]): Move[] {
  const name = (id: string | null) => (id ? accounts.find(a => a.id === id)?.name : undefined);
  const out: Move[] = [];
  for (const f of inv.fundings || []) {
    const label = f.kind === 'apertura' ? 'Apertura' : f.kind === 'renovacion' ? 'Renovación (más capital)' : 'Depósito';
    out.push({ at: f.at, amount: f.amount, label, account: f.accountId ? tr('desde {a}', { a: name(f.accountId) || 'una cuenta' }) : 'ya estaba ahorrada', kind: 'in' });
  }
  for (const p of inv.payouts || []) {
    const label = p.kind === 'pago' ? 'Te pagaron' : p.kind === 'renovacion' ? 'Retiro al renovar' : 'Retiro';
    out.push({ at: p.at, amount: -p.amount, label, account: p.accountId ? `a ${name(p.accountId) || 'una cuenta'}` : undefined, kind: p.kind === 'pago' ? 'pay' : 'out' });
  }
  for (const a of inv.adjustments || []) {
    out.push({ at: a.at, amount: a.to - a.from, label: tr('Ajuste de saldo'), account: tr('quedó en {a}', { a: a.to }), kind: 'adjust' });
  }
  return out.sort((x, y) => y.at.localeCompare(x.at));
}

export function InvestmentMovements({ inv, accounts, fmt, isTech }: {
  inv: Investment; accounts: Account[]; fmt: (n: number) => string; isTech: boolean;
}) {
  const [open, setOpen] = useState(false);
  const moves = investmentMoves(inv, accounts);
  if (!moves.length) return null;
  const Icon = (k: Move['kind']) => (k === 'in' ? ArrowDownToLine : k === 'out' ? ArrowUpFromLine : k === 'adjust' ? Scale : k === 'pay' ? Sparkles : RefreshCw);
  return (
    <div className="mt-3">
      <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open}
              className={`w-full flex items-center justify-between text-[11px] font-semibold text-text-secondary ${isTech ? 'uppercase tracking-wider' : ''}`}>
        Movimientos ({moves.length})
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul className={`mt-2 divide-y divide-glass-border border-t border-glass-border ${isTech ? 'normal-case' : ''}`}>
          {moves.map((m, i) => {
            const I = Icon(m.kind);
            const d = new Date(m.at);
            const extra = m.kind === 'adjust' ? `quedó en ${fmt(m.amount + (inv.adjustments?.find(a => a.at === m.at)?.from ?? 0))}` : m.account;
            return (
              <li key={`${m.at}-${i}`} className="flex items-center gap-2.5 py-2">
                <I className={`w-3.5 h-3.5 shrink-0 ${m.amount >= 0 ? 'text-accent' : 'text-[var(--red)]'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-primary">{m.label}</p>
                  <p className="text-[10px] text-text-muted truncate">
                    {d.toLocaleDateString(currentLocale(), { weekday: 'short', day: 'numeric', month: 'short', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined })}
                    {extra ? ` · ${extra}` : ''}
                  </p>
                </div>
                <span className={`text-xs font-semibold tabular-nums ${m.amount >= 0 ? 'text-accent' : 'text-[var(--red)]'}`}>
                  {m.amount >= 0 ? '+' : '−'}{fmt(Math.abs(m.amount))}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
