import {env} from 'cloudflare:workers';
import {accountService,accountResponse,bearer,checkOrigin,emailConfigured,jsonInput,reject} from '../../../lib/account-service.js';
export async function GET(){return Response.json({emailEnabled:emailConfigured(env)},{headers:{'Cache-Control':'no-store'}});}
export async function POST(request:Request){try{checkOrigin(request);const input=await jsonInput(request,3000),service=accountService(env.DB,env),ip=request.headers.get('cf-connecting-ip')||'unknown';let result;
 if(input.action==='request-code')result=await service.requestCode(input,ip);
 else if(input.action==='verify-code')result=await service.verifyCode(input,ip);
 else{const token=bearer(request),account=await service.authenticate(token);if(input.action==='me')result={account};else if(input.action==='logout')result=await service.logout(token);else if(input.action==='rename')result={account:await service.rename(account,input.name)};else reject('Unknown account action.');}
 return Response.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch(error){return accountResponse(error);}}
