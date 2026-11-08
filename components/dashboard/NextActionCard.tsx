'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Sparkles, X } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { AddExpenseModal } from '@/components/forms/AddExpenseModal';
import { MarkPaidDialog } from '@/components/reminders/MarkPaidDialog';
import { AddDebtModal } from '@/components/forms/AddDebtModal';
import { BalanceInfoModal } from './BalanceInfoModal';
import { NextAction } from '@/lib/nextAction';
import { DailyBudget } from '@/lib/dailyBudget';
import { getLocalDateString } from '@/lib/dateUtils';
import { askForNotifications } from '@/lib/notifPrompt';
import { createPortal } from 'react-dom';
import { useAccounts } from '@/hooks/useAccounts';
import { AdjustBalanceModal } from '@/components/accounts/AccountModals';
import { AccountIcon } from '@/components/accounts/AccountIcon';
import { updateAccount } from '@/lib/firestore';
import { formatCurrency } from '@/lib/format';

// Las acciones saltadas se guardan solo en este dispositivo y solo por hoy
const skipKey = () => `flowi_next_action_skip_${getLocalDateString()}`;

export function useSkippedActions() {
  const [skipped, setSkipped] = useState<string[]>([]);
  useEffect(() => {
    try { setSkipped(JSON.parse(localStorage.getItem(skipKey()) || '[]')); } catch { /* sin almacenamiento */ }
  }, []);
  const skip = (id: string) => {
    const next = [...skipped, id];
    setSkipped(next);
    try { localStorage.setItem(skipKey(), JSON.stringify(next)); } catch { /* sin almacenamiento */ }
  };
  return { skipped, skip };
}

interface Props {
  action: NextAction;
  today: DailyBudget | null;
  currency?: string;
  onSkip: () => void;
  onRefresh?: () => void;
}

export function NextActionCard({ action, today, currency, onSkip, onRefresh }: Props) {
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  const [open, setOpen] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const { accounts } = useAccounts();
  const alert = action.tone === 'alert';
  const reconcileAccount = action.kind === 'reconcile' ? accounts.find(a => a.id === action.accountId) : undefined;

  const body = (
    <>
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${alert ? 'bg-red-500/15' : 'bg-accent/20'}`}>
        <Sparkles className={`w-5 h-5 ${alert ? 'text-red-400' : 'text-accent'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Tu siguiente acción</p>
        <p className={`text-sm font-bold ${alert ? 'text-red-400' : isTechTheme ? 'text-accent' : 'text-text-primary'} ${isTechTheme ? 'uppercase font-mono' : 'font-syne'}`}>
          {action.title}
        </p>
        <p className="text-xs text-text-secondary leading-snug mt-0.5">{action.detail}</p>
      </div>
      <ChevronRight className={`w-4 h-4 shrink-0 ${alert ? 'text-red-400' : 'text-accent'}`} />
    </>
  );

  const box = `flex items-center gap-1 ${isTechTheme ? 'rounded-none border' : 'rounded-3xl border'} ${alert
    ? 'bg-red-500/5 border-red-500/30'
    : isTechTheme ? 'bg-accent/10 border-accent/40' : 'bg-gradient-to-r from-accent/15 to-accent/5 border-accent/25'}`;
  const inner = 'flex-1 min-w-0 flex items-center gap-3 p-4 text-left';

  return (
    <>
      <div className={box} data-tour="next-action">
        {action.kind === 'link'
          ? <Link href={action.href} className={inner}>{body}</Link>
          : <button type="button" onClick={() => (action.kind === 'notify' ? askForNotifications({ force: true }) : setOpen(true))} className={inner}>{body}</button>}
        <button type="button" onClick={onSkip} title="Saltar por hoy" aria-label="Saltar esta sugerencia por hoy"
                className="p-2 mr-2 text-text-muted hover:text-text-primary shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      {open && action.kind === 'pay' && action.commitment.reminder && (
        <MarkPaidDialog
          due={{ reminder: action.commitment.reminder, dueDate: action.commitment.dueDate, daysLeft: action.commitment.daysLeft }}
          amount={action.commitment.amount}
          onClose={() => { setOpen(false); onRefresh?.(); }}
        />
      )}
      {open && action.kind === 'pay' && action.commitment.debt && (
        <AddDebtModal debtToEdit={action.commitment.debt} initialAbono={action.commitment.amount}
                      onClose={() => setOpen(false)} onSuccess={() => onRefresh?.()} />
      )}
      {open && action.kind === 'pay' && !action.commitment.reminder && !action.commitment.debt && (
        <AddExpenseModal
          initialType="gasto"
          initialVoiceParsed={{ type: 'gasto', amount: action.commitment.amount, category: action.commitment.category, description: action.commitment.title, isFixed: true, rawText: '' }}
          onClose={() => setOpen(false)} onSuccess={onRefresh}
        />
      )}
      {open && action.kind === 'income' && (
        <AddExpenseModal
          initialType="ingreso"
          initialVoiceParsed={{ type: 'ingreso', amount: action.prefill.amount, category: action.prefill.category, description: action.prefill.description, isFixed: false, rawText: '' }}
          onClose={() => setOpen(false)} onSuccess={onRefresh}
        />
      )}
      {open && action.kind === 'add' && (
        <AddExpenseModal initialType="gasto" onClose={() => setOpen(false)} onSuccess={onRefresh} />
      )}
      {open && action.kind === 'reconcile' && reconcileAccount && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className={`absolute inset-0 ${theme === 'light' ? 'bg-black/10' : 'bg-black/40'}`} onClick={() => setOpen(false)} aria-hidden="true" />
          <div className={`w-full max-w-sm relative z-10 animate-fade-in-up glass-dropdown p-6 ${isTechTheme ? 'rounded-none border border-accent/50 font-mono' : 'rounded-3xl'}`}>
            <div className="flex items-center gap-3 mb-3">
              <span className="w-10 h-10 rounded-2xl bg-glass border border-glass-border flex items-center justify-center">
                <AccountIcon account={reconcileAccount} className="w-6 h-6 text-xl flex items-center justify-center" />
              </span>
              <div className="min-w-0">
                <h2 className={`font-bold ${isTechTheme ? 'text-accent uppercase' : 'font-syne text-text-primary'}`}>{reconcileAccount.name}</h2>
                <p className="text-xs text-text-muted">Según FLOWI tienes {formatCurrency(Math.round(action.balance * 100) / 100, currency)}</p>
              </div>
            </div>
            <p className="text-sm text-text-secondary mb-5">Abre la app del banco y mira el saldo. ¿Es el mismo?</p>
            <div className="space-y-2">
              <button type="button" onClick={async () => { await updateAccount(reconcileAccount.id!, { confirmedAt: new Date().toISOString() }); setOpen(false); }}
                      className={`w-full py-3 font-bold ${isTechTheme ? 'rounded-none bg-accent/20 border border-accent text-accent uppercase' : 'rounded-xl bg-accent text-white'}`}>
                Sí, cuadra
              </button>
              <button type="button" onClick={() => { setOpen(false); setAdjusting(true); }}
                      className={`w-full py-3 text-sm font-semibold border ${isTechTheme ? 'rounded-none border-accent/40 text-accent' : 'rounded-xl border-glass-border text-text-primary'}`}>
                No, ajustar el saldo
              </button>
              <button type="button" onClick={() => setOpen(false)} className="w-full py-2 text-xs text-text-muted">Ahora no</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
      {adjusting && reconcileAccount && action.kind === 'reconcile' && (
        <AdjustBalanceModal account={reconcileAccount} current={action.balance} currency={currency} onClose={() => setAdjusting(false)} />
      )}
      {open && action.kind === 'today' && today && (
        <BalanceInfoModal kind="today" today={today} currency={currency} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
