// Topic checklist. Laptop: three subject columns side by side. Phone: one
// subject at a time, picked with the tabs at the top.
//
// Everything updates on screen right away ("optimistic"), then saves in the
// background; if a save fails, we put it back and say so.
import { listTopics, addTopic, updateTopic, deleteTopic, nextStatus, STATUS_LABEL } from '../lib/topics.js';
import { SUBJECTS } from '../lib/subjects.js';
import { esc } from '../lib/html.js';

// little hand-drawn status marks: empty, half, full with a tick
const MARK = {
  not_started: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" class="m-ring"/></svg>',
  learning:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" class="m-ring"/><path d="M12 3.5 A8.5 8.5 0 0 1 12 20.5 Z" class="m-fill"/></svg>',
  confident:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" class="m-fill"/><path d="M7.8 12.4l2.9 2.8 5.6-6" class="m-tick"/></svg>',
};

export function mountTopics(el) {
  let topics = [];
  let phoneSubject = 'maths';
  let confirmDelete = null; // id waiting for "really delete?"

  el.innerHTML = `
    <div class="topics">
      <div class="topics__phone-tabs switch" role="tablist">
        ${SUBJECTS.map((s) => `<button type="button" role="tab" data-phone="${s.id}">${s.label}</button>`).join('')}
      </div>
      <div class="topics__cols" data-cols><p class="muted is-loading">loading…</p></div>
      <p class="form-error" role="alert" data-err hidden></p>
    </div>`;

  const cols = el.querySelector('[data-cols]');
  const errEl = el.querySelector('[data-err]');

  function showError(msg) {
    errEl.textContent = msg;
    errEl.hidden = false;
    setTimeout(() => (errEl.hidden = true), 4000);
  }

  function columnHTML(s) {
    const list = topics.filter((t) => t.subject === s.id);
    const n = { not_started: 0, learning: 0, confident: 0 };
    list.forEach((t) => n[t.status]++);
    const total = list.length || 1;
    return `
      <section class="topic-col ${s.id === phoneSubject ? 'is-phone-active' : ''}" data-subject="${s.id}">
        <header class="topic-col__head">
          <h2>${s.label}</h2>
          <p class="topic-col__count">${list.length ? `${n.confident} of ${list.length} confident` : 'nothing yet'}</p>
          <div class="topic-strip" aria-hidden="true">
            <span class="topic-strip__c" style="flex:${n.confident / total}"></span>
            <span class="topic-strip__l" style="flex:${n.learning / total}"></span>
            <span class="topic-strip__n" style="flex:${list.length ? n.not_started / total : 1}"></span>
          </div>
        </header>
        <form class="topic-add" data-add="${s.id}">
          <input name="title" maxlength="200" placeholder="add a topic…" aria-label="New ${s.label} topic" autocomplete="off" />
          <button class="chip" type="submit">add</button>
        </form>
        <ul class="topic-list">
          ${list
            .map(
              (t) => `
            <li class="topic is-${t.status}" data-id="${t.id}">
              <button class="topic__mark" type="button" data-cycle="${t.id}"
                aria-label="${esc(t.title)}: ${STATUS_LABEL[t.status]}. Tap to change.">${MARK[t.status]}</button>
              <span class="topic__title" contenteditable="plaintext-only" spellcheck="false" data-title="${t.id}">${esc(t.title)}</span>
              <span class="topic__status">${STATUS_LABEL[t.status]}</span>
              ${
                confirmDelete === t.id
                  ? `<span class="topic__confirm">delete? <button type="button" class="btn btn--link" data-del-yes="${t.id}">yes</button> <button type="button" class="btn btn--link" data-del-no>no</button></span>`
                  : `<button class="topic__del" type="button" data-del="${t.id}" aria-label="Delete ${esc(t.title)}">×</button>`
              }
            </li>`,
            )
            .join('')}
        </ul>
      </section>`;
  }

  function draw() {
    cols.innerHTML = SUBJECTS.map(columnHTML).join('');
    el.querySelectorAll('[data-phone]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.phone === phoneSubject)));
  }

  el.addEventListener('submit', async (e) => {
    const form = e.target.closest('[data-add]');
    if (!form) return;
    e.preventDefault();
    const title = form.title.value.trim();
    if (!title) return;
    const subject = form.dataset.add;
    form.title.value = '';
    try {
      const pos = Math.max(0, ...topics.filter((t) => t.subject === subject).map((t) => t.position)) + 1;
      topics.push(await addTopic(subject, title, pos));
      draw();
      el.querySelector(`[data-add="${subject}"] input`)?.focus(); // keep typing the next one
    } catch (err) {
      console.error(err);
      form.title.value = title;
      showError("Couldn't add that. Try again?");
    }
  });

  el.addEventListener('click', async (e) => {
    const tab = e.target.closest('[data-phone]');
    if (tab) {
      phoneSubject = tab.dataset.phone;
      draw();
      return;
    }

    const cycle = e.target.closest('[data-cycle]');
    if (cycle) {
      const t = topics.find((x) => x.id === Number(cycle.dataset.cycle));
      const before = t.status;
      t.status = nextStatus(before);
      draw();
      el.querySelector(`[data-id="${t.id}"]`)?.classList.add('just-changed');
      try {
        await updateTopic(t.id, { status: t.status });
      } catch (err) {
        console.error(err);
        t.status = before;
        draw();
        showError("Couldn't save that. Try again?");
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
      const id = Number(yes.dataset.delYes);
      const keep = topics;
      topics = topics.filter((t) => t.id !== id);
      confirmDelete = null;
      draw();
      try {
        await deleteTopic(id);
      } catch (err) {
        console.error(err);
        topics = keep;
        draw();
        showError("Couldn't delete it. Try again?");
      }
    }
  });

  // Rename: the title is editable in place. Enter or clicking away saves.
  el.addEventListener('keydown', (e) => {
    if (e.target.matches('[data-title]') && e.key === 'Enter') {
      e.preventDefault();
      e.target.blur();
    }
  });
  el.addEventListener(
    'blur',
    async (e) => {
      if (!e.target.matches?.('[data-title]')) return;
      const t = topics.find((x) => x.id === Number(e.target.dataset.title));
      const title = e.target.textContent.trim();
      if (!title || title === t.title) {
        e.target.textContent = t.title;
        return;
      }
      const before = t.title;
      t.title = title.slice(0, 200);
      try {
        await updateTopic(t.id, { title: t.title });
      } catch (err) {
        console.error(err);
        t.title = before;
        draw();
        showError("Couldn't rename it. Try again?");
      }
    },
    true, // blur doesn't bubble, so listen in the "capture" phase
  );

  listTopics()
    .then((list) => {
      topics = list;
      draw();
    })
    .catch((err) => {
      console.error(err);
      cols.innerHTML = `<p class="form-error">Couldn't load your topics. Refresh?</p>`;
    });
}
