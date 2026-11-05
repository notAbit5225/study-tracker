// Today: greeting, today's progress per subject, a way into the timer, and
// (on the right) your streak and the exam countdown.
import { getSettings } from '../lib/settings.js';
import { esc } from '../lib/html.js';
import { TIMEZONE } from '../config.js';
import { totalsForDay } from '../lib/sessions.js';
import { goalsOn } from '../lib/goals.js';
import { loadHistory } from '../lib/history.js';
import { streakCardHTML, enableFirePreview } from '../ui/streak-card.js';
import { onTimer } from '../lib/timer.js';
import { progressHTML } from '../ui/progress.js';
import { countdownHTML } from '../ui/countdown.js';
import { tbilisiDay } from '../lib/time.js';
import { pendingReview } from '../lib/reviews.js';

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

// If the streak went up since you last looked, count it up from the old
// number (9 → 10) and give it a little hop. The last number seen is
// remembered per device in localStorage.
function celebrateIfUp(el, streak) {
  let last = null;
  try {
    const raw = localStorage.getItem('desk-last-streak');
    last = raw === null ? null : Number(raw);
    localStorage.setItem('desk-last-streak', String(streak));
  } catch {
    /* ignore */
  }
  if (last === null || streak <= last) return;

  const num = el.querySelector('.streak-card__num');
  const digits = num?.firstChild; // the text node before the flame
  if (!digits || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const from = last;
  const start = performance.now();
  const duration = Math.min(900, 250 + (streak - from) * 60);
  digits.textContent = String(from);
  requestAnimationFrame(function step(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - (1 - t) ** 3; // fast start, gentle landing
    digits.textContent = String(Math.round(from + (streak - from) * eased));
    if (t < 1) requestAnimationFrame(step);
    else num.classList.add('went-up'); // the hop, once the number lands
  });
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

        <div data-review></div>

        <section class="today__progress" data-progress>
          <p class="muted is-loading">adding it up…</p>
        </section>

        <div class="today__go" data-go></div>
      </div>

      <!-- Right-hand column on wide screens: streak + exam countdown, so the
           page grows sideways instead of getting longer. -->
      <aside class="today__side">
        <div data-streak></div>
        <div data-countdown></div>
      </aside>
    </div>
  `;

  const progressEl = view.querySelector('[data-progress]');
  const goEl = view.querySelector('[data-go]');
  const streakEl = view.querySelector('[data-streak]');
  const countdownEl = view.querySelector('[data-countdown]');
  countdownEl.innerHTML = countdownHTML(getSettings(), tbilisiDay());

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

  enableFirePreview(view);
  // Sunday (or a skipped Sunday): nudge toward the weekly review
  pendingReview(tbilisiDay(), getSettings().tracking_start)
    .then((p) => {
      if (!p) return;
      view.querySelector('[data-review]').innerHTML = `
        <a class="review-nudge" href="#/review">
          <span class="review-nudge__k">weekly review</span>
          <span>${p.sunday ? "It's Sunday. Two minutes for your weekly review." : "You skipped last Sunday's review. Want to do it now?"}</span>
          <span class="review-nudge__go">open</span>
        </a>`;
    })
    .catch((err) => console.error(err));

  refresh();
  return unsubscribe;
}
