// Exam countdown: all three exams, the next one up front and big.
import { SUBJECTS } from '../lib/subjects.js';
import { daysBetween, shortDay } from '../lib/days.js';

// → [{ id, label, date, days }] sorted: upcoming first (soonest first),
//   then not-set, then already past.
export function examList(settings, today) {
  const list = SUBJECTS.map((s) => {
    const date = settings[`exam_date_${s.id}`];
    return { id: s.id, label: s.label, date, days: date ? daysBetween(today, date) : null };
  });
  const rank = (e) => (e.days === null ? 1 : e.days < 0 ? 2 : 0);
  return list.sort((a, b) => rank(a) - rank(b) || (a.days ?? 0) - (b.days ?? 0));
}

const daysWord = (n) => (n === 1 ? 'day' : 'days');

export function countdownHTML(settings, today) {
  const list = examList(settings, today);
  const next = list.find((e) => e.days !== null && e.days >= 0);

  if (!list.some((e) => e.date)) {
    return `
      <section class="exams exams--empty">
        <p class="kicker">exams</p>
        <p class="exams__empty">No dates yet. <a href="#/me">Add them on your page</a> once they're announced.</p>
      </section>`;
  }

  const rows = list
    .filter((e) => e !== next)
    .map((e) => {
      const right =
        e.days === null
          ? `<a href="#/me">set date</a>`
          : e.days < 0
            ? `<em>done</em>`
            : `<strong>${e.days}</strong> ${daysWord(e.days)}`;
      return `
        <li class="exams__row ${e.days !== null && e.days < 0 ? 'is-past' : ''}" data-subject="${e.id}">
          <span class="exams__name">${e.label}</span>
          <span class="exams__date">${e.date ? shortDay(e.date) : ''}</span>
          <span class="exams__days">${right}</span>
        </li>`;
    })
    .join('');

  const hero = next
    ? `
      <div class="exams__next" data-subject="${next.id}">
        <p class="exams__next-label">${next.label} <span>${shortDay(next.date)}</span></p>
        <p class="exams__next-days">${next.days === 0 ? 'Today.' : next.days}${
          next.days === 0 ? '' : `<span>${daysWord(next.days)} to go</span>`
        }</p>
        ${next.days > 0 && next.days <= 14 ? `<p class="exams__close">Two weeks or less. Revision mode.</p>` : ''}
      </div>`
    : `<p class="exams__empty">All exams are behind you. Go outside.</p>`;

  return `
    <section class="exams">
      <p class="kicker">exams</p>
      ${hero}
      ${rows ? `<ul class="exams__rest">${rows}</ul>` : ''}
    </section>`;
}
