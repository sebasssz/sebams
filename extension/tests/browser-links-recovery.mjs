import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.SEBAMS_PLAYWRIGHT_PACKAGE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),qa=process.env.SEBAMS_QA_DIR;
if(!qa)throw Error('Use an isolated QA directory.');
await fs.mkdir(qa,{recursive:true});
let context;const results=[],errors=[];
const check=async(name,fn)=>{await fn();results.push({name,status:'pass'});console.log('PASS',name);};
try{
 context=await chromium.launchPersistentContext(path.join(qa,'profile-'+Date.now()),{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,viewport:{width:1440,height:900},ignoreDefaultArgs:['--disable-extensions'],args:['--enable-unsafe-extension-debugging']});
 const page=context.pages()[0],cdp=await context.browser().newBrowserCDPSession();
 await page.goto('chrome://extensions/');await page.evaluate(()=>chrome.developerPrivate.updateProfileConfiguration({inDeveloperMode:true}));
 const {id}=await cdp.send('Extensions.loadUnpacked',{path:root});
 page.on('pageerror',e=>errors.push(e.message));await page.goto(`chrome-extension://${id}/newtab.html`);
 await page.locator('#welcome-skip').click();await page.locator('#welcome').waitFor({state:'hidden'});
 await page.evaluate(async()=>{await(await import('./lib/store.js')).mutate(s=>{s.prefs.remindersOnOpen=false;s.prefs.onlineSiteIcons=false;s.workspaces.personal.links=[['Roblox','https://www.roblox.com/'],['YouTube','https://www.youtube.com/']].map(([title,url],i)=>({id:'link-'+i,title,url,folder:'',pinned:false}));});});
 const button=name=>page.getByRole('button',{name,exact:true}),open=()=>page.locator('#links-open').click(),close=()=>button('Close panel').click(),state=()=>page.evaluate(async()=>(await import('./lib/store.js')).getState());
 const reachable=async name=>assert.equal(await button(name).evaluate(node=>{const r=node.getBoundingClientRect();return node.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),true,name+' is covered by another element');
 await check('Links header buttons stay visible and clickable on desktop and narrow screens',async()=>{
  for(const [width,height] of [[1440,900],[768,600],[375,812],[320,568]]){
   await page.setViewportSize({width,height});await open();
   for(const name of ['New link','Links options','Close panel'])await reachable(name);
   await button('Links options').click({timeout:3000});await button('Manage links').waitFor({state:'visible'});await button('Links options').click();
   await button('New link').click({timeout:3000});await page.getByLabel('Link name',{exact:true}).waitFor();await button('Cancel').click();
   await page.screenshot({animations:'disabled',path:path.join(qa,`links-${width}.png`)});await close();
  }
 });
 await page.setViewportSize({width:1440,height:900});await open();
 await check('Add, edit, pin, reorder and remove links work through their visible controls',async()=>{
  await button('New link').click();await page.getByLabel('Link name',{exact:true}).fill('Example');await page.getByLabel('Website address',{exact:true}).fill('https://example.com/');await button('Add link').click();await page.getByRole('link',{name:'Example',exact:true}).waitFor();
  await page.locator('.quick-link-row').filter({hasText:'Example'}).hover();await button('Edit Example').click();await page.getByLabel('Link name',{exact:true}).fill('Example edited');await page.getByLabel('Pin to dashboard',{exact:true}).check();await button('Save link').click();await button('Unpin Example edited from dashboard').waitFor();
  assert.equal((await state()).workspaces.personal.links.find(l=>l.title==='Example edited').pinned,true);await button('Back to links').click();
  await page.locator('.quick-links').getByRole('link',{name:'Example edited',exact:true}).focus();await page.keyboard.press('Alt+ArrowUp');await page.waitForFunction(async()=>(await import('./lib/store.js')).getState().workspaces.personal.links[1].title==='Example edited');
  await button('Remove shortcut Example edited from Links').click();await page.getByText('Shortcut removed.',{exact:true}).waitFor();await button('Undo').click();await page.locator('.quick-links').getByRole('link',{name:'Example edited',exact:true}).waitFor();await close();
 });
 await check('Long folders keep the toolbar visible while scrolling and return cleanly to other panels',async()=>{
  await page.evaluate(async()=>{await(await import('./lib/store.js')).mutate(s=>{s.workspaces.personal.links=Array.from({length:40},(_,i)=>({id:'long-'+i,title:'Website '+i,url:'https://example.com/'+i,folder:'',pinned:false}));});});
  await page.setViewportSize({width:320,height:568});await open();await page.getByRole('link',{name:'Website 39',exact:true}).scrollIntoViewIfNeeded();for(const name of ['New link','Links options','Close panel'])await reachable(name);await close();
  await page.locator('#settings-open').click();assert.equal(await button('New link').count(),0);await close();await open();assert.equal(await button('New link').count(),1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 });
 assert.deepEqual(errors,[]);
}catch(error){console.error(error.stack);process.exitCode=1;await context?.pages()[0]?.screenshot({path:path.join(qa,'failure.png')}).catch(()=>{});}
finally{await fs.writeFile(path.join(qa,'results.json'),JSON.stringify({results,errors},null,2));await context?.close();}
