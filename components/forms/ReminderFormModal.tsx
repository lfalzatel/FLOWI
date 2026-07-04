'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '@/components/ThemeProvider';
import { X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { addReminder, updateReminder, Reminder } from '@/lib/firestore';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  reminder?: Reminder | null;
}

function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between cursor-pointer py-1 select-none">
      <span className="text-sm text-text-secondary">{label}</span>
      <div
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full transition-colors relative
                    ${checked ? 'bg-accent' : 'bg-white/10'}`}
      >
        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform
                         ${checked ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
      </div>
    </label>
  );
}

export function ReminderFormModal({ onClose, onSuccess, reminder }: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<Reminder['type']>('once');
  const [time, setTime] = useState('08:00');
  const [dayOfWeek, setDayOfWeek] = useState(1); // 1 = Lunes
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [budgetPercent, setBudgetPercent] = useState(80);
  const [sound, setSound] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(false);

  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    if (reminder) {
      setTitle(reminder.title);
      setDescription(reminder.description || '');
      setType(reminder.type);
      setTime(reminder.time);
      if (reminder.dayOfWeek !== undefined) setDayOfWeek(reminder.dayOfWeek);
      if (reminder.dayOfMonth !== undefined) setDayOfMonth(reminder.dayOfMonth);
      if (reminder.budgetPercent !== undefined) setBudgetPercent(reminder.budgetPercent);
      setSound(reminder.sound);
      setPushEnabled(reminder.pushEnabled);
      setInAppEnabled(reminder.inAppEnabled);
      setActive(reminder.active);
    }
  }, [reminder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;

    setLoading(true);
    try {
      const data: Omit<Reminder, 'id'> = {
        userId: user.uid,
        title: title.trim(),
        description: description.trim(),
        type,
        time,
        sound,
        pushEnabled,
        inAppEnabled,
        active,
      };

      if (type === 'weekly') data.dayOfWeek = dayOfWeek;
      if (type === 'monthly') data.dayOfMonth = dayOfMonth;
      if (type === 'budget_alert') data.budgetPercent = budgetPercent;

      if (reminder?.id) {
        await updateReminder(reminder.id, data);
      } else {
        await addReminder(data);
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving reminder:', error);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Card container */}
      <div className={`
        relative w-full max-w-md max-h-[90vh] overflow-y-auto z-10 p-6
        glass-card-strong border border-glass-border shadow-2xl animate-slide-down
        ${isTechTheme ? 'rounded-none border-accent/30 font-mono text-accent' : 'rounded-3xl'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-xl font-bold text-text-primary ${isTechTheme ? 'font-mono text-accent uppercase' : 'font-syne'}`}>
            {reminder ? 'Editar Recordatorio' : 'Nuevo Recordatorio'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg text-text-muted hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Título */}
          <div>
            <label className="block text-xs text-text-muted uppercase tracking-wider mb-1.5">Título del recordatorio</label>
            <input
              type="text"
              required
              placeholder="Ej: Pagar arriendo"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`
                w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent transition-all bg-white/5 border border-glass-border text-text-primary
                ${isTechTheme ? 'rounded-none font-mono text-accent placeholder-accent/40' : 'rounded-2xl'}
              `}
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs text-text-muted uppercase tracking-wider mb-1.5">Nota o Descripción (Opcional)</label>
            <textarea
              placeholder="Ej: Banco de Bogotá, cuenta corriente"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={`
                w-full px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent transition-all bg-white/5 border border-glass-border text-text-primary resize-none
                ${isTechTheme ? 'rounded-none font-mono text-accent placeholder-accent/40' : 'rounded-2xl'}
              `}
            />
          </div>

          {/* Tipo / Frecuencia */}
          <div>
            <label className="block text-xs text-text-muted uppercase tracking-wider mb-1.5">Frecuencia / Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as Reminder['type'])}
              className={`
                w-full px-3 py-2.5 text-sm focus:outline-none bg-deep border border-glass-border text-text-primary
                ${isTechTheme ? 'rounded-none font-mono text-accent' : 'rounded-2xl'}
              `}
            >
              <option value="once">Una vez</option>
              <option value="daily">Diario</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
              <option value="budget_alert">Alerta de Presupuesto</option>
            </select>
          </div>

          {/* Campos condicionales */}
          {type !== 'budget_alert' && (
            <div>
              <label className="block text-xs text-text-muted uppercase tracking-wider mb-1.5">Hora de notificación</label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={`
                  w-full px-3 py-2.5 text-sm focus:outline-none bg-white/5 border border-glass-border text-text-primary
                  ${isTechTheme ? 'rounded-none font-mono text-accent' : 'rounded-2xl'}
                `}
              />
            </div>
          )}

          {type === 'weekly' && (
            <div>
              <label className="block text-xs text-text-muted uppercase tracking-wider mb-1.5">Día de la semana</label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(Number(e.target.value))}
                className={`
                  w-full px-3 py-2.5 text-sm focus:outline-none bg-deep border border-glass-border text-text-primary
                  ${isTechTheme ? 'rounded-none font-mono text-accent' : 'rounded-2xl'}
                `}
              >
                <option value={1}>Lunes</option>
                <option value={2}>Martes</option>
                <option value={3}>Miércoles</option>
                <option value={4}>Jueves</option>
                <option value={5}>Viernes</option>
                <option value={6}>Sábado</option>
                <option value={0}>Domingo</option>
              </select>
            </div>
          )}

          {type === 'monthly' && (
            <div>
              <label className="block text-xs text-text-muted uppercase tracking-wider mb-1.5">Día del mes (1 - 31)</label>
              <input
                type="number"
                min={1}
                max={31}
                required
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Math.max(1, Math.min(31, Number(e.target.value))))}
                className={`
                  w-full px-3 py-2.5 text-sm focus:outline-none bg-white/5 border border-glass-border text-text-primary
                  ${isTechTheme ? 'rounded-none font-mono text-accent' : 'rounded-2xl'}
                `}
              />
            </div>
          )}

          {type === 'budget_alert' && (
            <div>
              <label className="block text-xs text-text-muted uppercase tracking-wider mb-1.5">
                % del presupuesto mensual: {budgetPercent}%
              </label>
              <input
                type="range"
                min={50}
                max={100}
                value={budgetPercent}
                onChange={(e) => setBudgetPercent(Number(e.target.value))}
                className="w-full accent-accent bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          )}

          {/* Toggles */}
          <div className="border-t border-glass-border/40 pt-3 space-y-2">
            <ToggleSwitch
              label="Notificación Push (Segundo plano)"
              checked={pushEnabled}
              onChange={setPushEnabled}
            />
            <ToggleSwitch
              label="Notificación In-App (Toast)"
              checked={inAppEnabled}
              onChange={setInAppEnabled}
            />
            <ToggleSwitch
              label="Efecto de Sonido"
              checked={sound}
              onChange={setSound}
            />
            <ToggleSwitch
              label="Recordatorio Activo"
              checked={active}
              onChange={setActive}
            />
          </div>

          {/* Action button */}
          <button
            type="submit"
            disabled={loading}
            className={`
              w-full flex items-center justify-center py-3 bg-gradient-to-br from-accent to-accent-dim
              ${theme === 'light' ? 'text-white' : 'text-black'}
              font-semibold text-sm shadow-lg shadow-accent/20 transition-all hover:opacity-90 active:scale-[0.98] mt-6
              ${isTechTheme ? 'rounded-none font-mono uppercase tracking-widest' : 'rounded-2xl'}
            `}
          >
            {loading ? 'Guardando...' : reminder ? 'Actualizar Recordatorio' : 'Crear Recordatorio'}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
