import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {ElicitRequestSchema} from '@modelcontextprotocol/sdk/types.js';
import {startBridge} from '../server.mjs';
import {createMcpServer} from '../mcp-tools.mjs';
import {prepareTask} from '../core.mjs';

const workspaces=[{id:'study',lists:['Inbox','Matemáticas']}];
const task={text:'Resolver ejercicio 4',priority:'low',dueDate:'2026-10-20',workspace:'study',list:'Matemáticas',operationId:'mcp-request-001'};
const value=result=>result.structuredContent||JSON.parse(result.content[0].text);
async function bridgeFixture(t,port=0){const directory=await mkdtemp(join(tmpdir(),'sebams-mcp-'));const bridge=await startBridge({directory,port});await bridge.store.workspace(workspaces);t.after(async()=>{await new Promise(resolve=>bridge.server.close(resolve));assert.ok(directory.startsWith(join(tmpdir(),'sebams-mcp-')));await rm(directory,{recursive:true,force:true});});return {...bridge,directory};}

test('Official SDK client initializes HTTP MCP, asks missing fields, creates once and rejects incomplete creation',async t=>{
 const bridge=await bridgeFixture(t),client=new Client({name:'sebams-qa',version:'1.0.0'});t.after(()=>client.close());
 await client.connect(new StreamableHTTPClientTransport(new URL(bridge.url+'/mcp'),{requestInit:{headers:{Authorization:'Bearer '+bridge.token}}}));
 const tools=await client.listTools();assert.deepEqual(tools.tools.map(tool=>tool.name),['prepare_task','create_task']);assert.equal(tools.tools[1].annotations.idempotentHint,true);
 const prepared=value(await client.callTool({name:'prepare_task',arguments:{text:task.text}}));assert.deepEqual(prepared.missing,['priority','dueDate','workspace','list']);assert.equal(bridge.store.snapshot().tasks.length,0);
 const invalid=await client.callTool({name:'create_task',arguments:{text:task.text}});assert.equal(invalid.isError,true);assert.equal(bridge.store.snapshot().tasks.length,0);
 const created=value(await client.callTool({name:'create_task',arguments:task}));assert.equal(created.duplicate,false);assert.equal(created.task.priority,'low');
 const repeated=value(await client.callTool({name:'create_task',arguments:task}));assert.equal(repeated.duplicate,true);assert.equal(repeated.task.id,created.task.id);assert.equal(bridge.store.snapshot().tasks.length,1);
 await bridge.store.ack([created.task.id]);assert.equal(bridge.store.snapshot().tasks.length,0);
});

test('MCP authentication rejects a missing connection code before exposing tools',async t=>{
 const bridge=await bridgeFixture(t),client=new Client({name:'unauthorized-qa',version:'1.0.0'});t.after(()=>client.close());
 await assert.rejects(client.connect(new StreamableHTTPClientTransport(new URL(bridge.url+'/mcp'))));assert.equal(bridge.store.snapshot().tasks.length,0);
});

test('MCP form elicitation gathers explicit metadata and declining never creates a task',async t=>{
 let action='accept',forms=0,creations=0;
 const server=createMcpServer({prepare:draft=>prepareTask(draft,workspaces),create:async()=>{creations++;return{};}}),client=new Client({name:'form-qa',version:'1.0.0'},{capabilities:{elicitation:{form:{}}}});
 client.setRequestHandler(ElicitRequestSchema,async request=>{forms++;assert.deepEqual(request.params.requestedSchema.required,['priority','dueDate','workspace','list']);return action==='accept'?{action,content:{priority:'high',dueDate:'',workspace:'study',list:'Matemáticas'}}:{action};});
 const [clientTransport,serverTransport]=InMemoryTransport.createLinkedPair();await server.connect(serverTransport);await client.connect(clientTransport);t.after(async()=>{await client.close();await server.close();});
 const prepared=value(await client.callTool({name:'prepare_task',arguments:{text:task.text}}));assert.equal(prepared.ready,true);assert.equal(prepared.draft.dueDate,'');assert.equal(prepared.draft.priority,'high');assert.equal(creations,0);
 action='decline';const declined=value(await client.callTool({name:'prepare_task',arguments:{text:task.text}}));assert.equal(declined.cancelled,true);assert.equal(creations,0);assert.equal(forms,2);
});

test('Official SDK stdio adapter reads the private local code and creates through the running service',async t=>{
 const bridge=await bridgeFixture(t,8787),client=new Client({name:'stdio-qa',version:'1.0.0'});
 const transport=new StdioClientTransport({command:process.execPath,args:[fileURLToPath(new URL('../mcp-stdio.mjs',import.meta.url))],env:{...process.env,SEBAMS_DATA_DIR:bridge.directory},stderr:'pipe'});let diagnostic='';transport.stderr?.on('data',chunk=>diagnostic+=chunk);t.after(()=>client.close());
 await client.connect(transport);const prepared=value(await client.callTool({name:'prepare_task',arguments:{}}));assert.equal(prepared.missing.length,5);
 const created=value(await client.callTool({name:'create_task',arguments:task}));assert.equal(created.duplicate,false);assert.equal(bridge.store.snapshot().tasks[0].id,created.task.id);assert.ok(!diagnostic.includes(bridge.token));
});
