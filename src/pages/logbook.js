// Logbook: two tabs, Topics and Maths mistakes.
// URLs: #/logbook (topics) and #/logbook/mistakes – so the tab survives a
// refresh and the browser's back button works.
import { mountTopics } from '../ui/topics-view.js';
import { mountMistakes } from '../ui/mistakes-view.js';

export function render(view) {
  const tab = location.hash.split('/')[2] === 'mistakes' ? 'mistakes' : 'topics';

  view.innerHTML = `
    <header class="page-head logbook__head">
      <h1>Logbook</h1>
      <nav class="logbook__tabs" aria-label="Logbook sections">
        <a href="#/logbook" class="${tab === 'topics' ? 'is-on' : ''}">Topics</a>
        <a href="#/logbook/mistakes" class="${tab === 'mistakes' ? 'is-on' : ''}">Maths mistakes</a>
      </nav>
    </header>
    <div data-tab></div>`;

  const box = view.querySelector('[data-tab]');
  const result = tab === 'mistakes' ? mountMistakes(box) : mountTopics(box);
  return typeof result === 'function' ? result : undefined;
}
