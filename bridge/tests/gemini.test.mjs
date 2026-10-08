import test from 'node:test';
import assert from 'node:assert/strict';
import {createSolver} from '../core.mjs';
const input={task:{text:'Algebra',details:'x + 1 = 3',priority:'normal',dueDate:'',list:'Inbox'},instruction:'Explain',images:[]};
test('Guidance defaults to hints and explanations while retaining free-tier and privacy request settings',async()=>{let sent;const solver=createSolver({apiKey:'private-test',fetchImpl:async(url,options)=>{sent=JSON.parse(options.body);return Response.json({status:'completed',steps:[{type:'model_output',content:[{type:'text',text:'Think about the inverse operation.'}]}]});}});await solver.solve(input);assert.match(sent.system_instruction,/Default to hints/);assert.equal(sent.store,false);assert.equal(sent.service_tier,'standard');assert.match(sent.input[0].text,/User instructions: Explain/);});
test('Free quota errors make only one Gemini request and never fall back to another provider',async()=>{
 const urls=[];const solver=createSolver({apiKey:'private-test',fetchImpl:async(url)=>{urls.push(url);return Response.json({error:{message:'PRIVATE_PROVIDER_DETAIL'}},{status:429});}});
 await assert.rejects(solver.solve(input),error=>error.status===429&&/free quota/.test(error.message)&&!error.message.includes('PRIVATE'));assert.deepEqual(urls,['https://generativelanguage.googleapis.com/v1beta/interactions']);
});
test('Only completed model output text is saved; thoughts and tool content remain excluded',async()=>{
 const response={status:'completed',steps:[{type:'thought',content:[{type:'text',text:'PRIVATE_THOUGHT'}]},{type:'model_output',content:[{type:'text',text:'x = 2'},{type:'function_call',name:'not-run'}]}]};
 const solver=createSolver({apiKey:'private',fetchImpl:async()=>Response.json(response)});assert.equal((await solver.solve(input)).text,'x = 2');response.status='incomplete';await assert.rejects(solver.solve(input),/did not finish/);
});
test('Oversized inline image requests fail before uploading any image bytes',async()=>{
 const bytes=Buffer.alloc(8*1024*1024);Buffer.from([137,80,78,71,13,10,26,10]).copy(bytes);const image={name:'large.png',type:'image/png',data:'data:image/png;base64,'+bytes.toString('base64')};
 let calls=0;const solver=createSolver({apiKey:'private',fetchImpl:async()=>{calls++;throw Error('Should not upload');}});await assert.rejects(solver.solve({...input,images:[image,image]}),error=>error.status===413);assert.equal(calls,0);
});
