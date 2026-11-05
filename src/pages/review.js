// The weekly review: how the week went (left), one question (right), and
// every past answer underneath. URL: #/review (the week that's due) or
// #/review/2026-11-09 (any week, by its Monday).
import { loadHistory } from '../lib/history.js';
import { summarize } from '../lib/stats.js';
import { reviewWeekFor, mondayOf, getReview, saveReview, listReviews } from '../lib/reviews.js';
import { tbilisiDay, formatMinutes } from '../lib/time.js';
import { addDays, shortDay, prettyDay, weekdayMon0 } from '../lib/days.js';
import { SUBJECTS } from '../lib/subjects.js';
import { goalsOn } from '../lib/goals.js';
import { esc } from '../lib/html.js';
import { mountStackedChart } from '../ui/barchart.js';

const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function render(view) {
  const today = tbilisiDay();
  const fromUrl = location.hash.split('/')[2];
  const week = /^\d{4}-\d{2}-\d{2}$/.test(fromUrl ?? '') ? mondayOf(fromUrl) : reviewWeekFor(today);
  const weekEnd = addDays(week, 6);
  let stopChart = null;

  view.innerHTML = `
    <div class="review">
      <header class="page-head">
        <p class="kicker">weekly review</p>
        <h1>${shortDay(week)} – ${shortDay(weekEnd)}</h1>
      </header>
      <div class="review__grid">
        <section class="review__summary" data-summary><p class="muted is-loading">adding it up…</p></section>
        <aside class="review__side">
          <div data-last></div>
          <form class="review__ask" data-ask>
            <label for="review-answer" class="review__q">What will you do differently next week?</label>
            <textarea id="review-answer" name="answer" rows="5" maxlength="2000"
              placeholder="one honest thing. e.g. start georgian before 6, not after dinner"></textarea>
            <div class="note__row">
              <button class="btn btn--primary" type="submit">Save</button>
              <span class="saved" data-saved hidden>saved</span>
              <p class="form-error" role="alert" data-err hidden></p>
            </div>
          </form>
          <section class="review__archive">
            <h2>Past reviews</h2>
            <ul class="review__list" data-archive><li class="muted is-loading">loading…</li></ul>
          </section>
        </aside>
      </div>
    </div>`;

  const $ = (s) => view.querySelector(s);

  // ── the summary ─────────────────────────────────────────────────────────
  loadHistory()
    .then((h) => {
      const sum = summarize(h, week, weekEnd);
      const prev = summarize(h, addDays(week, -7), addDays(week, -1));
      const count = (st) => sum.days.filter((d) => (Array.isArray(st) ? st.includes(d.status) : d.status === st)).length;

      if (!sum.counted) {
        $('[data-summary]').innerHTML = `<p class="stats__nothing">Nothing tracked this week.</p>`;
        return;
      }

      const best = sum.days
        .filter((d) => d.goals)
        .map((d) => ({ d, t: d.totals.maths + d.totals.english + d.totals.georgian }))
        .sort((a, b) => b.t - a.t)[0];

      const focus =
        sum.perHour === null
          ? '–'
          : `${sum.perHour.toFixed(1)}${
              prev.perHour !== null
                ? ` <span class="${sum.perHour <= prev.perHour ? 'is-good' : 'is-bad'}">(${sum.perHour <= prev.perHour ? 'down' : 'up'} from ${prev.perHour.toFixed(1)})</span>`
                : ''
            }`;

      const totalDiff = prev.counted ? sum.total - prev.total : null;

      $('[data-summary]').innerHTML = `
        <p class="stats__big">${formatMinutes(Math.floor(sum.total))}</p>
        <p class="muted review__vs">${
          totalDiff === null
            ? 'your first tracked week'
            : `${totalDiff >= 0 ? '+' : '−'}${formatMinutes(Math.abs(Math.round(totalDiff)))} vs the week before`
        }</p>

        <ul class="review__days">
          <li><span class="day day--full day--sample"></span><strong>${count(['full', 'fullplus'])}</strong> full</li>
          <li><span class="day day--min day--sample"></span><strong>${count('min')}</strong> minimum</li>
          <li><span class="day day--skip day--sample"></span><strong>${count('skip')}</strong> skip</li>
          <li><span class="day day--missed day--sample"></span><strong>${count('missed')}</strong> missed</li>
        </ul>

        <ul class="review__subjects">
          ${SUBJECTS.map((s) => {
            const done = sum.totals[s.id];
            const target = sum.targets[s.id];
            return `<li data-subject="${s.id}">
              <span class="swatch" data-subject="${s.id}"></span>
              <span>${s.label}</span>
              <strong>${formatMinutes(Math.floor(done))}</strong>
              <em>${target ? `${Math.round((done / target) * 100)}% of ${formatMinutes(target)}` : ''}</em>
            </li>`;
          }).join('')}
        </ul>

        <dl class="review__facts">
          <div><dt>Best day</dt><dd>${best && best.t ? `${WD[weekdayMon0(best.d.day)]}, ${formatMinutes(Math.floor(best.t))}` : '–'}</dd></div>
          <div><dt>Distractions / hour</dt><dd>${focus}</dd></div>
          <div><dt>Streak now</dt><dd>${h.streak} ${h.streak === 1 ? 'day' : 'days'}</dd></div>
        </dl>

        <div class="review__chart" data-chart></div>`;

      stopChart = mountStackedChart($('[data-chart]'), {
        bars: sum.days.map((d) => ({
          key: d.day,
          label: WD[weekdayMon0(d.day)],
          title: prettyDay(d.day),
          totals: d.totals,
          highlight: d.day === today,
        })),
        target: (() => {
          const g = goalsOn(weekEnd < today ? weekEnd : today);
          return g.maths + g.english + g.georgian;
        })(),
        targetLabel: 'full day',
      });
    })
    .catch((err) => {
      console.error(err);
      $('[data-summary]').innerHTML = `<p class="form-error">Couldn't load the week. Refresh?</p>`;
    });

  // ── last week's promise + this week's answer + the archive ─────────────
  Promise.all([getReview(addDays(week, -7)), getReview(week), listReviews()])
    .then(([last, current, all]) => {
      if (last) {
        $('[data-last]').innerHTML = `
          <blockquote class="review__last">
            <p class="kicker">last week you said</p>
            <p>${esc(last.answer)}</p>
            <p class="muted">Did you?</p>
          </blockquote>`;
      }
      if (current) $('[data-ask]').answer.value = current.answer;
      drawArchive(all);
    })
    .catch((err) => console.error(err));

  function drawArchive(all) {
    $('[data-archive]').innerHTML = all.length
      ? all
          .map(
            (r) => `<li>
              <a href="#/review/${r.week_start}">${shortDay(r.week_start)} – ${shortDay(addDays(r.week_start, 6))}</a>
              <p>${esc(r.answer)}</p>
            </li>`,
          )
          .join('')
      : '<li class="muted">This is your first one.</li>';
  }

  $('[data-ask]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const err = $('[data-err]');
    err.hidden = true;
    if (!form.answer.value.trim()) {
      err.textContent = 'Write at least one thing.';
      err.hidden = false;
      return;
    }
    try {
      await saveReview(week, form.answer.value);
      const saved = $('[data-saved]');
      saved.hidden = false;
      saved.classList.remove('pop');
      void saved.offsetWidth;
      saved.classList.add('pop');
      drawArchive(await listReviews());
    } catch (e2) {
      console.error(e2);
      err.textContent = "Didn't save. Try again?";
      err.hidden = false;
    }
  });

  return () => stopChart?.();
}
