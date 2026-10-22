'use strict';
const series={
  sentiment:{title:'University of Michigan · Consumer Sentiment',unit:'index points',source:'University of Michigan',url:'https://www.sca.isr.umich.edu/',data:[['2026-04',49.8],['2026-05',44.8],['2026-06',49.5],['2026-07',55.2],['2026-08',51.7],['2026-09',48.1],['2026-10',46.3]],note:'October 2026 preliminary. Historical values are final monthly readings. Source: Surveys of Consumers.'},
  conditions:{title:'University of Michigan · Current Conditions',unit:'index points',source:'University of Michigan',url:'https://www.sca.isr.umich.edu/',data:[['2026-06',47.7],['2026-07',54.8],['2026-08',51.9],['2026-09',50.9],['2026-10',44.7]],note:'October preliminary. Distinct from the headline consumer sentiment index.'},
  gasoline:{title:'U.S. Regular Gasoline',unit:'dollars per gallon',source:'U.S. EIA',url:'https://www.eia.gov/dnav/pet/PET_PRI_GND_A_EPMR_PTE_DPGAL_W.htm',data:[['2026-09-14',4.319],['2026-09-21',4.478],['2026-09-28',4.465],['2026-10-05',4.354],['2026-10-12',4.331],['2026-10-19',4.284]],note:'Weekly U.S. retail price, including taxes. Latest observed October 19, 2026.'},
  wages:{title:'Production and Nonsupervisory Hourly Earnings',unit:'dollars per hour',source:'U.S. BLS',url:'https://fred.stlouisfed.org/series/AHETPI',data:[['2026-05',32.31],['2026-06',32.38],['2026-07',32.42],['2026-08',32.53],['2026-09',32.60]],note:'Monthly seasonally adjusted mean hourly earnings. Not median take-home pay.'}
};
const $=id=>document.getElementById(id);
function plot(key){
  const s=series[key], vals=s.data.map(p=>p[1]),low=Math.min(...vals),high=Math.max(...vals);
  const span=Math.max(high-low,0.1),pad=span*.18, ymin=low-pad,ymax=high+pad;
  const W=900,H=260, left=65,right=25,top=25,bottom=54;
  const x=i=>left+(W-left-right)*i/Math.max(vals.length-1,1);
  const y=v=>top+(H-top-bottom)*(ymax-v)/(ymax-ymin);
  const fmt=v=>key==='gasoline'?'$'+v.toFixed(3):key==='wages'?'$'+v.toFixed(2):v.toFixed(1);
  let svg='<svg viewBox="0 0 900 260" role="img" aria-label="'+s.title+' historical chart" style="display:block;width:100%;height:auto" xmlns="http://www.w3.org/2000/svg">';
  for(let i=0;i<5;i++){const v=ymin+(ymax-ymin)*i/4;const yy=y(v);svg+='<line x1="'+left+'" x2="'+(W-right)+'" y1="'+yy+'" y2="'+yy+'" stroke="#424547"/><text x="8" y="'+(yy+4)+'" fill="#aaa" font-size="13">'+fmt(v)+'</text>'}
  const points=s.data.map(([d,v],i)=>x(i)+','+y(v)).join(' ');
  svg+='<polyline points="'+points+'" fill="none" stroke="#f3763c" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>';
  s.data.forEach(([date,v],i)=>{const xx=x(i),yy=y(v);svg+='<circle cx="'+xx+'" cy="'+yy+'" r="5" fill="#f3763c"><title>'+date+': '+fmt(v)+'</title></circle><text x="'+xx+'" y="239" text-anchor="middle" fill="#b5b5b1" font-size="12">'+date.slice(5)+'</text>'});
  svg+='</svg>';
  $('economic-plot').innerHTML=svg;
  $('economic-title').textContent=s.title;
  $('economic-now').textContent=fmt(vals[vals.length-1]);
  $('economic-date').textContent=s.data[s.data.length-1][0]+(key==='sentiment'||key==='conditions'?' · PRELIMINARY':'');
  $('economic-source').textContent=s.note;
  $('economic-source-link').href=s.url;
  $('economic-source-link').textContent=s.source+' ↗';
  document.querySelectorAll('[data-series]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.series===key)));
}
document.querySelectorAll('[data-series]').forEach(b=>b.addEventListener('click',()=>plot(b.dataset.series)));
plot('sentiment');
function affordability(){
 const wage=+$('worker-wage').value,price=+$('basket-price').value,net=+$('net-share').value,budget=+$('budget-share').value;
 const minutes=60*price/(wage*net/100);
 const days=Math.min(5,Math.floor(wage*40*net/100*budget/100/price));
 $('wage-val').textContent='$'+wage.toFixed(2);
 $('price-val').textContent='$'+price.toFixed(2);
 $('net-val').textContent=net+'%';
 $('budget-val').textContent=budget+'%';
 $('minutes-result').textContent=minutes.toFixed(0)+' min';
 $('days-result').textContent=days+' / 5';
 $('week-cost').textContent='$'+(price*5).toFixed(2);
 $('days-bar').innerHTML=[0,1,2,3,4].map(i=>'<span class="'+(i<days?'filled':'')+'"></span>').join('');
}
['worker-wage','basket-price','net-share','budget-share'].forEach(id=>$(id).addEventListener('input',affordability));
affordability();
