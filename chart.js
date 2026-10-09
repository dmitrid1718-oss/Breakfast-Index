'use strict';
// No sample values: the initial release has no connected data source.
const chartState = { range: 'Week', style: 'Line' };
const periodCopy = {Day: 'Today’s', Week: 'This week’s', Month: 'This month’s'};
document.querySelectorAll('[data-range], [data-style]').forEach(button => {
  button.addEventListener('click', () => {
    const key = button.dataset.range ? 'range' : 'style';
    chartState[key] = button.dataset[key];
    document.querySelectorAll(`[data-${key}]`).forEach(control => {
      control.setAttribute('aria-pressed', String(control.dataset[key] === chartState[key]));
    });
    document.querySelector('.chart').setAttribute('aria-label', `Breakfast Index ${chartState.range.toLowerCase()} ${chartState.style.toLowerCase()} chart. No verified readings are available yet.`);
    document.querySelector('#chart-view').textContent = `${chartState.range.toUpperCase()} · ${chartState.style.toUpperCase()}`;
    document.querySelector('#chart-detail').textContent = chartState.style === 'Candles' ? 'OPEN / HIGH / LOW / CLOSE' : 'MORNING ACTIVITY';
    document.querySelector('#chart-message').textContent = `${periodCopy[chartState.range]} ${chartState.style === 'Candles' ? 'candles' : 'readings'} will appear here.`;
  });
});
