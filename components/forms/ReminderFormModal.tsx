'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '@/components/ThemeProvider';
import { X, Plus, Trash2, ChevronDown, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { addReminder, updateReminder, deleteReminder, Reminder, ReminderAlert } from '@/lib/firestore';
import { CategoryIcon } from '@/components/CategoryIcon';
import { CategoryPickerSheet } from '@/components/forms/CategoryPickerSheet';
import { ManageCategoriesModal } from '@/components/forms/ManageCategoriesModal';
import { useData } from '@/components/DataProvider';
import { suggestReminderCategory } from '@/lib/reminderSuggest';
import { useMemo } from 'react';
import { speakText } from '@/lib/voiceParser';
import { ConfirmDialog } from '@/components/layout/ConfirmDialog';
import { askForNotifications } from '@/lib/notifPrompt';
import { triggerPowerAnimation, triggerConfettiWithSynth } from '@/components/dashboard/PowerAnimation';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  reminder?: Reminder | null;
  prefill?: Partial<Reminder>; // valores iniciales de un recordatorio nuevo (p. ej. desde un gasto)
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

export function ReminderFormModal({ onClose, onSuccess, reminder, prefill }: Props) {
  const { user } = useAuth();
  const initial = reminder || prefill;
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [type, setType] = useState<Reminder['type']>(initial?.type || 'once');
  const [time, setTime] = useState(initial?.time || '08:00');
  const [dayOfWeek, setDayOfWeek] = useState(initial?.dayOfWeek ?? 1);
  const [dayOfMonth, setDayOfMonth] = useState<number | ''>(initial?.dayOfMonth ?? 1);
  const [date, setDate] = useState(initial?.date || '');
  const [category, setCategory] = useState(initial?.category || '');
  const [budgetPercent, setBudgetPercent] = useState(initial?.budgetPercent ?? 80);
  const [alerts, setAlerts] = useState<ReminderAlert[]>(initial?.alerts || []);
  // Cada cuántos meses (mensual) y un mes en que sí toca; valor aproximado del pago (opcional)
  const [everyMonths, setEveryMonths] = useState<number>(initial?.everyMonths && initial.everyMonths > 1 ? initial.everyMonths : 1);
  const thisMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [startMonth, setStartMonth] = useState<string>(initial?.startMonth || thisMonthKey);
  const [amountText, setAmountText] = useState(initial?.amount ? Number(initial.amount).toLocaleString('es-CO') : '');

  const { allCategories: categoryOptions, merchantOptions, expenseCategories } = useCategories();
  const allCategories = [...categoryOptions, ...merchantOptions.filter(mer => !categoryOptions.some(c => c.label === mer.label))];
  const [sound, setSound] = useState(initial?.sound ?? true);
  const [pushEnabled, setPushEnabled] = useState(initial?.pushEnabled ?? true);
  const [inAppEnabled, setInAppEnabled] = useState(initial?.inAppEnabled ?? true);
  const [active, setActive] = useState(initial?.active ?? true);
  const [loading, setLoading] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  
  const [catSheet, setCatSheet] = useState(false);
  const [manageView, setManageView] = useState<'form' | 'list' | null>(null);
  const [showNote, setShowNote] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const { transactions } = useData();

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
      // Creado desde un gasto: ese vencimiento ya está pagado
      if (!reminder && prefill?.paidDates?.length) data.paidDates = prefill.paidDates;

      if ((type === 'once' || type === 'yearly') && date.trim()) data.date = date;
      if (type === 'weekly') data.dayOfWeek = dayOfWeek;
      if (type === 'monthly') {
        data.dayOfMonth = dayOfMonth === '' ? 1 : dayOfMonth;
        data.everyMonths = everyMonths;
        data.startMonth = everyMonths > 1 ? startMonth : null;
      }
      if (type !== 'daily' && type !== 'budget_alert') {
        const amount = Number(amountText.replace(/\D/g, ''));
        data.amount = amount > 0 ? amount : null;
      }
      if (type === 'budget_alert') data.budgetPercent = budgetPercent;

      if (reminder?.id) {
        triggerPowerAnimation(0, 'edicion', 'RECORDATORIO ACTUALIZADO', '¡ACTUALIZADO!');
        speakText('Recordatorio actualizado con éxito', 'es-CO');
        onClose();
        await updateReminder(reminder.id, data);
      } else {
        triggerPowerAnimation(0, 'edicion', 'RECORDATORIO AGENDADO', '¡AGENDADO!');
        triggerConfettiWithSynth(3.0);
        speakText('Recordatorio agendado con éxito', 'es-CO');
        onClose();
        await addReminder(data);
        // Momento natural para pedir los avisos: acaba de crear algo que quiere que le recuerden
        setTimeout(() => askForNotifications({ context: data.title }), 1200);
      }
      onSuccess();
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
  // Sugerencia de categoría según el título (historial propio y reglas del dictado), sin IA
  const suggestion = useMemo(
    () => (title.trim().length >= 3 ? suggestReminderCategory(title, transactions, categoryOptions) : null),
    [title, transactions, categoryOptions],
  );
  const suggestionData = suggestion ? allCategories.find(c => c.label === suggestion) : undefined;

  // ── Estilos y piezas del formulario compacto ──
  const lbl = `block text-[11px] uppercase tracking-wider mb-1.5 ${isTechTheme ? 'text-accent/70' : 'text-text-muted'}`;
  const field = `w-full px-3 py-2.5 text-sm focus:outline-none bg-glass border border-glass-border text-text-primary ${theme === 'dark' || isTechTheme ? '[color-scheme:dark]' : '[color-scheme:light]'} ${isTechTheme ? 'rounded-none font-mono text-accent focus:border-accent' : 'rounded-xl focus:border-accent'}`;
  const chip = (on: boolean) => `px-2.5 py-2 text-xs font-semibold border transition-all active:scale-95 ${isTechTheme ? 'rounded-none' : 'rounded-xl'} ${
    on ? 'bg-accent/15 border-accent text-accent' : 'border-glass-border text-text-secondary hover:text-text-primary hover:bg-white/5'}`;
  const TYPES: { id: Reminder['type']; label: string }[] = [
    { id: 'once', label: 'Una vez' }, { id: 'monthly', label: 'Mensual' }, { id: 'yearly', label: 'Anual' },
    { id: 'weekly', label: 'Semanal' }, { id: 'daily', label: 'Diario' }, { id: 'budget_alert', label: 'Presupuesto' },
  ];
  const WEEK = [[1, 'L'], [2, 'M'], [3, 'X'], [4, 'J'], [5, 'V'], [6, 'S'], [0, 'D']] as const;
  const UNITS: { id: ReminderAlert['unit']; label: string }[] = [{ id: 'minutes', label: 'min' }, { id: 'hours', label: 'horas' }, { id: 'days', label: 'días' }];
  const hasAmount = type !== 'daily' && type !== 'budget_alert';
  const timeInput = (
    <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} className={field} aria-label="Hora" />
  );

  return createPortal(
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${isTechTheme ? 'font-mono' : ''}`}>
      <div onClick={onClose} className={`absolute inset-0 ${theme === 'light' ? 'bg-black/10' : 'bg-black/40'}`} />

      <div className={`relative w-full max-w-md max-h-[90dvh] flex flex-col overflow-hidden z-10 glass-dropdown animate-fade-in-up ${isTechTheme ? 'border border-accent/50 rounded-none' : 'rounded-3xl'}`}>
        <div className={`shrink-0 flex items-center justify-between px-5 pt-5 pb-3 ${isTechTheme ? 'border-b border-accent/20' : ''}`}>
          <h2 className={isTechTheme ? 'font-bold text-xl text-accent tracking-wide uppercase' : 'font-syne font-bold text-xl text-text-primary'}>
            {reminder ? 'Editar recordatorio' : 'Nuevo recordatorio'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className={isTechTheme ? 'text-accent' : 'text-text-secondary hover:text-text-primary'}><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pt-3 pb-5 space-y-4">
            {/* Título + sugerencia de categoría */}
            <div>
              <label className={lbl} htmlFor="rem-title">Título</label>
              <input id="rem-title" type="text" required placeholder="Ej: Pagar arriendo, cambio de aceite" value={title}
                     onChange={(e) => setTitle(e.target.value)} className={field} />
              {suggestion && !category && type !== 'budget_alert' && (
                <button type="button" onClick={() => setCategory(suggestion)}
                        className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] border border-dashed border-accent/50 text-accent ${isTechTheme ? 'rounded-none' : 'rounded-lg'}`}>
                  <Sparkles className="w-3.5 h-3.5" /> ¿Categoría
                  {suggestionData && <CategoryIcon icon={suggestionData.icon} label={suggestionData.label} className="w-4 h-4 text-sm flex items-center justify-center" />}
                  <b>{suggestion}</b>? Usar
                </button>
              )}
            </div>

            {/* Categoría | Valor */}
            {type !== 'budget_alert' && (
              <div className={`grid gap-2 ${hasAmount ? 'grid-cols-[1.3fr_1fr]' : 'grid-cols-1'}`}>
                <div className="min-w-0">
                  <span className={lbl}>Categoría</span>
                  <button type="button" onClick={() => setCatSheet(true)} className={`${field} flex items-center gap-2 text-left`}>
                    {selectedCategoryData
                      ? <><CategoryIcon icon={selectedCategoryData.icon} label={selectedCategoryData.label} className="w-4 h-4 text-sm flex items-center justify-center shrink-0" /><span className="truncate">{selectedCategoryData.label}</span></>
                      : <span className="text-text-muted truncate">{category || 'Elegir'}</span>}
                    <ChevronDown className="w-4 h-4 ml-auto text-text-muted shrink-0" />
                  </button>
                </div>
                {hasAmount && (
                  <div className="min-w-0">
                    <label className={lbl} htmlFor="rem-amount">Valor</label>
                    <input id="rem-amount" type="text" inputMode="numeric" placeholder="Opcional" value={amountText}
                           onChange={(e) => { const d = e.target.value.replace(/\D/g, ''); setAmountText(d ? Number(d).toLocaleString('es-CO') : ''); }}
                           className={field} />
                  </div>
                )}
              </div>
            )}

            {/* Frecuencia */}
            <div>
              <span className={lbl}>Frecuencia</span>
              <div className="grid grid-cols-3 gap-1.5">
                {TYPES.map(t => <button key={t.id} type="button" onClick={() => setType(t.id)} className={chip(type === t.id)}>{t.label}</button>)}
              </div>
            </div>

            {/* Cuándo: cambia según la frecuencia */}
            {(type === 'once' || type === 'yearly') && (
              <div className="grid grid-cols-[1.4fr_1fr] gap-2">
                <div>
                  <label className={lbl} htmlFor="rem-date">{type === 'yearly' ? 'Fecha (cada año)' : 'Fecha'}</label>
                  <input id="rem-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={field} />
                </div>
                <div><span className={lbl}>Hora</span>{timeInput}</div>
              </div>
            )}
            {type === 'daily' && <div className="w-1/2"><span className={lbl}>Hora</span>{timeInput}</div>}
            {type === 'weekly' && (
              <div className="space-y-2">
                <span className={lbl}>Día de la semana</span>
                <div className="grid grid-cols-7 gap-1">
                  {WEEK.map(([d, l]) => <button key={d} type="button" onClick={() => setDayOfWeek(d)} className={`${chip(dayOfWeek === d)} px-0`}>{l}</button>)}
                </div>
                <div className="w-1/2"><span className={lbl}>Hora</span>{timeInput}</div>
              </div>
            )}
            {type === 'monthly' && (
              <div className="space-y-3">
                <div className="grid grid-cols-[0.8fr_1fr] gap-2">
                  <div>
                    <label className={lbl} htmlFor="rem-day">Día del mes</label>
                    <input id="rem-day" type="number" min={1} max={31} required value={dayOfMonth} inputMode="numeric"
                           onChange={(e) => { const v = e.target.value; if (v === '') setDayOfMonth(''); else { const n = parseInt(v, 10); if (!isNaN(n)) setDayOfMonth(Math.max(1, Math.min(31, n))); } }}
                           className={field} />
                  </div>
                  <div><span className={lbl}>Hora</span>{timeInput}</div>
                </div>
                <div>
                  <span className={lbl}>Repetir cada</span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[1, 2, 3, 4, 6].map(n => <button key={n} type="button" onClick={() => setEveryMonths(n)} className={`${chip(everyMonths === n)} px-0`}>{n === 1 ? 'Mes' : `${n} m`}</button>)}
                  </div>
                </div>
                {everyMonths > 1 && (
                  <div>
                    <label className={lbl} htmlFor="rem-start">¿En qué mes toca la próxima vez?</label>
                    <input id="rem-start" type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value || thisMonthKey)} className={field} />
                    <p className="text-[11px] text-text-muted mt-1">Desde ahí se repite cada {everyMonths} meses, el día {dayOfMonth || 1}.</p>
                  </div>
                )}
              </div>
            )}
            {type === 'budget_alert' && (
              <div>
                <span className={lbl}>Avisar al consumir el {budgetPercent}% del presupuesto</span>
                <input type="range" min={50} max={100} value={budgetPercent} onChange={(e) => setBudgetPercent(Number(e.target.value))}
                       className="w-full accent-accent bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer" />
              </div>
            )}

            {/* Cómo avisar */}
            <div>
              <span className={lbl}>Cómo avisarte</span>
              <div className="grid grid-cols-4 gap-1.5">
                <button type="button" onClick={() => setPushEnabled(!pushEnabled)} className={`${chip(pushEnabled)} px-0`}>Push</button>
                <button type="button" onClick={() => setInAppEnabled(!inAppEnabled)} className={`${chip(inAppEnabled)} px-0`}>En la app</button>
                <button type="button" onClick={() => setSound(!sound)} className={`${chip(sound)} px-0`}>Sonido</button>
                <button type="button" onClick={() => setActive(!active)} className={`${chip(active)} px-0`}>{active ? 'Activo' : 'Pausado'}</button>
              </div>
            </div>

            {/* Opcionales plegados */}
            {(showNote || description) ? (
              <div>
                <label className={lbl} htmlFor="rem-note">Nota</label>
                <textarea id="rem-note" rows={2} placeholder="Ej: referencia de pago, cuenta, observaciones" value={description}
                          onChange={(e) => setDescription(e.target.value)} className={`${field} resize-none`} />
              </div>
            ) : null}

            {type !== 'budget_alert' && (showAlerts || alerts.length > 0) && (
              <div className="space-y-2">
                <span className={lbl}>Avisarme antes</span>
                {alerts.map(alert => (
                  <div key={alert.id} className="flex items-center gap-1.5">
                    <input type="number" min={1} value={alert.value} inputMode="numeric"
                           onChange={e => updateAlert(alert.id, 'value', Number(e.target.value))}
                           className={`${field} !w-16 text-center px-1`} aria-label="Cantidad" />
                    {UNITS.map(u => (
                      <button key={u.id} type="button" onClick={() => updateAlert(alert.id, 'unit', u.id)} className={`${chip(alert.unit === u.id)} flex-1 px-0`}>{u.label}</button>
                    ))}
                    <button type="button" onClick={() => removeAlert(alert.id)} aria-label="Quitar aviso" className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                <button type="button" onClick={addAlert} className="text-xs text-accent font-semibold inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Otro aviso</button>
              </div>
            )}

            <div className="flex flex-wrap gap-4">
              {!showNote && !description && (
                <button type="button" onClick={() => setShowNote(true)} className="text-xs text-accent font-semibold inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Nota</button>
              )}
              {type !== 'budget_alert' && !showAlerts && alerts.length === 0 && (
                <button type="button" onClick={() => { setShowAlerts(true); addAlert(); }} className="text-xs text-accent font-semibold inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Avisarme antes</button>
              )}
            </div>

            {reminder?.id && (
              <button type="button" onClick={() => setShowConfirmDelete(true)} disabled={loading}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-[var(--red)] border border-red-500/30 hover:bg-red-500/10 ${isTechTheme ? 'rounded-none uppercase' : 'rounded-xl'}`}>
                <Trash2 className="w-4 h-4" /> Eliminar recordatorio
              </button>
            )}
          </div>

          <div className={`shrink-0 px-5 pt-3 pb-4 border-t ${isTechTheme ? 'bg-deep border-accent/20' : 'bg-card border-glass-border'}`}>
            <button type="submit" disabled={loading}
                    className={`w-full py-3.5 font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${isTechTheme ? 'rounded-none bg-accent/20 border border-accent text-accent uppercase tracking-widest' : `rounded-xl bg-gradient-to-br from-accent to-accent-dim ${theme === 'light' ? 'text-white' : 'text-black'}`}`}>
              {loading ? 'Guardando...' : reminder ? 'Guardar cambios' : 'Crear recordatorio'}
            </button>
          </div>
        </form>
      </div>

      {catSheet && (
        <CategoryPickerSheet
          type="gasto"
          categories={expenseCategories}
          selected={category}
          recent={suggestion ? [suggestion] : []}
          onSelect={(label) => { setCategory(label); setCatSheet(false); }}
          onClose={() => setCatSheet(false)}
          onCreate={() => { setCatSheet(false); setManageView('form'); }}
          onManage={() => { setCatSheet(false); setManageView('list'); }}
        />
      )}
      {manageView && (
        <ManageCategoriesModal onClose={() => setManageView(null)} onCreated={(newLabel) => setCategory(newLabel)} initialView={manageView} />
      )}

      <ConfirmDialog
        isOpen={showConfirmDelete}
        onCancel={() => setShowConfirmDelete(false)}
        onConfirm={async () => {
          if (!reminder?.id) return;
          setLoading(true);
          try {
            triggerPowerAnimation(0, 'eliminacion', 'RECORDATORIO ELIMINADO', '¡REMOVIDO!');
            speakText('Recordatorio eliminado con éxito', 'es-CO');
            await deleteReminder(reminder.id);
            setShowConfirmDelete(false);
            onSuccess();
            onClose();
          } catch (e) {
            console.error('Error deleting reminder:', e);
          } finally {
            setLoading(false);
            setShowConfirmDelete(false);
          }
        }}
        title="Eliminar Recordatorio"
        message="¿Estás seguro de que deseas eliminar este recordatorio? Esta acción no se puede deshacer."
        confirmText="Eliminar"
      />
    </div>,
    document.body
  );
}
