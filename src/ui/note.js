// The "what did you study?" box, attached to the latest saved session.
// Notes can be Georgian, English, anything – up to 2000 characters.
import { latestSession, saveNote } from '../lib/sessions.js';
import { subjectLabel } from '../lib/subjects.js';
import { formatMinutes } from '../lib/time.js';
import { esc } from '../lib/html.js';

// Fills `el` with the note form for the newest session. Returns nothing if
// there's no session yet.
export async function mountNote(el) {
  const session = await latestSession();
  if (!session) return;

  const mins = Math.floor(session.focused_seconds / 60);
  el.innerHTML = `
    <form class="note" data-note>
      <label class="note__label" for="note-text">
        What did you study? <span>${subjectLabel(session.subject)}, ${formatMinutes(mins)}</span>
      </label>
      <textarea id="note-text" name="note" rows="3" maxlength="2000"
        placeholder="e.g. quadratic inequalities, ex. 14–30. kept messing up the sign flip">${esc(session.note ?? '')}</textarea>
      <div class="note__row">
        <button class="btn btn--quiet" type="submit">Save note</button>
        <span class="saved" data-saved hidden>saved</span>
        <p class="form-error" role="alert" hidden></p>
      </div>
    </form>`;

  const form = el.querySelector('[data-note]');
  const saved = el.querySelector('[data-saved]');
  const errorEl = el.querySelector('.form-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    try {
      await saveNote(session.id, form.note.value);
      saved.hidden = false;
      saved.classList.remove('pop');
      void saved.offsetWidth;
      saved.classList.add('pop');
    } catch (err) {
      console.error(err);
      errorEl.textContent = "Didn't save. Try again?";
      errorEl.hidden = false;
    }
  });
}
