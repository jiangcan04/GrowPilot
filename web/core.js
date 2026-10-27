/* Shared domain logic. Runs in browser and Node without accessing storage. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.InternPilot = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const Taxonomy=typeof module==='object'&&module.exports?require('./job-taxonomy.js'):globalThis.InternPilotTaxonomy;
  const dimensions = [
    {key:'research',label:'用户研究',terms:['用户研究','用户调研','需求调研','访谈','问卷','需求分析','竞品']},
    {key:'product',label:'产品方案',terms:['产品方案','需求文档','原型','prd','产品设计','流程设计','策划']},
    {key:'data',label:'数据分析',terms:['数据','sql','excel','统计','分析报告','转化','指标','python']},
    {key:'ai',label:'AI 应用',terms:['ai','人工智能','大模型','prompt','提示词','评测','智能体','机器学习']},
    {key:'operations',label:'运营实践',terms:['运营','内容','社群','增长','活动','用户触达','留存']},
    {key:'collaboration',label:'协作表达',terms:['沟通','协作','汇报','协调','表达','跨团队','项目管理']}
  ];
  const catalog = [
    {id:'sample-1',title:'AI 产品经理实习生',company:'示例企业 A',city:'上海',schedule:'每周 3 天',demo:true,requirements:[
      {key:'user-research',label:'用户研究与需求分析',quote:'参与用户需求调研，整理产品需求文档',must:true,dimension:'research'},
      {key:'solution',label:'产品方案表达',quote:'能够输出清晰的需求文档或产品方案',must:true,dimension:'product'},
      {key:'data',label:'数据分析意识',quote:'关注功能使用数据并参与效果复盘',must:false,dimension:'data'}]},
    {id:'sample-2',title:'产品策划实习生',company:'示例企业 B',city:'上海',schedule:'每周 3 天',demo:true,requirements:[
      {key:'user-research',label:'用户研究与需求分析',quote:'协助用户访谈和需求分析',must:true,dimension:'research'},
      {key:'solution',label:'产品方案表达',quote:'参与产品流程和原型设计',must:false,dimension:'product'},
      {key:'collaboration',label:'跨团队沟通',quote:'与设计、研发同学协作推进方案',must:false,dimension:'collaboration'}]},
    {id:'sample-3',title:'智能产品实习生',company:'示例企业 C',city:'北京',schedule:'每周 3 天',demo:true,requirements:[
      {key:'user-research',label:'用户研究与需求分析',quote:'完成竞品与用户需求研究',must:false,dimension:'research'},
      {key:'data',label:'数据分析意识',quote:'整理产品数据并提出改进建议',must:true,dimension:'data'},
      {key:'ai-tools',label:'AI 产品理解',quote:'了解常见 AI 产品能力与使用场景',must:false,dimension:'ai'}]},
    {id:'sample-4',title:'AI 应用产品实习生',company:'示例企业 D',city:'深圳',schedule:'每周 4 天',demo:true,requirements:[
      {key:'solution',label:'产品方案表达',quote:'参与 AI 应用产品方案设计',must:true,dimension:'product'},
      {key:'ai-tools',label:'AI 产品理解',quote:'了解大模型应用，参与提示词与效果评测',must:true,dimension:'ai'},
      {key:'data',label:'数据分析意识',quote:'分析功能使用数据',must:false,dimension:'data'}]},
    {id:'sample-5',title:'AI 产品运营实习生',company:'示例企业 E',city:'杭州',schedule:'每周 3 天',demo:true,requirements:[
      {key:'operations',label:'内容与活动运营',quote:'策划内容和社群活动，记录用户反馈',must:true,dimension:'operations'},
      {key:'data',label:'数据分析意识',quote:'分析活动效果与用户留存数据',must:true,dimension:'data'},
      {key:'ai-tools',label:'AI 产品理解',quote:'了解 AI 工具的使用场景',must:false,dimension:'ai'}]},
    {id:'sample-6',title:'用户运营实习生',company:'示例企业 F',city:'武汉',schedule:'每周 3 天',demo:true,requirements:[
      {key:'operations',label:'内容与活动运营',quote:'维护社群并策划用户活动',must:true,dimension:'operations'},
      {key:'collaboration',label:'跨团队沟通',quote:'协调内容、产品团队开展用户沟通',must:true,dimension:'collaboration'},
      {key:'user-research',label:'用户研究与需求分析',quote:'整理用户访谈和需求反馈',must:false,dimension:'research'}]}
  ];
  const today = () => {
    const d=new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  };
  const uid = prefix => prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
  const schedule = () => ({start:today(),days:30,dailyHours:1});
  const fresh = () => ({version:4,page:'goal',activeFolderId:'',folders:[],customJobs:[],experiences:[],materials:[],plans:[],outcomes:[],feedback:[],sources:[],libraryRevision:0});
  function migrate(old) {
    if (!old || typeof old!=='object') return fresh();
    if (old.version===4) {
      const next=Object.assign(fresh(),old);
      if (!next.folders.some(f=>f.id===next.activeFolderId)) next.activeFolderId=next.folders[0]?.id||'';
      return prepare(next);
    }
    const next=fresh();
    next.page=old.page||'goal';
    next.customJobs=old.customJobs||[];
    next.experiences=(old.experiences||[]).map(e=>Object.assign({revision:0},e));
    next.materials=old.materials||[];
    next.jobSnapshots=old.jobSnapshots||{};
    if (old.goal?.title || old.savedJobIds?.length || old.plans?.length) {
      const folder={id:uid('folder'),name:old.goal?.title||'原有求职方向',city:old.goal?.city||'',jobIds:old.savedJobIds||[],archivedIds:old.archivedJobIds||[],answers:old.answers||{},reviewSignature:'',schedule:schedule()};
      next.folders.push(folder); next.activeFolderId=folder.id;
      next.plans=(old.plans||[]).map(p=>Object.assign({},p,{folderId:folder.id,sources:[],references:[],origin:p.origin==='自己添加'?'自定义任务':'旧版任务',referencePending:true}));
      next.outcomes=(old.outcomes||[]).map(o=>Object.assign({},o,{folderId:folder.id,final:(old.plans||[]).some(p=>p.id===o.planId&&p.status==='completed'),attachments:[],links:o.link?[{label:'原成果链接',url:o.link}]:[]}));
      next.feedback=(old.feedback||[]).filter(f=>f.type!=='投递进展').map(f=>Object.assign({},f,{folderId:folder.id,taskId:'',type:f.type||'其他观察'}));
    }
    return prepare(next);
  }
  const experienceTypes=['教育经历','实习经历','项目经历','课程经历','科研经历','校园经历','技能与证书','其他经历'];
  function experienceType(value){return ({'实习':'实习经历','工作':'实习经历','研究':'科研经历','社团':'校园经历','技能':'技能与证书','个人作品':'项目经历','其他':'其他经历'})[value]|| (experienceTypes.includes(value)?value:'其他经历');}
  const jobCategory=j=>Taxonomy.category(j),jobType=j=>Taxonomy.type(j),filterJobs=(list,filters={})=>Taxonomy.filter(list,filters);
  function folderRequirements(s,f=folder(s)){return ruleRequirements(s,f?{...f,selectedJobIds:[...(f.jobIds||[])]}:f).sort((a,b)=>b.count-a.count||b.must-a.must);}
  const folder = s => s.folders.find(f=>f.id===s.activeFolderId);
  const jobs = s => s.exampleOnly===true?s.customJobs:catalog.concat(s.customJobs);
  const folderJobs = (s,f=folder(s)) => (f?.jobIds||[]).map(id=>jobs(s).find(j=>j.id===id)).filter(Boolean);

  function prepare(s) {
    s.experiences.forEach(e=>{e.type=experienceType(e.type);});
    s.folders.forEach(f=>{
      if(!Array.isArray(f.selectedJobIds))f.selectedJobIds=[...(f.jobIds||[])];
      f.selectedJobIds=[...new Set(f.selectedJobIds)].filter(id=>(f.jobIds||[]).includes(id));
      f.overrides ||= {};
    });
    return s;
  }
  const selectedJobs = (s,f=folder(s)) => {
    const ids=new Set(Array.isArray(f?.selectedJobIds)?f.selectedJobIds:f?.jobIds||[]);
    return folderJobs(s,f).filter(j=>ids.has(j.id));
  };
  function personalDocuments(s) {
    const docs=s.experiences.map(e=>({id:e.id,title:e.title,description:e.description||'',confirmed:!!e.confirmed,kind:'experience'}))
      .concat((s.materials||[]).map(m=>({id:'material:'+m.id,title:m.title,description:m.raw||'',confirmed:false,kind:'resume'})))
      .filter(e=>e.description.trim());
    const seen=new Set();
    return docs.filter(e=>{const key=e.description.replace(/\s/g,'');if(seen.has(key))return false;seen.add(key);return true;});
  }
  function extractedRequirements(j) {
    if(j.requirements?.length)return j.requirements;
    return (j.rawJD||'').split(/\n|[；;]/).map(x=>x.trim()).filter(x=>x.length>5&&x.length<700)
      .filter(x=>!/^(岗位名称|公司|城市|薪资|福利|发布时间|职位编号)[：:]/.test(x))
      .slice(0,80).map(label=>({label,quote:label,must:/必须|必备|要求|熟练|掌握/.test(label),dimension:classify(label)}));
  }
  function canonical(r) {
    const text=String(r.label||r.quote).toLowerCase();
    const known={'user-research':['user-research','用户研究与需求分析'],'solution':['solution','产品方案表达'],data:['data','数据分析'], 'ai-tools':['ai-tools','AI 产品理解'],operations:['operations','内容与活动运营'],collaboration:['collaboration','跨团队沟通']};
    if(known[r.key])return known[r.key];
    const aliases=[
      [/\bsql\b|数据库查询/i,'sql','SQL 数据查询'],
      [/excel|电子表格/i,'excel','Excel 数据处理'],
      [/python/i,'python','Python 编程'],
      [/用户访谈|用户调研|用户研究|需求调研|访谈用户/,'user-research','用户研究与需求分析'],
      [/需求分析|需求归纳|用户需求/,'requirements-analysis','需求分析'],
      [/需求文档|\bprd\b/i,'prd','需求文档编写'],
      [/原型|交互设计/,'prototype','产品原型设计'],
      [/数据分析|分析数据|分析报告/,'data','数据分析'],
      [/社群运营|维护社群/,'community','社群运营'],
      [/内容运营|内容策划/,'content','内容运营'],
      [/活动运营|活动策划/,'events','活动策划'],
      [/跨团队|沟通协作|团队协作/,'collaboration','跨团队沟通']
    ];
    for(const [pattern,key,label] of aliases)if(pattern.test(text))return [key,label];
    const normalized=text.replace(/掌握|熟悉|了解|能够|具备|基础|能力|经验|相关|的|[\s，。；：、（）()]/g,'');
    return ['custom-'+(normalized||text),r.label||r.quote];
  }
  function inputForMatch(s,f=folder(s)) {
    return {direction:f?.name||'',jobs:selectedJobs(s,f).map(j=>({id:j.id,title:j.title,company:j.company,sourceUrl:j.sourceUrl||'',demo:!!j.demo,rawJD:j.rawJD||(j.requirements||[]).map(r=>r.quote||r.label).join('\n'),requirements:(j.requirements||[]).map((r,i)=>({id:j.id+':'+i,label:r.label,quote:r.quote||r.label,must:!!r.must}))})),experiences:personalDocuments(s)};
  }
  function inputSignature(s,f=folder(s)) {return JSON.stringify(inputForMatch(s,f));}
  function analysisCurrent(s,f=folder(s)) {return !!f?.analysis&&f.analysis.signature===inputSignature(s,f);}
  function requirements(s,f=folder(s)) {return analysisCurrent(s,f)?f.analysis.rows:ruleRequirements(s,f);}
  function normalizeAIResult(input,result) {
    if(!result||!Array.isArray(result.groups)||result.groups.length>150)throw Error('AI 返回的匹配结构不完整，请重试。');
    const jobMap=new Map(input.jobs.map(j=>[j.id,j])),expMap=new Map(input.experiences.map(e=>[e.id,e]));
    const normalize=t=>String(t||'').replace(/\s/g,'');
    const coverage=new Set(),keys=new Set();
    const rows=result.groups.map(g=>{
      if(typeof g.label!=='string'||!g.label.trim()||!g.sources?.length)throw Error('AI 要求缺少名称或岗位原文。');
      if(!['supported','partial','missing','unclear'].includes(g.status))throw Error('AI 匹配状态无效。');
      if(!dimensions.some(d=>d.key===g.dimension)&&g.dimension!=='other')throw Error('AI 能力维度无效。');
      const sources=g.sources.map(src=>{
        const job=jobMap.get(src.jobId);
        if(!job||!src.quote?.trim()||!normalize(job.rawJD).includes(normalize(src.quote)))throw Error('AI 引用了未选中的岗位或不存在的 JD 原文。');
        for(const id of src.requirementIds||[]){
          if(!job.requirements.some(r=>r.id===id))throw Error('AI 要求来源标识不正确。');
          coverage.add(id);
        }
        return {jobId:job.id,job:job.title,company:job.company,quote:src.quote,must:!!src.must||(src.requirementIds||[]).some(id=>job.requirements.some(r=>r.id===id&&r.must)),level:String(src.level||'原文未明确'),url:job.sourceUrl||'',demo:job.demo,requirementIds:src.requirementIds||[]};
      });
      const evidence=(g.evidence||[]).map(e=>{
        const exp=expMap.get(e.experienceId);
        if(!exp||!e.quote?.trim()||!normalize(exp.description).includes(normalize(e.quote)))throw Error('AI 引用的个人经历在原材料中不存在。');
        return {experienceId:exp.id,title:exp.title,quote:e.quote,relation:String(e.relation||''),confirmed:exp.confirmed};
      });
      if(['supported','partial'].includes(g.status)&&!evidence.length)throw Error('AI 给出了匹配结论，但没有提供个人经历依据。');
      const key=canonical({label:g.label})[0];
      if(keys.has(key))throw Error('AI 返回了重复能力项，请重新合并。');
      keys.add(key);
      return {key,label:g.label,dimension:g.dimension,sources,count:new Set(sources.map(x=>x.jobId)).size,must:new Set(sources.filter(x=>x.must).map(x=>x.jobId)).size,status:g.status,evidence,reason:String(g.reason||''),missing:Array.isArray(g.missing)?g.missing.map(String):[],nextStep:String(g.nextStep||''),mode:'ai'};
    });
    for(const j of input.jobs)for(const r of j.requirements)if(!coverage.has(r.id))throw Error('AI 遗漏了已知岗位要求，请重试；独有要求也必须保留。');
    if(!rows.length&&input.jobs.length)throw Error('AI 没有提取出岗位要求，请检查 JD 内容。');
    return rows;
  }
  function matchResults(s,f=folder(s)) {
    const ai=analysisCurrent(s,f),docs=personalDocuments(s);
    return requirements(s,f).map(row=>{
      let result;
      if(ai)result={...row,mode:f.analysis.mode==='example'?'example':'ai'};
      else {
        const cs=candidates({...s,experiences:docs},row).slice(0,3);
        result={...row,status:!docs.length?'unclear':cs.length?'partial':'missing',mode:'preview',
          evidence:cs.map(c=>({experienceId:c.experience.id,title:c.experience.title,quote:c.experience.description,relation:'关键词线索：'+c.matched.join('、'),confirmed:c.experience.confirmed})),
          reason:!docs.length?'尚未导入个人材料，无法判断。':cs.length?'本地规则找到了相关词语，仍需 AI 判断具体职责和要求程度。':'材料中暂未找到规则对应线索，不等于不具备该能力。',
          missing:cs.length?['需要进一步判断经历与各岗位具体标准的关系']:['补充相关经历或实践材料'],nextStep:cs.length?'连接 AI 后进行语义匹配，或按需纠正。':'可以在右侧补充经历。'};
      }
      const override=f?.overrides?.[row.key];
      if(override?.signature===inputSignature(s,f)){
        result={...result,status:override.status,reason:override.note||result.reason,corrected:true,
          evidence:(override.evidenceIds||[]).map(id=>docs.find(e=>e.id===id)).filter(Boolean).map(e=>({experienceId:e.id,title:e.title,quote:e.description,relation:override.note||'本人关联',confirmed:e.confirmed}))};
      }
      return result;
    });
  }
  function classify(text) {
    const lower=String(text).toLowerCase();
    const scored=dimensions.map(d=>({key:d.key,n:d.terms.filter(t=>lower.includes(t)).length})).sort((a,b)=>b.n-a.n);
    return scored[0].n?scored[0].key:'other';
  }
  function ruleRequirements(s,f=folder(s)) {
    const map=new Map();
    selectedJobs(s,f).forEach(job=>extractedRequirements(job).forEach((r,index)=>{
      const [key,label]=canonical(r);
      if (!map.has(key)) map.set(key,{key,label,dimension:r.dimension||classify(r.label),count:0,must:0,sources:[]});
      const row=map.get(key);
      const previous=row.sources.filter(src=>src.jobId===job.id);
      if (!previous.length) row.count++;
      if (r.must&&!previous.some(src=>src.must)) row.must++;
      row.sources.push({jobId:job.id,job:job.title,company:job.company,quote:r.quote||r.label,must:!!r.must,level:/复杂|精通|高级|独立完成/.test(r.quote||r.label)?'进阶要求':/了解|基础|入门/.test(r.quote||r.label)?'基础要求':'见岗位原文',requirementIds:[job.id+':'+index],url:job.sourceUrl||'',demo:!!job.demo||job.id.startsWith('sample-')});
    }));
    return [...map.values()].sort((a,b)=>b.must*2+b.count-(a.must*2+a.count));
  }
  function signature(s,f=folder(s)) {
    return JSON.stringify([inputSignature(s,f),analysisCurrent(s,f)?f.analysis.rows:null,f?.overrides||{}]);
  }
  const reviewed = (s,f=folder(s)) => selectedJobs(s,f).length>0&&personalDocuments(s).length>0;
  function candidates(s,row) {
    const dim=dimensions.find(d=>d.key===row.dimension);
    const needles=['sql','excel','python'].includes(row.key)?[row.key]:[...(dim?.terms||[]),row.label.toLowerCase()].filter(Boolean);
    return s.experiences.map(e=>{
      const text=(e.title+' '+e.description).toLowerCase();
      const matched=needles.filter(t=>text.includes(t));
      return {experience:e,matched,score:matched.length};
    }).filter(c=>c.score>0).sort((a,b)=>b.score-a.score);
  }
  function answerValid(s,a) {
    return !!a&&(['none','unsure'].includes(a.status)||(a.status==='has'&&s.experiences.some(e=>e.id===a.experienceId&&e.confirmed)));
  }
  function radar(s,f=folder(s)) {
    const list=selectedJobs(s,f),reqs=requirements(s,f);
    return dimensions.map(d=>{
      let mentions=0,must=0;
      list.forEach(j=>{
        const rs=reqs.filter(r=>r.dimension===d.key).flatMap(r=>r.sources.filter(src=>src.jobId===j.id));
        if(rs.length)mentions++;
        if(rs.some(r=>r.must))must++;
      });
      return {key:d.key,label:d.label,mentions,must,value:list.length?Math.round((mentions+must)/(2*list.length)*100):0};
    });
  }
  function endDate(sc) {
    const d=new Date(sc.start+'T12:00:00');
    d.setDate(d.getDate()+Number(sc.days)-1);
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
  function daysBetween(start,end) {return Math.round((new Date(end+'T12:00:00')-new Date(start+'T12:00:00'))/86400000)+1;}
  function extractDrafts(raw,materialId) {
    const lines=raw.split(/\n/).map(x=>x.trim()).filter(Boolean);
    const groups=[];let group=[];
    for (const line of lines) {
      const heading=/^(教育|实习|工作|项目|课程|科研|研究|校园|社团|技能|个人作品|获奖).{0,20}$/.test(line)||/^(20\d{2}[.\-/年]).{0,100}/.test(line);
      if (heading&&group.length) {groups.push(group);group=[];}
      group.push(line);
      if (group.join('\n').length>700) {groups.push(group);group=[];}
    }
    if (group.length) groups.push(group);
    return groups.filter(g=>g.join('').length>12).map(g=>{
      const text=g.join('\n');
      return {id:uid('exp'),title:g[0].slice(0,64),description:text,type:/教育|大学|硕士|本科/.test(g[0])?'教育经历':/实习|工作/.test(g[0])?'实习经历':/课程/.test(g[0])?'课程经历':/技能|证书/.test(g[0])?'技能与证书':/研究|科研/.test(g[0])?'科研经历':/校园|社团/.test(g[0])?'校园经历':'项目经历',period:'',confirmed:false,sourceMaterialId:materialId,revision:0};
    });
  }
  const refs = [
    {id:'google-pm',title:'Google 项目管理：沟通与协作',url:'https://grow.google/intl/en_in/project-management-course/',type:'官方学习路径',dimensions:['collaboration'],summary:'官方项目管理路径包含干系人管理、沟通与实践活动，可借鉴协作过程和分工材料的整理方法。',checked:'2026-10-26'},
    {id:'google-ux',title:'Google UX Design：研究、原型与作品集',url:'https://grow.google/certificates/ux-design/',type:'官方学习路径',dimensions:['research','product'],summary:'官方课程将研究、原型、可用性测试和作品集串联为实践路径。可借鉴产出结构。',checked:'2026-10-26'},
    {id:'yesha',title:'Yesha 转入 UX 设计的学习经历',url:'https://blog.coursera.org/read-about-how-yesha-made-google-ux-design-certificate-a-stepping-stone-into-a-new-career-in-design/',type:'就业经历案例',dimensions:['research','product'],summary:'Coursera 记录了 Yesha 从金融服务转向 UX 设计的个人经历。仅作路径参考，不证明某项练习能带来录用。',checked:'2026-10-26'},
    {id:'clarity',title:'TravelBoom 使用 Clarity 改进网站的案例',url:'https://clarity.microsoft.com/case-studies/travelboom/',type:'企业实践案例',dimensions:['data','operations'],summary:'微软案例介绍了利用热图分析网站并改进转化的实践，可借鉴“观察—假设—改进—验证”的过程。',checked:'2026-10-26'},
    {id:'openai-eval',title:'OpenAI：评测最佳实践',url:'https://developers.openai.com/api/docs/guides/evaluation-best-practices',type:'官方实践指南',dimensions:['ai'],summary:'文档建议围绕真实任务设计评测，并通过测试案例和持续评估检查效果。可作为 AI 应用作品的验证方法。',checked:'2026-10-26'}
  ];
  const learningResources=[
    {id:'learn-sql-intro',title:'Microsoft Learn：Transact-SQL 简介',url:'https://learn.microsoft.com/zh-cn/training/modules/introduction-to-transact-sql/',type:'入门模块',dimensions:['data'],skills:['sql'],useFor:'先理解 SELECT、数据类型与空值，再把查询用于任务中的真实问题。'},
    {id:'learn-sql-path',title:'Microsoft Learn：SQL 查询学习路径',url:'https://learn.microsoft.com/zh-cn/training/paths/get-started-querying-with-transact-sql/',type:'练习课程',dimensions:['data'],skills:['sql'],useFor:'按任务需要选择筛选、JOIN、分组统计等模块，并保留自己的查询与结果。'},
    {id:'learn-python',title:'Python 官方中文教程',url:'https://docs.python.org/zh-cn/3/tutorial/',type:'官方教程',dimensions:['data'],skills:['python'],useFor:'用于理解脚本、数据结构和文件读写；适合已有一点编程概念的学习者。'},
    {id:'learn-excel',title:'Microsoft：Excel 帮助和学习',url:'https://support.microsoft.com/zh-cn/excel/',type:'教程与操作资料',dimensions:['data'],skills:['excel','data'],useFor:'根据本条分析任务查阅公式、导入数据与分析操作，而不是只完成课程浏览。'},
    {id:'learn-ux',title:'Google UX Design：研究、原型与作品集',url:'https://grow.google/certificates/ux-design/',type:'课程路径',dimensions:['research','product'],skills:[],useFor:'参考研究、原型与验证的过程，为本条任务整理提纲、方案和作品记录；课程访问条件以页面为准。'},
    {id:'learn-eval',title:'OpenAI：评测最佳实践',url:'https://developers.openai.com/api/docs/guides/evaluation-best-practices',type:'实践指南',dimensions:['ai'],skills:[],useFor:'为本条 AI 实践确定任务场景、测试用例与判断标准，再记录失败和改进。'},
    {id:'learn-pm',title:'Google 项目管理学习路径',url:'https://grow.google/intl/en_in/project-management-course/',type:'课程路径',dimensions:['collaboration'],skills:[],useFor:'用于梳理任务分工、沟通与进度记录，支持本条协作实践；课程访问条件以页面为准。'},
    {id:'learn-marketing',title:'Google 数字营销与电子商务课程路径',url:'https://grow.google/certificates/digital-marketing-ecommerce',type:'课程路径',dimensions:['operations'],skills:[],useFor:'按本条运营练习查阅内容、触达、用户留存或效果衡量的相关模块；课程访问与费用以原页面为准。'},
    {id:'learn-business-english',title:'British Council：职场英语练习',url:'https://learnenglish.britishcouncil.org/free-resources/business',type:'视频与练习',dimensions:['collaboration'],skills:['english'],useFor:'按本条任务选择面试表达、职场邮件或专业话题练习，保存实际输出与反馈。'}
  ];
  function materialsForPlan(plan){
    const key=plan.requirementKey||canonical({label:plan.title||''})[0],english=/英语|english/i.test(key+' '+plan.title);
    const items=learningResources.filter(r=>english?r.skills.includes('english'):['sql','python','excel'].includes(key)?r.skills.includes(key):r.dimensions.includes(plan.dimension)&&!r.skills.includes('english')&&(!r.skills.length||r.skills.includes(key)));
    const extra=(plan.learningLinks||[]).map(r=>({...r,type:'本人补充',useFor:r.useFor||'用于本条任务的补充资料，请结合执行步骤阅读。'}));
    const seen=new Set();return items.concat(extra).filter(r=>{try{const u=new URL(r.url);if(!['https:','http:'].includes(u.protocol)||seen.has(u.href))return false;seen.add(u.href);return true;}catch{return false;}});
  }
  function outcomeSnapshot(outcome){return JSON.stringify(outcome);}
  function createOutcomeDraft(outcome,item={},documents=[],mode='ai',meta={}){
    if(!outcome?.final)throw Error('请先提交最终成果，再同步经历。');
    if(!['ai','manual','example'].includes(mode))throw Error('识别方式无效。');
    let title=item.title,type=item.type,description;
    if(mode==='manual'){
      title=title||meta.title||'任务实践成果';type=experienceType(type||'项目经历');
      description=['实施步骤：'+(outcome.process||''),'方法与工具：'+(outcome.method||''),'实际成果：'+(outcome.description||''),'反思与局限：'+(outcome.reflection||'')].join('\n');
    }else{
      const text=[outcome.process,outcome.method,outcome.description,outcome.reflection,...documents.map(d=>d.text)].join('\n').replace(/\s/g,'');
      if(!title?.trim()||!experienceTypes.includes(type)||!Array.isArray(item.evidence)||!item.evidence.length||item.evidence.some(e=>!e.quote?.trim()||!text.includes(e.quote.replace(/\s/g,''))))throw Error('识别结果缺少可核查的成果原文，请重新识别或手动整理。');
      description=item.evidence.map(e=>e.quote).join('\n');
    }
    return {id:uid('sync-draft'),sourceOutcomeId:outcome.id,snapshot:outcomeSnapshot(outcome),title,type,description,period:'',link:outcome.links?.[0]?.url||'',mode,model:meta.model||'',evidence:item.evidence||[],recognitionSummary:item.summary||''};
  }
  function confirmOutcomeDraft(s,draft,fields){
    if(!fields?.confirmed)throw Error('请先核查内容并勾选确认，再加入经历库。');
    const outcome=s.outcomes.find(o=>o.id===draft?.sourceOutcomeId);
    if(!outcome?.final||outcomeSnapshot(outcome)!==draft.snapshot)throw Error('原成果已变化，请重新整理后确认。');
    if(s.experiences.some(e=>e.sourceOutcomeId===outcome.id))throw Error('这份成果已有对应经历，请编辑已有条目。');
    const title=String(fields.title||'').trim(),description=String(fields.description||'').trim();
    if(!title||!description||!experienceTypes.includes(fields.type))throw Error('请填写经历名称、有效分类和具体内容。');
    if(fields.link){let u;try{u=new URL(fields.link);}catch{throw Error('证明链接无效。');}if(!['https:','http:'].includes(u.protocol))throw Error('证明链接需使用 HTTP 或 HTTPS。');}
    const exp={id:uid('exp'),title,description,type:fields.type,period:String(fields.period||''),link:fields.link||'',sourceOutcomeId:outcome.id,sourceOutcomeSnapshot:draft.snapshot,confirmed:true,revision:1,recognitionMode:draft.mode,recognitionModel:draft.model,recognitionSummary:draft.recognitionSummary,aiEvidence:draft.evidence,humanEdited:title!==draft.title||description!==draft.description||fields.type!==draft.type,date:today()};
    s.experiences.push(exp);return exp;
  }
  const recipes = {
    research:{title:'完成一轮小规模用户需求研究',output:'访谈记录、需求归纳与一页研究结论',steps:['阅读参考路径，选择与目标岗位相关的产品问题','设计访谈提纲并实际收集反馈，说明样本限制','将原始反馈归纳为需求，标记证据和推测','整理个人行动与结论，形成可展示的案例'],hours:8},
    product:{title:'完成一份可验证的产品方案',output:'需求说明、关键流程原型与验证记录',steps:['选一个真实用户问题，注明问题证据','阅读作品案例，写清用户、场景和需求范围','绘制关键流程或原型并做一次实际验证','记录迭代、个人贡献和方案局限'],hours:8},
    data:{title:'完成一份面向业务问题的数据分析',output:'分析表、指标口径与改进建议',steps:['阅读企业分析案例，提出一个可回答的业务问题','获取可使用的数据并记录来源和清洗过程','计算相关指标，说明发现与不确定性','提交分析报告和可复现的表格或代码'],hours:6},
    ai:{title:'为一个 AI 使用场景制作评测小案例',output:'场景说明、测试用例与结果对照表',steps:['阅读评测指南并确定目标岗位相关场景','构造包含常见与边界情况的测试用例','实际测试并记录输入、输出与判断标准','比较改进前后的效果，说明失败与局限'],hours:6},
    operations:{title:'完成一次小规模运营实践',output:'运营方案、实施记录与效果复盘',steps:['阅读企业实践案例，确定用户与活动目标','设计内容或活动，说明观察指标与执行方法','在允许的范围内实际执行并保留过程材料','整理结果、用户反馈及下一次改进方向'],hours:8},
    collaboration:{title:'整理一次真实协作过程与交付',output:'协作记录、分工表与汇报材料',steps:['回顾一项真实协作任务，明确各方目标','整理沟通、分工、争议处理和个人行动','补充过程材料，写出结果和改进点'],hours:3}
  };
  function caseSupports(row,r,f){
    if(!row||!r)return false;
    const online=r.origin==='web'&&r.readStatus==='read'&&r.contentVerified&&r.fetchedAt&&r.quote;
    const manual=r.userProvided&&r.checked&&/经验|案例/.test(r.type||'');
    const example=f?.exampleContext===true&&r.origin==='example'&&r.exampleOnly===true;
    if(!(online||manual||example)||!r.url||!(r.dimensions||[]).includes(row.dimension)||(r.folderId&&r.folderId!==f?.id))return false;
    const text=(r.title+' '+r.summary+' '+(r.lesson||'')+' '+(r.skills||[]).join(' ')).toLowerCase();
    if(['sql','python','excel'].includes(row.key)&&!text.includes(row.key))return false;
    if(/英语|english/i.test(row.label)&&!/英语|english/i.test(text))return false;
    return true;
  }
  function caseReferences(s,row,f=folder(s)){return (s.sources||[]).filter(r=>caseSupports(row,r,f));}
  function suggestions(s,f=folder(s)) {
    if(!reviewed(s,f))return [];
    const result=[];
    for(const row of matchResults(s,f)){
      if(row.status==='supported')continue;
      if(s.plans.some(p=>p.folderId===f.id&&p.requirementKey===row.key&&p.origin!=='自定义任务'))continue;
      const references=caseReferences(s,row,f),lead=references.find(r=>r.practiceSteps?.length)||references[0],base=recipes[row.dimension],pending=!references.length;
      const taskSteps=pending?['寻找与该要求相关的公开经验分享或实际案例','核对案例中的行动、背景与限制','取得适用经验依据后，再形成具体实践任务']:(lead.practiceSteps?.length?lead.practiceSteps:['阅读案例，记录实际采用的做法','按当前岗位要求缩小实践范围，并实际执行','保留过程、结果和局限，再更新经历库']);
      const experienceLesson=lead?.lesson||'';
      result.push({id:uid('plan'),folderId:f.id,requirementKey:row.key,dimension:row.dimension,
        title:pending?'等待经验依据：'+row.label:'针对「'+row.label+'」：'+(base?.title||'完成一项有案例依据的实践'),
        reason:row.count+' 个岗位提及「'+row.label+'」，其中 '+row.must+' 个列为必备。'+(pending?'当前尚未读取到适用的经验案例，暂不提供成形的学习计划。':'当前材料仍有未覆盖部分；参考已读取案例中的实践路径，形成下面的练习建议。'),
        relevance:pending?'等待说明经验与本项岗位要求的具体关系。':'把案例中的方法用于「'+row.label+'」的个人实践，形成可对照岗位的真实行动和成果；不复制案例的录用或增长结果。',
        output:pending?'一条适用的网上经验依据与核查说明':base?.output||'一份有过程记录的实践作品',
        criteria:pending?'原文可读取，经验与当前要求相关，并明确适用限制':'包含真实问题、个人行动、方法、实际成果和局限，可回溯过程材料',
        hours:pending?1:base?.hours||4,week:'周期内',steps:taskSteps.map(text=>({id:uid('step'),text,done:false})),
        status:'suggested',origin:row.mode==='example'?'示例建议':row.mode==='ai'?'案例驱动建议':'规则预览建议',sourcePolicy:'web-cases-v1',matchStatus:row.status,matchingMode:row.mode,sources:row.sources,
        experienceLesson,references:references.map(r=>({...r,application:r.application||'根据「'+row.label+'」转化为小规模实践；'+(r.lesson||r.summary)})),
        referencePending:pending,signature:signature(s,f),date:today()});
    }
    return result;
  }
  return {learningResources,materialsForPlan,outcomeSnapshot,createOutcomeDraft,confirmOutcomeDraft,Taxonomy,experienceTypes,experienceType,jobCategory,jobType,filterJobs,folderRequirements,caseSupports,caseReferences,dimensions,catalog,refs,today,uid,schedule,fresh,migrate,prepare,folder,jobs,folderJobs,selectedJobs,personalDocuments,extractedRequirements,canonical,inputForMatch,inputSignature,analysisCurrent,normalizeAIResult,matchResults,ruleRequirements,classify,requirements,signature,reviewed,candidates,answerValid,radar,endDate,daysBetween,extractDrafts,suggestions};
});
