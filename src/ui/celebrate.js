// The milestone celebration: dims the page, the badge plays its own little
// entrance, and a short message. Resolves (like a promise) when you close it,
// so several can play one after another.
import { badgeSVG } from './badges.js';
import { milestoneInfo } from '../lib/milestones.js';
import { chime } from '../lib/sound.js';
import { fireSVG, fireTier } from './fire.js';

export function celebrate(days) {
  return new Promise((resolve) => {
    const info = milestoneInfo(days);
    const el = document.createElement('div');
    el.className = `celebrate celebrate--m${days}`;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'celebrate-title');
    el.innerHTML = `
      <div class="celebrate__card">
        <div class="celebrate__badge">${badgeSVG(days)}</div>
        <p class="kicker">${info.name}</p>
        <h2 id="celebrate-title">${days} days.</h2>
        <p class="celebrate__line">${info.line}</p>
        <p class="celebrate__fire">${fireSVG(days)} New flame unlocked: <strong>${fireTier(days).name}</strong></p>
        <button class="btn btn--primary" type="button">Keep going</button>
      </div>`;

    document.body.append(el);
    const button = el.querySelector('button');
    button.focus({ focusVisible: false }); // focused for the keyboard, no ring flash
    chime('rest-done');

    function close() {
      el.classList.add('is-leaving');
      document.removeEventListener('keydown', onKey);
      setTimeout(() => {
        el.remove();
        resolve();
      }, 260);
    }
    function onKey(e) {
      if (e.key === 'Escape') close();
    }

    button.addEventListener('click', close);
    el.addEventListener('click', (e) => e.target === el && close()); // click outside the card
    document.addEventListener('keydown', onKey);
  });
}
