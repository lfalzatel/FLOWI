'use client';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2 } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { Goal, GoalPriority, addGoal, updateGoal } from '@/lib/firestore';
import { GOAL_EMOJIS, PRIORITY_LABEL } from '@/lib/goals';

// Montos con separador de miles mientras se escribe ("1.500.000")
export const formatAmountInput = (value: number | string) => {
  const digits = String(value).replace(/\D/g, '');
  return digits ? Number(digits).toLocaleString('es-CO') : '';
};
export const parseAmountInput = (value: string) => Number(value.replace(/\D/g, '')) || 0;

interface Props {
  goal?: Goal | null;
  onClose: () => void;
  onDelete?: (goal: Goal) => void;
}

export function GoalFormModal({ goal, onClose, onDelete }: Props) {
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  const { user } = useAuth();

  const [name, setName] = useState(goal?.name || '');
  const [emoji, setEmoji] = useState(goal?.emoji || '🎯');
  const [target, setTarget] = useState(goal ? formatAmountInput(goal.targetAmount) : '');
  const [saved, setSaved] = useState(goal ? formatAmountInput(goal.savedAmount) : '');
  const [priority, setPriority] = useState<GoalPriority>(goal?.priority || 'media');
  const [deadline, setDeadline] = useState(goal?.deadline || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const targetAmount = parseAmountInput(target);
  const canSave = name.trim().length > 0 && targetAmount > 0 && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !canSave) return;
    setLoading(true);
    setError('');
    const savedAmount = parseAmountInput(saved);
    try {
      if (goal?.id) {
        await updateGoal(goal.id, {
          name: name.trim(), emoji, targetAmount, savedAmount, priority,
          deadline: deadline || null,
          completedAt: savedAmount >= targetAmount ? (goal.completedAt || new Date().toISOString()) : null,
        });
      } else {
        await addGoal({
          userId: user.uid, name: name.trim(), emoji, targetAmount, savedAmount, priority,
          deadline: deadline || null,
          movements: savedAmount > 0 ? [{ amount: savedAmount, date: new Date().toISOString(), note: 'Saldo inicial' }] : [],
          completedAt: savedAmount >= targetAmount ? new Date().toISOString() : null,
        });
      }
      onClose();
    } catch (err: any) {
      console.error('Error saving goal:', err);
      setError(err?.code === 'permission-denied'
        ? 'La base de datos todavía no permite guardar metas. Hay que habilitar la colección "fl_goals" en las reglas de Firestore.'
        : 'No se pudo guardar la meta. Revisa tu conexión e inténtalo de nuevo.');
      setLoading(false);
    }
  }

  if (typeof document === 'undefined') return null;

  const labelClass = `${isTechTheme ? 'text-accent/70' : 'text-text-muted'} text-xs font-medium mb-1.5 block`;
  const inputClass = `w-full bg-glass border px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono' : 'border-glass-border rounded-xl focus:border-accent'}`;
  const chipClass = (active: boolean) => `flex-1 py-2 text-xs font-semibold border transition-all active:scale-95 ${isTechTheme ? 'rounded-none' : 'rounded-xl'} ${
    active ? 'bg-accent/15 border-accent text-accent' : 'border-glass-border text-text-secondary hover:text-text-primary hover:bg-glass'
  }`;

  return createPortal(
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${isTechTheme ? 'font-mono' : ''}`}>
      <div className={`absolute inset-0 ${theme === 'light' ? 'bg-black/10' : 'bg-black/40'}`} onClick={onClose} aria-hidden="true" />
      <div
        className={`w-full max-w-md relative z-10 animate-fade-in-up max-h-[88dvh] flex flex-col overflow-hidden glass-dropdown ${isTechTheme ? 'rounded-none border border-accent/50' : 'rounded-3xl'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`shrink-0 flex items-center justify-between gap-3 px-5 sm:px-6 pt-5 pb-3 ${isTechTheme ? 'border-b border-accent/20' : ''}`}>
          <h2 className={`${isTechTheme ? 'font-bold text-xl text-accent tracking-wide uppercase' : 'font-syne font-bold text-xl text-text-primary'}`}>
            {goal ? 'Editar meta' : 'Nueva meta'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className={`p-1 -mr-1 ${isTechTheme ? 'text-accent' : 'text-text-secondary hover:text-text-primary'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-6 pt-3 pb-5 space-y-5">
            <div>
              <label htmlFor="goal-name" className={labelClass}>¿Para qué estás ahorrando?</label>
              <div className="flex gap-2">
                <span className={`shrink-0 w-12 flex items-center justify-center text-2xl bg-glass border ${isTechTheme ? 'border-accent/30 rounded-none' : 'border-glass-border rounded-xl'}`}>{emoji}</span>
                <input id="goal-name" type="text" value={name} maxLength={40} onChange={(e) => setName(e.target.value)}
                       placeholder="Ej: Moto, viaje a Cartagena, fondo de emergencia" className={inputClass} required />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {GOAL_EMOJIS.map(e => (
                  <button key={e} type="button" onClick={() => setEmoji(e)} aria-label={`Ícono ${e}`}
                          className={`w-9 h-9 text-lg flex items-center justify-center border transition-all ${isTechTheme ? 'rounded-none' : 'rounded-lg'} ${emoji === e ? 'border-accent bg-accent/15' : 'border-transparent hover:bg-glass'}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="goal-target" className={labelClass}>Valor de la meta</label>
                <input id="goal-target" type="text" inputMode="numeric" placeholder="$ 0" value={target}
                       onChange={(e) => setTarget(formatAmountInput(e.target.value))} className={`${inputClass} font-bold`} required />
              </div>
              <div>
                <label htmlFor="goal-saved" className={labelClass}>Ya tengo ahorrado</label>
                <input id="goal-saved" type="text" inputMode="numeric" placeholder="$ 0" value={saved}
                       onChange={(e) => setSaved(formatAmountInput(e.target.value))} className={inputClass} />
              </div>
            </div>

            <div>
              <span className={labelClass}>Prioridad</span>
              <div className="flex gap-2">
                {(['alta', 'media', 'baja'] as GoalPriority[]).map(p => (
                  <button key={p} type="button" onClick={() => setPriority(p)} className={chipClass(priority === p)}>
                    {PRIORITY_LABEL[p]}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-text-muted mt-1.5">Las de prioridad alta reciben una parte mayor de lo que ahorras cada mes.</p>
            </div>

            <div>
              <label htmlFor="goal-deadline" className={labelClass}>¿Para cuándo la quieres? (opcional)</label>
              <div className="flex gap-2">
                <input id="goal-deadline" type="month" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputClass} />
                {deadline && (
                  <button type="button" onClick={() => setDeadline('')} className={`shrink-0 px-3 text-xs border ${isTechTheme ? 'rounded-none border-accent/30 text-accent' : 'rounded-xl border-glass-border text-text-secondary'}`}>
                    Quitar
                  </button>
                )}
              </div>
            </div>

            {error && <p className="text-xs text-[var(--red)] bg-red-500/10 border border-red-500/20 rounded-xl p-3">{error}</p>}

            {goal && onDelete && (
              <button type="button" onClick={() => onDelete(goal)}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-[var(--red)] border border-red-500/30 hover:bg-red-500/10 ${isTechTheme ? 'rounded-none uppercase' : 'rounded-xl'}`}>
                <Trash2 className="w-4 h-4" /> Eliminar meta
              </button>
            )}
          </div>

          <div className={`shrink-0 px-5 sm:px-6 pt-3 pb-4 border-t ${isTechTheme ? 'bg-deep border-accent/20' : 'bg-card border-glass-border'}`}>
            <button type="submit" disabled={!canSave}
                    className={`w-full py-3.5 font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${isTechTheme ? 'rounded-none bg-accent/20 border border-accent text-accent uppercase tracking-widest' : 'rounded-xl bg-accent text-white hover:bg-accent/90'}`}>
              {loading ? 'Guardando...' : goal ? 'Guardar cambios' : 'Crear meta'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
