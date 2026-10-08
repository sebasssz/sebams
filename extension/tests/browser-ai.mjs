import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.SEBAMS_PLAYWRIGHT_PACKAGE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),qa=process.env.SEBAMS_QA_DIR||path.join(root,'work','qa');await fs.mkdir(qa,{recursive:true});
const context=await chromium.launchPersistentContext(path.join(qa,'ai-'+Date.now()),{executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,viewport:{width:1440,height:900},ignoreDefaultArgs:['--disable-extensions'],args:['--enable-unsafe-extension-debugging']});
const page=context.pages()[0],cdp=await context.browser().newBrowserCDPSession(),{id}=await cdp.send('Extensions.loadUnpacked',{path:root}),url=`chrome-extension://${id}/newtab.html`,results=[],errors=[];
page.on('pageerror',error=>errors.push(error.message));
const token='fixture_connection_code_12345678901234567890';let payload,providerStatus=200,pending=[],acknowledged=[],delaySolve=null;
await context.route('http://127.0.0.1:8787/**',async route=>{
  const req=route.request(),endpoint=new URL(req.url()).pathname;let body={};
  if(req.headers().authorization!=='Bearer '+token)return route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({error:'Invalid connection code.'})});
  if(endpoint==='/health')body={ok:true,configured:false,provider:'Gemini',model:'fixture-vision'};
  if(endpoint==='/solve'){payload=req.postDataJSON();if(delaySolve)await delaySolve;body=providerStatus===200?{text:'Resultado: x = 2.\n\n<img src=x onerror=alert(1)>',model:'fixture-vision',createdAt:Date.now()}:{error:'Add a free Gemini API key in Sebams Bridge.'};}
  if(endpoint==='/tasks/pending')body={tasks:pending};
  if(endpoint==='/tasks/ack'){acknowledged.push(...req.postDataJSON().ids);body={ok:true};}
  if(endpoint==='/workspace')body={ok:true};
  await route.fulfill({status:endpoint==='/solve'?providerStatus:200,contentType:'application/json',body:JSON.stringify(body)});
});
const button=name=>page.getByRole('button',{name,exact:true}),store=()=>page.evaluate(async()=>(await import('./lib/store.js')).getState());
const open=async name=>{await page.locator('#'+name+'-open').click();await page.locator('#panel').waitFor({state:'visible'});},close=async()=>{await button('Close panel').click();await page.locator('#panel').waitFor({state:'hidden'});};
async function test(name,fn){try{await fn();results.push({name,status:'pass'});console.log('PASS',name);}catch(error){results.push({name,status:'fail',error:error.message});throw error;}}
try{
 await page.goto(url);await page.locator('#welcome-skip').click();await page.locator('#welcome').waitFor({state:'hidden'});
 await test('Task details and local photos work without an API key',async()=>{
  await open('tasks');await page.getByLabel('New task',{exact:true}).fill('Resolver álgebra');await button('Add').click();await button('Open Resolver álgebra').click();await page.getByLabel('Task details',{exact:true}).fill('Resuelve x + 1 = 3.');
  await page.getByLabel('Attach task photos',{exact:true}).setInputFiles(path.join(root,'assets/backgrounds/alpine.jpg'));await page.locator('.task-photo img').waitFor();await page.waitForFunction(()=>document.querySelector('.task-photo img').naturalWidth>0);assert.equal((await store()).workspaces.personal.tasks[0].details,'Resuelve x + 1 = 3.');assert.equal((await store()).workspaces.personal.tasks[0].attachments.length,1);
  await button('Ask AI').click();await page.getByText('Connect Sebams Bridge in Settings → AI first.',{exact:true}).waitFor();assert.equal((await store()).workspaces.personal.tasks[0].ai,null);await close();await page.reload();await open('tasks');await button('Open Resolver álgebra').click();assert.equal(await page.getByLabel('Task details',{exact:true}).inputValue(),'Resuelve x + 1 = 3.');await page.locator('.task-photo img').waitFor();await close();
 });
 await test('Connection requests access only when enabled and never stores an API key',async()=>{
  await page.evaluate(()=>{chrome.permissions.request=async()=>true;chrome.permissions.contains=async()=>true;});await open('settings');await button('AI').click();await page.getByLabel('Bridge connection code',{exact:true}).fill('sk-not-a-bridge-code');await button('Connect Sebams Bridge').click();await page.getByText(/Your Gemini API key goes only/).waitFor();
  await page.getByLabel('Bridge connection code',{exact:true}).fill('AIza'+'x'.repeat(35));await button('Connect Sebams Bridge').click();await page.getByText(/Your Gemini API key goes only/).waitFor();await page.getByLabel('Bridge connection code',{exact:true}).fill(token);await button('Connect Sebams Bridge').click();await page.getByText('Connected · add a free Gemini API key in Sebams Bridge to use AI.',{exact:true}).waitFor();const backup=await page.evaluate(async()=>(await import('./lib/store.js')).exportBackup());assert.ok(!JSON.stringify(backup).includes(token));assert.ok(!JSON.stringify(backup).includes('sk-not-a-bridge-code'));await close();
 });
 await test('AI sends selected exercise and photo, saves a plain-text answer and preserves completion',async()=>{
  await open('tasks');await button('Open Resolver álgebra').click();await page.getByLabel('Include reference photos in this AI request',{exact:true}).check();await button('Ask AI').click();await page.locator('.ai-answer').waitFor();assert.equal(payload.task.text,'Resolver álgebra');assert.equal(payload.task.details,'Resuelve x + 1 = 3.');assert.equal(payload.images.length,1);assert.match(payload.images[0].data,/^data:image\/jpeg;base64,/);assert.equal(payload.task.notes,undefined);assert.equal(await page.locator('.ai-answer img').count(),0);assert.match(await page.locator('.ai-answer-text').innerText(),/x = 2/);assert.equal((await store()).workspaces.personal.tasks[0].done,false);await page.screenshot({path:path.join(qa,'task-ai-desktop.png')});
 });
 await test('Provider setup failures retain the previous answer and allow retry',async()=>{
  providerStatus=503;const before=(await store()).workspaces.personal.tasks[0].ai;await button('Ask again').click();await page.getByText('Add a free Gemini API key in Sebams Bridge.',{exact:true}).waitFor();assert.deepEqual((await store()).workspaces.personal.tasks[0].ai,before);assert.equal(await button('Ask again').isEnabled(),true);providerStatus=200;
 });
 await test('Changing an exercise during generation never overwrites the latest task with a stale answer',async()=>{
  const before=(await store()).workspaces.personal.tasks[0].ai;let release;delaySolve=new Promise(resolve=>release=resolve);await button('Ask again').click();await button('Cancel request').waitFor();await page.getByLabel('Task details',{exact:true}).fill('Enunciado actualizado');await button('Save details').click();release();delaySolve=null;
  await page.getByText('This task changed while the AI was working. Send its latest version again.',{exact:true}).waitFor();assert.deepEqual((await store()).workspaces.personal.tasks[0].ai,before);assert.equal((await store()).workspaces.personal.tasks[0].details,'Enunciado actualizado');
 });
 await test('Backups restore task photos, exercise and AI answer atomically; delete undo retains photos',async()=>{
  const backup=await page.evaluate(async()=>(await import('./lib/store.js')).exportBackup());assert.equal(backup.version,2);assert.equal(backup.attachments.length,1);const imageId=backup.attachments[0].id;
  await button('Remove photo alpine.jpg').click();await page.waitForFunction(async()=>(await import('./lib/store.js')).getState().workspaces.personal.tasks[0].attachments.length===0);assert.equal((await store()).workspaces.personal.tasks[0].attachments.length,0);await page.evaluate(async b=>{await(await import('./lib/store.js')).importBackup(b);},backup);await button('Back to tasks').click();await button('Delete Resolver álgebra').click();await page.getByText('Task deleted.',{exact:true}).waitFor();await button('Undo').click();await button('Open Resolver álgebra').click();await page.locator('.task-photo img').waitFor();assert.equal(await page.evaluate(async id=>(await(await import('./lib/store.js')).getTaskAttachment(id)).size,imageId),backup.state.workspaces.personal.tasks[0].attachments[0].size);await close();
 });
 await test('ChatGPT queue keeps metadata, acknowledges saved items and deduplicates redelivery',async()=>{
  pending=[{id:'mcp-algebra-001',text:'Repasar funciones',priority:'high',dueDate:'2026-10-10',list:'Matemáticas',workspace:'study'}];
  await open('settings');await button('AI').click();await button('Check connection').click();await page.waitForFunction(async()=>(await import('./lib/store.js')).getState().workspaces.study.tasks.some(t=>t.sourceId==='mcp-algebra-001'));await button('Check connection').click();const tasks=(await store()).workspaces.study.tasks.filter(t=>t.sourceId==='mcp-algebra-001');assert.equal(tasks.length,1);assert.equal(tasks[0].priority,'high');assert.equal(tasks[0].dueDate,'2026-10-10');assert.equal(tasks[0].list,'Matemáticas');assert.ok(acknowledged.includes('mcp-algebra-001'));pending=[];await close();
 });
 await test('Detail view fits desktop and narrow screens with reachable AI and back controls',async()=>{
  await open('tasks');await button('Open Resolver álgebra').click();for(const [width,height] of [[1440,900],[375,812],[320,568]]){await page.setViewportSize({width,height});const box=await page.locator('#panel').boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=width&&box.y+box.height<=height);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await button('Ask again').scrollIntoViewIfNeeded();assert.ok(await button('Ask again').isVisible());}await page.screenshot({path:path.join(qa,'task-ai-mobile.png')});
 });
 assert.deepEqual(errors,[]);console.log('No uncaught page errors.');
}catch(error){console.error(error.stack);process.exitCode=1;await page.screenshot({path:path.join(qa,'ai-failure.png')}).catch(()=>{});}
finally{await context.close();await fs.writeFile(path.join(qa,'ai-results.json'),JSON.stringify({results,errors},null,2));}
