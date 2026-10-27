/* Frontend-only recommendation walkthrough. No search, model calls or external requests. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.InternPilotGrowth=api;})(globalThis,function(){
 'use strict';
 const version='direction-preview-v1';
 const labels={clarify:'先补充信息',express:'整理已有经历',evidence:'补齐证明材料',extend:'完善已有实践',learn:'学习并开展小实践'};
 const day=(start,offset)=>{const d=new Date(start+'T12:00:00');d.setDate(d.getDate()+offset);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
 const round=n=>Math.round(n*100)/100;
 function capacity(C,s,excludeId=''){
  const f=C.folder(s),sc=f?.schedule||C.schedule(),end=C.endDate(sc);let used=0,cross=0;
  for(const p of s.plans.filter(p=>p.id!==excludeId&&['adopted','completed'].includes(p.status))){
   if(p.folderId===f?.id){used+=Number(p.hours)||0;continue;}
   if(p.status!=='adopted')continue;
   const other=s.folders.find(x=>x.id===p.folderId)?.schedule;if(!other)continue;
   const start=p.startDate||other.start,finish=p.endDate||C.endDate(other),a=start>sc.start?start:sc.start,b=finish<end?finish:end;
   if(a<=b)cross+=(Number(p.hours)||0)*C.daysBetween(a,b)/Math.max(1,C.daysBetween(start,finish));
  }
  const total=round(sc.days*sc.dailyHours);return {total,used:round(used),cross:round(cross),free:round(Math.max(0,total-used-cross)),start:sc.start,end,dailyHours:sc.dailyHours};
 }
 function kind(row){
  if(row.status==='unclear'||row.mode==='preview')return 'clarify';
  if(row.status==='missing')return 'learn';
  const missing=(row.missing||[]).join(' ');
  if(/找回|证明文件|作品链接|补齐证明|原始材料/.test(missing))return 'evidence';
  if(/表述|表达不清|写清|简历未体现|未写明|补充描述/.test(missing))return 'express';
  return 'extend';
 }
 const demoSource={research:{title:'示例检索结果：从已有工作积累 UX 项目与作品集',url:'https://grow.google/intl/en_au/article-michelle-zhou/',publisher:'Grow with Google',summary:'用于展示“个人转型经历”如何成为建议的参考。正式检索需读取原文并核对具体行动。',lesson:'可以借鉴从已有情境中积累项目、整理过程与作品的方法。'},data:{title:'示例检索结果：应用技能与数据岗位准备经历',url:'https://blog.coursera.org/see-how-antonio-landed-an-ideal-first-job-out-of-college-by-stacking-job-ready-applied-skills-on-top-of-his-degree-learning/',publisher:'Coursera Blog',summary:'用于展示围绕 SQL 等应用技能查找求职经历的呈现方式。',lesson:'让工具学习接到实际问题、查询结果和过程讲解。'},ai:{title:'示例检索结果：企业在具体流程中应用 AI',url:'https://www.microsoft.com/en/customers/story/23610-fpt-software-linkedin',publisher:'Microsoft Customer Stories',summary:'用于展示企业实践作为方法参考的呈现方式，不能视为个人求职成功的证明。',lesson:'选一个小场景，记录 AI 输出、人工检查、失败与调整。'}};
 function sourceFor(dimension,keys,query){const ref=demoSource[dimension];return {id:'preview-ref-'+dimension,title:ref?.title||'检索结果样式示例：相关方向的实践复盘',url:ref?.url||'',publisher:ref?.publisher||'待接入全网检索',type:ref?'公开文章 · 示例关联':'结果占位示例',summary:ref?.summary||'这里将展示围绕当前方向检索到的经验分享。当前没有实际检索结果，不提供虚构文章链接。',lesson:ref?.lesson||'正式检索后，提取原文中的实际做法并核对适用关系。',limitations:'当前为前端示例：未执行搜索或读取原文，不证明当前方向的就业效果。',origin:'preview',previewOnly:true,dimensions:[dimension],requirementKeys:keys,query};}
 function content(p,choice){
  const subject=p.coveredLabels.join('、'),e=p.relatedExperienceTitle||'已有经历',k=choice||p.actionKind;
  const table={
   clarify:{title:'先核对「'+subject+'」的已有经历',hours:1,output:'一份补充后的经历描述与待核对事项',steps:['回看所选岗位中的具体职责与要求','补充自己是否做过、个人行动、方法和实际产出','如确实没有相关经历，再选择学习或实践路径'],criteria:'只填写真实做过的内容，区分已完成、了解过和暂不具备'},
   express:{title:'把「'+e+'」整理成清晰的经历',hours:1.5,output:'一段可核查的经历描述与成果索引',steps:['回顾已有经历中的背景和本人职责','补充个人行动、方法、结果与限制','关联已有成果，核查后补入经历库'],criteria:'不增加未发生的行动或数字，能够回到原始材料解释'},
   evidence:{title:'为「'+e+'」补齐可展示的材料',hours:2,output:'一份成果目录与可展示材料',steps:['列出支持岗位要求的已有产出','找回原始报告、代码或过程记录，说明个人贡献','整理可分享版本，并标记暂时无法提供的材料'],criteria:'材料真实、可打开，能辨别个人贡献与团队成果'},
   extend:{title:'在「'+e+'」上补一次小实践',hours:4,output:'补充后的实践作品、过程记录与一页说明',steps:['围绕「'+subject+'」选一个原项目尚未回答的小问题','补充一次实际操作或验证，保留输入、过程与输出','说明新增发现、个人贡献和局限，整理为经历材料'],criteria:'能说明新增行动如何回应岗位要求，并提供实际产出'},
   learn:{title:'围绕「'+subject+'」完成一个入门实践',hours:6,output:'一份小作品、可复现过程与学习复盘',steps:['选择一个范围明确的问题，先学习完成它需要的基础内容','参考案例的方法进行一次真实操作，保存过程和输出','检查结果、记录失败与限制，整理可展示的作品'],criteria:'学习材料用到了实际产出中，能解释方法、结果与不足'}
  };
  if(p.requirementKeys?.includes('sql')&&k==='extend')Object.assign(table.extend,{title:'用已有课程数据做一次 SQL 分析',output:'SQL 查询文件、结果表与一页业务解释',steps:['复用原课程数据，选一个可用分组统计回答的小问题','补充查询并检查字段、过滤条件和统计口径，保存实际结果','解释查询结果、说明数据限制，整理可复现的文件']});
  return {...table[k],actionKind:k,actionLabel:labels[k]};
 }
 function rank(C,s,plans){let free=capacity(C,s).free,count=0;return plans.slice().sort((a,b)=>(b.priority||0)-(a.priority||0)).map(p=>{const next={...p};if(count>=3){next.deferredReason='先完成前三项重点，避免同时铺开过多任务';}else if(p.hours>free){next.deferredReason='剩余 '+round(free)+' 小时，暂不足以安排这项 '+p.hours+' 小时任务';}else{next.deferredReason='';free=round(free-p.hours);count++;}return next;});}
 function generate(C,s,onlyKeys=null){
  const f=C.folder(s);if(!f||!C.reviewed(s))return [];
  const rows=C.matchResults(s).filter(r=>(!onlyKeys||onlyKeys.includes(r.key))&&r.status!=='supported'&&!s.plans.some(p=>p.folderId===f.id&&(['adopted','completed'].includes(p.status)||(p.status==='suggested'&&p.userEdited))&&(p.requirementKeys||[p.requirementKey]).includes(r.key)));
  const groups=new Map();for(const row of rows){const k=kind(row),id=k+':'+row.dimension;if(!groups.has(id))groups.set(id,[]);groups.get(id).push(row);}
  const plans=[];for(const group of groups.values()){
   const row=group[0],keys=group.map(r=>r.key),sourceRows=group.flatMap(r=>r.sources),jobIds=new Set(sourceRows.map(r=>r.jobId)),mustIds=new Set(sourceRows.filter(r=>r.must).map(r=>r.jobId));
   const evidence=group.flatMap(r=>r.evidence||[]),related=evidence[0],actionKind=kind(row),query=f.name.replace(/^示例\s*[·：:]\s*/,'')+' '+group.map(r=>r.label).join(' ')+' 求职经验 项目复盘';
   const p={id:C.uid('growth'),folderId:f.id,growthVersion:version,retrievalDemo:true,requirementKey:row.key,requirementKeys:keys,coveredLabels:group.map(r=>r.label),dimension:row.dimension,actionKind,relatedExperienceId:related?.experienceId||'',relatedExperienceTitle:related?.title||'',priority:mustIds.size*10+jobIds.size*2+(actionKind==='clarify'?1:0),jobCount:jobIds.size,mustCount:mustIds.size,
    reason:jobIds.size+' 个所选岗位涉及这些要求，其中 '+mustIds.size+' 个标为必备。'+(actionKind==='clarify'?'现有预览不足以判断能力，先补充信息，避免直接安排重学。':related?'已有「'+related.title+'」的相关线索，优先复用已有基础。':'当前材料尚未提供充分行动证据，示例展示从小实践补足的路径。'),
    gapSummary:group.map(r=>r.label+'：'+((r.missing||[]).join('；')||r.reason)).join('\n'),sources:sourceRows,references:[sourceFor(row.dimension,keys,query)],searchQueries:[query,f.name+' '+group.map(r=>r.label).join(' ')+' 实习 成长案例'],relevance:'这项行动用于补足「'+group.map(r=>r.label).join('、')+'」的经历或实践证据。示例关系需在正式检索后核查。',
    status:'suggested',origin:'前端示例建议',sourcePolicy:version,signature:C.signature(s),date:C.today(),week:'待确认安排',referencePending:false};
   Object.assign(p,content(p));p.steps=p.steps.map(text=>({id:C.uid('step'),text,done:false}));plans.push(p);
  }
  return rank(C,s,plans);
 }
 function matchGroups(C,s){
  const rows=C.matchResults(s).map(r=>{
   const text=(r.evidence||[]).map(e=>e.quote).join(' ');let ownedLabel=r.label;
   if(r.status==='partial'){
    if(r.key==='sql'&&/select|where/i.test(text))ownedLabel='SQL 基础查询';
    else if(r.dimension==='research'&&/问卷/.test(text))ownedLabel='问卷设计与反馈整理';
    else if(r.dimension==='operations'&&/整理|沟通|内容/.test(text))ownedLabel='内容整理与沟通协助';
    else ownedLabel=r.label+'的已有基础';
   }
   return {...r,ownedLabel};
  });
  return {owned:rows.filter(r=>['supported','partial'].includes(r.status)&&r.evidence?.length),gaps:rows.filter(r=>['partial','missing'].includes(r.status)),unknown:rows.filter(r=>r.status==='unclear')};
 }
 function queueSuggestions(C,s,keys){
  const f=C.folder(s);if(!f||!C.reviewed(s))throw Error('请选择岗位并补充个人材料。');
  const eligible=new Set(matchGroups(C,s).gaps.map(r=>r.key)),wanted=[...new Set(keys||[])];
  if(wanted.some(k=>!eligible.has(k)))throw Error('请选择当前匹配中的待提升能力。');
  const inFolder=s.plans.filter(p=>p.folderId===f.id),existing=[],active=[],covered=new Set();
  for(const key of wanted){const linked=inFolder.filter(p=>(p.requirementKeys||[p.requirementKey]).includes(key));
   const pending=linked.find(p=>p.status==='suggested'),ongoing=linked.find(p=>['adopted','completed'].includes(p.status));
   if(pending){if(!existing.includes(pending))existing.push(pending);covered.add(key);}
   else if(ongoing){if(!active.includes(ongoing))active.push(ongoing);covered.add(key);}
  }
  const remaining=wanted.filter(k=>!covered.has(k)),pending=remaining.length?generate(C,s,remaining).map(p=>({...p,status:'suggested',requestedFrom:'evidence'})):[];
  s.plans.push(...pending);return {pending,existing,active};
 }
 function variants(p){return Object.keys(labels).map(k=>({key:k,label:labels[k],...content(p,k)}));}
 function adopt(C,s,p,values){
  if(!p||p.status!=='suggested')throw Error('请选择一条尚未加入的建议。');
  const hours=Number(values.hours),budget=capacity(C,s),start=values.start,end=values.end;
  if(!Number.isFinite(hours)||hours<.25||hours>budget.free)throw Error('任务投入超出剩余预算，请调整任务或投入安排。');
  if(!start||!end||start<budget.start||end>budget.end||end<start)throw Error('任务日期需要位于本轮准备周期内，结束日期不能早于开始日期。');
  if(C.daysBetween(start,end)*budget.dailyHours<hours)throw Error('所选日期内的可投入时长不足，请延长任务时间。');
  const conflicts=s.plans.filter(x=>x.folderId===p.folderId&&x.status==='adopted'&&x.startDate&&x.endDate);for(let i=0;i<C.daysBetween(start,end);i++){const d=day(start,i);const reserved=conflicts.filter(x=>x.startDate<=d&&x.endDate>=d).reduce((sum,x)=>sum+Number(x.hours)/C.daysBetween(x.startDate,x.endDate),0);if(reserved+hours/C.daysBetween(start,end)>budget.dailyHours+.001)throw Error('这段日期与已安排任务重叠，超过每日投入，请换一个时间段。');}
  const chosen=p.growthVersion&&values.choice&&values.choice!==p.actionKind?content(p,values.choice):null;
  return {...p,...(chosen?{...chosen,steps:chosen.steps.map(text=>({id:C.uid('step'),text,done:false}))}:{}),hours,startDate:start,endDate:end,week:start+' 至 '+end,status:'adopted'};
 }
 function setIncluded(C,s,p,include){
  if(!p)throw Error('未找到这条建议。');
  if(include){
   if(['adopted','completed'].includes(p.status))return p;
   if(!['suggested','dismissed'].includes(p.status))throw Error('这条建议暂不能加入计划。');
   return adopt(C,s,{...p,status:'suggested'},{hours:p.hours,...dates(C,s,p),choice:p.actionKind});
  }
  if(p.status==='completed')throw Error('已完成任务保留完成状态，可查看相关成果。');
  return p.status==='adopted'?{...p,status:'suggested'}:p;
 }
 function revise(p,options){
  const hours=Number(options.hours),resource=options.resource;
  if(!Number.isFinite(hours)||hours<.25||hours>500||!['existing','solo','users'].includes(resource))throw Error('请填写有效的时间与条件。');
  const short=hours<=1,keys=p.requirementKeys||[p.requirementKey];let title,output,steps;
  if(p.dimension==='data'&&keys.includes('sql')){title=short?'完成一条 SQL 查询并解释结果':'用 SQL 回答一个具体业务问题';output=short?'一条 SQL 语句、结果截图与口径说明':'SQL 查询文件、结果表与一页解释';steps=short?['从可用或合成数据中选一个筛选问题','写出并执行一条查询，核对结果','记录字段含义和结果限制']:['复用已有或合成数据，只回答一个业务问题','编写筛选、分组查询并核对统计口径','提交语句、结果和一页解释，说明限制'];}
  else if(p.dimension==='research'&&resource==='users'){title='完成一次小范围访谈与需求归纳';output='访谈提纲、匿名记录与一页归纳';steps=['围绕一个具体问题写出简短提纲','联系一位可参与者，说明用途后记录反馈','归纳一项需求，区分原话与解释，说明样本限制'];}
  else if(p.dimension==='research'){title=resource==='existing'?'整理已有反馈，补一页需求结论':'用公开反馈整理一个需求问题';output=resource==='existing'?'已有反馈索引与一页需求说明':'公开反馈摘录、来源索引与一页归纳';steps=[resource==='existing'?'选择一组已有的问卷或反馈，标明来源':'选择可公开引用的反馈，保留链接与原文','只归纳一个具体问题，区分事实和解释','说明样本限制；资料分析不能写成亲自访谈'];}
  else if(p.dimension==='ai'){title=short?'核查两个 AI 回答并记录问题':'为一个 AI 使用场景做小范围评测';output='问题、原始输出、人工检查与改进记录表';steps=[short?'选两个常见问题，写清好回答的标准':'围绕一个场景准备少量常见与边界问题','保留原始回答，人工检查准确性和出处','记录一个失败与改进方法，不推断整体效果'];}
  else if(p.actionKind==='express'||p.actionKind==='evidence'||p.dimension==='operations'){title='补清已有经历中的个人贡献';output='个人行动说明与已有成果索引';steps=['选一段已有经历，列出本人实际负责的工作','对应到已保存的文案、表格或过程记录','删除无法核查的团队成果与数字，形成一段说明'];}
  else{title=(p.title||'准备任务').replace(/ · 精简范围$/,'');output='一个可核查的小成果与一页过程说明';steps=[(p.steps?.[0]?.text||'选择一个能在当前条件下完成的小问题'),'只完成一个具体交付，保留实际操作记录','说明个人贡献、结果和局限'];}
  return {title,hours,output,steps,criteria:'交付中包含实际行动、对应产出和局限，能够回到原始材料核查。',reason:'根据你选择的 '+hours+' 小时与'+({existing:'已有项目／材料',solo:'独立完成',users:'可联系真实用户'})[resource]+'条件，缩小到一项具体交付。原岗位要求与依据保留。',resource};
 }
 function dates(C,s,p){const b=capacity(C,s),active=s.plans.filter(x=>x.folderId===p.folderId&&x.status==='adopted'&&x.endDate);let start=b.start;for(const task of active)if(task.endDate>=start)start=day(task.endDate,1);return {start,end:day(start,Math.max(1,Math.ceil(p.hours/b.dailyHours))-1)};}
 return {version,labels,kind,generate,rank,capacity,variants,adopt,dates,revise,matchGroups,queueSuggestions,setIncluded};
});
