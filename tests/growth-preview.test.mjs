import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),C=require('../web/core.js'),G=require('../web/growth-preview.js'),D=require('./fixtures/legacy-case.cjs');
function setup(){const s=D.create(C);s.plans=[];return s;}
test('preview is direction scoped, merges related gaps, and explicitly labels simulated retrieval',()=>{
 const s=setup(),before=JSON.stringify(s),p=G.generate(C,s);assert.equal(JSON.stringify(s),before);assert(p.length);assert(p.every(x=>x.folderId===C.folder(s).id&&x.retrievalDemo&&x.origin==='前端示例建议'));assert(p.every(x=>x.searchQueries.every(q=>q.includes(C.folder(s).name)||q.includes('AI 产品运营'))));assert(p.every(x=>x.references.every(r=>r.previewOnly&&!r.fetchedAt&&!r.contentVerified)));
});
test('uncertain keyword previews ask for information rather than asserting missing ability',()=>{
 assert.equal(G.kind({status:'partial',mode:'preview'}),'clarify');assert.equal(G.kind({status:'unclear',mode:'ai'}),'clarify');assert.equal(G.kind({status:'partial',mode:'ai',missing:['简历未体现个人行动']}),'express');assert.equal(G.kind({status:'partial',mode:'ai',missing:['找回证明文件']}),'evidence');assert.equal(G.kind({status:'missing',mode:'ai'}),'learn');
});
test('budget determines recommendations without shortening required effort or overbooking',()=>{
 const s=setup(),baseline=G.generate(C,s);C.folder(s).schedule={start:'2026-10-26',days:1,dailyHours:1};const p=G.generate(C,s);assert(p.every(x=>x.deferredReason));assert(p.every(x=>x.hours===baseline.find(y=>y.requirementKey===x.requirementKey).hours));C.folder(s).schedule.days=17;const next=G.generate(C,s);assert(next.filter(x=>!x.deferredReason).length<=3);assert(next.filter(x=>!x.deferredReason).reduce((a,x)=>a+x.hours,0)<=G.capacity(C,s).free);
});
test('active task covers multiple requirements while dismissal permits a replacement',()=>{
 const s=setup(),p=G.generate(C,s)[0];s.plans=[{...p,status:'adopted'}];assert(G.generate(C,s).every(x=>!x.requirementKeys.some(k=>p.requirementKeys.includes(k))));s.plans[0].status='dismissed';assert(G.generate(C,s).some(x=>x.requirementKeys.some(k=>p.requirementKeys.includes(k))));
});
test('confirmation preserves edits and can choose a different preparation method',()=>{
 const s=setup(),p=G.generate(C,s)[0];p.title='我修改后的任务';p.steps=[{id:'my-step',text:'我修改后的执行步骤',done:false}];const b=G.capacity(C,s),dates=G.dates(C,s,p);const adopted=G.adopt(C,s,p,{hours:p.hours,...dates,choice:p.actionKind});assert.equal(s.plans.length,0);assert.equal(adopted.title,'我修改后的任务');assert.equal(adopted.steps[0].text,'我修改后的执行步骤');assert.equal(adopted.status,'adopted');assert(adopted.startDate>=b.start&&adopted.endDate<=b.end);const different=G.adopt(C,s,p,{hours:1,...dates,choice:'clarify'});assert.equal(different.actionKind,'clarify');assert(different.title.includes('先核对'));
});
test('invalid dates, excess hours and daily overlaps prevent accidental overcommitment',()=>{
 const s=setup(),p=G.generate(C,s)[0];C.folder(s).schedule={start:'2026-10-26',days:10,dailyHours:1};assert.throws(()=>G.adopt(C,s,p,{hours:11,start:'2026-10-26',end:'2026-11-04'}),/预算/);assert.throws(()=>G.adopt(C,s,p,{hours:1,start:'2026-10-25',end:'2026-10-26'}),/周期/);assert.throws(()=>G.adopt(C,s,p,{hours:4,start:'2026-10-26',end:'2026-10-26'}),/不足/);s.plans=[{id:'other',folderId:p.folderId,status:'adopted',hours:2,startDate:'2026-10-26',endDate:'2026-10-27'}];assert.throws(()=>G.adopt(C,s,p,{hours:1,start:'2026-10-26',end:'2026-10-27'}),/重叠/);
});
test('only overlapping other directions reserve a share of the example budget',()=>{
 const s=setup();C.folder(s).schedule={start:'2026-10-26',days:10,dailyHours:1};s.folders.push({id:'other',schedule:{start:'2026-10-31',days:10,dailyHours:1}});s.plans=[{id:'other',folderId:'other',status:'adopted',hours:10}];assert.equal(G.capacity(C,s).cross,5);assert.equal(G.capacity(C,s).free,5);s.folders[1].schedule.start='2026-12-01';assert.equal(G.capacity(C,s).cross,0);
});
test('task revision changes the concrete SQL deliverable without mutating the saved plan',()=>{
 const s=setup(),p=G.generate(C,s).find(p=>p.requirementKeys.includes('sql')),before=JSON.stringify(p),n=G.revise(p,{hours:1,resource:'existing'});assert.equal(JSON.stringify(p),before);assert.equal(n.hours,1);assert(n.title.includes('SQL'));assert(n.output.includes('SQL'));assert(n.steps.length);assert.notEqual(n.output,p.output);
});
test('research with no participant uses source-based feedback analysis instead of claiming an interview',()=>{
 const p={title:'访谈练习',dimension:'research',hours:6,steps:[]},solo=G.revise(p,{hours:2,resource:'solo'}),users=G.revise(p,{hours:2,resource:'users'});assert(solo.output.includes('来源'));assert(!solo.title.includes('访谈'));assert(solo.steps.some(s=>s.includes('不能写成亲自访谈')));assert(users.title.includes('访谈'));
});
test('invalid task revision constraints do not produce an applicable proposal',()=>{
 const p={title:'任务',dimension:'data',steps:[]};for(const options of [{hours:0,resource:'solo'},{hours:NaN,resource:'solo'},{hours:1,resource:'unknown'}])assert.throws(()=>G.revise(p,options),/有效/);
});
