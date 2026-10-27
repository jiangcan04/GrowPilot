/* Browser-only scheduling example: deterministic rules, no model or notification service. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.InternPilotDaily=api;})(globalThis,function(){
 'use strict';
 const add=(date,n)=>{const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
 const active=(C,s)=>s.plans.filter(p=>p.folderId===C.folder(s)?.id&&p.status==='adopted');
 function signature(C,s){return JSON.stringify({schedule:C.folder(s)?.schedule,plans:active(C,s).map(p=>({id:p.id,hours:p.hours,steps:p.steps,prerequisites:p.prerequisiteIds,keys:p.requirementKeys||[p.requirementKey]}))});}
 function rank(C,s,manual=[]){
  const matches=C.matchResults(s),list=active(C,s).map(p=>{const rows=matches.filter(r=>(p.requirementKeys||[p.requirementKey]).includes(r.key)),jobs=new Set(rows.flatMap(r=>r.sources||[]).map(r=>r.jobId)),must=new Set(rows.flatMap(r=>r.sources||[]).filter(r=>r.must).map(r=>r.jobId));
   const gap=rows.some(r=>r.status==='missing'),base=rows.some(r=>r.evidence?.length);return {...p,rankScore:must.size*10+jobs.size*3+(gap?5:0)+(base?2:0),priorityReasons:[jobs.size?jobs.size+' 个目标岗位涉及，'+must.size+' 个列为必备':'按本人加入的准备任务安排',gap?'当前缺少对应实践支撑':base?'可复用已有经历基础':'结合当前材料继续积累',...(p.prerequisiteIds?.length?['先完成前置任务，再进行本项']:[])]};});
  list.sort((a,b)=>{const ai=manual.indexOf(a.id),bi=manual.indexOf(b.id);return manual.length?(ai<0?999:ai)-(bi<0?999:bi)||b.rankScore-a.rankScore:b.rankScore-a.rankScore;});
  const result=[],remaining=[...list];let cycle=false;while(remaining.length){let at=remaining.findIndex(p=>(p.prerequisiteIds||[]).every(id=>!remaining.some(q=>q.id===id)));if(at<0){cycle=true;at=0;}result.push(remaining.splice(at,1)[0]);}return {plans:result,cycle};
 }
 function arrange(C,s,{date=C.today(),minutes,manualOrder,_reservations,_limit}={}){
  const folder=C.folder(s);if(!folder)throw Error('请先选择目标方向。');const sc=folder.schedule||C.schedule(),old=folder.execution||{},order=manualOrder||old.manualOrder||[],ranked=rank(C,s,order),end=C.endDate(sc),start=date>sc.start?date:sc.start;
  const max=Math.round(sc.dailyHours*60),requested=minutes===undefined?(old.createdAt===date&&Number.isFinite(old.todayMinutes)?old.todayMinutes:max):Number(minutes);if(!Number.isFinite(requested)||requested<0||requested>max)throw Error('今日时长应在 0 分钟与每日投入上限之间。');
  if(ranked.cycle)throw Error('前置任务存在循环，请检查依赖关系。');
  const completed={...(old.completed||{})},kept=(old.items||[]).filter(x=>x.done),items=kept.map(x=>({...x})),overflow=[];let cursor=start,used=0;
  const allowance=d=>{if(_reservations){const finished=kept.filter(x=>x.date===d).reduce((n,x)=>n+x.minutes,0);return Math.max(0,Math.min(Math.floor(max*.85)-finished,_limit(d)-(_reservations[d]||0)));}let reserved=0;for(const p of s.plans.filter(p=>p.folderId!==folder.id&&p.status==='adopted')){const other=s.folders.find(f=>f.id===p.folderId)?.schedule;if(!other)continue;const a=p.startDate||other.start,b=p.endDate||C.endDate(other);if(d>=a&&d<=b)reserved+=Number(p.hours)*60/C.daysBetween(a,b);}const finished=kept.filter(x=>x.date===d).reduce((n,x)=>n+x.minutes,0);return Math.max(0,Math.floor((Math.min(d===date?requested:max,max-finished)-reserved)*.85));};
  for(const p of ranked.plans){const steps=p.steps?.length?p.steps:[{id:'deliverable',text:p.output||p.title,done:false}],total=Math.max(1,Math.round(Number(p.hours)*60)),base=Math.floor(total/steps.length);for(let i=0;i<steps.length;i++){const step=steps[i],unit=p.id+':'+step.id,needed=base+(i===steps.length-1?total-base*steps.length:0);let left=step.done?0:Math.max(0,needed-(completed[unit]||0));while(left>0&&cursor<=end){const room=allowance(cursor)-used;if(room<=0){cursor=add(cursor,1);used=0;continue;}const amount=Math.min(left,room);items.push({id:C.uid('daily'),planId:p.id,stepId:step.id,unit,text:step.text,date:cursor,minutes:amount,total:needed,done:false,continued:left<needed||amount<left});left-=amount;used+=amount;}if(left>0)overflow.push({planId:p.id,text:step.text,minutes:left});}}
  return {createdAt:date,signature:signature(C,s),items,completed,order:ranked.plans.map(p=>p.id),manualOrder:order,cycle:ranked.cycle,overflow,todayMinutes:requested};
 }
 function mark(C,s,id,done){const ex=C.folder(s)?.execution,item=ex?.items.find(x=>x.id===id);if(!item||item.done===done)return;const p=s.plans.find(p=>p.id===item.planId&&p.status==='adopted');if(!p)throw Error('任务已变化，请重新安排。');item.done=done;ex.completed[item.unit]=Math.max(0,(ex.completed[item.unit]||0)+(done?item.minutes:-item.minutes));const step=p.steps?.find(x=>x.id===item.stepId);if(step)step.done=ex.completed[item.unit]>=item.total;ex.signature=signature(C,s);}
 function sharedBudget(C,s,date=C.today()){
  const raw=s.dailyBudget||{},hours=Number(raw.dailyHours||Math.max(1,...s.folders.map(f=>Number(f.schedule?.dailyHours||0)))),done=s.folders.flatMap(f=>f.execution?.items||[]).filter(x=>x.date===date&&x.done).reduce((n,x)=>n+x.minutes,0);
  const remaining=raw.date===date&&Number.isFinite(raw.todayMinutes)?Math.max(0,raw.todayMinutes-Math.max(0,done-(raw.basedOnDoneMinutes||0))):Math.max(0,hours*60-done);
  return {dailyHours:hours,date,todayMinutes:remaining,doneMinutes:done};
 }
 function arrangeAll(C,s,{date=C.today(),minutes,dailyHours,folderId,manualOrder}={}){
  const next=JSON.parse(JSON.stringify(s)),base=sharedBudget(C,next,date),hours=Number(dailyHours??base.dailyHours);
  if(!Number.isFinite(hours)||hours<.25||hours>16)throw Error('每天总投入需在 0.25–16 小时之间。');
  const available=Number(minutes??(base.date===date&&Number.isFinite(base.todayMinutes)?base.todayMinutes:hours*60));if(!Number.isFinite(available)||available<0||available>hours*60)throw Error('今日剩余时间不能超过每天总投入。');
  next.dailyBudget={dailyHours:hours,date,todayMinutes:available,basedOnDoneMinutes:base.doneMinutes};
  if(folderId&&manualOrder){const f=next.folders.find(f=>f.id===folderId);if(f){f.execution||={};f.execution.manualOrder=manualOrder;}}
  const reservations={};for(const f of next.folders)for(const x of f.execution?.items||[])if(x.done)reservations[x.date]=(reservations[x.date]||0)+x.minutes;
  const finishedToday=reservations[date]||0,limit=d=>d===date?Math.min(Math.floor(hours*60*.85),finishedToday+Math.floor(available*.85)):Math.floor(hours*60*.85);
  const folders=next.folders.filter(f=>next.plans.some(p=>p.folderId===f.id&&p.status==='adopted')).map(f=>({f,score:rank(C,{...next,activeFolderId:f.id},f.execution?.manualOrder||[]).plans[0]?.rankScore||0})).sort((a,b)=>b.score-a.score);
  let queueOrder=0;for(const {f} of folders){const scoped={...next,activeFolderId:f.id},max=Math.round((f.schedule||C.schedule()).dailyHours*60);f.execution=arrange(C,scoped,{date,minutes:Math.min(max,available),_reservations:reservations,_limit:limit});for(const x of f.execution.items){x.queueOrder=queueOrder++;if(!x.done)reservations[x.date]=(reservations[x.date]||0)+x.minutes;}}
  s.dailyBudget=next.dailyBudget;for(const {f} of folders)s.folders.find(x=>x.id===f.id).execution=f.execution;
  return s;
 }
 return {add,active,signature,rank,arrange,arrangeAll,sharedBudget,mark};
});
