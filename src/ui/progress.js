// Today's progress: one bar per subject (done vs. target, and what's left),
// plus a line for the streak minimum and the "full day".
// Used on the Today page and after each study block.
import { SUBJECTS } from '../lib/subjects.js';
import { formatMinutes } from '../lib/time.js';
import { dayStatus } from '../lib/goals.js';

// past = true when showing an earlier day (the calendar), so the wording
// doesn't talk about "today".
export function progressHTML(totals, goals, { past = false } = {}) {
  const status = dayStatus(totals, goals);

  const rows = SUBJECTS.map((s) => {
    const done = Math.floor(totals[s.id]);
    const target = goals[s.id];
    const pct = target ? Math.min(1, done / target) : 1;
    const left = Math.max(0, target - done);
    const hit = done >= target;
    const extra = done - target;

    const side = !target
      ? 'no target'
      : hit
        ? extra >= 1
          ? `done, +${formatMinutes(extra)} extra`
          : 'done'
        : `${formatMinutes(left)} to go`;

    return `
      <li class="bar bar--${s.id} ${hit ? 'is-hit' : ''}" data-subject="${s.id}">
        <div class="bar__top">
          <span class="bar__name">${s.label}</span>
          <span class="bar__nums">${formatMinutes(done)} <span>/ ${formatMinutes(target)}</span></span>
        </div>
        <div class="bar__track"><span class="bar__fill" style="--p:${pct}"></span></div>
        <p class="bar__left">${side}</p>
      </li>`;
  }).join('');

  const minLeft = Math.max(0, goals.streak_min - Math.floor(status.total));
  const verdict = status.full
    ? `<p class="verdict verdict--full">Full day. Every subject hit its target.</p>`
    : status.minimum
      ? `<p class="verdict verdict--min">${past ? 'Minimum hit.' : "Streak's safe for today. Keep going for a full day."}</p>`
      : `<p class="verdict">${past ? `Under the minimum by ${formatMinutes(minLeft)}.` : `${formatMinutes(minLeft)} more (any subject) keeps the streak.`}</p>`;

  return `
    <div class="progress">
      <ul class="bars">${rows}</ul>
      <div class="progress__foot">
        <p class="progress__total">${formatMinutes(Math.floor(status.total))} total${past ? '' : ' today'}</p>
        ${verdict}
      </div>
    </div>`;
}
