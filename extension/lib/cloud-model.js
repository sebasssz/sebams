import {createDefaultState,upgradeState,validateState,taskAttachmentMetadata} from './model.js';
import {canonical} from './task-sync-model.js';
const same=(a,b)=>canonical(a)===canonical(b),copy=value=>value===undefined?undefined:structuredClone(value);
export function cloudState(value){const state=structuredClone(upgradeState(value));state.revision=0;state.weather.cache=null;state.timer={...state.timer,mode:'work',status:'idle',endsAt:null,remainingMs:state.timer.workMinutes*60000,focusView:false,completedAt:null};for(const w of [...Object.values(state.workspaces),...state.profileTrash.map(p=>p.workspace)])for(const task of w.tasks)task.activeSince=null;return validateState(state);}
export const cloudFiles=state=>[...state.images,...taskAttachmentMetadata(state)];
export function firstCloudBaseline(local){const base=createDefaultState();base.focus.day=local.focus.day;return cloudState(base);}
export function mergeCloud(base,local,remote){const conflicts=[];
 const merge=(before,left,right,path=[])=>{
  if(same(left,before))return copy(right);if(same(right,before)||same(left,right))return copy(left);
  if(left===undefined||right===undefined||left===null||right===null||typeof left!=='object'||typeof right!=='object'){conflicts.push(path.join('.'));return copy(left);}
  if(Array.isArray(left)&&Array.isArray(right)){
   const key=value=>typeof value==='string'?'string:'+value:value&&typeof value==='object'&&typeof value.id==='string'?'id:'+value.id:null;
   if([...left,...right,...(Array.isArray(before)?before:[])].some(v=>key(v)===null)){conflicts.push(path.join('.'));return copy(left);}
   const b=new Map((before||[]).map(v=>[key(v),v])),l=new Map(left.map(v=>[key(v),v])),r=new Map(right.map(v=>[key(v),v])),out=[];
   for(const id of new Set([...l.keys(),...r.keys(),...b.keys()])){const value=merge(b.get(id),l.get(id),r.get(id),[...path,id]);if(value!==undefined)out.push(value);}return out;
  }
  if(Array.isArray(left)||Array.isArray(right)){conflicts.push(path.join('.'));return copy(left);}
  const out={};for(const key of new Set([...Object.keys(before||{}),...Object.keys(left),...Object.keys(right)])){const value=merge(before?.[key],left[key],right[key],[...path,key]);if(value!==undefined)out[key]=value;}return out;
 };
 const state=merge(base,local,remote);try{validateState(state);}catch{if(!conflicts.length)conflicts.push('Combined changes need review');}
 return {state,conflicts};
}
