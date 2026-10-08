import {stripProduct} from './fixtures.mjs';
import {createTask} from '../lib/planner.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createDefaultState,upgradeState,validateState,validateBackup} from '../lib/model.js';
const task=(id='task')=>createTask({id,text:'Exercise',done:false,priority:'normal',list:'Inbox',dueDate:'',details:'',attachments:[],ai:null,sourceId:''});
const photo=(id='photo',size=3)=>({id,name:'exercise.jpg',type:'image/jpeg',size});

test('schema 3 migration preserves appearance, dates and contents and initializes task extras',()=>{
  const old=createDefaultState();old.schemaVersion=3;old.prefs.panelOpacity=55;const item=task();item.dueDate='2026-10-10';for(const key of ['details','attachments','ai','sourceId'])delete item[key];old.workspaces.personal.tasks=[item];stripProduct(old);const upgraded=upgradeState(old);assert.equal(upgraded.schemaVersion,6);assert.equal(upgraded.prefs.panelOpacity,55);assert.equal(upgraded.workspaces.personal.tasks[0].dueDate,'2026-10-10');assert.deepEqual(upgraded.workspaces.personal.tasks[0].attachments,[]);assert.equal(upgraded.workspaces.personal.tasks[0].ai,null);assert.equal(old.schemaVersion,3);assert.ok(!Object.hasOwn(item,'details'));const unsafe=structuredClone(old);unsafe.workspaces.personal.tasks[0].unexpected=true;assert.throws(()=>upgradeState(unsafe));
});
test('task details, photo types and counts, duplicate references and answers are bounded',()=>{
  const base=createDefaultState();base.workspaces.personal.tasks=[task()];for(const change of [t=>t.details='x'.repeat(12001),t=>t.attachments=[{...photo(),type:'image/svg+xml'}],t=>t.attachments=Array.from({length:5},(_,i)=>photo('p'+i)),t=>t.attachments=[photo('a'),photo('a')],t=>t.ai={text:'x'.repeat(20001),model:'fixture',createdAt:1},t=>t.ai={text:'answer',model:'fixture',createdAt:1,unexpected:true}]){const copy=structuredClone(base);change(copy.workspaces.personal.tasks[0]);assert.throws(()=>validateState(copy));}
  const duplicate=structuredClone(base);duplicate.workspaces.personal.tasks[0].attachments=[photo()];duplicate.workspaces.study.tasks=[{...task('other'),attachments:[photo()]}];assert.throws(()=>validateState(duplicate));
});
test('task photo byte budget applies across every workspace',()=>{
  const state=createDefaultState();state.workspaces.personal.tasks=[{...task(),attachments:Array.from({length:4},(_,i)=>photo('p'+i,8*1024*1024))}];state.workspaces.study.tasks=[{...task('other'),attachments:[photo('fifth',8*1024*1024)]}];validateState(state);state.workspaces.study.tasks[0].attachments.push(photo('too-much',1));assert.throws(()=>validateState(state),/40 MB/);
});
test('backups bind every task photo to its metadata and reject missing or mismatched bytes',()=>{
  const state=createDefaultState();state.workspaces.personal.tasks=[{...task(),attachments:[photo()],details:'x + 1 = 3',ai:{text:'x = 2',model:'fixture',createdAt:1}}];const backup={format:'sebams-backup',version:2,state,images:[],attachments:[{id:'photo',name:'exercise.jpg',type:'image/jpeg',data:'data:image/jpeg;base64,/9j/'}]};validateBackup(backup);for(const mutate of [b=>b.attachments=[],b=>b.attachments[0].name='other.jpg',b=>b.attachments[0].data='data:image/png;base64,/9j/',b=>b.attachments[0].data+='AAAA',b=>b.token='private-code']){const invalid=structuredClone(backup);mutate(invalid);assert.throws(()=>validateBackup(invalid));}
});
