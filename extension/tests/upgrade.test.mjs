import {stripProduct} from './fixtures.mjs';
import {createTask} from '../lib/planner.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createDefaultState,upgradeState,validateState,validateBackup,WIDGET_KEYS,APPEARANCE_DEFAULTS} from '../lib/model.js';
import {matchesTaskDate,taskDateLabel} from '../lib/tasks.js';
function legacyState() {
  const state=createDefaultState();state.schemaVersion=1;state.prefs.name='Existing user';state.revision=9;
  delete state.photos;for(const key of Object.keys(APPEARANCE_DEFAULTS))delete state.prefs[key];
  state.workspaces.personal.notes='Keep this note';state.workspaces.personal.notesRevision=3;
  state.workspaces.personal.widgets.links=false;
  state.workspaces.personal.tasks=[{id:'old-task',text:'Keep this task',done:false,priority:'high',list:'Inbox'}];
  for(const widgets of [state.prefs.widgets,...Object.values(state.workspaces).map(w=>w.widgets)])for(const key of WIDGET_KEYS)if(!['links','search','weather','tasks'].includes(key))delete widgets[key];
  for(const w of Object.values(state.workspaces))for(const link of w.links)delete link.pinned;
  return stripProduct(state);
}
test('schema upgrade preserves existing data and workspace visibility without mutating the old snapshot',()=>{
  const old=legacyState(),upgraded=upgradeState(old);
  assert.equal(upgraded.schemaVersion,6);assert.equal(old.schemaVersion,1);assert.equal(upgraded.revision,9);
  assert.equal(upgraded.workspaces.personal.notes,'Keep this note');assert.equal(upgraded.workspaces.personal.notesRevision,3);
  assert.equal(upgraded.workspaces.personal.tasks[0].text,'Keep this task');assert.equal(upgraded.workspaces.personal.tasks[0].dueDate,'');
  assert.equal(upgraded.workspaces.personal.widgets.links,false);assert.equal(upgraded.workspaces.personal.widgets.notes,true);
  assert.equal(upgraded.workspaces.personal.links[0].pinned,false);assert.equal(validateState(upgraded),upgraded);
});
test('old backups upgrade and retain content; unknown or unsafe old fields are rejected',()=>{
  const backup={format:'sebams-backup',version:1,state:legacyState(),images:[]};validateBackup(backup);assert.equal(backup.state.schemaVersion,6);assert.equal(backup.state.prefs.name,'Existing user');
  const unknown=legacyState();unknown.prefs.unrecognized=true;assert.throws(()=>upgradeState(unknown));
  const unsafe=legacyState();unsafe.workspaces.personal.links[0].url='javascript:alert(1)';assert.throws(()=>upgradeState(unsafe));
});
test('task dates reject impossible days and permit a blank or valid leap date',()=>{
  const state=createDefaultState();const task=createTask({id:'dated',text:'Review',done:false,priority:'normal',list:'Inbox',dueDate:'',details:'',attachments:[],ai:null,sourceId:''});state.workspaces.work.tasks.push(task);validateState(state);
  task.dueDate='2028-02-29';validateState(state);task.dueDate='2027-02-29';assert.throws(()=>validateState(state));task.dueDate='2026-02-31';assert.throws(()=>validateState(state));
});
test('new visibility values and pins must be booleans; pin count is bounded',()=>{
  const state=createDefaultState();state.workspaces.work.widgets.focus=false;validateState(state);state.workspaces.work.widgets.focus='false';assert.throws(()=>validateState(state));state.workspaces.work.widgets.focus=true;
  state.workspaces.work.links=Array.from({length:8},(_,i)=>({id:'pin-'+i,title:'Website '+i,url:'https://example.com/',folder:'',pinned:true}));validateState(state);
  state.workspaces.work.links.push({id:'ninth',title:'Ninth',url:'https://example.com/',folder:'',pinned:true});assert.throws(()=>validateState(state));
});
test('date views distinguish today, future, unfinished overdue and undated tasks',()=>{
  const day='2026-10-01',task={dueDate:'2026-09-30',done:false};assert.equal(matchesTaskDate(task,'overdue',day),true);task.done=true;assert.equal(matchesTaskDate(task,'overdue',day),false);
  task.dueDate=day;assert.equal(matchesTaskDate(task,'today',day),true);assert.equal(matchesTaskDate(task,'upcoming',day),false);
  task.dueDate='2026-10-02';assert.equal(matchesTaskDate(task,'upcoming',day),true);task.dueDate='';assert.equal(matchesTaskDate(task,'undated',day),true);assert.equal(matchesTaskDate(task,'all',day),true);
});
test('task labels use local calendar dates for today and tomorrow',()=>{assert.equal(taskDateLabel('2026-10-01','2026-10-01'),'Today');assert.equal(taskDateLabel('2026-10-02','2026-10-01'),'Tomorrow');assert.equal(taskDateLabel('','2026-10-01'),'');});
