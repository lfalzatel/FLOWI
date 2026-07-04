'use client';
import { useEffect, useRef } from 'react';
import { Reminder } from '@/lib/firestore';
import { scheduleNotificationViaSW, playNotificationSound } from '@/lib/notifications';
import { useInAppNotifications } from '@/hooks/useInAppNotifications';
import { updateReminder } from '@/lib/firestore';

export function useReminderScheduler(reminders: Reminder[], budgetPercent: number) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { push: pushInApp } = useInAppNotifications();

  useEffect(() => {
    if (!reminders.length) return;

    async function tick() {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const currentDay = now.getDay(); // 0-6 (0=Domingo, 1=Lunes...)
      const currentDayOfMonth = now.getDate();

      for (const r of reminders) {
        if (!r.active) continue;

        let shouldFire = false;

        if (r.type === 'daily' && r.time === currentTime) {
          shouldFire = true;
        } else if (r.type === 'weekly' && r.dayOfWeek === currentDay && r.time === currentTime) {
          shouldFire = true;
        } else if (r.type === 'monthly' && r.dayOfMonth === currentDayOfMonth && r.time === currentTime) {
          shouldFire = true;
        } else if (r.type === 'once' && r.time === currentTime) {
          shouldFire = true;
        } else if (r.type === 'budget_alert' && budgetPercent >= (r.budgetPercent ?? 80)) {
          shouldFire = true;
        }

        if (!shouldFire) continue;

        // Validar que no se haya disparado ya en el último minuto para evitar spam (el scheduler corre cada 30 segundos)
        const last = r.lastTriggered instanceof Date
          ? r.lastTriggered
          : (r.lastTriggered && typeof (r.lastTriggered as any).toDate === 'function')
            ? (r.lastTriggered as any).toDate()
            : null;

        if (last) {
          const diffMs = now.getTime() - last.getTime();
          if (r.type === 'budget_alert') {
            // Las alertas de presupuesto se disparan una vez al día
            if (last.toDateString() === now.toDateString()) {
              continue;
            }
          } else {
            // Otras alertas se disparan una vez por minuto
            if (diffMs < 60000) {
              continue;
            }
          }
        }

        // Actualizar base de datos con la última fecha de disparo
        if (r.id) {
          try {
            await updateReminder(r.id, { lastTriggered: now, active: r.type === 'once' ? false : r.active });
          } catch (e) {
            console.error('Error updating lastTriggered for reminder:', e);
          }
        }

        // 1. Notificación push (background / Service Worker)
        if (r.pushEnabled) {
          scheduleNotificationViaSW({
            title: r.title,
            body: r.description || 'Recordatorio de Flowi',
            tag: `reminder-${r.id || Date.now()}`,
            data: { reminderId: r.id, url: '/recordatorios' },
          });
        }

        // 2. Notificación in-app (si la app está abierta)
        if (r.inAppEnabled) {
          pushInApp({ 
            title: r.title, 
            body: r.description || 'Recordatorio de Flowi', 
            reminderId: r.id 
          });
        }

        // 3. Tocar sonido
        if (r.sound) {
          playNotificationSound();
        }
      }
    }

    // Evaluar cada 30 segundos para no perder el minuto exacto
    timerRef.current = setInterval(tick, 30000);
    tick(); // Ejecución inmediata al montar/actualizar dependencias

    return () => { 
      if (timerRef.current) clearInterval(timerRef.current); 
    };
  }, [reminders, budgetPercent, pushInApp]);
}
