// Maths mistake log. Laptop: the form on the left (stays in view while you
// scroll), your mistakes on the right. Phone: form, then the list.
import { listMistakes, addMistake, setResolved, deleteMistake, photoUrls } from '../lib/mistakes.js';
import { listTopics } from '../lib/topics.js';
import { PHOTO_TYPES } from '../lib/images.js';
import { esc } from '../lib/html.js';
import { TIMEZONE } from '../config.js';

const dateFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TIMEZONE, day: 'numeric', month: 'short' });
const MAX_ORIGINAL = 15 * 1024 * 1024; // we shrink it anyway; this just stops silly-huge files

export function mountMistakes(el) {
  let mistakes = [];
  let urls = new Map();
  let filter = 'open'; // open | done | all
  let confirmDelete = null;

  el.innerHTML = `
    <div class="mist">
      <form class="mist__form" data-form>
        <h2>Log a mistake</h2>
        <label class="field">
          <span>Topic</span>
          <input name="topic" list="maths-topics" maxlength="200" placeholder="e.g. quadratic inequalities" autocomplete="off" />
          <datalist id="maths-topics"></datalist>
        </label>
        <label class="field field--area">
          <span>The problem</span>
          <textarea name="problem" rows="3" maxlength="4000" placeholder="type it, or just snap a photo below"></textarea>
        </label>
        <div class="mist__photo">
          <label class="btn btn--quiet">
            <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" hidden />
            <span data-photo-label>Add a photo</span>
          </label>
          <img class="mist__preview" data-preview alt="" hidden />
          <button type="button" class="btn btn--link" data-photo-clear hidden>remove</button>
        </div>
        <label class="field field--area">
          <span>What went wrong</span>
          <textarea name="what_went_wrong" rows="3" maxlength="4000" placeholder="e.g. flipped the sign when dividing by a negative"></textarea>
        </label>
        <div class="note__row">
          <button class="btn btn--primary" type="submit">Save mistake</button>
          <span class="saved" data-saved hidden>saved</span>
        </div>
        <p class="form-error" role="alert" data-err hidden></p>
      </form>

      <section class="mist__list-wrap">
        <div class="mist__filters switch" role="radiogroup" aria-label="Show">
          <button type="button" role="radio" data-filter="open">To re-solve</button>
          <button type="button" role="radio" data-filter="done">Re-solved</button>
          <button type="button" role="radio" data-filter="all">All</button>
        </div>
        <ul class="mist__list" data-list><li class="muted">loading…</li></ul>
      </section>
    </div>
    <div class="lightbox" data-lightbox hidden><img alt="" /><p class="muted">tap anywhere to close</p></div>`;

  const $ = (s) => el.querySelector(s);
  const form = $('[data-form]');
  let photoFile = null;

  // ── photo picking ─────────────────────────────────────────────────────────
  form.photo.addEventListener('change', () => {
    const file = form.photo.files[0];
    form.photo.value = '';
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) return showErr("That's not a jpg, png or webp.");
    if (file.size > MAX_ORIGINAL) return showErr('That photo is huge. Try a smaller one?');
    photoFile = file;
    const preview = $('[data-preview]');
    preview.src = URL.createObjectURL(file);
    preview.hidden = false;
    $('[data-photo-clear]').hidden = false;
    $('[data-photo-label]').textContent = 'Change photo';
  });

  $('[data-photo-clear]').addEventListener('click', clearPhoto);
  function clearPhoto() {
    photoFile = null;
    const preview = $('[data-preview]');
    if (preview.src) URL.revokeObjectURL(preview.src);
    preview.hidden = true;
    preview.removeAttribute('src');
    $('[data-photo-clear]').hidden = true;
    $('[data-photo-label]').textContent = 'Add a photo';
  }

  function showErr(msg) {
    const err = $('[data-err]');
    err.textContent = msg;
    err.hidden = false;
  }

  // ── saving ────────────────────────────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    $('[data-err]').hidden = true;
    const fields = {
      topic: form.topic.value,
      problem: form.problem.value,
      what_went_wrong: form.what_went_wrong.value,
      photo: photoFile,
    };
    if (!fields.problem.trim() && !photoFile) return showErr('Add the problem, or a photo of it.');

    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    btn.textContent = photoFile ? 'Uploading…' : 'Saving…';
    try {
      const m = await addMistake(fields);
      mistakes.unshift(m);
      if (m.photo_path) urls = new Map([...urls, ...(await photoUrls([m.photo_path]))]);
      form.reset();
      clearPhoto();
      if (filter === 'done') filter = 'open';
      draw();
      const saved = $('[data-saved]');
      saved.hidden = false;
      saved.classList.remove('pop');
      void saved.offsetWidth;
      saved.classList.add('pop');
    } catch (err) {
      console.error(err);
      showErr("Didn't save. Check your connection and try again.");
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save mistake';
    }
  });

  // ── the list ──────────────────────────────────────────────────────────────
  function cardHTML(m) {
    const url = m.photo_path ? urls.get(m.photo_path) : null;
    return `
      <li class="mcard ${m.needs_resolve ? 'is-open' : 'is-done'}">
        ${url ? `<button type="button" class="mcard__photo" data-zoom="${esc(url)}"><img src="${esc(url)}" alt="photo of the problem" loading="lazy" /></button>` : ''}
        <div class="mcard__body">
          <p class="mcard__meta">${m.topic ? `<strong>${esc(m.topic)}</strong> · ` : ''}${dateFmt.format(new Date(m.created_at))}${
            m.resolved_at ? ` · re-solved ${dateFmt.format(new Date(m.resolved_at))}` : ''
          }</p>
          ${m.problem ? `<p class="mcard__problem">${esc(m.problem)}</p>` : ''}
          ${m.what_went_wrong ? `<p class="mcard__wrong"><span>what went wrong</span>${esc(m.what_went_wrong)}</p>` : ''}
          <div class="mcard__actions">
            ${
              m.needs_resolve
                ? `<button type="button" class="btn btn--quiet" data-resolve="${m.id}">I re-solved it</button>`
                : `<button type="button" class="btn btn--link" data-reopen="${m.id}">needs another go</button>`
            }
            ${
              confirmDelete === m.id
                ? `<span class="topic__confirm">delete? <button type="button" class="btn btn--link" data-del-yes="${m.id}">yes</button> <button type="button" class="btn btn--link" data-del-no>no</button></span>`
                : `<button type="button" class="btn btn--link mcard__del" data-del="${m.id}">delete</button>`
            }
          </div>
        </div>
      </li>`;
  }

  function draw() {
    el.querySelectorAll('[data-filter]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.filter === filter)));
    const shown = mistakes.filter((m) => (filter === 'all' ? true : filter === 'open' ? m.needs_resolve : !m.needs_resolve));
    const open = mistakes.filter((m) => m.needs_resolve).length;
    el.querySelector('[data-filter="open"]').textContent = `To re-solve${open ? ` (${open})` : ''}`;
    $('[data-list]').innerHTML = shown.length
      ? shown.map(cardHTML).join('')
      : `<li class="mist__empty">${
          filter === 'open'
            ? mistakes.length
              ? 'Nothing waiting. Every logged mistake is re-solved.'
              : 'No mistakes logged yet. When you get one wrong, put it here, then come back and re-solve it in a few days.'
            : 'Nothing here yet.'
        }</li>`;
  }

  el.addEventListener('click', async (e) => {
    const f = e.target.closest('[data-filter]');
    if (f) {
      filter = f.dataset.filter;
      draw();
      return;
    }
    const zoom = e.target.closest('[data-zoom]');
    if (zoom) {
      const lb = $('[data-lightbox]');
      lb.querySelector('img').src = zoom.dataset.zoom;
      lb.hidden = false;
      return;
    }
    if (e.target.closest('[data-lightbox]')) {
      $('[data-lightbox]').hidden = true;
      return;
    }

    const res = e.target.closest('[data-resolve], [data-reopen]');
    if (res) {
      const id = Number(res.dataset.resolve ?? res.dataset.reopen);
      const resolved = 'resolve' in res.dataset;
      const m = mistakes.find((x) => x.id === id);
      const before = { ...m };
      m.needs_resolve = !resolved;
      m.resolved_at = resolved ? new Date().toISOString() : null;
      draw();
      try {
        await setResolved(id, resolved);
      } catch (err) {
        console.error(err);
        Object.assign(m, before);
        draw();
      }
      return;
    }

    const del = e.target.closest('[data-del]');
    if (del) {
      confirmDelete = Number(del.dataset.del);
      draw();
      return;
    }
    if (e.target.closest('[data-del-no]')) {
      confirmDelete = null;
      draw();
      return;
    }
    const yes = e.target.closest('[data-del-yes]');
    if (yes) {
      const m = mistakes.find((x) => x.id === Number(yes.dataset.delYes));
      confirmDelete = null;
      try {
        await deleteMistake(m);
        mistakes = mistakes.filter((x) => x !== m);
      } catch (err) {
        console.error(err);
      }
      draw();
    }
  });

  // load mistakes + photo links + topic suggestions
  Promise.all([listMistakes(), listTopics()])
    .then(async ([list, topics]) => {
      mistakes = list;
      urls = await photoUrls(list.map((m) => m.photo_path));
      $('#maths-topics').innerHTML = topics
        .filter((t) => t.subject === 'maths')
        .map((t) => `<option value="${esc(t.title)}"></option>`)
        .join('');
      draw();
    })
    .catch((err) => {
      console.error(err);
      $('[data-list]').innerHTML = `<li class="form-error">Couldn't load your mistakes. Refresh?</li>`;
    });

  return () => {
    const p = $('[data-preview]');
    if (p?.src) URL.revokeObjectURL(p.src);
  };
}
