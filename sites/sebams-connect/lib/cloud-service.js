import {reject,sha} from './account-service.js';
import {validateState,taskAttachmentMetadata,IMAGE_TYPES} from './personal/model.js';
const MAX_BYTES=64*1024*1024;
export function cloudService(db,bucket,account,{now=()=>Date.now()}={}){
 const one=(sql,...args)=>db.prepare(sql).bind(...args).first(),files=state=>[...state.images,...taskAttachmentMetadata(state)];
 async function get(){const row=await one('SELECT state,revision,updated_at FROM sebams_cloud WHERE account=?',account.id),state=row?.state?JSON.parse(row.state):null;return {revision:row?.revision||0,updatedAt:row?.updated_at||0,state};}
 async function put(input){if(!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0)reject('Invalid cloud revision.');let state;try{state=validateState(structuredClone(input.state));}catch(error){reject(error.message);}
  const allFiles=files(state);if(new Set(allFiles.map(f=>f.id)).size!==allFiles.length)reject('Two photos share the same identity. Reattach one before syncing.');
  const current=await get();if(current.revision!==input.expectedRevision)return {ok:false,conflict:true,...current};
  for(const file of files(state)){const row=await one('SELECT size,type FROM sebams_files WHERE account=? AND id=?',account.id,file.id);if(!row||row.size!==file.size||row.type!==file.type||!bucket||!await (bucket.head?bucket.head('accounts/'+account.id+'/'+file.id):bucket.get('accounts/'+account.id+'/'+file.id)))reject('A photo is not uploaded yet. Sync again before saving.',409);}
  await db.prepare('INSERT INTO sebams_cloud(account) VALUES (?) ON CONFLICT(account) DO NOTHING').bind(account.id).run();
  const updated=await one('UPDATE sebams_cloud SET state=?,revision=revision+1,updated_at=? WHERE account=? AND revision=? RETURNING revision',JSON.stringify(state),now(),account.id,input.expectedRevision);if(!updated)return {ok:false,conflict:true,...await get()};return {ok:true,...await get()};
 }
 async function fileInfo(id){if(typeof id!=='string'||!/^[A-Za-z0-9_.-]{1,100}$/.test(id))reject('Invalid photo identity.');return one('SELECT * FROM sebams_files WHERE account=? AND id=?',account.id,id);}
 async function upload(id,type,bytes){if(!bucket)reject('Cloud photo storage is not available yet.',503);await fileInfo(id);if(!IMAGE_TYPES.includes(type)||bytes.byteLength<1||bytes.byteLength>8*1024*1024)reject('Choose a JPG, PNG or WebP photo smaller than 8 MB.');const b=new Uint8Array(bytes),magic=type==='image/png'?b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71:type==='image/jpeg'?b[0]===255&&b[1]===216&&b[2]===255:String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP';if(!magic)reject('This photo does not match its file type.');const digest=await sha(bytes),existing=await fileInfo(id);if(existing){if(existing.digest!==digest||existing.size!==bytes.byteLength||existing.type!==type)reject('A different photo already uses this identity.',409);if(!await (bucket.head?bucket.head('accounts/'+account.id+'/'+id):bucket.get('accounts/'+account.id+'/'+id)))await bucket.put('accounts/'+account.id+'/'+id,bytes,{httpMetadata:{contentType:type}});return {ok:true};}
  const row=await one('INSERT INTO sebams_files(account,id,digest,type,size,created_at) SELECT ?,?,?,?,?,? WHERE (SELECT COALESCE(SUM(size),0) FROM sebams_files WHERE account=?) + ? <= ? AND (SELECT COUNT(*) FROM sebams_files WHERE account=?)<3000 ON CONFLICT(account,id) DO NOTHING RETURNING id',account.id,id,digest,type,bytes.byteLength,now(),account.id,bytes.byteLength,MAX_BYTES,account.id);
  if(!row){const raced=await fileInfo(id);if(raced?.digest===digest)return {ok:true};reject('Cloud photo storage is full (64 MB per account).',413);}
  try{await bucket.put('accounts/'+account.id+'/'+id,bytes,{httpMetadata:{contentType:type}});}catch{await db.prepare('DELETE FROM sebams_files WHERE account=? AND id=? AND digest=?').bind(account.id,id,digest).run();reject('This photo could not be uploaded. Please try again.',503);}return {ok:true};
 }
 async function download(id){if(!bucket)reject('Cloud photo storage is not available yet.',503);const metadata=await fileInfo(id);if(!metadata)reject('This photo is unavailable.',404);const object=await bucket.get('accounts/'+account.id+'/'+id);if(!object)reject('This photo is not uploaded yet. Please retry shortly.',409);return {metadata,object};}
 return {get,put,upload,download};
}
