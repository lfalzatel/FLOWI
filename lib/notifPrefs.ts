// Preferencias de avisos de ESTE celular (Configuración → Notificaciones). Se guardan en el
// dispositivo: cada celular decide si quiere notificaciones push, avisos dentro de la app, etc.
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };

/** Interruptor general "Activar notificaciones". */
export const notificationsOn = () => read('notifications_enabled') !== 'false';
/** Notificaciones del sistema (barra del celular), con la app abierta o cerrada. */
export const pushOn = () => notificationsOn() && read('push_enabled') !== 'false';
/** Avisos dentro de la app (mensaje arriba y campana). */
export const inAppOn = () => notificationsOn() && read('in_app_enabled') !== 'false';
