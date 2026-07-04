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
export function playNotificationSound(type: 'soft' | 'alert' = 'soft') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = type === 'alert' ? 880 : 660;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch (e) {
    // Sin soporte de AudioContext — silencio, no romper la app
  }
}
