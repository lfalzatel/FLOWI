'use client';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '@/components/ThemeProvider';
import { X, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { addReminder, updateReminder, Reminder, ReminderAlert } from '@/lib/firestore';
import { CategoryIcon } from '@/components/CategoryIcon';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  reminder?: Reminder | null;
}

function ToggleSwitch({ checked, onChange, label, theme }: { checked: boolean; onChange: (v: boolean) => void; label: string, theme: string }) {
  return (
    <label className="flex items-center justify-between cursor-pointer py-1 select-none">
      <span className="text-sm text-text-secondary">{label}</span>
      <div
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full transition-colors relative border
                    ${checked ? 'bg-accent border-accent' : (theme === 'light' ? 'bg-gray-200 border-gray-300' : 'bg-white/10 border-transparent')}`}
      >
        <div className={`absolute top-[1px] w-5 h-5 rounded-full bg-white transition-transform shadow-sm
                         ${checked ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
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
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('');
  const [budgetPercent, setBudgetPercent] = useState(80);
  const [alerts, setAlerts] = useState<ReminderAlert[]>([]);

  const { allCategories } = useCategories();
  const [sound, setSound] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  const neonClass = theme === 'cyberpunk' 
    ? 'border-[#00FF41] shadow-[0_0_15px_rgba(0,255,65,0.5)]' 
    : theme === 'kiloCode' 
      ? 'border-[#F0DB4F] shadow-[0_0_15px_rgba(240,219,79,0.5)]' 
      : isTechTheme ? 'border-accent/30' : '';

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
      if (reminder.date !== undefined) setDate(reminder.date);
      if (reminder.category !== undefined) setCategory(reminder.category);
      if (reminder.budgetPercent !== undefined) setBudgetPercent(reminder.budgetPercent);
      if (reminder.alerts) setAlerts(reminder.alerts);
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
        alerts,
      };

      if (category.trim()) data.category = category.trim();

      if (type === 'once' && date.trim()) data.date = date;
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

  const addAlert = () => {
    setAlerts([...alerts, { id: Math.random().toString(36).substring(7), value: 10, unit: 'minutes' }]);
  };

  const removeAlert = (id: string) => {
    setAlerts(alerts.filter(a => a.id !== id));
  };

  const updateAlert = (id: string, field: keyof ReminderAlert, value: any) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const selectedCategoryData = allCategories.find(c => c.label === category);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Card container */}
      <div className={`
        relative w-full max-w-md max-h-[90vh] overflow-y-auto z-10 p-6
        glass-card-strong border shadow-2xl animate-slide-down
        ${isTechTheme ? `rounded-none font-mono text-accent ${neonClass}` : 'rounded-3xl border-glass-border'}
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
                w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent transition-all bg-glass border border-glass-border text-text-primary
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
                w-full px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent transition-all bg-glass border border-glass-border text-text-primary resize-none
                ${isTechTheme ? 'rounded-none font-mono text-accent placeholder-accent/40' : 'rounded-2xl'}
              `}
            />
          </div>

          {/* Categoría Personalizada */}
          <div className="relative">
            <label className="block text-xs text-text-muted uppercase tracking-wider mb-1.5">Categoría (Opcional)</label>
            <div 
              onClick={() => setIsCategoryOpen(!isCategoryOpen)}
              className={`
                w-full px-3 py-2.5 text-sm flex items-center justify-between cursor-pointer bg-deep border border-glass-border text-text-primary
                ${isTechTheme ? 'rounded-none font-mono text-accent' : 'rounded-2xl'}
              `}
            >
              {category && selectedCategoryData ? (
                <div className="flex items-center gap-2">
                  <CategoryIcon icon={selectedCategoryData.icon} label={selectedCategoryData.label} className="w-4 h-4" />
                  <span>{selectedCategoryData.label}</span>
                </div>
              ) : (
                <span className="text-text-muted">Sin categoría</span>
              )}
            </div>
            
            {isCategoryOpen && (
              <div className={`absolute z-20 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-deep border border-glass-border shadow-lg ${isTechTheme ? 'rounded-none' : 'rounded-xl'}`}>
                <div 
                  className="px-3 py-2 hover:bg-white/10 cursor-pointer text-sm text-text-primary border-b border-glass-border/30"
                  onClick={() => { setCategory(''); setIsCategoryOpen(false); }}
                >
                  Sin categoría
                </div>
                {allCategories.map(cat => (
                  <div 
                    key={cat.label}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 cursor-pointer text-sm text-text-primary"
                    onClick={() => { setCategory(cat.label); setIsCategoryOpen(false); }}
                  >
                    <CategoryIcon icon={cat.icon} label={cat.label} className="w-4 h-4" />
                    <span>{cat.label}</span>
                  </div>
                ))}
              </div>
            )}
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
            <div className="flex gap-4">
              {type === 'once' && (
                <div className="flex-1">
                  <label className="block text-xs text-text-muted uppercase tracking-wider mb-1.5">Fecha</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`
                      w-full px-3 py-2.5 text-sm focus:outline-none bg-glass border border-glass-border text-text-primary ${theme === 'dark' || isTechTheme ? '[color-scheme:dark]' : '[color-scheme:light]'}
                      ${isTechTheme ? 'rounded-none font-mono text-accent' : 'rounded-2xl'}
                    `}
                  />
                </div>
              )}
              <div className="flex-1">
                <label className="block text-xs text-text-muted uppercase tracking-wider mb-1.5">Hora {type === 'once' ? 'del evento' : 'base'}</label>
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className={`
                    w-full px-3 py-2.5 text-sm focus:outline-none bg-glass border border-glass-border text-text-primary ${theme === 'dark' || isTechTheme ? '[color-scheme:dark]' : '[color-scheme:light]'}
                    ${isTechTheme ? 'rounded-none font-mono text-accent' : 'rounded-2xl'}
                  `}
                />
              </div>
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
                  w-full px-3 py-2.5 text-sm focus:outline-none bg-glass border border-glass-border text-text-primary
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
          
          {/* Múltiples Alertas (Solo si no es budget_alert) */}
          {type !== 'budget_alert' && (
            <div className="pt-2 border-t border-glass-border/40">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs text-text-muted uppercase tracking-wider">Alertas previas (Opcional)</label>
                <button
                  type="button"
                  onClick={addAlert}
                  className="flex items-center gap-1 text-xs text-accent hover:underline"
                >
                  <Plus className="w-3 h-3" /> Agregar alerta
                </button>
              </div>
              
              <div className="space-y-2">
                {alerts.map(alert => (
                  <div key={alert.id} className="flex gap-2 items-center">
                    <input
                      type="number"
                      min={1}
                      value={alert.value}
                      onChange={e => updateAlert(alert.id, 'value', Number(e.target.value))}
                      className={`w-16 px-2 py-1.5 text-sm bg-glass border border-glass-border text-text-primary text-center ${isTechTheme ? 'rounded-none font-mono' : 'rounded-lg'}`}
                    />
                    <select
                      value={alert.unit}
                      onChange={e => updateAlert(alert.id, 'unit', e.target.value)}
                      className={`flex-1 px-2 py-1.5 text-sm bg-deep border border-glass-border text-text-primary ${isTechTheme ? 'rounded-none font-mono' : 'rounded-lg'}`}
                    >
                      <option value="minutes">Minutos antes</option>
                      <option value="hours">Horas antes</option>
                      <option value="days">Días antes</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeAlert(alert.id)}
                      className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-glass-border/40 pt-3 space-y-2">
            <ToggleSwitch
              label="Notificación Push (Segundo plano)"
              checked={pushEnabled}
              onChange={setPushEnabled}
              theme={theme}
            />
            <ToggleSwitch
              label="Notificación In-App (Toast)"
              checked={inAppEnabled}
              onChange={setInAppEnabled}
              theme={theme}
            />
            <ToggleSwitch
              label="Efecto de Sonido"
              checked={sound}
              onChange={setSound}
              theme={theme}
            />
            <ToggleSwitch
              label="Recordatorio Activo"
              checked={active}
              onChange={setActive}
              theme={theme}
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
