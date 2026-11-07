// lib/notifications.ts

// ── 1. Solicitar permiso de notificaciones ──────────────────────────
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

// ── 2. Mostrar una notificación en la barra del celular ────────────
// Se muestra a través del service worker principal de la app (en Android es la única forma);
// sin service worker (p. ej. en desarrollo) se usa la notificación simple del navegador.
export async function scheduleNotificationViaSW(payload: {
  title: string;
  body: string;
  icon?: string;
  tag?: string;       // evita duplicados
  data?: Record<string, any>;
  delayMs?: number;   // 0 = inmediato
}) {
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return;
  const show = async () => {
    const options: NotificationOptions = {
      body: payload.body,
      icon: payload.icon || '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: payload.tag || `flowi-${Date.now()}`,
      data: { url: '/', ...(payload.data || {}) },
    };
    try {
      const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
      if (reg) await reg.showNotification(payload.title, options);
      else new Notification(payload.title, options);
    } catch (e) {
      console.error('Failed to show notification:', e);
    }
  };
  if (payload.delayMs) setTimeout(show, payload.delayMs);
  else await show();
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
