import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {startBridge} from '../server.mjs';

test('Stopping requires the private code, closes only this service and retains its pending queue',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'sebams-stop-')),bridge=await startBridge({directory,port:0,mcp:false});
 t.after(async()=>{if(bridge.server.listening)await new Promise(resolve=>bridge.server.close(resolve));assert.ok(directory.startsWith(join(tmpdir(),'sebams-stop-')));await rm(directory,{recursive:true,force:true});});
 await bridge.store.workspace([{id:'study',lists:['Inbox']}]);await bridge.store.create({text:'Keep this task',priority:'normal',dueDate:'',workspace:'study',list:'Inbox',operationId:'shutdown-test-01'});
 const bad=await fetch(bridge.url+'/shutdown',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(bad.status,401);assert.equal(bridge.server.listening,true);
 const stopped=await fetch(bridge.url+'/shutdown',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+bridge.token},body:'{}'});assert.equal(stopped.status,200);assert.deepEqual(await stopped.json(),{ok:true});assert.equal(bridge.server.listening,false);assert.equal(bridge.store.snapshot().tasks.length,1);
});
