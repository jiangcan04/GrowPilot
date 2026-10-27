(() => {
  'use strict';
  const C=window.InternPilot,G=window.InternPilotGrowth,E=window.InternPilotExamples,D=window.InternPilotDaily,GP=window.GrowPilotGulu,HC=window.GrowPilotCoach,W=window.InternPilotWorkflows,T=C.Taxonomy,KEY='internpilot-prototype-v4',OLD_KEY='internpilot-prototype-v3';
  const A=window.GrowPilotAccounts,CAL=window.GrowPilotCalendar;
  const pages=[['goal','求职方向'],['plans','成长计划'],['today','今日任务'],['review','我的积累']];
  const pageGroup=page=>page==='evidence'?'goal':page;
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const lines=v=>String(v||'').split('\n').map(v=>v.trim()).filter(Boolean);
  const safeUrl=v=>{try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}};
  const link=(url,label)=>safeUrl(url)?'<a href="'+esc(safeUrl(url))+'" target="_blank" rel="noopener noreferrer">'+esc(label||url)+' ↗</a>':'';
  let state;
  try{state=C.migrate(JSON.parse(localStorage.getItem(KEY)||localStorage.getItem(OLD_KEY)||'null'));}catch{state=C.fresh();}
  if(!state.folders.length&&!state.experiences.length&&!state.outcomes.length){state=E.create(C);state.page='goal';state.plans=state.plans.filter(p=>p.status!=='suggested');}
  if(!['goal','evidence','plans','today','review'].includes(state.page))state.page='goal';
  const accountDB=A.bootstrap(localStorage,state,()=>C.fresh(),()=>E.create(C));
  state=C.migrate(accountDB.workspaces[accountDB.sessionId||A.DEFAULT]);
  let authMethod='email';
  let authChallenge=null,authEmail='',authStage='email',authTimer=null,todayFolder='',accumulationTab='library',savingForm=false;
  const formSnapshots=new WeakMap();
  let coachContext=null,coachQuestion='',calendarMode='week',calendarAnchor='';
  let dailyView='',companionMessage='',guluOpen=false,guluMode='daily',lastGuluMessage='',guluWidget;
  let lastSaved=JSON.stringify(state),modalReturn=null,pendingRecognition=null,syncRequestId=0,workbenchId='';
    let jobFilters={},collectionFilters={},collectBusy=false,collectionMessage='',cloudCleanup=()=>{},cloudPage=0,sourcesBusy=false;
  const f=()=>C.folder(state),reqs=()=>C.requirements(state),jobs=()=>C.folderJobs(state);
  const expById=id=>state.experiences.find(e=>e.id===id),planById=id=>state.plans.find(p=>p.id===id);
  const folderName=id=>state.folders.find(x=>x.id===id)?.name||'未归属方向';
  const currentPlans=()=>state.plans.filter(p=>p.folderId===f()?.id);
  const noFolder=()=>'<div class="empty"><strong>先建立一个求职方向</strong><p>在目标岗位页发现岗位，并收藏到方向文件夹。</p><div class="actions"><button class="button primary" data-page="goal">去发现岗位</button></div></div>';
  function persist(){try{A.save(localStorage,accountDB,state);lastSaved=JSON.stringify(state);}catch(error){state=JSON.parse(lastSaved);throw new Error('浏览器存储已满或不可用，本次修改没有保存。请先导出备份或释放空间。');}}
  function toast(text){const el=$('#toast');el.textContent=text;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),3800);}
  function button(text,act,id='',kind=''){return '<button type="button" class="button '+kind+'" data-act="'+act+'" data-id="'+esc(id)+'">'+text+'</button>';}
  function field(name,label,value='',type='text',extra=''){
    return '<label class="field"><span>'+label+'</span><input name="'+name+'" type="'+type+'" value="'+esc(value)+'" '+extra+'></label>';
  }
  function area(name,label,value='',extra=''){return '<label class="field"><span>'+label+'</span><textarea name="'+name+'" '+extra+'>'+esc(value)+'</textarea></label>';}
  function select(name,label,options,value=''){return '<label class="field"><span>'+label+'</span><select name="'+name+'">'+options.map(o=>'<option value="'+esc(o[0])+'" '+(o[0]===value?'selected':'')+'>'+esc(o[1])+'</option>').join('')+'</select></label>';}
  function empty(text,detail=''){return '<div class="empty"><strong>'+text+'</strong><p>'+detail+'</p></div>';}
  function head(step,title,desc){const group=pageGroup(state.page),index=pages.findIndex(p=>p[0]===group);return '<div class="page-head"><div><div class="eyebrow">'+(index+1)+' / 4 · '+esc(pages[index]?.[1]||'GrowPilot')+'</div><h1>'+title+'</h1><p>'+desc+'</p></div></div>';}
  function directionTabs(){return '<div class="section-tabs" aria-label="求职方向步骤"><button class="'+(state.page==='goal'?'active':'')+'" data-page="goal">1 · 目标岗位</button><span>→</span><button class="'+(state.page==='evidence'?'active':'')+'" data-page="evidence">2 · 能力对照</button></div>';}
  function snapshotForm(form){return JSON.stringify([...new FormData(form)].map(([k,v])=>[k,typeof v==='string'?v:[v.name,v.size]]));}
  function rememberForms(root=document){$$('form',root).forEach(form=>formSnapshots.set(form,snapshotForm(form)));}
  function unsaved(){return $$('.app-shell form,#modal-root form').some(form=>!['auto-collect-form','coach-accept-form'].includes(form.id)&&formSnapshots.has(form)&&snapshotForm(form)!==formSnapshots.get(form));}
  function leaveAccount(){if(savingForm||collectBusy){toast('正在保存，请稍候再切换或退出账户。');return false;}return !A.account(accountDB)||!unsaved()||confirm('有尚未保存的表单内容。确定离开？已保存的经历、任务和成果会保留。');}
  function renderAccount(){const a=A.account(accountDB);if(!a)return;$('#signed-in-label').textContent=a.nickname+' · 已登录';$('#account-root').innerHTML='<details class="account-menu"><summary><span class="account-avatar">'+esc(a.avatar)+'</span><span><strong>'+esc(a.nickname)+'</strong><small>演示账户 · 已登录</small></span><span class="account-dots">···</span></summary><div class="account-popover"><div class="account-email">'+esc(A.contact(a))+'</div>'+button('个人设置','account-profile','','ghost')+button('提醒与咕噜','account-prefs','','ghost')+button('切换账户','account-switch','','ghost')+button('导出我的备份','export-backup','','ghost')+button('重置当前账户体验','reset','','ghost')+'<div class="account-divider"></div>'+button('退出登录','account-logout','','ghost')+'</div></details>';}
  function renderLogin(){
    clearInterval(authTimer);$('.app-shell').hidden=true;$('#gulu-root').hidden=true;$('#auth-root').hidden=false;document.body.classList.remove('nav-open');
    const existing=accountDB.accounts.some(a=>a[authMethod]===authEmail);
    $('#auth-root').innerHTML='<div class="auth-layout"><section class="auth-story"><div class="logo"><span class="logo-mark">GP</span><span>GrowPilot<small>把求职方向，变成每天的成长</small></span></div><div class="auth-intro"><span class="eyebrow">每一步，都在靠近想去的方向</span><h1>从想去哪里，<br>到今天做什么。</h1><p>找到目标岗位，认识已有能力。<br>让每一次实践，都成为自己的经历。</p><div class="auth-journey"><span>选择方向</span><span>制定计划</span><span>每天行动</span><span>积累经历</span></div></div><div class="auth-gulu"><span>'+birdSvg()+'</span><p>我是咕噜。<br><strong>今天，也陪你向前一点。</strong></p></div><small class="auth-story-foot">GROW AT YOUR OWN PACE</small></section><section class="auth-form-side"><div class="auth-card"><span class="tag">前端体验版</span><h2>'+(authStage==='email'?'欢迎来到 GrowPilot':'输入演示验证码')+'</h2><p class="auth-subtitle">'+(authStage==='email'?(authMethod==='email'?'邮箱验证码登录，新用户将创建演示账户。':'手机号验证码登录，新用户将创建演示账户。'):'验证码展示在下方，不会发送真实邮件或短信。')+'</p><div class="auth-methods" role="group" aria-label="登录方式">'+['email','phone'].map(m=>'<button type="button" data-act="auth-method" data-id="'+m+'" aria-pressed="'+(authMethod===m)+'" class="'+(authMethod===m?'active':'')+'">'+(m==='email'?'邮箱登录':'手机号登录')+'</button>').join('')+'</div><form id="login-form">'+(authStage==='email'?(authMethod==='email'?field('email','邮箱地址',authEmail,'email','required maxlength="254" autocomplete="email" placeholder="name@example.com"'):'<div class="phone-number-row">'+select('callingCode','国家／地区',[['+86','中国大陆 +86'],['+852','中国香港 +852'],['+853','中国澳门 +853'],['+886','中国台湾 +886'],['+81','日本 +81'],['+1','美国／加拿大 +1'],['+44','英国 +44']],'+86')+field('phone','手机号','','tel','required inputmode="tel" maxlength="20" autocomplete="tel-national" placeholder="请输入手机号"')+'</div>'):('<div class="auth-email-row"><span>'+esc(authEmail)+'</span>'+button(authMethod==='email'?'修改邮箱':'修改手机号','auth-edit','','small ghost')+'</div><div class="demo-code-note">本次演示验证码 <strong>123456</strong><small>仅用于界面体验 · 10 分钟内有效</small></div>'+field('code','6 位验证码','','text','required inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" placeholder="123456"')+(!existing?field('nickname','怎么称呼你？','','text','required maxlength="20" autocomplete="nickname" placeholder="你的昵称"'):'')))+'<p id="auth-error" class="auth-error" role="alert"></p><button class="button primary auth-submit">'+(authStage==='email'?'获取演示验证码':existing?'登录':'创建账户并进入')+'</button>'+(authStage==='code'?'<button type="button" class="text-button auth-resend" data-act="auth-resend">重新获取验证码</button>':'')+'</form><div class="auth-divider"><span>或直接体验</span></div>'+button('使用演示账户体验 →','auth-demo',A.DEFAULT,'auth-demo')+'<div class="auth-secondary">'+button('从空白账户开始','auth-demo',A.EMPTY,'small ghost')+'</div><p class="auth-disclaimer">这是登录流程的前端示例。账户与资料仅保存在当前浏览器，不会验证邮箱或手机号所有权，也不会实际发送验证码或云端同步。</p></div><small class="auth-footer">GrowPilot · 让成长留下看得见的足迹</small></section></div>';
    rememberForms($('#auth-root'));if(authStage==='code'){const update=()=>{const b=$('[data-act="auth-resend"]');if(!b)return;const left=Math.max(0,Math.ceil((authChallenge.resendAt-Date.now())/1000));b.disabled=left>0;b.textContent=left?'重新获取（'+left+' 秒）':'重新获取验证码';};update();authTimer=setInterval(update,1000);}
    const input=$('#login-form input');input?.focus();
  }
  function enterAccount(id){
    if(!leaveAccount())return;state=C.migrate(A.enter(localStorage,accountDB,id));const a=A.account(accountDB);state.page=a.visited&&state.plans.some(p=>p.status==='adopted')?'today':'goal';a.visited=true;
    coachContext=null;coachQuestion='';pendingRecognition=null;workbenchId='';dailyView='';calendarMode='week';calendarAnchor='';todayFolder='';accumulationTab='library';guluOpen=false;companionMessage='';lastGuluMessage='';jobFilters={};collectionFilters={};collectionMessage='';dbPromise=null;authChallenge=null;authStage='email';clearInterval(authTimer);closeModal();if(state.page==='today')D.arrangeAll(C,state);persist();render();window.scrollTo({top:0,behavior:'instant'});$('#main-content').focus({preventScroll:true});toast('已进入 '+a.nickname+' 的演示账户。');
  }
  function profileModal(){const a=A.account(accountDB);showModal('个人设置',field('nickname','昵称',a.nickname,'text','required maxlength="20"')+select('avatar','头像文字／图案',[[a.avatar,a.avatar],...['咕','林','新','🌱','🐦','✨'].filter(x=>x!==a.avatar).map(x=>[x,x])],a.avatar)+'<div class="field"><span>当前登录方式与账号</span><p>'+esc(A.contact(a))+'</p></div><p class="caption">演示账户资料保存在当前浏览器。</p>','account-profile-form','保存设置');}
  function accountPrefs(){const pref=state.notification||{enabled:true,time:'09:00'};showModal('提醒与咕噜设置','<label class="check-row"><input name="enabled" type="checkbox" '+(pref.enabled?'checked':'')+'>每日提醒我查看今日任务</label>'+field('time','提醒时间',pref.time,'time','required')+'<label class="check-row"><input name="still" type="checkbox" '+(state.companion?.still?'checked':'')+'>减少咕噜动效</label><label class="check-row"><input name="collapsed" type="checkbox" '+(state.companion?.collapsed?'checked':'')+'>将咕噜收成小尺寸</label><p class="caption">提醒为前端展示；关闭网页后不会实际推送。</p>','account-prefs-form','保存设置');}
  function accountSwitch(){if(!leaveAccount())return;showModal('切换演示账户','<p class="caption">各账户的方向、经历和任务分别保存。切换不会清空记录。</p><div class="switch-accounts">'+accountDB.accounts.map(a=>'<div><span class="account-avatar">'+esc(a.avatar)+'</span><span><strong>'+esc(a.nickname)+'</strong><small>'+esc(A.contact(a))+'</small></span>'+(a.id===accountDB.sessionId?'<span class="tag green">当前账户</span>':button('切换','auth-demo',a.id,'small'))+'</div>').join('')+'</div>'+button('使用其他账号登录','account-other','','ghost small'));}
  function scope(){
    if(!state.folders.length)return noFolder();
    return '<div class="scope-bar"><label><span>当前目标方向</span><select data-folder-select aria-label="当前目标文件夹">'+state.folders.map(x=>'<option value="'+esc(x.id)+'" '+(x.id===state.activeFolderId?'selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select></label><span class="caption">该方向 '+jobs().length+' 个岗位 · 共用 '+state.experiences.length+' 条经历</span></div>';
  }
  function render(){
    if(!A.account(accountDB)){cloudCleanup();renderLogin();return;}
    $('#auth-root').hidden=true;$('.app-shell').hidden=false;$('#gulu-root').hidden=false;
    if(state.page==='today'&&state.folders.some(x=>state.plans.some(p=>p.folderId===x.id&&p.status==='adopted')&&(!x.execution||x.execution.createdAt<C.today()))){D.arrangeAll(C,state);persist();}
    cloudCleanup();
    $('#side-nav').innerHTML=pages.map((p,i)=>'<button class="nav-button '+(pageGroup(state.page)===p[0]?'active':'')+'" data-page="'+p[0]+'" '+(pageGroup(state.page)===p[0]?'aria-current="page"':'')+'><span class="nav-number">'+(i+1)+'</span>'+p[1]+'</button>').join('');
    $('#top-label').textContent=(pages.find(p=>p[0]===pageGroup(state.page))?.[1]||'求职工作台')+(pageGroup(state.page)==='goal'?' / '+(state.page==='goal'?'目标岗位':'能力对照'):'');
    renderAccount();
    const content={goal:renderGoal,evidence:renderEvidence,plans:renderPlans,today:renderToday,review:renderReview}[state.page]();
    $('#main-content').innerHTML='<div class="page">'+(pageGroup(state.page)==='goal'?directionTabs():'')+content+'<div class="prototype-note">AI 交互预览 · 本页示例不会调用真实模型或全网搜索。个人资料保存在当前浏览器，所有经历写入均需确认。</div></div>';
    $('.local-note').textContent='前端交互预览 · 示例标注';
    rememberForms($('#main-content'));
    const taskLog=$('#coach-messages');if(taskLog)taskLog.scrollTop=taskLog.scrollHeight;
    updateGulu();
    $('#coach-root').innerHTML='';
    document.body.classList.remove('coach-is-open');
    const cloud=$('[data-requirement-cloud]');if(cloud)cloudCleanup=window.InternPilotCloud.mount(cloud,key=>{const row=C.folderRequirements(state).find(r=>r.key===key);if(row)showModal(row.label+' · '+row.count+' 个岗位提及',sourcesHtml(row));});
  }
  function navigate(page){coachContext=null;coachQuestion='';guluOpen=false;guluMode='daily';companionMessage='';lastGuluMessage='';state.page=page;persist();render();document.body.classList.remove('nav-open');window.scrollTo({top:0,behavior:'instant'});$('#main-content').focus({preventScroll:true});}
  function sourcesHtml(row){
    return '<details class="source-details"><summary>查看 '+row.sources.length+' 条岗位原文依据</summary>'+row.sources.map(src=>'<div class="source-item"><strong>'+esc(src.company)+' · '+esc(src.job)+'</strong><span class="tag '+(src.demo?'amber':'blue')+'">'+(src.demo?'演示岗位':'JD 原文')+'</span>'+(src.level?'<span class="tag">'+esc(src.level)+'</span>':'')+'<blockquote>'+esc(src.quote)+'</blockquote>'+link(src.url,'岗位来源')+'</div>').join('')+'</details>';
  }
  function jobDescription(j){
    const raw=j.rawJD||(j.requirements||[]).map(r=>r.quote||r.label).join('\n');
    return '<details class="job-description"><summary>岗位说明与任职要求</summary><p class="caption">'+esc(j.schedule||'出勤要求见原文')+' · '+esc(C.jobType(j))+'</p><p class="material-raw">'+esc(raw||'来源未提供详细说明，请打开原始岗位核实。')+'</p>'+link(j.sourceUrl,'原始岗位 · '+(j.sourceName||'来源链接'))+(j.publishedAt?'<p class="caption">来源发布日期：'+esc(j.publishedAt)+'</p>':'')+'</details>';
  }
  function recruitmentFilters(scope,values){
    const mode=scope==='collection'?'采集':'筛选',group=T.groups.find(g=>g.name===values.category),cities=[...new Set([...T.options.cities,...C.jobs(state).map(j=>T.city(j))])],districts=[...new Set(C.jobs(state).map(j=>j.district).filter(Boolean))];
    const choice=(key,label,options)=>select(scope+'_'+key,label,[['','不限'],...options.map(v=>[v,v])],values[key]||'').replace('<select ','<select aria-label="'+mode+'：'+label+'" data-recruitment-scope="'+scope+'" data-filter-key="'+key+'" ');
    const query=field(scope+'_query','职位 / 公司关键词',values.query||'','search','data-recruitment-scope="'+scope+'" data-filter-key="query" aria-label="'+mode+'：关键词" placeholder="职位、公司或技能关键词"');
    return '<div class="recruitment-search" data-filter-panel="'+scope+'"><div class="recruitment-fields">'+query+choice('category','职位大类',T.groups.map(g=>g.name))+choice('role','细分岗位',group?group.roles:T.groups.flatMap(g=>g.roles))+choice('city','城市 / 地点',cities)+choice('type','求职类型',T.options.type)+choice('salary','薪资待遇',T.options.salary)+'</div><details class="advanced-filters" '+(['experience','education','industry','companySize','financing','district'].some(k=>values[k])?'open':'')+'><summary>更多条件：经验、学历与公司信息</summary><div class="recruitment-fields">'+choice('experience','工作经验',T.options.experience)+choice('education','学历要求',T.options.education)+choice('industry','公司行业',T.options.industry)+choice('companySize','公司规模',T.options.companySize)+choice('financing','融资阶段',T.options.financing)+choice('district','所在区域',[...districts,'未注明'])+'</div><p class="caption">薪资筛选按人民币月薪 / 日薪分别判断，不混用海外薪资。来源未提供的字段显示“未注明”，选择具体条件时不将其视为满足。</p></details><div class="between"><div class="filter-chips" data-filter-chips="'+scope+'">'+filterChips(values)+'</div>'+button('清空条件','clear-job-filters',scope,'small ghost')+'</div></div>';
  }
  function filterChips(values){return Object.entries(values).filter(([k,v])=>v&&k!=='source').map(([k,v])=>'<span class="tag">'+esc(v)+'</span>').join('')||'<span class="caption">尚未限制条件</span>';}
  function setRecruitmentFilter(el){
    const scope=el.dataset.recruitmentScope,values=scope==='collection'?collectionFilters:jobFilters,key=el.dataset.filterKey;values[key]=el.value;
    if(key==='category'){values.role='';const control=$('[data-recruitment-scope="'+scope+'"][data-filter-key="role"]');const roles=(T.groups.find(g=>g.name===values.category)?.roles||T.groups.flatMap(g=>g.roles));control.innerHTML='<option value="">不限</option>'+roles.map(v=>'<option>'+esc(v)+'</option>').join('');}
    $('[data-filter-chips="'+scope+'"]').innerHTML=filterChips(values);if(scope==='pool')$('#job-results').innerHTML=jobCards();
  }
  function requirementsMap(){
    const list=C.folderRequirements(state),total=jobs().length;if(!total)return empty('文件夹暂无岗位','收藏岗位后，要求词云会自动形成。');
    const batch=window.innerWidth<540?8:window.innerWidth<850?15:24,labelLimit=window.innerWidth<540?8:13;const groups=Math.max(1,Math.ceil(list.length/batch));cloudPage=cloudPage%groups;const display=list.slice(cloudPage*batch,(cloudPage+1)*batch),max=Math.max(1,...list.map(r=>r.count));
    return '<section class="folder-map"><div class="between"><h3>岗位要求地图 · 流动词云</h3><span class="tag">'+list.length+' 项要求</span></div><p class="caption">来自本文件夹全部 '+total+' 个岗位。词大小参考提及数，准确频次见数字；点击词语查看原文。相近要求自动归纳，同一岗位仅计一次。</p>'+(display.length?'<div class="requirements-cloud" data-requirement-cloud role="group" aria-label="可流动的岗位要求词云">'+display.map(r=>'<button class="cloud-word" data-key="'+esc(r.key)+'" data-size="'+Math.round(17+25*Math.sqrt(r.count/max))+'" data-dimension="'+esc(r.dimension)+'" title="'+esc(r.label)+'" aria-label="'+esc(r.label)+'，'+r.count+' 个岗位提及，查看原文">'+esc(r.label.length>labelLimit?r.label.slice(0,labelLimit)+'…':r.label)+'<small>'+r.count+'</small></button>').join('')+'</div><div class="cloud-toolbar"><span class="cloud-controls-note">悬停或键盘聚焦时暂停 · 可随时停止流动</span><div class="row"><button type="button" class="button small" data-cloud-toggle aria-pressed="false">暂停流动</button>'+(groups>1?button('下一组词语（'+(cloudPage+1)+' / '+groups+'）','next-cloud','','small ghost'):'')+'</div></div>':'')+'<details class="cloud-evidence-list"><summary>全部要求、频次与岗位证据</summary>'+list.map(r=>'<div class="requirement-summary"><div class="between"><strong>'+esc(r.label)+'</strong><span class="tag">'+r.count+' / '+total+' 岗</span></div>'+sourcesHtml(r)+'</div>').join('')+'</details><p class="caption subtle-note">当前为规则提取概览；词云展示岗位要求，不代表个人能力评分。</p></section>';
  }
  function renderAcquisitionReport(){return collectionMessage?'<div class="notice" role="status">'+esc(collectionMessage)+'</div>':'';}
  function jobCards(){
    const all=C.filterJobs(C.jobs(state),jobFilters);
    return '<p class="caption">显示 '+all.length+' / '+C.jobs(state).length+' 个岗位</p><div class="grid three">'+all.map(j=>{
      const belongs=state.folders.filter(x=>x.jobIds.includes(j.id));
      return '<article class="card job-card"><div class="card-header"><div><h3>'+esc(j.title)+'</h3><div class="company">'+esc(j.company)+' · '+esc(j.city||'地点未注明')+'</div></div><span class="tag '+(j.demo?'amber':'blue')+'">'+(j.demo?'演示岗位':j.acquisition==='auto'?'自动采集':j.acquisition==='import'?'导入':'手动录入')+'</span></div><div class="row"><span class="tag">'+esc(C.jobCategory(j))+'</span><span class="tag">'+esc(C.jobType(j))+'</span><span class="tag">'+esc(T.role(j))+'</span></div><p class="caption">'+esc(j.experience||'经验未注明')+' · '+esc(j.education||'学历未注明')+(j.salary?' · '+esc(j.salary):'')+'</p>'+jobDescription(j)+(belongs.length?'<p class="caption">已归入：'+esc(belongs.map(x=>x.name).join('、'))+'</p>':'')+'<div class="actions">'+button('收藏到文件夹','collect',j.id,'small primary')+(!j.demo?button('编辑','job',j.id,'small ghost'):'')+'</div></article>';
    }).join('')+'</div>'+(!all.length?empty('没有符合当前筛选的岗位','可以调整分类、地点、岗位类型或搜索词。'):'');
  }
  function renderGoal(){
    const all=C.jobs(state),folder=f();
    return head(1,'发现岗位，选择你的求职方向','体验一键采集与方向收藏；进入对应文件夹后，再开始经历匹配。')+
      '<section aria-label="发现与收藏岗位"><div class="section-head"><div><h2>发现与收藏岗位</h2><p>先选职位大类和细分岗位，再设定地区、求职类型与其他条件。</p></div>'+button('手动输入岗位','job','','small')+'</div><form id="auto-collect-form" class="card collection-panel">'+recruitmentFilters('collection',collectionFilters)+'<div class="actions"><button class="button primary" '+(collectBusy?'disabled':'')+'>'+(collectBusy?'正在自动采集…':'一键采集岗位')+'</button><span class="caption">一键采集流程 · 前端示例</span></div><p class="caption">分类与筛选可操作；点击采集展示示例岗位，未连接实际招聘平台。</p></form>'+renderAcquisitionReport()+
      '<div class="job-filter-panel"><div class="section-head"><h3>筛选已收集岗位</h3>'+select('pool_source','岗位来源',[['','全部来源'],['real','真实岗位'],['auto','自动采集'],['manual','手动输入'],['demo','演示岗位']],jobFilters.source||'').replace('<select ','<select data-pool-source aria-label="筛选：岗位来源" ')+'</div>'+recruitmentFilters('pool',jobFilters)+'</div><div id="job-results">'+jobCards()+'</div><details class="section"><summary>其他导入方式</summary><div class="actions">'+button('导入岗位 JSON','import-jds','','small')+button('读取已有 JD 链接（本机服务）','fetch-jds','','small')+'</div></details></section>'+
      '<section class="section" aria-label="目标文件夹"><div class="section-head"><div><h2>选择目标方向文件夹</h2><p>每个文件夹管理一个方向的岗位、要求与成长计划。</p></div>'+button('+ 新建方向','folder','','small')+'</div>'+
      (state.folders.length?'<div class="folder-tabs" role="group" aria-label="选择方向">'+state.folders.map(x=>'<button class="folder-tab '+(x.id===state.activeFolderId?'active':'')+'" data-act="select-folder" data-id="'+esc(x.id)+'"><span>▱ '+esc(x.name)+'</span><small>'+x.jobIds.length+' 个岗位</small></button>').join('')+'</div><div class="card"><div class="card-header"><div><h2>'+esc(folder.name)+'</h2><p class="caption">'+esc(folder.city||'不限城市')+' · '+jobs().length+' 个已收藏岗位</p></div>'+button('编辑方向','folder',folder.id,'small')+'</div>'+jobs().map(j=>'<div class="folder-job"><div class="between"><strong>'+esc(j.title)+' · '+esc(j.company)+'</strong>'+button('移出并归档','archive',j.id,'small ghost')+'</div>'+jobDescription(j)+'</div>').join('')+(!jobs().length?empty('当前方向还没有岗位','从上方列表收藏岗位到这个文件夹。'):'')+
      ((folder.archivedIds||[]).length?'<details class="section"><summary>已归档岗位</summary>'+(folder.archivedIds||[]).map(id=>{const j=all.find(j=>j.id===id);return j?'<div class="job-row"><strong>'+esc(j.title)+'</strong>'+button('恢复','restore',id,'small')+'</div>':'';}).join('')+'</details>':'')+requirementsMap()+'<div class="actions">'+button('下一步：匹配「'+esc(folder.name)+'」的经历 →','begin-match','','primary')+'</div></div>':empty('还没有方向文件夹','收藏岗位时可以新建方向，也可先点击“新建方向”。'))+'</section>';
  }
  function structuredLibrary(){return '<div class="library-groups">'+C.experienceTypes.map(type=>{const list=state.experiences.filter(e=>C.experienceType(e.type)===type);return '<details class="library-group" '+(list.length?'open':'')+'><summary>'+esc(type)+'<span class="tag">'+list.length+' 条</span></summary>'+experienceCards(list)+'</details>';}).join('')+'</div>';}
  function experienceCards(list){
    return list.length?list.map(e=>'<article class="experience-card"><div class="between"><div><strong>'+esc(e.title)+'</strong><p class="caption">'+esc(e.type)+' '+esc(e.period||'')+'</p></div><span class="tag '+(e.confirmed?'green':'amber')+'">'+(e.confirmed?'本人已核查':'待核查')+'</span></div><p class="preline">'+esc(e.description)+'</p>'+link(e.link,'作品或证明')+((e.sourceOutcomeIds||[]).length?'<p class="caption">关联 '+e.sourceOutcomeIds.length+' 份已确认成果</p>':'')+(e.versions?.length?'<details><summary>修改记录 · '+e.versions.length+' 次</summary>'+e.versions.map(v=>'<div class="source-item"><strong>'+esc(v.date)+' · '+esc(v.title)+'</strong><p class="caption preline">'+esc(v.description)+'</p></div>').join('')+'</details>':'')+'<div class="actions">'+button('核查 / 编辑','experience',e.id,'small')+(e.confirmed?'':button('确认事实无误','confirm-experience',e.id,'small'))+button('移除','remove-experience',e.id,'small ghost danger')+'</div></article>').join(''):empty('经历库还是空的','先上传简历或以文字补充经历。');
  }
  const matchLabels={supported:'材料支撑较充分',partial:'部分匹配',missing:'暂缺支撑证据',unclear:'信息不足'};
  function jdChooser(compact=false){
    if(!f())return '';
    const selected=new Set(C.selectedJobs(state).map(j=>j.id)),list=jobs();
    const body='<div class="section-head"><p class="caption">已收集 '+list.length+' 条 · 本轮选中 '+selected.size+' 条。只汇总和匹配本轮选中的 JD。</p><div class="row">'+button('全选','select-all-jds','','small')+button('清空选择','clear-selected-jds','','small ghost')+'</div></div><div class="jd-choices">'+list.map(j=>'<label class="jd-choice"><input type="checkbox" data-jd-selected="'+esc(j.id)+'" '+(selected.has(j.id)?'checked':'')+'><span><strong>'+esc(j.title)+'</strong><small>'+esc(j.company)+' · '+(j.demo?'演示岗位':j.acquisition==='auto'?'自动采集 · '+(j.sourceName||'公开岗位源'):j.acquisition==='public-page'?'网页正文读取':j.acquisition==='import'?'采集结果导入':'手动录入')+'</small></span></label>').join('')+'</div>';
    return compact?'<details class="card section"><summary>调整本轮参考 JD · '+selected.size+' / '+list.length+' 条</summary>'+body+'</details>':'<div class="jd-selector">'+body+'</div>';
  }
  function renderEvidence(){
    const folder=f(),selected=C.selectedJobs(state);if(!folder)return head(2,'经历与岗位对照','选择方向、上传简历后查看匹配结果。')+scope();
    const groups=G.matchGroups(C,state);
    const proof=r=>'<details class="decision-proof"><summary>查看岗位原文与匹配说明</summary><p>'+esc(r.reason)+'</p>'+sourcesHtml(r)+'<div class="actions">'+button('补充我的经历','match-material',r.key,'small ghost')+button('纠正匹配结果','correct-match',r.key,'small ghost')+'</div></details>';
    return head(2,'我具备哪些能力，还需要提升什么？','根据简历与经历，对照当前方向所选岗位的要求。生成建议后，去成长计划决定是否加入本轮。')+scope()+
      '<div class="analysis-inputs"><div><small>参考岗位</small><strong>'+selected.length+' 个已选岗位</strong><details><summary>查看／调整岗位</summary>'+jdChooser(false)+'</details></div><div><small>个人材料</small><strong>'+state.materials.length+' 份简历 · '+state.experiences.length+' 条经历</strong><details '+(!state.materials.length?'open':'')+'><summary>上传简历／补充材料</summary><form id="resume-form"><label class="field"><span>选择简历文件</span><input name="resume" type="file" accept=".pdf,.docx,.txt,.md,.markdown" required></label><div class="actions"><button class="button small primary">导入简历</button>'+button('粘贴文字','paste-resume','','small ghost')+'</div><p id="resume-progress" role="status"></p></form></details></div><div class="analysis-trigger"><small>先匹配，再查看能力与差距</small>'+button('匹配简历与岗位要求','run-ai','','primary')+'<span class="caption">当前为前端匹配示例</span></div></div>'+
      '<div class="capability-flow"><span class="current">① 查看能力匹配</span><span>② AI 生成求职成长建议</span><span>③ 成长计划中选择是否加入</span></div><div class="capability-columns"><section class="capability-pane owned-pane"><header><span class="capability-icon">✓</span><div><h2>已具备的能力 <small>'+groups.owned.length+' 项</small></h2><p>说明你已经会什么，以及对应的简历或经历依据。</p></div></header><div class="capability-cards">'+(groups.owned.length?groups.owned.map(r=>'<article class="card capability-card owned-card"><div class="between"><h3>'+esc(r.ownedLabel)+'</h3><span class="tag green">'+(r.status==='supported'?'已具备':'已具备基础')+'</span></div><p class="caption">来自：'+esc(r.evidence[0]?.title||'个人材料')+'</p><p class="capability-evidence">'+esc(r.evidence[0]?.quote||r.reason)+'</p>'+proof(r)+'</article>').join(''):empty('等待简历匹配','上传简历或补充经历后，在这里查看已具备的能力。'))+'</div></section>'+
      '<section class="capability-pane gap-pane"><header><span class="capability-icon">↗</span><div><h2>岗位要求中待提升的能力 <small>'+groups.gaps.length+' 项</small></h2><p>展示待提升部分和材料尚未证明的要求；缺少证据不等于你不会。</p></div></header><div class="generate-growth"><p>为下面的 '+groups.gaps.length+' 项能力生成学习与实践建议，送到成长计划待你选择。</p>'+(groups.gaps.length?button('AI 生成求职成长建议','generate','','primary'):'<button class="button" disabled>暂无待提升能力</button>')+'<small>仅生成建议，不会自动加入本轮计划。</small></div><div class="capability-cards">'+(groups.gaps.length?groups.gaps.map(r=>{const linked=currentPlans().find(p=>p.status!=='dismissed'&&(p.requirementKeys||[p.requirementKey]).includes(r.key));return '<article class="card capability-card gap-card"><div class="between"><h3>'+esc(r.label)+'</h3><span class="tag amber">'+(r.status==='partial'?'需要进一步提升':'材料暂未证明')+'</span></div><p class="caption">'+r.count+' 个所选岗位提及 · '+r.must+' 岗列为必备</p><p><strong>需要提升：</strong>'+esc(r.missing?.join('；')||r.reason)+'</p>'+(r.status==='partial'?'<p class="caption">已有基础：'+esc(r.ownedLabel)+'</p>':'')+'<div class="actions">'+button(linked?(linked.status==='suggested'?'查看已生成的求职成长建议':'查看成长计划中的相关任务'):'为这项能力生成建议','prepare-gap',r.key,'small primary')+'</div>'+proof(r)+'</article>';}).join(''):empty('当前没有明确的能力差距','已有材料支撑的能力会显示在左侧。'))+'</div></section></div>'+
      '<p class="caption">已具备基础不代表已经满足全部要求，例如会基础 SQL 查询，仍可能需要提升分组统计。未在简历中体现的能力，可以补充或纠正。</p>'+
      (groups.unknown.length?'<section class="card section"><h2>还需要补充信息的要求 · '+groups.unknown.length+' 项</h2><p class="caption">资料不足时先核对，不直接认定为不具备。</p>'+groups.unknown.map(r=>'<div class="job-row"><strong>'+esc(r.label)+'</strong>'+button('补充我的经历','match-material',r.key,'small')+'</div>').join('')+'</section>':'')+
      '<div class="page-next card"><div><strong>看完能力对照，选择这一轮想做的事</strong><p>成长建议生成后，在下一页决定是否加入本轮计划。</p></div><button class="button primary" data-page="plans">下一步：成长计划 →</button></div><details class="section"><summary>补充与维护个人材料</summary><div class="actions">'+button('新增经历','experience','','small')+'<button class="button small ghost" data-page="review">查看我的经历库 →</button></div></details>';
  }
  function refsHtml(original){
    const row=C.matchResults(state).find(r=>r.key===original.requirementKey)||{key:original.requirementKey,label:original.title,dimension:original.dimension};
    const references=original.retrievalDemo?(original.references||[]):original.origin==='自定义任务'?(original.references||[]):(original.references||[]).filter(r=>C.caseSupports(row,r,f()));
    return '<details class="plan-case-section"><summary>经验分享与案例 · '+(original.retrievalDemo?'检索结果示例':references.length+' 条参考')+'</summary>'+
      (original.retrievalDemo?'<div class="notice preview-note"><strong>全网检索流程示例</strong><p>正式流程将围绕当前方向与缺口搜索公开网页，再核查原文。此处仅演示查询、结果和适用关系，未执行联网检索；示例文章不代表适用于所有方向。</p></div><div class="search-query-list">'+(original.searchQueries||[]).map(q=>'<div><span class="caption">检索词示例</span><p>'+esc(q)+'</p></div>').join('')+'</div>':'')+
      references.map(r=>'<article class="inline-case"><div class="row"><span class="tag">'+esc(r.type||'经验案例')+'</span><span class="caption">'+esc(r.publisher||'本人补充')+'</span></div><strong>'+(safeUrl(r.url)?link(r.url,r.title):esc(r.title))+'</strong><p>'+esc(r.summary)+'</p><p><strong>可借鉴做法：</strong>'+esc(r.lesson||r.summary)+'</p><p><strong>与本条建议的关系：</strong>'+esc(r.application||original.relevance||'需要核查具体适用关系。')+'</p>'+(r.quote?'<blockquote>'+esc(r.quote)+'…</blockquote>':'')+'<p class="caption">'+(r.origin==='preview'||r.origin==='example'?'示例关联 · 未执行本轮搜索或原文读取':r.origin==='web'?'原文读取：'+esc(new Date(r.fetchedAt).toLocaleString('zh-CN')):'本人补充并核查')+'</p><p class="caption">'+esc(r.limitations||'个案只能说明一种做法，不能推断就业效果。')+'</p></article>').join('')+
      (!references.length?'<p class="caption">尚无适用的公开经验依据，请先补充信息或调整做法。</p>':'')+
      '<div class="actions">'+button('查看检索流程示例','refresh-plan-sources',original.id,'small ghost')+button('补充我读过的经验','source',original.id,'small ghost')+'</div></details>';
  }
  function learningHtml(plan){
    const seen=new Set(),materials=(plan.requirementKeys||[plan.requirementKey]).flatMap(key=>C.materialsForPlan({...plan,requirementKey:key})).filter(m=>!seen.has(m.url)&&seen.add(m.url));
    return '<details class="plan-learning"><summary>补充学习材料 · '+materials.length+' 项</summary><p class="caption">按任务需要选择章节；课程用于辅助行动，不等于求职效果的证据。</p>'+(materials.length?materials.map(m=>'<div class="learning-item"><span class="tag">'+esc(m.type)+'</span><strong>'+link(m.url,m.title)+'</strong><p>'+esc(m.useFor)+'</p></div>').join(''):'<p class="caption">正式版本可随建议检索相关材料；当前可在编辑中补充链接。</p>')+'</details>';
  }
  function planCard(p){
    const stale=p.signature&&p.signature!==C.signature(state),labels=p.coveredLabels||[C.matchResults(state).find(r=>r.key===p.requirementKey)?.label||p.title],included=['adopted','completed'].includes(p.status),finished=p.status==='completed';
    return '<article class="card growth-card'+(included?' is-included':'')+'" data-plan-id="'+esc(p.id)+'"><div class="row"><span class="tag '+(included?'green':'pending-plan-tag')+'">'+(finished?'已完成':included?'已加入本轮计划':'未加入本轮计划')+'</span><span class="tag blue">'+esc(p.actionLabel||'自定义准备')+'</span><span class="tag">'+(p.retrievalDemo?'前端示例':'本人设定')+'</span></div><h3>'+esc(p.title)+'</h3><div class="covered-skills">'+labels.map(l=>'<span>'+esc(l)+'</span>').join('')+'</div><p class="growth-reason"><strong>为什么优先做</strong>'+esc(p.reason||p.relevance||'根据当前方向与个人准备需要安排。')+'</p>'+(p.relatedExperienceTitle?'<p class="caption">复用基础：'+esc(p.relatedExperienceTitle)+'</p>':'')+'<div class="growth-delivery"><span><small>预计投入</small><strong>'+p.hours+' 小时</strong></span><span><small>预期成果</small><strong>'+esc(p.output)+'</strong></span></div>'+
      '<details class="growth-details"><summary>查看具体步骤与完成标准</summary><p class="caption preline">'+esc(p.gapSummary||p.relevance||'由本人说明任务与岗位的关系。')+'</p><ol class="steps">'+(p.steps||[]).map(x=>'<li>'+esc(x.text)+'</li>').join('')+'</ol><p class="caption"><strong>完成标准：</strong>'+esc(p.criteria)+'</p>'+(p.sources?.length?sourcesHtml({sources:p.sources}):'')+'</details>'+'<div class="first-step"><small>先做这一步</small><p>'+esc(p.steps?.[0]?.text||p.output)+'</p></div>'+refsHtml(p)+learningHtml(p)+
      (stale?'<p class="notice warn">匹配材料已变化，请重新查看建议。已安排任务与成果会保留。</p>':'')+'<div class="actions">'+(included?'<button type="button" class="button small included-button" disabled>已加入本轮计划 ✓</button>':button('加入本轮计划','adopt',p.id,'primary small'))+button('调整建议','revise-task',p.id,'small ghost')+(p.status==='adopted'?button('取消加入','unadopt',p.id,'small ghost'):finished?'<button class="button small ghost" data-page="review">查看成果 →</button>':'')+'</div></article>';
  }
  function renderPlans(){
    const folder=f();if(!folder)return head(3,'按优先级准备，逐步积累经历','先选择目标方向。')+scope();
    const sc=folder.schedule||C.schedule(),budget=G.capacity(C,state),plans=currentPlans(),rows=C.matchResults(state),gaps=rows.filter(r=>r.status!=='supported');
    const suggestions=plans,included=plans.filter(p=>['adopted','completed'].includes(p.status));
    return head(3,'选择哪些求职成长建议加入本轮计划','这里接收能力对照页生成的建议。所有建议都保留在下方，选择需要的加入本轮计划，加入后可随时取消。')+scope()+
      '<p class="caption preview-caption">各方向执行时共用每天 '+D.sharedBudget(C,state).dailyHours+' 小时，可在今日任务的安排设置中调整。方案与检索依据为前端示例，尚未调用模型或执行全网检索。</p>'+
      '<section class="card effort-card"><div class="section-head"><div><h2>① 我的时间与准备重点</h2><p>时间预算帮助判断能安排多少任务；所有建议都会保留。</p></div><span class="tag">自定 '+sc.days+' 天</span></div><div class="growth-metrics"><div><strong>'+budget.total+'<small>小时</small></strong><span>本轮总投入</span></div><div><strong>'+budget.used+'<small>小时</small></strong><span>已加入本方向</span></div><div><strong>'+budget.free+'<small>小时</small></strong><span>剩余可安排</span></div><div><strong>'+gaps.length+'<small>项</small></strong><span>待补充或待判断</span></div></div>'+(budget.cross?'<p class="caption">已预留同期其他方向的约 '+budget.cross+' 小时；这是按周期重叠比例估算的示例。</p>':'')+
      '<details class="schedule-editor"><summary>调整投入安排 · '+esc(sc.start)+' 至 '+esc(C.endDate(sc))+' · 每天 '+sc.dailyHours+' 小时</summary><form id="schedule-form"><div class="grid three">'+field('start','开始日期',sc.start,'date','required')+field('days','自定准备天数 *',sc.days,'number','min="1" max="730" step="1" data-schedule="days" required aria-describedby="days-help"')+field('dailyHours','每天投入（小时）',sc.dailyHours,'number','min="0.25" max="16" step="0.25" required')+field('end','目标完成日期',C.endDate(sc),'date','data-schedule="end" required')+field('weeks','折合周数',Number((sc.days/7).toFixed(2)),'number','readonly tabindex="-1"')+'</div><p class="caption" id="days-help">准备天数自行填写 1–730 天；修改后更新时间预算，已有任务保留。</p><div class="actions"><button class="button primary small">保存投入安排</button><span id="schedule-summary" class="caption">共 '+sc.days+' 天 · 可投入 '+budget.total+' 小时</span></div></form></details>'+(budget.used+budget.cross>budget.total?'<p class="notice warn">现有任务已超过预算，请调整任务范围或延长准备时间。</p>':'')+'</section>'+
      '<section class="section"><div class="section-head"><div><h2>② 求职成长建议 · 全部 '+suggestions.length+' 项</h2><p>已加入 '+included.length+' 项。点击加入后，卡片留在这里，选中的建议成为任务，显示在今日任务。</p></div><div class="row">'+button('+ 自定义任务','plan','','small')+'<button class="button small" data-page="evidence">返回能力匹配生成建议</button>'+'</div></div>'+(!C.reviewed(state)?'<div class="notice"><p>先选择本轮岗位并补充简历或经历，再查看与当前方向相关的建议。</p><button class="button small" data-page="evidence">前往经历匹配</button></div>':'')+
      (suggestions.length?'<div class="growth-grid">'+suggestions.map(planCard).join('')+'</div>':empty('还没有求职成长建议','前往能力对照，为待提升的能力生成求职成长建议，也可以添加自定义任务。'))+'</section><section class="execution-launch card"><div><h3>选好了，开始这一轮准备</h3><p>已选择 '+plans.filter(p=>p.status==='adopted').length+' 项进行中的计划，预计 '+plans.filter(p=>p.status==='adopted').reduce((n,p)=>n+Number(p.hours||0),0)+' 小时。下一步按优先级与每日投入安排执行。</p></div>'+(plans.some(p=>p.status==='adopted')?button('去执行：安排今日任务 →','arrange-run','','primary'):'<button class="button" disabled>先选择要执行的计划</button>')+'</section>';
  }
  function birdSvg(){return '<svg viewBox="0 0 140 132" role="img" aria-label="圆鼓鼓的小鸟咕噜"><ellipse cx="70" cy="121" rx="34" ry="5" fill="#dce4df"/><path d="M49 111v9m-5 0h10m32-9v9m-5 0h10" stroke="#bf8857" stroke-width="4" stroke-linecap="round"/><g class="bird-body"><path d="M67 23q-8-18 2-15q8 3 8 17q12-18 15-9q1 7-10 13" fill="#9db5bc"/><path d="M26 72C25 34 46 21 72 23c30 0 48 24 45 57q-2 37-44 37Q26 116 26 72" fill="#a9c7cd"/><ellipse cx="72" cy="85" rx="31" ry="29" fill="#eff3e6"/><path class="bird-wing" d="M29 68q-21 16-7 29q14 2 20-20" fill="#86abb6"/><path d="M109 69q20 14 9 28q-12 1-18-20" fill="#86abb6"/><ellipse cx="53" cy="58" rx="4" ry="5" fill="#344b56"/><ellipse cx="87" cy="58" rx="4" ry="5" fill="#344b56"/><circle cx="44" cy="70" r="7" fill="#e7b3ac" opacity=".8"/><circle cx="96" cy="70" r="7" fill="#e7b3ac" opacity=".8"/><path d="m64 67 8 9 8-9q-8-7-16 0" fill="#d6a15e"/><path d="M44 40q6-7 12-5m26 0q8-1 13 6" fill="none" stroke="#cce0df" stroke-width="3" stroke-linecap="round"/></g></svg>';}
  function updateGulu(){
    const pref=state.companion||{},model=GP.context(C,state,state.page),first=pref.greetedDate!==C.today();
    if(first){state.companion={...pref,greetedDate:C.today()};guluOpen=state.notification?.enabled!==false&&!pref.collapsed;guluMode='daily';persist();}
    if(companionMessage&&companionMessage!==lastGuluMessage){guluOpen=true;guluMode='feedback';state.companion={...state.companion,collapsed:false};lastGuluMessage=companionMessage;}
    let view=guluMode==='context'?GP.stage(C,state,state.page):model;
    if(guluMode==='feedback')view={...model,text:companionMessage};
    if(guluMode==='help'){const next=model.daily.next;view={text:next?'这一步卡住了吗？我们可以把它拆小、找相关材料，或按今天的时间重新安排。':'可以先找到一件现在能做的小事；如果今天时间有限，也可以调整安排。',actions:next?[{label:'帮我拆解',act:'gulu-small'},{label:'查看材料',act:'gulu-materials'},{label:'今天做不完',act:'gulu-time'}]:[{label:'从哪里开始',act:'gulu-start'},{label:'查看本轮计划',act:'gulu-page',id:'plans'}]};}
    const focusTarget=state.page==='today'&&coachingTarget();if(focusTarget&&guluMode!=='feedback'){const focused=HC.focus(state,focusTarget.p,focusTarget.step,focusTarget.slot?.minutes||20);view={text:'我们正在做「'+focused.rows[focused.index].title+'」。需要帮助时，可以问我怎么开始，或继续拆小。',detail:focusTarget.p.title,actions:[{label:'继续当前步骤',act:'focus-resume'},{label:'提问当前步骤',act:'coach-gulu'}]};}
    if(focusTarget&&(focusTarget.slot?.done||coachContext.finished)){view={text:'这次任务已完成。可以登记留下的成果，也可以先返回今日清单。',detail:focusTarget.step.text,actions:[{label:'登记这次成果',act:'coach-outcome'},{label:'返回今日清单',act:'gulu-today'}]};}
    const html=(guluOpen&&!state.companion?.collapsed?'<section class="gulu-bubble" role="dialog" aria-label="咕噜的提醒"><div class="gulu-scroll"><header><strong>咕噜 <span>陪你往前一点</span></strong>'+button('×','gulu-close','','gulu-close')+'</header><p class="gulu-speech" role="status">'+esc(view.text)+'</p>'+(view.detail?'<small class="gulu-detail">'+esc(view.detail)+'</small>':'')+'<div class="gulu-actions">'+(view.actions||[]).filter(a=>a.act!=='gulu-context').map((a,i)=>button(esc(a.label),a.act,a.id||'','small '+(i?'ghost':'primary'))).join('')+'</div><div class="gulu-shortcuts">'+button('今日任务','gulu-today','','tiny ghost')+button('这页下一步','gulu-context','','tiny ghost')+button(coachContext?'提问当前步骤':'继续今日任务',coachContext?'coach-gulu':'gulu-start','','tiny ghost')+'</div><details class="gulu-settings"><summary>陪伴设置</summary><div>'+button(state.companion?.still?'开启动效':'减少动效','bird-motion','','tiny ghost')+button('回到默认位置','gulu-reset','','tiny ghost')+button('暂时收起','gulu-collapse','','tiny ghost')+'</div><small>拖动小鸟可移动；聚焦后也可按方向键移动。<br>当前提醒与拆解为前端示例。</small></details></div></section>':'')+'<button type="button" class="gulu-avatar" aria-label="'+(state.companion?.collapsed?'展开咕噜':'咕噜：点击查看提醒，按方向键移动')+'" aria-expanded="'+!!guluOpen+'">'+birdSvg()+'<span>咕噜</span></button>';
    guluWidget.update(html);
  }
  function guluNext(){return GP.summary(C,state).next;}
  function ensureGuluFolder(folderId){state.activeFolderId=folderId;const folder=f();if(!folder.execution||folder.execution.createdAt<C.today()||folder.execution.signature!==D.signature(C,state))D.arrangeAll(C,state);persist();}
  function guluStart(){
    let next=guluNext();if(!next){const unarranged=GP.summary(C,state).unarranged;if(unarranged){ensureGuluFolder(unarranged.id);next=guluNext();}}
    if(next){ensureGuluFolder(next.folderId);next=guluNext();dailyView=C.today();navigate('today');const el=next&&$$('[data-daily-id]').find(el=>el.dataset.dailyId===next.id);if(el){el.scrollIntoView({block:'center',behavior:'smooth'});el.classList.add('gulu-task-focus');el.setAttribute('tabindex','-1');el.focus({preventScroll:true});}if(next)openCoach(next.planId,next.stepId,next.id);return;}
    navigate('today');
  }
  function coachingTarget(){if(!coachContext)return null;try{const target=HC.locate(state,coachContext.planId,coachContext.stepId),folder=state.folders.find(x=>x.id===target.p.folderId),slot=folder?.execution?.items.find(x=>x.id===coachContext.slotId);return {...target,folder,slot,thread:HC.thread(state,target.p,target.step)};}catch{return null;}}
  function openCoach(planId,stepId='',slotId='',tab='guide',decompose=false){
    const p=planById(planId);if(!p)throw Error('请先选择一项本轮计划。');const folder=state.folders.find(x=>x.id===p.folderId),slot=slotId?folder?.execution?.items.find(x=>x.id===slotId):folder?.execution?.items.find(x=>x.planId===p.id&&x.date===C.today()&&!x.done),step=p.steps.find(x=>x.id===(stepId||slot?.stepId))||p.steps.find(x=>!x.done)||p.steps[0];if(!step)throw Error('这项计划还没有步骤，请先补充。');
    if(coachContext&&(coachContext.planId!==p.id||coachContext.stepId!==step.id))coachQuestion='';
    state.page='today';state.activeFolderId=p.folderId;coachContext={planId:p.id,stepId:step.id,slotId:slot?.stepId===step.id?slot.id:'',tab,help:tab==='chat'};state.coachLast={planId:p.id,stepId:step.id};guluOpen=false;companionMessage='';lastGuluMessage='';if(decompose&&!HC.thread(state,p,step)?.draft&&!HC.thread(state,p,step)?.accepted)HC.generate(state,p,step,slot?.minutes||20);persist();renderCoach();window.scrollTo({top:0,behavior:'instant'});$('#main-content').focus({preventScroll:true});
  }
  function openDailyCoach(id,tab='guide',decompose=false){const folder=state.folders.find(f=>f.execution?.items.some(x=>x.id===id)),slot=folder?.execution?.items.find(x=>x.id===id);if(!slot)throw Error('今日安排已更新，请重新选择行动。');openCoach(slot.planId,slot.stepId,slot.id,tab,decompose);}
  function focusQuestion(){guluOpen=false;updateGulu();$('#coach-question-form textarea')?.focus({preventScroll:true});}
  function openGuluCoach(tab='chat',decompose=false){if(coachContext){focusQuestion();return;}const next=guluNext();if(next){openCoach(next.planId,next.stepId,next.id,tab,decompose);focusQuestion();return;}if(state.coachLast&&planById(state.coachLast.planId)){openCoach(state.coachLast.planId,state.coachLast.stepId,'',tab,decompose);focusQuestion();return;}const p=currentPlans().find(p=>p.status==='adopted');if(p){openCoach(p.id,'','',tab,decompose);focusQuestion();return;}navigate('plans');toast('先选择一项本轮任务，再开始准备。');}
  function renderCoach(){render();}
  function taskMaterials(p){const seen=new Set();return (p.requirementKeys||[p.requirementKey]).flatMap(key=>C.materialsForPlan({...p,requirementKey:key})).concat(p.learningLinks||[]).filter(m=>safeUrl(m.url)&&!seen.has(m.url)&&seen.add(m.url));}
  function taskDraftHtml(t){const draft=t.thread?.draft;if(!draft)return '';return '<section class="inline-breakdown" aria-label="拆解建议"><div class="between"><strong>把这一步拆得更小</strong><small>可直接修改 · 前端示例</small></div><form id="coach-accept-form">'+draft.steps.map((r,i)=>'<div class="inline-micro-edit"><span>'+String(i+1).padStart(2,'0')+'</span><div>'+field('title-'+i,'小步骤 '+(i+1)+' 名称',r.title,'text','required maxlength="200"')+area('method-'+i,'小步骤 '+(i+1)+' 做法',r.method,'required rows="2"')+'</div><small>'+r.minutes+' 分钟</small></div>').join('')+'<div class="actions"><button class="button primary small">采用这些步骤</button>'+button('保留原步骤','coach-discard','','small ghost')+'</div><p class="quiet-note">确认后更新当前任务的小步骤，每日总时间不增加。</p></form></section>';}
  function taskMessagesHtml(t){return (t.thread?.messages||[]).map(m=>'<div class="inline-message '+(m.role==='user'?'from-user':'from-gulu')+'"><p>'+esc(m.text)+'</p></div>').join('');}
  function refreshTaskHelp(){const t=coachingTarget();if(!t)return;const log=$('#coach-messages');if(log){log.innerHTML=taskMessagesHtml(t);log.scrollTop=log.scrollHeight;}const draft=$('#task-breakdown');if(draft){draft.innerHTML=taskDraftHtml(t);rememberForms(draft);}const input=$('#coach-question-form textarea');if(input){input.value=coachQuestion;input.style.height='auto';formSnapshots.set(input.form,snapshotForm(input.form));}updateGulu();}
  function askCurrentTask(question){const t=coachingTarget();if(!t)throw Error('请先打开一项任务。');const focused=HC.focus(state,t.p,t.step,t.slot?.minutes||20);if(t.thread&&focused.accepted)t.thread.focusMicroId=focused.rows[focused.index].id;HC.ask(state,t.p,t.step,question);coachQuestion='';persist();refreshTaskHelp();}
  function renderFocusTask(){
    const t=coachingTarget();if(!t){coachContext=null;return renderToday();}const {p,step,slot,thread}=t,model=HC.guidance(state,p,step,slot?.minutes||20),row=model.row,finished=slot?.done||coachContext.finished||(!slot&&step.done),ready=model.done&&!finished,day=slot?.date||C.today(),tasks=CAL.entries(state,todayFolder).filter(x=>x.date===day&&!x.done),materials=taskMaterials(p),rank=D.rank(C,{...state,activeFolderId:p.folderId},t.folder?.execution?.manualOrder||[]).plans.find(x=>x.id===p.id);
    const top='<div class="task-breadcrumb"><span>今日任务 / '+(finished?'已完成':'正在进行')+'</span>'+button('返回今日清单','coach-close','','small ghost')+'</div><header class="task-execution-heading"><h1>'+(finished?'又向前走了一步':'今天，先把这一件做好')+'</h1><p>'+esc(day)+' · '+esc(t.folder?.name||'当前方向')+'</p></header>';
    const rail=tasks.length?'<div class="today-task-rail" aria-label="当天任务">'+tasks.map((x,i)=>'<button data-act="coach-daily" data-id="'+esc(x.id)+'" class="'+(x.id===slot?.id?'selected':'')+'" '+(x.id===slot?.id?'aria-current="step"':'')+'><span>'+String(i+1).padStart(2,'0')+'</span><strong>'+esc(x.text)+'</strong><small>'+x.minutes+' 分钟</small></button>').join('')+'</div>':'';
    if(finished)return '<div class="task-focus">'+top+'<section class="focus-done"><span class="focus-done-icon">✓</span><h2>'+esc(step.text)+'</h2><p>已经保存这次推进记录。成果形式不限，可以登记文字、链接或文件。</p><div class="actions">'+button('登记这次成果','coach-outcome','','primary')+button('返回今日清单','coach-close','','ghost')+'</div></section></div>';
    const help='<aside class="task-ai-sidebar" aria-label="AI 任务助手"><header class="ai-sidebar-header"><div><strong>咕噜 · AI 任务助手</strong><span>围绕当前目标，随时提问</span></div><span class="ai-example-badge">示例</span></header><div class="ai-current-context"><span>当前目标</span><p>'+esc(row.title)+'</p></div><div id="coach-messages" class="inline-conversation" role="log" aria-label="当前步骤的对话" aria-live="polite">'+taskMessagesHtml(t)+'</div><div class="ai-composer"><form id="coach-question-form" class="inline-question"><label class="sr-only" for="task-question">提问当前这一步</label><textarea id="task-question" name="question" rows="2" required maxlength="2000" placeholder="针对这个目标，问点什么…">'+esc(coachQuestion)+'</textarea><button type="submit" aria-label="发送问题" title="发送问题">↑</button></form><div class="inline-shortcuts" aria-label="提问示例">'+button('给我一个例子','coach-question','给我一个例子','small ghost')+button('没有材料怎么办？','coach-question','没有材料怎么办？','small ghost')+button('拆成更小步骤','coach-generate','','small ghost')+'</div><p class="quiet-note">前端 AI 对话示例 · Enter 发送，Shift+Enter 换行</p></div></aside>';
    const work='<article class="execution-surface"><div class="execution-meta"><span class="direction-tag">'+esc(t.folder?.name||'当前方向')+'</span><span>第 '+(model.index+1)+' / '+model.rows.length+' 步 · 预计 '+(model.accepted?row.minutes:slot?.minutes||20)+' 分钟</span></div><h2>'+esc(row.title)+'</h2>'+(model.stale?'<p class="notice warn">原任务已变化。当前显示最新做法，可重新拆解后确认。</p>':'')+'<section class="direct-guidance"><h3>具体做法</h3><ol>'+model.instructions.map(text=>'<li>'+esc(text)+'</li>').join('')+'</ol></section><div class="execution-output"><strong>本步成果</strong><p>'+esc(row.output)+'</p></div><p class="execution-criterion"><strong>完成标准：</strong>'+esc(row.criteria)+'</p><p class="execution-materials"><strong>需要准备：</strong>'+esc(row.materials)+'</p>'+(materials.length?'<div class="inline-material-links"><span>学习材料</span>'+materials.map(m=>link(m.url,m.title)).join('')+'</div>':'')+'<footer class="execution-footer"><div class="actions">'+(ready?button('确认完成本次任务','coach-finish','','primary'):button(model.accepted?(model.index===model.rows.length-1?'完成最后一步':'完成第 '+(model.index+1)+' 步，继续下一步'):'完成这一步',model.accepted?'focus-micro-next':'coach-finish',model.accepted?String(model.index):'','primary'))+button('登记阶段成果','coach-outcome','','ghost')+(thread?.canUndo?button('撤销本次拆解','coach-undo','','small ghost'):'')+'</div><small>进度自动保存</small></footer>'+(ready?'<p class="quiet-note">所有小步骤已完成，确认后记录本次任务完成；整个成长任务保持独立。</p>':'')+'<div id="task-breakdown">'+taskDraftHtml(t)+'</div></article>';
    const progress=model.accepted?'<section class="task-step-progress" aria-label="当前任务的小步骤进度"><div class="step-progress-heading"><div><h3>完成这项任务，需要这 '+model.rows.length+' 步</h3><p>'+(ready?'所有小步骤已完成，请在下方确认本次任务。':'正在做第 '+(model.index+1)+' 步：'+esc(row.title))+'</p></div><strong>'+model.completed+'<span> / '+model.rows.length+' 已完成</span></strong></div><div class="step-progress-track" role="progressbar" aria-label="小步骤完成进度" aria-valuemin="0" aria-valuemax="'+model.rows.length+'" aria-valuenow="'+model.completed+'"><span style="width:'+Math.round(model.completed/model.rows.length*100)+'%"></span></div><ol>'+model.rows.map((r,i)=>'<li class="'+(r.done?'done':i===model.index?'current':'upcoming')+'"><span class="step-state-number">'+(r.done?'✓':i+1)+'</span><div><strong>'+esc(r.title)+'</strong><small>'+(r.done?'已完成':i===model.index?'正在进行 · 下方显示本步做法':'接下来')+'</small></div>'+(r.done?button('撤销','coach-micro',String(i),'tiny ghost'):'')+'</li>').join('')+'</ol><p class="step-progress-note">点击下方完成按钮，会更新这里的进度，并切换到下一步做法。</p></section>':'';
    const source='<section class="task-source-line"><p><strong>所属任务：</strong>'+esc(p.title)+'</p><p><strong>安排依据：</strong>'+esc(rank?.priorityReasons.join('；')||'本人选择的本轮成长任务')+'</p><div class="task-source-controls"><label>当前阶段<select aria-label="当前任务阶段" data-coach-step>'+p.steps.map(x=>'<option value="'+esc(x.id)+'" '+(x.id===step.id?'selected':'')+'>'+esc(x.text)+'</option>').join('')+'</select></label>'+button('今天时间有变','focus-time','','small ghost')+'</div><p class="quiet-note">可以去其他工具完成实际工作，再回来继续；关闭页面也会保留已保存进度。</p></section>';
    return '<div class="task-focus split-task-focus">'+'<div class="task-split-layout"><div class="task-goal-column">'+top+rail+work.replace('<section class="direct-guidance">',progress+'<section class="direct-guidance">')+source+'</div>'+help+'</div></div>';
  }
  function reminderModal(){accountPrefs();}
  function dailyTimeModal(){const sc=D.sharedBudget(C,state);showModal('今天时间有变','<p>调整所有方向今天剩余的总时间，已完成记录与成果保留。</p>'+field('minutes','今天还能投入几分钟？',sc.date===C.today()?sc.todayMinutes??sc.dailyHours*60:sc.dailyHours*60,'number','min="0" max="'+Math.max(0,sc.dailyHours*60-sc.doneMinutes)+'" step="1" required')+'<p class="caption">填 0 将剩余任务顺延；预留约 15% 时间余量。</p>','daily-time-form','重新安排');}
  function dailyBudgetModal(){const sc=D.sharedBudget(C,state);showModal('每天总投入时间','<p>所有方向共用这份时间预算。方向中的准备周期仍分别保留。</p>'+field('dailyHours','每天总投入（小时）',sc.dailyHours,'number','min="0.25" max="16" step="0.25" required'),'daily-budget-form','保存并重新安排');}
  function renderCalendar(){
    const day=dailyView||C.today(),anchor=calendarAnchor||day,model=CAL.view(state,{anchor,today:C.today(),selected:day,mode:calendarMode,folderId:todayFolder}),weekdays=['周一','周二','周三','周四','周五','周六','周日'],title=calendarMode==='month'?model.month.replace('-',' 年 ')+' 月':model.start.slice(5).replace('-','月')+'日 — '+model.end.slice(5).replace('-','月')+'日';
    return '<section class="task-calendar" aria-label="任务日历"><header class="calendar-heading"><div><h2>任务日历</h2><p>查看整轮任务分布，点击日期切换上方清单，点击任务开始执行。</p></div><div class="calendar-view-switch" role="group" aria-label="日历视图">'+['week','month'].map(mode=>'<button data-act="calendar-mode" data-id="'+mode+'" aria-pressed="'+(calendarMode===mode)+'" class="'+(calendarMode===mode?'selected':'')+'">'+(mode==='week'?'周视图':'月视图')+'</button>').join('')+'</div></header><div class="calendar-toolbar"><div class="row">'+button('‹','calendar-prev','','small ghost').replace('<button ','<button aria-label="上一'+(calendarMode==='week'?'周':'月')+'" ')+'<strong aria-live="polite">'+title+'</strong>'+button('›','calendar-next','','small ghost').replace('<button ','<button aria-label="下一'+(calendarMode==='week'?'周':'月')+'" ')+'</div>'+button('回到今天','calendar-today','','small ghost')+'</div><div class="calendar-scroll"><div class="calendar-grid '+calendarMode+'">'+weekdays.map(w=>'<div class="calendar-weekday">'+w+'</div>').join('')+model.days.map(d=>{return '<div class="calendar-day '+(d.selected?'selected ':'')+(d.today?'is-today ':'')+(!d.inMonth&&calendarMode==='month'?'outside':'')+'"><button class="calendar-date" data-act="calendar-date" data-id="'+d.date+'" aria-label="查看 '+d.date+' 的任务，'+d.items.length+' 项，共 '+d.minutes+' 分钟" aria-pressed="'+d.selected+'"><span>'+Number(d.date.slice(-2))+'</span><small>'+(d.today?'今天':d.minutes?d.minutes+' 分钟':'')+'</small></button><div class="calendar-day-tasks">'+d.items.map(x=>'<button class="calendar-task '+(x.done?'done':'pending')+' folder-color-'+(state.folders.findIndex(f=>f.id===x.folderId)%5)+'" data-act="coach-daily" data-id="'+esc(x.id)+'" aria-label="'+esc(x.text)+'，'+esc(x.folderName)+'，'+x.minutes+' 分钟，'+(x.done?'已完成':'待完成')+'"><span>'+(x.done?'✓ ':'')+esc(x.text)+'</span><small>'+esc(x.folderName)+' · '+x.minutes+' 分钟</small></button>').join('')+(!d.items.length?'<span class="calendar-empty">无安排</span>':'')+'</div></div>';}).join('')+'</div></div><div class="calendar-legend"><span><i></i>待完成</span><span><i class="done"></i>已完成</span><small>上方清单：'+esc(day)+' · 按日期安排，未设定开始时刻</small></div></section>';
  }
  function renderToday(){
    if(coachContext)return renderFocusTask();
    const active=state.plans.filter(p=>p.status==='adopted'),folderList=state.folders.filter(f=>active.some(p=>p.folderId===f.id)),day=dailyView||C.today(),all=CAL.entries(state,todayFolder),items=all.filter(x=>x.date===day),pending=items.filter(x=>!x.done),done=items.filter(x=>x.done),minutes=pending.reduce((n,x)=>n+x.minutes,0),stale=folderList.some(f=>f.execution&&f.execution.signature!==D.signature(C,{...state,activeFolderId:f.id})),budget=D.sharedBudget(C,state),overflow=folderList.reduce((n,f)=>n+(f.execution?.overflow||[]).reduce((m,x)=>m+x.minutes,0),0),ranked=folderList.flatMap(f=>D.rank(C,{...state,activeFolderId:f.id},f.execution?.manualOrder||[]).plans);
    const sample=pending[0],samplePlan=sample&&planById(sample.planId),sampleStep=samplePlan?.steps.find(x=>x.id===sample.stepId),sampleGuide=sampleStep&&HC.outline(samplePlan,sampleStep,sample.minutes);
    const example=sampleGuide?'以当前任务为例：'+sampleGuide.map(r=>r.title).join(' → ')+' · 约 '+sample.minutes+' 分钟':'任务示例：整理反馈 → 归纳问题 → 保存清单。实际安排将来自你加入本轮的成长任务。';
    return '<div class="simple-today"><header class="simple-today-heading"><div><div class="eyebrow">'+esc(day)+'</div><h1>'+esc(day===C.today()?'今日任务':day===D.add(C.today(),1)?'明日任务':day.slice(5).replace('-','月')+'日的任务')+'</h1><p>'+pending.length+' 项待做 · 约 '+minutes+' 分钟</p></div>'+button('时间与提醒设置','today-settings','','small ghost')+'</header><div class="today-introduction"><p>根据本轮任务、岗位要求的优先顺序和每天可投入的时间，为你安排当天行动。点击“开始”，直接查看做法并推进。</p><div class="today-example"><span>任务说明示例</span><p>'+esc(example)+'</p></div></div><div class="today-view-controls"><label>查看方向<select data-today-folder aria-label="筛选任务方向"><option value="">全部方向</option>'+state.folders.map(f=>'<option value="'+esc(f.id)+'" '+(f.id===todayFolder?'selected':'')+'>'+esc(f.name)+'</option>').join('')+'</select></label><label>查看日期<input type="date" value="'+day+'" data-daily-date aria-label="查看任务日期"></label><span>各方向共用每天 '+budget.dailyHours+' 小时</span></div>'+
      (!active.length?'<div class="empty"><strong>先选一件想做的事</strong><p>到成长计划中，选择建议加入本轮计划。</p><button class="button primary" data-page="plans">去选择成长计划 →</button></div>':'')+
      (stale?'<div class="notice warn">计划或时间已变化，已完成记录保留。'+button('更新安排','arrange-run','','small')+'</div>':'')+
      '<section class="today-list-section" aria-label="当天任务清单"><div class="section-head"><h2>'+(day===C.today()?'今天要做':day.slice(5).replace('-','月')+'日要做')+'</h2><span class="caption">按推荐顺序推进 · 可随时登记阶段成果</span></div><div class="simple-task-list">'+pending.map((x,i)=>{const p=planById(x.planId),step=p.steps.find(s=>s.id===x.stepId),thread=step&&HC.thread(state,p,step),guide=step&&HC.guidance(state,p,step,x.minutes).row;return '<article class="simple-task-row" data-daily-id="'+esc(x.id)+'"><span class="simple-task-number">'+String(i+1).padStart(2,'0')+'</span><div><div class="today-task-meta"><span class="direction-tag">'+esc(x.folderName)+'</span><small>'+x.minutes+' 分钟</small></div><h3>'+esc(x.text)+'</h3><p>'+esc(guide?.method||p.steps[0]?.text||p.output)+'</p><p class="today-task-output"><strong>留下的成果</strong>'+esc(guide?.output||p.output)+'</p></div>'+button(thread?.accepted||thread?.messages?.length?'继续':'开始','coach-daily',x.id,'small '+(i?'':'primary'))+'</article>';}).join('')+'</div>'+
      (!pending.length&&(active.length||done.length)?'<div class="today-clear"><span>✓</span><h3>'+esc(done.length?'这一天的安排已完成':'这一天没有待做任务')+'</h3><p>'+esc(done.length?'可以登记成果，也可以先休息一下。':'下方日历可查看其他日期。')+'</p>'+(done.length?button('登记这次成果','outcome',done.at(-1).planId,'primary small'):'')+'</div>':'')+'</section>'+
      (done.length?'<section class="direct-completed"><h2>已完成 · '+done.length+' 项</h2>'+done.map(x=>'<div><span>✓ '+esc(x.text)+'<small>'+esc(x.folderName)+' · '+x.minutes+' 分钟</small></span><div class="row">'+button('查看','coach-daily',x.id,'tiny ghost')+(x.planStatus==='adopted'?button('撤销完成','daily-undo',x.id,'tiny ghost'):'')+'</div></div>').join('')+'</section>':'')+
      renderCalendar()+(overflow?'<p class="notice warn">还有 '+overflow+' 分钟未排进准备周期，请延长周期或缩小任务范围。</p>':'')+
      '<section class="round-task-overview"><div class="section-head"><h2>本轮成长任务 · '+ranked.length+' 项</h2><button class="button small ghost" data-page="plans">调整本轮计划 →</button></div><p class="caption">排序参考必备要求、岗位提及频次、能力差距、已有基础及前置步骤。当前为规则示例。</p>'+folderList.map(f=>{const list=D.rank(C,{...state,activeFolderId:f.id},f.execution?.manualOrder||[]).plans;return '<div class="round-direction"><h3>'+esc(f.name)+'</h3>'+list.map((p,i)=>'<article><div class="round-task-index">'+String(i+1).padStart(2,'0')+'</div><div class="round-task-text"><h4>'+esc(p.title)+'</h4><p>'+esc(p.priorityReasons.join('；'))+'</p><small>'+p.steps.filter(x=>x.done).length+'/'+p.steps.length+' 阶段完成 · 最终交付：'+esc(p.output)+'</small></div><div class="round-task-actions">'+button('查看步骤','coach-plan',p.id,'small ghost')+button('管理','manage-task',p.id,'small ghost')+(i?button('↑','daily-up',p.id,'tiny ghost'):'')+(i<list.length-1?button('↓','daily-down',p.id,'tiny ghost'):'')+'</div></article>').join('')+'</div>';}).join('')+(ranked.length?button('恢复推荐顺序','reset-daily-order','','small ghost'):'')+'</section></div>';
  }
  function attachmentsHtml(outcome){
    return (outcome.links||[]).map(l=>'<div class="artifact-link">↗ '+link(l.url,l.label||l.url)+'</div>').join('')+
      (outcome.attachments||[]).map(a=>'<div class="artifact-file"><div><strong>'+esc(a.name)+'</strong><span class="caption"> · '+Math.ceil(a.size/1024)+' KB</span></div><div class="row">'+button('打开','open-file',a.id,'small')+button('下载','download-file',a.id,'small ghost')+'</div></div>').join('');
  }
  function fillFormExample(id){
    const form=document.getElementById(id);if(!form)return;
    const samples={
      'job-form':{title:'AI 产品运营实习生（示例）',company:'示例企业',city:'上海',jobType:'实习',jobCategory:'运营',role:'AI 产品运营',rawJD:'整理用户访谈与需求反馈；使用 SQL 统计功能使用数据；了解 AI 工具并参与效果评测。',requirements:''},
      'paste-resume-form':{title:'简历文字（示例）',raw:'课程经历\nSQL 基础查询练习（示例）\n在课程中使用 SELECT 和 WHERE 查询示例数据，保存查询语句；尚未开展完整业务分析。'},
      'experience-form':{title:'课程用户研究（示例）',type:'课程经历',description:'在课程中整理用户问卷，使用表格归纳反馈并记录个人负责的步骤。结论仅用于课程练习。'},
      'feedback-form':{title:'复盘：需要记录个人贡献（示例）',note:'目前成果展示了报告，但还没有清楚区分团队工作与本人负责的部分。',next:'补充本人实际负责的分析步骤与输出。'},
      'folder-form':{name:'AI 教育产品方向（示例）',city:'武汉'},
      'source-form':{title:'已有工作与作品积累经验（示例关联）',url:'https://grow.google/intl/en_au/article-michelle-zhou/',summary:'示例展示如何保存读过的经验资料。请实际阅读后核查。',lesson:'从已有情境积累小项目，保留过程和个人行动。',application:'可借鉴记录实际行动的方法，不能据此推断求职结果。'},
      'plan-form':{title:'整理一份个人实践说明（示例）',hours:'2',output:'一页个人行动与成果说明',criteria:'清楚说明实际负责的工作和可核查产出。',steps:'列出本人负责的工作\n关联原始材料\n核查描述与成果是否一致',reason:'补足已有经历中的表达与证明。',relevance:'让岗位匹配能够回到实际行动。'}
    };
    for(const [key,value] of Object.entries(samples[id]||{}))if(form.elements[key])form.elements[key].value=value;
    toast('已填入示例，可继续修改；尚未保存。');
  }
  function readBankFields(){const form=$('#bank-confirm-form');if(!form||!pendingRecognition)return;for(const key of ['title','type','description','period','link'])pendingRecognition[key]=form.elements[key].value;}
  function renderBankWorkspace(o){
    if(!pendingRecognition||pendingRecognition.sourceOutcomeId!==o.id||pendingRecognition.snapshot!==W.snapshot(o))pendingRecognition=W.draft(C,state,o.id);
    const d=pendingRecognition,linked=state.experiences.find(e=>(e.sourceOutcomeIds||[e.sourceOutcomeId]).includes(o.id)),related=expById(d.relatedId),update=!!related;
    const description=linked?related.description:update?related.description+'\n\n补充成果：\n'+d.description:d.description;
    return '<section id="experience-workbench" class="section experience-workbench"><div class="section-head"><div><div class="eyebrow">成果 → 经历</div><h2>这份成果，可以这样写进经历库</h2><p>核对下方整理结果，修改不准确的地方，再确认保存。</p></div><span class="tag blue">'+(linked?'已有关联经历':'待确认，不会自动保存')+'</span></div><div class="workbench-grid"><section class="workbench-source"><h3>你提供的内容</h3><span class="tag">'+esc(o.title||'任务成果')+'</span><h4>成果描述</h4><p class="preline">'+esc(o.description)+'</p>'+(o.text?'<h4>文字成果 · 可用于整理</h4><div class="source-text preline">'+esc(o.text)+'</div>':'')+attachmentsHtml(o)+'<div class="read-status"><strong>材料读取状态</strong><p>✓ 成果描述与文字：已提供</p><p>↗ 链接：'+(o.links?.length?'已提供，未读取网页内容':'未添加')+'</p><p>↥ 文件：'+(o.attachments?.length?'已保存，本轮未解析附件':'未添加')+'</p></div>'+(o.process||o.method||o.reflection?'<details><summary>用户自愿补充的过程与想法</summary><p class="preline">'+esc([o.process,o.method,o.reflection].filter(Boolean).join('\n'))+'</p></details>':'<p class="caption">未填写过程与想法，不影响成果登记或整理。</p>')+'</section><section class="workbench-result"><div class="between"><h3>待保存的经历</h3><span class="tag">前端示例 · 未调用模型</span></div><form id="bank-confirm-form">'+hidden('outcomeId',o.id)+'<fieldset class="bank-mode"><legend>'+(related?'发现可能相关的经历，请选择保存方式':'保存方式')+'</legend><label><input type="radio" name="mode" value="new" '+(!update?'checked':'')+' '+(linked?'disabled':'')+'> 新增经历</label><label><input type="radio" name="mode" value="update" '+(update?'checked':'')+'> 补充已有经历</label></fieldset>'+'<div class="bank-target" '+(!update?'hidden':'')+'>'+select('targetId','补充到哪条经历',[['','请选择'],...state.experiences.map(e=>[e.id,e.title])],related?.id||'')+'</div>'+(related?'<details class="existing-experience"><summary>查看已有内容，与新增成果对照</summary><p class="preline">'+esc(related.description)+'</p></details>':'')+(related&&!linked&&/尚未|未做|没有/.test(related.description)?'<p class="notice warn">旧经历含有“尚未完成”等阶段性表述，可能与新成果不一致。请在下方核对并更新，保留真实事实。</p>':'')+field('title','经历名称 *',update?related.title:d.title,'text','required')+select('type','经历分类 *',C.experienceTypes.map(x=>[x,x]),update?related.type:d.type)+area('description','经历内容（可以直接修改） *',description,'required rows="9"')+'<div class="field-row">'+field('period','经历时间（选填）',update?related.period||'':d.period||'')+field('link','证明链接（选填）',update?related.link||d.link||'':d.link||'','url')+'</div><details><summary>整理依据与待补充信息</summary><p>整理结果来自左侧成果描述。内容没有写清时，可以先直接修改；文件与链接尚未解析，不会补写其中的事实。</p></details><label class="check-row section"><input type="checkbox" name="confirmed" required><span>我已核查内容与分类，确认保存到经历库</span></label><div class="actions"><button class="button primary">'+(linked?'确认更新这条经历':'确认保存到经历库')+'</button></div></form></section></div></section>';
  }
  function renderReview(){
    const chosen=state.outcomes.find(o=>o.id===workbenchId&&o.description?.trim());if(chosen)accumulationTab='outcomes';
    const tabs=[['library','经历库',state.experiences.length],['outcomes','任务成果',state.outcomes.length],['notes','信息与复盘',state.feedback.length]];
    const nav='<div class="section-tabs" aria-label="我的积累分类">'+tabs.map(([key,label,n])=>'<button data-act="accumulation-tab" data-id="'+key+'" class="'+(accumulationTab===key?'active':'')+'">'+label+' <small>'+n+'</small></button>').join('')+'</div>';
    let content;
    if(accumulationTab==='library')content='<section class="section"><div class="section-head"><div><h2>我的经历库</h2><p>教育、实习、项目与课程经历，所有求职方向共用。</p></div>'+button('＋ 新增经历','experience','','small primary')+'</div>'+structuredLibrary()+'<div class="page-next card"><div><strong>新的成果，也能成为经历</strong><p>AI 整理出草稿，核对或修改后再确认加入。</p></div>'+button('查看任务成果 →','accumulation-tab','outcomes','small')+'</div></section>';
    else if(accumulationTab==='outcomes')content='<section class="section"><div class="section-head"><div><h2>任务成果</h2><p>文字、链接或文件均可。成果和描述必填，过程与感悟选填。</p></div>'+button('＋ 登记成果','choose-outcome','','small primary')+'</div><div class="grid">'+(state.outcomes.length?state.outcomes.map(o=>{const p=planById(o.planId),saved=state.experiences.find(e=>(e.sourceOutcomeIds||[e.sourceOutcomeId]).includes(o.id));return '<article class="card outcome-record-card"><div class="card-header"><h3>'+esc(o.title||p?.title||'任务成果')+'</h3><span class="tag '+(saved?'green':'blue')+'">'+(saved?'已加入经历库':'已登记')+'</span></div><p class="caption">'+esc(folderName(o.folderId))+' · '+esc(p?.title||'原任务')+' · '+esc(o.date)+'</p><p>'+esc(o.description)+'</p><div class="artifact-summary">'+(o.text?'<span>≡ 文字成果</span>':'')+(o.links?.length?'<span>↗ '+o.links.length+' 个链接</span>':'')+(o.attachments?.length?'<span>↥ '+o.attachments.length+' 个文件</span>':'')+'</div><div class="actions">'+button(saved?'AI 整理并更新经历':'AI 整理加入经历库','sync-outcome',o.id,'primary small')+button('查看／补充','edit-outcome',o.id,'small ghost')+'</div><p class="caption">'+(saved?'可补充原经历，保留关联和修改记录。':'先生成可编辑草稿，确认后加入。')+'</p></article>';}).join(''):empty('还没有登记成果','从今日任务完成一次实践后，登记留下的文字、链接或文件。'))+'</div></section>'+(chosen?renderBankWorkspace(chosen):'');
    else content='<section class="section"><div class="section-head"><div><h2>信息与复盘</h2><p>随手记录网上信息、面试思考、执行中的想法，需要时转成任务。</p></div>'+button('＋ 记录一条','feedback','','small primary')+'</div><div class="grid">'+(state.feedback.length?state.feedback.map(x=>'<article class="card"><div class="row"><span class="tag">'+esc(x.type)+'</span><small class="caption">'+esc(x.folderId?folderName(x.folderId):'通用记录')+'</small></div><h3>'+esc(x.title)+'</h3><p class="preline">'+esc(x.note)+'</p>'+link(x.url,'原始资料')+(x.next?'<p class="caption">下一步：'+esc(x.next)+'</p>':'')+'<div class="actions">'+button('编辑记录','feedback',x.id,'small ghost')+button('整理为任务','feedback-plan',x.id,'small')+'</div></article>').join(''):empty('记录一点现在的想法','感悟和过程都自愿填写，方便以后回顾。'))+'</div></section>';
    return head(4,'我的积累','成果不会自动变成经历；每一条经历都由你核对后保存，持续积累、跨方向复用。')+nav+content;
  }
  function saveBankForm(form,values){
    const v=k=>String(values.get(k)||'').trim();if(!pendingRecognition)throw Error('请先选择成果。');
    const before=JSON.stringify(state);try{const entry=W.commit(C,state,pendingRecognition,{mode:v('mode'),targetId:v('targetId'),title:v('title'),type:v('type'),description:v('description'),period:v('period'),link:v('link'),confirmed:values.has('confirmed')});persist();pendingRecognition=null;render();toast('已保存到「'+entry.type+'」，可在经历库查看。');}catch(error){state=JSON.parse(before);throw error;}
  }
  function handleAssistantAction(act,id){
    if(act==='fill-form-example'){fillFormExample(id);return true;}
    if(act==='choose-outcome'){if(!state.plans.length){toast('先在成长计划中添加或选择一项任务，再登记成果。');return true;}showModal('为哪个任务登记成果？','<p>同一任务可以保存多份阶段成果。</p>'+state.plans.map(p=>'<div class="job-row"><span>'+esc(folderName(p.folderId))+' · '+esc(p.title)+'</span>'+button('登记成果','outcome',p.id,'small primary')+'</div>').join(''));return true;}
    if(act==='match-material'){const row=C.matchResults(state).find(r=>r.key===id),e=expById(row?.evidence?.[0]?.experienceId);experienceModal(e?.id||'',{title:row?.label||'补充经历',type:'项目经历',description:''});return true;}
    if(act==='prepare-gap'){prepareGap(id);return true;}
    if(act==='revise-task'){reviseTaskModal(id);return true;}
    if(act==='preview-task-change'){previewTaskChange();return true;}
    if(act==='close-workbench'){workbenchId='';pendingRecognition=null;render();return true;}
    return false;
  }
  async function prepareGap(key){await sendGrowthSuggestions([key]);}
  async function sendGrowthSuggestions(keys){
    if(!f()||!C.reviewed(state)){toast('请先选择岗位并上传简历，或补充经历。');return;}
    const result=G.queueSuggestions(C,state,keys);persist();navigate('plans');
    const selected=result.pending[0]||result.existing[0];if(selected){const el=$('[data-plan-id="'+selected.id+'"]');el?.closest('details')?.setAttribute('open','');el?.classList.add('highlight-task');el?.scrollIntoView({behavior:'smooth',block:'center'});}
    toast(result.pending.length||result.existing.length?'求职成长建议已送到成长计划，请选择是否加入本轮。':'这项能力已有本轮任务或历史成果，可在成长计划查看。');
  }
  function reviseTaskModal(id){
    const p=planById(id);if(!p)return;showModal('按你的条件调整这项任务',hidden('id',id)+'<h3>'+esc(p.title)+'</h3><p class="caption">选择你能投入的时间和条件，先查看具体方案，再决定是否采用。</p><div class="field-row">'+field('hours','这项任务最多投入几小时？',Math.max(.5,Number(p.hours)/2),'number','min="0.25" max="500" step="0.25" required')+select('resource','目前可以使用的条件',[['existing','利用已有项目或材料'],['solo','只能自己独立完成'],['users','可以联系真实用户']],'existing')+'</div><div class="actions">'+button('查看调整方案','preview-task-change',id,'primary')+'</div><div id="task-change-preview"></div>','revise-task-form','确认采用这个方案');$('#revise-task-form > .actions button[type=submit]').disabled=true;
  }
  function previewTaskChange(){
    const form=$('#revise-task-form');if(!form)return;const p=planById(form.elements.id.value);if(!p)throw Error('任务不存在。');const proposal=G.revise(p,{hours:Number(form.elements.hours.value),resource:form.elements.resource.value});
    $('#task-change-preview').innerHTML='<div class="revision-preview"><div class="comparison"><div><small>现在的任务</small><strong>'+p.hours+' 小时</strong><p>'+esc(p.output)+'</p></div><div><small>按你的条件调整后</small><strong>'+proposal.hours+' 小时</strong><p>'+esc(proposal.output)+'</p></div></div><h4>'+esc(proposal.title)+'</h4><ol>'+proposal.steps.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol><p class="caption">'+esc(proposal.reason)+'</p><span class="tag">示例方案 · 采用前可以继续调整条件</span></div><label class="check-row section"><input name="confirmed" type="checkbox" required><span>这项做法适合我，确认采用</span></label>';
    form.dataset.proposal=JSON.stringify(proposal);form.dataset.proposalInput=JSON.stringify([form.elements.hours.value,form.elements.resource.value]);$('#revise-task-form > .actions button[type=submit]').disabled=false;
  }
  let dbPromise;
  function database(){
    if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(A.databaseName(accountDB.sessionId),1);
      request.onupgradeneeded=()=>request.result.createObjectStore('files',{keyPath:'id'});
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(new Error('当前浏览器无法保存文件，请检查站点存储设置。'));
    });
    return dbPromise;
  }
  async function fileRequest(mode,callback){
    const db=await database();
    return new Promise((resolve,reject)=>{const tx=db.transaction('files',mode),req=callback(tx.objectStore('files'));let result;req.onsuccess=()=>{result=req.result;};tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(new Error('文件保存失败，可能是存储空间不足。'));tx.onabort=()=>reject(new Error('文件操作已中止。'));});
  }
  const getFile=id=>fileRequest('readonly',store=>store.get(id));
  const putFile=file=>fileRequest('readwrite',store=>store.put(file));
  const removeFile=id=>fileRequest('readwrite',store=>store.delete(id));
  async function storeFiles(files){
    const saved=[];
    try{
      for(const file of files){if(file.size>15*1024*1024)throw new Error('单个文件不能超过 15 MB：'+file.name);const record={id:C.uid('file'),name:file.name,size:file.size,type:file.type,blob:file};await putFile(record);saved.push({id:record.id,name:file.name,size:file.size,type:file.type});}
      return saved;
    }catch(error){await Promise.allSettled(saved.map(a=>removeFile(a.id)));throw error;}
  }
  async function openFile(id,download){
    toast('正在读取已保存文件…');
    const file=await getFile(id);if(!file)throw new Error('此文件在当前浏览器中已不存在。');
    const url=URL.createObjectURL(file.blob),a=document.createElement('a');a.href=url;
    if(download||!['application/pdf','image/png','image/jpeg','text/plain','text/markdown'].includes(file.type))a.download=file.name;
    else{a.target='_blank';a.rel='noopener noreferrer';}
    document.body.appendChild(a);a.click();a.remove();toast(download?'已开始下载文件。':'已打开文件。');setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  async function resumeText(file){
    const ext=file.name.split('.').pop().toLowerCase();
    if(['txt','md','markdown'].includes(ext))return await file.text();
    if(ext==='docx'){
      const zip=await JSZip.loadAsync(file);
      const item=zip.file('word/document.xml');if(!item)throw new Error('这不是可读取的 DOCX 文件。');
      const xml=new DOMParser().parseFromString(await item.async('string'),'application/xml');
      if(xml.querySelector('parsererror'))throw new Error('Word 文件内容无法解析。');
      return [...xml.getElementsByTagNameNS('*','p')].map(p=>[...p.getElementsByTagNameNS('*','t')].map(t=>t.textContent).join('')).join('\n');
    }
    if(ext==='pdf'){
      const pdf=await import('./vendor/pdf.min.mjs');
      pdf.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdf.worker.min.mjs',document.baseURI).href;
      const doc=await pdf.getDocument({data:await file.arrayBuffer(),isEvalSupported:false}).promise;
      const result=[];
      try{
        for(let i=1;i<=doc.numPages;i++){const page=await doc.getPage(i),content=await page.getTextContent();let text='';for(const item of content.items)if('str' in item)text+=item.str+(item.hasEOL?'\n':' ');result.push(text);}
      }finally{await doc.destroy();}
      const text=result.join('\n').trim();
      if(text.length<15)throw new Error('此 PDF 没有足够可提取文字，可能是扫描件。请粘贴简历文字或上传文字版 PDF / DOCX。');
      return text;
    }
    throw new Error('请上传 PDF、DOCX、TXT 或 Markdown；旧版 .doc 请先另存为 .docx。');
  }
  function showModal(title,body,formId='',submit='保存'){
    syncRequestId++;
    modalReturn=document.activeElement;
    $('#modal-root').innerHTML='<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header><h2 id="modal-title">'+esc(title)+'</h2><button type="button" class="close" data-act="close-modal" aria-label="关闭弹窗">×</button></header>'+(formId?'<form id="'+formId+'">':'<div>')+body+(formId?'<div class="actions"><button type="button" class="button" data-act="close-modal">取消</button><button type="submit" class="button primary">'+submit+'</button></div></form>':'</div>')+'</section></div>';
    if(['job-form','paste-resume-form','experience-form','feedback-form','folder-form','source-form','plan-form'].includes(formId)){const hint=document.createElement('div');hint.className='actions';hint.innerHTML=button('填入表单示例','fill-form-example',formId,'small ghost');$('.modal form')?.prepend(hint);}
    rememberForms($('#modal-root'));
    const input=$('.modal input:not([type="hidden"]),.modal textarea,.modal select,.modal button');input?.focus();
  }
  function closeModal(){syncRequestId++;$('#modal-root').innerHTML='';if(modalReturn?.isConnected)modalReturn.focus();}
  const hidden=(name,value)=>'<input type="hidden" name="'+name+'" value="'+esc(value)+'">';
  let aiService={available:false,configured:false,csrf:'',model:''},aiConsent=false,analysisBusy='',acquisitionReport=[];
  async function loadService(){
    try{
      const response=await fetch('/api/status',{cache:'no-store'});
      if(!response.ok)throw Error();
      const data=await response.json();
      aiService={...data,available:true};
    }catch{aiService={available:false,configured:false,csrf:'',model:''};}
    if(state.page==='evidence'&&!$('.modal'))render();
  }
  async function api(path,body){
    if(!aiService.available){await loadService();if(!aiService.available)throw Error('服务暂时未连接，请刷新网页后重试。已有岗位与经历记录仍会保留。');}
    const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json','X-InternPilot-CSRF':aiService.csrf},body:JSON.stringify(body)});
    let result;try{result=await response.json();}catch{throw Error('服务未返回可读取的结果。');}
    if(!response.ok)throw Error(result.error||'本轮操作未完成。');
    return result;
  }
  async function runAI(){
    if(!f()||!C.reviewed(state))throw Error('请选择参考岗位并上传简历，或补充个人经历。');if(f().exampleContext&&state.inlineExamples)E.refresh(C,state);persist();render();$('.capability-flow')?.scrollIntoView({behavior:'smooth',block:'start'});toast('已更新能力匹配示例，可为待提升能力生成求职成长建议。');
  }
  function aiInfo(){showModal('AI 服务连接状态','<div class="notice"><strong>'+(aiService.configured?'AI 已配置：'+esc(aiService.model):'AI 服务尚未连接')+'</strong><p>AI 匹配与成果识别需要站点服务端配置模型密钥。密钥不会保存在网页或浏览器中。</p></div><p>未连接时可继续导入岗位、维护经历和查看规则预览。AI 识别不会以普通文本整理冒充成功。</p><div class="actions">'+button('刷新连接状态','refresh-ai','','primary')+'</div>');}
  function acquisitionModal(fetchLinks=false){
    showModal(fetchLinks?'批量读取公开 JD 链接':'导入自动采集的 JD 列表',
      select('folderId','归入目标方向',[...state.folders.map(x=>[x.id,x.name]),['new','+ 新建方向']],f()?.id||'new')+
      field('newName','新建方向名称（选新建时填写）','','text','placeholder="如：AI 产品实习"')+
      (fetchLinks?area('urls','公开岗位链接（每行一个，最多 10 条）','','required rows="7"')+'<p class="caption">读取可公开访问的网页正文。登录、反爬限制或动态加载页面可能失败，失败后保留来源，支持改为导入或粘贴 JD。</p>':
      '<p class="caption">支持自动采集脚本导出的 JSON 数组，或包含 jobs 数组的 JSON。每条需要 title、company、rawJD，可附 sourceUrl 和 requirements。</p><div class="field"><span>选择 JSON 文件</span><input type="file" name="jdFile" accept=".json" aria-label="导入 JD JSON 文件"></div>'+
      area('json','或粘贴采集结果 JSON','','rows="7" placeholder="粘贴自动采集脚本导出的 JSON 数组"')+
      '<a href="./examples/jd-import-template.json" download>下载 10 条演示 JD 的导入模板</a>')+
      '<p class="caption">导入后先进入方向文件夹，默认不选入本轮匹配；你可以从 10 条中勾选 6 条。</p>',
      fetchLinks?'fetch-jds-form':'import-jds-form',fetchLinks?'读取网页并收集':'导入岗位列表');
  }
  function ingestJobs(items,folder){
    if(!Array.isArray(items)||!items.length||items.length>100)throw Error('请导入 1–100 条 JD。');
    const additions=[];let duplicate=0,updated=0;
    for(const raw of items){
      if(!raw||typeof raw!=='object'||!String(raw.title||'').trim()||!String(raw.company||'').trim()||!String(raw.rawJD||'').trim())throw Error('每条 JD 都需要岗位名称 title、公司 company 和原文 rawJD。');
      if(String(raw.rawJD).length>30000)throw Error('单条 JD 原文不得超过 30000 字符。');
      if(raw.sourceUrl&&!safeUrl(raw.sourceUrl))throw Error('JD 来源链接需要以 http:// 或 https:// 开头。');
      const duplicateJob=C.jobs(state).concat(additions).find(j=>(raw.sourceUrl&&j.sourceUrl===raw.sourceUrl)||(j.title===raw.title&&j.company===raw.company&&j.rawJD===raw.rawJD));
      if(duplicateJob){
        if(folder&&!folder.jobIds.includes(duplicateJob.id))folder.jobIds.push(duplicateJob.id);
        if(duplicateJob.rawJD!==raw.rawJD){
          state.jobSnapshots ||= {};state.jobSnapshots[duplicateJob.id] ||= [];state.jobSnapshots[duplicateJob.id].push({...duplicateJob});
          if(raw.requirements&&!Array.isArray(raw.requirements))throw Error('requirements 需要是数组。');
          const updatedRequirements=(raw.requirements||[]).map(r=>typeof r==='string'?{label:r,quote:r,must:false}:r);
          if(updatedRequirements.some(r=>!r?.label||!r?.quote||!String(raw.rawJD).replace(/\s/g,'').includes(String(r.quote).replace(/\s/g,''))))throw Error('更新的岗位要求引文不在 JD 中。');
          Object.assign(duplicateJob,{rawJD:String(raw.rawJD).trim(),requirements:updatedRequirements,title:String(raw.title),company:String(raw.company),capturedAt:C.today()});updated++;
        }else duplicate++;
        continue;
      }
      if(raw.requirements&&!Array.isArray(raw.requirements))throw Error('requirements 需要是数组。');
      const requirements=(raw.requirements||[]).map(r=>typeof r==='string'?{label:r,quote:r,must:false}:r);
      if(requirements.some(r=>!r?.label||!r?.quote||!String(raw.rawJD).replace(/\s/g,'').includes(String(r.quote).replace(/\s/g,''))))throw Error('已知岗位要求必须附上能在 JD 中找到的原文。');
      additions.push({...raw,id:C.uid('job'),title:String(raw.title).trim(),company:String(raw.company).trim(),city:String(raw.city||''),sourceUrl:String(raw.sourceUrl||''),rawJD:String(raw.rawJD).trim(),requirements,capturedAt:C.today(),acquisition:raw.acquisition||'import',demo:raw.demo===true});
    }
    state.customJobs.push(...additions);if(folder){folder.jobIds.push(...additions.map(j=>j.id));state.activeFolderId=folder.id;}
    return {added:additions.length,duplicate,updated};
  }
  function correctionModal(key){
    const row=C.matchResults(state).find(r=>r.key===key);if(!row)return;
    const docs=C.personalDocuments(state);
    showModal('按需纠正匹配结果',hidden('key',key)+'<p><strong>'+esc(row.label)+'</strong></p><p class="caption">原结论：'+matchLabels[row.status]+'。纠正仅影响当前方向与本轮材料。</p>'+
      select('status','调整结论',Object.entries(matchLabels),row.status)+
      '<fieldset><legend>关联个人材料（支撑较充分或部分匹配时需要选择）</legend>'+docs.map(e=>'<label class="check-row"><input type="checkbox" name="evidenceIds" value="'+esc(e.id)+'" '+(row.evidence.some(x=>x.experienceId===e.id)?'checked':'')+'><span>'+esc(e.title)+'</span></label>').join('')+'</fieldset>'+
      area('note','纠正理由 *',row.corrected?row.reason:'','required')+'<p class="caption">这是可选纠错入口，原来的自动匹配结果无需逐条确认。</p>','correction-form','保存纠正');
  }
  function folderModal(id=''){
    const folder=state.folders.find(x=>x.id===id);
    showModal(folder?'编辑目标方向':'新建目标方向',hidden('id',id)+field('name','方向名称 *',folder?.name||'','text','required maxlength="80" placeholder="如：AI 产品实习"')+field('city','目标城市（可选）',folder?.city||'')+'<p class="caption">不同方向分别管理岗位、匹配与任务；共用同一个经历库。</p>','folder-form');
  }
  function collectModal(id){
    const job=C.jobs(state).find(j=>j.id===id);if(!job)return;
    showModal('收藏到目标文件夹',hidden('jobId',id)+'<p>'+esc(job.company)+' · '+esc(job.title)+'</p>'+select('folderId','选择目标方向',[['new','+ 新建方向'],...state.folders.map(x=>[x.id,x.name+(x.jobIds.includes(id)?'（已收藏）':'')])],f()?.id||'new')+field('newName','新建方向名称（选择新建时填写）','','text','placeholder="如：AI 产品实习"')+'<p class="caption">一个岗位可以收藏到多个方向；每个方向的要求单独汇总。</p>','collect-form','收藏');
  }
  function formRoleUpdate(form,roles){form.elements.role.innerHTML='<option value="">按岗位名称识别</option>'+roles.map(r=>'<option>'+esc(r)+'</option>').join('');}
  function manualJobFields(job={}){
    const options=(key,label,items,value)=>select(key,label,[['','未注明 / 按原文填写'],...items.map(v=>[v,v])],value||'');
    return '<details class="section"><summary>补充分类与筛选信息（可选）</summary><div class="recruitment-fields">'+options('jobCategory','职位大类',T.groups.map(g=>g.name),job.jobCategory).replace('<select ','<select data-manual-category ')+options('role','细分岗位',T.groups.find(g=>g.name===job.jobCategory)?.roles||T.groups.flatMap(g=>g.roles),job.role)+field('district','所在区域',job.district||'')+options('experience','工作经验',T.options.experience,job.experience)+options('education','学历要求',T.options.education,job.education)+options('industry','公司行业',T.options.industry,job.industry)+options('companySize','公司规模',T.options.companySize,job.companySize)+options('financing','融资阶段',T.options.financing,job.financing)+field('salaryText','原文薪资',job.salary||'')+field('salaryMin','薪资区间下限',job.salaryMin||'','number','min="0" step="1"')+field('salaryMax','薪资区间上限',job.salaryMax||'','number','min="0" step="1"')+select('salaryCurrency','薪资币种',[['CNY','人民币'],['USD','美元'],['OTHER','其他币种']],job.salaryCurrency||'CNY')+select('salaryPeriod','计薪周期',[['month','月薪'],['day','日薪'],['year','年薪']],job.salaryPeriod||'month')+'</div><p class="caption">仅填写招聘原文明确说明的信息；未提供时留空。薪资下限与上限按原币种计，人民币月薪填写元/月。</p></details>';
  }
  function jobModal(id=''){
    const job=C.jobs(state).find(j=>j.id===id);
    showModal(job?'编辑真实岗位':'添加真实岗位',hidden('id',id)+field('title','岗位名称 *',job?.title||'','text','required')+
      '<div class="field-row">'+field('company','公司或单位 *',job?.company||'','text','required')+field('city','城市',job?.city||'')+'</div>'+select('jobType','岗位类型',['实习','全职','兼职','合同制','未注明'].map(x=>[x,x]),C.jobType(job||{}))+field('sourceUrl','岗位来源链接',job?.sourceUrl||'','url','placeholder="https://..."')+field('capturedAt','收集日期',job?.capturedAt||C.today(),'date')+
      manualJobFields(job||{})+area('rawJD','JD 原文 *',job?.rawJD||'','required rows="6" placeholder="粘贴招聘信息全文，后续要求可以回溯原文。"')+
      area('requirements','已知要求（可选，留空由 AI 从原文提取）',(job?.requirements||[]).map(r=>(r.must?'[必备] ':'')+r.label+' | '+r.quote).join('\n'),'rows="5" placeholder="[必备] 数据分析 | 能使用 SQL 分析产品数据\n用户研究 | 参与用户访谈与需求归纳"')+
      '<p class="caption">可选格式：要求名称 | 对应 JD 原文。已有采集到的要求可直接保留；没有时由 AI 分析原文。</p>'+
      (!id?select('folderId','同时收藏到方向',[['','先放入发现列表'],...state.folders.map(x=>[x.id,x.name])],f()?.id||''):'')+
      '<p class="caption">岗位原文将作为后续匹配与计划的依据。</p>','job-form');
  }
  function viewJob(id){
    const j=C.jobs(state).find(j=>j.id===id);if(!j)return;
    showModal(j.title,'<p>'+esc(j.company)+' · '+esc(j.city)+'</p><p class="caption">'+(j.demo?'演示岗位':'手动录入，来源由本人核查')+'</p>'+link(j.sourceUrl,'岗位来源')+'<ul>'+j.requirements.map(r=>'<li><strong>'+esc(r.label)+(r.must?' · 必备':'')+'</strong><p>'+esc(r.quote)+'</p></li>').join('')+'</ul>'+(j.rawJD?'<details open><summary>JD 原文</summary><p class="material-raw">'+esc(j.rawJD)+'</p></details>':'')+'<div class="actions">'+button('收藏到文件夹','collect',j.id,'primary')+'</div>');
  }
  function experienceModal(id='',seed={}){
    const e=expById(id)||seed;
    showModal(id?'核查 / 编辑经历':'新增经历',hidden('id',id)+hidden('sourceMaterialId',e.sourceMaterialId||'')+hidden('sourceOutcomeId',e.sourceOutcomeId||'')+
      field('title','经历名称 *',e.title||'','text','required')+
      '<div class="field-row">'+select('type','经历类型',C.experienceTypes.map(x=>[x,x]),C.experienceType(e.type||'项目经历'))+field('period','时间',e.period||'')+'</div>'+
      area('description','个人行动、使用的方法、成果与局限 *',e.description||'','required rows="7"')+field('link','作品或证明链接',e.link||'','url')+
      '<label class="row"><input name="confirmed" type="checkbox" '+(e.confirmed?'checked':'')+'> 我已核查以上事实，确认这是我的真实经历</label><p class="caption">保存后参与所有方向的匹配；修改事实后，AI 匹配结果需要重新分析。</p>','experience-form','保存到经历库');
  }
  function planModal(id='',seed={}){
    if(!f()){toast('请先建立目标方向');return;}
    const p=planById(id)||seed,auto=!!p.origin&&p.origin!=='自定义任务';
    const row=C.matchResults(state).find(r=>r.key===p.requirementKey),options=state.sources.filter(r=>r.folderId===f().id&&(!auto||!row||C.caseSupports(row,r,f()))).concat(p.retrievalDemo?(p.references||[]).filter(r=>!state.sources.some(x=>x.id===r.id)):[]);
    showModal(id?'编辑任务与依据':'自定义任务 · '+f().name,hidden('id',id)+hidden('requirementKey',p.requirementKey||'')+
      field('title','任务名称 *',p.title||'','text','required')+'<div class="field-row">'+field('hours','预计投入（小时）',p.hours||2,'number','min="0.25" max="500" step="0.25" required')+field('week','安排时间',p.week||'周期内','text','placeholder="如：第 1 周 / 每周二"')+'</div>'+
      field('output','预期提交成果 *',p.output||'','text','required')+area('criteria','完成标准 *',p.criteria||'','required')+
      area('reason','为什么需要做这项任务',p.reason||'由我自行设定的任务。')+area('relevance','与当前就业方向的关系',p.relevance||'')+
      area('steps','执行步骤（每行一项） *',(p.steps||[]).map(s=>s.text).join('\n'),'required rows="5"')+
      area('learningLinks','补充学习链接（每行：名称 | 链接）',(p.learningLinks||[]).map(l=>l.title+' | '+l.url).join('\n'),'rows="3"')+'<fieldset class="reference-picker"><legend>关联参考材料</legend>'+options.map(r=>'<label class="check-row"><input type="checkbox" name="referenceIds" value="'+esc(r.id)+'" '+((p.references||[]).some(x=>x.id===r.id)?'checked':'')+'><span>'+esc(r.title)+'<small>'+esc(r.type)+'</small></span></label>').join('')+'</fieldset>'+
      (auto&&!p.retrievalDemo?'<label class="check-row"><input type="checkbox" name="verifiedPlan"><span>我已查看当前匹配，并确认上述参考材料适用于本任务</span></label><p class="caption">没有适用材料时，可以先保存为待补充依据的草稿。</p>':'')+
      '<p class="caption">所属方向：'+esc(folderName(p.folderId||f().id))+'。修改任务不会移动到其他方向。</p>','plan-form');
  }
  function outcomeModal(id,outcomeId=''){
    const p=planById(id);if(!p)return;const o=state.outcomes.find(x=>x.id===outcomeId)||{};
    showModal(o.id?'查看／补充成果':'登记任务成果',hidden('planId',id)+hidden('id',o.id||'')+'<p class="caption">所属任务：'+esc(p.title)+'</p><div class="between"><span class="tag blue">只需成果与描述</span>'+button('填入登记示例','fill-outcome','','small ghost')+'</div>'+field('title','成果名称 *',o.title||p.title,'text','required')+
      '<div class="field"><span>成果内容 * · 至少提供一种，可组合</span><div class="artifact-options"><span>≡ 直接写文字</span><span>↗ 添加链接</span><span>↥ 上传文件</span></div></div>'+area('text','文字成果',o.text||'','placeholder="可以直接粘贴分析结论、文案、方案、笔记或作品内容。" rows="5"')+area('links','成果链接（可多个，每行：名称 | 链接）',(o.links||[]).map(l=>l.label+' | '+l.url).join('\n'),'placeholder="作品名称 | https://..."')+
      '<label class="field"><span>上传成果文件（多选，格式不限）</span><input name="files" type="file" multiple aria-label="上传成果文件"><small>文档、图片、表格、音视频等；每个文件最大 15 MB。保存与 AI 可读取状态分别展示。</small></label>'+((o.attachments||[]).length?'<fieldset><legend>已保存文件</legend>'+o.attachments.map(a=>'<label class="check-row"><input type="checkbox" name="keepFile" value="'+esc(a.id)+'" checked><span>'+esc(a.name)+'</span></label>').join('')+'</fieldset>':'')+
      area('description','成果描述 *',o.description||'','required rows="4" placeholder="这份成果是什么？你负责什么、完成了哪些实际工作？如有结果、反馈或局限，也可补充。没有量化结果也可以。"')+
      '<details class="optional-fields"><summary>补充过程与想法（选填）</summary>'+area('process','实施步骤（选填）',o.process||'')+area('method','方法与工具（选填）',o.method||'')+area('reflection','感悟、困难与下一步（选填）',o.reflection||'')+'</details><p class="caption">不用完成全部步骤即可登记。保存不会自动标记任务完成。</p>','outcome-form','保存成果');
    const actions=$('#outcome-form > .actions'),next=document.createElement('button');next.type='submit';next.name='intent';next.value='sync';next.className='button ai-button';next.textContent='保存并 AI 整理加入经历库';actions.appendChild(next);
  }
  function feedbackModal(id=''){
    const item=state.feedback.find(x=>x.id===id)||{};
    showModal(id?'编辑复盘记录':'记录信息与复盘想法',hidden('id',id)+select('type','记录类型',['网上找到的信息','面试后的思考','执行中的想法','其他观察'].map(x=>[x,x]),item.type||'网上找到的信息')+
      field('title','记录标题 *',item.title||'','text','required')+select('folderId','关联目标方向',[['','通用记录'],...state.folders.map(x=>[x.id,x.name])],item.folderId??f()?.id??'')+
      select('taskId','关联任务（可选）',[['','暂不关联'],...state.plans.map(p=>[p.id,folderName(p.folderId)+' · '+p.title])],item.taskId||'')+
      area('note','信息内容、事实与想法 *',item.note||'','required rows="5"')+field('url','信息来源链接（可选）',item.url||'','url')+
      area('next','需要继续学习或跟进的内容',item.next||'')+'<p class="caption">记录不会自动改变能力判断。可以在复盘页进一步整理为自定义任务。</p>','feedback-form');
  }
  function sourceModal(planId=''){
    if(!f())return;
    showModal('为本条建议补充经验案例',hidden('planId',planId)+field('title','材料标题 *','','text','required')+field('url','来源链接 *','','url','required')+
      select('type','材料类型',['个人经验分享','求职成功案例','企业实践案例','其他经验材料'].map(x=>[x,x]))+
      select('dimension','适用能力维度',C.dimensions.map(d=>[d.key,d.label]).concat([['other','其他岗位要求']]),planById(planId)?.dimension||'other')+
      area('summary','来源中的事实或经验 *','','required')+area('lesson','具体可借鉴的做法 *','','required')+area('application','为什么适用于当前方向与任务 *','','required')+
      '<label class="check-row"><input name="verified" type="checkbox" required><span>我已阅读来源，并核查其与当前任务的关系</span></label><p class="caption">系统保留来源及本人说明，不自动证明材料真实性或就业效果。保存后可在任务编辑中关联。</p>','source-form');
  }
  function newFolder(name,city=''){
    const clean=name.trim();if(!clean)throw new Error('请填写目标方向名称。');
    if(state.folders.some(x=>x.name.toLowerCase()===clean.toLowerCase()))throw new Error('这个方向已存在，请选择原有文件夹。');
    const item={id:C.uid('folder'),name:clean,city,jobIds:[],archivedIds:[],answers:{},reviewSignature:'',selectedJobIds:[],overrides:{},schedule:C.schedule()};
    state.folders.push(item);state.activeFolderId=item.id;return item;
  }
  async function refreshPlanSources(id){
    const p=planById(id);if(!p)return;showModal('围绕方向检索经验 · 前端示例','<div class="notice"><strong>这里展示全网检索的设计流程</strong><p>输入当前方向、岗位要求与差距 → 搜索公开经验分享和实践案例 → 核对正文与适用背景 → 将依据放入对应建议。</p></div><p>当前方向：'+esc(f().name)+'</p><h3>检索词示例</h3><ul>'+(p.searchQueries||[f().name+' '+p.title+' 求职经验 项目复盘']).map(q=>'<li>'+esc(q)+'</li>').join('')+'</ul><p class="caption">本次只改前端，没有执行网络搜索或接入后端。下方文章只是结果样式示例。</p>'+refsHtml({...p,retrievalDemo:true}));
  }
  async function generate(){const keys=G.matchGroups(C,state).gaps.map(r=>r.key);await sendGrowthSuggestions(keys);}
  async function startOutcomeSync(id){accumulationTab='outcomes';if(!state.outcomes.some(o=>o.id===id))throw Error('成果不存在。');workbenchId=id;pendingRecognition=W.draft(C,state,id);navigate('review');$('#experience-workbench')?.scrollIntoView({behavior:'smooth',block:'start'});}
  async function exportBackup(){
    const zip=new JSZip();zip.file('data.json',JSON.stringify(state,null,2));
    const ids=new Set(state.materials.map(m=>m.fileId).filter(Boolean).concat(state.outcomes.flatMap(o=>(o.attachments||[]).map(a=>a.id))));
    const metadata=[];
    for(const id of ids){const item=await getFile(id);if(item){metadata.push({id,name:item.name,size:item.size,type:item.type});zip.file('files/'+id,item.blob);}}
    zip.file('files.json',JSON.stringify(metadata));
    const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='GrowPilot-backup-'+C.today()+'.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
    toast('备份包含当前记录与已保存文件。');
  }
  document.addEventListener('click',async event=>{
    const target=event.target.closest('[data-page],[data-act]');if(!target)return;
    try{
      const accountAct=target.dataset.act;
      if(accountAct==='auth-demo'){enterAccount(target.dataset.id);return;}
      if(accountAct==='auth-method'){if(!['email','phone'].includes(target.dataset.id))return;authMethod=target.dataset.id;authStage='email';authEmail='';authChallenge=null;renderLogin();return;}
      if(accountAct==='auth-edit'){authStage='email';authChallenge=null;renderLogin();return;}
      if(accountAct==='auth-resend'){if(authChallenge&&Date.now()<authChallenge.resendAt)return;authChallenge=A.challenge(authEmail,Date.now(),authMethod);renderLogin();toast('新的演示验证码为 123456，不会发送真实邮件或短信。');return;}
      if(accountAct==='account-profile'){profileModal();return;}
      if(accountAct==='account-prefs'){accountPrefs();return;}
      if(accountAct==='account-switch'){accountSwitch();return;}
      if(accountAct==='account-logout'||accountAct==='account-other'){if(!leaveAccount())return;persist();A.logout(localStorage,accountDB);coachContext=null;closeModal();authStage='email';authChallenge=null;authEmail='';render();toast('已退出登录，保存过的记录会保留。');return;}
      if(!A.account(accountDB)){if(accountAct==='close-modal')closeModal();return;}
      if(target.dataset.page){if(target.closest('#modal-root'))closeModal();navigate(target.dataset.page);return;}
      const act=target.dataset.act,id=target.dataset.id;
      if(act==='calendar-mode'){calendarMode=id;render();return;}
      if(act==='calendar-prev'||act==='calendar-next'){calendarAnchor=CAL.shift(calendarAnchor||dailyView||C.today(),calendarMode,act==='calendar-prev'?-1:1);render();return;}
      if(act==='calendar-date'||act==='calendar-today'){dailyView=act==='calendar-today'?C.today():id;calendarAnchor=dailyView;render();return;}
      if(act==='today-settings'){showModal('时间与提醒设置','<p class="caption">所有方向共用每日投入，准备周期在各方向的成长计划中设置。</p><div class="settings-links">'+button('每天能投入多久','daily-budget','','ghost')+button('今天时间有变','daily-time','','ghost')+button('提醒与咕噜设置','account-prefs','','ghost')+button('预览今日提醒','preview-reminder','','ghost')+'</div>');return;}
      if(act==='manage-task'){const p=planById(id);state.activeFolderId=p.folderId;showModal('管理成长任务','<h3>'+esc(p.title)+'</h3><p>所属方向：'+esc(folderName(p.folderId))+'</p><div class="actions">'+button('调整任务范围','revise-task',p.id,'small')+button('登记阶段成果','outcome',p.id,'small')+button('标记整个任务完成','complete-task',p.id,'small ghost')+'</div>');return;}
      if(act==='focus-resume'){guluOpen=false;render();$('.focus-work')?.scrollIntoView({block:'center',behavior:'smooth'});return;}
      if(act==='focus-help'||act==='focus-help-close'){if(coachContext)focusQuestion();else openGuluCoach();return;}
      if(act==='focus-time'){dailyTimeModal();return;}
      if(act==='focus-edit-draft'){coachContext.editDraft=!coachContext.editDraft;render();return;}
      if(act==='focus-micro-next'){const t=coachingTarget();HC.toggle(state,t.p.id,t.step.id,Number(id));persist();render();const next=HC.focus(state,t.p,t.step,t.slot?.minutes||20);toast(next.done?'小步骤全部完成，请确认本次任务。':'第 '+(Number(id)+1)+' 步已完成，现在继续：'+next.rows[next.index].title);return;}
      if(act==='coach-close'){coachContext=null;coachQuestion='';guluOpen=false;renderCoach();window.scrollTo({top:0,behavior:'instant'});return;}
      if(act==='coach-gulu'){openGuluCoach('chat');return;}
      if(act==='coach-daily'){if($('.modal'))closeModal();openDailyCoach(id);return;}
      if(act==='coach-daily-ask'){openDailyCoach(id,'chat');return;}
      if(act==='coach-plan'){openCoach(id);return;}
      if(act==='coach-tab'){focusQuestion();return;}
      if(act==='coach-discard'){const t=coachingTarget();if(t.thread)t.thread.draft=null;persist();refreshTaskHelp();return;}
      if(act==='coach-generate'){const t=coachingTarget();HC.generate(state,t.p,t.step,t.slot?.minutes||20);persist();refreshTaskHelp();return;}
      if(act==='coach-micro'){const t=coachingTarget();HC.toggle(state,t.p.id,t.step.id,Number(id));persist();renderCoach();return;}
      if(act==='coach-question'||act==='coach-ask-micro'){const t=coachingTarget();askCurrentTask(act==='coach-question'?id:'“'+t.thread?.accepted?.steps[Number(id)]?.title+'”具体怎么做？');return;}
      if(act==='coach-undo'){const t=coachingTarget();HC.undo(state,t.p.id,t.step.id);persist();render();return;}
      if(act==='coach-finish'){const t=coachingTarget();if(!t.slot){t.step.done=true;coachContext.finished=true;persist();render();return;}if(t.p.status!=='adopted')throw Error('这次行动已更新，请重新核对。');D.mark(C,{...state,activeFolderId:t.p.folderId},t.slot.id,true);coachContext.finished=true;coachContext.help=false;persist();render();return;}
      if(act==='coach-outcome'){const t=coachingTarget();outcomeModal(t.p.id);return;}
      if(act==='arrange-run'||act==='reset-daily-order'){if(!state.plans.some(p=>p.status==='adopted'))throw Error('请先加入至少一项本轮计划。');if(act==='reset-daily-order')state.folders.forEach(f=>{if(f.execution)f.execution.manualOrder=[];});D.arrangeAll(C,state);dailyView=C.today();companionMessage='';persist();navigate('today');return;}
      if(act==='daily-reminder'){reminderModal();return;}
      if(act==='daily-budget'){dailyBudgetModal();return;}
      if(act==='daily-time'){dailyTimeModal();return;}
      if(act==='preview-reminder'){const x=GP.summary(C,state).next;showModal('今日提醒 · 样式预览','<div class="notice"><strong>咕噜 · 今天先做这一件</strong><p>'+esc(x?x.text:'打开今日安排，查看为你分配的小步骤。')+'</p><span class="caption">'+(x?x.minutes+' 分钟 · ':'')+'这是一条前端通知示例，不会实际推送。</span></div><button class="button primary" data-page="today" data-act="close-modal">查看今日任务</button>');return;}
      if(act==='daily-done'||act==='daily-undo'){const folder=state.folders.find(f=>f.execution?.items.some(x=>x.id===id));D.mark(C,{...state,activeFolderId:folder?.id},id,act==='daily-done');companionMessage=act==='daily-done'?'这一步完成啦！有文字、链接或文件产出，都可以登记下来。':'已恢复为待完成，按自己的节奏继续。';persist();render();return;}
      if(act==='daily-up'||act==='daily-down'){const p=planById(id),folder=state.folders.find(f=>f.id===p?.folderId),scoped={...state,activeFolderId:folder?.id},list=D.rank(C,scoped,folder?.execution?.manualOrder||[]).plans.map(p=>p.id),at=list.indexOf(id),to=at+(act==='daily-up'?-1:1);if(at<0||to<0||to>=list.length)return;[list[at],list[to]]=[list[to],list[at]];D.arrangeAll(C,state,{folderId:folder.id,manualOrder:list});persist();render();return;}
      if(act==='gulu-close'){guluOpen=false;updateGulu();return;}
      if(act==='gulu-context'||act==='gulu-help'){guluMode=act==='gulu-help'?'help':'context';guluOpen=true;updateGulu();return;}
      if(act==='gulu-reset'){state.companion={...state.companion,position:null};persist();updateGulu();return;}
      if(act==='gulu-collapse'){state.companion={...state.companion,collapsed:true};guluOpen=false;persist();updateGulu();return;}
      if(act==='bird-motion'){state.companion={...state.companion,still:!state.companion?.still};persist();updateGulu();return;}
      if(act==='gulu-page'){navigate(id);return;}
      if(act==='gulu-start'){guluStart();return;}
      if(act==='gulu-today'){dailyView=C.today();navigate('today');$('.daily-hero')?.scrollIntoView({block:'center'});return;}
      if(act==='gulu-arrange'){const folder=GP.summary(C,state).unarranged||f();if(folder)ensureGuluFolder(folder.id);dailyView=C.today();navigate('today');return;}
      if(act==='gulu-plan-bottom'){navigate('plans');$('.execution-launch')?.scrollIntoView({block:'center',behavior:'smooth'});return;}
      if(act==='gulu-goal-folder'){navigate('goal');$('.folder-tabs')?.scrollIntoView({block:'start',behavior:'smooth'});return;}
      if(act==='gulu-evidence'){navigate('evidence');if(!C.personalDocuments(state).length){const panel=$$('details').find(el=>el.textContent.includes('上传简历／补充材料'));if(panel){panel.open=true;panel.scrollIntoView({block:'center'});}}return;}
      if(['gulu-small','gulu-materials','gulu-time'].includes(act)){const next=guluNext();if(next)ensureGuluFolder(next.folderId);if(act==='gulu-time'){if(f())dailyTimeModal();else navigate('plans');return;}const current=guluNext();if(!current){guluStart();return;}if(act==='gulu-materials'){const p=planById(current.planId);showModal('这一步可用的学习材料',learningHtml(p));return;}openCoach(current.planId,current.stepId,current.id,'guide',true);return;}

      if(act==='bird-small'){openDailyCoach(id,'guide',true);return;}
      if(act==='bird-materials'){const p=planById(id);if(p)showModal('这一步可用的学习材料',learningHtml(p)+'<p class="caption">先选择与当前步骤相关的一小节，再回到实际操作。</p>');return;}
      if(handleAssistantAction(act,id,target))return;
      if(act==='clear-job-filters'){if(id==='collection')collectionFilters={};else jobFilters={};render();return;}
      if(act==='next-cloud'){cloudPage++;render();return;}
      if(act==='refresh-plan-sources'){await refreshPlanSources(id);return;}
      if(act==='begin-match'){if(!f())throw Error('请先选择目标方向。');state.matchingFolderId=f().id;navigate('evidence');return;}
      if(act==='sync-outcome'||act==='ai-outcome'){await startOutcomeSync(id);return;}
      if(act==='edit-outcome'){const o=state.outcomes.find(x=>x.id===id);outcomeModal(o.planId,id);return;}
      if(act==='complete-task'){const p=planById(id);if(p)p.status='completed';persist();closeModal();render();toast('任务已标记完成，成果和步骤记录保留。');return;}
      if(act==='fill-outcome'){const form=$('#outcome-form');form.elements.title.value='AI 问答输出检查记录（示例）';form.elements.text.value='检查记录：回答包含概念解释，但部分回答缺少可核对出处；后续加入来源核查项。';form.elements.description.value='我整理了学习问答中的常见问题，记录输出并人工检查出处，形成检查记录。当前只完成部分测试，尚未证明整体效果。';return;}
      if(act==='close-modal'){closeModal();return;}
      if(act==='folder'){folderModal(id);return;}
      if(act==='accumulation-tab'){accumulationTab=id;workbenchId='';pendingRecognition=null;render();return;}
      if(act==='select-folder'){pendingRecognition=null;workbenchId='';state.activeFolderId=id;persist();render();return;}
      if(act==='collect'){collectModal(id);return;}
      if(act==='job'){jobModal(id);return;}
      if(act==='view-job'){viewJob(id);return;}
      if(act==='archive'){const folder=f();folder.jobIds=folder.jobIds.filter(x=>x!==id);folder.selectedJobIds=(folder.selectedJobIds||[]).filter(x=>x!==id);folder.archivedIds=[...new Set((folder.archivedIds||[]).concat(id))];persist();render();return;}
      if(act==='restore'){f().archivedIds=f().archivedIds.filter(x=>x!==id);f().jobIds=[...new Set(f().jobIds.concat(id))];persist();render();return;}
      if(act==='experience'){experienceModal(id);return;}
      if(act==='show-library'){accumulationTab='library';navigate('review');return;}
      if(act==='confirm-experience'){const e=expById(id);e.confirmed=true;e.revision=(e.revision||0)+1;persist();render();toast('经历事实已校正；可按需重新运行 AI 匹配。');return;}
      if(act==='remove-experience'){if(!confirm('从经历库移除这条经历？AI 匹配结果需要重新分析；原始简历和任务成果会保留。'))return;state.experiences=state.experiences.filter(x=>x.id!==id);persist();render();return;}
      if(act==='paste-resume'){showModal('粘贴简历文字',field('title','材料名称 *','简历文字','text','required')+area('raw','简历原文 *','','required rows="12"')+'<p class="caption">按材料段落提取为待核查草稿；请检查并修改。</p>','paste-resume-form','提取经历草稿');return;}
      if(act==='run-ai'){await runAI();return;}
      if(act==='ai-info'){aiInfo();return;}
      if(act==='refresh-ai'){await loadService();closeModal();render();toast(aiService.configured?'真实 AI 已连接。':'真实 AI 尚未配置，可继续查看规则预览。');return;}
      if(act==='import-jds'||act==='fetch-jds'){acquisitionModal(act==='fetch-jds');return;}
      if(act==='select-all-jds'||act==='clear-selected-jds'){f().selectedJobIds=act==='select-all-jds'?jobs().map(j=>j.id):[];persist();render();return;}
      if(act==='correct-match'){correctionModal(id);return;}
      if(act==='clear-correction'){delete f().overrides[id];persist();render();return;}
      if(act==='plan'){planModal(id);return;}
      if(act==='source'){sourceModal(id);return;}
      if(act==='generate'){await generate();return;}
      if(act==='period-preset'){
        const form=$('#schedule-form');form.elements.days.value=target.dataset.days;form.elements.weeks.value=Number((Number(target.dataset.days)/7).toFixed(2));updateScheduleForm(form,'days');return;
      }
      if(['adopt','dismiss','unadopt','restore-plan'].includes(act)){
        const p=planById(id);if(!p)return;
        if(act==='adopt'||act==='unadopt'){const next=G.setIncluded(C,state,p,act==='adopt');state.plans=state.plans.map(x=>x.id===p.id?next:x);persist();render();toast(act==='adopt'?'已加入本轮计划，可前往今日任务登记成果。':'已取消加入，建议和已有成果会保留。');return;}
        if(act==='restore-plan'&&currentPlans().some(x=>x.id!==p.id&&['suggested','adopted'].includes(x.status)&&(x.requirementKeys||[x.requirementKey]).filter(Boolean).some(key=>(p.requirementKeys||[p.requirementKey]).includes(key))))throw Error('当前已有对应要求的建议或任务，请使用现有内容。');
        p.status={dismiss:'dismissed',unadopt:'suggested','restore-plan':'suggested'}[act];persist();render();return;
      }
      if(act==='outcome'){outcomeModal(id);return;}
      if(act==='feedback'){feedbackModal(id);return;}
      if(act==='feedback-plan'){
        const record=state.feedback.find(x=>x.id===id);if(record.folderId)state.activeFolderId=record.folderId;
        planModal('',{title:record.title,reason:'来自本人复盘：'+record.note,steps:lines(record.next).map(text=>({id:C.uid('step'),text,done:false})),output:'一份针对问题的实践记录',criteria:'回答复盘中提出的问题，并记录实际行动与结果'});return;
      }
      if(act==='download-file'||act==='open-file'){await openFile(id,act==='download-file');return;}
      if(act==='export-backup'){target.disabled=true;try{await exportBackup();}finally{target.disabled=false;}return;}
      if(act==='reset'){
        if(!confirm('清空当前演示账户的记录和文件？其他账户会保留，建议先导出备份。'))return;
        state=C.fresh();persist();await fileRequest('readwrite',store=>store.clear());closeModal();render();toast('已重置当前版本。');return;
      }
    }catch(error){toast(error.message);console.error(error);}
  });
  function updateScheduleForm(form,changed){
    const start=form.elements.start.value;let days=Number(form.elements.days.value);
    if(changed==='weeks')days=Math.max(1,Math.round(Number(form.elements.weeks.value)*7));
    if(changed==='end')days=C.daysBetween(start,form.elements.end.value);
    if(!start||!Number.isFinite(days)||days<1||days>730){$('#schedule-summary').textContent='请设置 1–730 天的有效周期。';return;}
    form.elements.days.value=days;form.elements.weeks.value=Number((days/7).toFixed(2));form.elements.end.value=C.endDate({start,days});
    $('#schedule-summary').textContent='共 '+days+' 天 · 可投入 '+Number((days*Number(form.elements.dailyHours.value)).toFixed(2))+' 小时';
    $$('.schedule-presets .choice').forEach(b=>b.classList.toggle('selected',Number(b.dataset.days)===days));
  }
  document.addEventListener('change',event=>{
    try{
      const el=event.target;
      if(el.closest('#bank-confirm-form')&&(el.name==='mode'||el.name==='targetId')){const form=el.form,d=pendingRecognition,target=expById(form.elements.targetId.value),update=form.elements.mode.value==='update';$('.bank-target',form).hidden=!update;if(update&&target){form.elements.title.value=target.title;form.elements.type.value=target.type;form.elements.description.value=target.description+'\n\n补充成果：\n'+d.description;}else if(!update){form.elements.title.value=d.title;form.elements.type.value=d.type;form.elements.description.value=d.description;}return;}
      if(el.closest('#revise-task-form')&&['hours','resource'].includes(el.name)){$('#revise-task-form > .actions button[type=submit]').disabled=true;return;}
      if(el.dataset.recruitmentScope){setRecruitmentFilter(el);return;}
      if(el.matches('[data-pool-source]')){jobFilters.source=el.value;$('#job-results').innerHTML=jobCards();return;}
      if(el.matches('[data-manual-category]')){const roles=T.groups.find(g=>g.name===el.value)?.roles||T.groups.flatMap(g=>g.roles);formRoleUpdate(el.form,roles);return;}
      if(el.matches('select[data-job-filter]')){jobFilters[el.dataset.jobFilter]=el.value;$('#job-results').innerHTML=jobCards();return;}
      if(el.matches('[data-ai-consent]')){aiConsent=el.checked;return;}
      if(el.dataset.jdSelected){const set=new Set(f().selectedJobIds||[]);if(el.checked)set.add(el.dataset.jdSelected);else set.delete(el.dataset.jdSelected);f().selectedJobIds=[...set];persist();render();return;}
      if(el.matches('[data-today-folder]')){todayFolder=el.value;render();return;}
      if(el.matches('[data-folder-select]')){pendingRecognition=null;workbenchId='';state.activeFolderId=el.value;persist();render();return;}
      if(el.matches('[data-coach-step]')){const t=coachingTarget();openCoach(t.p.id,el.value,'',coachContext.tab);return;}
      if(el.matches('[data-daily-date]')){if(!el.value)return;dailyView=el.value;calendarAnchor=el.value;companionMessage='';render();return;}
      if(el.dataset.step){const plan=planById(el.dataset.plan),step=plan?.steps.find(s=>s.id===el.dataset.step);if(step){step.done=el.checked;persist();render();}return;}
      if(el.closest('#schedule-form'))updateScheduleForm(el.form,el.dataset.schedule||el.name);
    }catch(error){toast(error.message);render();}
  });
  document.addEventListener('input',event=>{
    if(event.target.closest('#coach-question-form')){coachQuestion=event.target.value;event.target.style.height='auto';event.target.style.height=Math.min(120,event.target.scrollHeight)+'px';}
    if(event.target.closest('#coach-accept-form')){const t=coachingTarget(),match=event.target.name.match(/^(title|method)-(\d+)$/);if(t?.thread?.draft&&match){t.thread.draft.steps[Number(match[2])][match[1]]=event.target.value;persist();}}
    if(event.target.dataset.recruitmentScope){setRecruitmentFilter(event.target);return;}
    if(event.target.matches('[data-job-filter]')){jobFilters[event.target.dataset.jobFilter]=event.target.value;$('#job-results').innerHTML=jobCards();}
    if(event.target.closest('#schedule-form'))updateScheduleForm(event.target.form,event.target.dataset.schedule||event.target.name);
  });
  document.addEventListener('submit',async event=>{
    event.preventDefault();const form=event.target,values=new FormData(form),id=form.getAttribute('id'),v=name=>String(values.get(name)||'').trim();
    const submitter=event.submitter;let uploaded=[];let saved=false;
    try{
      if(submitter)submitter.disabled=true;savingForm=id!=='login-form';
      for(const name of ['sourceUrl','link','url'])if(v(name)&&!safeUrl(v(name)))throw new Error('来源或作品链接需要以 http:// 或 https:// 开头。');
      if(id==='login-form'){
        if(authStage==='email'){authEmail=authMethod==='email'?A.email(v('email')):A.phone(v('callingCode')+v('phone'));authChallenge=A.challenge(authEmail,Date.now(),authMethod);authStage='code';renderLogin();return;}
        const address=A.verify(authChallenge,v('code'));let a=accountDB.accounts.find(a=>a[authMethod]===address);if(!a)a=(authMethod==='phone'?A.createPhone:A.create)(localStorage,accountDB,address,v('nickname'),()=>C.fresh(),C.uid);formSnapshots.set(form,snapshotForm(form));enterAccount(a.id);return;
      }
      if(!A.account(accountDB))return;
      if(id==='account-profile-form'){A.profile(localStorage,accountDB,{nickname:v('nickname'),avatar:v('avatar')});closeModal();render();toast('个人设置已保存。');return;}
      if(id==='account-prefs-form'){state.notification={enabled:values.has('enabled'),time:v('time')};state.companion={...state.companion,still:values.has('still'),collapsed:values.has('collapsed')};persist();closeModal();render();toast('提醒与咕噜设置已保存。');return;}
      if(id==='coach-question-form'){askCurrentTask(v('question'));return;}
      if(id==='coach-accept-form'){
        const t=coachingTarget(),rows=t.thread.draft.steps.map((r,i)=>({...r,title:values.has('title-'+i)?v('title-'+i):r.title,method:values.has('method-'+i)?v('method-'+i):r.method}));HC.accept(state,t.p.id,t.step.id,rows,C.today());coachContext.editDraft=false;persist();renderCoach();return;
      }
      if(id==='revise-task-form'){
        const p=planById(v('id'));if(!p||p.folderId!==f()?.id)throw Error('当前任务或方向已变化。');
        if(!values.has('confirmed')||!form.dataset.proposal)throw Error('请先查看方案并确认。');
        if(form.dataset.proposalInput!==JSON.stringify([form.elements.hours.value,form.elements.resource.value]))throw Error('条件已变化，请重新查看方案。');
        const n=JSON.parse(form.dataset.proposal);p.history ||= [];p.history.push({title:p.title,hours:p.hours,output:p.output,steps:p.steps,date:C.today()});p.title=n.title;p.hours=n.hours;p.output=n.output;p.criteria=n.criteria;p.steps=n.steps.map(text=>({id:C.uid('step'),text,done:false}));p.userEdited=true;persist();closeModal();render();toast('已按你确认的条件调整任务。');return;
      }else if(id==='bank-confirm-form'){saveBankForm(form,values);return;
      }else if(id==='auto-collect-form'){
        collectBusy=true;collectionMessage='正在获取公开岗位，请稍候…';if(submitter)submitter.textContent='正在自动采集…';
        const result={jobs:C.filterJobs(E.create(C).customJobs,collectionFilters),scope:'前端示例岗位，未执行实际采集'};const counts=result.jobs.length?ingestJobs(result.jobs,null):{added:0,duplicate:0,updated:0};collectBusy=false;collectionMessage='采集完成：新增 '+counts.added+' 个岗位，已有 '+counts.duplicate+' 个；'+result.scope+'。你可以筛选并收藏到方向文件夹。'+(result.jobs.length?'':'当前条件未找到岗位，请调整关键词。');
      }else if(id==='import-jds-form'||id==='fetch-jds-form'){
        let items;
        if(id==='import-jds-form'){
          const file=form.elements.jdFile.files[0];if(file&&file.size>1500000)throw Error('JSON 文件过大。');
          const parsed=JSON.parse(file?await file.text():v('json'));items=Array.isArray(parsed)?parsed:parsed.jobs;
        }else{
          const urls=lines(v('urls'));if(urls.some(url=>!safeUrl(url)))throw Error('请提供有效的 HTTP/HTTPS 链接。');
          const result=await api('/api/fetch-jobs',{urls});acquisitionReport=result.results;
          items=result.results.filter(x=>x.ok).map(x=>x.job);
          if(!items.length)throw Error('本批链接均未能读取。可以导入已采集的 JSON，或手动粘贴 JD。');
        }
        const folder=v('folderId')==='new'?newFolder(v('newName')):state.folders.find(x=>x.id===v('folderId'));
        if(!folder)throw Error('请选择或新建方向文件夹。');
        const counts=ingestJobs(items,folder);toast('新增 '+counts.added+' 条，更新 '+counts.updated+' 条，复用 '+counts.duplicate+' 条。请勾选本轮 JD。');
      }else if(id==='folder-form'){
        const folder=state.folders.find(x=>x.id===v('id'));
        if(folder){const name=v('name');if(!name)throw new Error('请填写方向名称。');if(state.folders.some(x=>x.id!==folder.id&&x.name.toLowerCase()===name.toLowerCase()))throw new Error('同名方向已经存在。');folder.name=name;folder.city=v('city');}
        else newFolder(v('name'),v('city'));
      }else if(id==='collect-form'){
        const folder=v('folderId')==='new'?newFolder(v('newName')):state.folders.find(x=>x.id===v('folderId'));
        if(!folder)throw new Error('请选择或创建一个方向文件夹。');
        folder.jobIds=[...new Set(folder.jobIds.concat(v('jobId')))];folder.selectedJobIds=[...new Set((folder.selectedJobIds||[]).concat(v('jobId')))];folder.archivedIds=(folder.archivedIds||[]).filter(x=>x!==v('jobId'));state.activeFolderId=folder.id;
      }else if(id==='job-form'){
        const title=v('title'),company=v('company'),rawJD=v('rawJD');
        if(!title||!company||!rawJD)throw new Error('请填写岗位名称、公司和 JD 原文。');
        const requirements=lines(v('requirements')).map(line=>{
          const must=/^\[(必备|required)\]/i.test(line),clean=line.replace(/^\[(必备|required)\]\s*/i,''),parts=clean.split('|'),label=parts.shift().trim(),quote=parts.join('|').trim()||label;
          if(!label)throw new Error('要求名称不能为空。');
          return {key:'custom-'+label.toLowerCase().replace(/\s+/g,''),label,quote,must,dimension:C.classify(label+' '+quote)};
        });

        if(requirements.some(r=>!rawJD.replace(/\s/g,'').includes(r.quote.replace(/\s/g,''))))throw new Error('有要求摘录未在 JD 原文中找到。请核对“|”后面的原文，或将准确原文补充到 JD。');
        const salaryMin=v('salaryMin')?Number(v('salaryMin')):null,salaryMax=v('salaryMax')?Number(v('salaryMax')):null;
        if((salaryMin!==null&&(!Number.isFinite(salaryMin)||salaryMin<0))||(salaryMax!==null&&(!Number.isFinite(salaryMax)||salaryMax<0))||(salaryMin!==null&&salaryMax!==null&&salaryMin>salaryMax))throw Error('薪资区间无效，请核对原文。');
        const old=state.customJobs.find(j=>j.id===v('id')),job=Object.assign({},old,{id:old?.id||C.uid('job'),title,company,rawJD,city:v('city'),jobType:v('jobType'),jobCategory:v('jobCategory'),role:v('role'),district:v('district'),experience:v('experience'),education:v('education'),industry:v('industry'),companySize:v('companySize'),financing:v('financing'),salary:v('salaryText'),salaryMin,salaryMax,salaryCurrency:v('salaryCurrency'),salaryPeriod:v('salaryPeriod'),acquisition:old?.acquisition||'manual',sourceUrl:v('sourceUrl'),capturedAt:v('capturedAt'),requirements,demo:false});
        if(state.customJobs.some(j=>j.id!==job.id&&j.title===job.title&&j.company===job.company&&j.city===job.city))throw new Error('相同公司、岗位和城市已经存在，请编辑原岗位。');
        if(old){state.jobSnapshots ||= {};state.jobSnapshots[job.id] ||= [];state.jobSnapshots[job.id].push(old);state.customJobs=state.customJobs.map(j=>j.id===job.id?job:j);}
        else{state.customJobs.push(job);const folder=state.folders.find(f=>f.id===v('folderId'));if(folder){folder.jobIds.push(job.id);folder.selectedJobIds=(folder.selectedJobIds||[]).concat(job.id);state.activeFolderId=folder.id;}}
      }else if(id==='resume-form'){
        const file=form.elements.resume.files[0];if(!file)throw new Error('请先选择简历。');
        if(file.size>15*1024*1024)throw new Error('简历文件不能超过 15 MB。');
        $('#resume-progress').textContent='正在本机读取文件并提取文字…';
        const raw=(await resumeText(file)).trim();if(raw.length<15)throw new Error('没有足够文字用于建立经历，请检查文件。');
        const duplicate=state.materials.find(m=>m.raw===raw);if(duplicate)throw new Error('这份简历内容已经导入，请核查已有草稿，避免重复。');
        uploaded=await storeFiles([file]);const materialId=C.uid('material');
        const drafts=C.extractDrafts(raw,materialId);if(!drafts.length)throw new Error('未找到可提取段落，请粘贴文字后再试。');
        state.materials.push({id:materialId,title:file.name,raw,fileId:uploaded[0].id,date:C.today()});state.experiences.push(...drafts);
      }else if(id==='paste-resume-form'){
        const raw=v('raw');if(raw.length<15)throw new Error('请粘贴完整的经历文字。');
        if(state.materials.some(m=>m.raw===raw))throw new Error('相同文字已导入，请检查已有草稿。');
        const materialId=C.uid('material'),drafts=C.extractDrafts(raw,materialId);if(!drafts.length)throw new Error('未找到可提取内容。');
        state.materials.push({id:materialId,title:v('title'),raw,date:C.today()});state.experiences.push(...drafts);
      }else if(id==='experience-form'||id==='quick-experience-form'){
        const old=expById(v('id')),description=v('description'),title=v('title');
        if(!title||!description)throw new Error('请填写名称和真实经历内容。');
        const sourceOutcomeId=v('sourceOutcomeId')||old?.sourceOutcomeId||'';
        if(!old&&sourceOutcomeId&&state.experiences.some(e=>e.sourceOutcomeId===sourceOutcomeId))throw new Error('该成果已有对应经历，请编辑已有条目。');
        const exp=Object.assign({},old,{id:old?.id||C.uid('exp'),title,description,type:C.experienceType(v('type')||'项目经历'),period:v('period'),link:v('link'),confirmed:values.has('confirmed'),sourceMaterialId:v('sourceMaterialId')||old?.sourceMaterialId||'',sourceOutcomeId,revision:(old?.revision||0)+1});
        if(old)state.experiences=state.experiences.map(e=>e.id===old.id?exp:e);else state.experiences.push(exp);
      }else if(id==='correction-form'){
        const row=C.matchResults(state).find(r=>r.key===v('key'));if(!row)throw Error('本轮要求已变化，请重试。');
        const status=v('status'),evidenceIds=values.getAll('evidenceIds'),valid=new Set(C.personalDocuments(state).map(e=>e.id));
        if(!matchLabels[status]||evidenceIds.some(id=>!valid.has(id)))throw Error('纠正内容无效。');
        if(['supported','partial'].includes(status)&&!evidenceIds.length)throw Error('请关联至少一项个人材料作为依据。');
        f().overrides ||= {};f().overrides[row.key]={signature:C.inputSignature(state),status,evidenceIds,note:v('note')};
      }else if(id==='daily-reminder-form'){
        if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(v('time')))throw Error('请选择有效的提醒时间。');f().reminder={enabled:values.has('enabled'),time:v('time')};
      }else if(id==='daily-time-form'){
        D.arrangeAll(C,state,{minutes:Number(v('minutes'))});if(coachContext)coachContext.slotId=f().execution.items.find(x=>x.stepId===coachContext.stepId&&x.date===C.today()&&!x.done)?.id||'';dailyView=C.today();companionMessage='已按今天的时间重新安排。完成过的记录和成果都会保留。';
      }else if(id==='daily-budget-form'){
        D.arrangeAll(C,state,{dailyHours:Number(v('dailyHours')),minutes:Math.max(0,Number(v('dailyHours'))*60-D.sharedBudget(C,state).doneMinutes)});
      }else if(id==='schedule-form'){
        const sc={start:v('start'),days:Number(v('days')),dailyHours:Number(v('dailyHours'))};
        if(!sc.start||!Number.isInteger(sc.days)||sc.days<1||sc.days>730||sc.dailyHours<.25||sc.dailyHours>16||C.endDate(sc)!==v('end'))throw new Error('时间安排不一致，请重新设置周期和日期。');
        f().schedule=sc;
      }else if(id==='plan-form'){
        const old=planById(v('id')),steps=lines(v('steps')).map((text,i)=>{const prior=old?.steps[i];return {id:prior?.id||C.uid('step'),text,done:prior?.text===text?prior.done:false};});
        if(!steps.length||!v('title')||!v('output')||!v('criteria'))throw new Error('请填写名称、预期成果、完成标准和执行步骤。');
        const hours=Number(v('hours'));if(!Number.isFinite(hours)||hours<.25||hours>500)throw new Error('预计投入需要在 0.25–500 小时之间。');
        const ids=values.getAll('referenceIds'),row=C.matchResults(state).find(r=>r.key===(old?.requirementKey||v('requirementKey'))),references=state.sources.concat(old?.retrievalDemo?old.references||[]:[]).filter(r=>ids.includes(r.id)&&(old?.retrievalDemo||!row||C.caseSupports(row,r,f())));
        const auto=old&&old.origin!=='自定义任务'&&!old.retrievalDemo;
        if(auto&&values.has('verifiedPlan')&&!C.reviewed(state))throw new Error('请先选择本轮 JD 并导入个人材料，再调整任务依据。');
        const learningLinks=lines(v('learningLinks')).map(line=>{const parts=line.split('|'),url=parts.pop().trim(),title=parts.join('|').trim()||url;if(!safeUrl(url))throw Error('学习材料链接需要以 HTTP 或 HTTPS 开头。');return {title,url};});
        const next=Object.assign({},old,{userEdited:!!old?.growthVersion,learningLinks,id:old?.id||C.uid('plan'),folderId:old?.folderId||f().id,title:v('title'),hours,output:v('output'),criteria:v('criteria'),reason:v('reason'),relevance:v('relevance'),week:v('week')||'周期内',steps,status:old?.status||'suggested',origin:old?.origin||'自定义任务',requirementKey:old?.requirementKey||v('requirementKey'),references,referencePending:auto?!references.length:false});
        if(auto&&values.has('verifiedPlan')){next.signature=C.signature(state);const row=reqs().find(r=>r.key===next.requirementKey);if(row)next.sources=row.sources;}
        if(old&&old.status==='completed'&&steps.some(s=>!s.done))throw new Error('已完成任务的执行步骤不能改为未完成；可新建后续任务。');
        if(old)state.plans=state.plans.map(p=>p.id===old.id?next:p);else state.plans.push(next);
      }else if(id==='outcome-form'){
        const files=[...form.elements.files.files];uploaded=await storeFiles(files);
        const old=state.outcomes.find(o=>o.id===v('id')),keep=new Set(values.getAll('keepFile'));
        const links=lines(v('links')).map(line=>{const parts=line.split('|'),url=parts.pop().trim();if(!safeUrl(url))throw Error('成果链接需要以 HTTP 或 HTTPS 开头。');return {label:parts.join('|').trim()||url,url};});
        const outcome=W.saveOutcome(C,state,{id:v('id'),planId:v('planId'),title:v('title'),description:v('description'),text:v('text'),links,attachments:(old?.attachments||[]).filter(a=>keep.has(a.id)).concat(uploaded),process:v('process'),method:v('method'),reflection:v('reflection')});workbenchId=outcome.id;
      }else if(id==='feedback-form'){
        const old=state.feedback.find(x=>x.id===v('id')),folderId=v('folderId'),task=planById(v('taskId'));
        if(task&&folderId&&task.folderId!==folderId)throw new Error('所选任务属于另一方向，请调整方向或取消任务关联。');
        const record=Object.assign({},old,{id:old?.id||C.uid('feedback'),title:v('title'),note:v('note'),type:v('type'),folderId,taskId:v('taskId'),url:v('url'),next:v('next'),date:C.today()});
        if(old)state.feedback=state.feedback.map(x=>x.id===old.id?record:x);else state.feedback.push(record);
      }else if(id==='source-form'){
        if(!values.has('verified'))throw new Error('请先核查材料的适用性。');
        const source={id:C.uid('source'),folderId:f().id,title:v('title'),url:v('url'),type:v('type'),dimensions:[v('dimension')],summary:v('summary'),lesson:v('lesson'),application:v('application'),userProvided:true,checked:C.today()};state.sources.push(source);const plan=planById(v('planId')),row=C.matchResults(state).find(r=>r.key===plan?.requirementKey);if(plan&&row&&C.caseSupports(row,source,f())){plan.references=(plan.references||[]).concat(source);plan.referencePending=false;}
      }else return;
      persist();saved=true;closeModal();
      if(id==='outcome-form'){accumulationTab='outcomes';navigate('review');if(submitter?.value==='sync'){await startOutcomeSync(workbenchId);return;}}else render();
      if(id==='resume-form'||id==='paste-resume-form'){$('#library')?.setAttribute('open','');toast('已导入个人材料，匹配结果已自动更新；可按需校正经历内容。');}
      else if(id==='correction-form')toast('本人纠正已保存；无需逐项确认其他结果。');
      else if(id==='source-form')toast('材料已保存，可在任务编辑中关联并核查依据。');
      else toast('已保存。');
    }catch(error){
      if(id==='login-form'){const errorEl=$('#auth-error');if(errorEl)errorEl.textContent=error.message;}
      if(!saved)state=JSON.parse(lastSaved);
      if(uploaded.length&&!saved)await Promise.allSettled(uploaded.map(a=>removeFile(a.id)));
      const progress=$('#resume-progress');if(progress)progress.textContent=error.message;
      if(id==='fetch-jds-form'&&acquisitionReport.length&&form.isConnected){const prior=$('.fetch-errors',form);if(prior)prior.remove();const note=document.createElement('div');note.className='fetch-errors notice warn';note.innerHTML=acquisitionReport.map(r=>'<p>'+esc(r.url)+' · '+esc(r.error||'已读取')+'</p>').join('');form.appendChild(note);}
      if(id==='auto-collect-form'){collectionMessage='采集未完成：'+error.message;collectBusy=false;render();}toast(error.message);console.error(error);
    }finally{collectBusy=false;savingForm=false;if(submitter?.isConnected)submitter.disabled=false;}
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing&&event.target.matches('#task-question')){event.preventDefault();event.target.form.requestSubmit();return;}
    if(event.key==='Escape'){if($('.modal')){closeModal();return;}if(coachContext){coachContext=null;renderCoach();return;}if(guluOpen){guluOpen=false;updateGulu();}closeModal();return;}
    if(event.key==='Tab'&&$('.modal')){
      const all=$$('button,input,textarea,select,a[href]', $('.modal')).filter(x=>!x.disabled&&x.type!=='hidden'&&x.getClientRects().length);
      if(!all.length)return;const first=all[0],last=all.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  });
  $('#mobile-menu').addEventListener('click',()=>document.body.classList.toggle('nav-open'));
  guluWidget=GP.mount({root:$('#gulu-root'),getPrefs:()=>state.companion||{},savePrefs:pref=>{state.companion=pref;persist();},onToggle:()=>{state.companion={...state.companion,collapsed:false};guluOpen=!guluOpen;guluMode='daily';companionMessage='';lastGuluMessage='';persist();updateGulu();}});
  render();
})();
