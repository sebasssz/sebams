import {env} from 'cloudflare:workers';
import {accountService,accountResponse,bearer,checkOrigin,jsonInput,reject} from '../../../lib/account-service.js';
import {cloudService} from '../../../lib/cloud-service.js';
export async function POST(request:Request){try{checkOrigin(request);const account=await accountService(env.DB,env).authenticate(bearer(request)),input=await jsonInput(request),cloud=cloudService(env.DB,(env as any).BUCKET,account);return Response.json(input.action==='get'?await cloud.get():input.action==='put'?await cloud.put(input):reject('Unknown cloud action.'),{headers:{'Cache-Control':'no-store'}});}catch(error){return accountResponse(error);}}
