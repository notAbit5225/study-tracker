// Stacked column chart: hours per day (or per week), split by subject.
//
// Drawn as SVG in real pixels: we measure the container, then lay out the
// bars. A ResizeObserver redraws when the width changes (phone rotating,
// window resizing), so text never gets squashed.
//
// Chart rules followed here: bars at most 24px wide with a 4px rounded top,
// square at the baseline; a 2px gap between stacked pieces; hairline grid;
// one axis; a legend; hover tooltips; and a table view as the fallback.
import { SUBJECTS } from '../lib/subjects.js';
import { formatMinutes } from '../lib/time.js';
import { esc } from '../lib/html.js';

const H = 230; // chart height in px
const PAD = { top: 14, right: 8, bottom: 26, left: 34 };
const NICE_STEPS = [0.5, 1, 2, 3, 4, 5, 10, 20, 40, 60]; // hours

function niceStep(maxHours) {
  return NICE_STEPS.find((s) => maxHours / s <= 4) ?? 100;
}

// top-rounded rectangle (4px data-end), square at the baseline
function columnPath(x, y, w, h, r) {
  r = Math.min(r, h, w / 2);
  return `M${x} ${y + h} V${y + r} Q${x} ${y} ${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h} Z`;
}

// bars: [{ key, label (x-axis), title (tooltip heading), totals:{maths,…}, highlight }]
// target: minutes for a reference line (or null)
export function mountStackedChart(el, { bars, target = null, targetLabel = '' }) {
  el.classList.add('chart');
  el.innerHTML = `
    <ul class="chart__legend">
      ${SUBJECTS.map((s) => `<li><span class="swatch" data-subject="${s.id}"></span>${s.label}</li>`).join('')}
      ${target ? `<li><span class="swatch swatch--line"></span>${esc(targetLabel)}</li>` : ''}
    </ul>
    <div class="chart__plot"></div>
    <div class="chart__tip" role="status" hidden></div>
    <button class="btn btn--link chart__table-toggle" type="button">show as a table</button>
    <div class="chart__table" hidden></div>`;

  const plot = el.querySelector('.chart__plot');
  const tip = el.querySelector('.chart__tip');
  const tableBox = el.querySelector('.chart__table');
  const toggle = el.querySelector('.chart__table-toggle');

  function draw() {
    const W = Math.max(280, plot.clientWidth);
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;

    const sums = bars.map((b) => b.totals.maths + b.totals.english + b.totals.georgian);
    const maxMin = Math.max(60, ...sums, target ?? 0);
    const step = niceStep(maxMin / 60);
    const topH = Math.ceil(maxMin / 60 / step) * step;
    const y = (min) => PAD.top + innerH - (min / 60 / topH) * innerH;

    const band = innerW / bars.length;
    const barW = Math.max(3, Math.min(24, band * 0.68));
    // label every bar if there's room, otherwise every 2nd, 5th…
    const every = band >= 26 ? 1 : band >= 13 ? 2 : band >= 6 ? 5 : 7;
    // today's (highlighted) bar always gets its label; the regular labels too
    // close to it are dropped so they can't collide
    const hl = bars.findIndex((b) => b.highlight);
    const labelled = new Set();
    bars.forEach((_, i) => {
      if (i % every === 0 && (hl < 0 || Math.abs(i - hl) >= Math.max(every, 2) || every === 1)) labelled.add(i);
    });
    if (hl >= 0) labelled.add(hl);

    let grid = '';
    for (let v = 0; v <= topH + 1e-9; v += step) {
      const yy = y(v * 60);
      grid += `<line x1="${PAD.left}" x2="${W - PAD.right}" y1="${yy}" y2="${yy}" class="chart__grid"/>`;
      grid += `<text x="${PAD.left - 6}" y="${yy + 4}" class="chart__ytick">${v}h</text>`;
    }

    let marks = '';
    bars.forEach((b, i) => {
      const cx = PAD.left + band * i + band / 2;
      const x = cx - barW / 2;
      let base = y(0);
      const parts = SUBJECTS.map((s) => ({ id: s.id, min: b.totals[s.id] })).filter((p) => p.min > 0.5);
      parts.forEach((p, j) => {
        const h = (p.min / 60 / topH) * innerH;
        const isTop = j === parts.length - 1;
        const gap = isTop ? 0 : 2; // surface gap between stacked pieces
        const top = base - h;
        marks += isTop
          ? `<path d="${columnPath(x, top, barW, Math.max(1, h), 4)}" class="chart__seg" data-subject="${p.id}"/>`
          : `<rect x="${x}" y="${top + gap}" width="${barW}" height="${Math.max(0.5, h - gap)}" class="chart__seg" data-subject="${p.id}"/>`;
        base = top;
      });
      if (labelled.has(i)) {
        marks += `<text x="${cx}" y="${H - 8}" class="chart__xtick ${b.highlight ? 'is-hl' : ''}">${esc(b.label)}</text>`;
      }
      // invisible, full-height hit area so hovering near a bar works
      marks += `<rect x="${PAD.left + band * i}" y="${PAD.top}" width="${band}" height="${innerH}" class="chart__hit" data-i="${i}"/>`;
    });

    const targetLine = target
      ? `<line x1="${PAD.left}" x2="${W - PAD.right}" y1="${y(target)}" y2="${y(target)}" class="chart__target"/>`
      : '';

    plot.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img"
      aria-label="Hours studied, ${bars.length} bars. Use the table below for exact numbers.">
      ${grid}${targetLine}${marks}</svg>`;
  }

  // tooltip
  plot.addEventListener('pointermove', (e) => {
    const hit = e.target.closest('.chart__hit');
    if (!hit) return (tip.hidden = true);
    const b = bars[Number(hit.dataset.i)];
    const sum = b.totals.maths + b.totals.english + b.totals.georgian;
    tip.innerHTML = `<strong>${esc(b.title)}</strong>
      ${SUBJECTS.map((s) => `<span><i class="swatch" data-subject="${s.id}"></i>${s.label} ${formatMinutes(Math.floor(b.totals[s.id]))}</span>`).join('')}
      <span class="chart__tip-total">Total ${formatMinutes(Math.floor(sum))}</span>`;
    tip.hidden = false;
    const box = el.getBoundingClientRect();
    const r = hit.getBoundingClientRect();
    const left = Math.min(Math.max(0, r.left - box.left + r.width / 2 - 80), box.width - 170);
    tip.style.left = `${left}px`;
    tip.style.top = `${r.top - box.top + 4}px`;
  });
  plot.addEventListener('pointerleave', () => (tip.hidden = true));

  // table view
  toggle.addEventListener('click', () => {
    const show = tableBox.hidden;
    tableBox.hidden = !show;
    toggle.textContent = show ? 'hide the table' : 'show as a table';
    if (show) {
      tableBox.innerHTML = `<table>
        <thead><tr><th></th>${SUBJECTS.map((s) => `<th>${s.label}</th>`).join('')}<th>Total</th></tr></thead>
        <tbody>${bars
          .map((b) => {
            const sum = b.totals.maths + b.totals.english + b.totals.georgian;
            return `<tr><th>${esc(b.title)}</th>${SUBJECTS.map((s) => `<td>${formatMinutes(Math.floor(b.totals[s.id]))}</td>`).join('')}<td>${formatMinutes(Math.floor(sum))}</td></tr>`;
          })
          .join('')}</tbody></table>`;
    }
  });

  draw();
  const ro = new ResizeObserver(() => draw());
  ro.observe(plot);
  return () => ro.disconnect();
}
