import {initStore,getState,mutate,getBridgeConfig} from './lib/store.js';
import {receiveBridgeTasks} from './lib/bridge-sync.js';
import {remaining,reconcileTimer} from './lib/timer.js';
import {saveCapture} from './lib/capture.js';
import {syncUpdateCheck,restoreUpdatedTab,UPDATE_ALARM} from './lib/updates.js';
const TASKS='sebams-task-reminders',CAPTURE='sebams-capture';let tasksPromise=null,tasksAgain=false,reminderRetryAfter=0;
function syncTasks(){if(tasksPromise){tasksAgain=true;return tasksPromise;}tasksPromise=runTaskSync().finally(()=>{tasksPromise=null;});return tasksPromise;}
async function runTaskSync(){
  do{tasksAgain=false;await initStore();let state=getState();
    if(!state.prefs.remindersEnabled||!await chrome.permissions.contains({permissions:['notifications']})){await chrome.alarms.clear(TASKS);continue;}
    const now=Date.now();if(now<reminderRetryAfter){await chrome.alarms.create(TASKS,{when:reminderRetryAfter});continue;}
    const due=[];for(const [wsid,w] of Object.entries(state.workspaces))for(const t of w.tasks)if(!t.done&&t.reminderAt!==null&&t.remindedAt===null&&t.reminderAt<=now)due.push({wsid,t});
    for(const {wsid,t} of due.slice(0,5)){
      let claimed=false;await mutate(s=>{const current=s.workspaces[wsid].tasks.find(x=>x.id===t.id);if(s.prefs.remindersEnabled&&current&&!current.done&&current.reminderAt===t.reminderAt&&current.remindedAt===null){current.remindedAt=now;claimed=true;}});
      if(!claimed)continue;
      try{await chrome.notifications.create('task:'+wsid+':'+t.id,{type:'basic',iconUrl:'assets/icons/icon128.png',title:'Sebams · '+t.list,message:t.text,contextMessage:t.dueDate?'Due '+t.dueDate:'Task reminder',silent:true});}
      catch(error){reminderRetryAfter=Date.now()+60000;await mutate(s=>{const current=s.workspaces[wsid].tasks.find(x=>x.id===t.id);if(current?.remindedAt===now)current.remindedAt=null;});break;}
    }
    state=getState();const pending=Object.values(state.workspaces).flatMap(w=>w.tasks).filter(t=>!t.done&&t.reminderAt!==null&&t.remindedAt===null);
    if(pending.length)await chrome.alarms.create(TASKS,{when:Math.max(Date.now()+60000,Math.min(...pending.map(t=>t.reminderAt)))});else await chrome.alarms.clear(TASKS);
  }while(tasksAgain);
}
async function setupCapture(){await chrome.contextMenus.removeAll();chrome.contextMenus.create({id:CAPTURE,title:'Add to Sebams Tasks',contexts:['selection','link','page'],documentUrlPatterns:['http://*/*','https://*/*']},()=>{if(chrome.runtime.lastError)console.error('Sebams capture menu could not be created.');});}
chrome.contextMenus.onClicked.addListener((info,tab)=>{if(info.menuItemId!==CAPTURE)return;(async()=>{const {id,workspace:wsid}=await saveCapture(info,tab);await chrome.tabs.create({url:chrome.runtime.getURL('newtab.html')+'?workspace='+wsid+'&task='+encodeURIComponent(id)});})().catch(console.error);});
function openReminder(id){if(!id.startsWith('task:'))return;const [,workspace,...parts]=id.split(':');chrome.tabs.create({url:chrome.runtime.getURL('newtab.html')+'?workspace='+workspace+'&task='+encodeURIComponent(parts.join(':'))}).catch(()=>{});chrome.notifications.clear(id).catch(()=>{});}
function registerNotifications(){const event=chrome.notifications?.onClicked;if(event&&!event.hasListener(openReminder))event.addListener(openReminder);}
registerNotifications();
chrome.permissions.onAdded.addListener(()=>{registerNotifications();syncTasks().catch(console.error);});
chrome.permissions.onRemoved.addListener(()=>syncTasks().catch(console.error));
const NAME='sebams-timer';
const BRIDGE='sebams-bridge';let bridgeBusy=false;
async function syncBridge(){if(bridgeBusy)return;bridgeBusy=true;try{const config=await getBridgeConfig();if(!config.token){await chrome.alarms.clear(BRIDGE);return;}await chrome.alarms.create(BRIDGE,{periodInMinutes:1});await receiveBridgeTasks();}finally{bridgeBusy=false;}}
async function sync(){await initStore();const timer=getState().timer;if(timer.status==='running'&&remaining(timer)===0)await mutate(s=>{s.timer=reconcileTimer(s.timer);});const current=getState().timer;if(current.status==='running')await chrome.alarms.create(NAME,{when:Math.max(Date.now()+500,current.endsAt)});else await chrome.alarms.clear(NAME);}
chrome.runtime.onMessage.addListener((message,sender,reply)=>{if(sender.id!==chrome.runtime.id||!['timer-sync','bridge-sync','task-sync','update-sync'].includes(message?.type))return;(message.type==='update-sync'?syncUpdateCheck():message.type==='bridge-sync'?Promise.all([syncBridge(),syncUpdateCheck()]):message.type==='task-sync'?syncTasks():sync()).then(result=>reply({ok:true,...(message.type==='update-sync'?{updates:result}:{})}),()=>reply({ok:false}));return true;});
chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name===UPDATE_ALARM)syncUpdateCheck().catch(()=>{});if(alarm.name===NAME)sync().catch(console.error);if(alarm.name===BRIDGE)syncBridge().catch(()=>{});if(alarm.name===TASKS)syncTasks().catch(console.error);});
chrome.runtime.onStartup.addListener(()=>{sync().catch(console.error);syncTasks().catch(console.error);});
chrome.runtime.onInstalled.addListener(()=>{restoreUpdatedTab().catch(console.error);sync().catch(console.error);syncTasks().catch(console.error);setupCapture().catch(console.error);});
sync().catch(console.error);
syncBridge().catch(()=>{});
syncTasks().catch(console.error);
syncUpdateCheck().catch(()=>{});
