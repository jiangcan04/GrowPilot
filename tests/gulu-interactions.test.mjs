import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const require=createRequire(import.meta.url),P=require('../web/gulu-companion.js');
const source=readFileSync(new URL('../web/gulu-companion.js',import.meta.url),'utf8');

test('direct interactions take priority, dragging interrupts a reaction, and unknown actions do nothing',()=>{
 const actor=P.createActor(1000);
 actor.hover(true,1001);assert.equal(actor.view(1001).mood,'happy');
 actor.react('pat',1100);assert.equal(actor.view(1101).action,'pet');
 actor.drag(true,1200);assert.equal(actor.view(1201).mood,'surprised');
 actor.react('celebrate',1300);assert.equal(actor.view(1301).action,'drag');
 actor.drag(false,1400);actor.react('land',1400);assert.equal(actor.view(1401).action,'land');
 assert.equal(actor.view(2500).mood,'happy');
 actor.hover(false,2501);assert.equal(actor.view(2502).mood,'idle');
 const before=actor.view(2502);for(const key of ['unknown','constructor','__proto__'])actor.react(key,2502);
 assert.deepEqual(actor.view(2502),before);
});

test('idle sleep wakes on activity; focus stays awake and deliberate rest waits for a pet interaction',()=>{
 const actor=P.createActor(0);
 assert.equal(actor.view(59999).sleeping,false);assert.equal(actor.view(60000).sleeping,true);
 actor.activity(61000);assert.equal(actor.view(61001).action,'wake');
 assert.equal(actor.view(63000).sleeping,false);
 assert.equal(actor.view(150000,{focus:true}).mood,'focus');
 actor.activity(150000,{focus:true});assert.equal(actor.view(150001,{focus:true}).action,'idle');
 actor.react('rest',160000);actor.activity(170000);
 assert.equal(actor.view(170001,{focus:true}).sleeping,true);
 actor.hover(true,170100);assert.equal(actor.view(170101).action,'wake');
 actor.react('rest',180000);actor.drag(true,181000);assert.equal(actor.view(181001).action,'drag');
 actor.drag(false,182000);assert.equal(actor.view(184000).sleeping,false);
});

test('gaze is bounded, directionally correct, and neutral for reduced motion or invalid coordinates',()=>{
 assert(P.gaze(140,180).x>0);assert(P.gaze(-140,-180).y<0);
 assert.deepEqual(P.gaze(1e9,-1e9),{x:2.6,y:-1.8});
 for(const coords of [[NaN,1],[1,Infinity],[undefined,1]])assert.deepEqual(P.gaze(...coords),{x:0,y:0});
 assert.deepEqual(P.gaze(999,999,true),{x:0,y:0});
});

test('focus uses saved wall-clock timestamps, preserves other preferences, and never edits task data',()=>{
 const workspace={companion:{position:{x:20,y:40},still:true,collapsed:false},tasks:[{done:false}]};
 const before=structuredClone(workspace),now=100000;
 const pref=P.startFocusPrefs(workspace.companion,now);
 assert.deepEqual(workspace,before);assert.equal(pref.still,true);assert.deepEqual(pref.position,before.companion.position);
 assert.equal(P.focusStatus(pref,now+60000).remaining,24*60000);
 assert.equal(P.formatRemaining(P.focusStatus(pref,now+60001).remaining),'24:00');
 const resumed=JSON.parse(JSON.stringify(pref));
 assert.equal(P.focusStatus(resumed,now+15*60000).remaining,10*60000);
 const expired=P.focusStatus(resumed,now+30*60000);assert.equal(expired.remaining,0);assert.equal(expired.expired,true);assert.equal(expired.progress,1);
 assert.equal(P.formatRemaining(-10),'00:00');assert.equal(P.formatRemaining(1),'00:01');
 for(const invalid of [null,{}, {focusEndsAt:'x',focusDurationMs:60000},{focusEndsAt:100000,focusDurationMs:1}])assert.equal(P.focusStatus(invalid),null);
 assert.equal(P.startFocusPrefs({},now,200).focusDurationMs,90*60000);
 assert.equal(P.startFocusPrefs({},now,-3).focusDurationMs,60000);
 assert.deepEqual(workspace,before);
});

// Small DOM/event/clock doubles exercise the controller without a browser or external packages.
class Events{
 constructor(){this.events=new Map();}
 addEventListener(type,fn){if(!this.events.has(type))this.events.set(type,new Set());this.events.get(type).add(fn);}
 removeEventListener(type,fn){this.events.get(type)?.delete(fn);}
 fire(type,data={}){const e={type,defaultPrevented:false,stopPropagation(){},preventDefault(){this.defaultPrevented=true;},...data};for(const fn of this.events.get(type)||[])fn(e);return e;}
 listenerCount(){return [...this.events.values()].reduce((n,set)=>n+set.size,0);}
}
class Classes{
 constructor(){this.values=new Set();}
 add(...names){names.forEach(name=>this.values.add(name));}remove(...names){names.forEach(name=>this.values.delete(name));}contains(name){return this.values.has(name);}
 toggle(name,value){if(value===undefined)value=!this.contains(name);value?this.add(name):this.remove(name);return value;}
}
class Element extends Events{
 constructor(){super();this.style={setProperty(key,value){this[key]=value;}};this.classList=new Classes();this.dataset={};this.hidden=false;this.offsetHeight=42;this.offsetWidth=104;this.writes=0;this._text='';}
 set textContent(value){this._text=value;this.writes++;}get textContent(){return this._text;}
 getBoundingClientRect(){const x=parseFloat(this.style.left)||100,y=parseFloat(this.style.top)||100;return {x,y,width:104,height:112,bottom:y+112,right:x+104};}
 closest(selector){return selector==='.gulu-avatar'&&this.isAvatar?this:null;}
 setPointerCapture(id){this.captured=id;}
 focus(options){this.ownerDocument.activeElement=this;this.focusOptions=options;}
}
function fixture({prefs={},hidden=false,reduced=false,width=1024,height=768}={}){
 let now=100000,nextId=0,saved=0,saveAttempts=0,failedSaves=0,toggles=0,identity='account-a',nextRender=null;const scheduled=new Map();
 const later=(fn,delay,interval=0)=>{const id=++nextId;scheduled.set(id,{fn,at:now+delay,interval});return id;};
 function advance(ms){const target=now+ms;for(let count=0;count<20000;count++){
  const entry=[...scheduled.entries()].filter(([,task])=>task.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];
  if(!entry){now=target;return;}const [id,task]=entry;now=task.at;
  if(task.interval)task.at+=task.interval;else scheduled.delete(id);task.fn();
 }throw Error('Timer runaway');}
 const doc=new Events();doc.hidden=hidden;
 const media=new Events();media.matches=reduced;
 const win=new Events();Object.assign(win,{document:doc,innerWidth:width,innerHeight:height,matchMedia:()=>media,
  setTimeout:(fn,ms)=>later(fn,ms),clearTimeout:id=>scheduled.delete(id),
  setInterval:(fn,ms)=>later(fn,ms,ms),clearInterval:id=>scheduled.delete(id),
  requestAnimationFrame:fn=>later(fn,16),cancelAnimationFrame:id=>scheduled.delete(id)});
 const root=new Element(),avatar=new Element();avatar.isAvatar=true;
 const badge=new Element(),notice=new Element(),line=new Element(),countdown=new Element(),panel=new Element(),start=new Element(),tools=new Element();
 start.dataset.act='gulu-focus';
 const map=new Map([['.gulu-avatar',avatar],['[data-gulu-status]',badge],['.gulu-reaction-note',notice],['.gulu-dialog-reaction',line],['[data-gulu-countdown]',countdown],['[data-gulu-focus-panel]',panel],['[data-act="gulu-focus"]',start],['.gulu-pet-tools',tools]]);
 for(const element of [root,...map.values()])element.ownerDocument=doc;
 root.querySelector=selector=>map.get(selector)||null;root.querySelectorAll=selector=>selector==='[data-act]'?[...map.values()].filter(el=>el.dataset.act):map.has(selector)?[map.get(selector)]:[];
 root.contains=element=>[...map.values()].includes(element);
 Object.defineProperty(root,'innerHTML',{set(value){this.html=value;if(nextRender){nextRender();nextRender=null;}}});
 const module={exports:{}};class ClockDate extends Date{static now(){return now;}}
 vm.runInNewContext(source,{module,window:win,Date:ClockDate,Math:Object.assign(Object.create(Math),{random:()=>0})});
 let current={...prefs};const widget=module.exports.mount({root,getPrefs:()=>current,getIdentity:()=>identity,savePrefs:value=>{saveAttempts++;if(failedSaves>0){failedSaves--;throw Error('storage quota');}current=value;saved++;},onToggle:()=>toggles++});
 widget.update('test controls');
 return {root,avatar,doc,win,media,widget,notice,line,badge,countdown,panel,start,advance,scheduled,
  get now(){return now;},get prefs(){return current;},get saves(){return saved;},get saveAttempts(){return saveAttempts;},get toggles(){return toggles;},
  switchAccount(value,nextPrefs={}){identity=value;current={...nextPrefs};},failNextSaves(n=1){failedSaves=n;},
  replaceOnUpdate(selector,remove=false){const replacement=new Element();replacement.ownerDocument=doc;replacement.dataset={...map.get(selector)?.dataset};replacement.isAvatar=selector==='.gulu-avatar';nextRender=()=>{if(remove)map.delete(selector);else map.set(selector,replacement);};return replacement;},
  fire(type,data={}){return root.fire(type,{target:avatar,button:0,pointerId:1,clientX:100,clientY:100,...data});}};
}

test('single and keyboard clicks open the dialog while a double click pets without also opening',()=>{
 const f=fixture();
 f.fire('click',{detail:1});f.advance(499);assert.equal(f.toggles,0);f.advance(1);assert.equal(f.toggles,1);
 f.fire('click',{detail:0});assert.equal(f.toggles,2);
 f.fire('pointerdown');f.fire('pointerup');f.fire('click',{detail:1});f.advance(300);
 f.fire('pointerdown');f.fire('pointerup');f.fire('click',{detail:2});f.fire('dblclick');
 f.advance(1000);assert.equal(f.toggles,2);assert.equal(f.root.dataset.action,'pet');assert.equal(f.root.dataset.mood,'happy');
 f.widget.dispose();
});

test('dragging captures the pointer, clamps the position, persists once on cancellation and suppresses the following click',()=>{
 const f=fixture({prefs:{position:{x:100,y:100}}});
 f.fire('pointerdown');assert.equal(f.avatar.captured,1);
 f.fire('pointermove',{pointerId:9,clientX:2000});assert.notEqual(f.root.dataset.action,'drag');
 f.fire('pointermove',{clientX:2000,clientY:-2000});assert.equal(f.root.dataset.action,'drag');assert.equal(f.root.dataset.mood,'surprised');
 f.fire('pointercancel');assert.equal(f.saves,1);assert.equal(f.prefs.position.y,8);assert(f.prefs.position.x+112<=1024-8);
 assert.equal(f.root.dataset.action,'land');f.fire('lostpointercapture');assert.equal(f.saves,1);
 const click=f.fire('click',{detail:1});assert.equal(click.defaultPrevented,true);f.advance(500);assert.equal(f.toggles,0);
 f.fire('pointerdown');f.fire('pointerup');f.fire('click',{detail:1});f.advance(500);assert.equal(f.toggles,1);
 f.fire('pointerdown');f.fire('pointermove',{clientX:70,clientY:70});f.fire('pointercancel');
 const keyboard=f.fire('click',{detail:0});assert.equal(keyboard.defaultPrevented,false);assert.equal(f.toggles,2);
 f.widget.dispose();
});

test('focus starts once, restores by timestamp, finishes once, and leaves unrelated task preferences intact',()=>{
 const tasks=[{id:'one',done:false}],f=fixture({prefs:{tasks,position:{x:40,y:50}}});
 f.widget.startFocus(1);const end=f.prefs.focusEndsAt;
 f.widget.startFocus(1);assert.equal(f.prefs.focusEndsAt,end);assert.equal(f.saves,1);
 assert.equal(f.panel.hidden,false);assert.equal(f.start.disabled,true);assert.equal(f.countdown.textContent,'01:00');
 f.advance(30000);assert.equal(f.countdown.textContent,'00:30');assert.equal(f.root.dataset.mood,'focus');
 f.advance(30000);assert.equal(f.prefs.focusEndsAt,null);assert.equal(f.saves,2);assert.equal(f.root.dataset.action,'celebrate');assert.match(f.notice.textContent,/计时结束/);
 f.advance(1000);assert.equal(f.saves,2);assert.equal(f.panel.hidden,true);assert.equal(f.start.disabled,false);assert.equal(tasks[0].done,false);assert.equal(f.prefs.tasks,tasks);
 f.widget.dispose();
 const resumed=fixture({prefs:{focusEndsAt:100000+17*60000,focusDurationMs:25*60000}});
 assert.equal(resumed.countdown.textContent,'17:00');resumed.advance(3000);assert.equal(resumed.root.dataset.mood,'focus');
 resumed.widget.stopFocus();assert.equal(resumed.prefs.focusEndsAt,null);assert.equal(resumed.panel.hidden,true);resumed.widget.dispose();
});

test('an expired timer waits while the page is hidden and announces its completion once on return',()=>{
 const f=fixture({hidden:true,prefs:{focusEndsAt:99000,focusDurationMs:60000}});
 f.advance(1500);assert.equal(f.saves,0);assert.equal(f.root.classList.contains('gulu-paused'),true);
 f.doc.hidden=false;f.doc.fire('visibilitychange');f.advance(500);
 assert.equal(f.saves,1);assert.match(f.notice.textContent,/计时结束/);assert.equal(f.root.classList.contains('gulu-paused'),false);
 f.advance(1000);assert.equal(f.saves,1);f.widget.dispose();
});

test('timer expiry reports a storage failure without throwing, waits before retry, and does not repeat the completion on recovery',()=>{
 const f=fixture({prefs:{focusEndsAt:100500,focusDurationMs:60000,tasks:[{done:false}]}});
 f.failNextSaves();assert.doesNotThrow(()=>f.advance(500));
 assert.equal(f.saveAttempts,1);assert.equal(f.saves,0);assert.equal(f.prefs.focusEndsAt,100500);
 assert.match(f.notice.textContent,/未保存/);assert.equal(f.root.dataset.action,'celebrate');
 const writes=f.notice.writes;f.advance(1000);assert.equal(f.notice.writes,writes);
 f.advance(28000);assert.equal(f.saveAttempts,1);assert.equal(f.saves,0);
 f.advance(1000);assert.equal(f.saveAttempts,2);assert.equal(f.saves,1);assert.equal(f.prefs.focusEndsAt,null);
 assert.notEqual(f.root.dataset.action,'celebrate');assert.equal(f.prefs.tasks[0].done,false);
 f.advance(30000);assert.equal(f.saveAttempts,2);f.widget.dispose();
});

test('account changes clear transient reactions and pending clicks, and each account can finish its own timer',()=>{
 const f=fixture();f.widget.react('rest');f.fire('pointerenter');f.fire('click',{detail:1});
 assert.equal(f.root.classList.contains('gulu-hover'),true);
 f.switchAccount('account-b',{focusEndsAt:100000+25*60000,focusDurationMs:25*60000});f.widget.update('new account');
 assert.equal(f.root.dataset.mood,'focus');assert.equal(f.root.classList.contains('gulu-hover'),false);
 assert.equal(f.notice.hidden,true);f.advance(500);assert.equal(f.toggles,0);
 f.switchAccount('account-a',{focusEndsAt:99000,focusDurationMs:60000});f.advance(500);
 assert.equal(f.saves,1);assert.equal(f.root.dataset.action,'celebrate');
 f.switchAccount('account-b',{focusEndsAt:99000,focusDurationMs:60000});f.advance(500);
 assert.equal(f.saves,2);assert.match(f.notice.textContent,/计时结束/);f.widget.dispose();
});

test('rerender restores keyboard focus to the same action or avatar, and never steals focus from the page',()=>{
 const f=fixture();f.avatar.focus();const avatar=f.replaceOnUpdate('.gulu-avatar');f.widget.update('avatar replaced');
 assert.equal(f.doc.activeElement,avatar);assert.equal(avatar.focusOptions.preventScroll,true);
 f.start.focus();const start=f.replaceOnUpdate('[data-act="gulu-focus"]');f.widget.update('controls replaced');
 assert.equal(f.doc.activeElement,start);
 f.replaceOnUpdate('[data-act="gulu-focus"]',true);f.widget.update('control removed');assert.equal(f.doc.activeElement,avatar);
 const pageControl=new Element();pageControl.ownerDocument=f.doc;pageControl.focus();f.widget.update('another update');
 assert.equal(f.doc.activeElement,pageControl);f.widget.dispose();
});

test('reduced motion blocks cursor tracking, reactions avoid repeated live-region writes, and disposal removes all work',()=>{
 const f=fixture({prefs:{still:true}});
 assert.equal(f.root.classList.contains('bird-still'),true);
 f.doc.fire('pointermove',{clientX:900,clientY:50});f.advance(20);assert.equal(f.root.style['--gulu-look-x'],undefined);
 f.widget.react('pat');const writes=f.notice.writes;f.advance(1000);assert.equal(f.notice.writes,writes);
 f.widget.dispose();assert.equal(f.scheduled.size,0);assert.equal(f.root.listenerCount(),0);assert.equal(f.doc.listenerCount(),0);assert.equal(f.win.listenerCount(),0);assert.equal(f.media.listenerCount(),0);
 const system=fixture({reduced:true});assert.equal(system.root.classList.contains('bird-still'),true);
 system.media.matches=false;system.media.fire('change');assert.equal(system.root.classList.contains('bird-still'),false);
 system.doc.fire('pointermove',{clientX:900,clientY:50});system.advance(16);assert.notEqual(system.root.style['--gulu-look-x'],'0px');
 system.media.matches=true;system.media.fire('change');assert.equal(system.root.style['--gulu-look-x'],'0px');system.widget.dispose();
});

test('keyboard position control respects small viewports, and hover tools remain reachable across their gap',()=>{
 const f=fixture({width:320,height:568,prefs:{position:{x:8,y:8}}});
 const key=f.fire('keydown',{key:'ArrowLeft'});assert.equal(key.defaultPrevented,true);assert.equal(f.prefs.position.x,8);
 f.fire('keydown',{key:'ArrowRight',shiftKey:true});assert.equal(f.prefs.position.x,38);
 f.fire('pointerenter');f.fire('pointerleave');f.advance(100);assert.equal(f.root.classList.contains('gulu-hover'),true);
 f.fire('pointerenter');f.advance(220);assert.equal(f.root.classList.contains('gulu-hover'),true);
 f.fire('pointerleave');f.advance(221);assert.equal(f.root.classList.contains('gulu-hover'),false);f.widget.dispose();
});
