/* Frontend account simulation only. No email, credentials, server session or access control. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.GrowPilotAccounts=api;})(globalThis,function(){
 'use strict';
 const KEY='growpilot-demo-accounts-v1',DEFAULT='demo-existing',EMPTY='demo-new';
 const clone=x=>JSON.parse(JSON.stringify(x));
 const email=v=>String(v||'').trim().toLowerCase();
 const validEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email(v))&&email(v).length<=254;
 function bootstrap(storage,legacy,fresh){
  const raw=storage.getItem(KEY);if(raw){const db=JSON.parse(raw);if(db.version!==1||!Array.isArray(db.accounts)||!db.workspaces)throw Error('演示账户数据格式无法读取，请先保留浏览器数据。');if(!db.accounts.some(a=>a.id===db.sessionId))db.sessionId='';return db;}
  const db={version:1,sessionId:'',accounts:[{id:DEFAULT,email:'lin@example.com',nickname:'小林',avatar:'林',visited:false},{id:EMPTY,email:'new@example.com',nickname:'新同学',avatar:'新',visited:false}],workspaces:{[DEFAULT]:clone(legacy),[EMPTY]:fresh()}};
  storage.setItem(KEY,JSON.stringify(db));return db;
 }
 function account(db){return db.accounts.find(a=>a.id===db.sessionId)||null;}
 function write(storage,db){storage.setItem(KEY,JSON.stringify(db));}
 function save(storage,db,state){const a=account(db);if(!a)throw Error('请先登录演示账户。');const before=db.workspaces[a.id];db.workspaces[a.id]=clone(state);try{write(storage,db);}catch(e){db.workspaces[a.id]=before;throw e;}}
 function enter(storage,db,id){const a=db.accounts.find(a=>a.id===id);if(!a)throw Error('该演示账户不存在。');const prev=db.sessionId;db.sessionId=id;try{write(storage,db);}catch(e){db.sessionId=prev;throw e;}return clone(db.workspaces[id]);}
 function logout(storage,db){const prev=db.sessionId;db.sessionId='';try{write(storage,db);}catch(e){db.sessionId=prev;throw e;}}
 function create(storage,db,address,nickname,fresh,uid){address=email(address);if(!validEmail(address))throw Error('请输入有效的邮箱地址。');if(db.accounts.some(a=>a.email===address))throw Error('该邮箱已有演示账户，请直接登录。');if(!nickname.trim()||nickname.trim().length>20)throw Error('昵称需要为 1–20 个字符。');const a={id:uid('account'),email:address,nickname:nickname.trim(),avatar:nickname.trim().slice(0,1),visited:false};db.accounts.push(a);db.workspaces[a.id]=fresh();try{write(storage,db);}catch(e){db.accounts.pop();delete db.workspaces[a.id];throw e;}return a;}
 function profile(storage,db,{nickname,avatar}){const a=account(db);if(!a)throw Error('请先登录。');nickname=String(nickname||'').trim();if(!nickname||nickname.length>20)throw Error('昵称需要为 1–20 个字符。');const prev={...a};a.nickname=nickname;a.avatar=String(avatar||nickname.slice(0,1)).slice(0,2);try{write(storage,db);}catch(e){Object.assign(a,prev);throw e;}return a;}
 function challenge(address,now=Date.now()){if(!validEmail(address))throw Error('请输入有效的邮箱地址。');return {email:email(address),expiresAt:now+600000,resendAt:now+60000};}
 function verify(ch,code,now=Date.now()){if(!ch)throw Error('请先获取演示验证码。');if(now>ch.expiresAt)throw Error('演示验证码已过期，请重新获取。');if(String(code).trim()!=='123456')throw Error('验证码不正确，请输入页面提示的演示码 123456。');return ch.email;}
 const databaseName=id=>id===DEFAULT?'internpilot-files':'growpilot-files-'+id;
 return {KEY,DEFAULT,EMPTY,bootstrap,account,save,enter,logout,create,profile,challenge,verify,validEmail,email,databaseName};
});
