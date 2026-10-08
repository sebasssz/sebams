import {initStore,mutate} from './store.js';
import {captureTask} from './planner.js';
export async function saveCapture(info,tab){await initStore();let id,workspace;await mutate(s=>{workspace=s.workspace;const w=s.workspaces[workspace];if(w.tasks.length>=300)throw Error('This workspace is full.');if(!w.lists.includes('Inbox')){if(w.lists.length>=20)throw Error('This workspace has too many lists.');w.lists.unshift('Inbox');}const task=captureTask(info,tab);id=task.id;w.tasks.push(task);});return {id,workspace};}
