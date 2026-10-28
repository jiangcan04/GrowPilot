import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),P=require('../web/word-cloud.js'),source=readFileSync(new URL('../web/word-cloud.js',import.meta.url),'utf8');
class Events{
 constructor(){this.events=new Map();}
 addEventListener(type,fn){if(!this.events.has(type))this.events.set(type,new Set());this.events.get(type).add(fn);}
 removeEventListener(type,fn){this.events.get(type)?.delete(fn);}
 fire(type,data={}){for(const fn of this.events.get(type)||[])fn({type,...data});}
 count(){return [...this.events.values()].reduce((n,set)=>n+set.size,0);}
}
class Word{
 constructor(i){this.dataset={key:'requirement-'+i,size:String(25+(i%4)*5)};this.style={};this.length=7+i%7;}
 get offsetWidth(){return Math.min(this.length*(parseFloat(this.style.fontSize)||24)+26,parseFloat(this.style.maxWidth)||Infinity);}
 get offsetHeight(){return (parseFloat(this.style.fontSize)||24)*1.2+16;}
 closest(selector){return selector==='.cloud-word'?this:null;}
}
function fixture({width=343,count=4,reduced=false}={}){
 let now=1000,id=0;const frames=new Map(),media=new Events(),doc=new Events(),win=new Events(),container=new Events(),toggle=new Events();
 media.matches=reduced;doc.hidden=false;const labels=Array.from({length:count},(_,i)=>new Word(i)),selected=[];
 let resize,visible;
 Object.assign(win,{document:doc,performance:{now:()=>now},matchMedia:()=>media,
  requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),
  ResizeObserver:class{constructor(cb){this.cb=cb;resize=this;}observe(){}disconnect(){this.disconnected=true;}},
  IntersectionObserver:class{constructor(cb){this.cb=cb;visible=this;}observe(){}disconnect(){this.disconnected=true;}}
 });
 doc.defaultView=win;container.ownerDocument=doc;container.dataset={};container.style={};container.clientWidth=width;
 Object.defineProperty(container,'clientHeight',{get:()=>Math.max(360,parseFloat(container.style.minHeight)||0)});
 container.querySelectorAll=()=>labels;container.contains=el=>labels.includes(el);container.parentElement={querySelector:()=>toggle};
 toggle.attributes={};toggle.setAttribute=(k,v)=>toggle.attributes[k]=v;
 const module={exports:{}};vm.runInNewContext(source,{module,window:win,document:doc});
 const dispose=module.exports.mount(container,key=>selected.push(key));
 return {container,labels,toggle,media,doc,win,frames,selected,dispose,
  advance(ms,hz=60){const end=now+ms,step=1000/hz;while(now<end-.00001){now=Math.min(end,now+step);const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(now));}},
  get observers(){return {resize,visible};}
 };
}
function boxes(f){return f.labels.map(el=>{const match=el.style.transform.match(/translate3d\(([-\d.]+)px,([-\d.]+)px,0\)/);assert(match);return {x:Number(match[1]),y:Number(match[2]),w:el.offsetWidth,h:el.offsetHeight};});}
function assertLayout(f){
 const list=boxes(f);
 for(const a of list){assert(a.x>=0&&a.y>=0,'word must stay inside top/left');assert(a.x+a.w<=f.container.clientWidth+1,'word must stay inside right');assert(a.y+a.h<=f.container.clientHeight+1,'word must stay inside bottom');}
 for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){const a=list[i],b=list[j],ox=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x),oy=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);assert(ox<=1||oy<=1,'requirement labels must not overlap');}
}
test('smooth trajectories stay inside the canvas without label collisions across sparse and dense narrow layouts',()=>{
 for(const width of [240,343,700])for(const count of [1,4,8,24]){
  const f=fixture({width,count});assertLayout(f);
  for(let t=0;t<40;t++){f.advance(500);assertLayout(f);}f.dispose();
 }
});
test('acceleration is frame-rate independent and resumes without a positional jump',()=>{
 let a=0,b=0;for(let i=0;i<60;i++)a=P.easeSpeed(a,1,1/60);for(let i=0;i<120;i++)b=P.easeSpeed(b,1,1/120);assert(Math.abs(a-b)<1e-12);
 const f=fixture();f.advance(2000);f.container.fire('pointerenter');f.advance(1500);assert.equal(f.frames.size,0);
 const stopped=boxes(f);f.advance(3000);assert.deepEqual(boxes(f),stopped);
 f.container.fire('pointerleave');f.advance(1000/60);
 boxes(f).forEach((p,i)=>assert(Math.hypot(p.x-stopped[i].x,p.y-stopped[i].y)<1,'resume should ease in from its saved position'));f.dispose();
});
test('pause button and keyboard focus keep the cloud still and resume from the same phase',()=>{
 const f=fixture();f.advance(1000);f.toggle.fire('click');assert.equal(f.toggle.attributes['aria-pressed'],'true');f.advance(1600);
 const paused=boxes(f);f.advance(1000);assert.deepEqual(boxes(f),paused);
 f.toggle.fire('click');assert.equal(f.toggle.attributes['aria-pressed'],'false');f.advance(500);assert.notDeepEqual(boxes(f),paused);
 f.container.fire('focusin');f.advance(1600);f.container.fire('focusout',{relatedTarget:f.labels[1]});assert.equal(f.container.dataset.motion,'paused');
 f.container.fire('focusout',{relatedTarget:null});assert.equal(f.container.dataset.motion,'moving');f.dispose();
});
test('reduced motion, hidden documents and offscreen clouds stop work immediately; cleanup removes all observers and listeners',()=>{
 const f=fixture({reduced:true});assert.equal(f.frames.size,0);assert.equal(f.container.dataset.motion,'reduced');assert.equal(f.toggle.disabled,true);
 f.media.matches=false;f.media.fire('change');assert.equal(f.frames.size,1);f.advance(300);
 f.doc.hidden=true;f.doc.fire('visibilitychange');assert.equal(f.frames.size,0);
 f.doc.hidden=false;f.doc.fire('visibilitychange');assert.equal(f.frames.size,1);
 f.observers.visible.cb([{isIntersecting:false}]);assert.equal(f.frames.size,0);
 f.observers.visible.cb([{isIntersecting:true}]);assert.equal(f.frames.size,1);
 f.observers.resize.cb();f.dispose();assert.equal(f.frames.size,0);assert(f.observers.resize.disconnected&&f.observers.visible.disconnected);
 for(const node of [f.container,f.toggle,f.media,f.doc,f.win])assert.equal(node.count(),0);
});
test('each keyword retains its source key and decorative elements cannot open a requirement',()=>{
 const f=fixture();f.container.fire('click',{target:f.labels[2]});assert.deepEqual(f.selected,['requirement-2']);
 f.container.fire('click',{target:{closest:()=>null}});assert.equal(f.selected.length,1);f.dispose();
 f.container.fire('click',{target:f.labels[1]});assert.equal(f.selected.length,1);
});
test('trajectory sampling is continuous rather than changing direction at a collision or boundary',()=>{
 const node={x:100,y:80,ax:16,ay:8,rate:.4,seed:1.83};
 for(let t=0;t<60;t+=.1){const a=P.pointAt(node,t),b=P.pointAt(node,t+1/60);assert(Math.hypot(a.x-b.x,a.y-b.y)<.2);}
});
