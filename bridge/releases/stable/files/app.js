import {installReminderInbox} from './lib/reminder-ui.js';
import {placeLink,bindSortable} from './lib/sortable.js';
import {checkForUpdates,reloadAfterUpdate} from './lib/updates.js';
import {getUpdatePreferences,patchUpdatePreferences} from './lib/store.js';
import {createTask} from './lib/planner.js';
import {renderTaskExtras,renderToolsView,refreshTaskClock} from './lib/task-tools-ui.js';
import {installPalette} from './lib/palette.js';
import { initStore, getState, mutate, subscribe, putImage, getImage, removeImage, exportBackup, importBackup, getCachedPhoto, cachePhoto, clearPhotoCache } from './lib/store.js';
import { matchesTaskDate, taskDateLabel } from './lib/tasks.js';
import { localDay, rollover, APPEARANCE_DEFAULTS } from './lib/model.js';
import { photoURL, fetchPhotoCollection, fetchPhotoBlob, hasPhotoAccess, requestPhotoAccess, rotationIndex, chooseRandomPhoto } from './lib/photos.js';
import { faviconURL } from './lib/favicons.js';
import { bridgeRequest, requestBridgeAccess, hasBridgeAccess, blobDataURL, taskPrompt, normalizeAIResult } from './lib/ai.js';
import { receiveBridgeTasks } from './lib/bridge-sync.js';
import { putTaskAttachment, getTaskAttachment, removeTaskAttachment, getBridgeConfig, setBridgeConfig, pruneTaskAttachments } from './lib/store.js';
import { BACKGROUNDS, QUOTES, SEARCH_PROVIDERS } from './lib/content.js';
import { searchCities, fetchWeather, weatherLabel, requestWeatherAccess, locateCity } from './lib/weather.js';
import { remaining, reconcileTimer, startTimer, pauseTimer, resetTimer, advanceTimer } from './lib/timer.js';
import { el, icon, $, uid, safeURL, moveItem, downloadJSON } from './lib/ui.js';

let state, panelName = '', settingsTab = 'general', taskList = null, taskDateFilter = 'all', creatingTaskList = false, editingList = null, pinnedKey = '', editingTask = null, editingLink = null;
let selectedBackground, selectedQuote, backgroundURL, backgroundToken = 0, currentBackgroundKey = '', weatherBusy = false, weatherError = '', weatherCities = [];
let focusEditing = false, focusOriginal = '', toastTimer, noteTimer, notesDirty = false, notesBase = 0, noteWorkspace = '', lastCompletedAt = null, dashboardDay = '';
let photoAccess=false, photosBusy=false, photosError='', rotationSlot='', backgroundFallbackKey='';
let linksMode='browse', linksMenu=false;
let taskTool=null,weekOffset=0,openCommands,lastTaskSyncKey='',reminderInbox;
let taskDetailId=null, bridgeConfig={token:''}, bridgeStatus='', bridgeBusy=false, bridgeSyncBusy=false;
let updatePrefs={autoCheck:false,lastCheckedAt:0,availableVersion:''},updateResult=null,updateStatus='',updateBusy=false,updateSource=null,updateSourceStatus='';
const taskDrafts=new Map(), aiRequests=new Map();
const tabSeed=crypto.getRandomValues(new Uint32Array(1))[0], failedBackgrounds=new Set();
const panel = $('panel'), body = $('panel-body');
const workspace = () => state.workspaces[state.workspace];
const run = fn => async (...args) => {
  const event = args[0], form = event?.type === 'submit' ? event.currentTarget : null;
  const controls = form ? [...form.elements].map(control => [control, control.disabled]) : [];
  if (form) { event.preventDefault(); controls.forEach(([control]) => { control.disabled = true; }); }
  try { return await fn(...args); } catch (error) { if (!error.sebamsShown) toast(error.message || 'Something went wrong. Please try again.'); }
  finally { controls.forEach(([control, disabled]) => { control.disabled = disabled; }); }
};
const save = async fn => { const result = await mutate(fn); state = result; syncTaskAlarm(); return result; };
const btn = (text, fn, cls = 'secondary', attrs = {}) => el('button', { type: 'button', class: cls, onclick: run(fn), ...attrs }, text);
const ibtn = (name, label, fn, attrs = {}) => btn(icon(name), fn, 'icon-button', { 'aria-label': label, title: label, ...attrs });
const help = text => el('p', { class: 'help' }, text);
const row = (...children) => el('div', { class: 'row' }, children);
const field = (label, input) => { if (!input.hasAttribute('aria-label')) input.setAttribute('aria-label', label); return el('label', {}, label, input); };
const input = (value = '', attrs = {}) => el('input', { value, ...attrs });
const select = (value, options, onchange, attrs = {}) => el('select', { onchange: run(onchange), ...attrs }, options.map(([id, label]) => el('option', { value: id, selected: id === value }, label)));
const toggle = (label, checked, onchange) => el('label', { class: 'toggle' }, el('span', {}, label), el('input', { type: 'checkbox', checked, onchange: run(e => onchange(e.target.checked)) }));
function toast(message, action, label = 'Undo') {
  clearTimeout(toastTimer); $('toast-message').textContent = message; $('toast').hidden = false;
  $('toast-action').hidden = !action; $('toast-action').textContent = label; $('toast-action').onclick = action ? run(async () => { await action(); $('toast').hidden = true; }) : null;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, action ? 12000 : 7000);
}
async function openPanel(name) {
  if (notesDirty) { try { await flushNotes(); } catch { return; } }
  panelName = name; editingTask = null; editingLink = null;
  taskDetailId=null;taskTool=null;
  creatingTaskList = false;
  editingList = null;
  linksMode='browse';linksMenu=false;
  panel.classList.toggle('compact', ['notes', 'habits', 'timer', 'weather'].includes(name));
  panel.classList.toggle('tasks-panel', name === 'tasks');
  panel.classList.toggle('links-panel', name === 'links');
  panel.classList.remove('links-expanded');
  renderPanel(); panel.append($('toast')); if (!panel.open) panel.showModal();
}
async function closePanel() { if (notesDirty) { try { await flushNotes(); } catch { return; } } panel.close(); panelName = ''; document.body.append($('toast')); }
panel.addEventListener('cancel', event => { event.preventDefault(); closePanel(); });
panel.addEventListener('close', () => { panelName = ''; });
panel.addEventListener('click', event => { if (event.target === panel) { const r = panel.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closePanel(); } });
function renderPanel() {
  if (!panelName) return;
  const active = document.activeElement, selector = 'button,a,input,select,textarea';
  const previous = body.contains(active) ? { id: active.id, label: active.getAttribute('aria-label'), text: active.textContent, tag: active.tagName, index: [...body.querySelectorAll(selector)].indexOf(active) } : null;
  const matches = item => previous && (previous.label ? item.getAttribute('aria-label') === previous.label : item.tagName === previous.tag && item.textContent === previous.text);
  if (previous) previous.ordinal = [...body.querySelectorAll(selector)].filter(matches).indexOf(active);
  const scroll = panel.scrollTop;
  const disclosures=[...body.querySelectorAll('details')].map(node=>({label:node.querySelector('summary')?.textContent,open:node.open}));
  const taskScroll = body.querySelector('.task-list')?.scrollTop || 0, navigationScroll = body.querySelector('.task-navigation')?.scrollTop || 0;
  const viewScroll = body.querySelector('.task-smart-views')?.scrollLeft || 0, collectionScroll = body.querySelector('.task-collections')?.scrollLeft || 0;
  $('panel-title').textContent = ({ settings: 'Make it yours', backgrounds: 'A change of scenery', quotes: 'Words to carry with you', tasks: 'Tasks', links: 'Links', weather: 'A glance outside', timer: 'Make space for focus', notes: 'A place for your thoughts', habits: 'Small steps, every day' })[panelName];
  $('panel-kicker').textContent = `${state.workspace.toUpperCase()} · SEBAMS`;
  body.replaceChildren();
  ({ settings: renderSettings, backgrounds: renderBackgrounds, quotes: renderQuotes, tasks: renderTasks, links: renderLinks, weather: renderWeatherPanel, timer: renderTimerPanel, notes: renderNotes, habits: renderHabits })[panelName]();
  const used=new Set();for(const node of body.querySelectorAll('details')){const index=disclosures.findIndex((old,i)=>!used.has(i)&&old.label===node.querySelector('summary')?.textContent);if(index>=0){node.open=disclosures[index].open;used.add(index);}}
  if(panelName==='tasks'){body.querySelector('.task-list').scrollTop=taskScroll;body.querySelector('.task-navigation').scrollTop=navigationScroll;body.querySelector('.task-smart-views').scrollLeft=viewScroll;body.querySelector('.task-collections').scrollLeft=collectionScroll;}
  if (previous) {
    const controls = [...body.querySelectorAll(selector)];
    let target = controls.find(item => previous.id && item.id === previous.id) || controls.filter(matches)[previous.ordinal] || controls[Math.min(previous.index, controls.length - 1)];
    if (target?.disabled) target = target.parentElement.querySelector('button:not([disabled]),input:not([disabled])');
    (target || $('panel-close')).focus({ preventScroll: true }); panel.scrollTop = scroll;
  }
}
function dailyIndex(length) { return Math.floor(new Date(`${localDay()}T12:00:00`).getTime() / 86400000) % Math.max(1, length); }
function chooseItem(items, mode, id, favorites) {
  const pool = mode === 'favorites' && favorites.length ? items.filter(item => favorites.includes(item.id)) : items;
  return mode === 'manual' ? items.find(item => item.id === id) || items[0] : pool[dailyIndex(pool.length)] || items[0];
}
async function renderBackground() {
  const items = backgroundItems(), pool = backgroundPool(items);
  selectedBackground = state.prefs.backgroundMode==='manual' ? items.find(item=>item.id===state.prefs.backgroundId)||items[0] : pool[rotationIndex(pool.length,state.prefs.backgroundCadence,state.prefs.backgroundOffset,Date.now(),tabSeed)];
  rotationSlot=backgroundRotationSlot();
  $('scene-title').textContent = selectedBackground.title; $('scene-subtitle').textContent = backgroundFallbackKey===selectedBackground.id?'Offline · showing a bundled scene':selectedBackground.subtitle;
  const credit=$('photo-credit');credit.hidden=!selectedBackground.online||backgroundFallbackKey===selectedBackground.id||!workspace().widgets.backgrounds;if(selectedBackground.online){credit.href=selectedBackground.source;credit.textContent=`Photo by ${selectedBackground.author} · Picsum / Unsplash`;}
  $('background-favorite').classList.toggle('active-heart', state.prefs.favoriteBackgrounds.includes(selectedBackground.id));
  $('background-favorite').setAttribute('aria-pressed', state.prefs.favoriteBackgrounds.includes(selectedBackground.id));
  document.documentElement.style.setProperty('--dimming', state.prefs.dimming / 100);
  if (currentBackgroundKey === selectedBackground.id) return;
  const token = ++backgroundToken, chosen=selectedBackground; currentBackgroundKey = chosen.id;
  let url = chosen.path;
  if(chosen.online){
    let blob=await getCachedPhoto(chosen.id);
    if(!blob && !failedBackgrounds.has(chosen.id))try{blob=await fetchPhotoBlob(chosen);await cachePhoto(chosen.id,blob);}catch{failedBackgrounds.add(chosen.id);}
    if(token!==backgroundToken)return;
    if(blob){backgroundFallbackKey='';url=URL.createObjectURL(blob);}else{backgroundFallbackKey=chosen.id;url=BACKGROUNDS[0].path;credit.hidden=true;$('scene-subtitle').textContent='Offline · showing a bundled scene';}
  }
  if (chosen.uploaded) { const blob = await getImage(chosen.id); if (token !== backgroundToken) return; if (!blob) { url = BACKGROUNDS[0].path; toast('This image is unavailable. Choose another background.'); } else url = URL.createObjectURL(blob); }
  const image = new Image();image.referrerPolicy='no-referrer'; image.src = url;
  try { await image.decode(); if (token !== backgroundToken) { if (url.startsWith('blob:')) URL.revokeObjectURL(url); return; } $('background').style.backgroundImage = `url("${url}")`; if (backgroundURL?.startsWith('blob:')) URL.revokeObjectURL(backgroundURL); backgroundURL = url; }
  catch { if(url?.startsWith('blob:'))URL.revokeObjectURL(url);if(token!==backgroundToken)return;currentBackgroundKey = ''; toast('Your background could not load. The calming offline color is still available.'); }
}
function backgroundItems(){return [...BACKGROUNDS,...state.images.map(image=>({...image,title:image.name,subtitle:'Your own perspective',uploaded:true})),...(state.photos.enabled?state.photos.items.map(photo=>({...photo,subtitle:`Photo by ${photo.author}`,online:true})):[])];}
function backgroundPool(items){const favorites=items.filter(item=>state.prefs.favoriteBackgrounds.includes(item.id));return state.prefs.backgroundMode==='favorites'&&favorites.length?favorites:items;}
function backgroundRotationSlot(){return `${localDay()}-${state.prefs.backgroundCadence==='hourly'?Math.floor(Date.now()/3600000):''}`;}
async function nextBackground(){const items=backgroundItems();await save(s=>{if(s.prefs.backgroundMode==='manual'){const index=items.findIndex(item=>item.id===selectedBackground.id);s.prefs.backgroundId=items[(index+1)%items.length].id;}else{s.prefs.backgroundOffset=(s.prefs.backgroundOffset+1)%1000001;}});}
function applyAppearance(){const p=state.prefs,style=document.documentElement.style;style.setProperty('--surface',`rgba(24,24,27,${p.panelOpacity/100})`);style.setProperty('--panel-blur','0px');style.setProperty('--background-blur',p.backgroundBlur+'px');style.setProperty('--clock-scale',p.clockSize/100);document.body.classList.toggle('pin-labels',p.pinStyle!=='icons');document.body.classList.toggle('pins-names',p.pinStyle==='names');document.body.classList.toggle('pins-glass',p.pinGlass);}
function renderClock() {
  const now = new Date(); let hours = now.getHours();
  $('clock').textContent = `${state.prefs.clock24 ? String(hours).padStart(2, '0') : hours % 12 || 12}:${String(now.getMinutes()).padStart(2, '0')}`;
  $('period').textContent = state.prefs.clock24 ? '' : hours >= 12 ? 'PM' : 'AM';
  $('date').textContent = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }); $('date').hidden = !state.prefs.showDate;
  const greeting = hours < 12 ? 'Good morning' : hours < 18 ? 'Good afternoon' : 'Good evening';
  $('greeting').textContent = `${greeting}${state.prefs.name ? `, ${state.prefs.name}` : ''}.`;
}
function renderDashboard() {
  dashboardDay = localDay();
  applyAppearance(); renderClock(); run(renderBackground)();
  const w = workspace().widgets;
  $('links-open').hidden = !w.links; renderPinnedLinks();
  for (const [key,id] of [['notes','notes-open'],['timer','timer-open'],['habits','habits-open'],['focus','daily-focus'],['backgrounds','background-open'],['backgroundFavorite','background-favorite']]) $(id).hidden = !w[key]; $('search-form').hidden = !w.search; $('weather-open').hidden = !w.weather; $('tasks-open').hidden = !w.tasks;
  $('background-next').hidden=!w.backgrounds;
  $('search-provider').textContent = SEARCH_PROVIDERS[state.prefs.searchProvider].label;
  $('search-input').setAttribute('aria-label', `Search with ${SEARCH_PROVIDERS[state.prefs.searchProvider].label}`);
  $('task-count').textContent = workspace().tasks.filter(task => !task.done).length;
  $('welcome').hidden = state.onboarded;
  $('focus-form').hidden = !!state.focus.text && !focusEditing;
  $('focus-saved').hidden = !state.focus.text || focusEditing;
  $('focus-text').textContent = state.focus.text; $('focus-text').classList.toggle('done-text', state.focus.done);
  $('focus-complete').classList.toggle('done', state.focus.done); $('focus-complete').setAttribute('aria-pressed', state.focus.done);
  $('focus-complete').setAttribute('aria-label', state.focus.done ? 'Mark daily focus unfinished' : 'Complete daily focus');
  $('focus-rollover').hidden = !state.focus.pending; $('focus-congrats').hidden = !state.focus.done;
  $('focus-label').textContent = state.focus.text && !focusEditing ? state.focus.pending ? 'YOUR UNFINISHED FOCUS' : 'TODAY' : 'WHAT IS YOUR MAIN FOCUS TODAY?';
  const quotes = [...QUOTES, ...state.customQuotes]; selectedQuote = chooseItem(quotes, state.prefs.quoteMode, state.prefs.quoteId, state.prefs.favoriteQuotes);
  $('quote').hidden = !state.prefs.showQuotes; $('quote-text').textContent = `“${selectedQuote.text}”`; $('quote-author').textContent = selectedQuote.author;
  $('quote-favorite').classList.toggle('active-heart', state.prefs.favoriteQuotes.includes(selectedQuote.id)); $('quote-favorite').setAttribute('aria-pressed', state.prefs.favoriteQuotes.includes(selectedQuote.id));
  document.body.classList.toggle('focus-view', state.timer.focusView); $('focus-view-bar').hidden = !state.timer.focusView;
  renderWeatherSummary(); renderTimerDisplay();
}
function renderPinnedLinks() {
  const links=workspace().links.filter(link=>link.pinned), nav=$('pinned-links');nav.hidden=!workspace().widgets.links||!links.length;
  document.body.classList.toggle('has-pins',!nav.hidden);
  const key=JSON.stringify([state.workspace,state.prefs.onlineSiteIcons,links.map(({id,title,url})=>[id,title,url])]);if(key===pinnedKey)return;pinnedKey=key;
  const focused=document.activeElement?.dataset?.linkId;
  nav.replaceChildren(...links.map(link=>{
    const image=siteIcon(link);
    return el('div',{class:'pin-wrapper',draggable:true,'data-sort-id':link.id},el('a',{href:link.url,class:'pin-link',draggable:false,title:link.title,'aria-label':link.title,rel:'noopener noreferrer','data-link-id':link.id},image,el('span',{class:'pin-title'},link.title)),ibtn('close',`Remove shortcut ${link.title}`,async()=>{const wsid=state.workspace;let removed,index;await save(s=>{const links=s.workspaces[wsid].links;index=links.findIndex(l=>l.id===link.id);if(index>=0)[removed]=links.splice(index,1);});if(removed)toast('Shortcut removed.',()=>save(s=>{const links=s.workspaces[wsid].links;if(!links.some(l=>l.id===removed.id)){if(links.filter(l=>l.pinned).length>=8)removed.pinned=false;links.splice(Math.min(index,links.length),0,removed);}}));},{class:'icon-button pin-remove'}));
  }));
  if(!nav.dataset.sortBound){nav.dataset.sortBound='true';bindSortable(nav,{run,reorder:async(source,target,after)=>{const wsid=state.workspace;await save(s=>placeLink(s.workspaces[wsid].links,source,target,after,{pinnedOnly:true}));},refreshContainer:()=>$('pinned-links')});}
  if(focused)[...nav.querySelectorAll('a')].find(link=>link.dataset.linkId===focused)?.focus({preventScroll:true});
}
function siteIcon(link){const image=el('img',{class:'site-icon',alt:'',width:24,height:24,src:faviconURL(link.url,state.prefs.onlineSiteIcons),referrerpolicy:'no-referrer',onerror:()=>{if(image.dataset.fallback==='local')return;if(image.dataset.fallback==='chrome'||!state.prefs.onlineSiteIcons){image.dataset.fallback='local';image.src='assets/site-icon.svg';}else{image.dataset.fallback='chrome';image.src=faviconURL(link.url,false);}}});return image;}
function renderWeatherSummary() {
  const { city, cache, unit } = state.weather;
  if (!city) { $('weather-temp').textContent = 'Weather'; $('weather-city').textContent = 'Choose your city'; }
  else if (cache && cache.cityKey === `${city.latitude},${city.longitude}`) {
    $('weather-temp').textContent = `${Math.round(unit === 'F' ? cache.tempC * 9 / 5 + 32 : cache.tempC)}°${unit}`;
    $('weather-city').textContent = `${city.name}${weatherError ? ' · cached' : ''}`;
  } else { $('weather-temp').textContent = weatherBusy ? 'Loading…' : 'Unavailable'; $('weather-city').textContent = city.name; }
  $('weather-open').setAttribute('aria-label', `${$('weather-temp').textContent}, ${$('weather-city').textContent}. Open weather settings.`);
}
async function updateWeather(force = false) {
  if (!state.weather.city || weatherBusy) return;
  const city = { ...state.weather.city }; weatherBusy = true; weatherError = ''; renderWeatherSummary();
  try { const cache = await fetchWeather(city, state.weather.cache, force); await save(s => { if (s.weather.city && s.weather.city.latitude === city.latitude && s.weather.city.longitude === city.longitude) s.weather.cache = cache; }); }
  catch (e) { weatherError = e.message; }
  finally { weatherBusy = false; renderWeatherSummary(); if (panelName === 'weather') renderPanel(); }
}
function renderSettings() {
  body.append(el('nav', { class: 'tabs', 'aria-label': 'Settings categories' }, ['general', 'appearance', 'workspace', 'ai', 'updates', 'data'].map(tab => btn(tab==='ai'?'AI':tab[0].toUpperCase() + tab.slice(1), async () => { settingsTab = tab;if(tab==='updates'){updatePrefs=await getUpdatePreferences();await loadUpdateSource();}renderPanel(); }, settingsTab === tab ? 'selected' : '', { 'aria-pressed': settingsTab === tab }))));
  if (settingsTab === 'general') {
    body.append(el('div', { class: 'stack' }, field('What should we call you?', input(state.prefs.name, { maxlength: 60, onchange: run(e => save(s => { s.prefs.name = e.target.value.trim(); })) })), el('div', { class: 'field-grid' }, field('Clock format', select(String(state.prefs.clock24), [['false', '12-hour · 2:30 PM'], ['true', '24-hour · 14:30']], e => save(s => { s.prefs.clock24 = e.target.value === 'true'; }))), field('Search provider', select(state.prefs.searchProvider, Object.entries(SEARCH_PROVIDERS).map(([id, p]) => [id, p.label]), e => save(s => { s.prefs.searchProvider = e.target.value; }))))));
    body.append(toggle('Show the date', state.prefs.showDate, value => save(s => { s.prefs.showDate = value; })), help('Search opens your chosen provider only when you submit. Your address bar stays ready when a new tab opens.'));
    const section = el('section', { class: 'section widget-grid' }, el('h3', {}, 'Visible in this workspace'));
    for (const [id, label] of [['links', 'Quick links and pins'], ['search', 'Web search'], ['weather', 'Weather'], ['tasks', 'Tasks'], ['notes', 'Quick notes'], ['timer', 'Focus timer'], ['habits', 'Habits'], ['focus', 'Main daily focus'], ['backgrounds', 'Background selector'], ['backgroundFavorite', 'Background favorite button']]) section.append(toggle(label, workspace().widgets[id], value => save(s => { s.workspaces[s.workspace].widgets[id] = value; })));
    renderReminderSettings();section.append(toggle('Daily quote', state.prefs.showQuotes, value => save(s => { s.prefs.showQuotes = value; }))); body.append(section);
  } else if (settingsTab === 'appearance') {
    body.append(field('Background dimming', input(state.prefs.dimming, { type: 'range', min: 20, max: 80, step: 1, oninput: e => { document.documentElement.style.setProperty('--dimming', e.target.value / 100); $('dim-value').textContent = `${e.target.value}%`; }, onchange: run(e => save(s => { s.prefs.dimming = Number(e.target.value); })) })), el('p', { id: 'dim-value', class: 'help' }, `${state.prefs.dimming}%`), help('A permanent soft shading layer keeps controls readable. Increase dimming for bright scenes.'), field('Background changes', select(state.prefs.backgroundMode, [['daily', 'A different scene each day'], ['favorites', 'Rotate my favorites daily'], ['manual', 'Keep my chosen scene']], e => save(s => { s.prefs.backgroundMode = e.target.value; }))), row(btn('Choose a background', () => openPanel('backgrounds')), btn('Choose quotes', () => openPanel('quotes'))));
    body.append(el('section',{class:'random-background-control'},btn([icon('shuffle'),photosBusy?'Choosing a photo…':'Random online background'],randomOnlineBackground,'secondary',{'aria-label':'Random online background',disabled:photosBusy}),help(photosBusy?'Loading a photograph…':photosError||'Pick a random photo from the free online collection and keep it as your background.')));
    body.append(rotationControl(),el('section',{class:'section appearance-grid'},appearanceSlider('Panel opacity','panelOpacity',35,90,'%'),appearanceSlider('Background blur','backgroundBlur',0,12,' px'),appearanceSlider('Clock size','clockSize',70,120,'%')),field('Pinned shortcuts',select(state.prefs.pinStyle,[['icons','Website logo only'],['names','Website name only'],['both','Logo and name']],e=>save(s=>{s.prefs.pinStyle=e.target.value;s.prefs.pinLabels=e.target.value!=='icons';}))),toggle('Background behind shortcuts',state.prefs.pinGlass,value=>save(s=>{s.prefs.pinGlass=value;})),toggle('Online website icons',state.prefs.onlineSiteIcons,value=>save(s=>{s.prefs.onlineSiteIcons=value;})),help('Website icons come from Google’s favicon service using the website domain only. Turn this off to use icons already saved by Chrome.'),btn('Reset appearance',async()=>{await save(s=>{for(const key of ['panelOpacity','panelBlur','backgroundBlur','clockSize','pinLabels'])s.prefs[key]=APPEARANCE_DEFAULTS[key];s.prefs.pinStyle='icons';s.prefs.pinGlass=false;});renderPanel();},'text-button'));
  } else if (settingsTab === 'workspace') {
    body.append(help('Each workspace remembers its own links, lists, tasks, notes, habits, and visible widgets. Your daily focus travels with you.'), el('div', { class: 'stack' }, ['personal', 'work', 'study'].map(id => btn(`${id[0].toUpperCase() + id.slice(1)}${state.workspace === id ? ' · current' : ''}`, async () => { await save(s => { s.workspace = id; }); taskList = null; taskDateFilter = 'all'; renderPanel(); }, state.workspace === id ? 'primary' : 'secondary'))));
    if (state.focusArchive.length) { body.append(el('section', { class: 'section' }, el('h3', {}, 'Past focus'), el('ul', { class: 'list' }, state.focusArchive.slice(-20).reverse().map(item => el('li', { class: 'list-item' }, el('div', { class: 'item-main' }, el('strong', {}, item.text), el('small', {}, `${item.day} · ${item.done ? 'Completed' : 'Archived'}`))))))); }
  } else if(settingsTab==='ai') {
    renderAISettings();
  } else if(settingsTab==='updates') {
    renderUpdateSettings();
  } else {
    const file = input('', { type: 'file', accept: '.json,application/json', 'aria-label': 'Choose a Sebams backup', onchange: run(async e => { const f = e.target.files[0]; if (!f) return; if (f.size > 95 * 1024 * 1024) throw new Error('Choose a backup smaller than 95 MB.'); const backup = JSON.parse(await f.text()); const previous = await exportBackup(); const restore = async (value, revision = null) => { const restored = await importBackup(value, revision); state = getState(); currentBackgroundKey = ''; taskDrafts.clear(); renderDashboard(); renderPanel(); syncTimerAlarm(); return restored; }; const restored = await restore(backup); toast('Backup restored.', () => restore(previous, restored.revision)); }) });
    body.append(help('Your tasks, notes, and preferences stay on this device. Backups include task photos, AI answers, uploaded backgrounds and photo credits. Connection codes and online photo caches are excluded.'), btn('Download a backup', async () => { downloadJSON(await exportBackup(), `sebams-backup-${localDay()}.json`); toast('Your backup is ready to save.'); }, 'primary'), el('div', { class: 'section' }, field('Restore a backup · replaces local Sebams data', file)), help('A restored backup can be undone immediately. Import only a backup you trust; it may contain private notes and images.'), el('div', { class: 'divider' }), help('Sebams '+chrome.runtime.getManifest().version+' · Local by default. AI sends only the selected task when you ask.'));
  }
}
function renderUpdateSettings(){
  const version=chrome.runtime.getManifest().version;
  body.append(el('section',{class:'stack update-settings'},el('h3',{},'Sebams '+version),help('Sebams Bridge installs updates on this PC. Use a shared GitHub Releases repository so your other computers can receive the same versions. Keep Bridge running; your tasks, photos and settings stay saved.'),toggle('Check for updates automatically',updatePrefs.autoCheck,async value=>{updatePrefs=await patchUpdatePreferences({autoCheck:value});await chrome.runtime.sendMessage({type:'update-sync'});renderPanel();}),help('Checks once a day. You choose when to install and reload Sebams.'),btn(updateBusy?'Checking…':'Check for updates',async()=>{updateBusy=true;updateStatus='Checking for updates…';renderPanel();try{updateResult=await checkForUpdates();updatePrefs=await getUpdatePreferences();updateStatus=updateResult.needsReload?'The updated version is installed. Reload Sebams to use it.':!updateResult.configured?updateResult.message:updateResult.available?'Sebams '+updateResult.version+' is ready to install.':'You’re up to date.';}catch(error){updateResult=null;updateStatus=error.message;}finally{updateBusy=false;if(panelName==='settings'&&settingsTab==='updates')renderPanel();}},'primary',{disabled:updateBusy}),el('p',{class:'bridge-status',role:'status'},updateStatus||(updatePrefs.availableVersion?'Last check found Sebams '+updatePrefs.availableVersion+'. Check again to install.':'Check for a newer version.'))));
  if(updatePrefs.lastCheckedAt)body.append(help('Last checked: '+new Date(updatePrefs.lastCheckedAt).toLocaleString()));
  if(updateResult?.needsReload)body.append(btn('Reload Sebams',async()=>{await saveBeforeUpdate();await reloadAfterUpdate();},'primary',{disabled:updateBusy}));
  else if(updateResult?.available)body.append(el('section',{class:'section stack'},el('h3',{},'What’s new'),el('p',{class:'update-notes'},updateResult.notes),btn('Install update',async()=>{await saveBeforeUpdate();updateBusy=true;updateStatus='Installing update…';renderPanel();try{const {token}=await getBridgeConfig();const result=await bridgeRequest('/updates/install',token,{body:{version:updateResult.version,fingerprint:updateResult.fingerprint},timeout:45000});if(!result?.ok||result.version!==updateResult.version)throw Error('The update did not finish. Check for updates again.');updateStatus='Installed. Reloading Sebams…';renderPanel();await reloadAfterUpdate();}catch(error){updateStatus=error.message;updateResult=null;}finally{updateBusy=false;if(panelName==='settings'&&settingsTab==='updates')renderPanel();}},'primary',{disabled:updateBusy}),help('Sebams reloads after installation. A copy of the previous extension version is kept on this PC.')));
  renderUpdateSource();
  if(!bridgeConfig.token)body.append(btn('Connect Sebams Bridge',()=>{settingsTab='ai';renderPanel();},'secondary'));
}
async function loadUpdateSource(){
  updateSource=null;updateSourceStatus='';if(!bridgeConfig.token)return;
  try{updateSource=await bridgeRequest('/updates/source',bridgeConfig.token,{timeout:6000});if(typeof updateSource?.repository!=='string'||typeof updateSource.configured!=='boolean')throw Error('Update Bridge to configure a shared source.');}catch(error){updateSource=null;updateSourceStatus=error.message;}
}
function renderUpdateSource(){
  const repository=input(updateSource?.repository||'',{placeholder:'https://github.com/your-name/sebams',maxlength:250,'aria-label':'Public GitHub repository',disabled:updateBusy});
  body.append(el('details',{class:'section disclosure',open:updateSource?.source==='github'},el('summary',{},'Release source'),help(updateSource?.source==='github'?'Shared source: '+updateSource.repository:'Current source: a release prepared on this PC. Other computers need a shared repository.'),el('form',{class:'stack',onsubmit:run(async event=>{event.preventDefault();const {token}=await getBridgeConfig();const result=await bridgeRequest('/updates/source',token,{body:{repository:repository.value},timeout:6000});updateSource=result;updateResult=null;updateStatus='';updatePrefs=await patchUpdatePreferences({lastCheckedAt:0,availableVersion:''});updateSourceStatus=result.source==='github'?'Shared source saved. Publish a release before checking for updates.':'Local release source saved.';renderPanel();})},field('Public GitHub repository',repository),el('button',{type:'submit',class:'secondary',disabled:updateBusy},'Save release source')),help('Run SetupUpdates.cmd in Bridge once on each PC and select its Sebams extension folder. Then use the same public repository here. No AI API key is needed for updates. Leave the field empty to use local releases.'),el('p',{role:'status',class:'help'},updateSourceStatus)));
}
async function saveBeforeUpdate(){
  if(aiRequests.size)throw Error('Finish or cancel the active AI request before installing an update.');
  if(notesDirty)await flushNotes();
  const dirty=[...taskDrafts].filter(([,draft])=>draft.details!==draft.base);
  if(dirty.length){await save(s=>{for(const [key,draft] of dirty){const [wsid,id]=key.split('/'),task=s.workspaces[wsid]?.tasks.find(t=>t.id===id);if(!task||task.details!==draft.base)throw Error('A task changed in another tab. Review your draft before updating.');task.details=draft.details;}});for(const [,draft] of dirty)draft.base=draft.details;}
}
function syncTaskAlarm(){if(!state)return;const key=JSON.stringify([state.prefs.remindersEnabled,...Object.values(state.workspaces).flatMap(w=>w.tasks.map(t=>[t.id,t.done,t.reminderAt,t.remindedAt]))]);if(key===lastTaskSyncKey)return;lastTaskSyncKey=key;globalThis.chrome?.runtime?.sendMessage({type:'task-sync'}).catch(()=>{lastTaskSyncKey='';});}
function renderReminderSettings(){
  const choices=[['0','On the due date'],['60','1 hour before'],['720','12 hours before'],['1440','1 day before'],['2880','2 days before'],['10080','1 week before'],['custom','Custom']];
  const lead=state.prefs.reminderOnOpenLeadMinutes,custom=!choices.some(([v])=>v===String(lead));
  const section=el('section',{class:'section stack'},el('h3',{},'Task reminders'),toggle('Reminders when opening Sebams',state.prefs.remindersOnOpen,value=>save(s=>{s.prefs.remindersOnOpen=value;})),help('A quiet reminder window appears when you open or return to Sebams. Tasks with a due date use this schedule; a reminder chosen inside a task takes priority.'),el('div',{class:'field-grid'},field('Remind me before the due date',select(custom?'custom':String(lead),choices,async e=>{if(e.target.value==='custom'){customMinutes.hidden=false;customMinutes.querySelector('input').focus();return;}await save(s=>{s.prefs.reminderOnOpenLeadMinutes=Number(e.target.value);});renderPanel();})),field('Due-date reference time',input(state.prefs.reminderOnOpenTime,{type:'time',required:true,onchange:run(e=>{if(!e.target.value)throw Error('Choose a time.');return save(s=>{s.prefs.reminderOnOpenTime=e.target.value;});})}))));
  const customMinutes=field('Minutes before the due-date reference time',input(String(lead),{type:'number',min:0,max:10080,step:1,onchange:run(e=>{const value=e.target.valueAsNumber;if(!Number.isInteger(value)||value<0||value>10080)throw Error('Choose from 0 to 10,080 minutes.');return save(s=>{s.prefs.reminderOnOpenLeadMinutes=value;});})}));customMinutes.hidden=!custom;
  section.append(customMinutes,help('For example: 1 day before + 09:00 shows it from 9 AM the day before. If Sebams was closed, it appears on your next visit. Dismissing a reminder hides that schedule; snoozing waits one hour.'),btn('Preview reminder',async()=>{await closePanel();await reminderInbox.preview();},'secondary'),el('details',{class:'disclosure'},el('summary',{},'Optional desktop notifications'),toggle('Desktop reminders',state.prefs.remindersEnabled,async value=>{if(value&&!await chrome.permissions.request({permissions:['notifications']}))throw Error('Chrome notification permission was declined.');await save(s=>{s.prefs.remindersEnabled=value;});}),help('Uses the explicit reminder set inside a task. Chrome and Windows notification settings apply. Opening reminders do not require notification permission.')));
  body.append(section);
}
function taskToolsContext(wsid){return {state,wsid,save,run,render:renderPanel,toast,sync:syncTaskAlarm,weekOffset,setWeek:value=>{weekOffset=value;renderPanel();},openTask:id=>{taskTool=null;taskDetailId=id;renderPanel();},reminderSettings:()=>{settingsTab='general';openPanel('settings');}};}
async function openTaskById(id){await openPanel('tasks');taskDetailId=id;taskTool=null;taskList=null;taskDateFilter='all';renderPanel();}
function installCommands(){
  openCommands=installPalette({state:()=>state,run,command:async name=>{if(name==='settings'){await openPanel('settings');return;}await openPanel('tasks');taskList=null;taskDateFilter='all';taskTool=name==='new'?null:name;renderPanel();if(name==='new')body.querySelector('[aria-label="New task"]').focus();},choose:async entry=>{if(entry.type==='link'){location.assign(entry.url);return;}await save(s=>{s.workspace=entry.workspace;});if(entry.type==='task')await openTaskById(entry.id);else{await openPanel('tasks');taskList=entry.id;taskTool=null;renderPanel();}}});
  $('search-commands').onclick=openCommands;
}
function renderAISettings(){
  const code=input('',{type:'password',autocomplete:'off',maxlength:128,placeholder:'Connection code from Sebams Bridge','aria-label':'Bridge connection code'});
  body.append(el('section',{class:'ai-settings stack'},el('div',{},el('span',{class:'eyebrow'},'TASK ASSISTANT'),el('h3',{},'A little help with the hard part')),help('Attach a photo or write the full exercise, then use hints, explanations, or a study plan. Photos also work as personal references. Gemini has a free tier with quotas. Use a Google AI Studio project without billing. Google may use free-tier content to improve its products.'),el('form',{class:'add-form',onsubmit:run(async e=>{
    e.preventDefault();const token=code.value.trim();if(token.startsWith('sk-')||token.startsWith('AIza')||! /^[A-Za-z0-9_-]{32,128}$/.test(token))throw Error('Use the connection code from Sebams Bridge. Your Gemini API key goes only in the Bridge configuration.');
    const allowed=await requestBridgeAccess();if(!allowed)throw Error('Local connection access was declined.');
    bridgeBusy=true;bridgeStatus='Connecting…';
    try{const health=await bridgeRequest('/health',token,{timeout:6000});await setBridgeConfig({token});bridgeConfig={token};bridgeStatus=health.configured?'Connected · '+health.model:'Connected · add a free Gemini API key in Sebams Bridge to use AI.';await syncBridgeTasks();chrome.runtime.sendMessage({type:'bridge-sync'}).catch(()=>{});}
    catch(error){bridgeStatus=error.message;throw error;}finally{bridgeBusy=false;if(panelName==='settings'&&settingsTab==='ai')renderPanel();}
  })},field('Local connection code',code),el('button',{type:'submit',class:'primary',disabled:bridgeBusy},bridgeConfig.token?'Reconnect':'Connect Sebams Bridge')),el('p',{class:'bridge-status',role:'status'},bridgeStatus||(bridgeConfig.token?'Connection saved. Start Sebams Bridge to receive tasks.':'AI is optional. Photos and task details work without a connection.'))));
  if(bridgeConfig.token)body.append(row(btn('Check connection',async()=>{bridgeBusy=true;try{const health=await bridgeRequest('/health',bridgeConfig.token,{timeout:6000});bridgeStatus=health.configured?'Connected · '+health.model:'Connected · Free Gemini API key needed in Sebams Bridge.';await syncBridgeTasks();}catch(error){bridgeStatus=error.message;throw error;}finally{bridgeBusy=false;renderPanel();}},'secondary',{disabled:bridgeBusy}),btn('Disconnect',async()=>{for(const request of aiRequests.values())request.controller.abort();await setBridgeConfig({token:''});bridgeConfig={token:''};bridgeStatus='Disconnected.';chrome.runtime.sendMessage({type:'bridge-sync'}).catch(()=>{});renderPanel();},'text-button')));
  body.append(el('section',{class:'section'},el('h3',{},'Create tasks from ChatGPT'),help('Connect the Sebams MCP tools using the setup guide included with Sebams Bridge. The tools ask for title, priority, due date, list and workspace before creating a task. Chrome checks for incoming tasks every minute while the Bridge is running.'),help('The Bridge keeps the API key outside Chrome and backups. Sebams shares list names for task creation. Sending a task to AI shares its title and details with Gemini. Photos are included only when you enable that option.'),el('a',{href:'https://aistudio.google.com/apikey',target:'_blank',rel:'noopener noreferrer',class:'text-button'},'Get a free Gemini API key')));
}
async function syncBridgeTasks(){
  if(bridgeSyncBusy||document.hidden)return;
  bridgeSyncBusy=true;
  try{
    bridgeConfig=await getBridgeConfig();
    if(!bridgeConfig.token||!await hasBridgeAccess())return;
    const result=await receiveBridgeTasks();
    if(result.added)toast(`${result.added} task${result.added===1?'':'s'} received from ChatGPT.`);
  }catch(error){bridgeStatus=error.message;}finally{bridgeSyncBusy=false;}
}
function rotationControl(){return field('Rotation frequency',select(state.prefs.backgroundCadence,[['daily','Every day'],['hourly','Every hour'],['tab','Every new tab']],e=>save(s=>{s.prefs.backgroundCadence=e.target.value;})));}
function appearanceSlider(label,key,min,max,suffix){const output=el('span',{class:'range-value'},state.prefs[key]+suffix);return el('div',{},field(label,input(state.prefs[key],{type:'range',min,max,step:1,oninput:e=>{const value=Number(e.target.value);output.textContent=value+suffix;const styles={panelOpacity:['--surface',`rgba(24,24,27,${value/100})`],panelBlur:['--panel-blur',value+'px'],backgroundBlur:['--background-blur',value+'px'],clockSize:['--clock-scale',value/100]};document.documentElement.style.setProperty(...styles[key]);},onchange:run(e=>save(s=>{s.prefs[key]=Number(e.target.value);}))})),output);}
async function randomOnlineBackground(){
  if(photosBusy)return;photosBusy=true;photosError='';renderPanel();
  try{
    photoAccess=await requestPhotoAccess();if(!photoAccess)throw Error('Photo access was declined. Your background stays the same.');
    const collection=await fetchPhotoCollection(state.photos), photo=chooseRandomPhoto(collection.items,selectedBackground.id);
    let blob=await getCachedPhoto(photo.id);if(!blob){blob=await fetchPhotoBlob(photo);await cachePhoto(photo.id,blob);}
    failedBackgrounds.delete(photo.id);currentBackgroundKey='';
    await save(s=>{s.photos={...collection,enabled:true};s.prefs.backgroundMode='manual';s.prefs.backgroundId=photo.id;});
  }catch(error){photosError=error.message;throw error;}
  finally{photosBusy=false;renderPanel();}
}
async function loadPhotos(enable=false){
  if(photosBusy)return;
  photoAccess=await requestPhotoAccess();if(!photoAccess)throw Error('Photo access was declined. Your local backgrounds still work.');
  photosBusy=true;photosError='';if(panelName==='backgrounds')renderPanel();
  try{const collection=await fetchPhotoCollection(state.photos,true);failedBackgrounds.clear();currentBackgroundKey='';await save(s=>{s.photos=collection;if(enable){s.prefs.backgroundMode='daily';const length=BACKGROUNDS.length+s.images.length+collection.items.length,index=BACKGROUNDS.length+s.images.length;s.prefs.backgroundOffset=(index-rotationIndex(length,s.prefs.backgroundCadence,0,Date.now(),tabSeed)+length)%length;}});}
  catch(error){photosError=error.message;throw error;}
  finally{photosBusy=false;if(panelName==='backgrounds')renderPanel();}
}
function renderBackgrounds() {
  body.append(field('Background changes', select(state.prefs.backgroundMode, [['daily', 'Daily rotation'], ['favorites', 'Favorites each day'], ['manual', 'My chosen scene']], e => save(s => { s.prefs.backgroundMode = e.target.value; }))), help('Choose a scene to keep it. Use the heart in the dashboard to save a favorite.'));
  body.append(rotationControl(),row(btn('Next background',nextBackground,'secondary')),el('h3',{class:'collection-title'},'Your offline scenes'));
  const grid = el('div', { class: 'background-grid' }); body.append(grid);
  for (const image of [...BACKGROUNDS, ...state.images.map(i => ({ ...i, title: i.name, uploaded: true }))]) {
    const thumbnail = el('img', { alt: '', src: image.path || BACKGROUNDS[0].path });
    const card = btn([thumbnail, el('span', {}, image.title), state.prefs.favoriteBackgrounds.includes(image.id) ? el('span', { class: 'badge', 'aria-label': 'Favorite' }, '♥') : null], () => save(s => { s.prefs.backgroundMode = 'manual'; s.prefs.backgroundId = image.id; }), `background-card${selectedBackground.id === image.id ? ' selected' : ''}`, { 'aria-label': `Use ${image.title}`, 'aria-pressed': selectedBackground.id === image.id }); grid.append(card);
    if (image.uploaded) getImage(image.id).then(blob => { if (blob && thumbnail.isConnected) { const u = URL.createObjectURL(blob); thumbnail.src = u; thumbnail.onload = () => URL.revokeObjectURL(u); } });
  }
  const online=el('section',{class:'section photo-collection'},el('div',{class:'row between'},el('div',{},el('span',{class:'eyebrow'},'PHOTOGRAPHY'),el('h3',{},'A window to somewhere else')),el('a',{href:'https://picsum.photos/',target:'_blank',rel:'noopener noreferrer',class:'text-button'},'About Picsum')),help('A free collection of up to 12 photographs. No account or API key. The last four backgrounds you use stay available offline.'));
  if(!state.photos.enabled)online.append(btn('Enable online photos',()=>loadPhotos(true),'primary',{disabled:photosBusy}));
  else online.append(toggle('Online photo collection',true,async value=>{if(!value)await save(s=>{s.photos.enabled=false;});}),row(btn(photoAccess?'Refresh collection':'Enable photo access',()=>loadPhotos(false),'secondary',{disabled:photosBusy}),btn('Clear photo cache',async()=>{await save(s=>{s.photos.enabled=false;});await clearPhotoCache();toast('Downloaded photos cleared. Online collection turned off.');renderPanel();},'text-button',{disabled:photosBusy})));
  if(photosBusy||photosError)online.append(help(photosBusy?'Finding a little change of scenery…':photosError));
  if(state.photos.enabled && state.photos.items.length){
    const photos=el('div',{class:'background-grid online-grid'});
    for(const photo of state.photos.items){const thumbnail=el('img',{alt:'',src:photoAccess?photoURL(photo,true):BACKGROUNDS[0].path,loading:'lazy',referrerpolicy:'no-referrer',onerror:e=>{if(!e.target.dataset.fallback){e.target.dataset.fallback='true';e.target.src=BACKGROUNDS[0].path;}}});const favorite=state.prefs.favoriteBackgrounds.includes(photo.id);const card=el('article',{class:'photo-card'},btn([thumbnail,el('span',{},photo.title)],()=>save(s=>{s.prefs.backgroundMode='manual';s.prefs.backgroundId=photo.id;}),`background-card${selectedBackground.id===photo.id?' selected':''}`,{'aria-label':`Use ${photo.title}`,'aria-pressed':selectedBackground.id===photo.id}),el('div',{class:'photo-card-footer'},el('a',{href:photo.source,target:'_blank',rel:'noopener noreferrer',title:`Photo by ${photo.author} on Unsplash`},photo.author),ibtn('heart',`Favorite ${photo.title}`,()=>save(s=>toggleID(s.prefs.favoriteBackgrounds,photo.id)),{class:`icon-button small${favorite?' active-heart':''}`,'aria-pressed':favorite})));photos.append(card);}online.append(photos);
  }
  body.append(online);
  const upload = input('', { type: 'file', accept: 'image/jpeg,image/png,image/webp', 'aria-label': 'Upload your background image', onchange: run(async e => {
    const file = e.target.files[0]; if (!file) return; if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) throw new Error('Choose a JPG, PNG, or WebP image smaller than 8 MB.');
    const bitmap = await createImageBitmap(file); if (bitmap.width > 12000 || bitmap.height > 12000) { bitmap.close(); throw new Error('Choose an image smaller than 12,000 pixels on each side.'); } bitmap.close();
    const metadata = await putImage(file); await save(s => { if (!s.images.some(i => i.id === metadata.id)) s.images.push(metadata); s.prefs.backgroundMode = 'manual'; s.prefs.backgroundId = metadata.id; }); renderPanel(); toast('Your scene is ready.');
  }) }); body.append(el('div', { class: 'section' }, field('Bring your own scene', upload), help('JPG, PNG, or WebP · up to 8 MB. Images are stored locally.')));
  if (state.images.length) body.append(el('ul', { class: 'list' }, state.images.map(image => el('li', { class: 'list-item' }, el('span', { class: 'item-main' }, image.name), btn('Remove', async () => { const blob = await getImage(image.id); await removeImage(image.id); await save(s => { s.images = s.images.filter(i => i.id !== image.id); s.prefs.favoriteBackgrounds = s.prefs.favoriteBackgrounds.filter(id => id !== image.id); if (s.prefs.backgroundId === image.id) s.prefs.backgroundId = 'alpine'; }); currentBackgroundKey = ''; renderDashboard(); renderPanel(); toast('Image removed. Bundled scenes remain available.'); }, 'text-button danger')))));
}
function renderQuotes() {
  body.append(toggle('Show a daily quote', state.prefs.showQuotes, value => save(s => { s.prefs.showQuotes = value; })), field('Quote selection', select(state.prefs.quoteMode, [['daily', 'Rotate all quotes daily'], ['favorites', 'Rotate favorites daily'], ['manual', 'Keep my chosen quote']], e => save(s => { s.prefs.quoteMode = e.target.value; }))));
  const list = el('ul', { class: 'list' }); body.append(list);
  for (const q of [...QUOTES, ...state.customQuotes]) {
    const item = el('li', { class: 'list-item' }, el('div', { class: 'item-main' }, el('strong', {}, q.text), el('small', {}, q.author)), ibtn('heart', 'Favorite quote', () => save(s => toggleID(s.prefs.favoriteQuotes, q.id)), { 'aria-pressed': state.prefs.favoriteQuotes.includes(q.id), class: `icon-button${state.prefs.favoriteQuotes.includes(q.id) ? ' active-heart' : ''}` }), btn('Use', () => save(s => { s.prefs.quoteMode = 'manual'; s.prefs.quoteId = q.id; }), 'text-button'));
    if (q.source) item.querySelector('.item-main').append(el('a', { href: q.source, target: '_blank', rel: 'noopener noreferrer', class: 'text-button' }, 'Source'));
    else item.append(ibtn('trash', 'Remove custom quote', async () => { await save(s => { s.customQuotes = s.customQuotes.filter(item => item.id !== q.id); }); renderPanel(); toast('Quote removed.', () => save(s => { s.customQuotes.push(q); })); })); list.append(item);
  }
  const text = input('', { maxlength: 500, placeholder: 'Words you want to remember', required: true, 'aria-label': 'Custom quote' }), author = input('', { maxlength: 100, placeholder: 'Author or “Personal reminder”', 'aria-label': 'Quote author' });
  const form = el('form', { class: 'add-form', onsubmit: run(async e => { e.preventDefault(); if (!text.value.trim()) return; await save(s => { s.customQuotes.push({ id: uid(), text: text.value.trim(), author: author.value.trim() || 'Personal reminder' }); }); renderPanel(); }) }, field('Add your own', text), row(author, el('button', { class: 'primary', type: 'submit' }, 'Add quote'))); body.append(form);
}
function toggleID(items, id) { const i = items.indexOf(id); if (i >= 0) items.splice(i, 1); else items.push(id); }
function itemConflict(items, id, oldText, field = 'text') { const item = items.find(i => i.id === id); if (!item || item[field] !== oldText) throw new Error('This item changed in another tab. Reopen it to edit the latest version.'); return item; }
function renderTasks() {
  const wsid = state.workspace, w = workspace(), day = localDay();
  if (taskList !== null && !w.lists.includes(taskList)) taskList = null;
  const chooseView = (list, filter = 'all') => { taskTool=null;taskList=list; taskDateFilter=filter; editingTask=null; taskDetailId=null; editingList=null; creatingTaskList=false; renderPanel(); body.querySelector('.task-list').scrollTop=0; };
  const navigation=el('nav',{class:'task-navigation','aria-label':'Task navigation'});
  const navButton=(label, symbol, count, active, action, accessible)=>btn([icon(symbol),el('span',{class:'task-nav-label'},label),el('span',{class:'task-nav-count','aria-hidden':'true'},count)],action,`task-nav-button${active?' selected':''}`,{'aria-label':accessible,'aria-pressed':String(active)});
  const pending=w.tasks.filter(task=>!task.done), globalFilter=taskList===null&&!taskTool;
  navigation.append(el('div',{class:'task-smart-views'},
    navButton('All tasks','list',pending.length,globalFilter&&!['today','upcoming','completed'].includes(taskDateFilter),()=>chooseView(null),'Show all tasks'),
    navButton('Today','sun',pending.filter(task=>task.dueDate===day).length,globalFilter&&taskDateFilter==='today',()=>chooseView(null,'today'),"Show today's tasks"),
    navButton('Upcoming','calendar',pending.filter(task=>task.dueDate>day).length,globalFilter&&taskDateFilter==='upcoming',()=>chooseView(null,'upcoming'),'Show upcoming tasks'),
    navButton('Completed','complete',w.tasks.filter(task=>task.done).length,globalFilter&&taskDateFilter==='completed',()=>chooseView(null,'completed'),'Show completed tasks')));
  const collections=el('section',{class:'task-collections'},el('div',{class:'task-section-label'},'MY LISTS'));
  for(const name of w.lists)collections.append(navButton(name,name==='Inbox'?'inbox':'list',pending.filter(task=>task.list===name).length,taskList===name&&!taskTool,()=>chooseView(name),`Show list ${name}`));
  collections.append(btn([icon('plus'),el('span',{},'New list')],()=>{creatingTaskList=!creatingTaskList;renderPanel();if(creatingTaskList)body.querySelector('[aria-label="New list name"]').focus();},'task-new-list',{'aria-label':'New list',disabled:w.lists.length>=20&&!creatingTaskList}));
  if(creatingTaskList){
    const name=input('',{maxlength:40,placeholder:'Subject or list name',required:true,'aria-label':'New list name'});
    navigation.append(el('form',{class:'task-list-form',onsubmit:run(async e=>{e.preventDefault();const value=name.value.trim();if(!value)return;await save(s=>{const lists=s.workspaces[wsid].lists;if(!lists.includes(value)){if(lists.length>=20)throw Error('Keep up to 20 lists in each workspace.');lists.push(value);}});creatingTaskList=false;taskList=value;taskDateFilter='all';renderPanel();})},name,row(el('button',{type:'submit',class:'primary'},'Create'),btn('Cancel',()=>{creatingTaskList=false;renderPanel();},'text-button'))));
  }
  navigation.insertBefore(collections,navigation.querySelector('.task-list-form'));
  navigation.append(el('section',{class:'task-tools-nav'},el('div',{class:'task-section-label'},'PLAN & REVIEW'),...Object.entries({calendar:'Calendar',exams:'Exam planner',templates:'Templates',progress:'Progress'}).map(([id,label])=>btn([icon(id==='calendar'||id==='exams'?'calendar':'list'),el('span',{},label)],()=>{taskTool=id;taskDetailId=null;renderPanel();},`task-nav-button${taskTool===id?' selected':''}`,{'aria-label':`Show ${label}`,'aria-pressed':String(taskTool===id)}))));
  const sidebar=el('aside',{class:'task-sidebar'},el('div',{class:'task-side-heading'},icon('check'),el('h2',{},'Tasks')),navigation);
  const content=el('section',{class:'task-content','aria-labelledby':'task-view-title'});
  const matches = task => (taskList === null || task.list === taskList) && matchesTaskDate(task, taskDateFilter), tasks = w.tasks.filter(matches), list = el('ul', { class: 'task-list list','aria-label':'Tasks in this view' });
  const title=taskList!==null?taskList:({today:'Today',upcoming:'Upcoming',completed:'Completed',overdue:'Overdue',undated:'No date',all:'All tasks'})[taskDateFilter];
  const viewIcon=taskList!==null?(taskList==='Inbox'?'inbox':'list'):({today:'sun',upcoming:'calendar',completed:'complete',all:'list',overdue:'calendar',undated:'list'})[taskDateFilter];
  content.append(el('header',{class:'task-content-heading'},el('div',{class:'task-view-name'},icon(viewIcon),el('div',{},el('h2',{id:'task-view-title'},title),el('p',{class:'task-view-summary'},`${tasks.filter(task=>!task.done).length} open · ${tasks.filter(task=>task.done).length} completed`))),select(taskDateFilter,[['all','All dates'],['today','Today'],['upcoming','Upcoming'],['overdue','Overdue'],['undated','No date'],['completed','Completed']],e=>{taskDateFilter=e.target.value;editingTask=null;renderPanel();},{'aria-label':'Task dates',class:'task-date-filter'})),list);
  body.append(el('div',{class:'task-shell'},sidebar,content));
  if(taskTool){renderToolsView(content,taskTool,taskToolsContext(wsid));return;}
  const selectedTask=w.tasks.find(task=>task.id===taskDetailId);
  if(selectedTask){renderTaskDetail(content,list,selectedTask,wsid);return;}
  taskDetailId=null;
  if(taskList!==null&&taskList!=='Inbox'){
    const selectedList=taskList;
    const actions=el('div',{class:'task-list-actions'},btn([icon('edit'),'Rename list'],()=>{editingList=selectedList;renderPanel();body.querySelector('[aria-label="List name"]').focus();},'text-button',{'aria-label':'Rename list'}),btn([icon('trash'),'Delete list'],async()=>{
      let moved=[],movedTemplates=[],movedPlans=[],position;
      await save(s=>{const current=s.workspaces[wsid];position=current.lists.indexOf(selectedList);if(position<0)throw Error('This list changed in another tab. Reopen Tasks.');current.lists.splice(position,1);for(const template of current.templates)if(template.list===selectedList){movedTemplates.push(template.id);template.list='Inbox';}for(const plan of current.exams)if(plan.list===selectedList){movedPlans.push(plan.id);plan.list='Inbox';}if(!current.lists.includes('Inbox'))current.lists.unshift('Inbox');for(const task of current.tasks){if(task.list===selectedList){moved.push(task.id);task.list='Inbox';}}});
      taskList='Inbox';taskDateFilter='all';editingList=null;editingTask=null;renderPanel();
      toast('List deleted. Its tasks are in Inbox.',async()=>{await save(s=>{const current=s.workspaces[wsid];if(current.lists.includes(selectedList)||current.lists.length>=20)throw Error('The list cannot be restored now. Its tasks remain in Inbox.');current.lists.splice(Math.min(position,current.lists.length),0,selectedList);for(const t of current.templates)if(movedTemplates.includes(t.id)&&t.list==='Inbox')t.list=selectedList;for(const p of current.exams)if(movedPlans.includes(p.id)&&p.list==='Inbox')p.list=selectedList;for(const task of current.tasks){if(moved.includes(task.id)&&task.list==='Inbox')task.list=selectedList;}});taskList=selectedList;renderPanel();});
    },'text-button danger',{'aria-label':'Delete list'}));
    content.insertBefore(actions,list);
    if(editingList===selectedList){const name=input(selectedList,{maxlength:40,required:true,'aria-label':'List name'});content.insertBefore(el('form',{class:'task-rename-form row',onsubmit:run(async e=>{e.preventDefault();const value=name.value.trim();if(!value)return;await save(s=>{const current=s.workspaces[wsid],index=current.lists.indexOf(selectedList);if(index<0)throw Error('This list changed in another tab. Reopen Tasks.');if(value!==selectedList&&current.lists.includes(value))throw Error('A list with this name already exists.');current.lists[index]=value;for(const template of current.templates)if(template.list===selectedList)template.list=value;for(const plan of current.exams)if(plan.list===selectedList)plan.list=value;for(const task of current.tasks){if(task.list===selectedList)task.list=value;}});taskList=value;editingList=null;renderPanel();})},name,el('button',{type:'submit',class:'primary'},'Save name'),btn('Cancel',()=>{editingList=null;renderPanel();},'text-button')),list);}
  }
  if (!tasks.length) list.append(el('li', { class: 'task-empty' },icon(taskDateFilter==='completed'?'complete':'check'),el('h3',{},taskDateFilter==='completed'?'No completed tasks yet':'No tasks in this view'),el('p',{},taskDateFilter==='completed'?'Tasks you finish will appear here.':'Add a task below, or choose another list.')));
  for (const task of tasks) {
    if (editingTask === task.id) {
      const text = input(task.text, { maxlength: 300, required: true, 'aria-label': 'Edit task' });
      const priority = select(task.priority, [['normal','Normal priority'],['high','High priority'],['low','Low priority']], () => {}, { 'aria-label': 'Task priority' });
      const listChoice = select(task.list, w.lists.map(l => [l,l]), () => {}, { 'aria-label': 'Move to list' });
      const date = input(task.dueDate, { type: 'date', min: '0001-01-01', max: '9999-12-31', 'aria-label': 'Task date' });
      list.append(el('li', {class:'task-editor'}, el('form', { class: 'add-form', onsubmit: run(async e => {
        e.preventDefault(); await save(s => {
          const item = itemConflict(s.workspaces[wsid].tasks, task.id, task.text);
          if (item.priority !== task.priority || item.list !== task.list || item.done !== task.done || item.dueDate !== task.dueDate) throw new Error('This task changed in another tab. Reopen it to edit.');
          item.text = text.value.trim(); item.priority = priority.value; item.list = listChoice.value; item.dueDate = date.value;
        }); editingTask = null; renderPanel();
      }) }, text, row(priority, listChoice), field('Date (optional)', date), row(el('button', { type: 'submit', class: 'primary' }, 'Save'), btn('Cancel', () => { editingTask = null; renderPanel(); })))));
      continue;
    }
    const overdue = task.dueDate && task.dueDate < day && !task.done;
    const metadata = el('div', { class: 'task-meta' },taskList===null?el('span',{class:'task-list-tag'},task.list):null, task.priority !== 'normal' ? el('span', {class:task.priority==='high'?'task-priority-high':''}, `${task.priority} priority`) : null, task.dueDate ? el('time', { datetime: task.dueDate, class: overdue ? 'due-date overdue' : 'due-date' }, `${overdue ? 'Overdue · ' : ''}${taskDateLabel(task.dueDate)}`) : null);
    list.append(el('li', { class: `list-item task-row${task.done?' task-done':''}` },
      input('', { type: 'checkbox', checked: task.done, 'aria-label': `Complete ${task.text}`, onchange: run(async e => { const done = e.target.checked; await save(s => { const item = s.workspaces[wsid].tasks.find(t => t.id === task.id); if (item) item.done = done; }); renderPanel(); }) }),
      el('div', { class: `item-main${task.done ? ' done-text' : ''}` }, btn(el('strong',{},task.text),()=>{taskDetailId=task.id;renderPanel();},'task-title-button',{'aria-label':`Open ${task.text}`,title:'Open task details and reference photos'}), metadata,task.attachments.length||task.ai?el('small',{class:'task-extras'},[task.attachments.length?`${task.attachments.length} photo${task.attachments.length===1?'':'s'}`:'',task.ai?'AI answer':''].filter(Boolean).join(' · ')):null),
      el('div', { class: 'item-actions' },
        ibtn('more',`More actions for ${task.text}`,e=>{const actions=e.currentTarget.parentElement;actions.classList.toggle('expanded');e.currentTarget.setAttribute('aria-expanded',String(actions.classList.contains('expanded')));},{class:'icon-button task-more','aria-expanded':'false'}),
        ibtn('up', `Move ${task.text} up`, async () => { await save(s => moveItem(s.workspaces[wsid].tasks, task.id, -1, matches)); renderPanel(); }, { disabled: tasks[0]?.id === task.id }),
        ibtn('down', `Move ${task.text} down`, async () => { await save(s => moveItem(s.workspaces[wsid].tasks, task.id, 1, matches)); renderPanel(); }, { disabled: tasks.at(-1)?.id === task.id }),
        ibtn('edit', `Edit ${task.text}`, () => { editingTask = task.id; renderPanel(); }),
        ibtn('trash', `Delete ${task.text}`, async () => {
          aiRequests.get(wsid+'/'+task.id)?.controller.abort();taskDrafts.delete(wsid+'/'+task.id);
          let removed, index; await save(s => { const items = s.workspaces[wsid].tasks; index = items.findIndex(t => t.id === task.id); if (index >= 0) [removed] = items.splice(index,1); }); renderPanel(); if (!removed) return;
          toast('Task deleted.', async () => { await save(s => { const items = s.workspaces[wsid].tasks; if (!items.some(t => t.id === removed.id)) items.splice(Math.min(index,items.length),0,removed); }); renderPanel(); });
        })
      )
    ));
  }
  const text = input('', { placeholder: 'New task', maxlength: 300, required: true, 'aria-label': 'New task' });
  const priority = select('normal', [['normal','Normal priority'],['high','High priority'],['low','Low priority']], () => {}, { 'aria-label': 'New task priority' });
  const lists = select(taskList === null ? w.lists[0] : taskList, w.lists.map(l => [l,l]), () => {}, { 'aria-label': 'List for new task' });
  const date = input(taskDateFilter === 'today' ? day : '', { type: 'date', min: '0001-01-01', max: '9999-12-31', 'aria-label': 'Date for new task' });
  content.append(el('form', { class: 'task-composer add-form', onsubmit: run(async e => {
    e.preventDefault(); if (!text.value.trim()) return;
    const task = createTask({text:text.value.trim(),priority:priority.value,list:lists.value,dueDate:date.value});
    await save(s => s.workspaces[wsid].tasks.push(task));
    if (taskList !== null && task.list !== taskList) taskList = task.list;
    if (!matchesTaskDate(task,taskDateFilter)) taskDateFilter = 'all'; renderPanel();
  }) },el('div',{class:'task-add-line'},icon('plus'),text,el('button',{type:'submit',class:'primary'},'Add')),el('div',{class:'task-add-options'},field('List',lists),field('Priority',priority),field('Date (optional)',date))));
}
function taskSnapshot(task){return JSON.stringify([task.text,task.details,task.priority,task.dueDate,task.list,task.attachments,task.ai]);}
async function openReferencePhoto(image){
  const blob=await getTaskAttachment(image.id);if(!blob)throw Error('This photo is unavailable.');const url=URL.createObjectURL(blob),previous=document.activeElement;
  const viewer=el('dialog',{class:'reference-viewer','aria-label':`Reference photo ${image.name}`},el('div',{class:'row between'},el('strong',{},image.name),ibtn('close','Close reference photo',()=>viewer.close())),el('img',{src:url,alt:image.name}));document.body.append(viewer);viewer.addEventListener('close',()=>{URL.revokeObjectURL(url);viewer.remove();previous?.focus();},{once:true});viewer.showModal();
}
function renderTaskDetail(content,list,task,wsid){
  const key=wsid+'/'+task.id;
  if(!taskDrafts.has(key))taskDrafts.set(key,{details:task.details,base:task.details,instruction:'Guíame con pistas para que pueda resolver esta tarea por mi cuenta. No des la solución completa.',includePhotos:false});
  const draft=taskDrafts.get(key),request=aiRequests.get(key);
  const details=el('textarea',{rows:5,maxlength:12000,value:draft.details,placeholder:'Paste the exercise, instructions, or what you need help with…','aria-label':'Task details',oninput:e=>{draft.details=e.target.value;}});
  const saveDetails=async()=>{
    if(draft.details===draft.base)return;
    const value=draft.details,base=draft.base;
    await save(s=>{const item=s.workspaces[wsid].tasks.find(t=>t.id===task.id);if(!item||item.details!==base)throw Error('Task details changed in another tab. Copy your draft, then choose Load saved details.');item.details=value;});draft.base=value;
  };
  const heading=el('header',{class:'task-detail-heading'},btn([icon('arrow'),'Back to tasks'],()=>{taskDetailId=null;renderPanel();},'text-button'),el('h2',{},task.text),el('p',{class:'task-meta'},`${task.list} · ${task.priority} priority${task.dueDate?' · '+taskDateLabel(task.dueDate):''}`));
  list.replaceChildren();content.replaceChildren(heading,list);list.classList.add('task-detail-scroll');
  const detail=el('li',{class:'task-detail stack'},field('Enunciado / task details',details),row(btn('Save details',async()=>{await saveDetails();toast('Task details saved.');},'secondary'),btn('Load saved details',()=>{const latest=getState().workspaces[wsid].tasks.find(t=>t.id===task.id);if(!latest)throw Error('This task was deleted.');draft.details=draft.base=latest.details;renderPanel();},'text-button',{title:'Replace this draft with the saved task details'}),btn(task.done?'Mark unfinished':'Mark complete',async()=>{await saveDetails();await save(s=>{const item=s.workspaces[wsid].tasks.find(t=>t.id===task.id);if(item)item.done=!item.done;});renderPanel();},'text-button')));
  list.append(detail);
  const attachmentSection=el('section',{class:'task-attachments section'},el('div',{class:'row between'},el('h3',{},'Photos'),el('span',{class:'help'},`${task.attachments.length}/4`)),help('JPG, PNG or WebP · up to 8 MB each. Keep instructions or examples here for your own reference. Photos stay on this device unless you explicitly include them in an AI request.'));
  const upload=input('',{type:'file',accept:'image/jpeg,image/png,image/webp',multiple:true,'aria-label':'Attach task photos',disabled:task.attachments.length>=4,onchange:run(async e=>{
    const files=[...e.target.files];if(!files.length)return;if(task.attachments.length+files.length>4)throw Error('Attach up to four photos to a task.');
    await saveDetails();try{for(const file of files)await putTaskAttachment(wsid,task.id,file);toast('Photos attached.');}finally{renderPanel();}
  })});attachmentSection.append(field('Attach photos',upload));
  const gallery=el('div',{class:'task-photo-grid'});attachmentSection.append(gallery);
  for(const image of task.attachments){
    const thumbnail=el('img',{alt:image.name,loading:'lazy'});
    getTaskAttachment(image.id).then(blob=>{if(blob&&thumbnail.isConnected){const url=URL.createObjectURL(blob);thumbnail.onload=thumbnail.onerror=()=>URL.revokeObjectURL(url);thumbnail.src=url;}}).catch(()=>{});
    gallery.append(el('article',{class:'task-photo'},thumbnail,el('span',{title:image.name},image.name),row(btn('View',()=>openReferencePhoto(image),'text-button',{'aria-label':`View photo ${image.name}`}),btn('Download',async()=>{const blob=await getTaskAttachment(image.id);if(!blob)throw Error('This photo is unavailable.');const url=URL.createObjectURL(blob);el('a',{href:url,download:image.name}).click();setTimeout(()=>URL.revokeObjectURL(url),2000);},'text-button',{'aria-label':`Download photo ${image.name}`}),btn('Remove',async()=>{await saveDetails();await removeTaskAttachment(wsid,task.id,image.id);renderPanel();},'text-button danger',{'aria-label':`Remove photo ${image.name}`}))));
  }
  renderTaskExtras(detail,task,taskToolsContext(wsid));detail.append(attachmentSection);
  const instruction=select(draft.instruction,[['Guíame con pistas para que pueda resolver esta tarea por mi cuenta. No des la solución completa.','Give me hints'],['Explica los conceptos de esta tarea con un ejemplo parecido, sin resolver mi ejercicio.','Explain the concepts'],['Divide esta tarea en un plan de estudio con pasos concretos.','Make a study plan'],['Hazme preguntas cortas sobre esta tarea para comprobar lo que entiendo.','Quiz me']],e=>{draft.instruction=e.target.value;},{'aria-label':'AI assistance mode'});
  const assistant=el('section',{class:'task-ai section'},el('div',{class:'row between'},el('h3',{},'Study guidance'),el('span',{class:'ai-label'},'GEMINI')),field('How can I help?',instruction),help('Get hints and explanations, or copy your prompt into ChatGPT. You choose when the task is complete.'),toggle('Include reference photos in this AI request',!!draft.includePhotos,value=>{draft.includePhotos=value;}));
  const start=async()=>{
    if(aiRequests.has(key))return;
    const controller=new AbortController(),mode=draft.instruction,includePhotos=!!draft.includePhotos;aiRequests.set(key,{controller});renderPanel();
    try{
      await saveDetails();bridgeConfig=await getBridgeConfig();if(!bridgeConfig.token)throw Error('Connect Sebams Bridge in Settings → AI first.');const current=getState().workspaces[wsid].tasks.find(t=>t.id===task.id);if(!current)throw Error('This task was deleted.');const snapshot=taskSnapshot(current);
      const images=await Promise.all((includePhotos?current.attachments:[]).map(async image=>{const blob=await getTaskAttachment(image.id);if(!blob)throw Error('A task photo is missing. Reattach it before sending.');return{name:image.name,type:image.type,data:await blobDataURL(blob)};}));
      const result=normalizeAIResult(await bridgeRequest('/solve',bridgeConfig.token,{body:{task:{text:current.text,priority:current.priority,dueDate:current.dueDate,list:current.list,details:current.details},instruction:mode,images},signal:controller.signal}));
      await save(s=>{if(controller.signal.aborted)throw Error('AI request cancelled.');const item=s.workspaces[wsid].tasks.find(t=>t.id===task.id);if(!item||taskSnapshot(item)!==snapshot)throw Error('This task changed while the AI was working. Send its latest version again.');item.ai=result;});toast('AI answer saved with your task.');
    }finally{aiRequests.delete(key);if(panelName==='tasks'&&taskDetailId===task.id)renderPanel();}
  };
  assistant.append(row(btn(request?'Working…':task.ai?'Ask again':'Ask AI',start,'primary',{disabled:!!request}),request?btn('Cancel request',()=>request.controller.abort(),'text-button'):btn('AI settings',()=>{settingsTab='ai';openPanel('settings');},'text-button')),row(btn('Copy for ChatGPT',async()=>{await navigator.clipboard.writeText(taskPrompt({...task,details:draft.details},draft.instruction));toast(task.attachments.length?'Prompt copied. Attach the downloaded photos in ChatGPT.':'Prompt copied. Paste it in ChatGPT.');},'secondary'),el('a',{href:'https://chatgpt.com/',target:'_blank',rel:'noopener noreferrer',class:'text-button'},'Open ChatGPT')));
  if(request)assistant.append(el('p',{role:'status',class:'help'},'Preparing guidance… You can keep browsing Sebams.'));
  if(task.ai)assistant.append(el('article',{class:'ai-answer'},el('div',{class:'row between'},el('h4',{},'Saved answer'),row(btn('Copy answer',async()=>{await navigator.clipboard.writeText(task.ai.text);toast('Answer copied.');},'text-button'),btn('Remove answer',async()=>{const previous=task.ai;await save(s=>{const item=s.workspaces[wsid].tasks.find(t=>t.id===task.id);if(!item||JSON.stringify(item.ai)!==JSON.stringify(previous))throw Error('The saved answer changed. Reopen this task.');item.ai=null;});renderPanel();toast('AI answer removed.',async()=>{await save(s=>{const item=s.workspaces[wsid].tasks.find(t=>t.id===task.id);if(!item||item.ai)throw Error('A newer answer cannot be replaced.');item.ai=previous;});renderPanel();});},'text-button danger',{disabled:!!request}))),el('div',{class:'ai-answer-text'},task.ai.text),el('p',{class:'help'},`${task.ai.model} · ${new Date(task.ai.createdAt).toLocaleString()}`)));
  detail.append(assistant);
}
function setPinned(links,id,pinned) {
  const link = links.find(item => item.id === id); if (!link) throw new Error('This link was removed in another tab.');
  if (pinned && !link.pinned && links.filter(item => item.pinned).length >= 8) throw new Error('Pin up to eight links. Unpin one to make room.');
  link.pinned = pinned;
}
async function removeShortcut(wsid,id){let removed,index;await save(s=>{const links=s.workspaces[wsid].links;index=links.findIndex(l=>l.id===id);if(index>=0)[removed]=links.splice(index,1);});renderPanel();if(removed)toast('Shortcut removed.',async()=>{await save(s=>{const links=s.workspaces[wsid].links;if(!links.some(l=>l.id===removed.id)){if(removed.pinned&&links.filter(l=>l.pinned).length>=8)removed.pinned=false;links.splice(Math.min(index,links.length),0,removed);}});renderPanel();});}
function renderLinks() {
  const w = workspace(), wsid = state.workspace;
  panel.classList.toggle('links-expanded',linksMode!=='browse');
  panel.classList.toggle('links-scrolling',linksMode!=='browse'||w.links.length>12);
  const setMode=mode=>{linksMode=mode;linksMenu=false;editingLink=null;renderPanel();if(mode==='add')body.querySelector('[aria-label="Link name"]').focus();};
  body.append(el('header',{class:'links-heading'},el('div',{},icon('external'),el('h2',{},'Links')),linksMode!=='browse'?ibtn('arrow','Back to links',()=>setMode('browse'),{class:'icon-button small links-back'}):null,ibtn('plus','New link',()=>setMode('add'),{class:'icon-button small'}),ibtn('more','Links options',e=>{linksMenu=!linksMenu;body.querySelector('.links-menu').hidden=!linksMenu;e.currentTarget.setAttribute('aria-expanded',String(linksMenu));},{class:'icon-button small','aria-expanded':String(linksMenu)})));
  body.append(el('section',{class:'links-menu','aria-label':'Links options',hidden:!linksMenu},btn('Manage links',()=>setMode('manage'),'text-button'),linksMode==='manage'?null:field('Workspace',select(state.workspace,[['personal','Personal'],['work','Work'],['study','Study']],async e=>{await save(s=>{s.workspace=e.target.value;});taskList=null;taskDateFilter='all';setMode('browse');},{'aria-label':'Workspace'}))));
  const groups = [...new Set(w.links.map(l => l.folder || 'Quick links'))];
  if(linksMode==='browse'){
    const navigation=el('nav',{class:'quick-links','aria-label':'Saved websites'});body.append(navigation);
    for(const group of groups){const section=el('section',{class:'quick-links-group'});if(group!=='Quick links')section.append(el('h3',{},group));for(const link of w.links.filter(link=>(link.folder||'Quick links')===group))section.append(el('div',{class:'quick-link-row',draggable:true,'data-sort-id':link.id},el('a',{href:link.url,class:'quick-link',draggable:false,rel:'noopener noreferrer','aria-label':link.title,title:link.title},siteIcon(link),el('span',{},link.title)),ibtn('more',`Reorder ${link.title}`,()=>{}, {class:'icon-button small shortcut-grip',title:'Drag to reorder · Alt+↑ / Alt+↓'}),ibtn('close',`Remove shortcut ${link.title} from Links`,()=>removeShortcut(wsid,link.id),{class:'icon-button small shortcut-delete'})));navigation.append(section);}
    bindSortable(navigation,{run,reorder:async(source,target,after)=>{await save(s=>placeLink(s.workspaces[wsid].links,source,target,after));renderPanel();},refreshContainer:()=>body.querySelector('.quick-links')});
    if(!w.links.length)navigation.append(el('div',{class:'links-empty'},icon('external'),el('p',{},'Your favorite places, one click away.'),btn('Add your first link',()=>setMode('add'),'text-button')));
    return;
  }
  if(linksMode==='manage'){
  body.append(row(el('span', { class: 'help' }, 'Workspace'), select(state.workspace, [['personal','Personal'],['work','Work'],['study','Study']], async e => { const id = e.target.value; await save(s => { s.workspace = id; }); taskList = null; taskDateFilter = 'all'; renderPanel(); }, { 'aria-label': 'Workspace' })), help('Pin a link to open it directly from your dashboard. Up to eight pins per workspace.'));
  for (const group of groups) {
    const section = el('section', { class: 'section' }, el('h3', {}, group)), list = el('ul', { class: 'list' });
    const matches = l => (l.folder || 'Quick links') === group, grouped = w.links.filter(matches); section.append(list); body.append(section);
    for (const link of grouped) list.append(el('li', { class: 'list-item' },
      el('a', { href: link.url, class: 'item-main', rel: 'noopener noreferrer' }, el('strong', {}, link.title), el('small', {}, new URL(link.url).hostname)),
      el('div', { class: 'item-actions' },
        ibtn('pin', `${link.pinned ? 'Unpin' : 'Pin'} ${link.title} ${link.pinned ? 'from' : 'to'} dashboard`, async () => { await save(s => setPinned(s.workspaces[wsid].links,link.id,!link.pinned)); renderPanel(); }, { 'aria-pressed': link.pinned, class: `icon-button${link.pinned ? ' active-pin' : ''}` }),
        ibtn('up', `Move ${link.title} up`, async () => { await save(s => moveItem(s.workspaces[wsid].links,link.id,-1,matches)); renderPanel(); }, { disabled: grouped[0]?.id === link.id }),
        ibtn('down', `Move ${link.title} down`, async () => { await save(s => moveItem(s.workspaces[wsid].links,link.id,1,matches)); renderPanel(); }, { disabled: grouped.at(-1)?.id === link.id }),
        ibtn('edit', `Edit ${link.title}`, () => { editingLink = link.id; renderPanel();body.querySelector('[aria-label="Link name"]').focus(); }),
        ibtn('trash', `Remove ${link.title}`, async () => {
          let removed, index; await save(s => { const items = s.workspaces[wsid].links; index = items.findIndex(l => l.id === link.id); if (index >= 0) [removed] = items.splice(index,1); }); renderPanel(); if (!removed) return;
          toast('Link removed.', async () => { await save(s => { const links = s.workspaces[wsid].links; if (!links.some(l => l.id === removed.id)) { if (removed.pinned && links.filter(l => l.pinned).length >= 8) removed.pinned = false; links.splice(Math.min(index,links.length),0,removed); } }); renderPanel(); });
        })
      )
    ));
  }
  }
  const existing = w.links.find(l => l.id === editingLink);
  const title = input(existing?.title || '', { placeholder: 'Name', maxlength: 60, required: true, 'aria-label': 'Link name' });
  const url = input(existing?.url || '', { placeholder: 'https://example.com', maxlength: 2000, required: true, 'aria-label': 'Website address' });
  const folder = input(existing?.folder || '', { placeholder: 'Folder (optional)', maxlength: 40, 'aria-label': 'Link folder' });
  const pin = input('', { type: 'checkbox', checked: !!existing?.pinned, 'aria-label': 'Pin to dashboard' });
  body.append(el('form', { class: 'add-form section', onsubmit: run(async e => {
    e.preventDefault(); const validURL = safeURL(url.value); if (!title.value.trim()) return;
    const values = { title: title.value.trim(), url: validURL, folder: folder.value.trim(), pinned: pin.checked };
    await save(s => {
      const links = s.workspaces[wsid].links;
      if (existing) {
        const item = itemConflict(links,existing.id,existing.title,'title');
        if (item.url !== existing.url || item.folder !== existing.folder || item.pinned !== existing.pinned) throw new Error('This link changed in another tab. Reopen it to edit.');
        setPinned(links,item.id,values.pinned); Object.assign(item,values);
      } else {
        if (values.pinned && links.filter(l => l.pinned).length >= 8) throw new Error('Pin up to eight links. Unpin one to make room.');
        links.push({ id: uid(), ...values });
      }
    }); editingLink = null;if(linksMode==='add')linksMode='browse';renderPanel();
  }) }, el('h3', {}, existing ? 'Edit link' : 'Add a favorite place'), row(title,folder), url, el('label', { class: 'toggle' }, el('span', {}, 'Pin to dashboard'),pin), row(el('button', { type: 'submit', class: 'primary' }, existing ? 'Save link' : 'Add link'), existing||linksMode==='add' ? btn('Cancel', () => { editingLink = null;if(linksMode==='add')linksMode='browse';renderPanel(); }) : null)));
}

function renderWeatherPanel() {
  const { city, cache, unit } = state.weather;
  if (city) { body.append(el('h3', {}, city.label || city.name)); if (cache && cache.cityKey === `${city.latitude},${city.longitude}`) body.append(el('div', { class: 'timer-display' }, `${Math.round(unit === 'F' ? cache.tempC * 9 / 5 + 32 : cache.tempC)}°`), help(`${weatherLabel(cache.code)} · Updated ${new Date(cache.updatedAt).toLocaleString()}`)); body.append(help(weatherBusy ? 'Getting the latest weather…' : weatherError ? `${weatherError} ${cache ? 'Showing the last saved reading.' : 'Try again when you are connected.'}` : 'Real weather from Open-Meteo.'), row(btn('Refresh weather', () => updateWeather(true), 'secondary', { disabled: weatherBusy }), btn('Turn weather off', async () => { await save(s => { s.weather.city = null; s.weather.cache = null; }); weatherError = ''; renderPanel(); }, 'text-button'))); }
  else body.append(help('Choose a city to enable weather. Sebams requests access only to Open-Meteo and saves the last reading for offline use.'));
  body.append(field('Temperature', select(unit, [['C', 'Celsius · °C'], ['F', 'Fahrenheit · °F']], async e => { await save(s => { s.weather.unit = e.target.value; }); renderPanel(); })));
  const query = input('', { placeholder: 'Search a city', required: true, maxlength: 100, 'aria-label': 'City name' });
  body.append(el('form', { class: 'row section', onsubmit: run(async e => { e.preventDefault(); const permission = await requestWeatherAccess(); if (!permission) throw new Error('Weather access was not enabled. You can try again whenever you like.'); query.disabled = true; try { weatherCities = await searchCities(query.value); renderPanel(); if (!weatherCities.length) toast('No cities found. Try another spelling or a nearby city.'); } finally { query.disabled = false; } }) }, query, el('button', { type: 'submit', class: 'primary' }, 'Find')));
  if (weatherCities.length) body.append(el('ul', { class: 'list' }, weatherCities.map(c => el('li', {}, btn(c.label, async () => { await save(s => { s.weather.city = c; s.weather.cache = null; }); weatherCities = []; renderPanel(); await updateWeather(true); }, 'secondary')))));
  body.append(btn('Use my location', async () => { const c = await locateCity(); await save(s => { s.weather.city = c; s.weather.cache = null; }); renderPanel(); await updateWeather(true); }, 'text-button'), help('Location is optional. Coordinates are sent to Open-Meteo for weather only. Manual city selection avoids location access.'), el('a', { href: 'https://open-meteo.com/', target: '_blank', rel: 'noopener noreferrer', class: 'text-button' }, 'Weather by Open-Meteo · CC BY 4.0'));
}
function syncTimerAlarm() { if (globalThis.chrome?.runtime?.id) chrome.runtime.sendMessage({ type: 'timer-sync' }).catch(() => {}); }
async function changeTimer(fn) { await save(s => { s.timer = fn(s.timer); }); syncTimerAlarm(); renderTimerDisplay(); if (panelName === 'timer') renderPanel(); }
function timerText(timer) { const seconds = Math.ceil(remaining(timer) / 1000); return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }
function renderTimerDisplay() { const t = state.timer; $('timer-pill').textContent = t.status === 'running' || t.status === 'paused' ? timerText(t) : 'Focus'; if ($('timer-display')) $('timer-display').textContent = timerText(t); }
function renderTimerPanel() {
  const t = state.timer;
  body.append(el('div', { class: 'timer-mode' }, t.status === 'complete' ? `Session complete · ${t.mode === 'work' ? 'Focus' : 'Break'} is ready` : t.mode === 'work' ? 'TIME TO FOCUS' : 'TIME TO RECHARGE'), el('div', { id: 'timer-display', class: 'timer-display', role: 'timer', 'aria-label': 'Time remaining' }, timerText(t)), el('div', { class: 'timer-controls' }, btn(t.status === 'running' ? 'Pause' : t.status === 'paused' ? 'Resume' : t.mode === 'work' ? 'Start focus' : 'Start break', () => changeTimer(t.status === 'running' ? pauseTimer : startTimer), 'primary'), btn('Reset', () => changeTimer(resetTimer)), btn('Switch session', () => changeTimer(advanceTimer), 'text-button')));
  body.append(el('div', { class: 'field-grid' }, field('Focus · minutes', input(t.workMinutes, { type: 'number', min: 1, max: 180, onchange: run(e => { const v = Number(e.target.value); if (!Number.isInteger(v) || v < 1 || v > 180) throw new Error('Choose 1–180 focus minutes.'); return changeTimer(timer => { timer.workMinutes = v; return timer.status === 'running' || timer.status === 'paused' ? timer : resetTimer(timer); }); }) })), field('Break · minutes', input(t.breakMinutes, { type: 'number', min: 1, max: 60, onchange: run(e => { const v = Number(e.target.value); if (!Number.isInteger(v) || v < 1 || v > 60) throw new Error('Choose 1–60 break minutes.'); return changeTimer(timer => { timer.breakMinutes = v; return timer.status === 'running' || timer.status === 'paused' ? timer : resetTimer(timer); }); }) }))));
  body.append(toggle('Gentle sound when a session ends', t.sound, value => save(s => { s.timer.sound = value; })), toggle('Focus view · hide secondary widgets', t.focusView, value => save(s => { s.timer.focusView = value; })), help('The timer follows elapsed time, even when a tab sleeps or the browser closes. Sessions wait for you before starting the next one. Sound plays only in an open, active Sebams tab.'));
}
function renderNotes() {
  noteWorkspace = state.workspace; notesBase = workspace().notesRevision; notesDirty = false;
  const textarea = el('textarea', { id: 'notes-text', maxlength: 20000, placeholder: 'An idea, a reminder, a little room to think…', 'aria-label': 'Quick notes', oninput: () => { notesDirty = true; $('notes-status').textContent = 'Saving…'; clearTimeout(noteTimer); noteTimer = setTimeout(run(flushNotes), 450); } }, workspace().notes);
  body.append(textarea, el('div', { class: 'row between' }, el('p', { id: 'notes-status', class: 'note-status', 'aria-live': 'polite' }, 'Saved on this device'), btn('Save now', flushNotes, 'text-button')), help('Notes are separate for each workspace. If another tab edits this note, Sebams keeps your draft and asks you to review it.'));
}
async function flushNotes() {
  clearTimeout(noteTimer); if (!notesDirty || !$('notes-text')) return;
  const text = $('notes-text').value, wsid = noteWorkspace, expected = notesBase;
  try { await save(s => { const w = s.workspaces[wsid]; if (w.notesRevision !== expected) throw new Error('Your note changed in another tab. Your draft is still here. Copy it before reopening notes.'); w.notes = text; w.notesRevision++; }); notesBase = state.workspaces[wsid].notesRevision; notesDirty = false; if ($('notes-status')) $('notes-status').textContent = 'Saved on this device'; }
  catch (e) {
    if ($('notes-status')) $('notes-status').textContent = e.message;
    if (!$('notes-conflict')) body.append(btn('Save draft & review', () => { downloadJSON({ workspace: wsid, draft: $('notes-text')?.value ?? text }, 'sebams-note-draft.json'); notesDirty = false; renderPanel(); }, 'primary', {id:'notes-conflict'}));
    toast(e.message); e.sebamsShown = true; throw e;
  }
}
function renderHabits() {
  const w = workspace(), wsid = state.workspace, day = localDay(), completed = w.habits.filter(h => h.days.includes(day)).length;
  body.append(el('p', { class: 'habit-progress' }, `${completed} of ${w.habits.length} gentle steps today`), help(completed && completed === w.habits.length ? 'You showed up for yourself today.' : 'Small things add up. Start wherever you are.'));
  body.append(el('ul', { class: 'list' }, w.habits.map(h => el('li', { class: 'list-item' }, input('', { type: 'checkbox', checked: h.days.includes(day), 'aria-label': `Complete ${h.text} today`, onchange: run(e => save(s => { const habit = s.workspaces[wsid].habits.find(item => item.id === h.id); if (habit) { habit.days = habit.days.filter(d => d !== day); if (e.target.checked) habit.days.push(day); habit.days = habit.days.slice(-366); } })) }), el('div', { class: 'item-main' }, el('strong', {}, h.text), el('small', {}, `${h.days.filter(d => Date.now() - new Date(`${d}T12:00:00`).getTime() < 7 * 86400000).length} days in the past week`)), ibtn('trash', `Remove habit ${h.text}`, async () => { await save(s => { s.workspaces[wsid].habits = s.workspaces[wsid].habits.filter(item => item.id !== h.id); }); renderPanel(); toast('Habit removed.', async () => { await save(s => s.workspaces[wsid].habits.push(h)); renderPanel(); }); })))));
  const text = input('', { placeholder: 'A small daily habit…', maxlength: 100, required: true, 'aria-label': 'New habit' }); body.append(el('form', { class: 'row', onsubmit: run(async e => { e.preventDefault(); if (!text.value.trim()) return; await save(s => { if (s.workspaces[wsid].habits.length >= 8) throw new Error('Keep it gentle: up to eight habits per workspace.'); s.workspaces[wsid].habits.push({ id: uid(), text: text.value.trim(), days: [] }); }); renderPanel(); }) }, text, el('button', { type: 'submit', class: 'primary' }, 'Add')));
}
async function archiveFocus() { await save(s => { if (s.focus.text) s.focusArchive.push({ ...s.focus }); s.focusArchive = s.focusArchive.slice(-366); s.focus = { text: '', day: localDay(), done: false, pending: false }; }); focusEditing = false; $('focus-input').value = ''; renderDashboard(); }
function installHandlers() {
  for (const name of ['settings', 'links', 'tasks', 'timer', 'notes', 'habits', 'weather']) $(`${name}-open`).addEventListener('click', () => openPanel(name));
  $('background-open').onclick = () => openPanel('backgrounds'); $('quote-open').onclick = () => openPanel('quotes'); $('panel-close').onclick = closePanel;
  $('background-favorite').onclick = run(() => save(s => toggleID(s.prefs.favoriteBackgrounds, selectedBackground.id)));
  $('background-next').onclick=run(nextBackground);
  $('quote-favorite').onclick = run(() => save(s => toggleID(s.prefs.favoriteQuotes, selectedQuote.id)));
  $('search-provider').onclick = () => { settingsTab = 'general'; openPanel('settings'); };
  $('search-form').onsubmit = run(e => { e.preventDefault(); const query = $('search-input').value.trim(); if (query) location.assign(SEARCH_PROVIDERS[state.prefs.searchProvider].url + encodeURIComponent(query)); });
  $('focus-input').addEventListener('focus', () => { if (!focusEditing) focusOriginal = state.focus.text; });
  $('focus-form').onsubmit = run(async e => { e.preventDefault(); const value = $('focus-input').value.trim(); if (!value) return; await save(s => { if (s.focus.text !== focusOriginal) throw new Error('Your focus changed in another tab. Reopen it before saving.'); s.focus = { text: value, day: localDay(), done: false, pending: false }; }); focusEditing = false; renderDashboard(); });
  $('focus-edit').onclick = () => { focusEditing = true; focusOriginal = state.focus.text; $('focus-input').value = state.focus.text; renderDashboard(); $('focus-input').focus(); };
  $('focus-input').addEventListener('keydown', e => { if (e.key === 'Escape') { focusEditing = false; $('focus-input').value = ''; renderDashboard(); $('focus-edit').focus(); } });
  $('focus-complete').onclick = run(() => save(s => { s.focus.done = !s.focus.done; s.focus.pending = false; }));
  $('focus-archive').onclick = run(archiveFocus); $('focus-old-archive').onclick = run(archiveFocus);
  $('focus-carry').onclick = run(() => save(s => { s.focus.day = localDay(); s.focus.pending = false; }));
  $('exit-focus').onclick = run(() => save(s => { s.timer.focusView = false; }));
  $('welcome-form').onsubmit = run(async e => { e.preventDefault(); await save(s => { s.prefs.name = $('welcome-name').value.trim(); s.onboarded = true; }); toast('Welcome home. Your space is ready.');await reminderInbox?.show(); });
  $('welcome-skip').onclick = run(async()=>{await save(s => { s.onboarded = true; });await reminderInbox?.show();});
  $('toast-close').onclick = () => { $('toast').hidden = true; };
  document.addEventListener('visibilitychange', () => { if (document.hidden && notesDirty) run(flushNotes)(); if (!document.hidden){run(tick)();run(()=>reminderInbox?.show())();} });
  window.addEventListener('focus',run(()=>reminderInbox?.show()));
  window.addEventListener('online', () => updateWeather());
}
async function tick() {
  if (dashboardDay !== localDay()) renderDashboard();
  else if(rotationSlot!==backgroundRotationSlot())run(renderBackground)();
  renderClock(); renderTimerDisplay();refreshTaskClock(state);
  if (state.focus.day !== localDay() && !state.focus.pending || state.timer.status === 'running' && remaining(state.timer) === 0) {
    await save(s => { rollover(s); s.timer = reconcileTimer(s.timer); }); syncTimerAlarm();
  }
  if (state.timer.completedAt && state.timer.completedAt !== lastCompletedAt) {
    const completed = state.timer.completedAt; if (lastCompletedAt !== null && Date.now() - completed < 10000 && document.visibilityState === 'visible') {
      toast('Session complete. Take a breath. Your next session is ready.');
      if (state.timer.sound && navigator.locks) navigator.locks.request(`sebams-chime-${completed}`, { ifAvailable: true }, async lock => { if (!lock) return; const context = new AudioContext(); const oscillator = context.createOscillator(), gain = context.createGain(); oscillator.type = 'sine'; oscillator.frequency.value = 660; gain.gain.setValueAtTime(.04, context.currentTime); gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .8); oscillator.connect(gain).connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + .8); setTimeout(() => context.close(), 1000); await new Promise(resolve => setTimeout(resolve, 1500)); }).catch(() => {});
    } lastCompletedAt = completed;
  }
}
async function boot() {
  state = await initStore(); await save(s => { rollover(s); s.timer = reconcileTimer(s.timer);if(s.prefs.panelBlur>0){s.prefs.panelBlur=0;s.prefs.panelOpacity=Math.max(s.prefs.panelOpacity,88);} });
  bridgeConfig=await getBridgeConfig();
  photoAccess=await hasPhotoAccess();
  globalThis.chrome?.permissions?.onRemoved?.addListener(()=>{hasPhotoAccess().then(access=>{photoAccess=access;if(panelName==='backgrounds')renderPanel();}).catch(()=>{});});
  lastCompletedAt = state.timer.completedAt || 0; installHandlers();installCommands();
  reminderInbox=installReminderInbox({getState:()=>state,save,run,toast,openTask:async(wsid,id)=>{await save(s=>{s.workspace=wsid;});await openTaskById(id);},canShow:()=>state.onboarded&&!document.hidden&&!state.timer.focusView&&!focusEditing&&!notesDirty&&!aiRequests.size&&![...taskDrafts.values()].some(d=>d.details!==d.base)&&!document.querySelector('dialog[open]')&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)});
  subscribe(next => { state = next; syncTaskAlarm();renderDashboard(); if (panelName && panel.open && !notesDirty && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) renderPanel(); });
  renderDashboard(); syncTimerAlarm();syncTaskAlarm(); updateWeather(); setInterval(run(tick), 1000); setInterval(() => updateWeather(), 30 * 60 * 1000);
  syncBridgeTasks();setInterval(syncBridgeTasks,10000);
  const deepLink=new URLSearchParams(location.search);if(deepLink.has('task')){const wsid=deepLink.get('workspace');if(['personal','work','study'].includes(wsid))await save(s=>{s.workspace=wsid;});await openTaskById(deepLink.get('task'));}
  else await reminderInbox.show();
  pruneTaskAttachments().catch(()=>{});setInterval(()=>pruneTaskAttachments().catch(()=>{}),60000);
}
boot().catch(error => { toast(`Sebams could not open local storage. ${error.message} Check available disk space and reload this tab.`); $('greeting').textContent = 'A little space to breathe.'; });


