/* Shared recruitment categories and filter semantics for collection and the saved job pool. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.InternPilotTaxonomy=api;})(typeof globalThis==='undefined'?this:globalThis,function(){
 'use strict';
 const groups=[
  {name:'产品',roles:['AI 产品经理','产品经理','产品助理','数据产品经理','商业化产品经理','用户研究员']},
  {name:'运营',roles:['AI 产品运营','产品运营','用户运营','内容运营','新媒体运营','活动运营','社群运营','电商运营','增长运营','游戏运营','数据标注 / AI 训练师']},
  {name:'技术',roles:['AI 工程师','算法工程师','前端开发','后端开发','测试工程师','数据开发','运维工程师']},
  {name:'设计',roles:['UX 设计师','交互设计师','UI 设计师','视觉设计师']},
  {name:'数据',roles:['数据分析师','商业分析师','数据挖掘']},
  {name:'市场',roles:['市场营销','品牌推广','市场策划','公关媒介']},
  {name:'销售',roles:['商务 BD','销售专员','客户成功','售前支持']},
  {name:'教育培训',roles:['课程产品','教学教研','教育研究','学习顾问']},
  {name:'职能',roles:['人力资源','行政','财务','法务','项目管理']},
  {name:'其他',roles:['其他岗位']}
 ];
 const options={
  type:['实习','全职','兼职','合同制','未注明'],
  experience:['在校/应届','经验不限','1年以内','1-3年','3-5年','5-10年','10年以上','未注明'],
  education:['学历不限','高中/中专','大专','本科','硕士','博士','未注明'],
  industry:['互联网','人工智能','计算机软件','电子商务','教育培训','咨询','金融','医疗健康','制造业','文化传媒','其他行业','未注明'],
  companySize:['0-20人','20-99人','100-499人','500-999人','1000-9999人','10000人以上','未注明'],
  financing:['未融资','天使轮','A轮','B轮','C轮','D轮及以上','已上市','不需要融资','未注明'],
  salary:['3K以下','3-5K','5-10K','10-15K','15-20K','20-30K','30-50K','50K以上','100元/天以下','100-200元/天','200-300元/天','300元/天以上','未注明'],
  cities:['全国','北京','上海','广州','深圳','杭州','成都','武汉','南京','苏州','西安','重庆','长沙','天津','郑州','远程 / 海外','未注明']
 };
 const rules=[
  ['数据标注 / AI 训练师',/ai trainer|data annotat|数据标注|AI训练师/i],
  ['AI 产品运营',/ai.*(product.*operations|运营)|ai.*产品运营|人工智能.*运营/i],['增长运营',/growth|增长/i],['社群运营',/community|社群/i],['新媒体运营',/新媒体|social media/i],['内容运营',/content|内容运营/i],['用户运营',/customer operations|用户运营/i],['活动运营',/event|活动运营/i],['电商运营',/e.?commerce.*operations|电商运营/i],['游戏运营',/game.*operations|游戏运营/i],['产品运营',/product.*operations|产品运营|operations/i],
  ['数据产品经理',/data product|数据产品/i],['商业化产品经理',/商业化产品|monetization.*product/i],['用户研究员',/user research|ux research|用户研究|用户调研/i],['AI 产品经理',/(ai|人工智能|智能).*产品|ai.*product/i],['产品助理',/产品助理|product assistant/i],['产品经理',/product manager|product owner|产品经理|产品策划|产品实习/i],
  ['商业分析师',/business analyst|商业分析/i],['数据分析师',/data analy|analytics|数据分析/i],['数据挖掘',/data mining|数据挖掘/i],['UX 设计师',/ux design|user experience design|ux.*设计/i],['交互设计师',/interaction design|交互设计/i],['UI 设计师',/ui design|ui.*设计/i],['视觉设计师',/graphic|visual design|视觉设计/i],
  ['算法工程师',/machine learning|algorithm|算法/i],['AI 工程师',/ai engineer|artificial intelligence|ai trainer|人工智能|大模型/i],['前端开发',/front.?end|前端/i],['后端开发',/back.?end|full.?stack|software|developer|后端|开发工程师/i],['测试工程师',/quality assurance|qa engineer|test engineer|测试/i],['数据开发',/data engineer|数据开发/i],['运维工程师',/devops|运维/i],
  ['公关媒介',/public relations|媒介|公关/i],['市场营销',/marketing|市场营销|市场推广/i],['品牌推广',/brand|品牌/i],['市场策划',/市场策划/i],['商务 BD',/business development|商务|\bbd\b/i],['客户成功',/customer success|客户成功/i],['售前支持',/pre.?sales|售前/i],['销售专员',/sales|销售/i],
  ['课程产品',/课程产品/i],['教学教研',/instructional|teacher|教研|教学/i],['教育研究',/education.*research|教育研究/i],['学习顾问',/learning advisor|学习顾问/i],['人力资源',/recruiter|human resources|人力资源/i],['行政',/admin|行政/i],['财务',/finance|accountant|财务/i],['法务',/legal|法务/i],['项目管理',/project manager|项目管理/i]
 ];
 function role(j){if(groups.some(g=>g.roles.includes(j.role)))return j.role;const title=String(j.title||'');return rules.find(([,r])=>r.test(title))?.[0]||'其他岗位';}
 function category(j){if(groups.some(g=>g.name===j.jobCategory))return j.jobCategory;const r=role(j);if(r!=='其他岗位')return groups.find(g=>g.roles.includes(r)).name;const t=String(j.category||'');return /product|产品/i.test(t)?'产品':/market|运营/i.test(t)?'运营':/data|数据/i.test(t)?'数据':/software|technical|技术/i.test(t)?'技术':/design|设计/i.test(t)?'设计':'其他';}
 function type(j){return j.jobType||(/实习|internship|\bintern\b/i.test(j.title||'')?'实习':'未注明');}
 function city(j){const raw=String(j.city||'');return options.cities.filter(c=>!['全国','远程 / 海外','未注明'].includes(c)).find(c=>raw.includes(c))||((/remote|远程|worldwide|anywhere/i.test(raw)||j.workMode==='remote')?'远程 / 海外':raw||'未注明');}
 function salaryMatches(j,value){if(value==='未注明')return !j.salaryMin&&!j.salaryMax&&!/\d/.test(j.salary||'');if(!j.salaryMin&&!j.salaryMax)return false;if(j.salaryCurrency!=='CNY')return false;const daily=value.includes('/天');if((daily?'day':'month')!==j.salaryPeriod)return false;const ranges={'3K以下':[0,3000],'3-5K':[3000,5000],'5-10K':[5000,10000],'10-15K':[10000,15000],'15-20K':[15000,20000],'20-30K':[20000,30000],'30-50K':[30000,50000],'50K以上':[50000,Infinity],'100元/天以下':[0,100],'100-200元/天':[100,200],'200-300元/天':[200,300],'300元/天以上':[300,Infinity]};const r=ranges[value];return !!r&&Number(j.salaryMax||j.salaryMin)>=r[0]&&Number(j.salaryMin||j.salaryMax)<r[1];}
 function attributes(j){return {category:category(j),role:role(j),type:type(j),city:city(j),experience:j.experience||'未注明',education:j.education||'未注明',industry:j.industry||'未注明',companySize:j.companySize||'未注明',financing:j.financing||'未注明',district:j.district||'未注明'};}
 function filter(list,filters={}){return list.filter(j=>{const a=attributes(j);for(const key of ['category','role','type','experience','education','industry','companySize','financing','district'])if(filters[key]&&filters[key]!==a[key])return false;if(filters.city==='全国'&&!options.cities.filter(c=>!['全国','远程 / 海外','未注明'].includes(c)).includes(a.city)&&j.countryCode!=='CN')return false;if(filters.city&&filters.city!=='全国'&&filters.city!==a.city)return false;if(filters.salary&&!salaryMatches(j,filters.salary))return false;const query=String(filters.query||filters.keyword||'').trim().toLowerCase();if(query&&!(j.title+' '+j.company+' '+(j.rawJD||'')).toLowerCase().includes(query))return false;if(filters.source&&(filters.source==='demo'?!j.demo:filters.source==='real'?j.demo:(j.acquisition||'manual')!==filters.source))return false;return true;});}
 return {groups,options,role,category,type,city,attributes,filter,salaryMatches};
});
