import {getBridgeConfig,getUpdatePreferences,patchUpdatePreferences,setUpdateReload,takeUpdateReload} from './store.js';
import {bridgeRequest,hasBridgeAccess} from './ai.js';
export const UPDATE_ALARM='sebams-update-check';
export async function reloadAfterUpdate(){const tab=await chrome.tabs.getCurrent();await setUpdateReload({tabId:tab?.id??null,at:Date.now()});chrome.runtime.reload();}
export async function restoreUpdatedTab(){const pending=await takeUpdateReload();if(!pending||Date.now()-pending.at>120000||pending.at>Date.now())return;const url=chrome.runtime.getURL('newtab.html');if(pending.tabId!==null)try{await chrome.tabs.update(pending.tabId,{url});return;}catch{}await chrome.tabs.create({url});}
export async function checkForUpdates(){
  const {token}=await getBridgeConfig();
  const result=await bridgeRequest('/updates?current='+encodeURIComponent(chrome.runtime.getManifest().version),token,{timeout:25000});
  if(typeof result?.configured!=='boolean'||typeof result.available!=='boolean'||result.available&&(typeof result.version!=='string'||!/^\d+(\.\d+){0,3}$/.test(result.version)||!/^[a-f0-9]{64}$/.test(result.fingerprint)||typeof result.notes!=='string'||result.notes.length>2000))throw Error('The local update information is unreadable.');
  await patchUpdatePreferences({lastCheckedAt:Date.now(),availableVersion:result.available?result.version:''});return result;
}
let updateSync=Promise.resolve();
export function syncUpdateCheck(){const next=updateSync.catch(()=>{}).then(runUpdateCheck);updateSync=next;return next;}
async function runUpdateCheck(){
  const prefs=await getUpdatePreferences(),{token}=await getBridgeConfig();
  const access=token?await hasBridgeAccess():false;
  if(!prefs.autoCheck||!token||!access){await chrome.alarms.clear(UPDATE_ALARM);return {enabled:false,reason:!prefs.autoCheck?'off':!token?'unpaired':'permission'};}
  const alarm=(await chrome.alarms.getAll()).find(a=>a.name===UPDATE_ALARM);
  if(!alarm||alarm.periodInMinutes!==1440)await chrome.alarms.create(UPDATE_ALARM,{periodInMinutes:1440});
  if(Date.now()-prefs.lastCheckedAt>=86400000)await checkForUpdates();
  return {enabled:true};
}
