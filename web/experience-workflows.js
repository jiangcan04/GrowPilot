/* Browser-only data previews. No model or search calls. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.InternPilotWorkflows=api;})(globalThis,function(){
 const snapshot=o=>JSON.stringify(o);
 function validLink(value){try{return ['http:','https:'].includes(new URL(value).protocol);}catch{return false;}}
 function saveOutcome(C,s,input){
  const p=s.plans.find(p=>p.id===input.planId);if(!p)throw Error('请选择关联任务。');
  const title=String(input.title||'').trim(),description=String(input.description||'').trim(),text=String(input.text||'').trim(),links=input.links||[],attachments=input.attachments||[];
  if(!title||!description)throw Error('请填写成果名称和成果描述。');
  if(!text&&!links.length&&!attachments.length)throw Error('请提供文字、链接或文件中的至少一种成果。');
  if(links.some(l=>!validLink(l.url)))throw Error('成果链接需要以 HTTP 或 HTTPS 开头。');
  const old=s.outcomes.find(o=>o.id===input.id);if(old&&old.planId!==p.id)throw Error('不能将已有成果移动到其他任务。');
  const outcome={...old,id:old?.id||C.uid('outcome'),planId:p.id,folderId:p.folderId,title,description,text,links,attachments,process:input.process||'',method:input.method||'',reflection:input.reflection||'',final:true,registered:true,date:C.today(),revision:(old?.revision||0)+1};
  if(old)s.outcomes=s.outcomes.map(o=>o.id===old.id?outcome:o);else s.outcomes.push(outcome);return outcome;
 }
 function draft(C,s,id){
  const o=s.outcomes.find(o=>o.id===id);if(!o?.description?.trim())throw Error('请先登记成果并填写描述。');
  const p=s.plans.find(p=>p.id===o.planId),related=s.experiences.find(e=>(e.sourceOutcomeIds||[e.sourceOutcomeId]).includes(id))||s.experiences.find(e=>e.relatedRequirement&&e.relatedRequirement===p?.requirementKey);
  const content=String(o.description).trim();
  // The interface demonstrates organising an existing description, never inventing facts from unread files.
  return {sourceOutcomeId:id,snapshot:snapshot(o),title:o.title||p?.title||'实践成果',type:/课程|课堂|作业/.test(o.description)?'课程经历':related?.type||'项目经历',description:content,period:'',link:o.links?.[0]?.url||'',relatedId:related?.id||'',mode:'preview'};
 }
 function commit(C,s,d,fields){
  if(!fields.confirmed)throw Error('请核查内容并勾选确认。');const o=s.outcomes.find(o=>o.id===d?.sourceOutcomeId);if(!o||snapshot(o)!==d.snapshot)throw Error('成果内容已变化，请重新整理。');
  const title=String(fields.title||'').trim(),description=String(fields.description||'').trim();if(!title||!description||!C.experienceTypes.includes(fields.type))throw Error('请填写经历名称、内容和有效分类。');if(fields.link&&!validLink(fields.link))throw Error('证明链接无效。');
  const linked=s.experiences.find(e=>(e.sourceOutcomeIds||[e.sourceOutcomeId]).includes(o.id));let target=fields.mode==='update'?s.experiences.find(e=>e.id===fields.targetId):null;
  if(linked&&target?.id!==linked.id)throw Error('这份成果已有对应经历，请选择更新已有经历。');if(fields.mode==='update'&&!target)throw Error('请选择需要补充的已有经历。');
  const entry={...target,id:target?.id||C.uid('exp'),title,type:fields.type,description,period:fields.period||target?.period||'',link:fields.link||'',confirmed:true,sourceOutcomeId:target?.sourceOutcomeId||o.id,sourceOutcomeIds:[...new Set([...(target?.sourceOutcomeIds||[target?.sourceOutcomeId]).filter(Boolean),o.id])],revision:(target?.revision||0)+1,recognitionMode:'frontend-preview',date:C.today(),versions:[...(target?.versions||[]),...(target?[{date:C.today(),title:target.title,description:target.description,type:target.type}]:[])]};
  if(target)s.experiences=s.experiences.map(e=>e.id===target.id?entry:e);else s.experiences.push(entry);return entry;
 }
 return {saveOutcome,draft,commit,snapshot,validLink};
});
