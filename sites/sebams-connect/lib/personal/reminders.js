export const OPEN_REMINDER_DEFAULTS={remindersOnOpen:true,reminderOnOpenLeadMinutes:1440,reminderOnOpenTime:'09:00'};
export function reminderTrigger(task,prefs){
  if(task.reminderAt!==null)return task.reminderAt;
  if(!task.dueDate)return null;
  const at=new Date(task.dueDate+'T'+prefs.reminderOnOpenTime+':00');
  at.setMinutes(at.getMinutes()-prefs.reminderOnOpenLeadMinutes);
  return Number.isFinite(at.getTime())?at.getTime():null;
}
export function dueReminders(state,now=Date.now()){
  if(!state.prefs.remindersOnOpen)return [];
  const items=[];
  for(const [workspace,w] of Object.entries(state.workspaces))for(const task of w.tasks){
    const at=reminderTrigger(task,state.prefs);if(task.done||at===null||at>now)continue;
    items.push({key:JSON.stringify([workspace,task.id,at,task.dueDate]),workspace,id:task.id,text:task.text,list:task.list,dueDate:task.dueDate,priority:task.priority,at});
  }
  return items.sort((a,b)=>a.at-b.at||a.text.localeCompare(b.text));
}
export function selectReminders(state,receipts=[],now=Date.now(),limit=8){
  const previous=new Map(receipts.map(r=>[r.key,r.until]));
  return dueReminders(state,now).filter(r=>(previous.get(r.key)||0)<=now).slice(0,limit);
}
