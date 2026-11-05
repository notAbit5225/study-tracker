// The timer page. It draws whatever state the engine (lib/timer.js) is in.
//
// Two kinds of update:
//  • full redraw – when the state changes (study → rest, paused, added time…)
//  • light update – every second, only the digits and the bar change
import * as timer from '../lib/timer.js';
import { SUBJECTS, subjectLabel } from '../lib/subjects.js';
import { formatClock, formatMinutes } from '../lib/time.js';
import { askNotificationPermission } from '../lib/notify.js';
import { unlockAudio } from '../lib/sound.js';
import { openMiniTimer, miniTimerSupported } from '../ui/mini-timer.js';
import { TIMEZONE } from '../config.js';
import { totalsForDay } from '../lib/sessions.js';
import { loadGoals, goalsOn } from '../lib/goals.js';
import { progressHTML } from '../ui/progress.js';
import { mountNote } from '../ui/note.js';
import { loadHistory } from '../lib/history.js';

const PREFS_KEY = 'desk-timer-prefs';
const clockTime = new Intl.DateTimeFormat('en-GB', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit' });

function loadPrefs() {
  try {
    return { subject: 'maths', study: 90, rest: 10, ...JSON.parse(localStorage.getItem(PREFS_KEY)) };
  } catch {
    return { subject: 'maths', study: 90, rest: 10 };
  }
}

function savePrefs(p) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

function restNote(studyMin) {
  return studyMin < timer.REST_UNLOCK_MIN
    ? `No rest for blocks under ${timer.REST_UNLOCK_MIN}m.`
    : `You can also rest early once you've done ${timer.REST_UNLOCK_MIN}m.`;
}

export function render(view) {
  let drawnKey = null; // what the screen currently shows; redraw when it changes
  let lastStatus = null; // to spot the moment a study block ends
  let summary = null; // shown after you finish / stop
  let confirming = false;
  let undoTimer = null;

  // ── templates ─────────────────────────────────────────────────────────────

  const subjectPicker = (selected, name = 'subject') => `
    <div class="pick" role="radiogroup" aria-label="Subject">
      ${SUBJECTS.map(
        (s) => `
        <label class="pick__opt pick__opt--${s.id}">
          <input type="radio" name="${name}" value="${s.id}" ${s.id === selected ? 'checked' : ''} />
          <span>${s.label}</span>
        </label>`,
      ).join('')}
    </div>`;

  function setupHTML() {
    const p = loadPrefs();
    return `
      <header class="page-head">
        <h1>What are we doing?</h1>
      </header>
      <form class="setup" data-setup>
        ${subjectPicker(p.subject)}

        <div class="len">
          <div class="len__top"><span>Study</span><output data-out="study">${formatMinutes(p.study)}</output></div>
          <input type="range" name="study" min="30" max="240" step="5" value="${p.study}" />
          <div class="len__quick">
            ${[45, 60, 90, 120].map((m) => `<button type="button" class="chip" data-quick="${m}">${formatMinutes(m)}</button>`).join('')}
          </div>
        </div>

        <div class="len ${p.study < timer.REST_UNLOCK_MIN ? 'is-off' : ''}" data-rest-box>
          <div class="len__top"><span>Rest after</span><output data-out="rest">${p.rest}m</output></div>
          <input type="range" name="rest" min="5" max="15" step="1" value="${p.rest}" />
          <p class="hint" data-rest-note>${restNote(p.study)}</p>
        </div>

        <button class="btn btn--primary btn--big" type="submit">Start</button>
      </form>`;
  }

  function studyHTML(s) {
    const r = s.row;
    const paused = s.status === 'paused';
    return `
      <section class="run run--${r.subject} ${paused ? 'is-paused' : ''}">
        <p class="run__label">${subjectLabel(r.subject)} <span>${paused ? 'paused' : 'studying'}</span></p>
        <p class="run__clock" data-clock>${formatClock(s.remainingMs)}</p>
        <div class="ruler" aria-hidden="true"><span class="ruler__fill" data-fill></span></div>
        <p class="run__meta" data-meta></p>
        ${s.restReady ? '' : '<p class="hint run__restnote" data-restnote></p>'}

        <div class="run__controls">
          <button class="btn btn--primary" data-action="${paused ? 'resume' : 'pause'}">${paused ? 'Resume' : 'Pause'}</button>
          ${s.restReady ? '<button class="btn btn--quiet" data-action="rest-now">Rest now</button>' : ''}
          <div class="add">
            <span>add</span>
            ${[5, 15, 30].map((m) => `<button class="chip" data-action="add" data-min="${m}">+${m}m</button>`).join('')}
          </div>
        </div>

        <div class="distract">
          <button class="distract__btn" data-action="distract">got distracted</button>
          <span class="distract__count" data-count>${r.distractions ? `×${r.distractions}` : ''}</span>
          <button class="btn--link btn" data-action="undo" hidden>undo</button>
          <span class="hint distract__key">or press D</span>
        </div>

        <div class="run__end">
          ${
            confirming
              ? `<p class="confirm">Save <strong data-sofar></strong> of ${subjectLabel(r.subject).toLowerCase()} and stop?</p>
                 <button class="btn btn--quiet" data-action="finish-yes">Yes, save it</button>
                 <button class="btn btn--link" data-action="finish-no">keep going</button>`
              : `<button class="btn btn--link" data-action="finish">finish now</button>
                 ${miniTimerSupported ? '<button class="btn btn--link" data-action="popout">pop out mini timer</button>' : ''}`
          }
        </div>
      </section>`;
  }

  function restHTML(s) {
    return `
      <section class="run run--rest">
        <p class="run__label">Rest <span>after ${subjectLabel(s.row.subject).toLowerCase()}</span><em class="stamp" data-stamp hidden>saved</em></p>
        <p class="run__clock" data-clock>${formatClock(s.remainingMs)}</p>
        <div class="ruler" aria-hidden="true"><span class="ruler__fill" data-fill></span></div>
        <p class="run__meta">Stand up. Water. Look at something far away.</p>
        <div class="run__controls">
          <button class="btn btn--quiet" data-action="next">Skip rest, start next round</button>
        </div>
        <div class="run__end">
          <button class="btn btn--link" data-action="done">done for now</button>
          ${miniTimerSupported ? '<button class="btn btn--link" data-action="popout">pop out mini timer</button>' : ''}
        </div>
      </section>
      <div class="after after--rest" data-after></div>`;
  }

  function waitingHTML(s) {
    return `
      <section class="waiting">
        <h1>Rest's over.</h1>
        <p class="muted">Nothing's counting until you're back. Same subject, or switch?</p>
        ${subjectPicker(s.row.subject, 'next-subject')}
        <div class="waiting__go">
          <button class="btn btn--primary btn--big" data-action="next">Next round · ${formatMinutes(s.row.study_minutes)}</button>
          <button class="btn btn--link" data-action="done">done for now</button>
        </div>
      </section>`;
  }

  function summaryHTML() {
    const { saved } = summary;
    const head = saved
      ? saved.minutes >= 1
        ? `<p class="kicker">saved</p><h1>${formatMinutes(saved.minutes)} of ${subjectLabel(saved.subject).toLowerCase()}.</h1>`
        : `<p class="kicker">not saved</p><h1>Under a minute, so I didn't keep it.</h1>`
      : `<p class="kicker">all saved</p><h1>Good stretch.</h1>`;
    return `
      <section class="summary">
        ${head}
        <div class="after" data-after></div>
        <button class="btn btn--primary" data-action="again">Another one</button>
      </section>`;
  }

  // ── drawing ───────────────────────────────────────────────────────────────

  function draw(s) {
    if (s.status !== 'study' && s.status !== 'paused') confirming = false;

    // A short block ended on its own (no rest): show the "saved" screen.
    if (s.status === 'idle' && s.justFinished && !summary) {
      const saved = s.justFinished;
      timer.clearJustFinished();
      showSummary(saved);
      return;
    }
    // A "key" describing what's on screen. Same key → only update numbers.
    const key = summary
      ? 'summary'
      : s.status === 'idle'
        ? 'idle'
        : `${s.status}|${s.row.subject}|${s.row.added_minutes}|${s.row.distractions}|${confirming}|${!!s.restReady}`;

    if (key !== drawnKey) {
      drawnKey = key;
      if (summary) view.innerHTML = summaryHTML();
      else if (s.status === 'idle') view.innerHTML = setupHTML();
      else if (s.status === 'study' || s.status === 'paused') view.innerHTML = studyHTML(s);
      else if (s.status === 'rest') view.innerHTML = restHTML(s);
      else view.innerHTML = waitingHTML(s);

      // A study block just ended (finished, rested early, or stopped): let
      // the next screen arrive with a soft slide, and stamp "saved" on it.
      const studying = (st) => st === 'study' || st === 'paused';
      const now = summary ? 'summary' : s.status;
      if (studying(lastStatus) && !studying(now)) {
        view.firstElementChild?.classList.add('arrive');
        const stamp = view.querySelector('[data-stamp]');
        if (stamp) stamp.hidden = false;
      }

      const after = view.querySelector('[data-after]');
      if (after) fillAfterSession(after);
    }
    lastStatus = summary ? 'summary' : s.status;
    update(s);
  }

  function update(s) {
    if (summary || s.status === 'idle' || s.status === 'waiting') return;
    const clock = view.querySelector('[data-clock]');
    if (clock) {
      clock.textContent = formatClock(s.remainingMs);
      clock.classList.toggle('is-ending', s.status === 'study' && s.remainingMs <= 10_000);
    }
    const fill = view.querySelector('[data-fill]');
    if (fill) fill.style.setProperty('--p', String(1 - s.remainingMs / s.lengthMs));

    if (s.status === 'study' || s.status === 'paused') {
      const r = s.row;
      const added = r.added_minutes ? ` (+${formatMinutes(r.added_minutes)} added)` : '';
      const ends = s.status === 'study' ? ` · ends ${clockTime.format(s.endsAt)}` : ' · paused';
      view.querySelector('[data-meta]').textContent = `of ${formatMinutes(r.study_minutes)}${added}${ends}`;
      const sofar = view.querySelector('[data-sofar]');
      if (sofar) sofar.textContent = formatMinutes(Math.floor(s.focusedMs / 60_000));

      const note = view.querySelector('[data-restnote]');
      if (note) {
        const unlock = timer.REST_UNLOCK_MIN * 60_000;
        note.textContent =
          s.lengthMs < unlock
            ? `Short block, so no rest after it.`
            : `Rest unlocks in ${formatMinutes(Math.ceil((unlock - s.focusedMs) / 60_000))}.`;
      }
    }
  }

  // ── actions ───────────────────────────────────────────────────────────────

  async function run(fn) {
    try {
      await fn();
    } catch (err) {
      console.error(err);
      flash("Couldn't save that. Check your connection and try again.");
    }
  }

  function flash(msg) {
    let el = view.querySelector('.flash');
    if (!el) {
      el = document.createElement('p');
      el.className = 'flash form-error';
      el.setAttribute('role', 'alert');
      view.prepend(el);
    }
    el.textContent = msg;
  }

  function showSummary(saved) {
    summary = { saved };
    drawnKey = null;
    draw(timer.snapshot());
  }

  // Today's bars + the "what did you study?" note for the block just saved.
  async function fillAfterSession(el) {
    el.innerHTML = '<p class="muted is-loading">adding it up…</p>';
    try {
      const [totals] = await Promise.all([totalsForDay(), loadGoals()]);
      el.innerHTML = `<h2 class="after__title">Today so far</h2>${progressHTML(totals, goalsOn())}<div data-note-slot></div>`;
      await mountNote(el.querySelector('[data-note-slot]'));
      loadHistory(); // the block you just saved might have earned a milestone
    } catch (err) {
      console.error(err);
      el.innerHTML = '';
    }
  }

  view.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action], [data-quick]');
    if (!btn) return;

    if (btn.dataset.quick) {
      const form = view.querySelector('[data-setup]');
      form.study.value = btn.dataset.quick;
      form.study.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }

    const action = btn.dataset.action;
    if (action === 'pause') run(timer.pause);
    if (action === 'resume') run(timer.resume);
    if (action === 'add') run(() => timer.addTime(Number(btn.dataset.min)));
    if (action === 'rest-now') run(timer.restNow);
    if (action === 'distract') countDistraction();
    if (action === 'undo') {
      clearTimeout(undoTimer);
      run(() => timer.distracted(-1));
    }
    if (action === 'finish') {
      confirming = true;
      draw(timer.snapshot());
    }
    if (action === 'finish-no') {
      confirming = false;
      draw(timer.snapshot());
    }
    if (action === 'finish-yes') {
      confirming = false;
      run(async () => showSummary(await timer.finishNow()));
    }
    if (action === 'next') {
      const picked = view.querySelector('input[name="next-subject"]:checked')?.value;
      run(() => timer.nextRound(picked));
    }
    if (action === 'done') run(async () => {
      await timer.stop();
      showSummary(null);
    });
    if (action === 'again') {
      summary = null;
      draw(timer.snapshot());
    }
    if (action === 'popout') openMiniTimer();
  });

  function countDistraction() {
    run(() => timer.distracted(1)).then(() => {
      const count = view.querySelector('[data-count]');
      count?.classList.add('wiggle');
      const undo = view.querySelector('[data-action="undo"]');
      if (undo) {
        undo.hidden = false;
        clearTimeout(undoTimer);
        undoTimer = setTimeout(() => (undo.hidden = true), 5000);
      }
    });
  }

  // Setup form: live labels for the sliders, and Start.
  view.addEventListener('input', (e) => {
    if (e.target.name === 'study') {
      const min = Number(e.target.value);
      view.querySelector('[data-out="study"]').textContent = formatMinutes(min);
      view.querySelector('[data-rest-box]').classList.toggle('is-off', min < timer.REST_UNLOCK_MIN);
      view.querySelector('[data-rest-note]').textContent = restNote(min);
    }
    if (e.target.name === 'rest') view.querySelector('[data-out="rest"]').textContent = `${e.target.value}m`;
  });

  view.addEventListener('submit', (e) => {
    const form = e.target;
    if (!form.matches('[data-setup]')) return; // e.g. the note form handles itself
    e.preventDefault();
    const prefs = {
      subject: form.subject.value,
      study: Number(form.study.value),
      rest: Number(form.rest.value),
    };
    savePrefs(prefs);
    // These two need a real click to be allowed, so they happen here.
    unlockAudio();
    askNotificationPermission();
    run(() => timer.startTimer({ subject: prefs.subject, studyMinutes: prefs.study, restMinutes: prefs.rest }));
  });

  // D key = got distracted (not while typing in a box).
  function onKey(e) {
    if (e.key.toLowerCase() !== 'd' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest('input, textarea, select')) return;
    if (timer.snapshot().status === 'study') countDistraction();
  }
  document.addEventListener('keydown', onKey);

  const unsubscribe = timer.onTimer(draw);

  // cleanup when leaving the page
  return () => {
    unsubscribe();
    document.removeEventListener('keydown', onKey);
    clearTimeout(undoTimer);
  };
}
