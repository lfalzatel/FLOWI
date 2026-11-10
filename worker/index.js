// Código propio que next-pwa agrega al service worker principal de la app (public/sw.js).
// Un solo service worker: así las notificaciones no compiten con el de la app instalada.

// Avisos enviados por la tarea programada (Firebase Cloud Messaging) con la app cerrada
self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (e) { payload = {}; }
  // FCM manda los datos dentro de "data"; también se aceptan en la raíz
  const data = payload.data || payload.notification || payload;
  const title = data.title || 'FLOWI';
  // Para la prueba de Configuración: deja anotado que el aviso del servidor sí llegó
  const note = caches.open('flowi-diag')
    .then(c => c.put('/__last-push', new Response(JSON.stringify({ at: Date.now(), tag: data.tag || '' }))))
    .catch(() => {});
  event.waitUntil(Promise.all([note, self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || `flowi-${Date.now()}`,
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: data.url || '/' },
    })])
  );
});

// Tocar la notificación abre FLOWI (o la trae al frente) en la pantalla indicada
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) client.navigate(url).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow ? self.clients.openWindow(url) : undefined;
    })
  );
});
