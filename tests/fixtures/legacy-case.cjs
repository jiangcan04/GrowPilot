/* Explicitly fictional, isolated walkthrough. No live AI calls and no real user records. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.InternPilotDemo=api;})(globalThis,function(){
 const folderId='example-ai-operations',outcomeId='example-outcome-research';
 function makeJob(id,title,city,requirements){return {id,title,company:'示例企业 '+id.slice(-1),city,jobType:'实习',jobCategory:'运营',role:'AI 产品运营',demo:true,acquisition:'example',rawJD:requirements.map(r=>r.quote).join('\n'),requirements};}
 const req=(key,label,quote,dimension,must=true)=>({key,label,quote,dimension,must});
 function source(id,title,url,dimension,summary,lesson){return {id:id+':'+folderId,title,url,type:'个人经验／实践案例',publisher:id==='example-fpt'?'Microsoft Customer Stories':id==='example-antonio'?'Coursera Blog':'Grow with Google',dimensions:[dimension],summary,lesson,origin:'example',exampleOnly:true,folderId,limitations:'此处是对真实公开文章的示例关联，未执行本轮抓取；案例不等同于示例人物的经历。'};}
 function create(C){
  const s=C.fresh();s.exampleOnly=true;s.page='example-overview';s.activeFolderId=folderId;s.matchingFolderId=folderId;
  s.folders=[{id:folderId,name:'示例 · AI 产品运营',city:'上海 / 杭州 / 北京',jobIds:['example-job-1','example-job-2','example-job-3'],selectedJobIds:['example-job-1','example-job-2','example-job-3'],archivedIds:[],overrides:{},exampleContext:true,schedule:{start:C.today(),days:17,dailyHours:1.5}}];
  s.customJobs=[
   makeJob('example-job-1','AI 产品运营实习生','上海',[req('user-research','用户研究与需求分析','整理用户访谈与需求反馈','research'),req('sql','SQL 数据查询','使用 SQL 统计功能使用数据','data'),req('ai-tools','AI 产品理解','了解 AI 工具并参与效果评测','ai')]),
   makeJob('example-job-2','AI 应用运营实习生','杭州',[req('user-research','用户研究与需求分析','能够从用户反馈中归纳真实问题','research'),req('sql','SQL 数据查询','通过 SQL 查询并解释使用指标','data'),req('ai-tools','AI 产品理解','记录 AI 输出的质量问题并提出改进建议','ai')]),
   makeJob('example-job-3','智能产品运营实习生','北京',[req('user-research','用户研究与需求分析','参与用户访谈并整理需求结论','research'),req('sql','SQL 数据查询','掌握基础 SQL 查询与分组统计','data'),req('operations','内容与活动运营','协助完成内容整理与运营复盘','operations',false)])
  ];
  s.experiences=[
   {id:'example-exp-education',title:'青禾创意学院 · 数字媒体本科在读（院校与人物均虚构）（虚构）',type:'教育经历',description:'虚构人物林小满，青禾创意学院数字媒体专业本科生，2023—2027年。课程包括数字内容设计、用户研究入门和数据可视化。学校、人物、时间和经历均为专门编写的演示数据，不对应平台所有者。',confirmed:true,revision:0},
   {id:'example-exp-internship',title:'云朵咖啡 · 社区内容助理（企业与经历均虚构）（虚构）',type:'实习经历',description:'在虚构品牌云朵咖啡的模拟实习中，整理社群内容素材、编排体验活动文案，用表格记录用户反馈与每周待办。仅展示内容运营协作流程，无真实雇佣关系。',confirmed:true,revision:0},
   {id:'example-exp-course',title:'虚拟商店订单 · SQL 课程练习（虚构）',type:'课程经历',description:'使用虚拟商店订单表练习 SQL 的 SELECT 和 WHERE，保存查询语句和字段说明，尚未完成业务指标分析；数据全部为合成数据。',confirmed:true,revision:0},
   {id:'example-exp-project',title:'校园旧物交换平台 · 课程问卷练习（虚构）（虚构）',type:'项目经历',description:'为虚构的校园旧物交换平台设计问卷，用 Excel 整理合成反馈数据，归纳分类和统计口径，尚未做过完整用户访谈；所有资料为课程演示设定。',confirmed:true,revision:0}
  ];
  s.materials=[{id:'example-resume',title:'林小满的虚构演示简历（虚构）',raw:s.experiences.map(e=>e.title+'\n'+e.description).join('\n\n'),date:C.today()}];
  s.sources=[
   source('example-michelle','Michelle 在已有工作中补充 UX 项目的经历','https://grow.google/intl/en_au/article-michelle-zhou/','research','公开故事介绍了从已有工作情境积累项目、建立作品集的转型路径。','从身边可接触的真实问题出发，记录研究过程、个人行动与可展示产出。'),
   source('example-antonio','Antonio 将 SQL 应用技能用于数据岗位的经历','https://blog.coursera.org/see-how-antonio-landed-an-ideal-first-job-out-of-college-by-stacking-job-ready-applied-skills-on-top-of-his-degree-learning/','data','公开毕业生自述提及数据库与 SQL 技能、日常工作和技术面试的联系。','围绕岗位使用的工具做小任务，并能解释查询过程与结果。'),
   source('example-fpt','FPT Software 的 AI 工作流程实践','https://www.microsoft.com/en/customers/story/23610-fpt-software-linkedin','ai','微软公开客户案例介绍了从培训走向具体工作场景应用的过程。','选择一个小场景试用 AI，并记录实际输出、人工检查和改进。')
  ];
  s.plans=[
   {id:'example-plan-research',folderId,title:'完成一轮小规模用户访谈',requirementKey:'user-research',dimension:'research',status:'completed',origin:'示例建议',sourcePolicy:'web-cases-v1',hours:6,week:'第 1 周',reason:'三个示例岗位均要求理解用户反馈；原简历只有问卷整理经验。',relevance:'将零散反馈转化为有原文依据的需求结论，为用户研究要求补充过程证据。',experienceLesson:s.sources[0].lesson,references:[s.sources[0]],output:'访谈提纲、匿名记录与需求归纳表',criteria:'说明个人行动、样本限制、需求依据与后续问题',steps:[{id:'example-step-r1',text:'选择校园 AI 学习工具的使用问题，准备访谈提纲',done:true},{id:'example-step-r2',text:'完成 3 次访谈并整理匿名记录（示例数据）',done:true},{id:'example-step-r3',text:'归纳 4 类问题，区分原话、解释与待验证假设（示例数据）',done:true}],sources:[],referencePending:false},
   {id:'example-plan-ai',folderId,title:'为一个 AI 学习场景建立评测记录',requirementKey:'ai-tools',dimension:'ai',status:'adopted',origin:'示例建议',sourcePolicy:'web-cases-v1',hours:5,week:'第 2 周',reason:'两个示例岗位关注 AI 工具的效果与质量问题，当前材料暂缺完整评测实践。',relevance:'展示如何定义好输出、记录失败，并基于结果改进使用方式。',experienceLesson:s.sources[2].lesson,references:[s.sources[2]],output:'场景说明、测试用例表和结果复盘',criteria:'有判断标准、实际输入输出与失败分析',steps:[{id:'example-step-a1',text:'明确一个学习场景与评测标准',done:true},{id:'example-step-a2',text:'整理测试输入与输出，记录人工判断',done:false},{id:'example-step-a3',text:'比较改进前后表现并说明限制',done:false}],sources:[],referencePending:false},
   {id:'example-plan-sql',folderId,title:'用 SQL 回答一个产品使用问题',requirementKey:'sql',dimension:'data',status:'suggested',origin:'示例建议',sourcePolicy:'web-cases-v1',hours:5,week:'第 2–3 周',reason:'三个示例岗位提及 SQL，目前只有基础语句练习，缺少业务问题与结果解释。',relevance:'把查询工具转化为可以讲解的数据分析过程。',experienceLesson:s.sources[1].lesson,references:[s.sources[1]],output:'指标说明、SQL 查询、结果表与解释',criteria:'说明数据来源、查询逻辑、结果与不确定性',steps:[{id:'example-step-s1',text:'选择合成数据，定义一个功能使用问题',done:false},{id:'example-step-s2',text:'编写筛选与分组查询，检查结果口径',done:false},{id:'example-step-s3',text:'整理查询说明与可复现结果',done:false}],sources:[],referencePending:false}
  ];
  s.outcomes=[{id:outcomeId,planId:'example-plan-research',folderId,final:true,date:C.today(),process:'确定校园 AI 学习工具场景，拟定访谈提纲；在示例中完成 3 次访谈，并将反馈归为 4 类问题。',method:'用半结构化访谈记录原话，再用表格整理需求、证据与待验证假设。',description:'产出访谈提纲、匿名访谈记录和需求归纳表，标记了样本较小及结论仍待验证的限制。',reflection:'问题归纳需要回到原话核对，不能把自己的推测当作用户共识。以上数字和过程均为虚构示例。',links:[],attachments:[]}];
  refresh(C,s);return s;
 }
 function refresh(C,s){
  const f=C.folder(s),input=C.inputForMatch(s),rows=C.ruleRequirements(s),research=s.experiences.find(e=>e.sourceOutcomeId===outcomeId),course=s.experiences.find(e=>e.id==='example-exp-course'),project=s.experiences.find(e=>e.id==='example-exp-project'),intern=s.experiences.find(e=>e.id==='example-exp-internship');
  const groups=rows.map(r=>{let e=null,status='missing',reason='示例材料中尚无完整支撑。';if(r.key==='user-research'){e=research||project;status=research?'supported':'partial';reason=research?'已确认加入的访谈成果补充了过程与产出证据。':'已有问卷整理线索，仍需补充访谈过程与需求归纳。';}else if(r.key==='sql'){e=course;status='partial';reason='已练习基础语句，仍缺少业务问题、分组统计与结果解释。';}else if(r.key==='operations'){e=intern;status='partial';reason='有内容整理与任务记录，尚未完整呈现运营效果。';}if(!e&&status==='partial'){status='unclear';reason='示例中的原有经历已被修改，请补充对应材料。';}return {label:r.label,dimension:r.dimension,status,reason,missing:status==='supported'?[]:r.key==='operations'?['补充描述：说明本人如何整理内容、跟进事项和记录效果']:r.key==='sql'?['补充业务场景、分组统计与查询结果解释']:['补充与岗位标准对应的行动和成果'],nextStep:status==='supported'?'可在其他方向继续复用这条经历。':'查看示例建议并补充实际过程。',sources:r.sources.map(src=>({jobId:src.jobId,quote:src.quote,must:src.must,level:src.level,requirementIds:src.requirementIds})),evidence:e?[{experienceId:e.id,quote:e.description,relation:'预置示例说明，未调用真实 AI。'}]:[]};});
  f.analysis={mode:'example',model:'预置演示',date:'示例演示',signature:C.inputSignature(s),rows:C.normalizeAIResult(input,{groups}).map(r=>({...r,key:rows.find(q=>q.label===r.label)?.key||r.key}))};
  for(const p of s.plans){p.sources=(rows.find(r=>r.key===p.requirementKey)?.sources||[]);p.signature=C.signature(s);}
 }
 function recognition(C,s){const o=s.outcomes.find(o=>o.id===outcomeId);return C.createOutcomeDraft(o,{title:'校园 AI 工具用户访谈项目（示例）',type:'项目经历',summary:'预置的分类与文字示例，未调用真实 AI。',evidence:[{quote:o.process,relation:'实施步骤'},{quote:o.method,relation:'方法与工具'},{quote:o.description,relation:'实际产出'},{quote:o.reflection,relation:'限制与反思'}]},[],'example',{model:'预置示例'});}
 return {create,refresh,recognition,folderId,outcomeId};
});
