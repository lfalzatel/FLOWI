'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import { ArrowDownRight, ArrowUpRight, CalendarCheck2, ChevronRight, X } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { useGoals } from '@/hooks/useGoals';
import { CategoryIcon } from '@/components/CategoryIcon';
import { formatAmountInput, parseAmountInput } from '@/components/goals/GoalFormModal';
import { Transaction, addGoalMovement, closeMonth } from '@/lib/firestore';
import { formatCurrency } from '@/lib/format';
import { isGoalDone } from '@/lib/goals';
import { MonthReview, getMonthReview, monthLabel } from '@/lib/monthClose';

interface Props {
  month: string;              // mes por cerrar (YYYY-MM)
  transactions: Transaction[];
  pendingCommitments: number; // del mes que empieza
  pendingCount: number;
  currency?: string;
}

// Invitación en Inicio durante los primeros días del mes: "Cierra octubre"
export function MonthCloseCard({ month, transactions, pendingCommitments, pendingCount, currency = 'COP' }: Props) {
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const label = monthLabel(month);

  async function skip() {
    if (user) await closeMonth(user.uid, month).catch(err => console.error('Error closing month:', err));
  }

  return (
    <>
      <div className={`flex items-center gap-2 ${isTechTheme ? 'bg-accent/10 border border-accent/40 rounded-none' : 'rounded-3xl bg-gradient-to-r from-accent/15 to-accent/5 border border-accent/25'}`}>
        <button type="button" onClick={() => setOpen(true)} className="flex-1 min-w-0 flex items-center gap-3 p-4 text-left">
          <div className="w-10 h-10 rounded-2xl bg-accent/20 flex items-center justify-center shrink-0">
            <CalendarCheck2 className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold ${isTechTheme ? 'text-accent uppercase font-mono' : 'font-syne text-text-primary'}`}>
              Cierra {label}
            </p>
            <p className="text-xs text-text-secondary">Revisa cómo te fue y empieza el mes en orden (2 minutos)</p>
          </div>
          <ChevronRight className="w-4 h-4 text-accent shrink-0" />
        </button>
        <button type="button" onClick={skip} title="Omitir este cierre" aria-label={`Omitir el cierre de ${label}`}
                className="p-2 mr-2 text-text-muted hover:text-text-primary shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      {open && (
        <MonthCloseModal review={getMonthReview(transactions, month)} pendingCommitments={pendingCommitments}
                         pendingCount={pendingCount} currency={currency} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function MonthCloseModal({ review, pendingCommitments, pendingCount, currency, onClose }: {
  review: MonthReview; pendingCommitments: number; pendingCount: number; currency: string; onClose: () => void;
}) {
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  const { user } = useAuth();
  const { goals } = useGoals();
  const activeGoals = goals.filter(g => !isGoalDone(g));
  const [step, setStep] = useState(0);
  const [goalId, setGoalId] = useState<string>('');
  const [amount, setAmount] = useState(review.result > 0 ? formatAmountInput(Math.round(review.result)) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedNote, setSavedNote] = useState('');
  const f = (n: number) => formatCurrency(n, currency);
  const nextLabel = new Date().toLocaleDateString('es-CO', { month: 'long' });
  const surplus = review.result > 0;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);
  useEffect(() => {
    if (!goalId && activeGoals[0]?.id) setGoalId(activeGoals[0].id);
  }, [activeGoals, goalId]);

  async function saveToGoal() {
    const goal = activeGoals.find(g => g.id === goalId);
    const value = parseAmountInput(amount);
    if (!goal || !value || saving) return;
    setSaving(true);
    setError('');
    try {
      await addGoalMovement(goal, value, `Cierre de ${review.label}`);
      setSavedNote(`Guardaste ${f(value)} en ${goal.emoji} ${goal.name}.`);
      setStep(2);
    } catch (err) {
      console.error('Error saving to goal:', err);
      setError('No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  async function finish() {
    if (!user || saving) return;
    setSaving(true);
    try {
      await closeMonth(user.uid, review.month);
      if (localStorage.getItem('anim_confetti_enabled') !== 'false') confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 } });
      onClose();
    } catch (err) {
      console.error('Error closing month:', err);
      setError('No se pudo cerrar el mes. Revisa tu conexión e inténtalo de nuevo.');
      setSaving(false);
    }
  }

  if (typeof document === 'undefined') return null;

  const diffPrev = review.prevGastos ? (review.gastos - review.prevGastos) / review.prevGastos : null;
  const primary = `w-full py-3 font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${isTechTheme ? 'rounded-none bg-accent/20 border border-accent text-accent uppercase text-xs tracking-wider' : 'rounded-xl bg-accent text-white hover:bg-accent/90 text-sm'}`;
  const secondary = `w-full py-3 text-sm font-semibold border transition-all active:scale-[0.98] ${isTechTheme ? 'rounded-none border-accent/40 text-accent uppercase text-xs' : 'rounded-xl border-glass-border text-text-primary hover:bg-glass'}`;

  return createPortal(
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${isTechTheme ? 'font-mono' : ''}`}>
      <div className={`absolute inset-0 ${theme === 'light' ? 'bg-black/20 backdrop-blur-xs' : 'bg-black/60 backdrop-blur-sm'}`} onClick={onClose} aria-hidden="true" />
      <div className={`w-full max-w-md relative z-10 animate-fade-in-up max-h-[88dvh] overflow-y-auto p-5 sm:p-6 glass-dropdown ${isTechTheme ? 'rounded-none border border-accent/50 bg-deep' : 'rounded-3xl'}`}
           onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Paso {step + 1} de 3</p>
            <h3 className={`font-bold ${isTechTheme ? 'text-accent uppercase' : 'font-syne text-lg text-text-primary'}`}>
              {step === 0 ? `Así te fue en ${review.label}` : step === 1 ? (surplus ? 'Lo que te sobró' : 'Para el próximo mes') : `Listo para ${nextLabel}`}
            </h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="p-1 text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex gap-1.5 mb-5">
          {[0, 1, 2].map(i => <div key={i} className={`h-1 flex-1 ${isTechTheme ? 'rounded-none' : 'rounded-full'} ${i <= step ? 'bg-accent' : 'bg-white/10'}`} />)}
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <div className={`p-4 ${isTechTheme ? 'rounded-none' : 'rounded-2xl'} ${surplus ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
              <p className={`text-xs font-bold uppercase tracking-wider ${surplus ? 'text-emerald-400' : 'text-red-400'}`}>
                {review.ingresos === 0 ? 'Sin ingresos registrados' : surplus ? 'Te sobró' : 'Te faltó'}
              </p>
              <p className={`text-3xl font-bold mt-1 ${surplus ? 'text-emerald-400' : 'text-red-400'} ${isTechTheme ? '' : 'font-syne'}`}>{f(Math.abs(review.result))}</p>
              <p className="text-xs text-text-secondary mt-1">
                Entraron {f(review.ingresos)} y gastaste {f(review.gastos)}.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-white/5 border border-glass-border">
                <p className="text-[10px] text-text-muted">Gastos fijos</p>
                <p className="text-sm font-bold text-text-primary">{f(review.fijos)}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-glass-border">
                <p className="text-[10px] text-text-muted">Gastos del día a día</p>
                <p className="text-sm font-bold text-text-primary">{f(review.variables)}</p>
              </div>
            </div>

            {diffPrev !== null && Math.abs(diffPrev) >= 0.01 && (
              <p className={`text-xs flex items-center gap-1.5 ${diffPrev > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                {diffPrev > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                Gastaste {Math.round(Math.abs(diffPrev) * 100)}% {diffPrev > 0 ? 'más' : 'menos'} que el mes anterior.
              </p>
            )}

            {review.topCategories.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">En lo que más gastaste</p>
                {review.topCategories.map(c => (
                  <div key={c.category} className="flex items-center gap-3 py-1.5">
                    <CategoryIcon icon={c.category} label={c.category} className="w-7 h-7 text-base flex items-center justify-center shrink-0" />
                    <span className="flex-1 text-sm text-text-secondary truncate">{c.category}</span>
                    <span className="text-sm font-semibold text-text-primary">{f(c.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            <button type="button" onClick={() => setStep(1)} className={primary}>Seguir</button>
          </div>
        )}

        {step === 1 && surplus && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary leading-relaxed">
              Te sobraron <strong>{f(review.result)}</strong>. Si los apartas en una meta, no se te van en el mes nuevo.
            </p>
            {activeGoals.length === 0 ? (
              <>
                <p className="text-sm text-text-secondary">Aún no tienes metas de ahorro activas.</p>
                <Link href="/servicios/metas" onClick={onClose} className={`${primary} flex items-center justify-center gap-1`}>
                  Crear una meta <ChevronRight className="w-4 h-4" />
                </Link>
                <button type="button" onClick={() => setStep(2)} className={secondary}>Ahora no</button>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  {activeGoals.map(g => (
                    <button key={g.id} type="button" onClick={() => setGoalId(g.id!)}
                            className={`w-full flex items-center gap-3 p-3 text-left border transition-all ${isTechTheme ? 'rounded-none' : 'rounded-xl'} ${goalId === g.id ? 'border-accent bg-accent/10' : 'border-glass-border bg-white/5'}`}>
                      <span className="text-xl">{g.emoji}</span>
                      <span className="flex-1 min-w-0 text-sm font-medium text-text-primary truncate">{g.name}</span>
                      <span className="text-[11px] text-text-muted shrink-0">faltan {f(Math.max(0, g.targetAmount - g.savedAmount))}</span>
                    </button>
                  ))}
                </div>
                <label className="block">
                  <span className="text-xs text-text-muted">¿Cuánto apartas?</span>
                  <div className={`mt-1 flex items-center gap-2 px-3 py-2.5 border border-glass-border bg-white/5 ${isTechTheme ? 'rounded-none' : 'rounded-xl'}`}>
                    <span className="text-accent font-bold">$</span>
                    <input inputMode="numeric" value={amount} onChange={(e) => setAmount(formatAmountInput(e.target.value))}
                           className="flex-1 min-w-0 bg-transparent outline-none text-text-primary font-bold" />
                  </div>
                </label>
                <p className="text-[11px] text-text-muted -mt-2">Solo queda anotado en tu meta; no se registra como gasto.</p>
                {error && <p className="text-xs text-[var(--red)]">{error}</p>}
                <button type="button" onClick={saveToGoal} disabled={saving || !parseAmountInput(amount) || !goalId} className={primary}>
                  {saving ? 'Guardando...' : 'Guardar en la meta'}
                </button>
                <button type="button" onClick={() => setStep(2)} className={secondary}>Ahora no</button>
              </>
            )}
          </div>
        )}

        {step === 1 && !surplus && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary leading-relaxed">
              {review.ingresos === 0
                ? `No registraste ingresos en ${review.label}, así que no puedo saber si te sobró. Este mes, anota lo que te entre para tener la foto completa.`
                : `Este mes salió más de lo que entró. No pasa nada: lo importante es verlo a tiempo.`}
            </p>
            {review.topCategories[0] && review.ingresos > 0 && (
              <p className="text-sm text-text-secondary leading-relaxed">
                💡 Lo que más pesó fue <strong>{review.topCategories[0].category}</strong> ({f(review.topCategories[0].amount)}).
                Si le bajas un poco este mes, se nota.
              </p>
            )}
            <button type="button" onClick={() => setStep(2)} className={primary}>Seguir</button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {savedNote && <p className="text-sm text-emerald-400">✓ {savedNote}</p>}
            <p className="text-sm text-text-secondary leading-relaxed">
              {pendingCount > 0
                ? <>En {nextLabel} tienes <strong>{pendingCount} {pendingCount === 1 ? 'pago fijo pendiente' : 'pagos fijos pendientes'}</strong> por {f(pendingCommitments)}. Los verás en <strong>Próximos compromisos</strong>, y tu cuota de cada día ya los tiene en cuenta.</>
                : <>Ya pagaste tus compromisos de {nextLabel}. Tu cuota de cada día te dirá cuánto puedes gastar.</>}
            </p>
            <p className="text-sm text-text-secondary leading-relaxed">
              Recuerda registrar tus ingresos de {nextLabel} apenas te lleguen, así los cálculos salen bien desde el principio.
            </p>
            {error && <p className="text-xs text-[var(--red)]">{error}</p>}
            <button type="button" onClick={finish} disabled={saving} className={primary}>
              {saving ? 'Cerrando...' : `Cerrar ${review.label}`}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
