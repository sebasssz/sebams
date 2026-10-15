import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath,pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.SEBAMS_PLAYWRIGHT_PACKAGE||'playwright'),root=fileURLToPath(new URL('../',import.meta.url)),qa=process.env.SEBAMS_QA_DIR;
if(!qa)throw Error('Use an isolated QA directory.');await fs.mkdir(qa,{recursive:true});
const {taskService}=await import(pathToFileURL(path.resolve(root,'../../sites/sebams-connect/lib/task-service.js'))),{d1}=await import(pathToFileURL(path.resolve(root,'../../sites/sebams-connect/tests/database.mjs'))),service=taskService(d1(),'transport-fixture');
let context;const results=[],errors=[],check=async(name,fn)=>{await fn();results.push({name,status:'pass'});console.log('PASS',name);};
try{
 context=await chromium.launchPersistentContext(path.join(qa,'profile-'+Date.now()),{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,viewport:{width:1280,height:900},ignoreDefaultArgs:['--disable-extensions'],args:['--enable-unsafe-extension-debugging']});
 const page=context.pages()[0],cdp=await context.browser().newBrowserCDPSession();await page.goto('chrome://extensions/');await page.evaluate(()=>chrome.developerPrivate.updateProfileConfiguration({inDeveloperMode:true}));const {id}=await cdp.send('Extensions.loadUnpacked',{path:root});
 page.on('pageerror',e=>errors.push(e.message));await page.goto(`chrome-extension://${id}/newtab.html`);await page.locator('#welcome-skip').click();await page.locator('#welcome').waitFor({state:'hidden'});
 await page.exposeFunction('fixtureSnapshot',()=>service.snapshot());await page.exposeFunction('fixtureSync',body=>service.sync(body));
 await page.evaluate(async()=>{
  const m=await import('./lib/store.js'),{createTask}=await import('./lib/planner.js');await m.mutate(s=>{s.prefs.remindersOnOpen=false;s.workspaces.personal.tasks=[createTask({id:'local-fixture',text:'Local sync fixture'})];});
  window.transportFixture={mode:'401',created:[],tabs:{},next:600};
  chrome.permissions.contains=async()=>true;
  chrome.tabs.create=async options=>{const f=window.transportFixture,tab={id:f.next++,url:options.url};f.tabs[tab.id]=tab;f.created.push(tab);return tab;};
  chrome.tabs.get=async id=>{const tab=window.transportFixture.tabs[id];if(!tab)throw Error('No tab');return tab;};
  window.fetch=async(url,options)=>{
   const mode=window.transportFixture.mode;if(mode==='network')throw TypeError('Failed to fetch');
   if(mode==='401')return Response.json({error:'Sign in with ChatGPT to access your tasks.'},{status:401});
   if(mode==='html')return new Response('<html>Sign in</html>',{headers:{'Content-Type':'text/html'}});
   if(mode==='409')return Response.json({error:'This is a different ChatGPT account.'},{status:409});
   return Response.json(String(url).endsWith('/api/profile')?await window.fixtureSnapshot():await window.fixtureSync(JSON.parse(options.body)));
  };
 });
 const setup=(mode,userId='transport-fixture',connectionTabId=null)=>page.evaluate(async({mode,userId,connectionTabId})=>{window.transportFixture.mode=mode;await(await import('./lib/store.js')).configureChatGPTConnection({enabled:true,nonce:'transport-fixture-pairing-000001',userId,connectionTabId});},{mode,userId,connectionTabId});
 const sync=()=>page.evaluate(async()=>{const result=await(await import('./lib/chatgpt.js')).syncChatGPT(),config=await(await import('./lib/store.js')).getChatGPTConnection();return {result,status:config.status,tabId:config.connectionTabId,created:window.transportFixture.created.length};});
 await check('An actual JSON 401 response opens the first-party connection page instead of stopping sync',async()=>{
  await setup('401');const result=await sync();assert.equal(result.result.pending,true);assert.equal(result.created,1);assert.match(result.status,/connection page/i);
  const url=await page.evaluate(()=>window.transportFixture.created.at(-1).url);assert.equal(new URL(url).searchParams.get('auto'),'1');assert.equal(new URL(url).searchParams.get('extension'),id);
 });
 await check('A valid pending connection is reused, while a recycled unrelated tab cannot block recovery',async()=>{
  const before=await sync();assert.equal(before.created,1);await page.evaluate(id=>{window.transportFixture.tabs[id].url='https://example.com/';},before.tabId);const after=await sync();assert.equal(after.created,2);assert.notEqual(after.tabId,before.tabId);
 });
 await check('Sync now can finish a pairing that has not received an account identity yet',async()=>{
  await setup('401','');const result=await sync();assert.equal(result.result.pending,true);assert.equal(result.created,3);
 });
 await check('Blocked cross-site cookies, HTML login pages and network errors all use the connection-page fallback',async()=>{
  for(const mode of ['html','network']){await setup(mode);const result=await sync();assert.equal(result.result.pending,true);assert.ok(result.tabId);}
 });
 await check('Account mismatch errors remain visible and do not start a new fallback connection',async()=>{
  await setup('409');const before=await page.evaluate(()=>window.transportFixture.created.length),error=await sync().then(()=>'',e=>e.message);assert.match(error,/different ChatGPT account/);assert.equal(await page.evaluate(()=>window.transportFixture.created.length),before);
 });
 await check('The real direct sync transport uploads local tasks and receives a task created through MCP service logic',async()=>{
  await setup('success');let result=await sync();assert.equal(result.result.connected,true);assert.equal(result.status,'Synced with ChatGPT.');assert.ok((await service.list()).tasks.some(t=>t.id==='local-fixture'));
  await service.create({requestId:'transport-fixture-create-01',workspace:'personal',list:'Inbox',text:'Cloud sync fixture',dueDate:'2026-10-16',priority:'high'});await sync();const task=await page.evaluate(async()=>(await import('./lib/store.js')).getState().workspaces.personal.tasks.find(t=>t.text==='Cloud sync fixture'));assert.equal(task.priority,'high');assert.equal(task.dueDate,'2026-10-16');
 });
 await check('Updating files before Chrome reload offers a safe reload instead of sending schema 7 data to an old worker',async()=>{
  await page.evaluate(()=>{const getManifest=chrome.runtime.getManifest.bind(chrome.runtime);window.manifestFixture=getManifest;chrome.runtime.getManifest=()=>({...getManifest(),version:'1.10.0'});window.reloadRequested=false;chrome.runtime.reload=()=>{window.reloadRequested=true;};});
  const before=await page.evaluate(async()=>JSON.stringify((await import('./lib/store.js')).getState().workspaces));
  await page.locator('#settings-open').click();await page.getByRole('button',{name:'ChatGPT',exact:true}).click();await page.getByText('Finish updating Sebams',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Sync now',exact:true}).click();await page.getByText('Reload Sebams to finish updating, then sync again.',{exact:true}).waitFor();
  await page.screenshot({animations:'disabled',path:path.join(qa,'finish-update.png')});await page.getByRole('button',{name:'Finish update and reload',exact:true}).click();await page.waitForFunction(()=>window.reloadRequested);
  const after=await page.evaluate(async()=>JSON.stringify((await import('./lib/store.js')).getState().workspaces));assert.equal(after,before);
 });
 assert.deepEqual(errors,[]);
}catch(error){console.error(error.stack);process.exitCode=1;await context?.pages()[0]?.screenshot({path:path.join(qa,'failure.png')}).catch(()=>{});}
finally{await fs.writeFile(path.join(qa,'results.json'),JSON.stringify({results,errors},null,2));await context?.close();}
