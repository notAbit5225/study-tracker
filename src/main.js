// Phase 0 entry point: a setup check page, not the real app yet.
// It proves four things: the build works, fonts + theme load, the Tbilisi day
// is right, and the database is reachable *and locked* to logged-out visitors.

import './styles/tokens.css';
import './styles/base.css';
import './styles/setup-check.css';
import { supabase, isConfigured } from './lib/supabase.js';
import { tbilisiDay } from './lib/time.js';

const app = document.querySelector('#app');

app.innerHTML = `
  <main class="check">
    <p class="check__kicker">phase 0 · setup check</p>
    <h1>Desk is wired up.</h1>
    <p class="check__lede">If every line below is ticked, we're ready for the login.</p>

    <ul class="check__list">
      <li data-row="build"><span class="mark">✓</span> Build runs</li>
      <li data-row="day"><span class="mark">✓</span> <span class="label"></span></li>
      <li data-row="config"><span class="mark">…</span> <span class="label">Checking config</span></li>
      <li data-row="db"><span class="mark">…</span> <span class="label">Asking the database</span></li>
    </ul>

    <p class="check__ka">ქართული ტექსტიც ასე გამოჩნდება — Georgian notes will look like this.</p>

    <button class="check__theme" type="button">try cream mode</button>
  </main>
`;

// Small helper: update one row. textContent (not innerHTML) so any text coming
// from outside can never be interpreted as HTML.
function setRow(name, ok, text) {
  const row = app.querySelector(`[data-row="${name}"]`);
  row.querySelector('.mark').textContent = ok === null ? '…' : ok ? '✓' : '✗';
  row.querySelector('.label').textContent = text;
  row.classList.toggle('is-bad', ok === false);
}

setRow('day', true, `Today in Tbilisi: ${tbilisiDay()}`);

// Theme toggle (the real one will live in settings and be saved).
const themeBtn = app.querySelector('.check__theme');
themeBtn.addEventListener('click', () => {
  const root = document.documentElement;
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  themeBtn.textContent = next === 'dark' ? 'try cream mode' : 'back to dark';
});

async function checkDatabase() {
  if (!isConfigured) {
    setRow('config', false, 'src/config.js still has placeholder values');
    setRow('db', false, 'Skipped until config is filled in');
    return;
  }
  setRow('config', true, 'Supabase URL + key found');

  // We're NOT logged in, so this request runs as the "anon" role.
  // A correct setup must refuse it or return zero rows.
  const { data, error } = await supabase.from('settings').select('*');

  if (error && (error.code === '42P01' || error.code === 'PGRST205')) {
    setRow('db', false, "Connected, but tables are missing. Run 001_init.sql");
  } else if (error && error.code === '42501') {
    setRow('db', true, 'Connected, and logged-out visitors are blocked');
  } else if (error) {
    setRow('db', false, `Couldn't connect: ${error.message}`);
  } else if (data.length === 0) {
    setRow('db', true, 'Connected, and logged-out visitors see nothing');
  } else {
    setRow('db', false, 'Warning: data is visible without logging in. Check RLS');
  }
}

checkDatabase();
