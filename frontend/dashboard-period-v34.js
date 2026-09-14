/* BMJ OEE Dashboard Period v34 — derive trend period from source cells, never from filename. */
(()=>{
 const baseChartV34=chart;
 const DAY=86400000;
 const excelEpoch=Date.UTC(1899,11,30);
 const toDate=v=>{if(v instanceof Date&&!Number.isNaN(v))return v;if(typeof v==='number'&&Number.isFinite(v)&&v>20000&&v<80000)return new Date(excelEpoch+Math.round(v)*DAY);if(typeof v==='string'){const t=Date.parse(v);if(Number.isFinite(t))return new Date(t);}return null;};
 const iso=d=>d?new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())).toISOString().slice(0,10):'';
 const idDate=d=>d?d.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}):'—';
 let lastPeriod=null,lastSeries=[];
 function points(series,index){const metric=index===0?'K':'J';return (series?.rows||[]).map(r=>{const d=toDate(r.cells?.A?.v),v=r.cells?.[metric]?.v;return d&&typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1?{date:d,value:v}:null;}).filter(Boolean).sort((a,b)=>a.date-b.date);}
 chart=function(series){
  lastSeries=Array.isArray(series)?series:[];const groups=lastSeries.map(points),dates=groups.flat().map(x=>x.date);if(!dates.length){lastPeriod=null;return baseChartV34(series);}
  const min=new Date(Math.min(...dates.map(d=>d.getTime()))),max=new Date(Math.max(...dates.map(d=>d.getTime()))),span=Math.max(DAY,max-min),colors=['#087abe','#0c9c96','#d58b20'];lastPeriod={min,max,label:min.getUTCFullYear()===max.getUTCFullYear()&&min.getUTCMonth()===max.getUTCMonth()?min.toLocaleDateString('id-ID',{month:'long',year:'numeric',timeZone:'UTC'}):`${idDate(min)} — ${idDate(max)}`,iso_min:iso(min),iso_max:iso(max)};
  let svg=`<svg class="chart" viewBox="0 0 760 250" role="img" aria-label="Trend OEE ${esc(lastPeriod.label)}">`;
  [0,.25,.5,.75,1].forEach(v=>{const y=220-v*195;svg+=`<line x1="42" x2="745" y1="${y}" y2="${y}" stroke="#e3ebf0"/><text x="0" y="${y+4}">${v*100}%</text>`;});
  groups.forEach((g,i)=>{if(!g.length)return;const pts=g.map(p=>`${42+(p.date-min)*703/span},${220-p.value*195}`).join(' ');svg+=`<polyline fill="none" stroke="${colors[i%colors.length]}" stroke-width="2.5" points="${pts}"/>`;});
  const ticks=5;for(let i=0;i<ticks;i++){const t=new Date(min.getTime()+span*i/(ticks-1)),x=42+703*i/(ticks-1);svg+=`<text x="${x}" y="245" text-anchor="middle">${t.toLocaleDateString('id-ID',{day:'2-digit',month:'short',timeZone:'UTC'})}</text>`;}
  return svg+'</svg>';
 };
 function markSourceAvailability(){const cards=[...document.querySelectorAll('#content .cards .card')].slice(0,3);cards.forEach((card,i)=>{const s=lastSeries[i];if(!s)return;const metric=i===0?'K':'J',summary=s.rows?.find(r=>r.row===2)?.cells?.[metric]?.v,missing=s.source_status==='missing'||!s.sheet_id,noSummary=!missing&&!(typeof summary==='number'&&Number.isFinite(summary));if(!missing&&!noSummary)return;card.classList.add('source-missing');const value=card.querySelector('.value'),note=card.querySelector('.kpi-note');if(value)value.textContent='—';if(note)note.textContent=missing?`${s.name} · sumber belum tersedia`:`${s.name} · KPI summary belum tersedia`;card.title=missing?'Source sheet belum tersedia; nilai tidak dianggap nol.':'Cell KPI summary sumber belum menghasilkan angka valid; nilai tidak dianggap nol.';});}
 const baseDashboardV34=dashboard;
 dashboard=async function(...args){lastPeriod=null;lastSeries=[];const out=await baseDashboardV34(...args);markSourceAvailability();const head=document.querySelector('#content .heading .muted');if(head)head.textContent=lastPeriod?`Snapshot sumber · ${lastPeriod.label}`:'Snapshot sumber · periode belum dapat ditentukan';if(lastPeriod){const trend=[...document.querySelectorAll('#content section.panel')].find(x=>x.querySelector('h2')?.textContent?.includes('Trend OEE'));if(trend){const info=trend.querySelector('.sheetinfo');if(info)info.textContent=`${lastPeriod.iso_min}${lastPeriod.iso_min!==lastPeriod.iso_max?' — '+lastPeriod.iso_max:''}. Hasil kosong atau error tidak diganti nol; periode berasal dari cell tanggal sumber.`;}}return out;};
 window.DashboardPeriodV34={toDate,get period(){return lastPeriod;},get series(){return lastSeries;}};
})();
