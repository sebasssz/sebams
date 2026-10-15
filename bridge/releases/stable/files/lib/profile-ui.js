import {el} from './ui.js';
import {addProfile,renameProfile,archiveProfile,restoreProfile,eraseProfile,PROFILE_COLORS,profileName} from './profiles.js';
let editor=null;
export function renderProfiles(ctx){
  const {body,state,save,render,toast,beforeChange}=ctx;
  const help=text=>el('p',{class:'help'},text),button=(text,action,cls='secondary',attrs={})=>el('button',{type:'button',class:cls,...attrs,onclick:async()=>{try{await action();}catch(error){toast(error.message);}}},text),field=(label,node)=>el('label',{},label,node);
  const change=async fn=>{await beforeChange();await save(fn);editor=null;render();};
  const count=w=>`${w.tasks.length} tasks · ${w.links.length} links · ${w.lists.length} lists`;
  const open=(mode,id='')=>{editor={mode,id,name:state.workspaces[id]?.name||'',color:state.workspaces[id]?.color||'stone'};render();body.querySelector('[aria-label="Profile name"]')?.focus();};
  const head=el('div',{class:'profile-section-heading'},el('div',{},el('h3',{},'A space for every part of your day'),help('Each profile keeps its own tasks, links, notes and habits.')),button('New profile',()=>open('new'),'primary',{disabled:Object.keys(state.workspaces).length>=12}));body.append(head);
  const cards=el('div',{class:'profile-grid'});body.append(cards);
  for(const [id,w] of Object.entries(state.workspaces)){
    const selected=id===state.workspace;
    const card=el('section',{class:'profile-card'+(selected?' selected':''),'data-profile-color':w.color},el('div',{class:'profile-card-top'},el('span',{class:'profile-avatar','aria-hidden':'true'},w.name.slice(0,2).toUpperCase()),selected?el('span',{class:'profile-current'},'Current'):null),el('h4',{},w.name),help(count(w)),el('div',{class:'profile-actions'},button(selected?'Using this profile':'Switch profile',()=>change(s=>{if(!s.workspaces[id])throw Error('This profile was removed.');s.workspace=id;}),'secondary',{'aria-label':'Switch to '+w.name,disabled:selected}),button('Rename',()=>open('edit',id),'text-button',{'aria-label':'Rename '+w.name}),button('Delete',()=>open('delete',id),'text-button danger',{'aria-label':'Delete '+w.name,disabled:Object.keys(state.workspaces).length===1,title:Object.keys(state.workspaces).length===1?'Keep at least one profile':'Delete this profile'})));
    cards.append(card);
  }
  if(editor){
    const current=editor,id=current.id,w=state.workspaces[id];
    if(current.mode==='delete'&&w){
      body.append(el('section',{class:'profile-confirm'},el('h3',{},'Delete “'+w.name+'”?'),help(count(w)+'. This profile and its content will move to Recently deleted on this device. You can restore it later. If ChatGPT is connected, its active task copy will also be removed on the next sync.'),el('div',{class:'row wrap'},button('Delete profile',async()=>{await change(s=>archiveProfile(s,id));toast('Profile moved to Recently deleted.',async()=>{await save(s=>restoreProfile(s,id));render();});},'primary danger-button'),button('Cancel',()=>{editor=null;render();},'secondary'))));
    }else if(current.mode==='erase'){
      const archived=state.profileTrash.find(item=>item.id===id);if(archived){const confirm=el('input',{type:'checkbox',required:true,'aria-label':'Confirm permanent profile deletion'});body.append(el('form',{class:'profile-confirm',onsubmit:async event=>{event.preventDefault();if(!confirm.checked)return;try{await change(s=>eraseProfile(s,id));toast('Deleted profile permanently removed.');}catch(error){toast(error.message);}}},el('h3',{},'Permanently delete “'+archived.workspace.name+'”?'),help('Its saved tasks, notes, links, habits and reference photos will be removed from Recently deleted on this device. This cannot be undone.'),el('label',{class:'row'},confirm,el('span',{},'I understand this permanently removes the saved profile.')),el('div',{class:'row wrap'},el('button',{type:'submit',class:'primary danger-button'},'Delete permanently'),button('Cancel',()=>{editor=null;render();},'secondary'))));}
    }else if(current.mode==='new'||current.mode==='edit'&&w){
      const name=el('input',{value:current.name,required:true,maxlength:40,'aria-label':'Profile name',placeholder:'For example, University',oninput:e=>{current.name=e.target.value;}}),color=el('select',{'aria-label':'Profile color',onchange:e=>{current.color=e.target.value;}},PROFILE_COLORS.map(value=>el('option',{value,selected:value===current.color},value[0].toUpperCase()+value.slice(1))));
      body.append(el('form',{class:'profile-editor stack',onsubmit:async event=>{event.preventDefault();try{await change(s=>current.mode==='new'?addProfile(s,current.name,current.color):renameProfile(s,id,current.name,current.color));toast(current.mode==='new'?'Profile created.':'Profile updated.');}catch(error){toast(error.message);}}},el('h3',{},current.mode==='new'?'Create a profile':'Edit profile'),el('div',{class:'field-grid'},field('Name',name),field('Color',color)),el('div',{class:'row wrap'},el('button',{type:'submit',class:'primary'},current.mode==='new'?'Create profile':'Save profile'),button('Cancel',()=>{editor=null;render();},'secondary'))));
    }
  }
  const trash=el('details',{class:'profile-trash section'},el('summary',{},'Recently deleted · '+state.profileTrash.length));body.append(trash);trash.append(help('Deleted profiles stay on this device and in your backups until you permanently remove them. They do not receive reminders or synchronize as active profiles.'));
  for(const item of state.profileTrash)trash.append(el('div',{class:'profile-trash-row'},el('div',{},el('strong',{},profileName(item.workspace,item.id)),help(count(item.workspace))),el('div',{class:'row wrap'},button('Restore',()=>change(s=>restoreProfile(s,item.id)),'secondary',{'aria-label':'Restore '+item.workspace.name}),button('Delete forever',()=>{editor={mode:'erase',id:item.id};render();},'text-button danger',{'aria-label':'Permanently delete '+item.workspace.name}))));
  if(!state.profileTrash.length)trash.append(help('No deleted profiles.'));
}
