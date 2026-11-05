// The streak block: big current number, best ever, today's status and when
// the next skip day is available. Shown on Today and on the Calendar.
import { formatMinutes } from '../lib/time.js';
import { prettyDay, shortDay, addDays } from '../lib/days.js';

export function streakCardHTML(h) {
  if (!h.started) {
    return `
      <section class="streak-card streak-card--waiting">
        <p class="kicker">streak</p>
        <p class="streak-card__num">0</p>
        <p class="streak-card__line">Counting starts ${prettyDay(h.start)}. Today's a free practice round.</p>
      </section>`;
  }

  const t = h.today;
  const todayLine =
    t.status === 'pending'
      ? `${formatMinutes(Math.ceil(t.minutesLeft))} more today keeps it going.`
      : t.status === 'fullplus'
        ? 'Today: full day and then some.'
        : t.status === 'full'
          ? 'Today: full day. Every subject done.'
          : "Today's in. A full day's still on the table.";

  const best = h.isBest
    ? `<dd class="streak-card__best-yet">this is your best yet</dd>`
    : `<dd>${h.best} ${h.best === 1 ? 'day' : 'days'}</dd>`;

  const skip = h.nextSkip ? `back on ${shortDay(h.nextSkip)}` : 'available if you need it';

  // A heads-up about yesterday, if something happened to the streak.
  const yesterday = h.days.get(addDays(h.todayDay, -1));
  const heads =
    yesterday?.status === 'skip'
      ? `<p class="streak-card__heads">Yesterday was under the minimum. A skip day kept your streak.${
          h.nextSkip ? ` Next one's ready ${shortDay(h.nextSkip)}.` : ''
        }</p>`
      : yesterday?.broke
        ? `<p class="streak-card__heads streak-card__heads--broke">Yesterday ended the streak. Fresh start today.</p>`
        : '';

  return `
    <section class="streak-card ${t.status === 'pending' ? 'is-pending' : 'is-safe'}">
      <p class="kicker">streak</p>
      <p class="streak-card__num" data-streak="${h.streak}">${h.streak}<span>${h.streak === 1 ? 'day' : 'days'}</span></p>
      <p class="streak-card__line">${todayLine}</p>
      ${heads}
      <dl class="streak-card__meta">
        <div><dt>Best</dt>${best}</div>
        <div><dt>Skip day</dt><dd>${skip}</dd></div>
      </dl>
    </section>`;
}
