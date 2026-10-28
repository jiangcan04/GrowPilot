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
 const SLEEP_AFTER=60000;
 const REACTIONS={
  pat:{mood:'happy',action:'pet',ms:2600,text:'收到鼓励啦，陪你继续。'},
  greet:{mood:'happy',action:'greet',ms:2200,text:'我在，今天也一步一步来。'},
  celebrate:{mood:'happy',action:'celebrate',ms:3600,text:'又向前一步！给认真准备的你一颗星。'},
  focusDone:{mood:'happy',action:'celebrate',ms:5000,text:'专注计时结束啦，起来活动一下吧。'},
  focusSaveError:{mood:'happy',action:'celebrate',ms:7000,text:'专注时间到啦；计时状态未保存，请检查浏览器存储空间。'},
  land:{mood:'curious',action:'land',ms:800,text:''},
  wake:{mood:'curious',action:'wake',ms:1300,text:'我醒啦，继续陪你。'},
  curious:{mood:'curious',action:'look',ms:2100,text:''},
  stretch:{mood:'idle',action:'stretch',ms:1800,text:''},
  wink:{mood:'wink',action:'greet',ms:1400,text:''},
  walk:{mood:'curious',action:'walk',ms:2300,text:'走两步，再回来陪你。'},
  typing:{mood:'focus',action:'nod',ms:650,text:''}
 };
 function createActor(start=Date.now()){
  const s={lastActivity:start,hover:false,dragging:false,resting:false,reaction:null,until:0};
  function react(kind,time=Date.now()){
   if(kind==='rest'){s.resting=true;s.reaction={mood:'sleep',action:'sleep',text:'我先眯一会儿，点我就回来。'};s.until=time+2600;s.lastActivity=time;return;}
   if(!Object.prototype.hasOwnProperty.call(REACTIONS,kind))return;
   s.resting=false;s.lastActivity=time;s.reaction=REACTIONS[kind];s.until=time+s.reaction.ms;
  }
  function activity(time=Date.now(),flags={}){
   const waking=!s.resting&&!flags.focus&&time-s.lastActivity>=SLEEP_AFTER;
   s.lastActivity=time;if(waking)react('wake',time);
  }
  return {react,activity,
   hover(value,time=Date.now(),flags={}){s.hover=!!value;if(value){if(s.resting)react('wake',time);activity(time,flags);}},
   drag(value,time=Date.now()){s.dragging=!!value;activity(time);if(value)s.resting=false;},
   view(time=Date.now(),flags={}){
    const recent=time<s.until?s.reaction:null;
    if(s.dragging)return {mood:'surprised',action:'drag',text:'',sleeping:false};
    if(recent)return {...recent,sleeping:recent.mood==='sleep'};
    if(s.resting)return {mood:'sleep',action:'sleep',text:'',sleeping:true};
    if(flags.focus)return {mood:'focus',action:'idle',text:'',sleeping:false};
    if(time-s.lastActivity>=SLEEP_AFTER)return {mood:'sleep',action:'sleep',text:'',sleeping:true};
    return {mood:s.hover?'happy':'idle',action:'idle',text:'',sleeping:false};
   }
  };
 }
 function gaze(dx,dy,reduced=false){
  if(reduced||!Number.isFinite(dx)||!Number.isFinite(dy))return {x:0,y:0};
  return {x:Math.max(-2.6,Math.min(2.6,dx/140)),y:Math.max(-1.8,Math.min(1.8,dy/180))};
 }
 function focusStatus(prefs,now=Date.now()){
  const end=Number(prefs?.focusEndsAt),duration=Number(prefs?.focusDurationMs);
  if(!Number.isFinite(end)||end<=0||!Number.isFinite(duration)||duration<60000||duration>90*60000)return null;
  const remaining=Math.max(0,end-now);
  return {end,remaining,expired:remaining===0,progress:Math.max(0,Math.min(1,1-remaining/duration))};
 }
 function startFocusPrefs(prefs,now=Date.now(),minutes=25){
  const duration=Math.round(Math.max(1,Math.min(90,Number(minutes)||25)))*60000;
  return {...prefs,focusEndsAt:now+duration,focusDurationMs:duration};
 }
 function formatRemaining(ms){const sec=Math.max(0,Math.ceil(Number(ms)/1000)||0);return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');}
 function art(){
  const eye=(name,x,y)=>'<g class="gulu-eye-orient '+name+'" transform="translate('+x+' '+y+') rotate(-26)"><g class="gulu-eye-lid"><ellipse class="gulu-eye-normal" rx="2.9" ry="6.1"/><path class="gulu-eye-smile" d="M-3.3 1.2Q0-4.2 3.3 1.2"/><path class="gulu-eye-rest" d="M-3.3 0Q0 1.8 3.3 0"/><ellipse class="gulu-eye-surprise" rx="3.4" ry="4.8"/><path class="gulu-eye-brow" d="M-4-7L3-6"/></g></g>';
  return '<svg class="gulu-folded gulu-expressive" viewBox="0 0 140 132" role="img" aria-label="会眨眼和回应互动的折纸小鸟咕噜"><g class="gulu-action-layer"><g class="bird-body"><image href="./assets/gulu/gulu-expression-base-v1.png" x="-4.69072" y="-11.28866" width="148.08247" height="148.08247"/><g class="gulu-eye-pair">'+eye('gulu-eye-left',95.2,42.3)+eye('gulu-eye-right',106.8,37.2)+'</g></g></g><g class="gulu-sparkles" aria-hidden="true"><path class="spark spark-one" d="M22 19l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/><path class="spark spark-two" d="M115 8l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/><path class="spark spark-three" d="M131 67l1.5 4.5L137 73l-4.5 1.5L131 79l-1.5-4.5L125 73l4.5-1.5z"/></g><g class="gulu-hearts" aria-hidden="true"><path d="M24 45c-12-7-8-15-2-12l2 3 2-3c6-3 10 5-2 12z"/><path d="M119 29c-10-6-7-13-2-10l2 2 2-2c5-3 8 4-2 10z"/></g><g class="gulu-zzz" aria-hidden="true"><text x="115" y="19">z</text><text x="125" y="9">z</text></g></svg>';
 }
 function mount({root,getPrefs,savePrefs,onToggle,getIdentity=()=>null}){
  const win=window,doc=win.document,media=win.matchMedia?.('(prefers-reduced-motion: reduce)');
  let actor=createActor(),identity=getIdentity(),drag=null,suppress=false,clickTimer=0,leaveTimer=0,lastDragAt=-Infinity,frame=0,lastPointer=null,nextIdle=Date.now()+16000,lastKeyReaction=0,handledFocusEnd=0,retryFocusAt=0,disposed=false;
  const listeners=[],size=()=>getPrefs().collapsed?72:112;
  const listen=(node,type,fn,options)=>{node.addEventListener(type,fn,options);listeners.push(()=>node.removeEventListener(type,fn,options));};
  const reduced=()=>!!getPrefs().still||!!media?.matches;
  const focusFlags=()=>({focus:(focusStatus(getPrefs())?.remaining||0)>0});
  const text=(el,value)=>{if(el&&el.textContent!==value)el.textContent=value;};
  function syncIdentity(){
   const current=getIdentity();if(current===identity)return;
   identity=current;actor=createActor();drag=null;suppress=false;lastPointer=null;lastDragAt=-Infinity;lastKeyReaction=0;handledFocusEnd=0;retryFocusAt=0;nextIdle=Date.now()+16000;
   win.clearTimeout(clickTimer);win.clearTimeout(leaveTimer);root.classList.remove('is-dragging','gulu-hover');
   root.style.setProperty('--gulu-look-x','0px');root.style.setProperty('--gulu-look-y','0px');
  }
  function placeBubble(){
   const box=root.getBoundingClientRect(),vw=win.innerWidth,vh=win.innerHeight,bubble=root.querySelector('.gulu-bubble');
   if(bubble){const w=Math.min(294,vw-20);bubble.style.width=w+'px';const h=bubble.offsetHeight,x=Math.max(10,Math.min(vw-w-10,box.x+box.width/2-w+38)),above=box.y>=h+22,y=above?box.y-h-13:Math.min(vh-h-10,box.bottom+13);bubble.style.left=x+'px';bubble.style.top=Math.max(10,y)+'px';bubble.dataset.side=above?'above':'below';bubble.style.setProperty('--gulu-tail',Math.max(20,Math.min(w-22,box.x+box.width/2-x))+'px');}
   const tools=root.querySelector('.gulu-pet-tools'),notice=root.querySelector('.gulu-reaction-note');
   if(tools){tools.style.left=Math.max(8,Math.min(vw-140,box.x+box.width/2-66))+'px';tools.style.top=(box.y>75?box.y-43:Math.min(vh-44,box.bottom+5))+'px';}
   if(notice){notice.style.left=Math.max(10,Math.min(vw-200,box.x+box.width/2-95))+'px';notice.style.top=(box.y>140?box.y-notice.offsetHeight-52:Math.min(vh-notice.offsetHeight-10,box.bottom+54))+'px';}
   root.style.setProperty('--gulu-walk-distance',box.x+box.width/2>vw/2?'-18px':'18px');
  }
  function position(){const pos=clamp(getPrefs().position,win.innerWidth,win.innerHeight,size());root.style.left=pos.x+'px';root.style.top=pos.y+'px';placeBubble();return pos;}
  function paint(){
   if(disposed)return;
   syncIdentity();
   const now=Date.now(),prefs=getPrefs(),focus=focusStatus(prefs,now),view=actor.view(now,{focus:!!focus&&!focus.expired});
   root.dataset.mood=view.mood;root.dataset.action=view.action;
   root.classList.toggle('bird-still',reduced());root.classList.toggle('gulu-paused',!!doc.hidden);
   root.classList.toggle('gulu-has-focus',!!focus&&!focus.expired);
   const badge=root.querySelector('[data-gulu-status]');
   if(badge){text(badge,focus&&!focus.expired?formatRemaining(focus.remaining):view.sleeping?'小憩中':view.mood==='happy'?'开心':'');badge.hidden=!badge.textContent;}
   const notice=root.querySelector('.gulu-reaction-note'),line=root.querySelector('.gulu-dialog-reaction');
   if(notice){text(notice,view.text||'');notice.hidden=!view.text||!!root.querySelector('.gulu-bubble');}
   if(line){text(line,view.text||'');line.hidden=!view.text;}
   root.querySelectorAll('[data-gulu-countdown]').forEach(el=>{text(el,focus?formatRemaining(focus.remaining):'25:00');});
   root.querySelectorAll('[data-gulu-focus-panel]').forEach(el=>{el.hidden=!focus||focus.expired;});
   root.querySelectorAll('[data-act="gulu-focus"]').forEach(el=>{el.disabled=!!focus&&!focus.expired;text(el,focus&&!focus.expired?'专注中':'专注 25 分钟');});
   placeBubble();
  }
  function react(kind){
   actor.react(kind);nextIdle=Date.now()+18000;
   if(['pat','greet','celebrate','focusDone','walk'].includes(kind)){root.classList.remove('gulu-effect-replay');void root.offsetWidth;root.classList.add('gulu-effect-replay');}
   paint();
  }
  function applyGaze(){
   frame=0;if(disposed||!lastPointer||root.hidden||doc.hidden)return;
   const view=actor.view(),box=root.getBoundingClientRect(),offset=gaze(lastPointer.x-box.x-box.width/2,lastPointer.y-box.y-box.height/2,reduced()||view.sleeping||!!drag);
   root.style.setProperty('--gulu-look-x',offset.x+'px');root.style.setProperty('--gulu-look-y',offset.y+'px');
  }
  function activity(event){
   const now=Date.now();actor.activity(now,focusFlags());
   if(event?.type==='keydown'&&!reduced()&&now-lastKeyReaction>2500&&actor.view(now).action==='idle'){lastKeyReaction=now;actor.react('typing',now);}
  }
  listen(doc,'pointermove',e=>{activity();if(root.hidden||doc.hidden||reduced())return;lastPointer={x:e.clientX,y:e.clientY};if(!frame)frame=win.requestAnimationFrame(applyGaze);},{passive:true});
  listen(doc,'keydown',activity);listen(doc,'scroll',activity,{passive:true});
  listen(doc,'visibilitychange',()=>{if(!doc.hidden)actor.activity();paint();});
  listen(root,'pointerenter',()=>{win.clearTimeout(leaveTimer);actor.hover(true,Date.now(),focusFlags());root.classList.add('gulu-hover');paint();});
  listen(root,'pointerleave',()=>{actor.hover(false);leaveTimer=win.setTimeout(()=>root.classList.remove('gulu-hover'),220);paint();});
  listen(root,'pointerdown',e=>{
   const avatar=e.target.closest('.gulu-avatar');if(!avatar||e.button!==0)return;
   win.clearTimeout(clickTimer);const box=root.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:box.x,top:box.y,moved:false};suppress=false;avatar.setPointerCapture?.(e.pointerId);
  });
  listen(root,'pointermove',e=>{
   if(!drag||drag.id!==e.pointerId)return;
   const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>5)drag.moved=true;if(!drag.moved)return;
   actor.drag(true);const pos=clamp({x:drag.left+dx,y:drag.top+dy},win.innerWidth,win.innerHeight,size());root.style.left=pos.x+'px';root.style.top=pos.y+'px';root.style.setProperty('--gulu-drag-tilt',Math.max(-13,Math.min(13,dx/11))+'deg');root.classList.add('is-dragging');paint();
  });
  function end(e){
   if(!drag||drag.id!==e.pointerId)return;
   const moved=drag.moved;drag=null;actor.drag(false);root.classList.remove('is-dragging');root.style.setProperty('--gulu-drag-tilt','0deg');
   if(moved){const box=root.getBoundingClientRect();savePrefs({...getPrefs(),position:{x:box.x,y:box.y}});suppress=true;lastDragAt=Date.now();react('land');}
  }
  listen(root,'pointerup',end);listen(root,'pointercancel',end);listen(root,'lostpointercapture',end);
  listen(root,'click',e=>{
   if(!e.target.closest('.gulu-avatar'))return;
   e.stopPropagation();if(suppress&&e.detail>0&&Date.now()-lastDragAt<500){suppress=false;e.preventDefault();return;}suppress=false;
   win.clearTimeout(clickTimer);if(e.detail>1)return;
   const toggle=()=>{if(actor.view(Date.now(),focusFlags()).sleeping)react('wake');else actor.activity(Date.now(),focusFlags());onToggle();paint();};
   if(e.detail===0)toggle();else clickTimer=win.setTimeout(toggle,500);
  });
  listen(root,'dblclick',e=>{if(!e.target.closest('.gulu-avatar')||Date.now()-lastDragAt<500)return;win.clearTimeout(clickTimer);e.preventDefault();e.stopPropagation();react('pat');});
  listen(root,'keydown',e=>{
   if(!e.target.closest('.gulu-avatar')||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
   e.preventDefault();const pos=position(),delta=e.shiftKey?30:10;if(e.key==='ArrowLeft')pos.x-=delta;if(e.key==='ArrowRight')pos.x+=delta;if(e.key==='ArrowUp')pos.y-=delta;if(e.key==='ArrowDown')pos.y+=delta;savePrefs({...getPrefs(),position:clamp(pos,win.innerWidth,win.innerHeight,size())});actor.activity();position();
  });
  listen(win,'resize',()=>{const pos=position();savePrefs({...getPrefs(),position:pos});});
  const motionChange=()=>{root.style.setProperty('--gulu-look-x','0px');root.style.setProperty('--gulu-look-y','0px');paint();};
  media?.addEventListener?.('change',motionChange);
  const timer=win.setInterval(()=>{
   if(root.hidden||doc.hidden||disposed)return;
   syncIdentity();
   const now=Date.now(),focus=focusStatus(getPrefs(),now);
   if(focus?.expired){
    if(focus.end!==handledFocusEnd){handledFocusEnd=focus.end;react('focusDone');}
    if(now>=retryFocusAt){try{savePrefs({...getPrefs(),focusEndsAt:null});retryFocusAt=0;}catch{retryFocusAt=now+30000;react('focusSaveError');}}
   }
   const view=actor.view(now,{focus:!!focus&&!focus.expired});
   if(now>=nextIdle){nextIdle=now+16000+Math.random()*12000;if(!reduced()&&!focus&&!getPrefs().collapsed&&!root.querySelector('.gulu-bubble')&&view.action==='idle')actor.react(['curious','stretch','wink'][Math.floor(Math.random()*3)],now);}
   paint();
  },500);
  return {position,react,
   startFocus(minutes=25){if(focusStatus(getPrefs())?.remaining>0)return;syncIdentity();actor.activity();savePrefs(startFocusPrefs(getPrefs(),Date.now(),minutes));handledFocusEnd=0;retryFocusAt=0;react('greet');},
   stopFocus(){savePrefs({...getPrefs(),focusEndsAt:null});actor.activity();retryFocusAt=0;paint();},
   update(html){
    syncIdentity();const active=doc.activeElement,restore=!!active&&root.contains(active),wasAvatar=active?.closest('.gulu-avatar'),act=active?.dataset?.act,id=active?.dataset?.id,settingsOpen=root.querySelector('.gulu-settings')?.open;
    root.innerHTML=html;if(settingsOpen){const settings=root.querySelector('.gulu-settings');if(settings)settings.open=true;}root.classList.toggle('is-small',!!getPrefs().collapsed);position();paint();
    if(restore){const target=!wasAvatar&&act?[...root.querySelectorAll('[data-act]')].find(el=>el.dataset.act===act&&el.dataset.id===id):null;(target||root.querySelector('.gulu-avatar'))?.focus({preventScroll:true});}
   },
   dispose(){disposed=true;win.clearInterval(timer);win.clearTimeout(clickTimer);win.clearTimeout(leaveTimer);if(frame)win.cancelAnimationFrame(frame);listeners.forEach(fn=>fn());media?.removeEventListener?.('change',motionChange);}
  };
 }
 return {clamp,summary,context,stage,mount,createActor,gaze,focusStatus,startFocusPrefs,formatRemaining,art};
});
