import {el} from './ui.js';

export const FEEDBACK_URL='https://github.com/sebasssz/sebams/issues';
const draft={kind:'idea',title:'',message:''};

export function suggestionURL({kind,title,message},version){
  title=title.trim();message=message.trim();
  if(title.length<3||title.length>100)throw Error('Give your suggestion a title from 3 to 100 characters.');
  if(message.length<10||message.length>2000)throw Error('Add a description from 10 to 2,000 characters.');
  const type=kind==='bug'?'Bug':'Suggestion',url=new URL(FEEDBACK_URL+'/new');
  url.searchParams.set('title','['+type+'] '+title);
  url.searchParams.set('body',message+'\n\n---\nSent from Sebams '+version+' · '+type);
  if(url.href.length>7800)throw Error('This message is too long to open in GitHub. Shorten it here; you can add more on GitHub.');
  return url.href;
}

export function renderFeedback(body){
  const version=chrome.runtime.getManifest().version;
  const label=(text,node)=>el('label',{},text,node);
  const kind=el('select',{'aria-label':'Feedback type',onchange:event=>{draft.kind=event.target.value;}},[['idea','Suggestion'],['bug','Report a problem']].map(([value,text])=>el('option',{value,selected:draft.kind===value},text)));
  const title=el('input',{value:draft.title,required:true,minlength:3,maxlength:100,placeholder:'What would make Sebams better?','aria-label':'Suggestion title',oninput:event=>{draft.title=event.target.value;}});
  const counter=el('span',{class:'help','aria-live':'off'},draft.message.length+' / 2,000');
  const message=el('textarea',{value:draft.message,required:true,minlength:10,maxlength:2000,rows:6,placeholder:'Tell us your idea, or what happened and what you expected.','aria-label':'Your suggestion',oninput:event=>{draft.message=event.target.value;counter.textContent=draft.message.length+' / 2,000';}});
  const status=el('p',{class:'help',role:'status'});
  const form=el('form',{class:'stack feedback-form',onsubmit:async event=>{
    event.preventDefault();status.textContent='';
    try{await chrome.tabs.create({url:suggestionURL(draft,version)});status.textContent='Your draft is open in GitHub. Review it and select Create to send it. Your text stays here until you clear it.';}
    catch(error){status.textContent=error.message||'Could not open GitHub. Please try again.';}
  }},label('Type',kind),label('Title',title),label('Your suggestion',message),el('div',{class:'feedback-footer'},counter,el('button',{type:'button',class:'text-button',onclick:()=>{draft.kind='idea';draft.title='';draft.message='';kind.value='idea';title.value='';message.value='';counter.textContent='0 / 2,000';status.textContent='';title.focus();}},'Clear draft')),el('p',{class:'help'},'Continue in GitHub to review and send your message. A GitHub account is required. Suggestions are public; share only what you want others to see.'),el('button',{type:'submit',class:'primary'},'Continue in GitHub'),status);
  body.append(el('section',{class:'stack feedback-settings'},el('span',{class:'eyebrow'},'BUILT TOGETHER'),el('h3',{},'Help shape Sebams'),el('p',{class:'help'},'Have an idea or found something that could work better? Leave it for the Sebams team.'),form,el('div',{class:'section stack'},el('a',{href:FEEDBACK_URL,target:'_blank',rel:'noopener noreferrer',class:'text-button'},'View suggestions and replies ↗'),el('p',{class:'help'},'The team can read and reply on GitHub. Only this message and the Sebams version are included.'))));
}
