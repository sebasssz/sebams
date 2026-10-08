import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';

const fields={text:z.string().min(1).max(300).describe('Task title explicitly chosen by the user.'),priority:z.enum(['low','normal','high']).describe('Ask the user; never assume a priority.'),dueDate:z.string().max(10).describe('Ask for YYYY-MM-DD or explicit no date represented by an empty string.'),list:z.string().min(1).max(40).describe('Existing subject or list explicitly selected by the user.'),workspace:z.string().min(1).max(64).describe('Existing workspace explicitly selected by the user.')};
const result=value=>({content:[{type:'text',text:JSON.stringify(value)}],structuredContent:value});
export function createMcpServer(backend){
  const server=new McpServer({name:'sebams-local-tasks',version:'1.0.0'},{instructions:'Create tasks in the user’s local Sebams extension. Call prepare_task first. Ask the user for every missing title, priority, due date (or explicit no date), list and workspace. Never guess those fields. create_task queues a task; the extension imports it while connected. Use one operationId per requested creation and keep it unchanged on retries.'});
  server.registerTool('prepare_task',{title:'Prepare a Sebams task',description:'Checks a proposed task and returns the exact questions to ask for missing details. Does not create a task. May request a form when the client supports elicitation.',inputSchema:Object.fromEntries(Object.entries(fields).map(([key,schema])=>[key,schema.optional()])),annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false}},async draft=>{
    let prepared=await backend.prepare(draft);
    if(prepared.missing.length&&server.server.getClientCapabilities()?.elicitation?.form){
      const definitions={text:{type:'string',title:'Nombre de la tarea',maxLength:300},priority:{type:'string',title:'Prioridad',enum:['low','normal','high']},dueDate:{type:'string',title:'Fecha (YYYY-MM-DD; vacío = sin fecha)',maxLength:10},workspace:{type:'string',title:'Espacio',enum:prepared.workspaces.map(w=>w.id)},list:{type:'string',title:'Materia o lista',enum:[...new Set(prepared.workspaces.flatMap(w=>w.lists))]}};
      if(!prepared.workspaces.length)return result(prepared);
      const elicited=await server.server.elicitInput({mode:'form',message:'Completa los datos de la tarea. No se creará hasta que estén definidos.',requestedSchema:{type:'object',properties:Object.fromEntries(prepared.missing.map(key=>[key,definitions[key]])),required:prepared.missing}});
      if(elicited.action==='accept')prepared=await backend.prepare({...draft,...elicited.content});else return result({...prepared,cancelled:true,instruction:'The user did not accept the form. Do not create a task.'});
    }
    return result(prepared);
  });
  server.registerTool('create_task',{title:'Create a task in Sebams',description:'Queues one task for the local extension. Call only after the user requests creation and explicitly provides title, low/normal/high priority, date or no date, list and workspace. Use a unique operationId, and reuse it on retries to avoid duplicates.',inputSchema:{...fields,operationId:z.string().regex(/^[A-Za-z0-9_-]{8,128}$/)},annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:true,openWorldHint:false}},async input=>{
    try{return result({...await backend.create(input),delivery:'Queued locally. Sebams imports this task when connected.'});}catch(error){return {isError:true,content:[{type:'text',text:error.status?error.message:'The local task queue is unavailable. Try again.'}]};}
  });
  return server;
}
