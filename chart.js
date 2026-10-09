'use strict';

const chartState = { range: 'Week', style: 'Line', days: [] };
const periodCopy = { Day: 'Today’s', Week: 'This week’s', Month: 'This month’s' };
const chart = document.querySelector('.chart');
const empty = document.querySelector('.empty');
const NS = 'http://www.w3.org/2000/svg';

function svgElement(name, attrs = {}) {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

function filteredDays() {
  const today = new Date();
  const format = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const span = chartState.range === 'Day' ? 0 : chartState.range === 'Week' ? 6 : 29;
  const first = new Date(today.getFullYear(), today.getMonth(), today.getDate() - span);
  const since = format(first);
  const through = format(today);
  return chartState.days.filter(day => day.date >= since && day.date <= through);
}

function draw() {
  chart.querySelector('.data-viz')?.remove();
  const days = filteredDays();
  const enoughForDay = chartState.range !== 'Day' || days.length > 0;
  const view = document.querySelector('#chart-view');
  const detail = document.querySelector('#chart-detail');
  const message = document.querySelector('#chart-message');
  const status = document.querySelector('.status');
  view.textContent = `${chartState.range.toUpperCase()} · ${chartState.style.toUpperCase()}`;
  detail.textContent = chartState.style === 'Candles' ? '6 / 7 / 8 A.M.' : 'MORNING ACTIVITY';
  chart.setAttribute('aria-label', `Breakfast Index ${chartState.range.toLowerCase()} ${chartState.style.toLowerCase()} chart. ${days.length} daily readings shown.`);
  status.textContent = chartState.days.length ? `${chartState.days.length} DAYS WITH READINGS` : 'AWAITING FIRST READINGS';

  if (!days.length || !enoughForDay) {
    empty.hidden = false;
    message.textContent = `${periodCopy[chartState.range]} ${chartState.style === 'Candles' ? 'candles' : 'readings'} will appear here.`;
    return;
  }

  empty.hidden = true;
  const svg = svgElement('svg', { class: 'data-viz', viewBox: '0 0 960 200', role: 'img',
    'aria-label': `${days.length} daily average readings` });
  const values = days.map(day => Number(day.value)).filter(Number.isFinite);
  const slots = days.flatMap(day => Object.values(day.slots || {}).map(Number).filter(Number.isFinite));
  const all = chartState.style === 'Candles' && slots.length ? slots : values;
  let min = Math.min(0, ...all), max = Math.max(...all);
  if (max === min) max = min + 1;
  const x = i => days.length === 1 ? 480 : 30 + i * 900 / (days.length - 1);
  const y = value => 174 - (Number(value) - min) / (max - min) * 150;

  [24, 74, 124, 174].forEach(gy => svg.append(svgElement('line', {
    x1: 0, x2: 960, y1: gy, y2: gy, class: 'viz-grid' })));

  if (chartState.style === 'Line') {
    const points = days.map((day, i) => `${x(i)},${y(day.value)}`).join(' ');
    svg.append(svgElement('polyline', { points, class: 'viz-line' }));
    days.forEach((day, i) => {
      const dot = svgElement('circle', { cx: x(i), cy: y(day.value), r: 4.5, class: 'viz-point' });
      const tip = svgElement('title');
      tip.textContent = `${day.date}: ${Number(day.value).toFixed(1)} average vehicles across ${day.locations} location${day.locations === 1 ? '' : 's'}`;
      dot.append(tip);
      svg.append(dot);
    });
  } else {
    days.forEach((day, i) => {
      const hourly = [6, 7, 8].map(hour => day.slots?.[String(hour)]).filter(v => v !== null && v !== undefined && Number.isFinite(Number(v))).map(Number);
      const open = Number(day.slots?.['6'] ?? day.value);
      const close = Number(day.slots?.['8'] ?? day.value);
      const high = Math.max(open, close, ...hourly);
      const low = Math.min(open, close, ...hourly);
      const center = x(i);
      svg.append(svgElement('line', { x1: center, x2: center, y1: y(high), y2: y(low), class: 'viz-wick' }));
      svg.append(svgElement('rect', { x: center - 5, y: Math.min(y(open), y(close)), width: 10,
        height: Math.max(2, Math.abs(y(open) - y(close))), class: 'viz-candle' }));
      const tip = svgElement('title');
      tip.textContent = `${day.date}: 6 a.m. ${open}, high ${high}, low ${low}, 8 a.m. ${close}`;
      svg.lastChild.append(tip);
    });
  }
  chart.insertBefore(svg, empty);
  message.textContent = `${days.length} daily average${days.length === 1 ? '' : 's'} · ${days.reduce((n, d) => n + (d.locations || 0), 0)} location-days`;
}

document.querySelectorAll('[data-range], [data-style]').forEach(button => {
  button.addEventListener('click', () => {
    const key = button.dataset.range ? 'range' : 'style';
    chartState[key] = button.dataset[key];
    document.querySelectorAll(`[data-${key}]`).forEach(control => {
      control.setAttribute('aria-pressed', String(control.dataset[key] === chartState[key]));
    });
    draw();
  });
});

fetch('/data/breakfast.json', { cache: 'no-store' })
  .then(response => { if (!response.ok) throw new Error('No readings yet'); return response.json(); })
  .then(data => { chartState.days = Array.isArray(data.days) ? data.days : []; draw(); })
  .catch(() => draw());
