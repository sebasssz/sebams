import {createWorkspace,validProfileId,PROFILE_COLORS,profileName} from './model.js';
import {pauseTask} from './planner.js';
export {PROFILE_COLORS,profileName};
export function profileChoices(state){return Object.entries(state.workspaces).map(([id,w])=>[id,profileName(w,id)]);}
function cleanName(state,name,except=''){name=String(name).trim();if(!name||name.length>40)throw Error('Use a profile name from 1 to 40 characters.');if(Object.entries(state.workspaces).some(([id,w])=>id!==except&&w.name.toLocaleLowerCase()===name.toLocaleLowerCase()))throw Error('A profile with this name already exists.');return name;}
export function addProfile(state,name,color='stone',id='profile-'+crypto.randomUUID()){
  if(!validProfileId(id))throw Error('Invalid profile identity.');if(Object.keys(state.workspaces).length>=12)throw Error('You can have up to 12 profiles.');if(!PROFILE_COLORS.includes(color))throw Error('Choose a profile color.');
  if(Object.hasOwn(state.workspaces,id)||(state.profileTrash||[]).some(item=>item.id===id))throw Error('This profile already exists.');
  state.workspaces[id]=createWorkspace(cleanName(state,name),color);state.workspace=id;return id;
}
export function renameProfile(state,id,name,color){const w=state.workspaces[id];if(!w)throw Error('This profile changed in another tab.');w.name=cleanName(state,name,id);if(color!==undefined){if(!PROFILE_COLORS.includes(color))throw Error('Choose a profile color.');w.color=color;}}
export function archiveProfile(state,id,now=Date.now()){
  const w=state.workspaces[id];if(!w)throw Error('This profile was already removed.');if(Object.keys(state.workspaces).length<2)throw Error('Keep at least one profile.');
  if(state.profileTrash.length>=12)throw Error('Recently deleted is full. Restore a profile or permanently remove one first.');
  for(const task of w.tasks)if(task.activeSince!==null)pauseTask(task,now);
  state.profileTrash.push({id,deletedAt:now,workspace:w});delete state.workspaces[id];if(state.workspace===id)state.workspace=Object.keys(state.workspaces)[0];
}
export function restoreProfile(state,id){
  const index=state.profileTrash.findIndex(item=>item.id===id);if(index<0)throw Error('This profile is no longer in Recently deleted.');if(Object.keys(state.workspaces).length>=12)throw Error('You can have up to 12 active profiles.');
  const w=state.profileTrash[index].workspace;let name=w.name,suffix=1;
  while(Object.values(state.workspaces).some(active=>active.name.toLocaleLowerCase()===name.toLocaleLowerCase()))name=w.name.slice(0,26)+' (restored '+suffix+++')';
  w.name=name;state.workspaces[id]=w;state.profileTrash.splice(index,1);state.workspace=id;
}
export function eraseProfile(state,id){const index=state.profileTrash.findIndex(item=>item.id===id);if(index<0)throw Error('This profile is no longer in Recently deleted.');state.profileTrash.splice(index,1);}
