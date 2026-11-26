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
  const show = () => self.registration.showNotification(title, {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || `flowi-${Date.now()}`,
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
  });
  // Mensajes del chat: si FLOWI está en pantalla, la app ya muestra su propio aviso (con sonido); no se repite aquí
  const shown = String(data.tag || '').startsWith('chat-')
    ? self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(list => list.some(c => c.focused && c.url.startsWith(self.location.origin)) ? null : show())
    : show();
  event.waitUntil(Promise.all([note, shown]));
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

// "Compartir con FLOWI" (share_target del manifest): el celular manda aquí la imagen o el texto con POST.
// El sitio es estático, así que lo recibe el service worker: lo guarda en la caché "flowi-share" y abre
// /gastos, donde la app lo toma (lib/shareInbox.ts) y abre el lector de fotos o el formulario.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'POST' || url.origin !== self.location.origin || url.pathname !== '/compartir-recibo') return;
  event.respondWith((async () => {
    try {
      const form = await event.request.formData();
      const file = form.getAll('file').find(f => f && typeof f === 'object' && f.size > 0);
      const text = [form.get('title'), form.get('text'), form.get('url')].filter(v => typeof v === 'string' && v.trim()).join('\n');
      await caches.delete('flowi-share');
      const cache = await caches.open('flowi-share');
      if (file) await cache.put('/__shared-file', new Response(file, { headers: { 'Content-Type': file.type || 'image/jpeg' } }));
      await cache.put('/__shared-meta', new Response(JSON.stringify({ at: Date.now(), text, name: file ? file.name : '', type: file ? file.type : '', hasFile: !!file }), { headers: { 'Content-Type': 'application/json' } }));
    } catch (e) { /* si algo falla, igual se abre FLOWI */ }
    return Response.redirect('/gastos?compartido=1', 303);
  })());
});
