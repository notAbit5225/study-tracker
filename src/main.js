// Entry point. Decides between two screens:
//   not logged in → login page
//   logged in     → make sure defaults exist, load settings, show the app
import './styles/tokens.css';
import './styles/base.css';
import './styles/app.css';

import { supabase, isConfigured } from './lib/supabase.js';
import { ensureDefaults, loadSettings } from './lib/settings.js';
import { startRouter } from './lib/router.js';
import { mountShell } from './ui/shell.js';
import { renderLogin } from './pages/login.js';
import * as today from './pages/today.js';
import * as me from './pages/me.js';
import { placeholder } from './pages/placeholder.js';

const root = document.querySelector('#app');

const routes = {
  today,
  timer: placeholder('timer'),
  calendar: placeholder('calendar'),
  stats: placeholder('stats'),
  logbook: placeholder('logbook'),
  me,
};

let teardown = null; // undoes whatever screen is currently showing
let shownFor = undefined; // user id the current screen was built for

async function show(session) {
  const userId = session?.user?.id ?? null;
  if (userId === shownFor) return; // e.g. token refreshed – nothing to redraw
  shownFor = userId;

  teardown?.();
  teardown = null;

  if (!userId) {
    renderLogin(root);
    return;
  }

  root.innerHTML = '<p class="boot">opening your desk…</p>';
  try {
    await ensureDefaults(userId);
    await loadSettings();
  } catch (err) {
    console.error(err);
    root.innerHTML = `<p class="boot">Couldn't load your stuff. Refresh to try again.</p>`;
    return;
  }

  const shell = mountShell(root);
  const stopRouter = startRouter({
    routes,
    fallback: 'today',
    outlet: shell.outlet,
    onChange: shell.setActive,
  });
  teardown = () => {
    stopRouter();
    shell.destroy();
  };
}

if (!isConfigured) {
  root.innerHTML = '<p class="boot">Fill in src/config.js first.</p>';
} else {
  // Fires once on load (INITIAL_SESSION) and again on every login / logout.
  // Supabase warns against awaiting other Supabase calls *inside* this
  // callback, so we hand the work to show() on the next tick with setTimeout.
  supabase.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => show(session), 0);
  });
}
