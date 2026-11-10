'use client';
import { AnimatedNumber } from '@/components/dashboard/AnimatedNumber';
import { useState } from 'react';
import { CalendarClock, CheckCircle2, ChevronDown, X } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { CategoryIcon } from '@/components/CategoryIcon';
import { findCatalogEntry } from '@/lib/categories';
import { AddExpenseModal } from '@/components/forms/AddExpenseModal';
import { MarkPaidDialog } from '@/components/reminders/MarkPaidDialog';
import { AddDebtModal } from '@/components/forms/AddDebtModal';
import { formatCurrency } from '@/lib/format';
import { skipCommitment } from '@/lib/firestore';
import { Commitment, CommitmentsSummary, commitmentWhen, monthKey, skipEntry } from '@/lib/commitments';

const VISIBLE = 4;

interface Props {
  summary: CommitmentsSummary;
  currency?: string;
  onRefresh?: () => void;
}

// Inicio: lo que falta por pagar este mes. Tocar un compromiso lo registra (o marca el recordatorio
// como pagado); la X lo omite solo por este mes.
export function CommitmentsCard({ summary, currency = 'COP', onRefresh }: Props) {
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [paying, setPaying] = useState<Commitment | null>(null);
  const [skipping, setSkipping] = useState<string | null>(null);

  const { pending, pendingTotal, paidCount } = summary;
  if (!pending.length && !paidCount) return null;

  const card = isTechTheme ? 'bg-glass border border-accent/25 rounded-none' : 'glass-card rounded-3xl';
  const monthRef = summary.month ? new Date(Number(summary.month.slice(0, 4)), Number(summary.month.slice(5, 7)) - 1, 1) : new Date();
  const monthName = monthRef.toLocaleDateString('es-CO', { month: 'long' });
  const shown = expanded ? pending : pending.slice(0, VISIBLE);

  async function skip(c: Commitment) {
    if (!user || skipping) return;
    setSkipping(c.key);
    try {
      await skipCommitment(user.uid, skipEntry(summary.month || monthKey(new Date()), c.key));
    } catch (err) {
      console.error('Error skipping commitment:', err);
    } finally {
      setSkipping(null);
    }
  }

  return (
    <>
      <div className={`${card} p-4`}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
              <CalendarClock className="w-5 h-5 text-accent" />
            </div>
            <div className="min-w-0">
              <h3 className={`text-sm font-bold ${isTechTheme ? 'text-accent uppercase font-mono tracking-wide' : 'font-syne text-text-primary'}`}>
                Próximos compromisos
              </h3>
              <p className="text-xs text-text-muted">
                {pending.length
                  ? `${pending.length} por pagar en ${monthName}${paidCount ? ` · ${paidCount} ya pagados` : ''}`
                  : `Ya pagaste tus ${paidCount} compromisos de ${monthName}`}
              </p>
            </div>
          </div>
          {pendingTotal > 0 && (
            <div className="text-right shrink-0">
              <p className={`text-base font-bold text-orange-400 ${isTechTheme ? 'font-mono' : 'font-syne'}`}><AnimatedNumber value={pendingTotal} format={(n: number) => formatCurrency(n, currency)} /></p>
              <p className="text-[10px] text-text-muted">por pagar</p>
            </div>
          )}
        </div>

        {!pending.length ? (
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <CheckCircle2 className="w-4 h-4" /> Todo al día este mes.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {shown.map(c => {
              const late = c.exactDate && c.daysLeft < 0;
              const soon = c.daysLeft >= 0 && c.daysLeft <= 2;
              return (
                <li key={c.key} className={`flex items-center gap-2 ${isTechTheme ? 'bg-accent/5 border border-accent/15 rounded-none' : 'bg-white/5 rounded-2xl'}`}>
                  <button type="button" onClick={() => setPaying(c)}
                          className="flex-1 min-w-0 flex items-center gap-3 p-2.5 text-left active:scale-[0.99] transition-transform">
                    <CategoryIcon icon={findCatalogEntry(c.reminder?.merchant || '')?.icon || c.category} label={c.reminder?.merchant || c.category} className="w-8 h-8 text-lg flex items-center justify-center shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isTechTheme ? 'text-accent font-mono' : 'text-text-primary'}`}>{c.title}</p>
                      <p className={`text-[11px] ${late ? 'text-[var(--red)] font-semibold' : soon ? 'text-orange-400 font-semibold' : 'text-text-muted'}`}>
                        {commitmentWhen(c)}
                      </p>
                    </div>
                    <span className={`text-sm font-semibold shrink-0 ${c.amount ? 'text-text-primary' : 'text-text-muted'}`}>
                      {c.amount ? formatCurrency(c.amount, currency) : 'Sin valor'}
                    </span>
                  </button>
                  <button type="button" onClick={() => skip(c)} disabled={skipping === c.key}
                          title="No aplica este mes" aria-label={`Omitir ${c.title} este mes`}
                          className="p-2 mr-1 text-text-muted hover:text-text-primary disabled:opacity-40 shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {pending.length > VISIBLE && (
          <button type="button" onClick={() => setExpanded(e => !e)}
                  className="mt-2 w-full flex items-center justify-center gap-1 text-xs font-semibold text-accent py-1.5">
            {expanded ? 'Ver menos' : `Ver todos (${pending.length})`}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}

        {pending.length > 0 && (
          <p className="mt-2 text-[10px] text-text-muted leading-snug">
            Toca uno para registrarlo como pagado. El valor es el que pusiste en el recordatorio o, si no tiene, lo que pagaste el mes pasado.
          </p>
        )}
      </div>

      {paying?.reminder && (
        <MarkPaidDialog
          due={{ reminder: paying.reminder, dueDate: paying.dueDate, daysLeft: paying.daysLeft }}
          amount={paying.amount}
          onClose={() => { setPaying(null); onRefresh?.(); }}
        />
      )}
      {paying?.debt && (
        <AddDebtModal debtToEdit={paying.debt} initialAbono={paying.amount}
                      onClose={() => setPaying(null)} onSuccess={() => onRefresh?.()} />
      )}
      {paying && !paying.reminder && !paying.debt && (
        <AddExpenseModal
          initialType="gasto"
          initialVoiceParsed={{
            type: 'gasto', amount: paying.amount, category: paying.category,
            description: paying.title, isFixed: true, rawText: '',
          }}
          onClose={() => setPaying(null)}
          onSuccess={onRefresh}
        />
      )}
    </>
  );
}
