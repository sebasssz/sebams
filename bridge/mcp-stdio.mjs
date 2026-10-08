import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {createMcpServer} from './mcp-tools.mjs';
import {PublicError} from './core.mjs';

// The SDK owns stdin/stdout. Diagnostics go to stderr; never print the connection code.
try{
  const directory=process.env.SEBAMS_DATA_DIR||join(dirname(fileURLToPath(import.meta.url)),'data');const {token}=JSON.parse(await readFile(join(directory,'config.json'),'utf8'));
  const request=async(path,body)=>{let response;try{response=await fetch('http://127.0.0.1:8787'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000)});}catch{throw new PublicError('Start the local Sebams bridge first.',503);}const value=await response.json();if(!response.ok)throw new PublicError(value.error||'The local bridge could not finish the request.',response.status);return value;};
  const server=createMcpServer({prepare:draft=>request('/tasks/prepare',draft),create:input=>request('/tasks/create',input)});await server.connect(new StdioServerTransport());
}catch(error){console.error(error instanceof PublicError?error.message:'Start Sebams-Bridge with Start.cmd before connecting MCP.');process.exitCode=1;}
