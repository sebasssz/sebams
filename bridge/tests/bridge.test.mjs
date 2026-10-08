import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {openStore,loadToken,prepareTask,validateTask,validateSolve,createSolver} from '../core.mjs';
import {startBridge} from '../server.mjs';

const workspaces=[{id:'personal',lists:['Inbox','Math']},{id:'school',lists:['Inbox','History']}];
const task={text:'Solve exercise 4',priority:'low',dueDate:'2026-10-20',list:'Math',workspace:'personal'};
const solve={task:{...task,details:'Show the steps'},instruction:'Explica en español',images:[]};
const image={name:'exercise.png',type:'image/png',data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWZkAAAAASUVORK5CYII='};
async function temporary(t){const directory=await mkdtemp(join(tmpdir(),'sebams-bridge-'));t.after(async()=>{assert.equal(dirname(resolve(directory)),resolve(tmpdir()));assert.ok(directory.startsWith(join(tmpdir(),'sebams-bridge-')));await rm(directory,{recursive:true,force:true});});return directory;}
const output=(text='Primero despeja x.')=>Response.json({status:'completed',model:'gemini-test-vision',steps:[{type:'model_output',content:[{type:'text',text}]}]});

test('task preparation asks for every unspecified field and accepts explicit no date and low priority',()=>{
  const prepared=prepareTask({text:'Homework'},workspaces);assert.deepEqual(prepared.missing,['priority','dueDate','workspace','list']);assert.equal(prepared.questions.length,4);assert.equal(prepared.ready,false);
  assert.equal(prepareTask({...task,dueDate:''},workspaces).ready,true);assert.deepEqual(validateTask({...task,dueDate:''},workspaces),{...task,dueDate:''});
  assert.throws(()=>validateTask({...task,dueDate:'2026-02-30'},workspaces),/valid date/);assert.throws(()=>validateTask({...task,list:'Unknown'},workspaces),/available/);
});

test('connection codes are generated once and persist without an API key',async t=>{
  const directory=await temporary(t),first=await loadToken(directory);assert.match(first,/^[A-Za-z0-9_-]{32,128}$/);assert.equal(await loadToken(directory),first);assert.equal(JSON.parse(await readFile(join(directory,'config.json'),'utf8')).token,first);
});

test('queue creation is atomic, survives restart and retries remain idempotent after ACK and list rename',async t=>{
  const directory=await temporary(t),store=await openStore(directory);await store.workspace(workspaces);
  const inputs=Array.from({length:15},(_,i)=>({...task,text:'Exercise '+i,operationId:'operation-'+i}));const saved=await Promise.all(inputs.map(value=>store.create(value)));
  const restored=await openStore(directory);assert.equal(restored.snapshot().tasks.length,15);const retry=await restored.create(inputs[0]);assert.equal(retry.duplicate,true);assert.equal(retry.task.id,saved[0].task.id);
  await restored.ack([saved[0].task.id]);await restored.ack([saved[0].task.id]);await restored.workspace([{id:'personal',lists:['Inbox','Algebra']}]);assert.equal((await restored.create(inputs[0])).task.id,saved[0].task.id);assert.equal(restored.snapshot().tasks.length,14);
  await assert.rejects(restored.create({...inputs[0],text:'Different request'}),/different task/);assert.ok(restored.snapshot().operations.every(receipt=>!('task' in receipt)&&/^[a-f0-9]{64}$/.test(receipt.hash)));
});

test('vision requests carry the real image bytes, selected details and store:false without saving the API key',async()=>{
  let sent;const solver=createSolver({apiKey:'test-private-key',model:'gemini-test-vision',fetchImpl:async(url,options)=>{sent={url,options,body:JSON.parse(options.body)};return output();}});
  const answer=await solver.solve({...solve,images:[image]});assert.equal(answer.text,'Primero despeja x.');assert.equal(answer.model,'gemini-test-vision');assert.equal(typeof answer.createdAt,'number');assert.equal(sent.url,'https://generativelanguage.googleapis.com/v1beta/interactions');assert.equal(sent.body.store,false);assert.equal(sent.options.headers['x-goog-api-key'],'test-private-key');assert.equal(sent.body.input[1].data,image.data.split(',')[1]);assert.match(sent.body.input[0].text,/Show the steps/);assert.match(sent.body.input[0].text,/Explica en español/);assert.ok(!JSON.stringify(answer).includes('private-key'));
});

test('invalid image types, excessive image counts and metadata limits fail before contacting Gemini',async()=>{
  let requests=0;const solver=createSolver({apiKey:'private',fetchImpl:async()=>{requests++;return output();}});
  for(const value of [{...solve,images:[{...image,type:'image/jpeg'}]},{...solve,images:[{...image,data:'https://example.com/pic.png'}]},{...solve,images:Array(5).fill(image)},{...solve,task:{...solve.task,details:'x'.repeat(12001)}}])await assert.rejects(solver.solve(value));
  assert.equal(requests,0);assert.equal(validateSolve({...solve,images:[image]}).images[0].type,'input_image');
});

test('unconfigured, incomplete, refusal and provider errors produce clear sanitized messages',async()=>{
  await assert.rejects(createSolver().solve(solve),/GEMINI_API_KEY/);
  for(const fixture of [Response.json({status:'incomplete',output:[{type:'message',content:[{type:'output_text',text:'Partial'}]}]}),Response.json({status:'completed',output:[{type:'message',content:[{type:'refusal',refusal:'Sensitive provider wording'}]}]}),new Response('SECRET_PROVIDER_DETAIL',{status:500}),Response.json({status:'completed',output:[]})]){
    await assert.rejects(createSolver({apiKey:'private-secret',fetchImpl:async()=>fixture}).solve(solve),error=>{assert.ok(!error.message.includes('SECRET')&&!error.message.includes('private-secret')&&!error.message.includes('Sensitive'));return true;});
  }
});

test('concurrency limits and cancellation do not leave the solver busy',async()=>{
  let release;const solver=createSolver({apiKey:'private',maxConcurrent:1,fetchImpl:async(_url,options)=>await new Promise((resolve,reject)=>{release=()=>resolve(output());options.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});})});
  const cancel=new AbortController(),first=solver.solve(solve,{signal:cancel.signal});await assert.rejects(solver.solve(solve),error=>error.status===429);cancel.abort();await assert.rejects(first,/too long/);
  const next=solver.solve(solve);release();assert.equal((await next).text,'Primero despeja x.');
});

test('REST requires the private connection code, rejects web origins and delivers only authenticated queue operations',async t=>{
  const directory=await temporary(t),bridge=await startBridge({directory,port:0,mcp:false});t.after(()=>new Promise(resolve=>bridge.server.close(resolve)));
  const auth={Authorization:'Bearer '+bridge.token,'Content-Type':'application/json'},call=(path,body,headers=auth)=>fetch(bridge.url+path,{method:body?'POST':'GET',headers,...(body?{body:JSON.stringify(body)}:{})});
  assert.equal((await call('/health',null,{})).status,401);assert.equal((await call('/health',null,{...auth,Origin:'https://example.com'})).status,403);
  const health=await call('/health',null,{...auth,Origin:'chrome-extension://'+'a'.repeat(32)});assert.equal(health.headers.get('Access-Control-Allow-Origin'),'chrome-extension://'+'a'.repeat(32));assert.deepEqual(await health.json(),{ok:true,provider:'Gemini',configured:false,model:'gemini-3.8-flash'});
  assert.equal((await call('/workspace',{workspaces})).status,200);const created=await (await call('/tasks/create',{...task,operationId:'rest-operation-1'})).json();assert.equal(created.duplicate,false);const pending=await(await call('/tasks/pending')).json();assert.equal(pending.tasks[0].id,created.task.id);
  await call('/tasks/ack',{ids:[created.task.id]});assert.deepEqual((await(await call('/tasks/pending')).json()).tasks,[]);
  assert.equal((await call('/solve',solve)).status,503);assert.equal((await call('/tasks/create',{text:'Missing details'})).status,400);
});
