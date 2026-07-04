// lib/notifications.ts

// ── 1. Solicitar permiso de notificaciones ──────────────────────────
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

// ── 2. Registrar Service Worker secundario para recordatorios ──────
export async function registerReminderSW(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw-reminders.js', { scope: '/' });
  } catch (e) {
    console.error('Reminder SW registration failed:', e);
    return null;
  }
}

// ── 3. Despachar notificación push via SW (funciona con app cerrada) ──
export async function scheduleNotificationViaSW(payload: {
  title: string;
  body: string;
  icon?: string;
  tag?: string;       // evita duplicados
  data?: Record<string, any>;
  delayMs?: number;   // 0 = inmediato
}) {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    // Enviar mensaje al SW para que programe la notificación
    reg.active?.postMessage({
      type: 'SCHEDULE_NOTIFICATION',
      payload,
    });
  } catch (e) {
    console.error('Failed to postMessage to Service Worker:', e);
  }
}

// ── 4. Reproducir sonido in-app ────────────────────────────────────
export function playNotificationSound() {
  try {
    if (typeof window === 'undefined') return;
    
    // Check if notifications are disabled globally
    if (localStorage.getItem('notifications_enabled') === 'false') return;

    const soundFile = localStorage.getItem('notification_sound') || 'notification.mp3';
    const audio = new Audio(`/assets/sounds/${soundFile}`);
    audio.play().catch(e => console.error('Failed to play sound:', e));
  } catch (e) {
    // Ignore errors
  }
}
