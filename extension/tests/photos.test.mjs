import {stripProduct} from './fixtures.mjs';
import {createTask} from '../lib/planner.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createDefaultState,upgradeState,validateState,validateBackup,APPEARANCE_DEFAULTS} from '../lib/model.js';
import {normalizePhoto,photoURL,fetchPhotoCollection,fetchPhotoBlob,rotationIndex,NATURE_SCENES,chooseRandomPhoto} from '../lib/photos.js';
import {faviconURL} from '../lib/favicons.js';
const metadata=id=>({id,author:'Test photographer',width:2400,height:1600,url:'https://unsplash.com/photos/test-'+id});
test('random online choice avoids the current photo and covers the full remaining collection',()=>{const photos=['10','15','17'].map(id=>normalizePhoto(metadata(id)));assert.equal(chooseRandomPhoto(photos,'photo-10',()=>0).id,'photo-15');assert.equal(chooseRandomPhoto(photos,'photo-10',()=>.999).id,'photo-17');assert.equal(chooseRandomPhoto(photos,'alpine',()=>.999).id,'photo-17');assert.equal(chooseRandomPhoto([photos[0]],'photo-10',()=>0),photos[0]);assert.throws(()=>chooseRandomPhoto([]),/No online photos/);});
function replace(t,key,value){const descriptor=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});t.after(()=>descriptor?Object.defineProperty(globalThis,key,descriptor):delete globalThis[key]);}
test('version 2 upgrade retains dates, pins, favorites and notes without sharing the old snapshot',()=>{
  const old=createDefaultState();old.schemaVersion=2;delete old.photos;for(const key of Object.keys(APPEARANCE_DEFAULTS))delete old.prefs[key];old.workspaces.personal.links[0].pinned=true;old.workspaces.personal.notes='Existing note';old.workspaces.personal.tasks=[{id:'dated',text:'Keep my date',done:false,priority:'normal',list:'Inbox',dueDate:'2026-10-10'}];old.prefs.favoriteBackgrounds=['alpine'];
  stripProduct(old);const state=upgradeState(old);assert.equal(state.schemaVersion,6);assert.equal(old.schemaVersion,2);assert.equal(state.workspaces.personal.tasks[0].dueDate,'2026-10-10');assert.equal(state.workspaces.personal.links[0].pinned,true);assert.equal(state.workspaces.personal.notes,'Existing note');assert.deepEqual(state.prefs.favoriteBackgrounds,['alpine']);assert.equal(state.photos.enabled,false);assert.equal(state.prefs.panelOpacity,APPEARANCE_DEFAULTS.panelOpacity);assert.equal(validateBackup({format:'sebams-backup',version:1,state:old,images:[]}).state.schemaVersion,6);
});
test('photo metadata rejects unsafe credit links, mismatched IDs and invalid dimensions',()=>{
  const photo=normalizePhoto(metadata('10'),'Forest');assert.equal(photo.id,'photo-10');assert.equal(photoURL(photo),'https://picsum.photos/id/10/1920/1080.jpg');
  for(const value of [{...metadata('10'),url:'javascript:alert(1)'},{...metadata('10'),url:'https://evil.example/photos/x'},{...metadata('10'),url:'https://name:password@unsplash.com/photos/x'},{...metadata('10'),id:'../x'},{...metadata('10'),width:800},{...metadata('10'),height:NaN}])assert.throws(()=>normalizePhoto(value,'Forest'));
  const state=createDefaultState();state.photos.items=[photo];state.photos.items[0].id='photo-11';assert.throws(()=>validateState(state));
});
test('appearance and photo collection limits are strictly validated',()=>{
  for(const [key,value] of [['panelOpacity',10],['panelBlur',41],['backgroundBlur',13],['clockSize',121],['pinLabels','yes'],['onlineSiteIcons',1],['backgroundCadence','minute'],['backgroundOffset',-1]]){const state=createDefaultState();state.prefs[key]=value;assert.throws(()=>validateState(state));}
  const state=createDefaultState();state.photos.items=Array.from({length:25},(_,i)=>normalizePhoto(metadata(String(i)),'Photo'));assert.throws(()=>validateState(state));
});
test('collection caching avoids requests and refreshing limits concurrency while tolerating failed photos',async t=>{
  let calls=0,active=0,maximum=0;replace(t,'fetch',async url=>{calls++;active++;maximum=Math.max(maximum,active);await new Promise(r=>setTimeout(r,2));active--;const id=String(url).match(/id\/(\d+)/)[1];if(id==='15')return new Response('',{status:503});return Response.json(metadata(id));});
  const cached={enabled:true,updatedAt:Date.now(),items:[normalizePhoto(metadata('10'),'Forest')]};assert.equal(await fetchPhotoCollection(cached),cached);assert.equal(calls,0);
  const fresh=await fetchPhotoCollection(cached,true);assert.equal(calls,NATURE_SCENES.length);assert.equal(fresh.items.length,NATURE_SCENES.length-1);assert.ok(maximum<=3);
});
test('photos never send a network request before extension host access is granted',async t=>{
  let calls=0;replace(t,'chrome',{runtime:{id:'extension'},permissions:{contains:async()=>false}});replace(t,'fetch',async()=>{calls++;throw Error('Unexpected network');});await assert.rejects(fetchPhotoCollection(null,true));await assert.rejects(fetchPhotoBlob(normalizePhoto(metadata('10'),'Forest')),/Enable/);assert.equal(calls,0);
});
test('photo downloads omit credentials and referrer, enforce bytes and type, and report failures',async t=>{
  const photo=normalizePhoto(metadata('10'),'Forest');let options;replace(t,'fetch',async(_url,value)=>{options=value;return new Response(new Uint8Array([255,216,255]),{headers:{'content-type':'image/jpeg'}});});assert.equal((await fetchPhotoBlob(photo)).size,3);assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');
  globalThis.fetch=async()=>new Response('not a photo',{headers:{'content-type':'text/html'}});await assert.rejects(fetchPhotoBlob(photo),/could not/);globalThis.fetch=async()=>new Response('',{headers:{'content-type':'image/jpeg','content-length':String(5*1024*1024)}});await assert.rejects(fetchPhotoBlob(photo),/too large/);globalThis.fetch=async()=>{throw new TypeError('Offline');};await assert.rejects(fetchPhotoBlob(photo),/offline/);
});
test('rotation advances by local day, elapsed hour, or tab seed while offsets stay in bounds',()=>{
  const today=new Date(2026,9,2,12).getTime(),tomorrow=new Date(2026,9,3,12).getTime();assert.equal(rotationIndex(12,'daily',0,tomorrow),(rotationIndex(12,'daily',0,today)+1)%12);assert.equal(rotationIndex(12,'hourly',0,today+3600000),(rotationIndex(12,'hourly',0,today)+1)%12);assert.equal(rotationIndex(12,'tab',0,today,7),7);assert.equal(rotationIndex(12,'tab',1,today,11),0);assert.equal(rotationIndex(0,'daily',0,today),0);
});
test('favicon service receives only the hostname; cached mode uses the extension API and unsafe URLs fail',t=>{
  const url=new URL(faviconURL('https://www.roblox.com/games/123?private=secret#fragment'));assert.equal(url.hostname,'www.google.com');assert.equal(url.searchParams.get('domain'),'www.roblox.com');assert.ok(!url.href.includes('secret'));assert.ok(!url.href.includes('123'));replace(t,'chrome',{runtime:{id:'test',getURL:p=>'chrome-extension://test/'+p}});const local=new URL(faviconURL('https://youtube.com/watch?v=private',false));assert.equal(local.searchParams.get('pageUrl'),'https://youtube.com/');assert.throws(()=>faviconURL('javascript:alert(1)'));
});
