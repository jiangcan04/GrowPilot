/* Pure date-based task presentation. No clock times, network calls or schedule mutation. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.GrowPilotCalendar=api;})(globalThis,function(){
 'use strict';
 const date=s=>new Date(s+'T12:00:00');
 const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 const add=(s,n)=>{const d=date(s);d.setDate(d.getDate()+n);return iso(d);};
 function week(s){const d=date(s),offset=(d.getDay()+6)%7;return add(s,-offset);}
 function shift(s,mode,n){if(mode==='week')return add(s,n*7);const d=date(s);d.setDate(1);d.setMonth(d.getMonth()+n);return iso(d);}
 function range(s,mode='week'){
  if(mode==='week'){const start=week(s);return {start,end:add(start,6),days:Array.from({length:7},(_,i)=>add(start,i)),month:s.slice(0,7)};}
  const d=date(s);d.setDate(1);const first=iso(d),start=week(first);d.setMonth(d.getMonth()+1);d.setDate(0);const last=iso(d),count=Math.round((date(last)-date(start))/86400000)+1,size=Math.ceil(count/7)*7;
  return {start,end:add(start,size-1),days:Array.from({length:size},(_,i)=>add(start,i)),month:first.slice(0,7)};
 }
 function entries(s,folderId=''){
  const plans=new Map(s.plans.map(p=>[p.id,p]));
  return s.folders.filter(f=>!folderId||f.id===folderId).flatMap((f)=>(f.execution?.items||[]).filter(x=>{const p=plans.get(x.planId);return p&&(p.status==='adopted'||p.status==='completed'&&x.done);}).map(x=>({...x,folderId:f.id,folderName:f.name,planTitle:plans.get(x.planId).title,planStatus:plans.get(x.planId).status}))).sort((a,b)=>a.date.localeCompare(b.date)||(a.queueOrder??1e9)-(b.queueOrder??1e9));
 }
 function view(s,{anchor,today,selected=today,mode='week',folderId=''}={}){const r=range(anchor||selected,mode),all=entries(s,folderId);return {...r,mode,days:r.days.map(d=>{const items=all.filter(x=>x.date===d);return {date:d,inMonth:d.slice(0,7)===r.month,today:d===today,selected:d===selected,items,minutes:items.reduce((n,x)=>n+x.minutes,0),done:items.filter(x=>x.done).length};})};}
 return {add,week,shift,range,entries,view};
});
