import {createServer} from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {dirname,join} from 'node:path';
import {openStore,loadToken,createSolver,prepareTask,PublicError} from './core.mjs';
import {createUpdater} from './updater.mjs';

export const MAX_BODY=50*1024*1024;
const error=(message,status=400)=>{throw new PublicError(message,status);};
async function readBody(request){
  if(!String(request.headers['content-type']||'').toLowerCase().startsWith('application/json'))error('Send JSON with Content-Type application/json.',415);
  const size=Number(request.headers['content-length']);if(size>MAX_BODY)error('The request is too large. Use at most four images of 8 MB each.',413);
  const chunks=[];let bytes=0;for await(const chunk of request){bytes+=chunk.length;if(bytes>MAX_BODY)error('The request is too large.',413);chunks.push(chunk);}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{error('The request contains invalid JSON.');}
}
const authenticated=(header,token)=>{const supplied=typeof header==='string'&&header.startsWith('Bearer ')?header.slice(7):'';const a=Buffer.from(supplied),b=Buffer.from(token);return a.length===b.length&&timingSafeEqual(a,b);};
export function createLocalServer({store,token,solver,mcpHandler=null,updater=createUpdater()}){
  const server=createServer(async(request,response)=>{
    const send=(status,value)=>{response.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});response.end(JSON.stringify(value));};
    try{
      const host=request.headers.host??'';if(!/^(127\.0\.0\.1|localhost):\d+$/.test(host))error('Invalid local host.',403);
      const origin=request.headers.origin;if(origin&&!/^chrome-extension:\/\/[a-p]{32}$/.test(origin))error('Only a Chrome extension can access this bridge from a browser.',403);
      if(origin){response.setHeader('Access-Control-Allow-Origin',origin);response.setHeader('Vary','Origin');response.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');response.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');}
      if(request.method==='OPTIONS'){if(!origin)error('A browser origin is required.',403);response.writeHead(204);response.end();return;}
      if(!authenticated(request.headers.authorization,token))error('The Sebams connection code is missing or incorrect.',401);
      const path=new URL(request.url,'http://127.0.0.1').pathname;
      if(path==='/health'&&request.method==='GET'){send(200,{ok:true,provider:'Gemini',configured:solver.configured,model:solver.model});return;}
      if(path==='/updates'&&request.method==='GET'){send(200,await updater.check(new URL(request.url,'http://127.0.0.1').searchParams.get('current')));return;}
      if(path==='/updates/source'&&request.method==='GET'){send(200,await updater.source());return;}
      if(path==='/tasks/pending'&&request.method==='GET'){send(200,{tasks:store.snapshot().tasks.slice(0,300)});return;}
      if(path==='/workspace'&&request.method==='GET'){send(200,{workspaces:store.snapshot().workspaces});return;}
      if(path==='/mcp'){
        if(!mcpHandler)error('Install the MCP dependencies using Start.cmd.',503);
        if(request.method!=='POST'){send(405,{error:'Use MCP Streamable HTTP POST requests.'});return;}
        const body=await readBody(request);await mcpHandler(request,response,body);return;
      }
      if(request.method!=='POST')error('This endpoint is not available.',404);
      const body=await readBody(request);
      if(path==='/updates/install'){send(200,await updater.install(body));return;}
      if(path==='/updates/source'){send(200,await updater.setSource(body));return;}
      if(path==='/shutdown'){send(200,{ok:true});server.close();const timer=setTimeout(()=>server.closeAllConnections(),2000);timer.unref();return;}
      if(path==='/solve'){const controller=new AbortController();response.once('close',()=>{if(!response.writableEnded)controller.abort();});send(200,await solver.solve(body,{signal:controller.signal}));return;}
      if(path==='/workspace'){send(200,await store.workspace(body?.workspaces));return;}
      if(path==='/tasks/ack'){send(200,await store.ack(body?.ids));return;}
      if(path==='/tasks/prepare'){send(200,prepareTask(body,store.snapshot().workspaces));return;}
      if(path==='/tasks/create'){send(200,await store.create(body));return;}
      error('This endpoint is not available.',404);
    }catch(e){if(!response.headersSent)send(e instanceof PublicError?e.status:500,{error:e instanceof PublicError?e.message:'The local bridge could not finish this request. Try again.'});else response.end();}
  });
  server.requestTimeout=100000;server.headersTimeout=15000;server.timeout=110000;server.maxHeadersCount=32;return server;
}
export async function startBridge({directory=join(dirname(fileURLToPath(import.meta.url)),'data'),apiKey=process.env.GEMINI_API_KEY||'',model=process.env.GEMINI_MODEL||'gemini-3.8-flash',port=8787,fetchImpl=fetch,mcp=true}={}){
  const token=await loadToken(directory),store=await openStore(directory),solver=createSolver({apiKey,model,fetchImpl});let mcpHandler=null;
  if(mcp){
    const [{createMcpServer},{StreamableHTTPServerTransport}]=await Promise.all([import('./mcp-tools.mjs'),import('@modelcontextprotocol/sdk/server/streamableHttp.js')]);
    mcpHandler=async(request,response,body)=>{const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true}),mcpServer=createMcpServer({prepare:draft=>prepareTask(draft,store.snapshot().workspaces),create:input=>store.create(input)});response.on('close',()=>{void transport.close();void mcpServer.close();});await mcpServer.connect(transport);await transport.handleRequest(request,response,body);};
  }
  const updater=createUpdater({configurationFile:join(directory,'updates.json')});
  const server=createLocalServer({store,token,solver,mcpHandler,updater});await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});return {server,token,store,solver,updater,url:`http://127.0.0.1:${server.address().port}`};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{const bridge=await startBridge();console.log('Sebams local bridge is running on http://127.0.0.1:8787');console.log('Connection code (paste into Sebams settings): '+bridge.token);console.log(bridge.solver.configured?'Gemini is configured. Use a Free Tier project without billing.':'Gemini is not configured. Add a free GEMINI_API_KEY to solve tasks.');const stop=()=>bridge.server.close(()=>process.exit(0));process.on('SIGINT',stop);process.on('SIGTERM',stop);}catch(e){console.error(e.code==='EADDRINUSE'?'The Sebams bridge is already running on port 8787.':e instanceof PublicError?e.message:e.code==='ERR_MODULE_NOT_FOUND'?'Run Start.cmd to install the MCP dependencies.':'The Sebams bridge could not start.');process.exitCode=1;}
}
