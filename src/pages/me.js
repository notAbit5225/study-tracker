// You: name, profile picture, theme, log out. Targets, streak minimum, exam
// dates and milestones join this page in later phases.
import { getSettings, updateSettings, onSettingsChange } from '../lib/settings.js';
import { uploadAvatar, removeAvatar, checkFile } from '../lib/avatar.js';
import { supabase } from '../lib/supabase.js';
import { esc } from '../lib/html.js';
import { paintAvatar } from '../ui/avatar.js';

export function render(view) {
  const s = getSettings();

  view.innerHTML = `
    <header class="page-head">
      <h1>You</h1>
    </header>

    <div class="me">
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

      <section class="me__later">
        <h2>Milestones</h2>
        <p class="muted">None yet. The first one's at 10 days.</p>
      </section>

      <section class="me__device">
        <button class="btn btn--link" type="button" data-logout>Log out on this device</button>
      </section>
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
