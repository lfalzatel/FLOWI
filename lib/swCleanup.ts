// Asegura que FLOWI use su service worker actual (/sw.js). Algunos celulares quedaron con el
// viejo /sw-reminders.js, que no muestra los avisos del servidor: aquí se quita y se registra el
// bueno. Devuelve el registro de /sw.js ya activo, o null si no se puede (desarrollo, sin soporte).
export async function ensureMainServiceWorker(): Promise<{ registration: ServiceWorkerRegistration; replaced: boolean } | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  if (process.env.NODE_ENV !== 'production') return null; // en desarrollo no hay sw.js
  let replaced = false;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const r of regs) {
      const url = (r.active || r.waiting || r.installing)?.scriptURL || '';
      if (url && !url.endsWith('/sw.js')) {
        await r.unregister();
        replaced = true;
      }
    }
    let registration = await navigator.serviceWorker.getRegistration('/');
    const current = registration && (registration.active || registration.waiting || registration.installing)?.scriptURL;
    if (!registration || !current?.endsWith('/sw.js')) {
      registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      replaced = true;
    }
    // Espera a que quede activo (máximo 10 s)
    for (let i = 0; i < 20 && !registration.active; i++) await new Promise(r => setTimeout(r, 500));
    if (!registration.active) return null;
    return { registration, replaced };
  } catch (e) {
    console.warn('No se pudo revisar el service worker:', e);
    return null;
  }
}
