import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.SEBAMS_PLAYWRIGHT_PACKAGE || 'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const qaDir=process.env.SEBAMS_QA_DIR || path.join(root,'work','qa');
await fs.mkdir(qaDir,{recursive:true});
const chromePath=process.env.CHROME_PATH || (process.platform==='win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : chromium.executablePath());
const context=await chromium.launchPersistentContext(path.join(qaDir,'extended-profile-'+Date.now()),{executablePath:chromePath,headless:true,viewport:{width:1440,height:900},ignoreDefaultArgs:['--disable-extensions'],args:['--enable-unsafe-extension-debugging']});
const page=context.pages()[0]||await context.newPage(),cdp=await context.browser().newBrowserCDPSession(),loaded=await cdp.send('Extensions.loadUnpacked',{path:root});
const url=`chrome-extension://${loaded.id}/newtab.html`,results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
const close=async()=>{await page.getByRole('button',{name:'Close panel',exact:true}).click();await page.locator('#panel').waitFor({state:'hidden'});};
const snapshot=()=>page.evaluate(async()=>{const m=await import('./lib/store.js');return(await m.exportBackup()).state;});
async function test(name,fn){await fn();results.push({name,status:'pass'});console.log('PASS',name);}
try{
 await page.goto(url);await page.locator('#welcome-skip').waitFor();await page.locator('#welcome-skip').click();await page.locator('#welcome').waitFor({state:'hidden'});
 await test('Uploaded image decoding, local blob rendering, image backup restoration',async()=>{
  await page.locator('#background-open').click();await page.getByLabel('Upload your background image',{exact:true}).setInputFiles(path.join(root,'assets/backgrounds/coast.jpg'));await page.getByText('Your scene is ready.',{exact:true}).waitFor();await close();await page.waitForFunction(()=>document.querySelector('#background').style.backgroundImage.includes('blob:'));
  const original=await page.evaluate(async()=>{const m=await import('./lib/store.js');return m.exportBackup();});assert.equal(original.images.length,1);assert.ok(original.images[0].data.startsWith('data:image/jpeg;base64,'));
  await page.evaluate(async()=>{const m=await import('./lib/store.js');await m.removeImage(m.getState().images[0].id);});await page.evaluate(async b=>{const m=await import('./lib/store.js');await m.importBackup(b);},original);assert.equal((await snapshot()).images.length,1);await page.reload();await page.waitForFunction(()=>document.querySelector('#background').style.backgroundImage.includes('blob:'));
 });
 await test('Restore undo works immediately and preserves subsequent changes',async()=>{
  const backup=await page.evaluate(async()=>{const m=await import('./lib/store.js');await m.mutate(s=>{s.prefs.name='Before restore';});const b=await m.exportBackup();b.state.prefs.name='Restored';return b;});
  const backupPath=path.join(qaDir,'undo-backup.json');await fs.writeFile(backupPath,JSON.stringify(backup));
  await page.locator('#settings-open').click();await page.getByRole('button',{name:'Data',exact:true}).click();await page.getByLabel('Choose a Sebams backup',{exact:true}).setInputFiles(backupPath);await page.waitForFunction(()=>document.querySelector('#greeting').textContent.includes('Restored'));
  await page.evaluate(async()=>{const m=await import('./lib/store.js');const revision=m.getState().revision;await m.initStore();await chrome.runtime.sendMessage({type:'timer-sync'});if(m.getState().revision!==revision)throw Error('Read initialization changed the revision');});
  await page.getByRole('button',{name:'Undo',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#greeting').textContent.includes('Before restore'));
  await page.getByLabel('Choose a Sebams backup',{exact:true}).setInputFiles(backupPath);await page.waitForFunction(()=>document.querySelector('#greeting').textContent.includes('Restored'));
  await page.evaluate(async()=>{const m=await import('./lib/store.js');await m.mutate(s=>{s.workspaces.personal.tasks.push({id:'after-restore',text:'A newer change',done:false,priority:'normal',list:'Inbox',dueDate:'',details:'',attachments:[],ai:null,sourceId:''});});});
  await page.getByRole('button',{name:'Undo',exact:true}).click();await page.getByText(/Sebams changed after the restore/).waitFor();assert.ok((await snapshot()).workspaces.personal.tasks.some(t=>t.id==='after-restore'));await close();
 });
 await test('A conflicting note keeps its draft and offers a saved copy',async()=>{
  await page.locator('#notes-open').click();await page.locator('#notes-text').focus();const other=await context.newPage();await other.goto(url);await other.waitForFunction(()=>document.querySelector('#greeting').textContent!=='Welcome to your space.');await other.evaluate(async()=>{const m=await import('./lib/store.js');await m.mutate(s=>{s.workspaces.personal.notes='Newer note from another tab';s.workspaces.personal.notesRevision++;});});
  await page.locator('#notes-text').fill('Local draft'); await page.getByRole('button',{name:'Save now'}).click();await page.getByText(/Your note changed in another tab/).first().waitFor();assert.equal(await page.locator('#notes-text').inputValue(),'Local draft');assert.equal((await snapshot()).workspaces.personal.notes,'Newer note from another tab');
  const downloadPromise=page.waitForEvent('download',{timeout:5000}).catch(error=>({error:error.message}));await page.locator('#notes-text').fill('Local draft after further editing');await page.getByRole('button',{name:'Save draft & review'}).click();const download=await downloadPromise;assert.ok(!download.error,download.error);await download.saveAs(path.join(qaDir,'conflict-draft.json'));await page.waitForFunction(()=>document.querySelector('#notes-text').value==='Newer note from another tab');assert.equal(JSON.parse(await fs.readFile(path.join(qaDir,'conflict-draft.json'),'utf8')).draft,'Local draft after further editing');await close();await other.close();
 });
 await test('Cached weather is labeled with update time when access is unavailable',async()=>{
  await page.evaluate(async()=>{const m=await import('./lib/store.js');await m.mutate(s=>{s.weather={city:{name:'Test city',label:'Test city (test fixture)',latitude:52.52,longitude:13.41},unit:'C',cache:{cityKey:'52.52,13.41',tempC:12,code:3,updatedAt:Date.now()-3600000}};});});await page.reload();await page.locator('#weather-open').click();await page.getByText(/Updated/).waitFor();await page.getByRole('button',{name:'Refresh weather',exact:true}).click();await page.getByText(/Enable weather access/).waitFor();assert.equal(await page.locator('#weather-temp').textContent(),'12°C');await page.getByLabel('Temperature',{exact:true}).selectOption('F');await page.waitForFunction(()=>document.querySelector('#weather-temp').textContent==='54°F');await close();
 });
 await test('An imported running timer completes with all Sebams tabs closed',async()=>{
  const backup=await page.evaluate(async()=>{const m=await import('./lib/store.js');const b=await m.exportBackup();b.state.timer.status='running';b.state.timer.mode='work';b.state.timer.endsAt=Date.now()+5000;b.state.timer.remainingMs=5000;return b;});const timerPath=path.join(qaDir,'timer-backup.json');await fs.writeFile(timerPath,JSON.stringify(backup));await page.locator('#settings-open').click();await page.getByRole('button',{name:'Data',exact:true}).click();await page.getByLabel('Choose a Sebams backup',{exact:true}).setInputFiles(timerPath);await page.getByText('Backup restored.',{exact:true}).waitFor();await page.waitForFunction(async()=>!!await chrome.alarms.get('sebams-timer'));
  await page.close();await new Promise(r=>setTimeout(r,6500));const worker=context.serviceWorkers().find(w=>w.url().includes(loaded.id));const persisted=await worker.evaluate(()=>new Promise((resolve,reject)=>{const req=indexedDB.open('sebams-v1');req.onsuccess=()=>{const db=req.result;const read=db.transaction('data','readonly').objectStore('data').get('state');read.onsuccess=()=>{resolve(read.result.timer);db.close();};read.onerror=()=>reject(read.error);};req.onerror=()=>reject(req.error);}));assert.equal(persisted.status,'complete');const next=await context.newPage();await next.goto(url);const timer=await next.evaluate(async()=>{const m=await import('./lib/store.js');await m.initStore();return m.getState().timer;});assert.equal(timer.status,'complete');assert.equal(timer.mode,'break');await next.close();
 });
 assert.deepEqual(errors,[]);console.log('No uncaught page errors.');
}catch(e){console.error(e.stack);process.exitCode=1;if(!page.isClosed())await page.screenshot({path:path.join(qaDir,'extended-failure.png')});}
finally{await context.close();await fs.writeFile(path.join(qaDir,'extended-results.json'),JSON.stringify({results,errors},null,2));}




