import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {allowedCaseURL,extractCase,readCase,collectExperienceSources,CASE_SOURCES} from '../worker/experience-sources.mjs';
const require=createRequire(import.meta.url),C=require('../web/core.js'),T=C.Taxonomy;
function fixture(){const s=C.fresh();s.activeFolderId='f';s.folders=[{id:'f',name:'数据',jobIds:['j'],selectedJobIds:['j']}];s.customJobs=[{id:'j',title:'数据分析实习生',company:'测试单位',requirements:[{label:'SQL',quote:'使用 SQL 查询数据',dimension:'data',must:true}]}];s.experiences=[{id:'e',description:'完成过课程调研。'}];return s;}
const html=seed=>'<html><head><meta property="article:published_time" content="2021-08-30"></head><body><article><p>'+seed.anchors.join(' ')+' learned skills through practical work. '+'The learner built a project, recorded methods, and explained results in interviews. '.repeat(8)+'</p></article></body></html>';
test('hierarchical recruitment roles separate product operations, product management and AI annotation',()=>{
 assert.equal(T.category({title:'AI 产品运营实习生'}),'运营');assert.equal(T.role({title:'AI 产品经理'}),'AI 产品经理');assert.equal(T.role({title:'AI Trainer - Annotation'}),'数据标注 / AI 训练师');
 const list=[{title:'用户运营',company:'A'},{title:'内容运营',company:'B'},{title:'产品经理',company:'C'}];assert.equal(T.filter(list,{category:'运营',role:'用户运营'})[0].company,'A');assert.equal(T.filter(list,{category:'产品',role:'用户运营'}).length,0);
});
test('education, experience, scale and financing must come from actual metadata',()=>{
 const jobs=[{title:'产品经理',company:'A',city:'上海徐汇',experience:'在校/应届',education:'本科',industry:'互联网',companySize:'100-499人',financing:'A轮'},{title:'产品经理',company:'B',city:'上海'}];
 assert.equal(T.filter(jobs,{city:'上海',education:'本科',experience:'在校/应届',industry:'互联网',companySize:'100-499人',financing:'A轮'}).length,1);assert.equal(T.filter(jobs,{education:'未注明'})[0].company,'B');assert.equal(T.filter(jobs,{education:'硕士'}).length,0);
});
test('salary filters never treat overseas annual pay as Chinese monthly or daily pay',()=>{
 const cny={salaryMin:8000,salaryMax:12000,salaryCurrency:'CNY',salaryPeriod:'month'},usd={salary:'$120000',salaryMin:120000,salaryMax:120000,salaryCurrency:'USD',salaryPeriod:'year'};
 assert(T.salaryMatches(cny,'5-10K'));assert(!T.salaryMatches(cny,'200-300元/天'));assert(!T.salaryMatches(usd,'50K以上'));assert(T.salaryMatches({},'未注明'));
});
test('case extraction retains a short real excerpt and actual reading metadata',()=>{
 const seed=CASE_SOURCES.find(s=>s.id==='antonio-sql'),r=extractCase(html(seed),seed);assert.equal(r.origin,'web');assert.equal(r.readStatus,'read');assert(r.fetchedAt);assert.equal(r.publishedAt,'2021-08-30');assert(r.quote.split(/\s+/).length<=9);assert.equal(r.summary,seed.summary);assert(r.contentVerified);
});
test('blocked pages and unrelated content cannot become experience evidence',()=>{
 const seed=CASE_SOURCES[0];assert.throws(()=>extractCase('<title>Access Denied</title>'+html(seed),seed),/限制/);assert.throws(()=>extractCase('<article><p>'+('Unrelated text '.repeat(50))+'</p></article>',seed),/未读取/);
});
test('case URL policy rejects private addresses, offsite URLs and credential tricks',()=>{
 for(const url of ['http://blog.coursera.org/story','https://127.0.0.1/private','https://blog.coursera.org.evil.test/story','https://x@blog.coursera.org/story','https://blog.coursera.org:8080/story'])assert.throws(()=>allowedCaseURL(url));
 assert(allowedCaseURL(CASE_SOURCES[0].url));
});
test('case redirects are checked before another request and do not follow a private target',async()=>{
 let calls=0;const seed={...CASE_SOURCES[0],url:'https://blog.coursera.org/qa-safe-redirect/'};await assert.rejects(()=>readCase(seed,async()=>{calls++;return new Response(null,{status:302,headers:{Location:'https://127.0.0.1/private'}});}),/公开案例源/);assert.equal(calls,1);
});
test('failed source reads are reported separately and never returned as usable cases',async()=>{
 const r=await collectExperienceSources({dimensions:['ai']},async()=>new Response('unavailable',{status:503,headers:{'Content-Type':'text/html'}}));assert.equal(r.sources.length,0);assert(r.results.length);assert(r.results.every(x=>!x.ok&&x.error));
});
test('learning landing pages do not qualify; actual read cases supply practice steps',()=>{
 const s=fixture();s.sources=[{id:'course',folderId:'f',title:'SQL 官方课程',type:'官方学习路径',dimensions:['data'],url:'https://example.test/course',userProvided:true,checked:'2026-10-26',summary:'SQL课程'}];assert(C.suggestions(s)[0].referencePending);
 const seed=CASE_SOURCES.find(s=>s.id==='antonio-sql');const source={...extractCase(html(seed),seed),folderId:'f'};s.sources.push(source);const plan=C.suggestions(s)[0];assert(!plan.referencePending);assert.equal(plan.sourcePolicy,'web-cases-v1');assert(plan.references.every(r=>r.origin==='web'));assert.deepEqual(plan.steps.map(s=>s.text),source.practiceSteps);assert.equal(plan.experienceLesson,source.lesson);
});
test('a case from another direction or a failed source cannot justify a plan',()=>{
 const s=fixture(),seed=CASE_SOURCES.find(s=>s.id==='antonio-sql'),source={...extractCase(html(seed),seed),folderId:'other'};s.sources=[source];assert(C.suggestions(s)[0].referencePending);source.folderId='f';source.readStatus='failed';assert(C.suggestions(s)[0].referencePending);
});
test('nationwide filter does not silently include foreign remote jobs and legacy manual sources remain filterable',()=>{
 const local={title:'产品经理',company:'A',city:'上海'},remote={title:'Product manager',company:'B',city:'USA',workMode:'remote',acquisition:'auto'};assert.equal(T.filter([local,remote],{city:'全国'}).length,1);assert.equal(T.filter([local,remote],{city:'远程 / 海外'})[0].company,'B');assert.equal(T.filter([local],{source:'manual'}).length,1);
});
