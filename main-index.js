'use strict';
(() => {
 const plot = document.getElementById('main-index-plot');
 if(!plot) return;
 const status = document.getElementById('main-index-status');
 const headline = document.getElementById('main-index-value');
 const date = document.getElementById('main-index-date');
 let readings = [], range = '12';
 function render(){
   plot.replaceChildren();
   let pts = range === 'all' ? readings : readings.slice(-Number(range));
   if(!pts.length){plot.textContent='No verified monthly readings yet.';status.textContent='AWAITING FIRST VERIFIED READING';return;}
   const ns='http://www.w3.org/2000/svg';
   const node=(name,attrs,text)=>{const e=document.createElementNS(ns,name);for(const [k,v] of Object.entries(attrs||{})) e.setAttribute(k,String(v));if(text!==undefined)e.textContent=String(text);return e;};
   const width=960,height=260,left=65,right=22,top=23,bottom=46;
   const vals=pts.map(p=>Number(p.value));
   const minimum=Math.min(...vals,100),maximum=Math.max(...vals,100);
   const pad=Math.max((maximum-minimum)*.17, .35);
   const floor=minimum-pad,ceil=maximum+pad;
   const xx=i=>left+(width-left-right)*(pts.length===1?.5:i/(pts.length-1));
   const yy=v=>top+(height-top-bottom)*(ceil-v)/(ceil-floor);
   const svg=node('svg',{viewBox:'0 0 960 260',role:'img','aria-label':'Monthly purchasing power history'});
   for(let i=0;i<5;i++){
     const val=floor+(ceil-floor)*i/4,y=yy(val);
     svg.append(node('line',{x1:left,x2:width-right,y1:y,y2:y,stroke:'#373b3c','stroke-width':1}));
     svg.append(node('text',{x:10,y:y+4,fill:'#acadaa','font-size':13},val.toFixed(1)));
   }
   const baseline=yy(100);
   svg.append(node('line',{x1:left,x2:width-right,y1:baseline,y2:baseline,stroke:'#818581','stroke-width':1,'stroke-dasharray':'6 6'}));
   const poly=node('polyline',{fill:'none',stroke:'#f3763c','stroke-width':3.5,'stroke-linecap':'round','stroke-linejoin':'round',points:pts.map((p,i)=>xx(i)+','+yy(p.value)).join(' ')});
   svg.append(poly);
   const labelIndices=[0,Math.floor((pts.length-1)/2),pts.length-1];
   pts.forEach((p,i)=>{
      const dot=node('circle',{cx:xx(i),cy:yy(p.value),r:4,fill:'#f3763c'});
      dot.append(node('title',{},p.month+': '+Number(p.value).toFixed(2)+' (wage $'+p.wage_hourly+', CPI '+p.restaurant_cpi+')'));
      svg.append(dot);
      if(labelIndices.includes(i))svg.append(node('text',{x:xx(i),y:height-12,fill:'#aeb0aa','font-size':12,'text-anchor':'middle'},p.month));
   });
   plot.append(svg);
   const latest=readings[readings.length-1];
   headline.textContent=Number(latest.value).toFixed(1);
   date.textContent='LATEST OBSERVATION · '+latest.month;
   status.textContent='OFFICIAL MONTHLY SERIES · '+readings.length+' OBSERVATIONS';
 }
 document.querySelectorAll('[data-main-range]').forEach(btn=>btn.addEventListener('click',()=>{
  range=btn.dataset.mainRange;
  document.querySelectorAll('[data-main-range]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));
  render();
 }));
 fetch('/data/purchasing-power.json',{cache:'no-store'}).then(res=>{if(!res.ok)throw Error('No readings');return res.json()}).then(data=>{
   readings=(data.points||[]).filter(p=>/^\d{4}-\d{2}$/.test(p.month)&&Number.isFinite(Number(p.value))&&Number(p.value)>0).sort((a,b)=>a.month.localeCompare(b.month));
   render();
   fetch('/data/refresh-status.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('No status');return r.json()}).then(health=>{
     const checked = new Date(health.checked_utc);
     if(!Number.isFinite(checked.getTime())) return;
     const label = checked.toLocaleString('en-US',{timeZone:'America/Chicago',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
     const stale = Date.now()-checked.getTime()>48*60*60*1000;
     status.textContent = health.status==='ok' && !stale ? 'CHECKED '+label+' CT · MONTHLY DATA' : 'REFRESH DELAYED · LAST CHECK '+label+' CT';
   }).catch(()=>{status.textContent += ' · REFRESH STATUS UNAVAILABLE';});
 }).catch(()=>{
   status.textContent='SOURCE UPDATE PENDING';
   plot.textContent='The first official monthly series is being collected. No modeled readings are shown.';
 });
})();
