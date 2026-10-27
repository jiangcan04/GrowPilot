const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../web/core.js');
const fixture=require('../web/examples/jd-import-template.json');
function setup(){
 const s=C.fresh();s.folders=[{id:'product',name:'产品',jobIds:['sample-1'],selectedJobIds:['sample-1'],archivedIds:[],answers:{},overrides:{},schedule:C.schedule()},{id:'ops',name:'运营',jobIds:['sample-5'],selectedJobIds:['sample-5'],archivedIds:[],answers:{},overrides:{},schedule:C.schedule()}];s.activeFolderId='product';return s;
}
function tenJobs(){
 const s=setup();s.customJobs=fixture.map((j,i)=>({...j,id:'jd-'+i}));C.folder(s).jobIds=s.customJobs.map(j=>j.id);C.folder(s).selectedJobIds=s.customJobs.slice(0,6).map(j=>j.id);return s;
}
function material(s){s.experiences=[{id:'exp',title:'SQL 分析项目',description:'使用 SQL 查询真实数据，记录条件和结果。',confirmed:false}];}
function response(s){
 return {groups:C.ruleRequirements(s).map(r=>({label:r.label,dimension:r.dimension,status:'missing',sources:r.sources.map(src=>({jobId:src.jobId,quote:src.quote,must:src.must,level:src.level,requirementIds:src.requirementIds})),evidence:[],reason:'暂缺材料',missing:['补充对应经历'],nextStep:'补充材料'}))};
}
function cache(s){
 const input=C.inputForMatch(s);C.folder(s).analysis={signature:C.inputSignature(s),rows:C.normalizeAIResult(input,response(s)),model:'test-model'};
}
test('10 collected JDs, only 6 selected enter the analysis payload',()=>{
 const s=tenJobs();assert.equal(C.folderJobs(s).length,10);assert.equal(C.selectedJobs(s).length,6);assert.equal(C.inputForMatch(s).jobs.length,6);
 assert(C.requirements(s).every(r=>r.sources.every(src=>Number(src.jobId.slice(3))<6)));
});
test('semantic aliases merge while preserving independent skills and singletons',()=>{
 const s=tenJobs(),rows=C.requirements(s);assert.equal(rows.length,4);
 const sql=rows.find(r=>r.key==='sql');assert.equal(sql.count,6);assert.equal(sql.must,6);
 assert(rows.some(r=>r.key==='python'&&r.count===1));assert(rows.some(r=>r.label==='英语沟通'&&r.count===1));
 assert.equal(sql.sources.length,7);
});
test('same skill retains basic and advanced standards in source variants',()=>{
 const s=tenJobs(),sql=C.requirements(s).find(r=>r.key==='sql');
 assert(sql.sources.some(x=>x.level==='基础要求'));assert(sql.sources.some(x=>x.level==='进阶要求'));
});
test('an explicitly empty JD selection stays empty instead of selecting all',()=>{
 const s=tenJobs();C.folder(s).selectedJobIds=[];assert.equal(C.requirements(s).length,0);assert.equal(C.reviewed(s),false);assert.equal(C.matchResults(s).length,0);
});
test('current direction selection does not change another direction',()=>{
 const s=tenJobs();s.activeFolderId='ops';assert.equal(C.selectedJobs(s)[0].id,'sample-5');assert(C.requirements(s).some(r=>r.key==='operations'));
});
test('raw acquired JD text can be previewed without manually listing requirements',()=>{
 const s=setup();s.customJobs=[{id:'raw',title:'岗位',company:'单位',rawJD:'能够使用 SQL 查询业务数据。\n需要进行用户访谈并整理需求。',requirements:[]}];
 C.folder(s).jobIds=['raw'];C.folder(s).selectedJobIds=['raw'];assert.equal(C.requirements(s).length,2);
});
test('draft resume experiences directly produce preview results without manual confirmation',()=>{
 const s=setup();material(s);assert(C.reviewed(s));const matches=C.matchResults(s);
 assert(matches.some(r=>r.status==='partial'));assert(matches.every(r=>r.mode==='preview'));assert(matches.every(r=>r.status!=='supported'));
 assert(C.suggestions(s).length>0);assert(C.suggestions(s).every(p=>p.origin==='规则预览建议'));
});
test('original resume text participates even when no experience draft exists',()=>{
 const s=setup();s.materials=[{id:'m',title:'简历',raw:'使用 Excel 分析数据，形成一份报告。'}];assert(C.reviewed(s));assert(C.matchResults(s).some(r=>r.evidence.some(e=>e.experienceId==='material:m')));
});
test('without personal materials, result is information insufficient and plans wait for material',()=>{
 const s=setup();assert(C.matchResults(s).every(r=>r.status==='unclear'));assert.equal(C.suggestions(s).length,0);
});
test('AI result retains source quotes, mandatory counts and standalone requirements',()=>{
 const s=tenJobs();material(s);cache(s);assert(C.analysisCurrent(s));assert.equal(C.requirements(s).length,4);
 assert(C.matchResults(s).every(r=>r.mode==='ai'));assert(C.requirements(s).some(r=>r.key==='python'&&r.count===1));
});
test('AI citation to an unselected JD is rejected',()=>{
 const s=tenJobs(),out=response(s);out.groups[0].sources[0].jobId='jd-9';
 assert.throws(()=>C.normalizeAIResult(C.inputForMatch(s),out),/未选中|不存在/);
});
test('fabricated personal evidence cannot justify a match',()=>{
 const s=tenJobs();material(s);const out=response(s);out.groups[0].status='supported';out.groups[0].evidence=[{experienceId:'exp',quote:'取得十倍增长',relation:'匹配'}];
 assert.throws(()=>C.normalizeAIResult(C.inputForMatch(s),out),/不存在/);
 out.groups[0].evidence=[];assert.throws(()=>C.normalizeAIResult(C.inputForMatch(s),out),/没有提供/);
});
test('omitting a known singleton JD requirement is rejected',()=>{
 const s=tenJobs(),out=response(s);out.groups=out.groups.filter(r=>r.label!=='英语沟通');
 assert.throws(()=>C.normalizeAIResult(C.inputForMatch(s),out),/遗漏/);
});
test('changing selection or shared material invalidates cached AI results',()=>{
 const s=tenJobs();material(s);cache(s);assert(C.analysisCurrent(s));C.folder(s).selectedJobIds.pop();assert.equal(C.analysisCurrent(s),false);
 cache(s);s.experiences[0].description+=' 新补充一次访谈。';assert.equal(C.analysisCurrent(s),false);assert(C.matchResults(s).every(r=>r.mode==='preview'));
});
test('optional manual correction applies only to the same direction and input snapshot',()=>{
 const s=setup();material(s);const r=C.matchResults(s)[0];
 C.folder(s).overrides[r.key]={signature:C.inputSignature(s),status:'supported',evidenceIds:['exp'],note:'本人关联的行动'};
 assert(C.matchResults(s).find(x=>x.key===r.key).corrected);
 s.experiences[0].description+=' 新内容';assert(!C.matchResults(s).find(x=>x.key===r.key).corrected);
});
test('fully supported AI result creates no unnecessary practice plan',()=>{
 const s=setup();material(s);const out=response(s);for(const g of out.groups){g.status='supported';g.evidence=[{experienceId:'exp',quote:s.experiences[0].description,relation:'合成测试依据'}];}
 C.folder(s).analysis={signature:C.inputSignature(s),rows:C.normalizeAIResult(C.inputForMatch(s),out)};assert.equal(C.suggestions(s).length,0);
});
test('plan generation uses current selected JDs and does not repeat existing tasks',()=>{
 const s=tenJobs();material(s);const p=C.suggestions(s);assert.equal(p.length,4);assert(p.every(x=>x.sources.every(src=>Number(src.jobId.slice(3))<6)));
 s.plans.push(...p);assert.equal(C.suggestions(s).length,0);s.plans[0].status='completed';assert.equal(C.suggestions(s).length,0);
});
test('radar counts selected JDs once even with repeated same-dimension requirements',()=>{
 const s=tenJobs(),data=C.radar(s).find(d=>d.key==='data');assert.equal(data.mentions,6);assert.equal(data.must,6);assert.equal(data.value,100);
});
test('legacy folders acquire explicit selection while existing empty selections are respected',()=>{
 const s=setup();delete s.folders[0].selectedJobIds;s.folders[1].selectedJobIds=[];const migrated=C.migrate(s);
 assert.deepEqual(migrated.folders[0].selectedJobIds,['sample-1']);assert.deepEqual(migrated.folders[1].selectedJobIds,[]);
});
test('previous schema data, outcomes and raw materials migrate without requiring review',()=>{
 const s=C.migrate({goal:{title:'旧方向'},savedJobIds:['sample-1'],experiences:[{id:'e',title:'经历',description:'真实项目行动',confirmed:false}],plans:[{id:'done',status:'completed'}],outcomes:[{id:'out',planId:'done',description:'已有成果'}]});
 assert(C.reviewed(s));assert.equal(s.outcomes[0].final,true);assert.equal(s.plans[0].status,'completed');
});
test('time cycle remains inclusive and linked across months',()=>{
 assert.equal(C.endDate({start:'2026-10-26',days:30}),'2026-11-24');assert.equal(C.daysBetween('2026-10-26','2026-12-24'),60);
});
test('resume extraction creates factual drafts without fabricating confirmation',()=>{
 const drafts=C.extractDrafts('项目经历\n用户访谈项目\n实际访谈同学并整理原始记录。','m');assert(drafts.length);assert(drafts.every(d=>!d.confirmed));
});

test('identical resume text and draft are not duplicated in matching evidence',()=>{
 const s=setup();material(s);s.materials=[{id:'m',title:'原始简历',raw:s.experiences[0].description}];
 assert.equal(C.personalDocuments(s).length,1);
});

test('language gaps do not borrow project communication references as language-learning evidence',()=>{
 const s=tenJobs();material(s);const p=C.suggestions(s).find(p=>p.requirementKey.includes('英语'));
 assert(p.referencePending);assert(p.title.includes('英语'));assert.equal(p.references.length,0);
});
