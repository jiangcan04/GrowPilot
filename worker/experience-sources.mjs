/* Public case-source collector. Source text is data; never execute it or follow arbitrary URLs. */
export const CASE_SOURCES=[
 {id:'yesha-ux',title:'Yesha 从金融服务转向 UX 设计的经历',url:'https://blog.coursera.org/read-about-how-yesha-made-google-ux-design-certificate-a-stepping-stone-into-a-new-career-in-design/',publisher:'Coursera Blog',type:'求职成功案例',dimensions:['research','product'],skills:['用户研究','产品方案','原型'],anchors:['Yesha','design'],summary:'平台刊载的个人转行故事，记录了 Yesha 学习 UX 设计并进入设计岗位的经历。',lesson:'把研究、设计过程与作品集联系起来，展示自己如何解决问题。',practiceSteps:['围绕目标岗位选择一个可接触的用户问题','实际收集用户反馈，并保留研究与设计过程','将过程和结果整理为一个作品案例，说明个人贡献'],limitations:'培训平台刊载的个案，具有宣传属性；UX 设计经历对产品岗位只作方法借鉴。'},
 {id:'michelle-ux',title:'Michelle 将咨询经验转化为 UX 项目与作品集',url:'https://grow.google/intl/en_au/article-michelle-zhou/',publisher:'Grow with Google',type:'个人经验分享',dimensions:['research','product','collaboration'],skills:['用户研究','产品方案','原型','跨团队沟通'],anchors:['Michelle','portfolio'],summary:'Google 刊载的毕业生经历：Michelle 在原工作中补充设计项目，逐步建立 UX 作品集并转向设计岗位。',lesson:'在已有工作情境中争取小项目，把原有业务理解转为可展示的设计实践。',practiceSteps:['从已有经历中找一个真实的用户或业务问题','做一次小规模研究或方案改进，记录协作和个人行动','整理过程、产出与反思，作为作品集条目'],limitations:'平台刊载的个人经历；不能据此推断获得证书即可转岗。'},
 {id:'travelboom',title:'TravelBoom 用用户行为数据改进转化的实践案例',url:'https://clarity.microsoft.com/case-studies/travelboom/',publisher:'Microsoft Clarity',type:'企业实践案例',dimensions:['research','data','operations','product'],skills:['用户研究','数据分析','产品方案','运营'],anchors:['TravelBoom','heat'],summary:'微软刊载的企业案例：TravelBoom 用热图观察用户行为，据此改进网站体验。',lesson:'先观察真实行为，提出改进假设，再比较调整后的表现；不是只制作一份没有验证的方案。',practiceSteps:['为目标产品选择一个可观察的体验或转化问题','收集行为数据或用户反馈，写出改进假设','做一次小改进并记录前后观察、限制和下一步'],limitations:'工具厂商发布的企业案例；其业务资源与个人练习不同，不复制案例增长数字。'},
 {id:'antonio-sql',title:'Antonio 将 SQL 等应用技能用于第一份数据岗位',url:'https://blog.coursera.org/see-how-antonio-landed-an-ideal-first-job-out-of-college-by-stacking-job-ready-applied-skills-on-top-of-his-degree-learning/',publisher:'Coursera Blog',type:'求职成功案例',dimensions:['data'],skills:['sql','excel','数据分析'],anchors:['Antonio','SQL'],summary:'毕业生自述：Antonio 在校补充数据库与 SQL 等应用技能，进入数据分析岗位，并用相关知识回答技术面试问题。',lesson:'围绕岗位日常使用的工具练习，并能解释查询或分析的具体过程。',practiceSteps:['从目标 JD 选一个真实的数据查询或分析场景','使用 SQL 或 Excel 完成相关练习，保存输入、查询或计算与结果','写清分析逻辑、局限和可复现过程，并练习讲解'],limitations:'2021 年的平台个案，说明一种实践路径，不能代表当前招聘条件。'},
 {id:'kemberli-data',title:'Kemberli 从行政岗位经实习转入数据科学',url:'https://blog.coursera.org/learner-story-admin-intern-professional-data-scientist/',publisher:'Coursera Blog',type:'个人经验分享',dimensions:['data'],skills:['python','数据分析'],anchors:['Kemberli','Python'],summary:'个人自述记录了 Kemberli 学习 Python 等工具、积累课程项目，再通过实习进入数据岗位的经历。',lesson:'技能学习要形成动手项目，并通过真实实践检验是否能解决问题。',practiceSteps:['选择一个与目标岗位相关、范围小的数据问题','用 Python 完成处理与分析，保留代码和实际输出','整理失败、改进与项目说明，作为下一段实践的材料'],limitations:'2017 年的平台刊载故事；有既有编程背景，不能直接套用其学习周期。'},
 {id:'fpt-copilot',title:'FPT Software 将 AI 用于营销与内部工作流程',url:'https://www.microsoft.com/en/customers/story/23610-fpt-software-linkedin',publisher:'Microsoft Customer Stories',type:'企业实践案例',dimensions:['ai','operations','collaboration'],skills:['ai','运营','跨团队沟通'],anchors:['FPT','Copilot'],summary:'微软客户案例记录了 FPT Software 从培训走向实际应用，将 Copilot 用于内容准备、活动和工作流程。',lesson:'从具体工作场景的小规模试用开始，记录实际应用和效果，再决定如何改进。',practiceSteps:['选择一个目标岗位中重复出现的内容或协作场景','比较人工方法与 AI 辅助方法，保留输入、输出和人工检查','记录效果、失败与适用边界，形成一份实践复盘'],limitations:'厂商刊载的企业实践，具有商业宣传属性；个人练习不承诺同等效果。'}
];
const HOSTS=new Set(['blog.coursera.org','grow.google','www.grow.google','clarity.microsoft.com','www.microsoft.com']);
const cache=new Map(),pending=new Map();
export function allowedCaseURL(value){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||(u.port&&u.port!=='443')||!HOSTS.has(u.hostname))throw Error('暂只支持已接入的公开案例源（Coursera Blog、Grow with Google、微软案例）。');return u;}
function text(html){return String(html).replace(/<(script|style|nav|header|footer)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&quot;|&#34;/g,'"').replace(/&#39;|&apos;|&#x27;/g,"'").replace(/&[a-zA-Z#0-9]+;/g,' ').replace(/\s+/g,' ').trim();}
const decode=s=>text(s||'');
export function extractCase(html,seed,url=seed.url){
 if(/<title[^>]*>[^<]*(access denied|just a moment|captcha|403|404|not found)/i.test(html))throw Error('来源当前限制读取或文章不存在。');
 const area=html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1]||html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||html;
 const body=text(area);if(body.length<250||!seed.anchors.every(a=>body.toLowerCase().includes(a.toLowerCase())))throw Error('未读取到可核对的案例正文，本次不作为计划依据。');
 const paragraphs=[...area.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(m=>decode(m[1])).filter(p=>p.length>40&&p.length<2000);
 const paragraph=paragraphs.find(p=>seed.anchors.every(a=>p.toLowerCase().includes(a.toLowerCase())))||paragraphs.find(p=>seed.anchors.some(a=>p.toLowerCase().includes(a.toLowerCase())));
 if(!paragraph)throw Error('未提取到经验段落，本次不作为计划依据。');
 // Retain one very short original excerpt, with a link to the complete article.
 const quote=/[\u4e00-\u9fff]/.test(paragraph)?paragraph.slice(0,24):paragraph.split(/\s+/).slice(0,9).join(' ');
 const date=html.match(/(?:property|name)=["']article:published_time["'][^>]*content=["']([^"']+)/i)?.[1]||html.match(/"datePublished"\s*:\s*"([^"]+)"/)?.[1]||'';
 return {...seed,url,origin:'web',readStatus:'read',fetchedAt:new Date().toISOString(),publishedAt:date,quote,contentVerified:true,qualityNote:'已读取原文，不代表独立验证文中结果；经验要点由编辑整理，练习是结合岗位的转化建议。'};
}
export async function readCase(seed,fetcher=fetch,refresh=false){
 const cached=cache.get(seed.url);if(cached&&Date.now()-cached.at<12*3600000)return cached.value;
 if(pending.has(seed.url))return pending.get(seed.url);
 const work=(async()=>{
  let url=allowedCaseURL(seed.url);
  for(let i=0;i<4;i++){
   const response=await fetcher(url.href,{headers:{Accept:'text/html'},redirect:'manual',signal:AbortSignal.timeout(14000),cf:{cacheTtl:43200,cacheEverything:true}});
   if([301,302,303,307,308].includes(response.status)){const location=response.headers.get('Location');if(!location)throw Error('来源跳转无效。');url=allowedCaseURL(new URL(location,url).href);continue;}
   if(!response.ok)throw Error('来源暂不可读取（'+response.status+'），未作为计划依据。');
   const type=response.headers.get('Content-Type')||'';if(!type.includes('text/html'))throw Error('来源不是可读取的网页。');
   if(Number(response.headers.get('Content-Length'))>2500000)throw Error('来源页面过大。');
   const reader=response.body.getReader();let size=0,parts=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2500000){await reader.cancel();throw Error('来源页面过大。');}parts.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
   const result=extractCase(new TextDecoder().decode(bytes),seed,url.href);cache.set(seed.url,{at:Date.now(),value:result});return result;
  }
  throw Error('来源跳转过多。');
 })().finally(()=>pending.delete(seed.url));pending.set(seed.url,work);return work;
}
export async function collectExperienceSources(input={},fetcher=fetch){
 const dimensions=Array.isArray(input.dimensions)?input.dimensions.filter(d=>['research','product','data','ai','operations','collaboration','other'].includes(d)):[];
 const skills=Array.isArray(input.skills)?input.skills.map(x=>String(x).toLowerCase()).slice(0,20):[];
 const seeds=CASE_SOURCES.filter(s=>s.dimensions.some(d=>dimensions.includes(d))).sort((a,b)=>b.skills.filter(k=>skills.includes(k)).length-a.skills.filter(k=>skills.includes(k)).length).slice(0,6);
 const results=[];
 // Three bounded workers; do not retry a rejected or blocked source.
 let cursor=0;async function one(){while(cursor<seeds.length){const seed=seeds[cursor++];try{results.push({id:seed.id,title:seed.title,url:seed.url,ok:true,source:await readCase(seed,fetcher)});}catch(error){results.push({id:seed.id,title:seed.title,url:seed.url,ok:false,error:error.name==='TimeoutError'?'读取超时，未作为计划依据。':error.message||'来源当前无法读取。'});}}}
 await Promise.all([one(),one(),one()]);
 return {sources:results.filter(r=>r.ok).map(r=>r.source),results,scope:'按能力缺口从已接入的公开经验与案例源读取；不等于全网检索。',fetchedAt:new Date().toISOString()};
}
