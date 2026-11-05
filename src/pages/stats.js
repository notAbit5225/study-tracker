// Stats: pick Day / Week / Month / All time, step back with the arrows, and
// everything on the page follows the chosen period.
// Laptop: numbers + chart on the left, streak and focus on the right.
import { loadHistory, sessionsOn } from '../lib/history.js';
import { periodRange, stepAnchor, summarize, byWeek } from '../lib/stats.js';
import { tbilisiDay, formatMinutes } from '../lib/time.js';
import { addDays, prettyDay, shortDay, prettyMonth, monthOf, weekdayMon0 } from '../lib/days.js';
import { SUBJECTS, subjectLabel } from '../lib/subjects.js';
import { esc } from '../lib/html.js';
import { TIMEZONE } from '../config.js';
import { goalsOn } from '../lib/goals.js';
import { mountStackedChart } from '../ui/barchart.js';
import { fireSVG, fireTier } from '../ui/fire.js';

const KINDS = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'all', label: 'All time' },
];
const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const clock = new Intl.DateTimeFormat('en-GB', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit' });

function rangeLabel(kind, r, today) {
  if (kind === 'day') return r.from === today ? `Today, ${shortDay(r.from)}` : prettyDay(r.from);
  if (kind === 'week') {
    const thisWeek = r.from <= today && today <= r.to;
    return `${thisWeek ? 'This week' : 'Week'} · ${shortDay(r.from)} – ${shortDay(r.to)}`;
  }
  if (kind === 'month') return prettyMonth(monthOf(r.from));
  return `Since ${shortDay(r.from)}`;
}

const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : null);

export function render(view) {
  const today = tbilisiDay();
  let kind = 'week';
  let anchor = today;
  let history = null;
  let stopChart = null;

  view.innerHTML = `
    <div class="stats">
      <header class="stats__head">
        <h1>Stats</h1>
        <div class="switch stats__kinds" role="radiogroup" aria-label="Period">
          ${KINDS.map((k) => `<button type="button" role="radio" data-kind="${k.id}">${k.label}</button>`).join('')}
        </div>
        <div class="stats__nav">
          <button class="chip" data-step="-1" aria-label="Earlier">‹</button>
          <p class="stats__range" data-range></p>
          <button class="chip" data-step="1" aria-label="Later">›</button>
        </div>
      </header>
      <div class="stats__grid">
        <section class="stats__main" data-main><p class="muted">adding it up…</p></section>
        <aside class="stats__side" data-side></aside>
      </div>
    </div>`;

  const $ = (s) => view.querySelector(s);

  function draw() {
    stopChart?.();
    stopChart = null;
    view.querySelectorAll('[data-kind]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.kind === kind)));

    const ctx = { start: history.start, today };
    const r = periodRange(kind, anchor, ctx);
    const sum = summarize(history, r.from, r.to);
    $('[data-range]').textContent = rangeLabel(kind, r, today);
    $('[data-step="-1"]').disabled = kind === 'all' || r.from <= history.start;
    $('[data-step="1"]').disabled = kind === 'all' || r.to >= today;

    drawMain(sum, r);
    drawSide(sum, r);
  }

  function drawMain(sum, r) {
    const main = $('[data-main]');
    if (!sum.counted) {
      main.innerHTML = `<p class="stats__nothing">Nothing tracked in this period${
        r.to < history.start ? ` (tracking started ${shortDay(history.start)})` : ''
      }.</p>`;
      return;
    }

    const totalPct = pct(sum.total, sum.targetTotal);
    const tiles = SUBJECTS.map((s) => {
      const done = sum.totals[s.id];
      const target = sum.targets[s.id];
      const p = pct(done, target);
      const diff = done - target;
      return `
        <li class="tile" data-subject="${s.id}">
          <p class="tile__label"><span class="swatch" data-subject="${s.id}"></span>${s.label}</p>
          <p class="tile__value">${formatMinutes(Math.floor(done))}</p>
          <div class="meter"><span style="--p:${Math.min(1, target ? done / target : 1)}"></span></div>
          <p class="tile__sub">${
            p === null ? 'no target' : `${p}% of ${formatMinutes(target)} · ${diff >= 0 ? `${formatMinutes(Math.floor(diff))} ahead` : `${formatMinutes(Math.ceil(-diff))} behind`}`
          }</p>
        </li>`;
    }).join('');

    main.innerHTML = `
      <div class="stats__total">
        <p class="kicker">total</p>
        <p class="stats__big">${formatMinutes(Math.floor(sum.total))}</p>
        <p class="muted">${totalPct === null ? '' : `${totalPct}% of the ${formatMinutes(sum.targetTotal)} your targets add up to`}${
          sum.counted > 1 ? ` · ${formatMinutes(Math.round(sum.total / sum.counted))} a day on average` : ''
        }</p>
      </div>
      <ul class="tiles">${tiles}</ul>
      <section class="stats__chart">
        <h2>${kind === 'day' ? 'Sessions' : kind === 'all' ? 'Hours per week' : 'Hours per day'}</h2>
        <div data-chart></div>
      </section>`;

    const chartEl = $('[data-chart]');
    if (kind === 'day') {
      // one day: the tiles above already show the subjects, so list what you
      // actually did (with your notes) instead of repeating them as bars
      const day = sum.days[0].day;
      chartEl.innerHTML = '<p class="muted">loading…</p>';
      sessionsOn(day)
        .then((list) => {
          chartEl.innerHTML = list.length
            ? `<ul class="ruled cal__list">${list
                .map(
                  (x) => `<li data-subject="${x.subject}">
                    <span><strong>${subjectLabel(x.subject)}</strong> ${formatMinutes(Math.floor(x.focused_seconds / 60))}
                    <em class="muted"> · ${clock.format(new Date(x.started_at))}</em>
                    ${x.distractions ? `<em class="cal__dist">${x.distractions} distracted</em>` : ''}</span>
                    ${x.note ? `<p class="cal__note">${esc(x.note)}</p>` : ''}
                  </li>`,
                )
                .join('')}</ul>`
            : '<p class="muted">Nothing logged this day.</p>';
        })
        .catch((err) => {
          console.error(err);
          chartEl.innerHTML = '';
        });
      return;
    }

    const fullDay = (g) => g.maths + g.english + g.georgian;
    let bars;
    let target = null;
    if (kind === 'all') {
      bars = byWeek(sum.days).map((w) => ({
        key: w.day,
        label: shortDay(w.day).replace(/^\w+ /, ''), // "2 Nov"
        title: `Week of ${shortDay(w.day)}`,
        totals: w.totals,
        highlight: w.day === addDays(today, -weekdayMon0(today)),
      }));
    } else {
      bars = sum.days.map((d) => ({
        key: d.day,
        label: kind === 'week' ? WD[weekdayMon0(d.day)] : String(Number(d.day.slice(8))),
        title: prettyDay(d.day),
        totals: d.totals,
        highlight: d.day === today,
      }));
      target = fullDay(goalsOn(r.to < today ? r.to : today));
    }
    stopChart = mountStackedChart(chartEl, {
      bars,
      target,
      targetLabel: target ? `full day (${formatMinutes(target)})` : '',
    });
  }

  function drawSide(sum, r) {
    // distractions per hour, compared with the period before (if there is one)
    let compare = '';
    if (kind !== 'all' && sum.perHour !== null) {
      const prevAnchor = stepAnchor(kind, anchor, -1);
      const pr = periodRange(kind, prevAnchor, { start: history.start, today });
      const prev = summarize(history, pr.from, pr.to);
      if (prev.perHour !== null) {
        const d = sum.perHour - prev.perHour;
        compare = Math.abs(d) < 0.05
          ? `<p class="tile__sub">same as the ${kind} before</p>`
          : `<p class="tile__sub ${d < 0 ? 'is-good' : 'is-bad'}">${d < 0 ? 'down' : 'up'} from ${prev.perHour.toFixed(1)} the ${kind} before</p>`;
      }
    }

    const best = sum.days
      .filter((d) => d.goals)
      .map((d) => ({ d, t: d.totals.maths + d.totals.english + d.totals.georgian }))
      .sort((a, b) => b.t - a.t)[0];

    const tier = fireTier(history.streak);
    $('[data-side]').innerHTML = `
      <section class="side-tile side-tile--streak">
        <p class="kicker">streak</p>
        <div class="side-streak">
          <div><p class="side-streak__num">${history.streak}</p><p class="tile__sub">current · ${tier.name}</p></div>
          ${fireSVG(history.streak)}
          <div><p class="side-streak__num side-streak__num--best">${history.best}</p><p class="tile__sub">best ever</p></div>
        </div>
      </section>

      <section class="side-tile">
        <p class="kicker">focus</p>
        <p class="side-tile__big">${sum.perHour === null ? '–' : sum.perHour.toFixed(1)}<span>distractions / hour</span></p>
        <p class="tile__sub">${sum.distractions} ${sum.distractions === 1 ? 'tap' : 'taps'} over ${formatMinutes(Math.floor(sum.total))}</p>
        ${compare}
      </section>

      ${
        kind !== 'day' && best && best.t > 0
          ? `<section class="side-tile">
              <p class="kicker">best day here</p>
              <p class="side-tile__big">${formatMinutes(Math.floor(best.t))}</p>
              <p class="tile__sub">${prettyDay(best.d.day)}</p>
            </section>`
          : ''
      }`;
  }

  view.addEventListener('click', (e) => {
    const k = e.target.closest('[data-kind]');
    if (k) {
      kind = k.dataset.kind;
      anchor = today;
      draw();
      return;
    }
    const st = e.target.closest('[data-step]');
    if (st && !st.disabled) {
      anchor = stepAnchor(kind, anchor, Number(st.dataset.step));
      if (anchor > today) anchor = today;
      draw();
    }
  });

  loadHistory()
    .then((h) => {
      history = h;
      draw();
    })
    .catch((err) => {
      console.error(err);
      $('[data-main]').innerHTML = `<p class="form-error">Couldn't load your stats. Refresh?</p>`;
    });

  return () => stopChart?.();
}
