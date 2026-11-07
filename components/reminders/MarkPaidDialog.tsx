'use client';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Receipt, X } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { AddExpenseModal } from '@/components/forms/AddExpenseModal';
import { markReminderPaid } from '@/lib/firestore';
import { ReminderDue, dateKey, dueLabel } from '@/lib/reminderDue';
import { askForNotifications } from '@/lib/notifPrompt';

interface Props {
  due: ReminderDue;
  amount?: number | null; // valor sugerido para el gasto (lo pagado el mes pasado)
  onClose: () => void;
}

// "Ya lo pagué": marca solo este vencimiento y, si quieres, abre el registro del gasto ya prellenado
export function MarkPaidDialog({ due, amount = null, onClose }: Props) {
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [registerExpense, setRegisterExpense] = useState(false);
  const { reminder, dueDate, daysLeft } = due;

  async function markPaid(withExpense: boolean) {
    if (!reminder.id || saving) return;
    // Con gasto: primero se abre el formulario y se marca como pagado solo al guardarlo.
    // Si se marcara antes, la tarjeta que abrió este diálogo (Tu siguiente acción o
    // Próximos compromisos) desaparece y se lleva el formulario sin dejar registrar el gasto.
    if (withExpense) { setRegisterExpense(true); return; }
    setSaving(true);
    setError('');
    try {
      await markReminderPaid(reminder.id, dateKey(dueDate));
      setTimeout(() => askForNotifications({ context: `el próximo pago de ${reminder.title}` }), 1200);
      onClose();
    } catch (err) {
      console.error('Error marking reminder as paid:', err);
      setError('No se pudo marcar como pagado. Revisa tu conexión e inténtalo de nuevo.');
      setSaving(false);
    }
  }

  if (typeof document === 'undefined') return null;

  if (registerExpense) {
    return (
      <AddExpenseModal
        initialType="gasto"
        initialVoiceParsed={{
          type: 'gasto', amount, category: reminder.category || '',
          description: reminder.title, isFixed: true, rawText: '',
        }}
        onClose={onClose}
        onSuccess={() => {
          if (!reminder.id) return;
          markReminderPaid(reminder.id, dateKey(dueDate))
            .then(() => setTimeout(() => askForNotifications({ context: `el próximo pago de ${reminder.title}` }), 1200))
            .catch(err => console.error('Error marking reminder as paid:', err));
        }}
      />
    );
  }

  const dueText = dueDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });

  return createPortal(
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${isTechTheme ? 'font-mono' : ''}`}>
      <div className={`absolute inset-0 ${theme === 'light' ? 'bg-black/10' : 'bg-black/40'}`} onClick={onClose} aria-hidden="true" />
      <div className={`w-full max-w-sm relative z-10 animate-fade-in-up glass-dropdown p-5 ${isTechTheme ? 'rounded-none border border-accent/50' : 'rounded-3xl'}`}
           onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-accent/15 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-accent" />
            </div>
            <div className="min-w-0">
              <h2 className={`font-bold truncate ${isTechTheme ? 'text-accent uppercase' : 'font-syne text-text-primary'}`}>{reminder.title}</h2>
              <p className={`text-xs ${daysLeft < 0 ? 'text-[var(--red)]' : 'text-text-muted'}`}>Vence el {dueText} · {dueLabel(daysLeft)}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="p-1 -mr-1 text-text-secondary hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-text-secondary mb-4">
          Lo marco como pagado solo por esta vez{reminder.type !== 'once' ? '; te vuelvo a avisar en el próximo vencimiento' : ''}.
        </p>

        {error && <p className="text-xs text-[var(--red)] mb-3">{error}</p>}

        <div className="space-y-2">
          <button type="button" onClick={() => markPaid(true)} disabled={saving}
                  className={`w-full flex items-center justify-center gap-2 py-3 font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${isTechTheme ? 'rounded-none bg-accent/20 border border-accent text-accent uppercase text-xs tracking-wider' : 'rounded-xl bg-accent text-white hover:bg-accent/90 text-sm'}`}>
            <Receipt className="w-4 h-4" /> Pagado y registrar el gasto
          </button>
          <button type="button" onClick={() => markPaid(false)} disabled={saving}
                  className={`w-full py-3 text-sm font-semibold border transition-all active:scale-[0.98] disabled:opacity-50 ${isTechTheme ? 'rounded-none border-accent/40 text-accent uppercase text-xs' : 'rounded-xl border-glass-border text-text-primary hover:bg-glass'}`}>
            {saving ? 'Guardando...' : 'Solo marcar como pagado'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
