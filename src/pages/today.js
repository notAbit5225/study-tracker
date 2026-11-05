// Today: greeting, today's progress per subject, and a way into the timer.
// Streak (phase 4) and exam countdown (phase 6) join later.
import { getSettings } from '../lib/settings.js';
import { esc } from '../lib/html.js';
import { TIMEZONE } from '../config.js';
import { totalsForDay } from '../lib/sessions.js';
import { goalsOn } from '../lib/goals.js';
import { loadHistory } from '../lib/history.js';
import { streakCardHTML } from '../ui/streak-card.js';
import { onTimer } from '../lib/timer.js';
import { progressHTML } from '../ui/progress.js';

function greeting() {
  // The hour in Tbilisi, not on the device clock.
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: TIMEZONE, hour: 'numeric', hourCycle: 'h23' }).format(new Date()),
  );
  if (hour < 5) return 'Up late';
  if (hour < 12) return 'Morning';
  if (hour < 18) return 'Afternoon';
  return 'Evening';
}

function prettyDate() {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TIMEZONE, weekday: 'long', day: 'numeric', month: 'long' }).format(
    new Date(),
  );
}

// If the streak went up since you last looked, give the number a little
// hop. The last number seen is remembered per device in localStorage.
function celebrateIfUp(el, streak) {
  let last = null;
  try {
    last = Number(localStorage.getItem('desk-last-streak'));
    localStorage.setItem('desk-last-streak', String(streak));
  } catch {
    /* ignore */
  }
  if (last !== null && streak > last) el.querySelector('.streak-card__num')?.classList.add('went-up');
}

export function render(view) {
  const s = getSettings();
  view.innerHTML = `
    <div class="today">
      <div class="today__main">
        <header class="page-head page-head--today">
          <p class="kicker">${esc(prettyDate())}</p>
          <h1>${greeting()}, ${esc(s.display_name)}.</h1>
        </header>

        <section class="today__progress" data-progress>
          <p class="muted">adding it up…</p>
        </section>

        <div class="today__go" data-go></div>
      </div>

      <!-- Right-hand column on wide screens: streak (phase 4) and exam
           countdown (phase 6) move in here, so the page grows sideways
           instead of getting longer. -->
      <aside class="today__side">
        <div data-streak></div>
        <section class="note-sheet today__soon">
          <h2>Coming soon</h2>
          <ul class="ruled">
            <li><span>days until each exam</span><em>phase 6</em></li>
          </ul>
        </section>
      </aside>
    </div>
  `;

  const progressEl = view.querySelector('[data-progress]');
  const goEl = view.querySelector('[data-go]');
  const streakEl = view.querySelector('[data-streak]');

  async function refresh() {
    try {
      const [totals, history] = await Promise.all([totalsForDay(), loadHistory()]);
      progressEl.innerHTML = progressHTML(totals, goalsOn());
      streakEl.innerHTML = streakCardHTML(history);
      celebrateIfUp(streakEl, history.streak);
    } catch (err) {
      console.error(err);
      progressEl.innerHTML = `<p class="form-error">Couldn't load today's numbers. Refresh?</p>`;
    }
  }

  // Redo the numbers whenever the timer changes state (e.g. a block just
  // got saved), and swap the button between "start" and "back to it".
  let lastStatus = null;
  const unsubscribe = onTimer((t) => {
    if (t.status === lastStatus) return;
    const first = lastStatus === null;
    lastStatus = t.status;
    goEl.innerHTML =
      t.status === 'idle'
        ? `<a class="btn btn--primary" href="#/timer">Start studying</a>`
        : `<a class="btn btn--quiet" href="#/timer">Back to the timer</a>`;
    if (!first) refresh();
  });

  refresh();
  return unsubscribe;
}
