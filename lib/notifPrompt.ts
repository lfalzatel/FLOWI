// Cuándo y cómo pedir que activen las notificaciones sin ser invasivos.
// Se pide en momentos con sentido (al crear un recordatorio, al pagar algo, al terminar el
// tutorial o desde "Tu siguiente acción"), primero con un mensaje propio y solo si dicen "Sí"
// aparece el permiso del celular, que únicamente se puede pedir una vez.
// Reglas: máximo una ventana por semana; tras 3 "Ahora no" ya no salen ventanas solas
// (queda la tarjeta de "Tu siguiente acción" para quien quiera activarlas).

export type NotificationsState = 'unsupported' | 'enabled' | 'off' | 'blocked' | 'ios-needs-install';

const STATE_KEY = 'flowi_notif_prompt';
const WEEK = 7 * 86400000;
const MAX_DISMISSALS = 3;

export const ASK_EVENT = 'flowi-ask-notifications';
export const CHANGED_EVENT = 'flowi-notifications-changed';

interface PromptState { lastShown: number; dismissals: number }

function readState(): PromptState {
  try { return { lastShown: 0, dismissals: 0, ...JSON.parse(localStorage.getItem(STATE_KEY) || '{}') }; }
  catch { return { lastShown: 0, dismissals: 0 }; }
}
function writeState(s: PromptState) {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(s)); } catch {}
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
function isInstalled(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;
}

export function notificationsState(): NotificationsState {
  if (typeof window === 'undefined') return 'unsupported';
  // En iPhone los avisos solo existen con FLOWI instalada en la pantalla de inicio
  if (isIos() && !isInstalled()) return 'ios-needs-install';
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  let pref: string | null = null;
  try { pref = localStorage.getItem('notifications_enabled'); } catch {}
  if (Notification.permission === 'granted' && pref !== 'false') return 'enabled';
  return 'off';
}

// ¿Se puede mostrar una ventana por iniciativa de la app? (no cuando la persona la pidió)
export function canAutoAsk(now = Date.now()): boolean {
  const state = notificationsState();
  if (state !== 'off' && state !== 'ios-needs-install') return false;
  const s = readState();
  return s.dismissals < MAX_DISMISSALS && now - s.lastShown >= WEEK;
}

export function markShown() {
  writeState({ ...readState(), lastShown: Date.now() });
}

export function markDismissed() {
  const s = readState();
  writeState({ ...s, dismissals: s.dismissals + 1 });
}

// Pide (si toca) que activen los avisos. `force` = la persona tocó algo para activarlos.
export function askForNotifications(opts: { context?: string; force?: boolean } = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ASK_EVENT, { detail: opts }));
}
