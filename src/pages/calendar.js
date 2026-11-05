// Calendar: a month grid where every tracked day wears its result.
// Laptop: month on the left; the picked day, your streak and the legend on
// the right. Phone: the same pieces stacked.
import { loadHistory, sessionsOn } from '../lib/history.js';
import { tbilisiDay, formatMinutes } from '../lib/time.js';
import { addDays, addMonths, monthOf, firstOfMonth, daysInMonth, weekdayMon0, prettyDay, prettyMonth } from '../lib/days.js';
import { subjectLabel } from '../lib/subjects.js';
import { esc } from '../lib/html.js';
import { ICONS, STATUS_LABEL } from '../ui/icons.js';
import { streakCardHTML, enableFirePreview } from '../ui/streak-card.js';
import { progressHTML } from '../ui/progress.js';
import { getSettings } from '../lib/settings.js';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function render(view) {
  const today = tbilisiDay();
  let history = null;
  let month = monthOf(today);
  let selected = today;

  view.innerHTML = `
    <div class="cal">
      <section class="cal__month">
        <header class="cal__head">
          <h1 data-month-title></h1>
          <div class="cal__arrows">
            <button class="chip" data-step="-1" aria-label="Previous month">‹</button>
            <button class="chip" data-step="1" aria-label="Next month">›</button>
          </div>
        </header>
        <div class="cal__weekdays">${WEEKDAYS.map((d) => `<span>${d}</span>`).join('')}</div>
        <div class="cal__grid" data-grid><p class="muted">loading…</p></div>
      </section>

      <aside class="cal__side">
        <section class="cal__day" data-day-panel></section>
        <div data-streak></div>
        <section class="legend">
          <h2>What the marks mean</h2>
          <ul>
            ${['fullplus', 'full', 'min', 'skip', 'missed']
              .map((s) => `<li><span class="day day--${s} day--sample">${ICONS[s]}</span>${STATUS_LABEL[s]}</li>`)
              .join('')}
          </ul>
        </section>
      </aside>
    </div>`;

  const $ = (sel) => view.querySelector(sel);

  // which day is which exam: { '2026-06-16': 'maths', … }
  const examOn = {};
  const st = getSettings();
  for (const id of ['maths', 'english', 'georgian']) {
    if (st[`exam_date_${id}`]) examOn[st[`exam_date_${id}`]] = id;
  }

  function drawMonth() {
    $('[data-month-title]').textContent = prettyMonth(month);
    const startMonth = monthOf(history.start < today ? history.start : today);
    $('[data-step="-1"]').disabled = month <= startMonth;
    // you can look ahead up to the month of your last exam
    const lastExam = Object.keys(examOn).sort().at(-1);
    const maxMonth = lastExam && monthOf(lastExam) > monthOf(today) ? monthOf(lastExam) : monthOf(today);
    $('[data-step="1"]').disabled = month >= maxMonth;

    const first = firstOfMonth(month);
    const blanks = weekdayMon0(first); // empty cells before the 1st
    const cells = [];
    for (let i = 0; i < blanks; i++) cells.push('<span class="day day--blank"></span>');

    for (let n = 0; n < daysInMonth(month); n++) {
      const day = addDays(first, n);
      const info = history.days.get(day);
      const kind = day > today ? 'future' : !info ? 'before' : info.status;
      const exam = examOn[day]; // must exist before the class list below uses it
      const classes = [
        'day',
        `day--${kind}`,
        info?.broke ? 'is-broke' : '',
        day === today ? 'is-today' : '',
        day === selected ? 'is-selected' : '',
        exam ? `has-exam exam--${exam}` : '',
      ].join(' ');
      const clickable = kind !== 'future';
      cells.push(`
        <button class="${classes}" data-day="${day}" ${clickable ? '' : 'disabled'}
          aria-label="${prettyDay(day)}${info ? `, ${STATUS_LABEL[info.status]}` : ''}${exam ? `, ${subjectLabel(exam)} exam` : ''}">
          <span class="day__n">${n + 1}</span>
          ${ICONS[kind] ? `<span class="day__icon">${ICONS[kind]}</span>` : ''}
        </button>`);
    }
    $('[data-grid]').innerHTML = cells.join('');
  }

  async function drawDay() {
    const panel = $('[data-day-panel]');
    const info = history.days.get(selected);
    const label = info ? STATUS_LABEL[info.status] : selected < history.start ? 'Before tracking started' : '';
    const brokeNote = info?.broke ? '<p class="cal__broke">This one ended a streak. It happens. Back on it.</p>' : '';

    panel.innerHTML = `
      <p class="kicker">${esc(label)}</p>
      <h2>${prettyDay(selected)}</h2>
      ${brokeNote}
      ${info ? progressHTML(info.totals, info.goals, { past: selected !== today }) : ''}
      <div class="cal__sessions" data-sessions></div>`;

    try {
      const list = await sessionsOn(selected);
      const box = panel.querySelector('[data-sessions]');
      if (!box) return;
      box.innerHTML = list.length
        ? `<h3>Sessions</h3><ul class="ruled cal__list">${list
            .map(
              (s) => `<li data-subject="${s.subject}">
                <span><strong>${subjectLabel(s.subject)}</strong> ${formatMinutes(Math.floor(s.focused_seconds / 60))}
                  ${s.distractions ? `<em class="cal__dist">${s.distractions} distracted</em>` : ''}</span>
                ${s.note ? `<p class="cal__note">${esc(s.note)}</p>` : ''}
              </li>`,
            )
            .join('')}</ul>`
        : `<p class="muted">Nothing logged this day.</p>`;
    } catch (err) {
      console.error(err);
    }
  }

  view.addEventListener('click', (e) => {
    const step = e.target.closest('[data-step]');
    if (step) {
      month = addMonths(month, Number(step.dataset.step));
      drawMonth();
      return;
    }
    const cell = e.target.closest('[data-day]');
    if (cell && !cell.disabled) {
      selected = cell.dataset.day;
      drawMonth();
      drawDay();
    }
  });

  enableFirePreview(view);
  loadHistory()
    .then((h) => {
      history = h;
      $('[data-streak]').innerHTML = streakCardHTML(h);
      drawMonth();
      drawDay();
    })
    .catch((err) => {
      console.error(err);
      $('[data-grid]').innerHTML = `<p class="form-error">Couldn't load the calendar. Refresh?</p>`;
    });
}
