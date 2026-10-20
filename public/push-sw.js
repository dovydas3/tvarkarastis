// Įkeliama į pagrindinį service worker (workbox importScripts).
// Rodo serverio atsiųstus priminimus ir paspaudus atidaro programėlę.

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Tvarkaraštis', body: event.data ? event.data.text() : '' };
  }
  const scope = self.registration.scope;
  event.waitUntil(
    self.registration.showNotification(data.title || 'Tvarkaraštis', {
      body: data.body || '',
      tag: data.tag,
      icon: scope + 'pwa-192.png',
      badge: scope + 'pwa-192.png',
      data: { url: scope },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.startsWith(self.registration.scope) && 'focus' in w) return w.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
