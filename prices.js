'use strict';
(async function () {
  const chart = document.getElementById('price-chart');
  const cards = document.getElementById('price-cards');
  const legend = document.getElementById('price-legend');
  const dateLabel = document.getElementById('price-date');
  if (!chart || !cards || !legend) return;
  let data;
  try {
    const response = await fetch('/data/prices.json', {cache:'no-cache'});
    if (!response.ok) throw new Error('Price data unavailable');
    data = await response.json();
  } catch (_) {
    dateLabel.textContent = 'PRICE DATA UNAVAILABLE';
    chart.textContent = 'The monthly price series could not be loaded.';
    return;
  }
  const series = Object.entries(data.series).map(([id, value]) => ({id, ...value}));
  const enabled = new Set(series.map(s => s.id));
  let years = 5;
  const fmt = n => '$' + Number(n).toFixed(2);
  const monthName = m => new Date(m + '-01T00:00:00').toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'});
  dateLabel.textContent = `LATEST AVAILABLE · ${monthName(data.latestMonth).toUpperCase()}`;

  cards.innerHTML = series.map(s => {
    const values = Object.fromEntries(s.values.map(v => [v.date,v.value]));
    const latest = values[data.latestMonth];
    const prior = values[`${Number(data.latestMonth.slice(0,4))-1}${data.latestMonth.slice(4)}`];
    const change = Number.isFinite(prior) ? (latest / prior - 1) * 100 : null;
    const sign = change > 0 ? '+' : '';
    return `<article class="price-card"><span class="price-dot" style="--item:${s.color}"></span><div><h4><a href="https://fred.stlouisfed.org/series/${s.id}" target="_blank" rel="noreferrer">${s.name}</a></h4><p>${s.definition} · ${s.unit}</p></div><strong>${fmt(latest)}</strong><small class="${change>0?'up':'down'}">${change===null?'No annual comparison':`${sign}${change.toFixed(1)}% over 12 months`}</small></article>`;
  }).join('');

  legend.innerHTML = series.map(s => `<button type="button" aria-pressed="true" data-item="${s.id}"><span style="--item:${s.color}"></span>${s.name}</button>`).join('');
  legend.addEventListener('click', e => {
    const b = e.target.closest('button[data-item]'); if (!b) return;
    const id = b.dataset.item;
    if (enabled.has(id)) enabled.delete(id); else enabled.add(id);
    b.setAttribute('aria-pressed', String(enabled.has(id)));
    draw();
  });
  document.querySelectorAll('[data-price-range]').forEach(b => b.addEventListener('click', () => {
    years = Number(b.dataset.priceRange);
    document.querySelectorAll('[data-price-range]').forEach(x => x.setAttribute('aria-pressed', String(x===b)));
    draw();
  }));

  function draw() {
    const end = data.latestMonth;
    const startDate = new Date(`${end}-01T00:00:00Z`);
    startDate.setUTCMonth(startDate.getUTCMonth() - years * 12);
    const start = startDate.toISOString().slice(0,7);
    const monthSet = new Set();
    series.forEach(s => s.values.forEach(v => {if (v.date >= start && v.date <= end) monthSet.add(v.date);}));
    const months = [...monthSet].sort();
    const base = '2021-09';
    const indexed = series.filter(s=>enabled.has(s.id)).map(s=>{
      const lookup = Object.fromEntries(s.values.map(v=>[v.date,v.value]));
      const b = lookup[base];
      return {s, values:months.map(m=>({date:m,value:Number.isFinite(b)&&Number.isFinite(lookup[m]) ? lookup[m]/b*100 : null}))};
    });
    const vals = indexed.flatMap(x=>x.values.map(v=>v.value).filter(Number.isFinite));
    let min = Math.floor((Math.min(...vals,90)-5)/10)*10, max = Math.ceil((Math.max(...vals,110)+5)/10)*10;
    if (max-min<40) {min-=10;max+=10;}
    const W=900,H=330,L=58,R=18,T=18,B=38,iw=W-L-R,ih=H-T-B;
    const x=i=>L+(months.length<=1?0:i/(months.length-1))*iw;
    const y=v=>T+(max-v)/(max-min)*ih;
    let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Indexed grocery price series, ${start} through ${end}; September 2021 equals 100">`;
    for(let t=min;t<=max;t+=20){const yy=y(t);svg+=`<line x1="${L}" x2="${W-R}" y1="${yy}" y2="${yy}" class="pgrid"/><text x="${L-9}" y="${yy+4}" text-anchor="end" class="paxis">${t}</text>`;}
    const tickIndices=[0,Math.floor((months.length-1)/3),Math.floor((months.length-1)*2/3),months.length-1].filter((v,i,a)=>a.indexOf(v)===i);
    tickIndices.forEach(i=>{const label=new Date(months[i]+'-01T00:00:00Z').toLocaleDateString('en-US',{month:'short',year:'2-digit',timeZone:'UTC'});svg+=`<text x="${x(i)}" y="${H-11}" text-anchor="middle" class="paxis">${label}</text>`;});
    svg+=`<line x1="${L}" x2="${W-R}" y1="${y(100)}" y2="${y(100)}" class="pbase"/>`;
    indexed.forEach(({s,values})=>{let d='',open=false;values.forEach((v,i)=>{if(!Number.isFinite(v.value)){open=false;return;}d+=(open?' L':' M')+`${x(i).toFixed(2)} ${y(v.value).toFixed(2)}`;open=true;});if(d)svg+=`<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;});
    svg+='</svg>';
    chart.innerHTML=svg;
  }
  draw();
})();
