// Reemplazo del service worker viejo de recordatorios (sw-reminders.js), que se quitó el
// 6 de noviembre de 2026. Algunos celulares lo seguían usando y por eso no mostraban los avisos
// del servidor. Este archivo existe solo para retirarlo: se instala, se borra a sí mismo y
// recarga FLOWI, que entonces queda con el service worker actual (sw.js).

// Mientras se retira, si llega un aviso del servidor igual se muestra
self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (e) { payload = {}; }
  const data = payload.data || payload.notification || payload;
  event.waitUntil(self.registration.showNotification(data.title || 'FLOWI', {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || `flowi-${Date.now()}`,
    data: { url: data.url || '/' },
  }));
});

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const c of clients) { try { await c.navigate(c.url); } catch (e) { /* nada */ } }
  })());
});
