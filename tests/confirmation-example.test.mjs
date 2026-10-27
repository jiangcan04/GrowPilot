import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),C=require('../web/core.js'),D=require('./fixtures/legacy-case.cjs');
function outcome(){return {id:'o',final:true,process:'整理用户访谈原始记录。',method:'使用表格归纳用户问题。',description:'完成需求归纳表与过程说明。',reflection:'样本有限，仍需要验证。',links:[]};}
function result(o){return {title:'用户研究实践',type:'项目经历',summary:'基于原文的整理',evidence:[{quote:o.process,relation:'行动'},{quote:o.description,relation:'成果'}]};}
function state(){const s=C.fresh();s.outcomes=[outcome()];return s;}
function confirm(draft,extra={}){return {title:draft.title,type:draft.type,description:draft.description,link:'',period:'2026年10月',confirmed:true,...extra};}
test('AI output creates only a review draft and does not add it to the bank',()=>{
 const s=state(),before=JSON.stringify(s),d=C.createOutcomeDraft(s.outcomes[0],result(s.outcomes[0]));assert.equal(JSON.stringify(s),before);assert.equal(s.experiences.length,0);assert.equal(d.type,'项目经历');assert(d.description.includes('整理用户访谈'));
});
test('explicit confirmation is required, edits and selected classification are saved',()=>{
 const s=state(),d=C.createOutcomeDraft(s.outcomes[0],result(s.outcomes[0]));assert.throws(()=>C.confirmOutcomeDraft(s,d,confirm(d,{confirmed:false})),/确认/);assert.equal(s.experiences.length,0);
 const e=C.confirmOutcomeDraft(s,d,confirm(d,{title:'课程访谈实践',type:'课程经历',description:'整理访谈记录，补充了我核查后的具体过程。'}));assert.equal(s.experiences.length,1);assert.equal(e.type,'课程经历');assert.equal(e.title,'课程访谈实践');assert(e.confirmed);assert(e.humanEdited);assert.equal(e.sourceOutcomeId,'o');
});
test('cancelled drafts can be discarded without leaving an experience and a repeated outcome cannot be duplicated',()=>{
 const s=state();C.createOutcomeDraft(s.outcomes[0],result(s.outcomes[0]));assert.equal(s.experiences.length,0);const d=C.createOutcomeDraft(s.outcomes[0],result(s.outcomes[0]));C.confirmOutcomeDraft(s,d,confirm(d));assert.throws(()=>C.confirmOutcomeDraft(s,d,confirm(d)),/已有/);assert.equal(s.experiences.length,1);
});
test('changed original outcomes invalidate the preview before any write',()=>{
 const s=state(),d=C.createOutcomeDraft(s.outcomes[0],result(s.outcomes[0]));s.outcomes[0].description+='新增结果。';assert.throws(()=>C.confirmOutcomeDraft(s,d,confirm(d)),/变化/);assert.equal(s.experiences.length,0);
});
test('fabricated AI facts and unsafe or empty edited content are rejected',()=>{
 const s=state(),bad=result(s.outcomes[0]);bad.evidence[0].quote='提高转化率100倍';assert.throws(()=>C.createOutcomeDraft(s.outcomes[0],bad),/原文/);const d=C.createOutcomeDraft(s.outcomes[0],result(s.outcomes[0]));for(const edit of [{title:''},{type:'不存在的分类'},{description:''},{link:'javascript:alert(1)'}])assert.throws(()=>C.confirmOutcomeDraft(s,d,confirm(d,edit)));assert.equal(s.experiences.length,0);
});
test('manual sync follows the same editable confirmation workflow',()=>{
 const s=state(),d=C.createOutcomeDraft(s.outcomes[0],{},[],'manual',{title:'手动整理成果'});assert.equal(d.mode,'manual');assert.equal(s.experiences.length,0);assert(d.description.includes(s.outcomes[0].method));const e=C.confirmOutcomeDraft(s,d,confirm(d));assert.equal(e.recognitionMode,'manual');assert(e.confirmed);
});
test('learning materials stay related to the specific skill and do not justify case references',()=>{
 const sql=C.materialsForPlan({title:'SQL 分析',requirementKey:'sql',dimension:'data'});assert(sql.length>=2);assert(sql.every(r=>r.skills.includes('sql')));assert(C.materialsForPlan({title:'Python 练习',requirementKey:'python',dimension:'data'}).every(r=>r.skills.includes('python')));assert(C.materialsForPlan({title:'英语沟通',requirementKey:'英语沟通',dimension:'collaboration'}).every(r=>r.skills.includes('english')));
 const s=D.create(C);const r=C.matchResults(s).find(r=>r.key==='sql');assert(!C.caseSupports(r,{...sql[0],userProvided:true,checked:'2026-10-26'},C.folder(s)));
});
test('complete example has jobs, resume, transparent matches, plans, outcome, cases and links',()=>{
 const s=D.create(C);assert.equal(s.folders.length,1);assert.equal(C.folderJobs(s).length,3);assert.equal(s.materials.length,1);assert.equal(s.plans.length,3);assert.equal(s.outcomes.length,1);assert(C.matchResults(s).every(r=>r.mode==='example'));for(const p of s.plans){const r=C.matchResults(s).find(r=>r.key===p.requirementKey);assert(r);assert(p.references.some(ref=>C.caseSupports(r,ref,C.folder(s))));assert(C.materialsForPlan(p).length);}
});
test('the example supports edit-confirm-match reuse, independently of real user state',()=>{
 const real=state(),snapshot=JSON.stringify(real),demo=D.create(C),before=demo.experiences.length,d=D.recognition(C,demo);assert.equal(d.mode,'example');assert.equal(demo.experiences.length,before);C.confirmOutcomeDraft(demo,d,confirm(d,{title:'示例课程研究',type:'课程经历'}));D.refresh(C,demo);assert.equal(demo.experiences.length,before+1);assert.equal(C.matchResults(demo).find(r=>r.key==='user-research').status,'supported');assert.equal(JSON.stringify(real),snapshot);
});
test('example references never become valid evidence for a real folder',()=>{
 const s=D.create(C),r=C.matchResults(s).find(r=>r.key==='sql'),ref=s.sources.find(r=>r.id.startsWith('example-antonio'));assert(C.caseSupports(r,ref,C.folder(s)));assert(!C.caseSupports(r,ref,{...C.folder(s),exampleContext:false}));s.experiences=[];s.materials=[];assert.doesNotThrow(()=>D.refresh(C,s));
});
test('self-selected preparation days preserve inclusive dates for arbitrary cycles',()=>{
 for(const days of [1,17,45,113,730]){const sc={start:'2026-10-26',days,dailyHours:1.5};assert.equal(C.daysBetween(sc.start,C.endDate(sc)),days);assert.equal(sc.days*sc.dailyHours,days*1.5);}
});
