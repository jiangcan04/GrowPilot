/* Compositor-friendly requirement cloud with bounded, continuous drift. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.InternPilotCloud=api;})(globalThis,function(){
 'use strict';
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 function pointAt(node,phase){return {x:node.x+Math.sin(phase*node.rate+node.seed)*node.ax,y:node.y+Math.cos(phase*node.rate*.78+node.seed*.67)*node.ay};}
 function easeSpeed(speed,target,dt){return target+(speed-target)*Math.exp(-Math.max(0,dt)/.16);}
 function mount(container,onSelect){
  const labels=[...container.querySelectorAll('.cloud-word')];if(!labels.length)return ()=>{};
  const doc=container.ownerDocument||document,win=doc.defaultView||window,media=win.matchMedia('(prefers-reduced-motion: reduce)'),toggle=container.parentElement.querySelector('[data-cloud-toggle]');
  let frame=0,layoutFrame=0,last=0,phase=0,speed=0,paused=false,hover=false,focused=false,inView=true,dead=false,nodes=[];
  const listeners=[];
  function on(node,type,fn,options){node.addEventListener(type,fn,options);listeners.push(()=>node.removeEventListener(type,fn,options));}
  function layout(){
   const w=container.clientWidth;if(w<20||dead)return;
   const cols=labels.length<=5?1:w<300&&labels.length<=12?1:w>=960?4:w>=640?3:2,rows=Math.ceil(labels.length/cols),paddingX=14,paddingY=26;
   container.style.minHeight=Math.max(320,rows*44+paddingY*2)+'px';
   const h=container.clientHeight,cw=(w-paddingX*2)/cols,ch=(h-paddingY*2)/rows;
   nodes=labels.map((el,i)=>{
    const row=Math.floor(i/cols),col=i%cols;
    let font=clamp(Number(el.dataset.size)||24,10,44);el.style.maxWidth='none';el.style.fontSize=font+'px';
    while((el.offsetWidth>cw-18||el.offsetHeight>ch-12)&&font>10){font--;el.style.fontSize=font+'px';}
    el.style.maxWidth=Math.max(40,cw-18)+'px';
    const width=el.offsetWidth,height=el.offsetHeight,roomX=Math.max(0,(cw-width-10)/2),roomY=Math.max(0,(ch-height-8)/2);
    const ax=Math.min(16,roomX*.4),ay=Math.min(8,roomY*.72),stagger=cols===1?[0,.75,-.85,.6,-.45][i%5]:row%2?.12:-.12;
    const left=paddingX+col*cw,widthHalf=width/2;
    const x=clamp(left+cw/2+stagger*roomX,left+widthHalf+ax+4,left+cw-widthHalf-ax-4);
    return {el,x,y:paddingY+ch*(row+.5),ax,ay,w:width,h:height,rate:.34+(i%4)*.045,seed:i*1.83};
   });
   paint();
  }
  function paint(){for(const node of nodes){const p=pointAt(node,phase);node.el.style.transform='translate3d('+(p.x-node.w/2).toFixed(3)+'px,'+(p.y-node.h/2).toFixed(3)+'px,0)';}}
  const available=()=>!dead&&!media.matches&&inView&&!doc.hidden;
  const wantsMotion=()=>available()&&!paused&&!hover&&!focused;
  function tick(time){
   frame=0;if(!available()){speed=0;return;}
   const dt=Math.min(.05,Math.max(0,(time-last)/1000));last=time;
   const target=wantsMotion()?1:0,next=easeSpeed(speed,target,dt);
   phase+=dt*(speed+next)/2;speed=next;paint();
   if(target||speed>.001)frame=win.requestAnimationFrame(tick);else speed=0;
  }
  function sync(){
   const moving=wantsMotion();container.dataset.motion=media.matches?'reduced':moving?'moving':'paused';
   if(toggle){toggle.disabled=media.matches;toggle.textContent=media.matches?'已按系统偏好减少动画':paused?'继续流动':'暂停流动';toggle.setAttribute('aria-pressed',String(paused));}
   if(!available()){speed=0;if(frame)win.cancelAnimationFrame(frame);frame=0;last=0;return;}
   if((moving||speed>.001)&&!frame){last=win.performance.now();frame=win.requestAnimationFrame(tick);}
  }
  function queueLayout(){if(dead||layoutFrame)return;layoutFrame=win.requestAnimationFrame(()=>{layoutFrame=0;layout();sync();});}
  on(container,'pointerenter',()=>{hover=true;sync();});
  on(container,'pointerleave',()=>{hover=false;sync();});
  on(container,'focusin',()=>{focused=true;sync();});
  on(container,'focusout',e=>{focused=!!e.relatedTarget&&container.contains(e.relatedTarget);sync();});
  on(container,'click',e=>{const word=e.target.closest('.cloud-word');if(word&&container.contains(word))onSelect(word.dataset.key);});
  if(toggle)on(toggle,'click',()=>{paused=!paused;sync();});
  on(doc,'visibilitychange',sync);on(media,'change',sync);
  const resize=win.ResizeObserver?new win.ResizeObserver(queueLayout):null;
  const visible=win.IntersectionObserver?new win.IntersectionObserver(entries=>{inView=!!entries[0]?.isIntersecting;sync();},{threshold:.05}):null;
  if(resize)resize.observe(container);else on(win,'resize',queueLayout);
  visible?.observe(container);doc.fonts?.ready.then(()=>{if(!dead)queueLayout();});
  layout();sync();
  return ()=>{dead=true;win.cancelAnimationFrame(frame);win.cancelAnimationFrame(layoutFrame);resize?.disconnect();visible?.disconnect();listeners.forEach(fn=>fn());container.dataset.motion='paused';};
 }
 return {mount,pointAt,easeSpeed};
});
