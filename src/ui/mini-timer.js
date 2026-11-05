// The mini timer: a small always-on-top window (Chrome/Edge on a computer).
//
// It uses the Document Picture-in-Picture API: like YouTube's floating video,
// but the floating window holds a tiny web page we build ourselves. It's the
// same JavaScript as the main tab, so the buttons call the very same timer
// functions, and it subscribes to the same engine for its numbers.
import * as timer from '../lib/timer.js';
import { subjectLabel } from '../lib/subjects.js';
import { formatClock } from '../lib/time.js';

export const miniTimerSupported = 'documentPictureInPicture' in window;

let pipWindow = null;

// The floating window starts empty, with no CSS. Copy our styles into it.
function copyStyles(target) {
  for (const sheet of document.styleSheets) {
    try {
      const style = target.document.createElement('style');
      style.textContent = [...sheet.cssRules].map((r) => r.cssText).join('\n');
      target.document.head.append(style);
    } catch {
      // Stylesheets from other sites (Google Fonts) can't be read, only linked.
      if (sheet.href) {
        const link = target.document.createElement('link');
        link.rel = 'stylesheet';
        link.href = sheet.href;
        target.document.head.append(link);
      }
    }
  }
  target.document.documentElement.dataset.theme = document.documentElement.dataset.theme;
}

export async function openMiniTimer() {
  if (!miniTimerSupported) return;
  if (pipWindow) return pipWindow.focus();

  pipWindow = await window.documentPictureInPicture.requestWindow({ width: 280, height: 190 });
  copyStyles(pipWindow);
  const doc = pipWindow.document;
  doc.title = 'Desk timer';
  doc.body.className = 'mini';
  doc.body.innerHTML = `
    <p class="mini__label" data-label></p>
    <p class="mini__clock" data-clock></p>
    <div class="mini__row">
      <button class="chip" data-act="toggle"></button>
      <button class="distract__btn distract__btn--small" data-act="distract">distracted <span data-count></span></button>
    </div>
  `;

  const $ = (s) => doc.querySelector(s);

  const unsubscribe = timer.onTimer((s) => {
    const studying = s.status === 'study' || s.status === 'paused';
    doc.body.dataset.subject = s.row?.subject ?? '';
    $('[data-label]').textContent =
      s.status === 'idle'
        ? 'no timer running'
        : s.status === 'waiting'
          ? "rest's over"
          : `${s.status === 'rest' ? 'rest' : subjectLabel(s.row.subject)}${s.status === 'paused' ? ' · paused' : ''}`;
    $('[data-clock]').textContent = s.status === 'idle' || s.status === 'waiting' ? '—' : formatClock(s.remainingMs);
    $('[data-act="toggle"]').hidden = !studying;
    $('[data-act="toggle"]').textContent = s.status === 'paused' ? 'resume' : 'pause';
    $('[data-act="distract"]').hidden = s.status !== 'study';
    $('[data-count]').textContent = s.row?.distractions ? `×${s.row.distractions}` : '';
  });

  doc.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    const s = timer.snapshot();
    if (act === 'toggle') (s.status === 'paused' ? timer.resume() : timer.pause()).catch(console.error);
    if (act === 'distract') timer.distracted(1).catch(console.error);
  });

  doc.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'd' && timer.snapshot().status === 'study') timer.distracted(1).catch(console.error);
  });

  pipWindow.addEventListener('pagehide', () => {
    unsubscribe();
    pipWindow = null;
  });
}

export function closeMiniTimer() {
  pipWindow?.close();
}
