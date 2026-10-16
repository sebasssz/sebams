export class AccountError extends Error{constructor(message,status=400){super(message);this.status=status;}}
export const reject=(message,status=400)=>{throw new AccountError(message,status);};
export const sha=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',typeof bytes==='string'?new TextEncoder().encode(bytes):bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
const random=length=>[...crypto.getRandomValues(new Uint8Array(length))].map(n=>n.toString(16).padStart(2,'0')).join('');
function uniform(max){const limit=Math.floor(4294967296/max)*max;let n;do{n=crypto.getRandomValues(new Uint32Array(1))[0];}while(n>=limit);return n%max;}
const emailAddress=value=>{if(typeof value!=='string'||value.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(value))reject('Enter a valid email address.');return value.trim().toLowerCase();};
export const displayName=value=>{if(typeof value!=='string'||!value.trim()||value.trim().length>50)reject('Choose a name with 1–50 characters.');return value.trim();};
export function emailConfigured(env){return !!(env.SEBAMS_AUTH_SECRET&&env.BREVO_API_KEY&&env.SEBAMS_EMAIL_FROM);}
async function deliverOTP(env,email,code){
 const response=await fetch('https://api.brevo.com/v3/smtp/email',{method:'POST',headers:{'api-key':env.BREVO_API_KEY,'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({sender:{name:'Sebams',email:env.SEBAMS_EMAIL_FROM},to:[{email}],subject:'Your Sebams verification code',htmlContent:'<html><body style="font-family:Arial,sans-serif;color:#202124;max-width:480px;margin:40px auto"><p>Sebams</p><h2>Your verification code</h2><p style="font-size:32px;letter-spacing:8px">'+code+'</p><p>This code expires in 10 minutes and can be used once.</p><p>If you did not request it, you can ignore this email.</p></body></html>',textContent:`Your Sebams code is ${code}. It expires in 10 minutes and can be used once. If you did not request this code, you can ignore this email.`}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)reject('The verification email could not be sent. Please try again later.',503);
}
export function accountService(db,env,{now=()=>Date.now(),deliver=deliverOTP}={}){
 const one=(sql,...args)=>db.prepare(sql).bind(...args).first();
 const digest=async value=>{if(typeof env.SEBAMS_AUTH_SECRET!=='string'||env.SEBAMS_AUTH_SECRET.length<32)reject('Email sign-in is not configured yet.',503);return sha(env.SEBAMS_AUTH_SECRET+'\0'+value);};
 async function rate(key,limit,window){const at=now(),bucket=Math.floor(at/window),hashed=await digest('rate:'+key+':'+bucket);const row=await one('INSERT INTO sebams_limits(key,hits,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits=hits+1 RETURNING hits',hashed,(bucket+1)*window);if(row.hits>limit)reject('Too many attempts. Please wait before trying again.',429);}
 async function requestCode(input,ip='unknown'){
  if(!emailConfigured(env))reject('Email sign-in is not configured yet. The Sebams owner needs to connect the email sender.',503);
  const email=emailAddress(input.email);await db.batch([db.prepare('DELETE FROM sebams_challenges WHERE id IN (SELECT id FROM sebams_challenges WHERE expires_at<? LIMIT 100)').bind(now()-86400000),db.prepare('DELETE FROM sebams_limits WHERE key IN (SELECT key FROM sebams_limits WHERE expires_at<? LIMIT 100)').bind(now()-86400000),db.prepare('DELETE FROM sebams_sessions WHERE digest IN (SELECT digest FROM sebams_sessions WHERE expires_at<? LIMIT 100)').bind(now()-86400000)]);await rate('email-minute:'+email,1,60000);await rate('email-hour:'+email,5,3600000);await rate('ip:'+ip,20,3600000);await rate('outgoing',250,86400000);
  const id=crypto.randomUUID(),code=String(uniform(1000000)).padStart(6,'0'),expiresAt=now()+600000;
  await db.prepare('INSERT INTO sebams_challenges(id,email,digest,expires_at) VALUES (?,?,?,?)').bind(id,email,await digest(id+':'+code),expiresAt).run();
  try{await deliver(env,email,code);}catch(error){await db.prepare('UPDATE sebams_challenges SET used=1 WHERE id=?').bind(id).run();throw error;}
  return {challengeId:id,expiresIn:600,resendAfter:60};
 }
 async function verifyCode(input,ip='unknown'){
  if(typeof input.challengeId!=='string'||input.challengeId.length>100||typeof input.code!=='string'||!/^\d{6}$/.test(input.code))reject('Enter the six-digit code from your email.');
  await rate('verify:'+ip,60,3600000);
  const row=await one('UPDATE sebams_challenges SET attempts=attempts+1 WHERE id=? AND used=0 AND expires_at>? AND attempts<5 RETURNING *',input.challengeId,now());
  if(!row||row.digest!==await digest(input.challengeId+':'+input.code))reject('That code is invalid or expired. Request a new code if needed.',401);
  const name=displayName(input.name),used=await one('UPDATE sebams_challenges SET used=1 WHERE id=? AND used=0 RETURNING id',row.id);if(!used)reject('That code has already been used.',401);
  await db.prepare('INSERT INTO sebams_accounts(id,email,name,created_at) VALUES (?,?,?,?) ON CONFLICT(email) DO NOTHING').bind(crypto.randomUUID(),row.email,name,now()).run();
  const account=await one('SELECT id,email,name FROM sebams_accounts WHERE email=?',row.email),token=random(32),expiresAt=now()+(input.remember===false?86400000:30*86400000);
  await db.prepare('INSERT INTO sebams_sessions(digest,account,created_at,expires_at) VALUES (?,?,?,?)').bind(await sha(token),account.id,now(),expiresAt).run();
  return {account,token,expiresAt};
 }
 async function authenticate(token){if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))reject('Sign in to your Sebams account.',401);const account=await one('SELECT a.id,a.email,a.name FROM sebams_sessions s JOIN sebams_accounts a ON a.id=s.account WHERE s.digest=? AND s.expires_at>?',await sha(token),now());if(!account)reject('Your session expired. Sign in again. Your local data is still saved.',401);return account;}
 async function logout(token){await db.prepare('DELETE FROM sebams_sessions WHERE digest=?').bind(await sha(token)).run();return {ok:true};}
 async function rename(account,name){name=displayName(name);await db.prepare('UPDATE sebams_accounts SET name=? WHERE id=?').bind(name,account.id).run();return {...account,name};}
 return {requestCode,verifyCode,authenticate,logout,rename,rate};
}
export function bearer(request){return /^Bearer ([a-f0-9]{64})$/.exec(request.headers.get('authorization')||'')?.[1]||'';}
export function checkOrigin(request){const origin=request.headers.get('origin'),self=new URL(request.url).origin;if(origin&&origin!==self&&!/^chrome-extension:\/\/[a-p]{32}$/.test(origin))reject('This origin cannot access Sebams.',403);if(request.headers.get('x-sebams-client')!=='2')reject('Invalid Sebams client.',403);}
export async function limitedBody(request,max){if(Number(request.headers.get('content-length')||0)>max)reject('This request is too large.',413);const reader=request.body?.getReader();if(!reader)return new Uint8Array();const chunks=[];let size=0;for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();reject('This request is too large.',413);}chunks.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}return bytes;}
export async function jsonInput(request,max=2200000){const text=new TextDecoder().decode(await limitedBody(request,max*3));if(text.length>max)reject('This request is too large.',413);let body;try{body=JSON.parse(text);}catch{reject('Invalid request.');}if(!body||typeof body!=='object'||Array.isArray(body))reject('Invalid request.');return body;}
export function accountResponse(error){return Response.json({error:error instanceof AccountError?error.message:'Sebams could not finish this request. Please try again.'},{status:error instanceof AccountError?error.status:500,headers:{'Cache-Control':'no-store'}});}
