import {TASK_EXTRA_DEFAULTS} from './planner.js';
import {OPEN_REMINDER_DEFAULTS} from './reminders.js';
export const WIDGET_KEYS = ['links','search','weather','tasks','notes','timer','habits','focus','backgrounds','backgroundFavorite'];
export const IMAGE_TYPES = ['image/jpeg','image/png','image/webp'];
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_TOTAL_IMAGE_BYTES = 24 * 1024 * 1024;
export const MAX_TASK_ATTACHMENT_BYTES = 40 * 1024 * 1024;
export const APPEARANCE_DEFAULTS = {panelOpacity:88,panelBlur:0,backgroundBlur:0,clockSize:100,pinLabels:true,onlineSiteIcons:true,backgroundCadence:'daily',backgroundOffset:0};
export const PRODUCT_DEFAULTS = {pinStyle:'icons',pinGlass:false,remindersEnabled:false,reminderLeadMinutes:60};
export function localDay(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
export function createDefaultState() {
  const widgets = () => Object.fromEntries(WIDGET_KEYS.map(key => [key,true]));
  const ws = (type) => ({links:type==='personal'?[{id:'link-mail',title:'Gmail',url:'https://mail.google.com/',folder:'',pinned:false},{id:'link-wiki',title:'Wikipedia',url:'https://www.wikipedia.org/',folder:'',pinned:false}]:[],tasks:[],lists:['Inbox'],notes:'',notesRevision:0,habits:[],templates:[],exams:[],widgets:widgets()});
  return {schemaVersion:6,revision:0,onboarded:false,prefs:{name:'',clock24:false,showDate:true,dimming:35,backgroundMode:'daily',backgroundId:'alpine',favoriteBackgrounds:[],showQuotes:true,quoteMode:'daily',quoteId:'q1',favoriteQuotes:[],widgets:widgets(),searchProvider:'google',...APPEARANCE_DEFAULTS,...PRODUCT_DEFAULTS,...OPEN_REMINDER_DEFAULTS},photos:{enabled:false,updatedAt:0,items:[]},workspace:'personal',workspaces:{personal:ws('personal'),work:ws('work'),study:ws('study')},focus:{text:'',day:localDay(),done:false,pending:false},focusArchive:[],customQuotes:[],images:[],weather:{city:null,unit:'C',cache:null},timer:{mode:'work',workMinutes:25,breakMinutes:5,status:'idle',remainingMs:1500000,endsAt:null,sound:false,focusView:false,completedAt:null}};
}
export function rollover(state, day = localDay()) {
  if(state.focus.day===day || state.focus.pending)return state;
  if(state.focus.text && !state.focus.done)state.focus.pending=true;
  else {if(state.focus.text)state.focusArchive.push({...state.focus});state.focusArchive=state.focusArchive.slice(-366);state.focus={text:'',day,done:false,pending:false};}
  return state;
}
const fail = message => {throw new Error(`Invalid Sebams data: ${message}.`);};
function object(value,keys,label){if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))fail(label);if(Object.keys(value).some(key=>!keys.includes(key))||keys.some(key=>!(Object.hasOwn(value,key))))fail(`${label} has missing or unsupported fields`);}
function text(value,max,label,allowEmpty=true){if(typeof value!=='string'||value.length>max||(!allowEmpty&&!value.trim()))fail(label);}
function number(value,min,max,label){if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)fail(label);}
function integer(value,min,max,label){number(value,min,max,label);if(!Number.isInteger(value))fail(label);}
function bool(value,label){if(typeof value!=='boolean')fail(label);}
function choice(value,options,label){if(!options.includes(value))fail(label);}
function array(value,max,label){if(!Array.isArray(value)||value.length>max)fail(label);}
function date(value){text(value,10,'date',false);if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number.isNaN(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)fail('date');}
function ids(items,max,label){array(items,max,label);for(const id of items)text(id,100,label,false);if(new Set(items).size!==items.length)fail(`${label} duplicates`);}
function unique(items,label){if(new Set(items.map(i=>i.id)).size!==items.length)fail(`${label} duplicate IDs`);}
function visibility(v,legacy=false){object(v,legacy?['links','search','weather','tasks']:WIDGET_KEYS,'widgets');Object.values(v).forEach(value=>bool(value,'widget visibility'));}
function goal(v){object(v,['text','day','done','pending'],'focus');text(v.text,300,'focus');date(v.day);bool(v.done,'focus completion');bool(v.pending,'focus rollover');}
function city(v){object(v,['name','label','latitude','longitude'],'city');text(v.name,100,'city name',false);text(v.label,200,'city label',false);number(v.latitude,-90,90,'latitude');number(v.longitude,-180,180,'longitude');}
function validateTaskTools(t){
  array(t.subtasks,30,'checklist');unique(t.subtasks,'checklist');for(const step of t.subtasks){object(step,['id','text','done'],'checklist step');text(step.id,100,'step ID',false);text(step.text,300,'step',false);bool(step.done,'step completion');}
  for(const k of ['reminderAt','remindedAt','activeSince','completedAt'])if(t[k]!==null)number(t[k],0,8640000000000000,k);
  integer(t.estimateMinutes,0,10080,'estimated minutes');number(t.timeSpentMs,0,8640000000000000,'tracked time');if(t.done&&t.activeSince!==null)fail('completed task is still tracking');
  text(t.nextOccurrenceId,100,'next occurrence');text(t.planId,100,'exam plan');choice(t.kind,['task','exam','study'],'task kind');
  if(t.recurrence!==null){object(t.recurrence,['frequency','seriesId','anchorDay'],'repeat');choice(t.recurrence.frequency,['daily','weekly','monthly'],'repeat frequency');text(t.recurrence.seriesId,100,'repeat series',false);integer(t.recurrence.anchorDay,1,31,'repeat anchor');if(!t.dueDate)fail('repeating task needs a date');}
}
function validateWorkspaceTools(w){
  array(w.templates,30,'templates');unique(w.templates,'templates');for(const t of w.templates){object(t,['id','name','list','text','details','subtasks','estimateMinutes'],'template');text(t.id,100,'template ID',false);text(t.name,60,'template name',false);text(t.list,40,'template list',false);if(!w.lists.includes(t.list))fail('template list');text(t.text,300,'template title',false);text(t.details,12000,'template details');array(t.subtasks,30,'template steps');t.subtasks.forEach(s=>text(s,300,'template step',false));integer(t.estimateMinutes,0,10080,'template estimate');}
  array(w.exams,20,'exam plans');unique(w.exams,'exam plans');for(const p of w.exams){object(p,['id','title','list','date','startDate','topics','minutes'],'exam plan');text(p.id,100,'exam plan ID',false);text(p.title,300,'exam title',false);if(!w.lists.includes(p.list))fail('exam list');date(p.date);date(p.startDate);if(p.date<=p.startDate)fail('exam date');array(p.topics,60,'exam topics');p.topics.forEach(t=>text(t,300,'exam topic',false));integer(p.minutes,1,600,'study minutes');}
}
export function validateState(s) {
  const legacy = s?.schemaVersion === 1;
  const modern = s?.schemaVersion >= 3, taskAI=s?.schemaVersion>=4, product=s?.schemaVersion>=5,openReminders=s?.schemaVersion>=6;
  object(s,['schemaVersion','revision','onboarded','prefs','workspace','workspaces','focus','focusArchive','customQuotes','images','weather','timer',...(modern?['photos']:[])],'state');choice(s.schemaVersion,[1,2,3,4,5,6],'version');integer(s.revision,0,Number.MAX_SAFE_INTEGER,'revision');bool(s.onboarded,'onboarding');
  const p=s.prefs;object(p,['name','clock24','showDate','dimming','backgroundMode','backgroundId','favoriteBackgrounds','showQuotes','quoteMode','quoteId','favoriteQuotes','widgets','searchProvider',...(modern?Object.keys(APPEARANCE_DEFAULTS):[]),...(product?Object.keys(PRODUCT_DEFAULTS):[]),...(openReminders?Object.keys(OPEN_REMINDER_DEFAULTS):[])],'preferences');text(p.name,60,'name');for(const k of ['clock24','showDate','showQuotes'])bool(p[k],k);number(p.dimming,20,80,'background dimming');for(const k of ['backgroundMode','quoteMode'])choice(p[k],['daily','favorites','manual'],k);text(p.backgroundId,100,'background');text(p.quoteId,100,'quote');ids(p.favoriteBackgrounds,100,'background favorites');ids(p.favoriteQuotes,200,'quote favorites');visibility(p.widgets,legacy);choice(p.searchProvider,['google','duckduckgo','bing'],'search provider');
  if(modern){
    integer(p.panelOpacity,35,90,'panel opacity');integer(p.panelBlur,0,40,'panel blur');integer(p.backgroundBlur,0,12,'background blur');integer(p.clockSize,70,120,'clock size');bool(p.pinLabels,'pin labels');bool(p.onlineSiteIcons,'online website icons');choice(p.backgroundCadence,['daily','hourly','tab'],'background cadence');integer(p.backgroundOffset,0,1000000,'background offset');
    object(s.photos,['enabled','updatedAt','items'],'photo collection');bool(s.photos.enabled,'online photos');number(s.photos.updatedAt,0,8640000000000000,'photo update');array(s.photos.items,24,'online photos');unique(s.photos.items,'online photos');
    for(const photo of s.photos.items){object(photo,['id','photoId','title','author','source','width','height'],'online photo');text(photo.photoId,5,'photo ID',false);if(!/^\d{1,5}$/.test(photo.photoId)||photo.id!==`photo-${photo.photoId}`)fail('photo ID');text(photo.title,100,'photo title',false);text(photo.author,150,'photographer',false);integer(photo.width,1600,30000,'photo width');integer(photo.height,900,30000,'photo height');text(photo.source,2000,'photo credit',false);let u;try{u=new URL(photo.source);}catch{fail('photo credit');}if(u.protocol!=='https:'||u.hostname!=='unsplash.com'||!u.pathname.startsWith('/photos/')||u.username||u.password)fail('photo credit');}
  }
  if(product){choice(p.pinStyle,['icons','names','both'],'pinned appearance');bool(p.pinGlass,'pin surface');bool(p.remindersEnabled,'reminders');integer(p.reminderLeadMinutes,0,10080,'reminder lead');}
  if(openReminders){bool(p.remindersOnOpen,'reminders on open');integer(p.reminderOnOpenLeadMinutes,0,10080,'reminder anticipation');text(p.reminderOnOpenTime,5,'reminder time');if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(p.reminderOnOpenTime))fail('reminder time');}
  choice(s.workspace,['personal','work','study'],'workspace');object(s.workspaces,['personal','work','study'],'workspaces');
  let attachmentBytes=0;const attachmentIds=new Set();
  for(const w of Object.values(s.workspaces)){
    object(w,['links','tasks','lists','notes','notesRevision','habits','widgets',...(product?['templates','exams']:[])],'workspace content');visibility(w.widgets,legacy);text(w.notes,20000,'notes');integer(w.notesRevision,0,Number.MAX_SAFE_INTEGER,'notes revision');ids(w.lists,20,'task lists');if(!w.lists.length)fail('at least one list is required');for(const l of w.lists)text(l,40,'list name',false);
    array(w.links,100,'links');unique(w.links,'links');for(const link of w.links){object(link,legacy?['id','title','url','folder']:['id','title','url','folder','pinned'],'link');if(!legacy)bool(link.pinned,'pinned link');text(link.id,100,'link ID',false);text(link.title,60,'link name',false);text(link.folder,40,'folder');text(link.url,2000,'website',false);let u;try{u=new URL(link.url);}catch{fail('website address');}if(!['http:','https:'].includes(u.protocol)||!u.hostname||u.username||u.password)fail('unsafe website address');}
    if(!legacy&&w.links.filter(link=>link.pinned).length>8)fail('pin up to eight links per workspace');
    array(w.tasks,300,'tasks');unique(w.tasks,'tasks');for(const t of w.tasks){object(t,[...(legacy?['id','text','done','priority','list']:['id','text','done','priority','list','dueDate']),...(taskAI?['details','attachments','ai','sourceId']:[]),...(product?Object.keys(TASK_EXTRA_DEFAULTS):[])],'task');if(!legacy){text(t.dueDate,10,'task date');if(t.dueDate)date(t.dueDate);}text(t.id,100,'task ID',false);text(t.text,300,'task text',false);bool(t.done,'task completion');choice(t.priority,['normal','high','low'],'priority');if(!w.lists.includes(t.list))fail('task list');
      if(product)validateTaskTools(t);
      if(taskAI){text(t.details,12000,'task details');text(t.sourceId,100,'task source');array(t.attachments,4,'task photos');for(const image of t.attachments){object(image,['id','name','type','size'],'task photo');text(image.id,100,'task photo ID',false);text(image.name,150,'task photo name',false);choice(image.type,IMAGE_TYPES,'task photo type');integer(image.size,1,MAX_IMAGE_BYTES,'task photo size');if(attachmentIds.has(image.id))fail('duplicate task photo ID');attachmentIds.add(image.id);attachmentBytes+=image.size;}if(t.ai!==null){object(t.ai,['text','model','createdAt'],'AI answer');text(t.ai.text,20000,'AI answer',false);text(t.ai.model,100,'AI model',false);number(t.ai.createdAt,0,8640000000000000,'AI answer time');}}
    }
    if(product)validateWorkspaceTools(w);
    array(w.habits,8,'habits');unique(w.habits,'habits');for(const h of w.habits){object(h,['id','text','days'],'habit');text(h.id,100,'habit ID',false);text(h.text,100,'habit text',false);ids(h.days,366,'habit days');h.days.forEach(date);}
  }
  if(product&&Object.values(s.workspaces).flatMap(w=>w.tasks).filter(t=>t.activeSince!==null).length>1)fail('only one task can track time at once');
  if(attachmentBytes>MAX_TASK_ATTACHMENT_BYTES)fail('combined task photos exceed 40 MB');
  goal(s.focus);array(s.focusArchive,366,'focus archive');s.focusArchive.forEach(goal);array(s.customQuotes,100,'quotes');unique(s.customQuotes,'quotes');for(const q of s.customQuotes){object(q,['id','text','author'],'quote');text(q.id,100,'quote ID',false);text(q.text,500,'quote text',false);text(q.author,100,'quote author',false);}
  array(s.images,12,'images');unique(s.images,'images');let bytes=0;for(const i of s.images){object(i,['id','name','type','size'],'image');text(i.id,100,'image ID',false);text(i.name,150,'image name',false);choice(i.type,IMAGE_TYPES,'image type');integer(i.size,1,MAX_IMAGE_BYTES,'image size');bytes+=i.size;}if(bytes>MAX_TOTAL_IMAGE_BYTES)fail('combined images exceed 24 MB');
  object(s.weather,['city','unit','cache'],'weather');choice(s.weather.unit,['C','F'],'temperature unit');if(s.weather.city!==null)city(s.weather.city);if(s.weather.cache!==null){const c=s.weather.cache;object(c,['cityKey','tempC','code','updatedAt'],'weather cache');text(c.cityKey,100,'weather location');number(c.tempC,-100,70,'weather temperature');integer(c.code,0,99,'weather code');number(c.updatedAt,0,8640000000000000,'weather time');}
  const t=s.timer;object(t,['mode','workMinutes','breakMinutes','status','remainingMs','endsAt','sound','focusView','completedAt'],'timer');choice(t.mode,['work','break'],'timer mode');integer(t.workMinutes,1,180,'focus minutes');integer(t.breakMinutes,1,60,'break minutes');choice(t.status,['idle','running','paused','complete'],'timer status');number(t.remainingMs,0,180*60000,'timer remaining');bool(t.sound,'timer sound');bool(t.focusView,'focus view');if(t.endsAt!==null)number(t.endsAt,0,8640000000000000,'timer deadline');if(t.completedAt!==null)number(t.completedAt,0,8640000000000000,'timer completion');if(t.status==='running'&&t.endsAt===null)fail('running timer requires a deadline');if(t.status!=='running'&&t.endsAt!==null)fail('only a running timer may have a deadline');
  if(JSON.stringify(s).length>2*1024*1024)fail('personal data exceeds 2 MB');return s;
}
export function taskAttachmentMetadata(state){return Object.values(state.workspaces).flatMap(w=>w.tasks.flatMap(task=>task.attachments));}
function backupImages(items,metadata,max,label){array(items,max,label);unique(items,label);if(items.length!==metadata.length)fail(`${label} count`);for(const image of items){object(image,['id','name','type','data'],label);const meta=metadata.find(m=>m.id===image.id);if(!meta||meta.name!==image.name||meta.type!==image.type)fail(`${label} metadata`);text(image.data,12*1024*1024,`${label} data`,false);const prefix=`data:${image.type};base64,`;if(!image.data.startsWith(prefix))fail(`${label} format`);const encoded=image.data.slice(prefix.length);if(!encoded.length||encoded.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded))fail(`${label} encoding`);const padding=encoded.endsWith('==')?2:encoded.endsWith('=')?1:0;if(encoded.length/4*3-padding!==meta.size)fail(`${label} size`);}}
export function validateBackup(backup){
  object(backup,['format','version','state','images',...(backup?.version===2?['attachments']:[])],'backup');choice(backup.format,['sebams-backup'],'backup format');choice(backup.version,[1,2],'backup version');backup.state=upgradeState(backup.state);
  backupImages(backup.images,backup.state.images,12,'backup images');
  const attachments=backup.version===2?backup.attachments:[];backupImages(attachments,taskAttachmentMetadata(backup.state),3600,'backup task photos');
  backup.version=2;backup.attachments=attachments;return backup;
}

// Validate the old schema before adding fields so imported unknown data is never discarded.
export function upgradeState(value) {
  validateState(value);
  if(value.schemaVersion===6)return value;
  const state=structuredClone(value);
  for(const widgets of [state.prefs.widgets,...Object.values(state.workspaces).map(w=>w.widgets)])for(const key of WIDGET_KEYS)if(!Object.hasOwn(widgets,key))widgets[key]=true;
  if(value.schemaVersion===1)for(const workspace of Object.values(state.workspaces)){for(const task of workspace.tasks)task.dueDate='';for(const link of workspace.links)link.pinned=false;}
  if(value.schemaVersion<3){Object.assign(state.prefs,APPEARANCE_DEFAULTS);state.photos={enabled:false,updatedAt:0,items:[]};}
  if(value.schemaVersion<4)for(const workspace of Object.values(state.workspaces))for(const task of workspace.tasks)Object.assign(task,{details:'',attachments:[],ai:null,sourceId:''});
  if(value.schemaVersion<5){Object.assign(state.prefs,PRODUCT_DEFAULTS);for(const workspace of Object.values(state.workspaces)){workspace.templates=[];workspace.exams=[];for(const task of workspace.tasks)Object.assign(task,structuredClone(TASK_EXTRA_DEFAULTS));}}
  Object.assign(state.prefs,OPEN_REMINDER_DEFAULTS);
  state.schemaVersion=6;return validateState(state);
}
