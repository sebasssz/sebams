import {env} from 'cloudflare:workers';
import {taskService,TaskError} from '../../../lib/task-service.js';
export async function POST(request:Request){
  const origin=request.headers.get('origin'),self=new URL(request.url).origin;
  if(origin&&origin!==self&&!/^chrome-extension:\/\/[a-p]{32}$/.test(origin))return new Response('Invalid origin',{status:403});
  if(request.headers.get('x-sebams-client')!=='1')return new Response('Invalid client',{status:403});
  const text=await request.text();if(text.length>14000000)return new Response('Request too large',{status:413});
  try{const service=taskService(env.DB,request.headers.get('oai-authenticated-user-id'));return Response.json(await service.sync(JSON.parse(text)),{headers:{'Cache-Control':'no-store'}});}catch(error){return Response.json({error:error instanceof TaskError?error.message:'The sync could not finish. Try again.'},{status:error instanceof TaskError?error.status:400});}
}
