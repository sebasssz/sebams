export const WORKSPACES=['personal','work','study'];
export const TASK_FIELDS=['type','id','workspace','text','details','list','dueDate','priority','done'];
const clone=value=>value===undefined?undefined:structuredClone(value);
export function canonical(value){if(value===undefined)return 'undefined';if(value===null||typeof value!=='object')return JSON.stringify(value);if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';}
const equal=(a,b)=>canonical(a)===canonical(b);
export function validDate(value){if(value==='')return true;if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+'T12:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;}
const string=(value,max,empty=false)=>typeof value==='string'&&value.length<=max&&(empty||!!value.trim());
export function recordKey(record){return record.type==='workspace'?'workspace:'+record.id:'task:'+record.workspace+':'+record.id;}
export function validateRecord(record,key=record&&recordKey(record)){
  if(!record||typeof record!=='object'||Array.isArray(record))throw Error('Invalid task record.');
  if(record.type==='workspace'){
    if(Object.keys(record).some(k=>!['type','id','lists'].includes(k))||!WORKSPACES.includes(record.id)||!Array.isArray(record.lists)||record.lists.length<1||record.lists.length>20||record.lists.some(l=>!string(l,40)||l!==l.trim())||new Set(record.lists).size!==record.lists.length)throw Error('Invalid task lists.');
  }else if(record.type==='task'){
    if(Object.keys(record).some(k=>!TASK_FIELDS.includes(k))||!string(record.id,100)||!WORKSPACES.includes(record.workspace)||!string(record.text,300)||!string(record.details,12000,true)||!string(record.list,40)||!validDate(record.dueDate)||!['low','normal','high'].includes(record.priority)||typeof record.done!=='boolean')throw Error('Invalid task.');
  }else throw Error('Unknown task record.');
  if(recordKey(record)!==key)throw Error('Task identity changed.');return record;
}
export function validateRecords(records){if(!Array.isArray(records)||records.length>10000)throw Error('Invalid task collection.');const keys=new Set();for(const item of records){if(!item||typeof item.key!=='string'||item.key.length>160||keys.has(item.key)||!Number.isSafeInteger(item.version)||item.version<0)throw Error('Invalid synchronized record.');keys.add(item.key);if(item.value!==null)validateRecord(item.value,item.key);else if(!/^(task:(personal|work|study):.{1,100}|workspace:(personal|work|study))$/.test(item.key))throw Error('Invalid removed task.');}return records;}
export function projectTasks(state){const out={};for(const id of WORKSPACES){const w=state.workspaces[id];const lists={type:'workspace',id,lists:[...w.lists]};out[recordKey(lists)]=lists;for(const task of w.tasks){const value={type:'task',id:task.id,workspace:id,text:task.text,details:task.details,list:task.list,dueDate:task.dueDate,priority:task.priority,done:task.done};out[recordKey(value)]=value;}}return out;}
export function mergeRecord(base,local,remote){
  if(equal(local,base))return {value:clone(remote),conflicts:[]};
  if(equal(remote,base)||equal(local,remote))return {value:clone(local),conflicts:[]};
  if(!base||!local||!remote)return {value:clone(local),conflicts:['record']};
  const value=clone(remote),conflicts=[];for(const field of new Set([...Object.keys(base),...Object.keys(local),...Object.keys(remote)])){if(equal(local[field],base[field]))continue;if(equal(remote[field],base[field])||equal(local[field],remote[field]))value[field]=clone(local[field]);else conflicts.push(field);}return {value,conflicts};
}
export function planChanges(current,baseline={},blocked=[]){const ignored=new Set(blocked);return [...new Set([...Object.keys(current),...Object.keys(baseline)])].filter(key=>!ignored.has(key)&&!equal(current[key]??null,baseline[key]??null)).map(key=>({key,base:baseline[key]??null,value:current[key]??null}));}
export function reconcileProjection(sent,current,records){validateRecords(records);const values={},baseline={},conflicts=[];for(const record of records){const key=record.key,remote=record.value;baseline[key]=clone(remote);const result=mergeRecord(sent[key]??null,current[key]??null,remote);if(result.conflicts.length)conflicts.push({key,fields:result.conflicts,local:current[key]??null,remote});else values[key]=result.value;}return {values,baseline,conflicts};}
export function validateCollection(values){for(const id of WORKSPACES){const ws=values['workspace:'+id];if(!ws)throw Error('Connect Sebams to share its task lists first.');validateRecord(ws);const tasks=Object.values(values).filter(t=>t?.type==='task'&&t.workspace===id);if(tasks.length>300)throw Error('A workspace can hold up to 300 tasks.');for(const task of tasks){validateRecord(task);if(!ws.lists.includes(task.list))throw Error('Choose a list available in this workspace.');}}}
export function calendarDay(timeZone,now=Date.now(),offset=0){const formatter=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'});const parts=Object.fromEntries(formatter.formatToParts(now).map(p=>[p.type,p.value]));const date=new Date(`${parts.year}-${parts.month}-${parts.day}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+offset);return date.toISOString().slice(0,10);}
