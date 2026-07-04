'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Clock, Edit2, Trash2, Pause, Check, Plus, Beaker } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useInAppNotifications } from '@/hooks/useInAppNotifications';
import { useTheme } from '@/components/ThemeProvider';
import { useReminders } from '@/hooks/useReminders';
import { useReminderScheduler } from '@/hooks/useReminderScheduler';
import { useExpenses } from '@/hooks/useExpenses';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { ReminderFormModal } from '@/components/forms/ReminderFormModal';
import { deleteReminder, updateReminder, Reminder } from '@/lib/firestore';
import { registerReminderSW, requestNotificationPermission, scheduleNotificationViaSW, playNotificationSound } from '@/lib/notifications';

export default function RecordatoriosPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const { reminders, loading: remindersLoading, refresh } = useReminders();
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  const router = useRouter();
  const { push: pushInApp } = useInAppNotifications();

  // Estados locales
  const [showForm, setShowForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Cargar porcentaje de presupuesto
  const { gastosEsteMes } = useExpenses();
  const userBudget = profile?.budget || 0;
  const budgetPercent = userBudget > 0 ? (gastosEsteMes / userBudget) * 100 : 0;

  // Ejecutar el motor planificador en primer plano
  useReminderScheduler(reminders, budgetPercent);

  // Solicitar permisos y registrar SW
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    
    // Registrar el sw companion e inmediatamente comprobar el permiso actual
    registerReminderSW();
    if ('Notification' in window) {
      setPermissionGranted(Notification.permission === 'granted');
    }
  }, [user, authLoading, router]);

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setPermissionGranted(granted);
  };

  const handleTestNotification = () => {
    scheduleNotificationViaSW({
      title: '¡Prueba de Notificación!',
      body: 'Si ves esto, las notificaciones push locales están funcionando bien.',
      tag: 'test',
    });
    pushInApp({
      title: 'Prueba in-app',
      body: 'Notificación en la campanita'
    });
    playNotificationSound();
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
    try {
      await deleteReminder(id);
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
    <div className="min-h-screen flex flex-col bg-deep">
      <Header />
      
      <main className="flex-1 max-w-2xl mx-auto w-full p-4 pb-24 space-y-6 animate-fade-in-up">
        {/* Header de página */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`${isTechTheme ? 'font-mono font-bold text-3xl text-accent uppercase tracking-widest' : 'font-syne font-bold text-3xl text-text-primary'}`}>
              Recordatorios
            </h1>
            <p className={`mt-1 ${isTechTheme ? 'font-mono text-accent/70 tracking-wide text-xs uppercase' : 'text-text-secondary text-sm'}`}>
              Control y alertas de tus pagos recurrentes
            </p>
          </div>
          <div className="flex gap-2">
            {profile?.role === 'admin' && (
              <button
                onClick={handleTestNotification}
                className={`flex items-center justify-center p-2.5 bg-glass border border-glass-border
                            text-text-secondary hover:text-accent hover:bg-glass-hover active:scale-[0.97] transition-all
                            ${isTechTheme ? 'rounded-none font-mono' : 'rounded-2xl'}`}
                title="Probar Notificaciones"
              >
                <Beaker className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => { setEditingReminder(null); setShowForm(true); }}
              className={`flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-accent to-accent-dim
                          ${theme === 'light' ? 'text-white' : 'text-black'}
                          font-semibold text-sm shadow-lg shadow-accent/20
                          hover:opacity-90 active:scale-[0.97] transition-all
                          ${isTechTheme ? 'rounded-none font-mono uppercase tracking-widest' : 'rounded-2xl'}`}
            >
              <Plus className="w-4 h-4" />
              Nuevo
            </button>
          </div>
        </div>

        {/* Banner de permiso si no está concedido */}
        {!permissionGranted && (
          <div className={`glass-card p-4 flex gap-3 border ${isTechTheme ? 'border-yellow-500/30 rounded-none' : 'border-yellow-500/10 rounded-2xl'}`}>
            <Bell className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-primary font-medium">Alertas del sistema desactivadas</p>
              <p className="text-xs text-text-muted mt-0.5">
                Para recibir avisos en segundo plano (incluso con la app cerrada), activa las notificaciones del navegador.
              </p>
              <button
                onClick={handleRequestPermission}
                className="mt-2 text-xs font-semibold text-accent hover:underline"
              >
                Activar notificaciones
              </button>
            </div>
          </div>
        )}

        {/* Listado */}
        {remindersLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className={`glass-card h-20 animate-pulse ${isTechTheme ? 'rounded-none' : 'rounded-2xl'}`} />
            ))}
          </div>
        ) : reminders.length === 0 ? (
          <div className={`glass-card p-8 text-center ${isTechTheme ? 'rounded-none' : 'rounded-2xl'}`}>
            <Bell className="w-10 h-10 text-accent/40 mx-auto mb-3" />
            <p className="text-text-primary font-medium">Sin recordatorios</p>
            <p className="text-text-muted text-sm mt-1">Crea alertas personalizadas para estar al día con tus pagos recurrentes.</p>
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
    </div>
  );
}

function ReminderCard({ reminder, onEdit, onToggle, onDelete, isTechTheme, delay }: {
  reminder: Reminder;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  isTechTheme: boolean;
  delay: number;
}) {
  const typeLabel = {
    once: 'Una vez',
    daily: 'Diario',
    weekly: 'Semanal',
    monthly: 'Mensual',
    budget_alert: 'Alerta presupuesto',
  }[reminder.type] ?? reminder.type;

  const dayOfWeekNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  const getFrecuenciaDetail = () => {
    if (reminder.type === 'weekly' && reminder.dayOfWeek !== undefined) {
      return `cada ${dayOfWeekNames[reminder.dayOfWeek]}`;
    }
    if (reminder.type === 'monthly' && reminder.dayOfMonth !== undefined) {
      return `el día ${reminder.dayOfMonth} del mes`;
    }
    if (reminder.type === 'budget_alert' && reminder.budgetPercent !== undefined) {
      return `al consumir el ${reminder.budgetPercent}%`;
    }
    return '';
  };

  return (
    <div
      className={`glass-card p-4 cursor-pointer animate-card-mix hover:bg-white/[0.04] transition-colors
                 ${isTechTheme ? 'rounded-none' : 'rounded-2xl'}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center flex-shrink-0">
          <Bell className="w-4 h-4 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`font-semibold text-sm text-text-primary ${isTechTheme ? 'font-mono' : ''}`}>
              {reminder.title}
            </p>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
              {typeLabel}
            </span>
            {!reminder.active && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-text-muted">
                Pausado
              </span>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-0.5 truncate">{reminder.description || 'Sin notas'}</p>
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
              {reminder.pushEnabled && <span className="text-[9px] px-1 bg-white/5 text-text-muted uppercase">Push</span>}
              {reminder.inAppEnabled && <span className="text-[9px] px-1 bg-white/5 text-text-muted uppercase">In-app</span>}
              {reminder.sound && <span className="text-[9px] px-1 bg-white/5 text-text-muted uppercase">Sonido</span>}
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
    </div>
  );
}
