'use strict';
(() => {
 const root=document.getElementById('gfi-panel'); if(!root)return;
 const status=document.getElementById('gfi-status'), plot=document.getElementById('gfi-plot'),latest=document.getElementById('gfi-last'),date=document.getElementById('gfi-date');
 let history=[],range='all';
 const fmt=n=>n.toFixed(2);
 function render(){
  plot.replaceChildren();
  let points=range==='all'?history:history.filter(x=>x.date>=range+'-01-01');
  if(!points.length){plot.textContent='No verified historical readings available for this range.';return;}
  const ns='http://www.w3.org/2000/svg';
  const elem=(tag,attrs={},label)=>{const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,String(v)));if(label!==undefined)e.textContent=label;return e};
  const w=1000,h=330,l=57,r=20,t=25,b=48;
  const vals=points.map(p=>p.value),lo=Math.min(0,...vals),hi=Math.max(0,...vals),pad=Math.max((hi-lo)*.08,.25),min=lo-pad,max=hi+pad;
  const x=i=>l+(w-l-r)*i/Math.max(1,points.length-1),y=v=>t+(h-t-b)*(max-v)/(max-min);
  const svg=elem('svg',{viewBox:'0 0 1000 330',role:'img','aria-label':'Federal Reserve financial stress observations since 2008'});
  for(let i=0;i<=4;i++){const v=min+(max-min)*i/4,yy=y(v);svg.append(elem('line',{x1:l,x2:w-r,y1:yy,y2:yy,stroke:'#404344'}));svg.append(elem('text',{x:8,y:yy+4,fill:'#b7b8b1','font-size':12},fmt(v)));}
  svg.append(elem('line',{x1:l,x2:w-r,y1:y(0),y2:y(0),stroke:'#8c908c','stroke-dasharray':'5 5'}));
  svg.append(elem('polyline',{points:points.map((p,i)=>x(i)+','+y(p.value)).join(' '),fill:'none',stroke:'#f3763c','stroke-width':2.4,'stroke-linejoin':'round'}));
  const years=[...new Set(points.map(p=>p.date.slice(0,4)))],skip=Math.max(1,Math.ceil(years.length/9));
  years.filter((_,i)=>i%skip===0||i===years.length-1).forEach(yr=>{const idx=points.findIndex(p=>p.date.startsWith(yr));svg.append(elem('text',{x:x(idx),y:h-15,fill:'#adb0ab','text-anchor':'middle','font-size':13},yr));});
  const end=points[points.length-1],dot=elem('circle',{cx:x(points.length-1),cy:y(end.value),r:4,fill:'#f3763c'});dot.append(elem('title',{},end.date+' · '+fmt(end.value)));svg.append(dot);plot.append(svg);
  latest.textContent=fmt(history[history.length-1].value);date.textContent='LATEST VERIFIED WEEK · '+history[history.length-1].date;
 }
 document.querySelectorAll('[data-gfi-range]').forEach(b=>b.addEventListener('click',()=>{range=b.dataset.gfiRange;document.querySelectorAll('[data-gfi-range]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));render();}));
 fetch('/data/gfi-stress.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Historical feed unavailable');return r.json()}).then(data=>{
  history=(data.points||[]).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x.date)&&Number.isFinite(Number(x.value))).map(x=>({date:x.date,value:Number(x.value)})).sort((a,b)=>a.date.localeCompare(b.date));
  if(!history.length)throw Error('No verified observations');
  status.textContent='FED SERIES · '+history.length+' WEEKS';render();
 }).catch(()=>{status.textContent='DATA UPDATE PENDING';plot.textContent='Verified historical data are not available yet. Use the Federal Reserve source link below; no substitute or synthetic observations are shown.';});
})();