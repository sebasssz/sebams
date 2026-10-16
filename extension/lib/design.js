import {el,icon} from './ui.js';
import {profileName} from './profiles.js';
const pages={account:['Account','Your space, wherever you are.','cloud'],general:['General','The little things that make it yours.','settings'],appearance:['Appearance','Find your balance of scenery and simplicity.','image'],workspace:['Profiles','Keep each part of your day in its own space.','list'],chatgpt:['ChatGPT','Your tasks, connected to your conversation.','external'],updates:['Updates','Keep Sebams current across your computers.','arrow'],suggestions:['Suggestions','Build a better Sebams with us.','note'],data:['Data & backups','Your information, with you in control.','note']};
export function settingsLabel(id){return pages[id]?.[0]||id;}
export function decorateSettings(body,tab){
  const nav=body.querySelector('nav.tabs');if(!nav)return;nav.classList.add('settings-navigation');
  const nodes=[...body.children].filter(node=>node!==nav),page=pages[tab]||pages.general;
  for(const button of nav.querySelectorAll('button')){const id=button.dataset.category;if(id&&pages[id])button.prepend(icon(pages[id][2]));}
  const shell=el('div',{class:'settings-shell'},el('aside',{class:'settings-sidebar'},el('div',{class:'settings-brand'},el('img',{src:'assets/logo.svg',alt:'',width:26,height:26}),el('div',{},el('strong',{},'Sebams'),el('span',{},'Make room for your day.'))),nav,el('p',{class:'settings-version'},'Version '+chrome.runtime.getManifest().version)),el('section',{class:'settings-content','aria-label':page[0]+' settings'},el('div',{class:'settings-page-heading'},el('h2',{},page[0]),el('p',{},page[1])),nodes));body.replaceChildren(shell);
}
export function createProfilePicker({getState,choose,manage,toast}){
  const dialog=el('dialog',{class:'profile-picker','aria-label':'Choose a profile'});document.body.append(dialog);
  const open=()=>{const state=getState();dialog.replaceChildren(el('div',{class:'profile-picker-heading'},el('div',{},el('span',{class:'eyebrow'},'YOUR PROFILES'),el('h2',{},'Where are we today?')),el('button',{class:'icon-button',type:'button','aria-label':'Close profiles',onclick:()=>dialog.close()},icon('close'))));
    for(const [id,w] of Object.entries(state.workspaces))dialog.append(el('button',{class:'profile-picker-option'+(id===state.workspace?' selected':''),'data-profile-color':w.color,type:'button','aria-label':'Use '+profileName(w,id),onclick:async()=>{try{await choose(id);dialog.close();}catch(error){toast(error.message);}}},el('span',{class:'profile-avatar','aria-hidden':'true'},w.name.slice(0,2).toUpperCase()),el('span',{},el('strong',{},w.name),el('small',{},w.tasks.filter(t=>!t.done).length+' open tasks')),id===state.workspace?icon('check'):null));
    dialog.append(el('button',{class:'profile-manage secondary',type:'button',onclick:async()=>{dialog.close();await manage();}},'Manage profiles'));if(!dialog.open)dialog.showModal();};
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});return open;
}
