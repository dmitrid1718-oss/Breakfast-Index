'use strict';
(() => {
 const root=document.getElementById('gfi-panel');if(!root)return;
 const plot=document.getElementById('gfi-plot'),status=document.getElementById('gfi-status'),headline=document.getElementById('gfi-last'),dated=document.getElementById('gfi-date');
 const financial=document.getElementById('gfi-financial'),household=document.getElementById('gfi-household'),coverage=document.getElementById('gfi-coverage');
 let rows=[],range='all',mode='gfi';
 const colors={gfi:'#f3763c',financial:'#72b9dd',household:'#e7b870'};
 const labels={gfi:'Global Fracture Index (research)',financial:'Financial stress',household:'Household pressure'};
 const svgNS='http://www.w3.org/2000/svg';
 const n=(name,attrs={},content)=>{const node=document.createElementNS(svgNS,name);Object.keys(attrs).forEach(key=>node.setAttribute(key,String(attrs[key])));if(content!==undefined)node.textContent=String(content);return node;};
 const fmt=v=>Number.isFinite(v)?v.toFixed(1):'—';
 function show(){
  plot.replaceChildren();
  const visible=rows.filter(r=>(range==='all'||r.date>=range+'-01-01')&&Number.isFinite(r[mode]));
  if(visible.length<2){plot.textContent='Insufficient observations for this view.';return;}
  const W=1020,H=345,L=48,R=24,T=20,B=50;
  const x=i=>L+(W-L-R)*i/(visible.length-1),y=v=>T+(H-T-B)*(100-v)/100;
  const svg=n('svg',{viewBox:'0 0 1020 345',role:'img','aria-label':labels[mode]+' monthly history from '+visible[0].date+' to '+visible[visible.length-1].date});
  for(let v=0;v<=100;v+=25){svg.append(n('line',{x1:L,x2:W-R,y1:y(v),y2:y(v),stroke:'#444748'}));svg.append(n('text',{x:5,y:y(v)+4,fill:'#aaa','font-size':12},v));}
  for(const year of [...new Set(visible.map(r=>r.date.slice(0,4)))].filter((_,i)=>i%Math.max(1,Math.ceil(visible.length/120))===0)){const i=visible.findIndex(r=>r.date.startsWith(year));svg.append(n('text',{x:x(i),y:H-18,fill:'#aaa','text-anchor':'middle','font-size':12},year));}
  svg.append(n('polyline',{points:visible.map((r,i)=>x(i).toFixed(2)+','+y(r[mode]).toFixed(2)).join(' '),fill:'none',stroke:colors[mode],'stroke-width':3,'stroke-linecap':'round','stroke-linejoin':'round'}));
  const last=visible[visible.length-1];svg.append(n('circle',{cx:x(visible.length-1),cy:y(last[mode]),r:5,fill:colors[mode]}));
  // The invisible hit-area makes individual monthly readings inspectable, even on touchscreens.
  const marker=n('circle',{r:5,fill:'#fff',stroke:colors[mode],'stroke-width':2,visibility:'hidden'});
  svg.append(marker);
  const hint=n('text',{x:W/2,y:16,'text-anchor':'middle','font-size':13,fill:'#ddd'},'Touch or move over chart for monthly values');svg.append(hint);
  const select=event=>{
   const rect=svg.getBoundingClientRect(),fraction=(event.clientX-rect.left)/rect.width;
   const i=Math.max(0,Math.min(visible.length-1,Math.round(((fraction*W)-L)/(W-L-R)*(visible.length-1))));
   const r=visible[i];marker.setAttribute('cx',x(i));marker.setAttribute('cy',y(r[mode]));marker.setAttribute('visibility','visible');
   hint.textContent=r.date.slice(0,7)+' · '+labels[mode]+': '+fmt(r[mode])+' / 100';
  };
  svg.addEventListener('pointermove',select);svg.addEventListener('pointerdown',select);
  svg.addEventListener('pointerleave',()=>{marker.setAttribute('visibility','hidden');hint.textContent='Touch or move over chart for monthly values';});
  plot.append(svg);
  headline.textContent=fmt(rows[rows.length-1][mode]);dated.textContent='LATEST MONTH · '+rows[rows.length-1].date.slice(0,7)+' · REVISED HISTORICAL DATA';
 }
 document.querySelectorAll('[data-gfi-range]').forEach(btn=>btn.addEventListener('click',()=>{
  range=btn.dataset.gfiRange;document.querySelectorAll('[data-gfi-range]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));if(rows.length)show();
 }));
 document.querySelectorAll('[data-gfi-mode]').forEach(btn=>btn.addEventListener('click',()=>{
  mode=btn.dataset.gfiMode;document.querySelectorAll('[data-gfi-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));if(rows.length)show();
 }));
 fetch('/data/gfi.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('No calculated dataset');return r.json()}).then(data=>{
  rows=(data.points||[]).filter(p=>/^20\d\d-\d\d-\d\d$/.test(p.date)&&['gfi','financial','household'].every(k=>Number.isFinite(p[k]))&&p.coverage>=70).sort((a,b)=>a.date.localeCompare(b.date));
  if(rows.length<120)throw Error('Incomplete calculated history');
  const last=rows[rows.length-1];financial.textContent=fmt(last.financial)+' / 100';household.textContent=fmt(last.household)+' / 100';coverage.textContent=last.coverage+'% of planned signal weight';
  status.textContent='GFI RESEARCH · '+rows.length+' MONTHS';show();
 }).catch(err=>{
  status.textContent='DATA REFRESH PENDING';plot.textContent='Our calculated GFI dataset has not been published yet. The chart will display after the first verified source refresh; no borrowed or synthetic history.';
  headline.textContent='—';dated.textContent='NO VALIDATED GFI DATA AVAILABLE';console.warn('GFI:',err.message);
 });
})();
