export const PHOTO_ORIGINS = ['https://picsum.photos/*','https://fastly.picsum.photos/*'];
export const NATURE_SCENES = [
  ['10','Quiet woodland'],['15','River through the forest'],['17','A path into the trees'],
  ['28','Forest light'],['29','Wild mountain country'],['37','Coastal air'],
  ['167','Autumn leaves'],['437','A quiet city corner'],['459','Golden meadow'],
  ['1015','Mountain waters'],['1018','Wide open valley'],['1039','Forest waterfall']
];
const isExtension = () => !!globalThis.chrome?.runtime?.id;
export const hasPhotoAccess = async () => !isExtension() || await chrome.permissions.contains({origins:PHOTO_ORIGINS});
export const requestPhotoAccess = async () => !isExtension() || await chrome.permissions.request({origins:PHOTO_ORIGINS});
export function normalizePhoto(value, title) {
  if(!value || !/^\d{1,5}$/.test(value.id) || typeof value.author!=='string' || !value.author.trim() || value.author.length>150 || !Number.isInteger(value.width) || !Number.isInteger(value.height) || value.width<1600 || value.height<900 || value.width>30000 || value.height>30000)throw Error('The photo service returned an unavailable image.');
  const source=new URL(value.url);
  if(source.protocol!=='https:' || source.hostname!=='unsplash.com' || !source.pathname.startsWith('/photos/') || source.username || source.password)throw Error('The photo service returned an invalid credit link.');
  return {id:'photo-'+value.id,photoId:value.id,title:title||'A new perspective',author:value.author,source:source.href,width:value.width,height:value.height};
}
export function photoURL(photo, thumbnail=false) {
  if(!/^\d{1,5}$/.test(photo.photoId))throw Error('Choose a valid photo.');
  return `https://picsum.photos/id/${photo.photoId}/${thumbnail?'360/225':'1920/1080'}.jpg`;
}
async function onlineRequest(url, read) {
  if(!await hasPhotoAccess())throw Error('Enable the online photo collection to load new photos.');
  const controller=new AbortController(), timeout=setTimeout(()=>controller.abort(),12000);
  try {const result=await fetch(url,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});if(!result.ok)throw Error('The photo service is temporarily unavailable.');return await read(result);}
  catch(error){if(error.name==='AbortError')throw Error('The photo service took too long to respond.');if(error instanceof TypeError)throw Error('New photos are unavailable while offline.');throw error;}
  finally{clearTimeout(timeout);}
}
export async function fetchPhotoCollection(cached=null, force=false) {
  if(!force && cached?.items?.length && Date.now()-cached.updatedAt>=0 && Date.now()-cached.updatedAt<7*86400000)return cached;
  // Three requests at a time; a failed item does not discard the rest of the collection.
  const items=[];
  for(let start=0;start<NATURE_SCENES.length;start+=3){
    const results=await Promise.allSettled(NATURE_SCENES.slice(start,start+3).map(async([id,title])=>{
      const data=await onlineRequest(`https://picsum.photos/id/${id}/info`,response=>response.json());
      if(data.id!==id)throw Error('The photo service returned a different image.');return normalizePhoto(data,title);
    }));
    for(const result of results)if(result.status==='fulfilled')items.push(result.value);
  }
  if(!items.length)throw Error('The collection could not refresh. Your saved scenes are still available.');
  return {enabled:true,updatedAt:Date.now(),items};
}
export async function fetchPhotoBlob(photo) {
  return onlineRequest(photoURL(photo),async response=>{
    const length=Number(response.headers.get('content-length'));
    if(length>4*1024*1024)throw Error('This photo is too large to save.');
    const blob=await response.blob();
    if(blob.type!=='image/jpeg' || !blob.size || blob.size>4*1024*1024)throw Error('This photo could not be used as a background.');
    return blob;
  });
}
export function rotationIndex(length, cadence, offset=0, now=Date.now(), tabSeed=0) {
  const date=new Date(now);
  const slot=cadence==='tab'?tabSeed:cadence==='hourly'?Math.floor(now/3600000):Math.floor(new Date(date.getFullYear(),date.getMonth(),date.getDate(),12).getTime()/86400000);
  return ((slot+offset)%Math.max(length,1)+Math.max(length,1))%Math.max(length,1);
}
export function chooseRandomPhoto(items,currentId='',random=Math.random){
  if(!items.length)throw Error('No online photos are available. Try refreshing the collection.');
  const alternatives=items.filter(photo=>photo.id!==currentId),pool=alternatives.length?alternatives:items;
  return pool[Math.floor(random()*pool.length)];
}
