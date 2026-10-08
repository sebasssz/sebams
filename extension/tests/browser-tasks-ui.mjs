import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

const {chromium}=await import(process.env.SEBAMS_PLAYWRIGHT_PACKAGE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const qaDir=process.env.SEBAMS_QA_DIR||path.join(root,'work','qa');
await fs.mkdir(qaDir,{recursive:true});
const context=await chromium.launchPersistentContext(path.join(qaDir,'tasks-ui-profile-'+Date.now()),{
  executablePath:process.env.CHROME_PATH||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':chromium.executablePath()),
  headless:true,viewport:{width:1440,height:900},ignoreDefaultArgs:['--disable-extensions'],args:['--enable-unsafe-extension-debugging']
});
const page=context.pages()[0]||await context.newPage();
const cdp=await context.browser().newBrowserCDPSession();
const loaded=await cdp.send('Extensions.loadUnpacked',{path:root});
const url=`chrome-extension://${loaded.id}/newtab.html`,results=[],errors=[];
page.on('pageerror',error=>errors.push(error.message));
const button=name=>page.getByRole('button',{name,exact:true});
const open=async name=>{await page.locator('#'+name+'-open').click();await page.locator('#panel').waitFor({state:'visible'});};
const close=async()=>{await button('Close panel').click();await page.locator('#panel').waitFor({state:'hidden'});};
const snapshot=()=>page.evaluate(async()=>{const store=await import('./lib/store.js');return(await store.exportBackup()).state;});
const row=text=>page.locator('.task-row').filter({has:page.getByText(text,{exact:true})});
const count=async name=>Number(await button(name).locator('.task-nav-count').textContent());
const active=async name=>{await page.waitForFunction(name=>[...document.querySelectorAll('.task-nav-button')].some(button=>button.getAttribute('aria-label')===name&&button.getAttribute('aria-pressed')==='true'),name);assert.equal(await button(name).getAttribute('aria-pressed'),'true');};
const add=async(text,date='')=>{
  await page.getByLabel('New task',{exact:true}).fill(text);
  await page.getByLabel('Date for new task',{exact:true}).fill(date);
  await button('Add').click();await row(text).waitFor();
};
const settle=()=>page.locator('#panel').evaluate(element=>Promise.all(element.getAnimations().map(animation=>animation.finished.catch(()=>{}))));
async function test(name,fn){
  try{await fn();results.push({name,status:'pass'});console.log('PASS',name);}
  catch(error){results.push({name,status:'fail',error:error.message});throw error;}
}
let dates;
try{
  await page.goto(url);await page.locator('#welcome-skip').click();await page.locator('#welcome').waitFor({state:'hidden'});
  dates=await page.evaluate(async()=>{
    const {localDay}=await import('./lib/model.js');const today=localDay(),next=new Date(today+'T12:00:00'),past=new Date(today+'T12:00:00');
    next.setDate(next.getDate()+1);past.setDate(past.getDate()-1);
    return{today,next:localDay(next),past:localDay(past)};
  });
  await page.evaluate(async dates=>{
    const store=await import('./lib/store.js');await store.mutate(state=>{
      const workspace=state.workspaces.personal;workspace.lists=['Inbox','Matemáticas','Historia'];
      workspace.tasks=[
        {details:'',attachments:[],ai:null,sourceId:'',id:'inbox',text:'Organizar mis apuntes',list:'Inbox',dueDate:'',done:false,priority:'normal'},
        {details:'',attachments:[],ai:null,sourceId:'',id:'math-today',text:'Resolver ejercicios de álgebra',list:'Matemáticas',dueDate:dates.today,done:false,priority:'high'},
        {details:'',attachments:[],ai:null,sourceId:'',id:'math-next',text:'Repasar funciones',list:'Matemáticas',dueDate:dates.next,done:false,priority:'normal'},
        {details:'',attachments:[],ai:null,sourceId:'',id:'history-past',text:'Leer el capítulo de historia',list:'Historia',dueDate:dates.past,done:false,priority:'normal'},
        {details:'',attachments:[],ai:null,sourceId:'',id:'math-done',text:'Entregar la práctica',list:'Matemáticas',dueDate:dates.today,done:true,priority:'normal'},
        {details:'',attachments:[],ai:null,sourceId:'',id:'history-done',text:'Preparar la exposición',list:'Historia',dueDate:'',done:true,priority:'low'}
      ];
    });
  },dates);
  await open('tasks');
  await settle();await page.screenshot({path:path.join(qaDir,'tasks-smoke-desktop.png')});
  await page.setViewportSize({width:375,height:812});await settle();await page.screenshot({path:path.join(qaDir,'tasks-smoke-mobile.png')});
  await page.setViewportSize({width:1440,height:900});
  console.log('Task desktop and mobile smoke screenshots saved.');
  await test('Sidebar lists, active views and unfinished counts agree with stored tasks',async()=>{
    await page.getByRole('navigation',{name:'Task navigation',exact:true}).waitFor();
    assert.equal(await page.getByLabel('Task list',{exact:true}).count(),0);
    await active('Show all tasks');assert.equal(await page.locator('.task-row').count(),6);
    for(const [name,value] of [['Show all tasks',4],["Show today's tasks",1],['Show upcoming tasks',1],['Show completed tasks',2],['Show list Inbox',1],['Show list Matemáticas',2],['Show list Historia',1]])assert.equal(await count(name),value,name);
    await button('Show list Matemáticas').click();await active('Show list Matemáticas');assert.equal(await page.locator('#task-view-title').textContent(),'Matemáticas');assert.equal(await page.locator('.task-row').count(),3);
    await button("Show today's tasks").click();await active("Show today's tasks");assert.equal(await page.getByLabel('Task dates',{exact:true}).inputValue(),'today');assert.equal(await row('Resolver ejercicios de álgebra').count(),1);assert.equal(await row('Repasar funciones').count(),0);
    await button('Show upcoming tasks').click();await active('Show upcoming tasks');assert.equal(await page.locator('.task-row').count(),1);await row('Repasar funciones').waitFor();
    await button('Show completed tasks').click();await active('Show completed tasks');assert.equal(await page.locator('.task-row').count(),2);assert.equal(await page.getByLabel('Complete Entregar la práctica',{exact:true}).isChecked(),true);
  });
  await test('Creating a subject selects it, clears date filters and supports dated task move',async()=>{
    await button('New list').click();await page.getByLabel('New list name',{exact:true}).fill('Astronomía');await button('Create').click();
    await active('Show list Astronomía');assert.equal(await page.getByLabel('Task dates',{exact:true}).inputValue(),'all');assert.equal(await count('Show list Astronomía'),0);
    assert.equal(await page.getByLabel('List for new task',{exact:true}).inputValue(),'Astronomía');
    await add('Observar las constelaciones',dates.today);assert.equal(await count('Show list Astronomía'),1);
    await button('Edit Observar las constelaciones').click();await page.getByLabel('Move to list',{exact:true}).selectOption('Historia');await page.getByLabel('Task priority',{exact:true}).selectOption('high');await page.getByLabel('Task date',{exact:true}).fill(dates.next);await button('Save').click();
    await row('Observar las constelaciones').waitFor({state:'hidden'});assert.equal(await count('Show list Astronomía'),0);
    await button('Show list Historia').click();await row('Observar las constelaciones').waitFor();const task=(await snapshot()).workspaces.personal.tasks.find(item=>item.text==='Observar las constelaciones');assert.equal(task.list,'Historia');assert.equal(task.dueDate,dates.next);assert.equal(task.priority,'high');
  });
  await test('Rename and delete lists preserve task content, dates and undo',async()=>{
    await button('Show list Historia').click();const before=(await snapshot()).workspaces.personal.tasks.filter(task=>task.list==='Historia');
    await button('Rename list').click();await page.getByLabel('List name',{exact:true}).fill('Matemáticas');await button('Save name').click();await page.getByText('A list with this name already exists.',{exact:true}).waitFor();assert.equal((await snapshot()).workspaces.personal.lists.includes('Historia'),true);
    await page.getByLabel('List name',{exact:true}).fill('Historia moderna');await button('Save name').click();await active('Show list Historia moderna');assert.deepEqual((await snapshot()).workspaces.personal.tasks.filter(task=>task.list==='Historia moderna'),before.map(task=>({...task,list:'Historia moderna'})));
    await button('Delete list').click();await active('Show list Inbox');assert.equal((await snapshot()).workspaces.personal.lists.includes('Historia moderna'),false);for(const task of before)assert.deepEqual((await snapshot()).workspaces.personal.tasks.find(item=>item.id===task.id),{...task,list:'Inbox'});
    assert.equal(await button('Delete list').count(),0);assert.equal(await button('Rename list').count(),0);
    await button('Undo').click();await active('Show list Historia moderna');assert.deepEqual((await snapshot()).workspaces.personal.tasks.filter(task=>task.list==='Historia moderna'),before.map(task=>({...task,list:'Historia moderna'})));
    await button('Rename list').click();await page.getByLabel('List name',{exact:true}).fill('Historia');await button('Save name').click();await active('Show list Historia');
  });
  await test('Completed view removes restored tasks and adding a task makes it visible',async()=>{
    await button('Show completed tasks').click();await page.getByLabel('Complete Entregar la práctica',{exact:true}).click();await row('Entregar la práctica').waitFor({state:'hidden'});assert.equal(await count('Show completed tasks'),1);
    await add('Nueva tarea desde completadas');assert.equal(await page.getByLabel('Task dates',{exact:true}).inputValue(),'all');await active('Show all tasks');assert.equal((await snapshot()).workspaces.personal.tasks.find(task=>task.text==='Nueva tarea desde completadas').done,false);
  });
  await test('Date filtering, completion, deletion and undo preserve dates and sidebar counts',async()=>{
    await button('Show list Historia').click();await page.getByLabel('Task dates',{exact:true}).selectOption('overdue');assert.equal(await page.locator('.task-row').count(),1);
    await page.getByLabel('Complete Leer el capítulo de historia',{exact:true}).click();await row('Leer el capítulo de historia').waitFor({state:'hidden'});assert.equal(await count('Show list Historia'),1);
    await button('Show completed tasks').click();await button('Delete Leer el capítulo de historia').click();await page.getByText('Task deleted.',{exact:true}).waitFor();assert.equal(await count('Show completed tasks'),1);await button('Undo').click();await row('Leer el capítulo de historia').waitFor();assert.equal(await count('Show completed tasks'),2);const task=(await snapshot()).workspaces.personal.tasks.find(task=>task.id==='history-past');assert.equal(task.dueDate,dates.past);assert.equal(task.done,true);
    await button('Show list Historia').click();assert.equal(await page.getByLabel('Task dates',{exact:true}).inputValue(),'all');await row('Leer el capítulo de historia').waitFor();
  });
  await test('A subject literally named All remains separate from the global All tasks view',async()=>{
    await button('New list').click();await page.getByLabel('New list name',{exact:true}).fill('All');await button('Create').click();await active('Show list All');await add('Only in the All subject');assert.equal(await page.locator('.task-row').count(),1);assert.equal((await snapshot()).workspaces.personal.tasks.find(task=>task.text==='Only in the All subject').list,'All');await button('Show all tasks').click();await active('Show all tasks');assert.ok(await page.locator('.task-row').count()>1);
  });
  await test('Saved subjects and tasks survive reload and remain separate by workspace',async()=>{
    await close();await page.reload();await page.locator('#clock').waitFor();await open('tasks');await button('Show list Astronomía').waitFor();await button('Show list All').click();await row('Only in the All subject').waitFor();await close();
    await open('settings');await button('Workspace').click();await button('Work').click();await close();await open('tasks');assert.equal(await button('Show list Astronomía').count(),0);assert.equal(await row('Only in the All subject').count(),0);await active('Show all tasks');await close();
    await open('settings');await button('Personal').click();await close();await open('tasks');await button('Show list All').click();await row('Only in the All subject').waitFor();
  });
  await test('Keyboard sidebar navigation, task edits, focus trap and Escape remain usable',async()=>{
    await button('Show list Matemáticas').focus();await page.keyboard.press('Enter');await active('Show list Matemáticas');assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Show list Matemáticas');
    await button('Edit Repasar funciones').focus();await page.keyboard.press('Enter');await page.getByLabel('Edit task',{exact:true}).fill('Repasar funciones con ejemplos');await button('Save').click();await row('Repasar funciones con ejemplos').waitFor();
    await page.getByLabel('New task',{exact:true}).fill('Tarea agregada con el teclado');await page.getByLabel('New task',{exact:true}).press('Enter');await row('Tarea agregada con el teclado').waitFor();
    await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.querySelector('#panel').contains(document.activeElement)),true);await page.keyboard.press('Escape');await page.locator('#panel').waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>document.activeElement.id),'tasks-open');await open('tasks');
  });
  await test('Desktop, compact screens and zoom keep the task sidebar, list and composer inside the dialog',async()=>{
    const longName='Historia universal y proyectos de curso'.padEnd(40,'!');
    await button('New list').click();await page.getByLabel('New list name',{exact:true}).fill(longName);await button('Create').click();await button('Show list '+longName).waitFor();
    await add('Una tarea larga para comprobar que la descripción se adapta al ancho de la pantalla sin tapar los botones de acciones ni el formulario para agregar tareas.',dates.next);
    for(const [width,height] of [[1920,1080],[1366,768],[1024,640],[768,600],[375,812],[320,568]]){
      await page.setViewportSize({width,height});await button('Show list '+longName).click();await settle();
      const geometry=await page.locator('#panel').evaluate(panel=>{const rect=panel.getBoundingClientRect();return{x:rect.x,y:rect.y,right:rect.right,bottom:rect.bottom,overflow:document.documentElement.scrollWidth>innerWidth,panelOverflow:panel.scrollWidth>panel.clientWidth+1};});
      assert.ok(geometry.x>=0&&geometry.y>=0&&geometry.right<=width+1&&geometry.bottom<=height+1,`${width}×${height} panel geometry`);assert.equal(geometry.overflow,false,`${width}px document overflow`);assert.equal(geometry.panelOverflow,false,`${width}px dialog overflow`);
      const composer=await page.locator('.task-composer').boundingBox();assert.ok(composer.y>=geometry.y&&composer.y+composer.height<=geometry.bottom+1,`${width}px composer remains reachable`);
      if(width<=700){await page.getByLabel('Task dates',{exact:true}).selectOption('upcoming');const selected=await button('Show list '+longName).boundingBox(),strip=await page.locator('.task-collections').boundingBox();assert.ok(selected.x+selected.width>strip.x&&selected.x<strip.x+strip.width,'Selected subject remains visible after filtering');await page.getByLabel('Task dates',{exact:true}).selectOption('all');}
      await button('Show list Historia').click();await active('Show list Historia');await button('Show list Matemáticas').click();await button('New list').scrollIntoViewIfNeeded();await page.getByLabel('New task',{exact:true}).scrollIntoViewIfNeeded();assert.ok(await page.getByLabel('New task',{exact:true}).isVisible());
    }
    await page.evaluate(async dates=>{const store=await import('./lib/store.js');await store.mutate(state=>{const workspace=state.workspaces.personal;workspace.lists=['Inbox','Matemáticas','Historia','Inglés'];workspace.tasks=[{details:'',attachments:[],ai:null,sourceId:'',id:'demo-math-1',text:'Resolver ejercicios de álgebra',list:'Matemáticas',dueDate:dates.today,done:false,priority:'high'},{details:'',attachments:[],ai:null,sourceId:'',id:'demo-math-2',text:'Repasar funciones',list:'Matemáticas',dueDate:dates.next,done:false,priority:'normal'},{details:'',attachments:[],ai:null,sourceId:'',id:'demo-math-3',text:'Entregar la práctica',list:'Matemáticas',dueDate:dates.today,done:true,priority:'normal'},{details:'',attachments:[],ai:null,sourceId:'',id:'demo-history',text:'Leer el capítulo de historia',list:'Historia',dueDate:dates.next,done:false,priority:'normal'},{details:'',attachments:[],ai:null,sourceId:'',id:'demo-english',text:'Practicar vocabulario',list:'Inglés',dueDate:'',done:false,priority:'normal'}];});},dates);
    await page.setViewportSize({width:1366,height:768});await button('Show list Matemáticas').click();await settle();await page.mouse.move(1,1);await page.screenshot({path:path.join(qaDir,'tasks-desktop-preview.png')});
    await page.setViewportSize({width:375,height:812});await button('Show list Matemáticas').scrollIntoViewIfNeeded();await settle();await page.screenshot({path:path.join(qaDir,'tasks-mobile-preview.png')});
    await close();await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>chrome.tabs.getCurrent().then(tab=>chrome.tabs.setZoom(tab.id,2)));await open('tasks');const panel=await page.locator('#panel').boundingBox();assert.ok(panel.x>=0&&panel.y>=0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await close();await page.evaluate(()=>chrome.tabs.getCurrent().then(tab=>chrome.tabs.setZoom(tab.id,1)));
  });
  assert.deepEqual(errors,[]);console.log('No uncaught page errors.');
}catch(error){console.error(error.stack);process.exitCode=1;if(!page.isClosed())await page.screenshot({path:path.join(qaDir,'tasks-ui-failure.png')}).catch(()=>{});}
finally{await context.close();await fs.writeFile(path.join(qaDir,'tasks-ui-results.json'),JSON.stringify({results,errors},null,2));}
