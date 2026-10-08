import test from 'node:test';
import assert from 'node:assert/strict';
import {bridgeRequest,taskPrompt,normalizeAIResult} from '../lib/ai.js';

test('AI requests are local, authenticated, and send only the supplied task',async()=>{
  let sent;const payload={task:{text:'Exercise',details:'2 + 2'},instruction:'Explain',images:[]};
  const result=await bridgeRequest('/solve','local-test-code',{body:payload,fetcher:async(url,options)=>{sent={url,options};return new Response(JSON.stringify({text:'4',model:'fixture',createdAt:1}));}});
  assert.equal(sent.url,'http://127.0.0.1:8787/solve');assert.equal(sent.options.headers.Authorization,'Bearer local-test-code');assert.deepEqual(JSON.parse(sent.options.body),payload);assert.equal(sent.options.credentials,'omit');assert.equal(sent.options.redirect,'error');assert.equal(result.text,'4');
});
test('missing connection, provider failure, network failure and cancellation are actionable',async()=>{
  await assert.rejects(bridgeRequest('/solve',''),/Settings/);
  await assert.rejects(bridgeRequest('/solve','code',{fetcher:async()=>new Response(JSON.stringify({error:'API key required'}),{status:503})}),/API key required/);
  await assert.rejects(bridgeRequest('/solve','code',{fetcher:async()=>{throw new TypeError('network');}}),/Start Sebams Bridge/);
  const controller=new AbortController();controller.abort();await assert.rejects(bridgeRequest('/solve','code',{signal:controller.signal,fetcher:async(_url,{signal})=>{signal.throwIfAborted();}}),/cancelled/);
  await assert.rejects(bridgeRequest('/solve','code',{timeout:5,fetcher:async(_url,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}))}),/too long/);
});
test('manual ChatGPT prompt includes exercise and photo names without connection secrets',()=>{
  const prompt=taskPrompt({text:'Algebra',list:'Math',priority:'high',dueDate:'2026-10-10',details:'Solve x + 1 = 3',attachments:[{name:'exercise.png'}]});assert.match(prompt,/Algebra/);assert.match(prompt,/2026-10-10/);assert.match(prompt,/x \+ 1 = 3/);assert.match(prompt,/exercise.png/);assert.ok(!prompt.includes('token'));
});
test('AI results retain plain text and reject malformed or excessive responses',()=>{
  const result={text:'<img onerror=alert(1)>',model:'fixture',createdAt:1};assert.deepEqual(normalizeAIResult(result),result);
  for(const invalid of [{...result,text:''},{...result,text:'x'.repeat(20001)},{...result,createdAt:NaN},{...result,model:''}])assert.throws(()=>normalizeAIResult(invalid));
});
