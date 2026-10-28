import {readFile,readdir,mkdir,rm,writeFile,copyFile} from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(),assets={};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
async function scan(dir){for(const e of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory())await scan(file);else{const key='/'+path.relative(path.join(root,'web'),file).split(path.sep).join('/');assets[key]={type:mime[path.extname(e.name)]||'application/octet-stream',data:(await readFile(file)).toString('base64')};}}}
await scan(path.join(root,'web'));
const config=(await readFile(path.join(root,'worker/ai-config.mjs'),'utf8')).replace(/export const /g,'const ');
const handler=(await readFile(path.join(root,'worker/handler.mjs'),'utf8')).replace(/^import .*;\r?\n/gm,'');
const taxonomy=await readFile(path.join(root,'web/job-taxonomy.js'),'utf8');
const caseCollector=(await readFile(path.join(root,'worker/experience-sources.mjs'),'utf8')).replace(/export (const|function|async function) /g,'$1 ');
const output=caseCollector+'\n'+taxonomy+'\nconst Taxonomy=globalThis.InternPilotTaxonomy;\n'+config+'\n'+handler+'\nconst ASSETS='+JSON.stringify(assets)+';\nexport default {async fetch(request,env,ctx){return new URL(request.url).pathname.startsWith("/api/")?handleAPI(request,env):assetResponse(request,ASSETS);}};\n';
await rm(path.join(root,'dist'),{recursive:true,force:true});await mkdir(path.join(root,'dist/server'),{recursive:true});await mkdir(path.join(root,'dist/.openai'),{recursive:true});
await writeFile(path.join(root,'dist/server/index.js'),output);await copyFile(path.join(root,'.openai/hosting.json'),path.join(root,'dist/.openai/hosting.json'));
console.log('Built Worker with '+Object.keys(assets).length+' retained web assets');
