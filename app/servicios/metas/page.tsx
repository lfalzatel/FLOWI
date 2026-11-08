'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Plus, Target, Pencil, PiggyBank, CalendarClock, TrendingUp, Trophy } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { useExpenses } from '@/hooks/useExpenses';
import { useGoals } from '@/hooks/useGoals';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { ConfirmDialog } from '@/components/layout/ConfirmDialog';
import { GoalFormModal } from '@/components/goals/GoalFormModal';
import { GoalMovementSheet } from '@/components/goals/GoalMovementSheet';
import { Goal, deleteGoal } from '@/lib/firestore';
import { formatCurrency } from '@/lib/format';
import {
  PRIORITY_LABEL, allocateCapacity, formatMonthYear, formatMonthsText,
  getSavingCapacity, goalProgress, isGoalDone, projectGoal,
} from '@/lib/goals';

export default function MetasPage() {
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { transactions } = useExpenses();
  const { goals, loading, error } = useGoals();
  const currency = profile?.currency || 'COP';

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [moving, setMoving] = useState<Goal | null>(null);
  const [deleting, setDeleting] = useState<Goal | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  const capacity = useMemo(() => getSavingCapacity(transactions), [transactions]);
  const shares = useMemo(() => allocateCapacity(goals, capacity.monthly), [goals, capacity.monthly]);

  const activeGoals = goals.filter(g => !isGoalDone(g));
  const doneGoals = goals.filter(isGoalDone);
  const totalSaved = goals.reduce((s, g) => s + g.savedAmount, 0);
  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);

  const card = isTechTheme ? 'bg-glass border border-accent/25 rounded-none' : 'glass-card rounded-3xl';
  const fmt = (n: number) => formatCurrency(n, currency);

  const openNew = () => { setEditing(null); setShowForm(true); };

  return (
    <div className="relative min-h-screen flex flex-col bg-deep">
      <Header />
      <main className={`relative flex-1 max-w-2xl mx-auto w-full p-4 pb-32 space-y-5 animate-fade-in-up ${isTechTheme ? 'font-mono' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/servicios" aria-label="Volver a Servicios" className={`p-2 -ml-2 bg-glass border ${isTechTheme ? 'border-accent/30 rounded-none text-accent' : 'border-glass-border rounded-full text-text-primary'}`}>
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <h1 className={`text-xl font-bold ${isTechTheme ? 'text-accent uppercase tracking-wider' : 'font-syne text-text-primary'}`}>Metas</h1>
          </div>
          {goals.length > 0 && (
            <button onClick={openNew}
                    className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold active:scale-95 transition-all ${isTechTheme ? 'rounded-none border border-accent text-accent bg-accent/10 uppercase text-xs' : `rounded-2xl bg-gradient-to-br from-accent to-accent-dim ${theme === 'light' ? 'text-white' : 'text-black'} shadow-lg shadow-accent/20`}`}>
              <Plus className="w-4 h-4" /> Nueva
            </button>
          )}
        </div>

        {error === 'permission-denied' && (
          <div className="p-4 text-sm rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-500">
            La base de datos todavía no permite leer metas. Hay que habilitar la colección <b>fl_goals</b> en las reglas de Firestore.
          </div>
        )}

        {/* Resumen y ritmo de ahorro */}
        <section className={`${card} p-5`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-xl bg-accent/15 flex items-center justify-center"><PiggyBank className="w-4 h-4 text-accent" /></div>
            <span className={`text-xs font-medium ${isTechTheme ? 'text-accent/70 uppercase tracking-wide' : 'text-text-secondary'}`}>Ahorrado en tus metas</span>
          </div>
          <p className={`font-bold text-[clamp(24px,8vw,34px)] leading-none text-accent ${isTechTheme ? '' : 'font-syne'}`}>{fmt(totalSaved)}</p>
          {totalTarget > 0 && <p className="text-xs text-text-muted mt-1">de {fmt(totalTarget)} en {goals.length} {goals.length === 1 ? 'meta' : 'metas'}</p>}

          <div className={`mt-4 pt-4 border-t ${isTechTheme ? 'border-accent/20' : 'border-glass-border'} flex items-start gap-2.5`}>
            <TrendingUp className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <p className="text-xs text-text-secondary leading-relaxed">
              {capacity.monthsUsed === 0
                ? 'Cuando tengas al menos un mes completo de ingresos y gastos registrados, te diré cuánto puedes ahorrar al mes y cuándo cumplirías cada meta.'
                : capacity.monthly > 0
                  ? <>Tu ritmo real de ahorro es de <b className="text-text-primary">{fmt(capacity.monthly)} al mes</b> (lo que te sobró en promedio {capacity.monthsUsed === 1 ? 'el mes pasado' : `en los últimos ${capacity.monthsUsed} meses`}). Lo reparto entre tus metas según su prioridad.</>
                  : <>En {capacity.monthsUsed === 1 ? 'el último mes' : `los últimos ${capacity.monthsUsed} meses`} gastaste más de lo que ingresó, así que a este ritmo no alcanzarías a ahorrar. Revisa tus gastos en <Link href="/servicios/presupuestos" className="text-accent underline">Presupuestos</Link>.</>}
            </p>
          </div>
        </section>

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" /></div>
        ) : goals.length === 0 ? (
          <section className={`${card} p-6 text-center`}>
            <div className={`w-14 h-14 mx-auto mb-3 flex items-center justify-center bg-accent/10 ${isTechTheme ? 'rounded-none border border-accent/40' : 'rounded-2xl'}`}>
              <Target className="w-7 h-7 text-accent" />
            </div>
            <h2 className={`font-bold text-lg mb-1 ${isTechTheme ? 'text-accent uppercase' : 'text-text-primary'}`}>¿Para qué quieres ahorrar?</h2>
            <p className="text-sm text-text-secondary mb-5">Una moto, un viaje, la prima del apartamento o un fondo para emergencias. Crea tu meta y te digo cuándo la lograrías.</p>
            <button onClick={openNew}
                    className={`inline-flex items-center gap-2 px-6 py-3 font-semibold active:scale-95 transition-all ${isTechTheme ? 'rounded-none border border-accent text-accent bg-accent/10 uppercase text-sm' : `rounded-xl bg-accent ${theme === 'light' ? 'text-white' : 'text-black'}`}`}>
              <Plus className="w-5 h-5" /> Crear mi primera meta
            </button>
          </section>
        ) : (
          <>
            <div className="space-y-3">
              {activeGoals.map(goal => {
                const share = shares.get(goal.id!) || 0;
                const p = projectGoal(goal, share);
                const pct = Math.round(goalProgress(goal) * 100);
                return (
                  <article key={goal.id} className={`${card} p-4`}>
                    <div className="flex items-start gap-3">
                      <div className={`shrink-0 w-11 h-11 flex items-center justify-center text-2xl bg-glass border ${isTechTheme ? 'rounded-none border-accent/30' : 'rounded-2xl border-glass-border'}`}>{goal.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-bold truncate ${isTechTheme ? 'text-accent uppercase text-sm' : 'text-text-primary'}`}>{goal.name}</h3>
                          <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 ${isTechTheme ? 'rounded-none' : 'rounded-full'} ${
                            goal.priority === 'alta' ? 'bg-rose-500/15 text-rose-400' : goal.priority === 'media' ? 'bg-amber-500/15 text-amber-500' : 'bg-sky-500/15 text-sky-400'
                          }`}>{PRIORITY_LABEL[goal.priority]}</span>
                        </div>
                        <p className="text-xs text-text-secondary mt-0.5">
                          <b className="text-text-primary">{fmt(goal.savedAmount)}</b> de {fmt(goal.targetAmount)}
                        </p>
                      </div>
                      <button onClick={() => { setEditing(goal); setShowForm(true); }} aria-label={`Editar ${goal.name}`}
                              className={`shrink-0 p-2 -mr-1 -mt-1 ${isTechTheme ? 'text-accent/70 hover:text-accent' : 'text-text-muted hover:text-text-primary'}`}>
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <div className={`flex-1 h-2.5 overflow-hidden bg-glass border border-glass-border ${isTechTheme ? 'rounded-none' : 'rounded-full'}`}
                           role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Progreso de ${goal.name}`}>
                        <div className={`h-full bg-gradient-to-r from-accent-dim to-accent transition-all duration-700 ${isTechTheme ? '' : 'rounded-full'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-bold text-accent w-9 text-right">{pct}%</span>
                    </div>

                    <div className="mt-3 space-y-1.5 text-[12px] text-text-secondary">
                      {p.etaDate && p.monthsAtPace !== null ? (
                        <p className="flex items-start gap-1.5"><TrendingUp className="w-3.5 h-3.5 mt-0.5 shrink-0 text-accent" />
                          <span>A tu ritmo ({fmt(Math.round(share))}/mes) la logras en <b className="text-text-primary">{formatMonthsText(p.monthsAtPace)}</b> · {formatMonthYear(p.etaDate)}</span>
                        </p>
                      ) : capacity.monthsUsed > 0 ? (
                        <p className="flex items-start gap-1.5"><TrendingUp className="w-3.5 h-3.5 mt-0.5 shrink-0 text-text-muted" />
                          <span>Con tu ritmo actual no hay sobrante para esta meta. Cada ahorro que registres la acerca.</span>
                        </p>
                      ) : null}
                      {goal.deadline && p.requiredPerMonth !== null && (
                        <p className={`flex items-start gap-1.5 ${p.onTrack ? '' : 'text-amber-500'}`}>
                          <CalendarClock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          <span>
                            {p.monthsToDeadline !== null && p.monthsToDeadline <= 0
                              ? <>La fecha que pusiste ya pasó; te faltan {fmt(p.remaining)}.</>
                              : <>Para {formatMonthYear(new Date(`${goal.deadline}-02`))} necesitas <b className={p.onTrack ? 'text-text-primary' : ''}>{fmt(p.requiredPerMonth)}/mes</b>{p.onTrack ? ' · vas a tiempo' : ' · a tu ritmo no alcanzas'}</>}
                          </span>
                        </p>
                      )}
                    </div>

                    {goal.linkedName ? (
                      <Link href="/servicios/inversiones"
                            className={`mt-4 w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] ${isTechTheme ? 'rounded-none border border-accent text-accent bg-accent/10 uppercase text-xs tracking-wider' : 'rounded-xl bg-accent/15 text-accent hover:bg-accent/25'}`}>
                        <PiggyBank className="w-4 h-4" /> Guardada en {goal.linkedName} · depositar
                      </Link>
                    ) : (
                      <button onClick={() => setMoving(goal)}
                              className={`mt-4 w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] ${isTechTheme ? 'rounded-none border border-accent text-accent bg-accent/10 uppercase text-xs tracking-wider' : 'rounded-xl bg-accent/15 text-accent hover:bg-accent/25'}`}>
                        <PiggyBank className="w-4 h-4" /> Registrar ahorro
                      </button>
                    )}
                  </article>
                );
              })}
            </div>

            {doneGoals.length > 0 && (
              <section>
                <h2 className={`text-xs font-bold uppercase tracking-wider mb-2 ${isTechTheme ? 'text-accent/70' : 'text-text-muted'}`}>Metas cumplidas</h2>
                <div className="space-y-2">
                  {doneGoals.map(goal => (
                    <button key={goal.id} onClick={() => setMoving(goal)}
                            className={`${card} w-full p-3.5 flex items-center gap-3 text-left`}>
                      <span className="text-2xl">{goal.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold truncate ${isTechTheme ? 'text-accent text-sm uppercase' : 'text-text-primary'}`}>{goal.name}</p>
                        <p className="text-xs text-text-muted">{fmt(goal.savedAmount)}{goal.completedAt ? ` · cumplida en ${formatMonthYear(new Date(goal.completedAt))}` : ''}</p>
                      </div>
                      <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
                    </button>
                  ))}
                </div>
              </section>
            )}

            <p className="text-[11px] text-text-muted text-center px-4">
              Los ahorros que registras aquí no cuentan como gastos; solo llevan la cuenta de lo que vas apartando.
            </p>
          </>
        )}
      </main>
      <BottomNav />

      {showForm && (
        <GoalFormModal
          goal={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onDelete={(g) => { setShowForm(false); setDeleting(g); }}
        />
      )}
      {moving && (
        <GoalMovementSheet goal={moving} suggested={shares.get(moving.id!) || 0} currency={currency} onClose={() => setMoving(null)} />
      )}
      <ConfirmDialog
        isOpen={!!deleting}
        title="Eliminar meta"
        message={deleting ? `¿Eliminar "${deleting.name}"? Se borra también su historial de ahorros.` : ''}
        confirmText="Eliminar"
        onConfirm={async () => { if (deleting?.id) await deleteGoal(deleting.id); setDeleting(null); setEditing(null); }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
