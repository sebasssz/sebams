// Calendar arithmetic uses local noon so daylight-saving changes cannot shift dates.
export const TASK_EXTRA_DEFAULTS = {subtasks:[],reminderAt:null,remindedAt:null,recurrence:null,nextOccurrenceId:'',estimateMinutes:0,timeSpentMs:0,activeSince:null,completedAt:null,kind:'task',planId:''};
export function createTask(value) { return {details:'',attachments:[],ai:null,sourceId:'',...structuredClone(TASK_EXTRA_DEFAULTS),id:crypto.randomUUID(),text:'',done:false,priority:'normal',list:'Inbox',dueDate:'',...value}; }
export function dayString(d) { return `${String(d.getFullYear()).padStart(4,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function addDays(day,n) { const d=new Date(day+'T12:00:00');d.setDate(d.getDate()+n);return dayString(d); }
export function weekDays(day=dayString(new Date()),offset=0) { const d=new Date(day+'T12:00:00');return Array.from({length:7},(_,i)=>addDays(day,-(d.getDay()+6)%7+offset*7+i)); }
export function nextDate(day,frequency,anchorDay=Number(day.slice(-2))) {
  if(frequency==='daily')return addDays(day,1);
  if(frequency==='weekly')return addDays(day,7);
  const d=new Date(day+'T12:00:00');d.setDate(1);d.setMonth(d.getMonth()+1);const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();d.setDate(Math.min(anchorDay,last));return dayString(d);
}
export function elapsed(task,now=Date.now()) { return task.timeSpentMs+(task.activeSince===null?0:Math.max(0,now-task.activeSince)); }
export function pauseTask(task,now=Date.now()) { task.timeSpentMs=elapsed(task,now);task.activeSince=null; }
export function trackTask(state,workspaceId,id,now=Date.now()) {
  const task=state.workspaces[workspaceId].tasks.find(t=>t.id===id);if(!task||task.done)throw Error('Choose an unfinished task to track.');
  const wasRunning=task.activeSince!==null;
  for(const w of Object.values(state.workspaces))for(const t of w.tasks)if(t.activeSince!==null)pauseTask(t,now);
  if(!wasRunning)task.activeSince=now;
}
export function reminderFromDue(dueDate,lead=60) { return dueDate?new Date(dueDate+'T09:00:00').getTime()-lead*60000:null; }
// Applied in the same storage transaction as completion: one successor per occurrence.
export function finalizeTasks(state,before,now=Date.now()) {
  for(const [wsid,w] of Object.entries(state.workspaces)){
    const previous=new Map(before.workspaces[wsid].tasks.map(t=>[t.id,t]));
    for(const task of [...w.tasks]){
      const old=previous.get(task.id);
      if(!old)for(const [key,value] of Object.entries(TASK_EXTRA_DEFAULTS))if(!Object.hasOwn(task,key))task[key]=structuredClone(value);
      if(task.reminderAt!==old?.reminderAt)task.remindedAt=null;
      if(task.done&&!old?.done){task.completedAt=now;pauseTask(task,now);
        if(task.recurrence&&!task.nextOccurrenceId){
          if(!task.dueDate)throw Error('A repeating task needs a due date.');
          if(w.tasks.length>=300)throw Error('This workspace is full. Free a task before completing a repeating task.');
          const dueDate=nextDate(task.dueDate,task.recurrence.frequency,task.recurrence.anchorDay);
          if(dueDate>'9999-12-31')throw Error('The next date is outside the supported calendar.');
          const next=createTask({text:task.text,list:task.list,priority:task.priority,dueDate,details:task.details,estimateMinutes:task.estimateMinutes,subtasks:task.subtasks.map(t=>({...t,id:crypto.randomUUID(),done:false})),recurrence:structuredClone(task.recurrence),reminderAt:task.reminderAt===null?null:new Date(dueDate+'T09:00:00').getTime()-(new Date(task.dueDate+'T09:00:00').getTime()-task.reminderAt)});
          task.nextOccurrenceId=next.id;w.tasks.push(next);
        }
      }else if(!task.done&&old?.done)task.completedAt=null;
    }
  }
}
export function examSchedule({startDate,date,topics,minutes=30}) {
  if(!startDate||!date||date<=startDate)throw Error('Choose an exam date after the first study day.');
  const cleaned=topics.map(t=>t.trim()).filter(Boolean);if(!cleaned.length||cleaned.length>60||cleaned.some(t=>t.length>300))throw Error('Enter 1–60 topics, one per line (up to 300 characters each).');
  const days=Math.round((new Date(date+'T12:00:00')-new Date(startDate+'T12:00:00'))/86400000);if(days>366)throw Error('Plan within the next year.');
  return cleaned.map((text,i)=>({text,dueDate:addDays(startDate,Math.floor(i*days/cleaned.length)),estimateMinutes:minutes}));
}
export function createExamPlan(w,values) {
  const schedule=examSchedule(values);if(w.exams.length>=20||w.tasks.length+schedule.length+1>300)throw Error('There is not enough room for this plan.');
  if(!w.lists.includes(values.list))throw Error('Choose an existing subject or list.');
  const plan={id:crypto.randomUUID(),title:values.title.trim(),list:values.list,date:values.date,startDate:values.startDate,topics:schedule.map(t=>t.text),minutes:values.minutes};
  w.exams.push(plan);w.tasks.push(createTask({text:plan.title,list:plan.list,dueDate:plan.date,priority:'high',kind:'exam',planId:plan.id}));
  for(const item of schedule)w.tasks.push(createTask({...item,text:`Study: ${item.text}`.slice(0,300),details:item.text,list:plan.list,kind:'study',planId:plan.id}));return plan;
}
export function weeklyProgress(w,days,now=Date.now()) {
  const start=new Date(days[0]+'T00:00:00').getTime(),end=new Date(addDays(days[6],1)+'T00:00:00').getTime();
  return w.lists.map(list=>{const tasks=w.tasks.filter(t=>t.list===list);return {list,completed:tasks.filter(t=>t.done&&t.completedAt>=start&&t.completedAt<end).length,due:tasks.filter(t=>days.includes(t.dueDate)).length,minutes:Math.round(tasks.filter(t=>t.completedAt>=start&&t.completedAt<end).reduce((n,t)=>n+elapsed(t,now),0)/60000)};});
}
export function captureTask(info,tab={}) {
  const raw=info.linkUrl||info.pageUrl||tab.url||'';let url='';try{const u=new URL(raw);if(['http:','https:'].includes(u.protocol)&&!u.username&&!u.password)url=u.href.slice(0,2000);}catch{}
  const selection=(info.selectionText||'').trim(),text=(selection||tab.title||url||'Captured task').slice(0,300);
  return createTask({text,details:[selection,url].filter(Boolean).join('\n\nSource: ').slice(0,12000)});
}
export function searchEntries(state,query) {
  const q=query.toLocaleLowerCase().trim(),out=[];
  for(const [workspace,w] of Object.entries(state.workspaces)){
    for(const t of w.tasks)out.push({type:'task',workspace,id:t.id,label:t.text,meta:`${workspace} · ${t.list}${t.done?' · completed':''}`,search:t.text+' '+t.details+' '+t.list});
    for(const list of w.lists)out.push({type:'list',workspace,id:list,label:list,meta:workspace+' · list',search:list});
    for(const link of w.links)out.push({type:'link',workspace,id:link.id,label:link.title,meta:new URL(link.url).hostname,url:link.url,search:link.title+' '+link.url});
  }
  return out.filter(e=>!q||e.search.toLocaleLowerCase().includes(q)).slice(0,40);
}
