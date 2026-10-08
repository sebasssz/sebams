import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {startBridge} from '../../Sebams-Bridge/server.mjs';
import {Client} from '../../Sebams-Bridge/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import {StreamableHTTPClientTransport} from '../../Sebams-Bridge/node_modules/@modelcontextprotocol/sdk/dist/esm/client/streamableHttp.js';
const {chromium}=await import(process.env.SEBAMS_PLAYWRIGHT_PACKAGE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),qa=process.env.SEBAMS_QA_DIR||path.join(root,'work','bridge');await fs.mkdir(qa,{recursive:true});
let sent;const bridge=await startBridge({directory:await fs.mkdtemp(path.join(qa,'service-')),apiKey:'fixture-key-never-sent-online',fetchImpl:async(_url,options)=>{sent=JSON.parse(options.body);return Response.json({status:'completed',model:'offline-fixture',steps:[{type:'model_output',content:[{type:'text',text:'Ejemplo de prueba: x = 2.\n1. Resta 1 a ambos lados.\n2. Comprueba: 2 + 1 = 3.'}]}]});}});
const context=await chromium.launchPersistentContext(path.join(qa,'chrome-'+Date.now()),{executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,viewport:{width:1440,height:900},ignoreDefaultArgs:['--disable-extensions'],args:['--enable-unsafe-extension-debugging']});
let page=context.pages()[0];const cdp=await context.browser().newBrowserCDPSession(),{id}=await cdp.send('Extensions.loadUnpacked',{path:root}),url=`chrome-extension://${id}/newtab.html`,results=[],errors=[];
page.on('pageerror',error=>errors.push(error.message));const button=name=>page.getByRole('button',{name,exact:true});
const client=new Client({name:'browser-bridge-qa',version:'1.0.0'});
const input={text:'Resolver ejercicio de álgebra',priority:'low',dueDate:'2026-10-20',workspace:'study',list:'Inbox',operationId:'browser-operation-01'};
const value=result=>result.structuredContent||JSON.parse(result.content[0].text);
const state=()=>page.evaluate(async()=>(await import('./lib/store.js')).getState());
async function test(name,fn){try{await fn();results.push({name,status:'pass'});console.log('PASS',name);}catch(error){results.push({name,status:'fail',error:error.message});throw error;}}
try{
 await page.goto(url);await page.locator('#welcome-skip').click();await page.locator('#welcome').waitFor({state:'hidden'});
 // Headless Chrome cannot show native permission consent; only that consent gate is a fixture.
 await page.evaluate(()=>{chrome.permissions.request=async()=>true;chrome.permissions.contains=async()=>true;});
 await page.locator('#settings-open').click();await button('AI').click();await page.getByLabel('Bridge connection code',{exact:true}).fill(bridge.token);await button('Connect Sebams Bridge').click();await page.getByText('Connected · gemini-3.8-flash',{exact:true}).waitFor();await button('Close panel').click();
 await client.connect(new StreamableHTTPClientTransport(new URL(bridge.url+'/mcp'),{requestInit:{headers:{Authorization:'Bearer '+bridge.token}}}));
 let created;
 await test('MCP SDK creates a task and the real local service delivers its metadata to Chrome',async()=>{
  const prepared=value(await client.callTool({name:'prepare_task',arguments:{text:input.text}}));assert.equal(prepared.ready,false);assert.equal(prepared.questions.length,4);
  created=value(await client.callTool({name:'create_task',arguments:input}));await page.evaluate(async()=>(await import('./lib/bridge-sync.js')).receiveBridgeTasks());
  const task=(await state()).workspaces.study.tasks.find(t=>t.sourceId===created.task.id);assert.equal(task.text,input.text);assert.equal(task.priority,'low');assert.equal(task.dueDate,input.dueDate);assert.equal(bridge.store.snapshot().tasks.length,0);
 });
 await test('Real localhost HTTP sends task photos through the production solver and saves the answer',async()=>{
  await page.evaluate(async()=>{await(await import('./lib/store.js')).mutate(s=>{s.workspace='study';});});
  await page.locator('#tasks-open').click();await button('Open '+input.text).click();await page.getByLabel('Task details',{exact:true}).fill('Resuelve x + 1 = 3.');await page.getByLabel('Attach task photos',{exact:true}).setInputFiles(path.join(root,'assets/backgrounds/alpine.jpg'));await page.locator('.task-photo img').waitFor();await button('Ask AI').click();await page.locator('.ai-answer').waitFor();
  assert.equal(sent.store,false);assert.match(sent.input[0].text,/Resuelve x/);assert.equal(sent.input[1].mime_type,'image/jpeg');assert.ok(sent.input[1].data.length>100);const task=(await state()).workspaces.study.tasks[0];assert.match(task.ai.text,/x = 2/);assert.equal(task.done,false);await page.screenshot({path:path.join(qa,'tasks-ai-preview.png')});await button('Close panel').click();
 });
 await test('Deleted imports stay deleted on redelivery, bad batches are atomic, and orphan photos survive Undo then expire',async()=>{
  const before=(await state()).workspaces.study.tasks[0],attachment=before.attachments[0].id;
  await page.evaluate(async()=>{const store=await import('./lib/store.js');await store.mutate(s=>{s.workspaces.study.tasks=[];});});
  const receipt=await page.evaluate(async item=>(await import('./lib/store.js')).reconcileBridgeTasks([item]),{id:created.task.id,text:input.text,priority:input.priority,dueDate:input.dueDate,workspace:input.workspace,list:input.list});
  assert.equal(receipt.added,0);assert.equal((await state()).workspaces.study.tasks.length,0);
  const batch=[{id:'good-before-bad',text:'Good',priority:'normal',dueDate:'',workspace:'study',list:'Inbox'},{id:'bad-second',text:'Bad',priority:'normal',dueDate:'2026-02-30',workspace:'study',list:'Inbox'}];
  const rejected=await page.evaluate(async items=>{try{await(await import('./lib/store.js')).reconcileBridgeTasks(items);return false;}catch{return true;}},batch);assert.equal(rejected,true);assert.equal((await state()).workspaces.study.tasks.length,0);
  await page.evaluate(async()=>{await(await import('./lib/store.js')).pruneTaskAttachments(100000);});assert.ok(await page.evaluate(async id=>!!await(await import('./lib/store.js')).getTaskAttachment(id),attachment));
  await page.evaluate(async task=>{await(await import('./lib/store.js')).mutate(s=>s.workspaces.study.tasks.push(task));await(await import('./lib/store.js')).pruneTaskAttachments(160001);},before);assert.ok(await page.evaluate(async id=>!!await(await import('./lib/store.js')).getTaskAttachment(id),attachment));
  await page.evaluate(async()=>{const store=await import('./lib/store.js');await store.mutate(s=>{s.workspaces.study.tasks=[];});await store.pruneTaskAttachments(200000);await store.pruneTaskAttachments(260001);});assert.equal(await page.evaluate(async id=>!!await(await import('./lib/store.js')).getTaskAttachment(id),attachment),false);
 });
 await test('Chrome alarm receives and acknowledges MCP tasks with every Sebams tab closed',async()=>{
  const worker=context.serviceWorkers().find(w=>w.url().startsWith(`chrome-extension://${id}/`));assert.ok(worker);await worker.evaluate(()=>{chrome.permissions.contains=async()=>true;});await page.close();
  const queued=value(await client.callTool({name:'create_task',arguments:{...input,text:'Repasar con la pestaña cerrada',operationId:'browser-operation-02'}}));
  await worker.evaluate(async()=>{await chrome.alarms.create('sebams-bridge',{when:Date.now()+500});});
  const deadline=Date.now()+15000;while(bridge.store.snapshot().tasks.length&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,200));assert.equal(bridge.store.snapshot().tasks.length,0);
  const tasks=await worker.evaluate(async()=>{const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('sebams-v1',3);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});try{return await new Promise((resolve,reject)=>{const request=db.transaction('data','readonly').objectStore('data').get('state');request.onsuccess=()=>resolve(request.result.workspaces.study.tasks);request.onerror=()=>reject(request.error);});}finally{db.close();}});assert.ok(tasks.some(t=>t.sourceId===queued.task.id));assert.equal(context.pages().filter(p=>p.url().startsWith('chrome-extension://')).length,0);
 });
 assert.deepEqual(errors,[]);console.log('No uncaught page errors.');
}catch(error){console.error(error.stack);process.exitCode=1;if(!page.isClosed())await page.screenshot({path:path.join(qa,'bridge-failure.png')}).catch(()=>{});}
finally{await client.close();await context.close();await new Promise(resolve=>bridge.server.close(resolve));await fs.writeFile(path.join(qa,'bridge-results.json'),JSON.stringify({results,errors,provider:'offline mock; no real Gemini key or account connection'},null,2));}
