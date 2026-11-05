// The frame around every page: wordmark, navigation, and your avatar.
// Laptop: a sidebar on the left, like a notebook's table of contents.
// Phone:  a slim top bar + a tab bar along the bottom (thumb-reachable).
import { getSettings, onSettingsChange } from '../lib/settings.js';
import { paintAvatar } from './avatar.js';

export const NAV = [
  { id: 'today', label: 'Today' },
  { id: 'timer', label: 'Timer' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'stats', label: 'Stats' },
  { id: 'logbook', label: 'Logbook' },
];

export function mountShell(root) {
  root.innerHTML = `
    <div class="shell">
      <aside class="side">
        <a class="wordmark" href="#/today">Desk<span class="wordmark__sub">exam season, vol. 1</span></a>

        <nav class="tabs" aria-label="Main">
          <ol>
            ${NAV.map(
              (n, i) => `
              <li><a href="#/${n.id}" data-id="${n.id}">
                <span class="tabs__num">${String(i + 1).padStart(2, '0')}</span>
                <span class="tabs__label">${n.label}</span>
              </a></li>`,
            ).join('')}
          </ol>
        </nav>

        <a class="me-link" href="#/me" data-id="me">
          <span class="me-link__avatar"></span>
          <span class="me-link__name"></span>
        </a>
      </aside>

      <main class="outlet" id="outlet"></main>
    </div>
  `;

  const avatarEl = root.querySelector('.me-link__avatar');
  const nameEl = root.querySelector('.me-link__name');
  const paint = (s) => {
    nameEl.textContent = s.display_name; // textContent never runs HTML
    paintAvatar(avatarEl, s);
  };
  paint(getSettings());
  const unsubscribe = onSettingsChange(paint);

  return {
    outlet: root.querySelector('#outlet'),
    setActive(id) {
      root.querySelectorAll('[data-id]').forEach((a) => {
        const on = a.dataset.id === id;
        a.classList.toggle('is-active', on);
        if (on) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      });
    },
    destroy: unsubscribe,
  };
}
