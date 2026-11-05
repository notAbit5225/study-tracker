// Browser notifications.
//
// Why a service worker? On Android, Chrome refuses `new Notification()` and
// only allows notifications shown *through a service worker*. Desktop accepts
// both, so we always go through the service worker. (It also gets us one step
// closer to the installable PWA in Phase 6.)
//
// Notifications only work on "secure" addresses: https://… or localhost.
// The http://192.168.x.x address you use for phone testing doesn't count,
// so test phone notifications on the github.io site.
let registration = null;

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  try {
    registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  } catch (err) {
    console.warn('service worker failed', err);
  }
}

// Must be called from a click (browsers ignore permission requests otherwise).
export function askNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') Notification.requestPermission();
}

export async function notify(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const reg = registration ?? (await navigator.serviceWorker?.ready);
  if (!reg) return;
  reg.showNotification(title, {
    body,
    tag: 'desk-timer', // a new one replaces the old one instead of stacking
    renotify: true,
    silent: true, // our own chime is the sound
    // icon: added in Phase 6 together with the home-screen app icon
  });
}
