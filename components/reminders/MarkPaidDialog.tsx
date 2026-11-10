'use client';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarCheck, CheckCircle2, Receipt, Trash2, X } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { AddExpenseModal } from '@/components/forms/AddExpenseModal';
import { deleteReminder, markReminderPaid } from '@/lib/firestore';
import { ReminderDue, dateKey, dueLabel, eventDueLabel, isPaymentReminder } from '@/lib/reminderDue';
import { askForNotifications } from '@/lib/notifPrompt';

interface Props {
  due: ReminderDue;
  amount?: number | null; // valor sugerido para el gasto (lo pagado el mes pasado)
  onClose: () => void;
}

// "Ya lo pagué" (pagos) o "Listo" (eventos y tareas): marca solo esta vez; en pagos, si quieres, abre el
// registro del gasto ya prellenado. También deja eliminar el recordatorio si ya no se necesita.
export function MarkPaidDialog({ due, amount = null, onClose }: Props) {
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [registerExpense, setRegisterExpense] = useState(false);
  const { reminder, dueDate, daysLeft } = due;
  const isPayment = isPaymentReminder(reminder);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function remove() {
    if (!reminder.id || saving) return;
    setSaving(true);
    setError('');
    try {
      await deleteReminder(reminder.id);
      onClose();
    } catch (err) {
      console.error('Error deleting reminder:', err);
      setError('No se pudo eliminar. Revisa tu conexión e inténtalo de nuevo.');
      setSaving(false);
    }
  }

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
      if (isPayment) setTimeout(() => askForNotifications({ context: `el próximo pago de ${reminder.title}` }), 1200);
      onClose();
    } catch (err) {
      console.error('Error marking reminder as paid:', err);
      setError(`No se pudo marcar como ${isPayment ? 'pagado' : 'hecho'}. Revisa tu conexión e inténtalo de nuevo.`);
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
              {isPayment ? <CheckCircle2 className="w-5 h-5 text-accent" /> : <CalendarCheck className="w-5 h-5 text-accent" />}
            </div>
            <div className="min-w-0">
              <h2 className={`font-bold truncate ${isTechTheme ? 'text-accent uppercase' : 'font-syne text-text-primary'}`}>{reminder.title}</h2>
              <p className={`text-xs ${daysLeft < 0 ? 'text-[var(--red)]' : 'text-text-muted'}`}>{isPayment ? `Vence el ${dueText} · ${dueLabel(daysLeft)}` : `${dueText} · ${eventDueLabel(daysLeft)}`}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="p-1 -mr-1 text-text-secondary hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-text-secondary mb-4">
          {confirmDelete
            ? `¿Eliminar "${reminder.title}"? Ya no te volveré a avisar${reminder.type !== 'once' ? ' en ninguna fecha' : ''}. No se puede deshacer.`
            : isPayment
              ? `Lo marco como pagado solo por esta vez${reminder.type !== 'once' ? '; te vuelvo a avisar en el próximo vencimiento' : ''}.`
              : reminder.type !== 'once'
                ? 'Lo marco como hecho por esta vez; te vuelvo a avisar en la próxima fecha.'
                : '¿Ya pasó o está en curso? Márcalo como hecho y deja de aparecer.'}
        </p>

        {error && <p className="text-xs text-[var(--red)] mb-3">{error}</p>}

        {confirmDelete ? (
        <div className="space-y-2">
          <button type="button" onClick={remove} disabled={saving}
                  className={`w-full flex items-center justify-center gap-2 py-3 font-bold transition-all active:scale-[0.98] disabled:opacity-50 bg-red-500 text-white ${isTechTheme ? 'rounded-none uppercase text-xs tracking-wider' : 'rounded-xl text-sm'}`}>
            <Trash2 className="w-4 h-4" /> {saving ? 'Eliminando...' : 'Sí, eliminar'}
          </button>
          <button type="button" onClick={() => setConfirmDelete(false)} disabled={saving}
                  className={`w-full py-3 text-sm font-semibold border border-glass-border text-text-primary hover:bg-glass ${isTechTheme ? 'rounded-none uppercase text-xs' : 'rounded-xl'}`}>
            No, volver
          </button>
        </div>
        ) : (
        <div className="space-y-2">
          {!isPayment ? (
            <button type="button" onClick={() => markPaid(false)} disabled={saving}
                    className={`w-full flex items-center justify-center gap-2 py-3 font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${isTechTheme ? 'rounded-none bg-accent/20 border border-accent text-accent uppercase text-xs tracking-wider' : 'rounded-xl bg-accent text-white hover:bg-accent/90 text-sm'}`}>
              <CheckCircle2 className="w-4 h-4" /> {saving ? 'Guardando...' : 'Marcar como hecho'}
            </button>
          ) : (<>
          <button type="button" onClick={() => markPaid(true)} disabled={saving}
                  className={`w-full flex items-center justify-center gap-2 py-3 font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${isTechTheme ? 'rounded-none bg-accent/20 border border-accent text-accent uppercase text-xs tracking-wider' : 'rounded-xl bg-accent text-white hover:bg-accent/90 text-sm'}`}>
            <Receipt className="w-4 h-4" /> Pagado y registrar el gasto
          </button>
          <button type="button" onClick={() => markPaid(false)} disabled={saving}
                  className={`w-full py-3 text-sm font-semibold border transition-all active:scale-[0.98] disabled:opacity-50 ${isTechTheme ? 'rounded-none border-accent/40 text-accent uppercase text-xs' : 'rounded-xl border-glass-border text-text-primary hover:bg-glass'}`}>
            {saving ? 'Guardando...' : 'Solo marcar como pagado'}
          </button>
          </>)}
          <button type="button" onClick={() => setConfirmDelete(true)} disabled={saving}
                  className="w-full flex items-center justify-center gap-1.5 pt-2 text-xs text-text-muted hover:text-[var(--red)]">
            <Trash2 className="w-3.5 h-3.5" /> Eliminar recordatorio
          </button>
        </div>
        )}
      </div>
    </div>,
    document.body
  );
}
