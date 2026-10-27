/* Lightweight moving, collision-aware requirement cloud. No chart dependencies. */
(function(root){
 'use strict';
 function mount(container,onSelect){
  const labels=[...container.querySelectorAll('.cloud-word')];if(!labels.length)return ()=>{};
  const media=matchMedia('(prefers-reduced-motion: reduce)'),toggle=container.parentElement.querySelector('[data-cloud-toggle]');
  let frame=0,last=0,paused=false,hover=false,focused=false,inView=true,dead=false,nodes=[],size={w:0,h:0};
  function layout(){
   const w=container.clientWidth,h=container.clientHeight;size={w,h};if(w<20)return;
   const cols=Math.max(1,Math.min(w<540?2:w<850?3:4,Math.ceil(Math.sqrt(labels.length*w/(h*2.4))))),rows=Math.ceil(labels.length/cols),cw=w/cols,ch=h/rows;
   nodes=labels.map((el,i)=>{let font=Number(el.dataset.size)||24;el.style.fontSize=font+'px';while(el.offsetWidth>cw-14&&font>11){font--;el.style.fontSize=font+'px';}const row=Math.floor(i/cols),col=i%cols,offset=row%2?Math.min(10,cw*.05):-Math.min(10,cw*.05);return {el,x:Math.min(w-el.offsetWidth/2-8,Math.max(el.offsetWidth/2+8,cw*(col+.5)+offset)),y:ch*(row+.5),vx:Math.cos(i*2.399)*7,vy:Math.sin(i*2.399)*7,w:el.offsetWidth,h:el.offsetHeight,seed:i*1.618};});
   paint();
  }
  function paint(){for(const n of nodes){n.x=Math.max(n.w/2+5,Math.min(size.w-n.w/2-5,n.x));n.y=Math.max(n.h/2+5,Math.min(size.h-n.h/2-5,n.y));n.el.style.transform='translate('+(n.x-n.w/2).toFixed(2)+'px,'+(n.y-n.h/2).toFixed(2)+'px)';}}
  function active(){return !paused&&!hover&&!focused&&!media.matches&&inView&&!document.hidden&&!dead;}
  function tick(time){frame=0;if(!active())return;const dt=Math.min(.035,(time-last)/1000||.016);last=time;
   for(const n of nodes){n.vx+=Math.sin(time/2300+n.seed)*dt*3;n.vy+=Math.cos(time/3100+n.seed)*dt*2;n.vx=Math.max(-13,Math.min(13,n.vx));n.vy=Math.max(-11,Math.min(11,n.vy));n.x+=n.vx*dt;n.y+=n.vy*dt;
    if(n.x<n.w/2+9){n.x=n.w/2+9;n.vx=Math.abs(n.vx)+1;}if(n.x>size.w-n.w/2-9){n.x=size.w-n.w/2-9;n.vx=-Math.abs(n.vx)-1;}if(n.y<n.h/2+9){n.y=n.h/2+9;n.vy=Math.abs(n.vy)+1;}if(n.y>size.h-n.h/2-9){n.y=size.h-n.h/2-9;n.vy=-Math.abs(n.vy)-1;}
   }
   for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const a=nodes[i],b=nodes[j],dx=b.x-a.x,dy=b.y-a.y,ox=(a.w+b.w)/2+13-Math.abs(dx),oy=(a.h+b.h)/2+12-Math.abs(dy);if(ox>0&&oy>0){if(ox<oy){const v=Math.sign(dx)||1;a.x-=v*ox*.5;b.x+=v*ox*.5;a.vx=-v*Math.max(3,Math.abs(a.vx));b.vx=v*Math.max(3,Math.abs(b.vx));}else{const v=Math.sign(dy)||1;a.y-=v*oy*.5;b.y+=v*oy*.5;a.vy=-v*Math.max(3,Math.abs(a.vy));b.vy=v*Math.max(3,Math.abs(b.vy));}}}
   paint();frame=requestAnimationFrame(tick);
  }
  function sync(){if(toggle){toggle.textContent=paused?'播放流动':'暂停流动';toggle.setAttribute('aria-pressed',String(paused));toggle.disabled=media.matches;if(media.matches)toggle.textContent='已按系统偏好减少动画';}if(active()&&!frame){last=performance.now();frame=requestAnimationFrame(tick);}else if(!active()&&frame){cancelAnimationFrame(frame);frame=0;}}
  function click(event){const el=event.target.closest('.cloud-word');if(el)onSelect(el.dataset.key);}
  const enter=()=>{hover=true;sync();},leave=()=>{hover=false;sync();},pause=()=>{paused=!paused;sync();},focusIn=()=>{focused=true;sync();},focusOut=()=>{focused=false;sync();};
  container.addEventListener('pointerenter',enter);container.addEventListener('pointerleave',leave);container.addEventListener('focusin',focusIn);container.addEventListener('focusout',focusOut);container.addEventListener('click',click);toggle?.addEventListener('click',pause);document.addEventListener('visibilitychange',sync);media.addEventListener('change',sync);
  const resize=new ResizeObserver(layout),visible=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;sync();});resize.observe(container);visible.observe(container);layout();sync();
  return ()=>{dead=true;cancelAnimationFrame(frame);resize.disconnect();visible.disconnect();container.removeEventListener('pointerenter',enter);container.removeEventListener('pointerleave',leave);container.removeEventListener('focusin',focusIn);container.removeEventListener('focusout',focusOut);container.removeEventListener('click',click);toggle?.removeEventListener('click',pause);document.removeEventListener('visibilitychange',sync);media.removeEventListener('change',sync);};
 }
 root.InternPilotCloud={mount};
})(globalThis);
