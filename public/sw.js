// Service worker: a small script the browser keeps alongside the site.
// For now it only does one job: when you tap a timer notification, bring the
// Desk tab to the front (or open it if it was closed).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((tabs) => {
      const tab = tabs.find((t) => t.url.includes(self.registration.scope));
      if (tab) return tab.focus();
      return self.clients.openWindow(`${self.registration.scope}#/timer`);
    }),
  );
});
