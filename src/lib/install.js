// "Install on this device". Chrome fires `beforeinstallprompt` when the site
// can be installed; we keep that event and replay it when you tap our button.
// (You can also always use Chrome's menu → "Install app" / "Add to Home screen".)
let deferred = null;
const listeners = new Set();

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // stop Chrome's own mini-banner; we show a button instead
  deferred = e;
  listeners.forEach((fn) => fn(true));
});

window.addEventListener('appinstalled', () => {
  deferred = null;
  listeners.forEach((fn) => fn(false));
});

// Already running as the installed app?
export const isInstalled = () => window.matchMedia('(display-mode: standalone)').matches;

export function onInstallable(fn) {
  listeners.add(fn);
  fn(Boolean(deferred));
  return () => listeners.delete(fn);
}

export async function promptInstall() {
  if (!deferred) return false;
  deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  listeners.forEach((fn) => fn(false));
  return outcome === 'accepted';
}
