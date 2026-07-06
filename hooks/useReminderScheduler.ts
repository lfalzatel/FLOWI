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

      for (const r of reminders) {
        if (!r.active) continue;

        let shouldFire = false;
        let isMainEventPassed = false;

        if (r.type === 'budget_alert') {
          shouldFire = budgetPercent >= (r.budgetPercent ?? 80);
        } else {
          // Parse time
          const [hours, minutes] = r.time.split(':').map(Number);
          
          let eventDate = new Date(now);
          eventDate.setHours(hours, minutes, 0, 0);

          let eventMatchesToday = false;
          if (r.type === 'daily') eventMatchesToday = true;
          else if (r.type === 'weekly' && r.dayOfWeek === now.getDay()) eventMatchesToday = true;
          else if (r.type === 'monthly' && r.dayOfMonth === now.getDate()) eventMatchesToday = true;
          else if (r.type === 'once' && r.date) {
              const [y, m, d] = r.date.split('-').map(Number);
              if (now.getFullYear() === y && now.getMonth() + 1 === m && now.getDate() === d) {
                  eventMatchesToday = true;
              }
              eventDate = new Date(y, m - 1, d, hours, minutes, 0, 0);
          }

          const triggers: Date[] = [];
          
          // Add main event if applicable
          if (eventMatchesToday || r.type === 'once') {
             triggers.push(eventDate);
          }

          // Add relative alerts
          const allTriggers = [...triggers];
          if (r.alerts) {
              for (const trigger of triggers) {
                  for (const alert of r.alerts) {
                      const alertDate = new Date(trigger);
                      if (alert.unit === 'minutes') alertDate.setMinutes(alertDate.getMinutes() - alert.value);
                      else if (alert.unit === 'hours') alertDate.setHours(alertDate.getHours() - alert.value);
                      else if (alert.unit === 'days') alertDate.setDate(alertDate.getDate() - alert.value);
                      allTriggers.push(alertDate);
                  }
              }
          }

          for (const t of allTriggers) {
             if (t.getFullYear() === now.getFullYear() &&
                 t.getMonth() === now.getMonth() &&
                 t.getDate() === now.getDate() &&
                 t.getHours() === now.getHours() &&
                 t.getMinutes() === now.getMinutes()) {
                 shouldFire = true;
                 break;
             }
          }
          
          if (r.type === 'once' && now >= eventDate) {
              isMainEventPassed = true;
          }
        }

        if (!shouldFire) continue;

        // Validar spam
        const last = r.lastTriggered instanceof Date
          ? r.lastTriggered
          : (r.lastTriggered && typeof (r.lastTriggered as any).toDate === 'function')
            ? (r.lastTriggered as any).toDate()
            : null;

        if (last) {
          const diffMs = now.getTime() - last.getTime();
          if (r.type === 'budget_alert') {
            if (last.toDateString() === now.toDateString()) {
              continue;
            }
          } else {
            // Permitimos disparar cada minuto, pero prevenimos si es el MISMO minuto exacto
            // O si es menos de 45 segundos para prevenir rebotes de 30s
            if (diffMs < 45000) {
              continue;
            }
          }
        }

        // Actualizar base de datos
        if (r.id) {
          try {
            await updateReminder(r.id, { 
              lastTriggered: now, 
              active: (r.type === 'once' && isMainEventPassed) ? false : r.active 
            });
          } catch (e) {
            console.error('Error updating lastTriggered for reminder:', e);
          }
        }

        // 1. Notificación push
        if (r.pushEnabled) {
          scheduleNotificationViaSW({
            title: r.title,
            body: r.description || 'Recordatorio de Flowi',
            tag: `reminder-${r.id || Date.now()}`,
            data: { reminderId: r.id, url: '/recordatorios' },
          });
        }

        // 2. Notificación in-app
        if (r.inAppEnabled) {
          pushInApp({ 
            title: r.title, 
            body: r.description || 'Recordatorio de Flowi', 
            reminderId: r.id 
          });
        }

        // 3. Sonido
        if (r.sound) {
          playNotificationSound();
        }
      }
    }

    timerRef.current = setInterval(tick, 30000);
    tick();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [reminders, budgetPercent, pushInApp]);
}
