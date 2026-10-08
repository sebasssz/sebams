import {localDay} from './model.js';
export function matchesTaskDate(task,filter,day=localDay()) {
  if(filter==='completed')return task.done;
  if(filter==='today')return task.dueDate===day;
  if(filter==='upcoming')return !!task.dueDate&&task.dueDate>day;
  if(filter==='overdue')return !!task.dueDate&&task.dueDate<day&&!task.done;
  if(filter==='undated')return !task.dueDate;
  return true;
}
export function taskDateLabel(value,day=localDay()) {
  if(!value)return '';
  if(value===day)return 'Today';
  const tomorrow=new Date(day+'T12:00:00');tomorrow.setDate(tomorrow.getDate()+1);
  if(value===localDay(tomorrow))return 'Tomorrow';
  return new Date(value+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:value.slice(0,4)!==day.slice(0,4)?'numeric':undefined});
}
