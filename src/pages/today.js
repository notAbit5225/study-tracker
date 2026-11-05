// Today. In Phase 1 it's just a greeting and the plan for the page; progress
// bars, streak and countdown move in over the next phases.
import { getSettings } from '../lib/settings.js';
import { esc } from '../lib/html.js';
import { TIMEZONE } from '../config.js';

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

export function render(view) {
  const s = getSettings();
  view.innerHTML = `
    <header class="page-head page-head--today">
      <p class="kicker">${esc(prettyDate())}</p>
      <h1>${greeting()}, ${esc(s.display_name)}.</h1>
    </header>

    <section class="note-sheet">
      <h2>What lives here soon</h2>
      <ul class="ruled">
        <li><span>today's bars for maths, english, georgian</span><em>phase 3</em></li>
        <li><span>your streak</span><em>phase 4</em></li>
        <li><span>days until each exam</span><em>phase 6</em></li>
      </ul>
    </section>

    <a class="btn btn--primary today__start" href="#/timer">Start studying</a>
  `;
}
