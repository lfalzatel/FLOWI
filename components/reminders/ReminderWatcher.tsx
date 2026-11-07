'use client';
import { useAuth } from '@/hooks/useAuth';
import { useExpenses } from '@/hooks/useExpenses';
import { useReminders } from '@/hooks/useReminders';
import { useReminderScheduler } from '@/hooks/useReminderScheduler';

// Vigila los recordatorios en cualquier pantalla mientras la app está abierta (antes solo
// funcionaba con Recordatorios abierto). Con la app cerrada avisa la tarea programada de push.
export function ReminderWatcher() {
  const { profile } = useAuth();
  const { reminders } = useReminders();
  const { gastosEsteMes } = useExpenses();
  const budget = profile?.budget || 0;
  useReminderScheduler(reminders, budget > 0 ? (gastosEsteMes / budget) * 100 : 0);
  return null;
}
