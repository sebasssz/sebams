import {initStore,getChatGPTConnection,configureChatGPTConnection,setChatGPTStatus,prepareChatGPTSync,acceptChatGPTSync} from './store.js';
import {planChanges} from './task-sync-model.js';
export const CHATGPT_ORIGIN='https://sebams-connect.poeticbadge1.chatgpt.site';
export const CHATGPT_ALARM='sebams-chatgpt-sync';
const permission={origins:[CHATGPT_ORIGIN+'/*']};let pending;
async function api(route,body){
  let response;try{response=await fetch(CHATGPT_ORIGIN+route,{method:body?'POST':'GET',credentials:'include',redirect:'error',cache:'no-store',headers:body?{'Content-Type':'application/json','X-Sebams-Client':'1'}:{},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});}catch{throw Error('Open the Sebams connection page and sign in with ChatGPT, then sync again.');}
  if(!response.ok){let data;try{data=await response.json();}catch{}throw Error(data?.error||'Sign in on the Sebams connection page, then try again.');}if(!response.headers.get('content-type')?.includes('application/json'))throw Error('Sign in on the Sebams connection page, then try again.');const text=await response.text();if(text.length>16000000)throw Error('The task collection is too large.');return JSON.parse(text);
}
export async function connectChatGPT(){
  if(!await chrome.permissions.request(permission))throw Error('ChatGPT connection access was declined.');
  const previous=await getChatGPTConnection(),nonce=crypto.randomUUID();await configureChatGPTConnection({enabled:true,nonce,...(!previous.enabled?{userId:''}:{}),connectionTabId:null,status:'Sign in on the connection page to finish linking.'});
  await chrome.tabs.create({url:CHATGPT_ORIGIN+'/connect?extension='+chrome.runtime.id+'&nonce='+encodeURIComponent(nonce)});
}
export async function disconnectChatGPT(){const config=await getChatGPTConnection();if(config.connectionTabId!==null)await chrome.tabs.remove(config.connectionTabId).catch(()=>{});await configureChatGPTConnection({enabled:false,nonce:'',connectionTabId:null,status:'Disconnected. Tasks remain on this device.'});await chrome.alarms.clear(CHATGPT_ALARM);await chrome.permissions.remove(permission);}
async function fallbackConnection(){const config=await getChatGPTConnection();if(!config.enabled||!config.userId)return;if(config.connectionTabId!==null){try{await chrome.tabs.get(config.connectionTabId);return;}catch{}}
  const tab=await chrome.tabs.create({active:false,url:CHATGPT_ORIGIN+'/connect?extension='+chrome.runtime.id+'&nonce='+encodeURIComponent(config.nonce)+'&auto=1'});try{await configureChatGPTConnection({enabled:true,nonce:config.nonce,expectedNonce:config.nonce,connectionTabId:tab.id,status:'Synchronizing through the connection page. Sign in there if needed.'});}catch(error){await chrome.tabs.remove(tab.id).catch(()=>{});throw error;}}
export async function syncChatGPT(){
  if(pending)return pending;pending=(async()=>{
    await initStore();const {config,baseline,current}=await prepareChatGPTSync();if(!config.enabled||!config.userId){await chrome.alarms.clear(CHATGPT_ALARM);return {connected:false};}
    if(!await chrome.permissions.contains(permission))throw Error('Enable access to the Sebams connection page again.');
    await chrome.alarms.create(CHATGPT_ALARM,{periodInMinutes:1});const profile=await api('/api/profile');if(profile.userId!==config.userId)throw Error('A different ChatGPT account is signed in. Disconnect before linking another account.');
    const latest=await getChatGPTConnection();if(!latest.enabled||latest.nonce!==config.nonce)throw Error('The ChatGPT connection changed.');const changes=planChanges(current,baseline,config.conflicts.map(c=>c.key));const result=await api('/api/sync',{profileSupport:1,expectedUserId:config.userId,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'America/La_Paz',changes});const accepted=await acceptChatGPTSync(config.nonce,current,result);return {connected:true,...accepted};
  })().catch(async error=>{await setChatGPTStatus(error.message).catch(()=>{});if(error.message.startsWith('Open the Sebams connection page')||error.message.startsWith('Sign in on the Sebams connection page')){await fallbackConnection();return {connected:false,pending:true};}throw error;}).finally(()=>{pending=null;});return pending;
}
export async function handleChatGPTMessage(message,sender){
  if(!sender?.url||sender.frameId!==0||new URL(sender.url).origin!==CHATGPT_ORIGIN||new URL(sender.url).pathname!=='/connect')throw Error('This page cannot connect to Sebams.');
  const config=await getChatGPTConnection();if(!config.enabled||message?.nonce!==config.nonce)throw Error('Connect ChatGPT from Sebams settings first.');
  if(message.type==='sebams-connect'){
    const profile=await api('/api/profile');if(config.userId&&config.userId!==profile.userId)throw Error('A different ChatGPT account is signed in. Disconnect Sebams first.');
    await configureChatGPTConnection({enabled:true,nonce:config.nonce,expectedNonce:config.nonce,userId:profile.userId,status:'Connected. Synchronizing tasks…'});return syncChatGPT();
  }
  if(message.type==='sebams-sync-request'){
    if(typeof message.userId!=='string'||config.userId&&message.userId!==config.userId)throw Error('This is a different ChatGPT account.');
    if(!config.userId)await configureChatGPTConnection({enabled:true,nonce:config.nonce,expectedNonce:config.nonce,userId:message.userId,status:'Connected. Synchronizing tasks…'});
    await initStore();const {baseline,current,config:latest}=await prepareChatGPTSync();if(!latest.enabled||latest.nonce!==config.nonce||latest.userId!==message.userId)throw Error('The ChatGPT connection changed.');return {sent:current,body:{profileSupport:1,expectedUserId:latest.userId,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'America/La_Paz',changes:planChanges(current,baseline,latest.conflicts.map(c=>c.key))}};
  }
  if(message.type==='sebams-sync-result'){const result=await acceptChatGPTSync(config.nonce,message.sent,message.result);await chrome.alarms.create(CHATGPT_ALARM,{periodInMinutes:1});return result;}
  if(message.type==='sebams-close-connection'){if(config.connectionTabId!==sender.tab?.id||new URL(sender.url).searchParams.get('auto')!=='1')return {};await configureChatGPTConnection({enabled:true,nonce:config.nonce,expectedNonce:config.nonce,connectionTabId:null});setTimeout(()=>chrome.tabs.remove(sender.tab.id).catch(()=>{}),200);return {};}
  throw Error('Unknown connection request.');
}
