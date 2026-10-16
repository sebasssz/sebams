import {env} from 'cloudflare:workers';
import {accountService,accountResponse,bearer,checkOrigin,reject,limitedBody} from '../../../../lib/account-service.js';
import {cloudService} from '../../../../lib/cloud-service.js';
type Context={params:Promise<{id:string}>};
async function service(request:Request){checkOrigin(request);const account=await accountService(env.DB,env).authenticate(bearer(request));return cloudService(env.DB,(env as any).BUCKET,account);}
export async function GET(request:Request,{params}:Context){try{const cloud=await service(request),{id}=await params,{metadata,object}=await cloud.download(id);return new Response(object.body,{headers:{'Content-Type':metadata.type,'Content-Length':String(metadata.size),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'"}});}catch(error){return accountResponse(error);}}
export async function POST(request:Request,{params}:Context){try{const cloud=await service(request),{id}=await params;if(Number(request.headers.get('content-length')||0)>8*1024*1024)reject('Choose a photo smaller than 8 MB.',413);return Response.json(await cloud.upload(id,request.headers.get('content-type'),(await limitedBody(request,8*1024*1024)).buffer),{headers:{'Cache-Control':'no-store'}});}catch(error){return accountResponse(error);}}
