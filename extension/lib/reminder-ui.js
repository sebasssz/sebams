import {el,icon} from './ui.js';
import {claimOpenReminders,settleOpenReminders} from './store.js';
export function installReminderInbox({getState,save,run,openTask,toast,canShow}){
  const dialog=el('dialog',{id:'task-reminders',class:'reminder-inbox','aria-labelledby':'reminder-title'});document.body.append(dialog);
  let busy=false,entries=[],preview=false;
  const button=(label,fn,cls='secondary',attrs={})=>el('button',{type:'button',class:cls,onclick:run(fn),...attrs},label);
  const finish=async(until)=>{if(!preview)await settleOpenReminders(entries.map(r=>r.key),until);dialog.close();entries=[];};
  dialog.addEventListener('cancel',run(async event=>{event.preventDefault();await finish(Number.MAX_SAFE_INTEGER);}));
  function render(){
    const state=getState();dialog.replaceChildren(el('header',{class:'reminder-heading'},el('img',{src:'assets/logo.svg',alt:'',width:30,height:30}),el('div',{},el('p',{class:'eyebrow'},preview?'PREVIEW':'A LITTLE HEADS-UP'),el('h2',{id:'reminder-title'},'Your upcoming tasks')),button(icon('close'),()=>finish(Number.MAX_SAFE_INTEGER),'icon-button',{'aria-label':'Dismiss reminders'})));
    dialog.append(el('p',{class:'help'},preview?'This is how a reminder appears when you open Sebams.':'A little time to prepare. Open a task, finish it, or remind yourself later.'));
    const list=el('ul',{class:'reminder-list'});
    for(const item of entries){const due=item.dueDate?new Date(item.dueDate+'T12:00:00').toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}):'Scheduled reminder';list.append(el('li',{class:'reminder-card'},el('div',{class:'item-main'},el('small',{},item.workspace+' · '+item.list),el('strong',{},item.text),el('span',{class:'reminder-date'},(item.dueDate?'Due '+due:due)+(item.priority==='high'?' · High priority':''))),el('div',{class:'reminder-actions'},button('Open task',async()=>{if(preview){await finish(0);return;}await settleOpenReminders([item.key],Number.MAX_SAFE_INTEGER);dialog.close();entries=[];await openTask(item.workspace,item.id);},'secondary'),button(icon('check'),async()=>{if(preview){await finish(0);return;}await save(s=>{const task=s.workspaces[item.workspace].tasks.find(t=>t.id===item.id);if(!task)throw Error('This task was deleted in another tab.');task.done=true;});await settleOpenReminders([item.key],Number.MAX_SAFE_INTEGER);entries=entries.filter(r=>r.key!==item.key);if(!entries.length)dialog.close();else render();toast('Task completed.');},'icon-button',{'aria-label':'Complete reminder '+item.text}))));}
    dialog.append(list,el('footer',{class:'reminder-footer'},button('Remind me in 1 hour',()=>finish(Date.now()+3600000),'secondary'),button('Got it',()=>finish(Number.MAX_SAFE_INTEGER),'primary')));
  }
  async function show(){if(busy||dialog.open||!canShow())return;busy=true;try{const claimed=await claimOpenReminders();if(!claimed.length)return;if(!canShow()){await settleOpenReminders(claimed.map(r=>r.key),0);return;}entries=claimed;preview=false;render();dialog.showModal();}finally{busy=false;}}
  async function showPreview(){if(dialog.open)return;preview=true;entries=[{workspace:getState().workspace,list:'Inbox',text:'Finish your next assignment',dueDate:'',priority:'normal',key:'preview'}];render();dialog.showModal();}
  return {show,preview:showPreview};
}
