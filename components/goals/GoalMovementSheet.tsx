'use client';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useTheme } from '@/components/ThemeProvider';
import { Goal, addGoalMovement } from '@/lib/firestore';
import { formatCurrency } from '@/lib/format';
import { formatAmountInput, parseAmountInput } from './GoalFormModal';

interface Props {
  goal: Goal;
  suggested?: number; // lo que le toca a esta meta cada mes según tu ritmo
  currency?: string;
  onClose: () => void;
}

export function GoalMovementSheet({ goal, suggested = 0, currency = 'COP', onClose }: Props) {
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  const [mode, setMode] = useState<'ahorro' | 'retiro'>('ahorro');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const remaining = Math.max(0, goal.targetAmount - goal.savedAmount);
  const value = parseAmountInput(amount);
  const tooMuch = mode === 'retiro' && value > goal.savedAmount;

  // Sugerencias rápidas: lo que te toca al mes, lo que falta y montos redondos
  const roundedSuggested = suggested > 0 ? Math.max(1000, Math.round(suggested / 1000) * 1000) : 0;
  const quick = mode === 'ahorro'
    ? Array.from(new Set([roundedSuggested, 50000, 100000, 200000, remaining].filter(v => v > 0 && v <= Math.max(remaining, 1)))).sort((a, b) => a - b).slice(0, 5)
    : Array.from(new Set([50000, 100000, goal.savedAmount].filter(v => v > 0 && v <= goal.savedAmount))).sort((a, b) => a - b);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value || tooMuch || loading) return;
    setLoading(true);
    setError('');
    try {
      const result = await addGoalMovement(goal, mode === 'ahorro' ? value : -value, note.trim() || undefined);
      if (result?.reached && goal.savedAmount < goal.targetAmount && localStorage.getItem('anim_confetti_enabled') !== 'false') {
        confetti({ particleCount: 140, spread: 80, origin: { y: 0.7 } });
      }
      onClose();
    } catch (err: any) {
      console.error('Error saving goal movement:', err);
      setError('No se pudo registrar. Revisa tu conexión e inténtalo de nuevo.');
      setLoading(false);
    }
  }

  if (typeof document === 'undefined') return null;

  const tabClass = (active: boolean) => `flex-1 py-2 text-sm font-bold transition-all ${isTechTheme ? 'rounded-none uppercase' : 'rounded-lg'} ${
    active ? `bg-accent ${theme === 'light' ? 'text-white' : 'text-black'} shadow-md` : isTechTheme ? 'text-accent' : 'text-text-secondary'
  }`;

  return createPortal(
    <div className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 ${isTechTheme ? 'font-mono' : ''}`}>
      <div className={`absolute inset-0 ${theme === 'light' ? 'bg-black/10' : 'bg-black/40'}`} onClick={onClose} aria-hidden="true" />
      <div
        className={`w-full max-w-md relative z-10 animate-fade-in-up max-h-[92dvh] flex flex-col overflow-hidden glass-dropdown ${isTechTheme ? 'rounded-none border border-accent/50' : 'rounded-t-3xl sm:rounded-3xl'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-center justify-between gap-3 px-5 pt-5 pb-3">
          <h2 className={`truncate ${isTechTheme ? 'font-bold text-lg text-accent uppercase' : 'font-syne font-bold text-lg text-text-primary'}`}>
            {goal.emoji} {goal.name}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className={`p-1 -mr-1 ${isTechTheme ? 'text-accent' : 'text-text-secondary hover:text-text-primary'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pb-5 space-y-4">
            <div className={`flex p-1 bg-glass border border-glass-border ${isTechTheme ? 'rounded-none' : 'rounded-xl'}`}>
              <button type="button" onClick={() => { setMode('ahorro'); setAmount(''); }} className={tabClass(mode === 'ahorro')}>Ahorré</button>
              <button type="button" onClick={() => { setMode('retiro'); setAmount(''); }} className={tabClass(mode === 'retiro')} disabled={goal.savedAmount <= 0}>Retiré</button>
            </div>

            <p className="text-xs text-text-secondary">
              Llevas <b className="text-text-primary">{formatCurrency(goal.savedAmount, currency)}</b>
              {remaining > 0 ? <> · te faltan <b className="text-text-primary">{formatCurrency(remaining, currency)}</b></> : <> · ¡meta cumplida!</>}
            </p>

            <div>
              <label htmlFor="goal-move-amount" className={`${isTechTheme ? 'text-accent/70' : 'text-text-muted'} text-xs font-medium mb-1.5 block`}>
                {mode === 'ahorro' ? '¿Cuánto apartaste?' : '¿Cuánto sacaste?'}
              </label>
              <div className="relative">
                <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold ${isTechTheme ? 'text-accent/70' : 'text-text-secondary'}`}>$</span>
                <input id="goal-move-amount" type="text" inputMode="numeric" placeholder="0" autoFocus value={amount}
                       onChange={(e) => setAmount(formatAmountInput(e.target.value))}
                       className={`w-full bg-glass border py-3 pl-10 pr-4 text-3xl font-bold text-text-primary placeholder-text-muted focus:outline-none ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent' : 'border-glass-border rounded-xl focus:border-accent'}`} />
              </div>
              {tooMuch && <p className="text-[11px] text-[var(--red)] mt-1.5">No puedes retirar más de lo que llevas ahorrado.</p>}
            </div>

            {quick.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {quick.map(q => (
                  <button key={q} type="button" onClick={() => setAmount(formatAmountInput(q))}
                          className={`px-3 py-1.5 text-xs font-medium border transition-all active:scale-95 ${isTechTheme ? 'rounded-none' : 'rounded-full'} ${value === q ? 'bg-accent/15 border-accent text-accent' : 'border-glass-border text-text-secondary hover:bg-glass'}`}>
                    {formatCurrency(q, currency)}
                    {mode === 'ahorro' && q === roundedSuggested && q !== remaining ? ' · tu cuota' : ''}
                    {mode === 'ahorro' && q === remaining ? ' · lo que falta' : ''}
                  </button>
                ))}
              </div>
            )}

            <input type="text" value={note} maxLength={60} onChange={(e) => setNote(e.target.value)} placeholder="Nota (opcional): prima, quincena, CDT…"
                   className={`w-full bg-glass border px-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none ${isTechTheme ? 'border-accent/30 rounded-none' : 'border-glass-border rounded-xl focus:border-accent'}`} />

            {error && <p className="text-xs text-[var(--red)]">{error}</p>}
          </div>

          <div className={`shrink-0 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t ${isTechTheme ? 'bg-deep border-accent/20' : 'bg-card border-glass-border'}`}>
            <button type="submit" disabled={!value || tooMuch || loading}
                    className={`w-full py-3.5 font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${isTechTheme ? 'rounded-none bg-accent/20 border border-accent text-accent uppercase tracking-widest' : 'rounded-xl bg-accent text-white hover:bg-accent/90'}`}>
              {loading ? 'Guardando...' : mode === 'ahorro' ? 'Registrar ahorro' : 'Registrar retiro'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
