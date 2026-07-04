// public/sw-reminders.js
// Este SW maneja SOLO las notificaciones de recordatorios.

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'SCHEDULE_NOTIFICATION') return;

  const { title, body, icon, tag, data, delayMs = 0 } = event.data.payload;

  setTimeout(() => {
    self.registration.showNotification(title, {
      body,
      icon: icon || '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: tag || `flowi-${Date.now()}`,
      renotify: true,
      data: data || {},
      actions: [
        { action: 'open', title: 'Abrir Flowi' },
        { action: 'dismiss', title: 'Descartar' },
      ],
      vibrate: [200, 100, 200],
    });
  }, delayMs);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data?.url || '/recordatorios');
      }
    })
  );
});
