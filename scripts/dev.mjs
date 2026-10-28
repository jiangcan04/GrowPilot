import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {handleAPI} from '../worker/handler.mjs';
const args=process.argv.slice(2),get=(k,d)=>{const i=args.indexOf(k);return i<0?d:args[i+1];},port=Number(get('--port',process.env.PORT||'8000')),host=get('--host','127.0.0.1');
const root=path.resolve('web'),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
http.createServer(async(req,res)=>{try{
 if(!['localhost','127.0.0.1','terminal.local'].includes(String(req.headers.host).split(':')[0])){res.writeHead(403);res.end();return;}
 const url=new URL(req.url,'http://'+req.headers.host);
 if(url.pathname.startsWith('/api/')){const parts=[];let size=0;for await(const part of req){size+=part.length;if(size>1500000)throw Error('请求过大');parts.push(part);}const init={method:req.method,headers:req.headers};if(!['GET','HEAD'].includes(req.method))init.body=Buffer.concat(parts);const response=await handleAPI(new Request(url,init),process.env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;}
 const target=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 const bytes=await readFile(target);res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream'});res.end(bytes);
 }catch{res.writeHead(404);res.end('Not found');}}).listen(port,host,()=>console.log('InternPilot preview listening on '+host+':'+port));
