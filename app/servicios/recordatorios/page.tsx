'use client';
import { currentLocale, tr } from '@/lib/i18n';
import { CategoryIcon } from '@/components/CategoryIcon';
import { findCatalogEntry } from '@/lib/categories';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, Clock, Edit2, Trash2, Pause, Check, Plus, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/components/ThemeProvider';
import { useReminders } from '@/hooks/useReminders';
import { useExpenses } from '@/hooks/useExpenses';
import { useData } from '@/components/DataProvider';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { ReminderFormModal } from '@/components/forms/ReminderFormModal';
import { deleteReminder, updateReminder, Reminder } from '@/lib/firestore';
import { requestNotificationPermission } from '@/lib/notifications';
import { syncPushToken } from '@/lib/push';

import { ConfirmDialog } from '@/components/layout/ConfirmDialog';
import { MarkPaidDialog } from '@/components/reminders/MarkPaidDialog';
import { getPendingDue, dueLabel, eventDueLabel, isPaymentReminder, ReminderDue, isCategoryShared, lastPaymentFor } from '@/lib/reminderDue';
import { triggerPowerAnimation } from '@/components/dashboard/PowerAnimation';
import { speakText } from '@/lib/voiceParser';
import { CommitmentsView } from '@/components/payments/CommitmentsView';

import { PageTourButton } from '@/components/tour/PageTourButton';
export default function RecordatoriosPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const { reminders, loading: remindersLoading, refresh } = useReminders();
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  const router = useRouter();

  // Estados locales
  const [showForm, setShowForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [deletingReminderId, setDeletingReminderId] = useState<string | null>(null);
  const [payingDue, setPayingDue] = useState<ReminderDue | null>(null);
  // Pestañas: todos los recordatorios (pagos, citas, fechas) o los pagos fijos del mes
  const [tab, setTab] = useState<'recordatorios' | 'pagos'>('recordatorios');
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('tab') === 'pagos') setTab('pagos');
  }, []);

  // Cargar porcentaje de presupuesto
  const { gastosEsteMes } = useExpenses();
  const { transactions } = useData();
  const userBudget = profile?.budget || 0;
  const budgetPercent = userBudget > 0 ? (gastosEsteMes / userBudget) * 100 : 0;

  // Los avisos los vigila ReminderWatcher en toda la app

  // Solicitar permisos y registrar SW
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    
    // Comprobar el permiso actual de notificaciones
    if ('Notification' in window) {
      setPermissionGranted(Notification.permission === 'granted');
    }
  }, [user, authLoading, router]);

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setPermissionGranted(granted);
    if (granted && user) syncPushToken(user.uid);
  };

  const handleToggle = async (r: Reminder) => {
    if (!r.id) return;
    try {
      await updateReminder(r.id, { active: !r.active });
      refresh();
    } catch (e) {
      console.error('Error toggling reminder state:', e);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingReminderId(id);
  };

  const confirmDeleteReminder = async () => {
    if (!deletingReminderId) return;
    try {
      triggerPowerAnimation(0, 'eliminacion', tr('RECORDATORIO ELIMINADO'), tr('¡REMOVIDO!'));
      speakText(tr('Recordatorio eliminado con éxito'), 'es-CO');
      await deleteReminder(deletingReminderId);
      setDeletingReminderId(null);
      refresh();
    } catch (e) {
      console.error('Error deleting reminder:', e);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-deep flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-deep">
      <Header />
      
      <main className="relative flex-1 max-w-2xl lg:max-w-6xl mx-auto w-full p-4 pb-32 space-y-5 animate-fade-in-up">
        {/* Header de página */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1 flex items-center gap-3">
            <Link href="/servicios" className={`p-2 -ml-2 shrink-0 bg-glass border hover:bg-white/[0.05] transition-colors ${isTechTheme ? 'border-accent/30 rounded-none text-accent' : 'border-glass-border rounded-full text-text-primary'}`}>
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <h1 className={`${isTechTheme ? 'font-mono font-bold text-xl sm:text-2xl leading-tight text-accent uppercase tracking-wider' : 'font-syne font-bold text-xl sm:text-2xl leading-tight text-text-primary'} truncate`}>
                {tr('Recordatorios')}
              </h1>
              <p className={`mt-1 ${isTechTheme ? 'font-mono text-accent/70 tracking-wide text-[10px] sm:text-xs uppercase' : 'text-text-secondary text-xs sm:text-sm'}`}>
                {tr('Citas, fechas importantes y tus pagos del mes')}
              </p>
            </div>
          </div>
          {/* Tutorial y + juntos a la derecha (la prueba de avisos vive en Configuración › Notificaciones) */}
          <div className="flex items-center gap-2 shrink-0">
            <PageTourButton id="recordatorios" />
            <button
              onClick={() => { setEditingReminder(null); setShowForm(true); }}
              aria-label={tr('Nuevo recordatorio')} title={tr('Nuevo recordatorio')}
              className={`flex items-center justify-center w-10 h-10 bg-gradient-to-br from-accent to-accent-dim
                          ${(theme === 'light' || theme === 'nova') ? 'text-white' : 'text-black'}
                          font-semibold text-sm shadow-lg shadow-accent/20
                          hover:opacity-90 active:scale-[0.97] transition-all
                          ${isTechTheme ? 'rounded-none' : 'rounded-2xl'}`}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Pestañas */}
        <div role="tablist" className={`grid grid-cols-2 p-1 bg-glass border border-glass-border ${isTechTheme ? 'rounded-none font-mono' : 'rounded-2xl'}`}>
          {([['recordatorios', `Recordatorios${reminders.length ? ` (${reminders.length})` : ''}`], ['pagos', tr('Pagos del mes')]] as const).map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                    className={`py-2 text-sm font-semibold transition-colors ${isTechTheme ? 'rounded-none uppercase text-xs' : 'rounded-xl'} ${
                      tab === k ? (isTechTheme ? 'bg-accent/15 text-accent border border-accent/50' : 'bg-accent text-black') : 'text-text-secondary hover:text-text-primary'}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'pagos' && <CommitmentsView onOpenReminders={() => setTab('recordatorios')} />}

        {/* Banner de permiso si no está concedido */}
        {tab === 'recordatorios' && !permissionGranted && (
          <div className={`glass-card p-4 flex gap-3 border ${isTechTheme ? 'border-yellow-500/30 rounded-none' : 'border-yellow-500/10 rounded-2xl'}`}>
            <Bell className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-primary font-medium">{tr('Alertas del sistema desactivadas')}</p>
              <p className="text-xs text-text-muted mt-0.5">
                {tr('Para recibir avisos en segundo plano (incluso con la app cerrada), activa las notificaciones del navegador.')}
              </p>
              <button
                onClick={handleRequestPermission}
                className="mt-2 text-xs font-semibold text-accent hover:underline"
              >
                {tr('Activar notificaciones')}
              </button>
            </div>
          </div>
        )}

        {/* Listado */}
        {tab !== 'recordatorios' ? null : remindersLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className={`glass-card h-20 animate-pulse ${isTechTheme ? 'rounded-none' : 'rounded-2xl'}`} />
            ))}
          </div>
        ) : reminders.length === 0 ? (
          <div className={`glass-card p-8 text-center ${isTechTheme ? 'rounded-none' : 'rounded-2xl'}`}>
            <Bell className="w-10 h-10 text-accent/40 mx-auto mb-3" />
            <p className="text-text-primary font-medium">{tr('Sin recordatorios')}</p>
            <p className="text-text-muted text-sm mt-1">{tr('Crea alertas personalizadas para estar al día con tus pagos recurrentes.')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {reminders.map((r, i) => (
              <ReminderCard
                key={r.id || i}
                reminder={r}
                onEdit={() => { setEditingReminder(r); setShowForm(true); }}
                onToggle={() => handleToggle(r)}
                onDelete={() => handleDelete(r.id!)}
                due={getPendingDue(r, new Date(), transactions, isCategoryShared(r, reminders))}
                lastPay={r.amount ? null : lastPaymentFor(r, transactions, isCategoryShared(r, reminders))}
                onPay={setPayingDue}
                isTechTheme={isTechTheme}
                delay={i * 0.08}
              />
            ))}
          </div>
        )}
      </main>

      <BottomNav />

      {showForm && (
        <ReminderFormModal
          onClose={() => setShowForm(false)}
          onSuccess={refresh}
          reminder={editingReminder}
        />
      )}

      {payingDue && <MarkPaidDialog due={payingDue} amount={payingDue.reminder.amount || lastPaymentFor(payingDue.reminder, transactions, isCategoryShared(payingDue.reminder, reminders))?.amount || null} onClose={() => setPayingDue(null)} />}

      <ConfirmDialog
        isOpen={!!deletingReminderId}
        onCancel={() => setDeletingReminderId(null)}
        onConfirm={confirmDeleteReminder}
        title={tr('Eliminar Recordatorio')}
        message="¿Estás seguro de que deseas eliminar este recordatorio? Esta acción no se puede deshacer."
        confirmText="Eliminar"
      />
    </div>
  );
}

function ReminderCard({ reminder, onEdit, onToggle, onDelete, isTechTheme, delay, due, onPay, lastPay }: {
  lastPay?: { amount: number; date: Date } | null;
  reminder: Reminder;
  due: ReminderDue | null;
  onPay: (due: ReminderDue) => void;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  isTechTheme: boolean;
  delay: number;
}) {
  const typeLabel = {
    once: tr('Una vez'),
    daily: tr('Diario'),
    weekly: tr('Semanal'),
    monthly: reminder.everyMonths && reminder.everyMonths > 1 ? tr('Cada {a} meses', { a: reminder.everyMonths }) : tr('Mensual'),
    yearly: tr('Anual'),
    budget_alert: tr('Alerta presupuesto'),
  }[reminder.type] ?? reminder.type;

  const dayOfWeekNames = [tr('Domingo'), tr('Lunes'), tr('Martes'), tr('Miércoles'), tr('Jueves'), tr('Viernes'), tr('Sábado')];

  const getFrecuenciaDetail = () => {
    if (reminder.type === 'weekly' && reminder.dayOfWeek !== undefined) {
      return tr('cada {a}', { a: dayOfWeekNames[reminder.dayOfWeek] });
    }
    if (reminder.type === 'monthly' && reminder.dayOfMonth !== undefined) {
      return reminder.everyMonths && reminder.everyMonths > 1
        ? tr('el día {a}, cada {b} meses', { a: reminder.dayOfMonth, b: reminder.everyMonths })
        : tr('el día {a} del mes', { a: reminder.dayOfMonth });
    }
    if (reminder.type === 'yearly' && reminder.date) {
      const [, m, d] = reminder.date.split('-').map(Number);
      return `cada año el ${new Date(2000, m - 1, d).toLocaleDateString(currentLocale(), { day: 'numeric', month: 'long' })}`;
    }
    if (reminder.type === 'budget_alert' && reminder.budgetPercent !== undefined) {
      return tr('al consumir el {a}%', { a: reminder.budgetPercent });
    }
    return '';
  };

  const displayLabel = isTechTheme 
    ? `>_ ${reminder.title.toUpperCase().replace(/\s+/g, '_')}`
    : reminder.title;

  return (
    <div
      className={`glass-card p-4 cursor-pointer animate-card-mix hover:bg-white/[0.04] transition-colors
                 ${isTechTheme ? 'rounded-none border-y border-r border-glass-border border-l-4 border-l-accent' : 'rounded-2xl'}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center flex-shrink-0">
          {(reminder.merchant || reminder.category)
            ? <CategoryIcon icon={findCatalogEntry(reminder.merchant || reminder.category || '')?.icon || reminder.merchant || reminder.category || ''} label={reminder.merchant || reminder.category || ''} className="w-5 h-5 text-base flex items-center justify-center" />
            : <Bell className="w-4 h-4 text-accent" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`font-semibold text-sm text-text-primary min-w-0 [overflow-wrap:anywhere] ${isTechTheme ? 'font-mono tracking-wide' : ''}`}>
              {displayLabel}
            </p>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
              {typeLabel}
            </span>
            {!reminder.active && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-text-muted">
                {tr('Pausado')}
              </span>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-0.5 truncate">
            {reminder.amount
              ? <b className="text-text-primary">${reminder.amount.toLocaleString(currentLocale())} · </b>
              : lastPay ? <b className="text-text-primary">${lastPay.amount.toLocaleString(currentLocale())} <span className="font-normal text-text-muted">{tr('(último pago, {a})', { a: lastPay.date.toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short' }) })}</span> · </b> : null}
            {reminder.description || tr('Sin notas')}
          </p>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {reminder.type !== 'budget_alert' && (
              <span className="text-[11px] text-text-muted flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-accent/70" /> {reminder.time} {getFrecuenciaDetail()}
              </span>
            )}
            {reminder.type === 'budget_alert' && (
              <span className="text-[11px] text-text-muted flex items-center gap-1">
                {getFrecuenciaDetail()}
              </span>
            )}
            <div className="flex gap-1.5 ml-auto">
              {reminder.pushEnabled && <span className="text-[9px] px-1 bg-white/5 text-text-muted uppercase">{tr('Push')}</span>}
              {reminder.inAppEnabled && <span className="text-[9px] px-1 bg-white/5 text-text-muted uppercase">{tr('In-app')}</span>}
              {reminder.sound && <span className="text-[9px] px-1 bg-white/5 text-text-muted uppercase">{tr('Sonido')}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors
                        ${reminder.active ? 'bg-accent/15 text-accent' : 'bg-white/5 text-text-muted'}`}
          >
            {reminder.active ? <Check className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-text-muted hover:text-text-primary"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/20"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {due && (
        <div className={`mt-3 flex items-center justify-between gap-3 px-3 py-2.5 ${isTechTheme ? 'rounded-none' : 'rounded-xl'} ${due.daysLeft < 0 ? 'bg-red-500/10 border border-red-500/25' : 'bg-accent/5 border border-accent/15'}`}>
          <span className={`text-xs font-semibold ${due.daysLeft < 0 ? 'text-red-400' : 'text-text-secondary'}`}>
            {(isPaymentReminder(reminder) ? dueLabel : eventDueLabel)(due.daysLeft)} · {due.dueDate.toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short' })}
            {(reminder.amount || lastPay?.amount) ? <span className="text-text-muted font-normal"> · ${(reminder.amount || lastPay!.amount).toLocaleString(currentLocale())}</span> : null}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onPay(due); }}
            className={`shrink-0 px-4 py-2 text-xs font-bold ${isTechTheme ? 'rounded-none border border-accent text-accent uppercase' : 'rounded-lg bg-accent/15 text-accent hover:bg-accent/25'}`}
          >
            {isPaymentReminder(reminder) ? tr('Ya lo pagué') : tr('Listo ✓')}
          </button>
        </div>
      )}
    </div>
  );
}
