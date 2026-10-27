import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {collectJobs,handleAPI,normalizeJob,validateOutcome,validateOutcomeInput} from '../worker/handler.mjs';
const require=createRequire(import.meta.url),C=require('../web/core.js');
test('folder requirement map covers all saved jobs while matching uses only selected jobs',()=>{
 const s=C.fresh();s.folders=[{id:'f',jobIds:['sample-1','sample-5'],selectedJobIds:['sample-1']}];s.activeFolderId='f';
 assert(C.folderRequirements(s).some(r=>r.key==='operations'));assert(!C.requirements(s).some(r=>r.key==='operations'));s.folders[0].selectedJobIds=[];assert(C.folderRequirements(s).length);assert.equal(C.requirements(s).length,0);
});
test('legacy experience types migrate into stable groups without changing factual text',()=>{
 const s=C.fresh();s.experiences=[{id:'e',type:'实习',description:'原有工作内容'},{id:'s',type:'研究',description:'原始研究内容'}];const m=C.migrate(s);assert.equal(m.experiences[0].type,'实习经历');assert.equal(m.experiences[1].type,'科研经历');assert.equal(m.experiences[0].description,'原有工作内容');
 const drafts=C.extractDrafts('课程经历\n课程团队练习\n实际完成问卷分析与报告。','m');assert(drafts.some(d=>d.type==='课程经历'));
});
test('job filters combine direction, city, type and source',()=>{
 const list=[{title:'AI 产品实习生',company:'A',city:'上海',acquisition:'manual'},{title:'Product Manager',company:'B',city:'Remote',acquisition:'auto',jobType:'全职'}];
 assert.equal(C.filterJobs(list,{category:'产品',city:'上海',type:'实习',source:'manual'}).length,1);assert.equal(C.filterJobs(list,{category:'产品',source:'auto'})[0].company,'B');assert.equal(C.filterJobs(list,{city:'北京'}).length,0);
});
test('collection makes an automatic public-source request and preserves full description and source',async()=>{
 let calls=0;const response={jobs:[{id:1,title:'Product Intern',company_name:'Synthetic',url:'https://remotive.com/remote-jobs/product/synthetic-test-1',description:'<h2>Job description</h2><p>Interview users and analyze data.</p>',category:'Product',candidate_required_location:'Remote',job_type:'internship',publication_date:'2026-10-26'}]};
 const fetcher=async(url)=>{calls++;assert.equal(url,'https://remotive.com/api/remote-jobs?limit=100');return new Response(JSON.stringify(response));};
 const out=await collectJobs({category:'product',keyword:'interview'},fetcher);assert.equal(calls,1);assert.equal(out.jobs.length,1);assert(out.jobs[0].rawJD.includes('Interview users'));assert.equal(out.jobs[0].sourceName,'Remotive');assert.equal(out.jobs[0].jobType,'实习');
 await collectJobs({keyword:'missing'},fetcher);assert.equal(calls,1,'cached public source must not be repeatedly requested');
});
test('collection discards HTML scripts and rejects untrusted source links',()=>{
 const j=normalizeJob({title:'Role',company_name:'Company',url:'https://remotive.com/remote-jobs/product/example',description:'<script>bad()</script><p>Real description</p>'});assert.equal(j.rawJD,'Real description');assert.throws(()=>normalizeJob({url:'https://evil.example/x',description:'a'}));
});
const outcome={description:'完成一份课程分析报告。',process:'整理问卷数据并检查缺失值。',method:'使用 Excel 统计结果。',reflection:'样本较小，结论有限。',documents:[]};
const recognized={experience:{title:'课程分析实践',type:'课程经历',summary:'课程数据分析',evidence:[{quote:'整理问卷数据并检查缺失值。',relation:'实际行动'},{quote:'完成一份课程分析报告。',relation:'实际成果'}]}};
test('outcome recognition accepts only original quotes and valid structured categories',()=>{
 assert(validateOutcomeInput(outcome));assert.equal(validateOutcome(outcome,recognized).experience.type,'课程经历');
 const fabricated=structuredClone(recognized);fabricated.experience.evidence[0].quote='提升转化率百分之五十';assert.throws(()=>validateOutcome(outcome,fabricated),/原文/);
 const wrong=structuredClone(recognized);wrong.experience.type='虚构类型';assert.throws(()=>validateOutcome(outcome,wrong),/分类/);
});
const request=(route,body,headers={})=>new Request('https://example.test'+route,{method:'POST',headers:{'Content-Type':'application/json','X-InternPilot-CSRF':'internpilot-request','Origin':'https://example.test',...headers},body:JSON.stringify(body)});
test('unconfigured AI never returns a fabricated archive result and cross-origin requests fail',async()=>{
 const status=await (await handleAPI(new Request('https://example.test/api/status'),{})).json();assert.equal(status.configured,false);assert.equal(status.collection,true);
 let r=await handleAPI(request('/api/recognize-outcome',{consent:true,input:outcome}),{});assert.equal(r.status,400);assert.match((await r.json()).error,/尚未连接/);
 r=await handleAPI(request('/api/recognize-outcome',{consent:true,input:outcome},{Origin:'https://other.test'}),{});assert.equal(r.status,403);
});
test('AI recognition uses explicit consent, strict schema, no storage and validates quoted facts',async()=>{
 let payload;
 const fetcher=async(url,init)=>{assert.equal(url,'https://api.openai.com/v1/responses');payload=JSON.parse(init.body);return new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(recognized)}]}]}));};
 const r=await handleAPI(request('/api/recognize-outcome',{consent:true,input:outcome}),{OPENAI_API_KEY:'mock-only'},fetcher);assert.equal(r.status,200);assert.equal((await r.json()).experience.type,'课程经历');assert.equal(payload.store,false);assert.equal(payload.text.format.strict,true);
 const refused=await handleAPI(request('/api/recognize-outcome',{consent:false,input:outcome}),{OPENAI_API_KEY:'mock-only'},fetcher);assert.equal(refused.status,400);
});
test('skill-specific recommendations cannot cite unrelated generic analytics cases',()=>{
 const s=C.fresh();s.folders=[{id:'f',name:'数据',jobIds:['j'],selectedJobIds:['j']}];s.activeFolderId='f';s.customJobs=[{id:'j',title:'数据实习',company:'测试',requirements:[{label:'Python',quote:'使用 Python 分析数据',must:true,dimension:'data'}]}];s.experiences=[{id:'e',description:'参与一项课程研究。'}];const p=C.suggestions(s)[0];assert(p.referencePending);assert.equal(p.references.length,0);
 s.sources.push({id:'source',folderId:'f',userProvided:true,checked:'2026-10-26',type:'个人经验分享',url:'https://example.test/story',title:'本人阅读的 Python 实践经验',summary:'Python 项目方法',dimensions:['data'],lesson:'保留清洗与分析过程',application:'按岗位需要完成数据项目'});assert.equal(C.suggestions(s)[0].referencePending,false);
});
