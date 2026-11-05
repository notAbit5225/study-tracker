// You: name, profile picture, daily goals, theme, log out. Exam dates and
// milestones join this page in later phases.
import { getSettings, updateSettings, onSettingsChange } from '../lib/settings.js';
import { uploadAvatar, removeAvatar, checkFile } from '../lib/avatar.js';
import { supabase } from '../lib/supabase.js';
import { esc } from '../lib/html.js';
import { paintAvatar } from '../ui/avatar.js';
import { loadGoals, goalsOn, saveGoals } from '../lib/goals.js';
import { MILESTONES, listEarned } from '../lib/milestones.js';
import { badgeSVG } from '../ui/badges.js';
import { celebrate } from '../ui/celebrate.js';

export function render(view) {
  const s = getSettings();

  view.innerHTML = `
    <header class="page-head">
      <h1>You</h1>
    </header>

    <div class="me">
      <div class="me__col me__col--profile">
      <section class="me__id">
        <div class="me__portrait">
          <span class="avatar avatar--xl" data-avatar></span>
        </div>
        <div class="me__photo-actions">
          <label class="btn btn--quiet">
            <input type="file" accept="image/jpeg,image/png,image/webp" hidden data-file />
            <span data-file-label>${s.avatar_path ? 'Change photo' : 'Add a photo'}</span>
          </label>
          <button class="btn btn--link" type="button" data-remove ${s.avatar_path ? '' : 'hidden'}>remove</button>
          <p class="hint">jpg, png or webp, up to 2 MB. It gets cropped to a circle.</p>
          <p class="form-error" role="alert" data-photo-error hidden></p>
        </div>
      </section>

      <form class="me__name" data-name-form>
        <label class="field">
          <span>What should I call you?</span>
          <input name="display_name" maxlength="40" value="${esc(s.display_name)}" autocomplete="nickname" />
        </label>
        <button class="btn btn--primary" type="submit">Save</button>
        <span class="saved" data-saved hidden>saved</span>
      </form>

      <section class="me__look">
        <h2>Look</h2>
        <div class="switch" role="radiogroup" aria-label="Theme">
          <button type="button" role="radio" data-theme-pick="dark">Dark</button>
          <button type="button" role="radio" data-theme-pick="light">Cream</button>
        </div>
      </section>

      <section class="me__later shelf">
        <h2>Milestones earned</h2>
        <ul class="shelf__list" data-shelf></ul>
      </section>

      <section class="me__device">
        <button class="btn btn--link" type="button" data-logout>Log out on this device</button>
      </section>
      </div>

      <div class="me__col me__col--goals">
      <form class="me__goals" data-goals>
        <h2>Daily goals</h2>
        <p class="hint">Changes count from today. Past days keep the goals they had.</p>
        <div class="goals" data-goal-rows><p class="muted">loading…</p></div>
        <div class="me__goals-save">
          <button class="btn btn--primary" type="submit">Save goals</button>
          <span class="saved" data-goals-saved hidden>saved</span>
          <p class="form-error" role="alert" data-goals-error hidden></p>
        </div>
      </form>

      </div>
    </div>
  `;

  const $ = (sel) => view.querySelector(sel);

  // ── avatar ────────────────────────────────────────────────────────────────
  const avatarEl = $('[data-avatar]');
  const fileInput = $('[data-file]');
  const fileLabel = $('[data-file-label]');
  const removeBtn = $('[data-remove]');
  const photoError = $('[data-photo-error]');
  paintAvatar(avatarEl, s);

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    fileInput.value = ''; // so picking the same file again still triggers change
    if (!file) return;

    const problem = checkFile(file);
    if (problem) return showPhotoError(problem);

    photoError.hidden = true;
    fileLabel.textContent = 'Uploading…';
    try {
      await uploadAvatar(file);
    } catch (err) {
      showPhotoError("Upload didn't work. Try again?");
      console.error(err);
    }
  });

  removeBtn.addEventListener('click', async () => {
    try {
      await removeAvatar();
    } catch (err) {
      showPhotoError("Couldn't remove it. Try again?");
      console.error(err);
    }
  });

  function showPhotoError(msg) {
    photoError.textContent = msg;
    photoError.hidden = false;
    fileLabel.textContent = getSettings().avatar_path ? 'Change photo' : 'Add a photo';
  }

  // ── name ──────────────────────────────────────────────────────────────────
  const nameForm = $('[data-name-form]');
  const saved = $('[data-saved]');
  nameForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = nameForm.display_name.value.trim();
    if (!name) return;
    await updateSettings({ display_name: name });
    saved.hidden = false;
    saved.classList.remove('pop');
    void saved.offsetWidth; // restart the CSS animation
    saved.classList.add('pop');
  });

  // ── goals ─────────────────────────────────────────────────────────────────
  // Each goal is shown as hours + minutes, and stored as total minutes.
  const goalsForm = $('[data-goals]');
  const goalRows = $('[data-goal-rows]');
  const GOAL_ROWS = [
    { kind: 'maths', label: 'Maths' },
    { kind: 'english', label: 'English' },
    { kind: 'georgian', label: 'Georgian' },
    { kind: 'streak_min', label: 'Streak minimum', sub: 'total, any subjects' },
  ];

  loadGoals()
    .then(() => {
      const g = goalsOn();
      goalRows.innerHTML = GOAL_ROWS.map(
        (r) => `
        <div class="goal-row ${r.kind === 'streak_min' ? 'goal-row--min' : ''}" data-subject="${r.kind}">
          <span class="goal-row__name">${r.label}${r.sub ? `<small>${r.sub}</small>` : ''}</span>
          <label class="goal-row__num"><input type="number" name="${r.kind}-h" min="0" max="12" value="${Math.floor(g[r.kind] / 60)}" inputmode="numeric" /> h</label>
          <label class="goal-row__num"><input type="number" name="${r.kind}-m" min="0" max="55" step="5" value="${g[r.kind] % 60}" inputmode="numeric" /> m</label>
        </div>`,
      ).join('');
    })
    .catch((err) => {
      console.error(err);
      goalRows.innerHTML = `<p class="form-error">Couldn't load your goals. Refresh?</p>`;
    });

  goalsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('[data-goals-error]');
    err.hidden = true;

    const goals = {};
    for (const r of GOAL_ROWS) {
      const h = Number(goalsForm[`${r.kind}-h`].value) || 0;
      const m = Number(goalsForm[`${r.kind}-m`].value) || 0;
      goals[r.kind] = Math.round(h * 60 + m);
    }
    if (goals.streak_min < 5) return showErr('Streak minimum needs to be at least 5 minutes.');
    if (Object.values(goals).some((v) => v < 0 || v > 720)) return showErr('Keep each goal between 0 and 12 hours.');

    try {
      await saveGoals(goals);
      const saved = $('[data-goals-saved]');
      saved.hidden = false;
      saved.classList.remove('pop');
      void saved.offsetWidth;
      saved.classList.add('pop');
    } catch (e2) {
      console.error(e2);
      showErr("Didn't save. Try again?");
    }

    function showErr(msg) {
      err.textContent = msg;
      err.hidden = false;
    }
  });

  // ── milestones shelf ──────────────────────────────────────────────────────
  // Earned badges in colour with their date; the rest as faint outlines.
  // Tap an earned one to replay its celebration. (While developing on your
  // laptop with npm run dev, locked ones can be previewed too.)
  const shelf = $('[data-shelf]');
  const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  listEarned()
    .then((earned) => {
      const got = new Map(earned.map((e) => [e.milestone, e.earned_at]));
      shelf.innerHTML = MILESTONES.map((m) => {
        const when = got.get(m.days);
        return `
          <li class="shelf__item ${when ? 'is-earned' : 'is-locked'}">
            <button type="button" data-replay="${m.days}" ${when || import.meta.env.DEV ? '' : 'disabled'}
              aria-label="${m.days} days${when ? ', earned' : ', not yet'}">
              ${badgeSVG(m.days)}
            </button>
            <span class="shelf__name">${when ? m.name : `${m.days} days`}</span>
            <span class="shelf__when">${when ? dateFmt.format(new Date(when)) : `at ${m.days} days`}</span>
          </li>`;
      }).join('');
    })
    .catch((err) => {
      console.error(err);
      shelf.innerHTML = `<li class="muted">Couldn't load milestones.</li>`;
    });

  shelf.addEventListener('click', (e) => {
    const b = e.target.closest('[data-replay]');
    if (b && !b.disabled) celebrate(Number(b.dataset.replay));
  });

  // ── theme ─────────────────────────────────────────────────────────────────
  view.querySelectorAll('[data-theme-pick]').forEach((btn) => {
    btn.addEventListener('click', () => updateSettings({ theme: btn.dataset.themePick }));
  });

  // ── log out ───────────────────────────────────────────────────────────────
  $('[data-logout]').addEventListener('click', () => supabase.auth.signOut());

  // Keep this page in sync whenever settings change (upload finished, theme…)
  function sync(next) {
    paintAvatar(avatarEl, next);
    fileLabel.textContent = next.avatar_path ? 'Change photo' : 'Add a photo';
    removeBtn.hidden = !next.avatar_path;
    view.querySelectorAll('[data-theme-pick]').forEach((b) => {
      b.setAttribute('aria-checked', String(b.dataset.themePick === next.theme));
    });
  }
  sync(s);
  return onSettingsChange(sync); // the unsubscribe fn = this page's cleanup
}
