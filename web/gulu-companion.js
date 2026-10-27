/* GrowPilot's browser-local companion. No model calls or background notifications. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.GrowPilotGulu=api;})(globalThis,function(){
 'use strict';
 function clamp(position,width,height,size=104){const edge=8,maxX=Math.max(edge,width-size-edge),maxY=Math.max(edge,height-size-edge);return {x:Math.min(maxX,Math.max(edge,Number.isFinite(position?.x)?position.x:width-size-28)),y:Math.min(maxY,Math.max(edge,Number.isFinite(position?.y)?position.y:height-size-30))};}
 function summary(C,s,date=C.today()){
  const active=new Set(s.plans.filter(p=>p.status==='adopted').map(p=>p.id)),tracked=new Set(s.plans.filter(p=>['adopted','completed'].includes(p.status)).map(p=>p.id)),entries=s.folders.flatMap(folder=>(folder.execution?.items||[]).filter(x=>x.date===date&&tracked.has(x.planId)).map(x=>({...x,folderId:folder.id,folderName:folder.name}))).sort((a,b)=>(a.queueOrder??1e9)-(b.queueOrder??1e9)),pending=entries.filter(x=>!x.done&&active.has(x.planId)),done=entries.filter(x=>x.done),current=pending[0];
  const unarranged=s.folders.find(folder=>s.plans.some(p=>p.folderId===folder.id&&p.status==='adopted')&&(!folder.execution||folder.execution.signature!==JSON.stringify({schedule:folder.schedule,plans:s.plans.filter(p=>p.folderId===folder.id&&p.status==='adopted').map(p=>({id:p.id,hours:p.hours,steps:p.steps,prerequisites:p.prerequisiteIds,keys:p.requirementKeys||[p.requirementKey]}))})));
  return {entries,pending,done,next:current,minutes:pending.reduce((n,x)=>n+x.minutes,0),unarranged,active:active.size};
 }
 function context(C,s,page,date=C.today()){
  const daily=summary(C,s,date),folder=C.folder(s),actions=(...items)=>items.map(([label,act,id=''])=>({label,act,id}));
  if(daily.next)return {text:'今天还有 '+daily.pending.length+' 个小步骤，约 '+daily.minutes+' 分钟。可以从「'+daily.next.text+'」开始。',detail:'来自 '+daily.next.folderName,actions:actions(['带我开始','gulu-start'],['这页下一步','gulu-context']),daily};
  if(daily.unarranged)return {text:'你已选择了要推进的计划。先排进每一天，我就能提醒你从哪里开始。',detail:'来自 '+daily.unarranged.name,actions:actions(['安排每日行动','gulu-arrange'],['这页下一步','gulu-context']),daily};
  if(daily.done.length)return {text:'今天已经完成 '+daily.done.length+' 个小步骤。可以登记一份成果，也可以先休息。',detail:'只统计你确认完成的记录',actions:actions(['登记成果','choose-outcome'],['看看后续安排','gulu-today']),daily};
  return {...stage(C,s,page),daily};
 }
 function stage(C,s,page){const folder=C.folder(s),action=(label,act,id='')=>({label,act,id});
  if(page==='review'&&!folder)return {text:'可以先补充教育、课程或项目经历，之后在不同求职方向中复用。',actions:[action('新增一条经历','experience'),action('选择求职方向','gulu-page','goal')]};
  if(!folder)return {text:'我是咕噜。先选一个想探索的求职方向，我们再一步步准备。',actions:[action('选择求职方向','gulu-page','goal')]};
  const table={goal:{text:'先筛选你感兴趣的岗位，收藏到方向文件夹。我们就能看清这个方向需要什么。',actions:[action('查看目标文件夹','gulu-goal-folder'),action('去看经历匹配','gulu-page','evidence')]},evidence:{text:C.personalDocuments(s).length?'先看自己已有的能力，再为待提升的部分生成求职成长建议。':'先上传简历或补充一段真实经历，让匹配有材料可依据。',actions:[action(C.personalDocuments(s).length?'查看能力匹配':'补充个人材料','gulu-evidence')]},plans:{text:'选择这一轮真正想做的建议，再到页面底部安排执行。少做一点，也可以持续往前。',actions:[action('去安排本轮计划','gulu-plan-bottom')]},today:{text:'今天暂时没有待执行的小步骤。可以查看后续日期，或回成长计划安排下一轮。',actions:[action('查看每日安排','gulu-today'),action('选择本轮计划','gulu-page','plans')]},review:{text:'成果形式不限，写清你做了什么。整理成经历后，核对内容再加入经历库。',actions:[action('登记成果','choose-outcome'),action('查看经历库','show-library')]}};
  return {...table[page]||table.today,detail:folder.name};
 }
 function mount({root,getPrefs,savePrefs,onToggle}){
  let drag=null,suppress=false;
  const size=()=>getPrefs().collapsed?72:112;
  function position(){const pos=clamp(getPrefs().position,window.innerWidth,window.innerHeight,size());root.style.left=pos.x+'px';root.style.top=pos.y+'px';placeBubble();return pos;}
  function placeBubble(){const bubble=root.querySelector('.gulu-bubble');if(!bubble)return;const box=root.getBoundingClientRect(),w=Math.min(294,window.innerWidth-20);bubble.style.width=w+'px';const h=bubble.offsetHeight,x=Math.max(10,Math.min(window.innerWidth-w-10,box.x+box.width/2-w+38)),above=box.y>=h+22,y=above?box.y-h-13:Math.min(window.innerHeight-h-10,box.bottom+13);bubble.style.left=x+'px';bubble.style.top=Math.max(10,y)+'px';bubble.dataset.side=above?'above':'below';bubble.style.setProperty('--gulu-tail',Math.max(20,Math.min(w-22,box.x+box.width/2-x))+'px');}
  root.addEventListener('pointerdown',e=>{if(!e.target.closest('.gulu-avatar')||e.button!==0)return;const box=root.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:box.x,top:box.y,moved:false};suppress=false;e.target.closest('.gulu-avatar').setPointerCapture(e.pointerId);});
  root.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>5)drag.moved=true;if(!drag.moved)return;const pos=clamp({x:drag.left+dx,y:drag.top+dy},window.innerWidth,window.innerHeight,size());root.style.left=pos.x+'px';root.style.top=pos.y+'px';root.classList.add('is-dragging');placeBubble();});
  function end(e){if(!drag||drag.id!==e.pointerId)return;if(drag.moved){const box=root.getBoundingClientRect();savePrefs({...getPrefs(),position:{x:box.x,y:box.y}});suppress=true;}drag=null;root.classList.remove('is-dragging');}
  root.addEventListener('pointerup',end);root.addEventListener('pointercancel',end);
  root.addEventListener('click',e=>{if(!e.target.closest('.gulu-avatar'))return;if(suppress){suppress=false;e.preventDefault();e.stopPropagation();return;}onToggle();e.stopPropagation();});
  root.addEventListener('keydown',e=>{if(!e.target.closest('.gulu-avatar')||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const pos=position(),delta=e.shiftKey?30:10;if(e.key==='ArrowLeft')pos.x-=delta;if(e.key==='ArrowRight')pos.x+=delta;if(e.key==='ArrowUp')pos.y-=delta;if(e.key==='ArrowDown')pos.y+=delta;savePrefs({...getPrefs(),position:clamp(pos,window.innerWidth,window.innerHeight,size())});position();});
  window.addEventListener('resize',()=>{const pos=position();savePrefs({...getPrefs(),position:pos});});
  return {update(html){root.innerHTML=html;root.classList.toggle('is-small',!!getPrefs().collapsed);root.classList.toggle('bird-still',!!getPrefs().still);position();},position};
 }
 return {clamp,summary,context,stage,mount};
});
