import {env} from 'cloudflare:workers';
import {handleMcp} from '../../lib/task-service.js';
export async function POST(request:Request){
  if(Number(request.headers.get('content-length')||0)>150000) return new Response('Request too large',{status:413});
  try{const body=await request.json();const result=await handleMcp(body,{db:env.DB,owner:request.headers.get('oai-authenticated-user-id')});return result===null?new Response(null,{status:204}):Response.json(result,{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Invalid JSON request'}},{status:400});}
}
