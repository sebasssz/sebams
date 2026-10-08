import {readFile,lstat,realpath,mkdir,writeFile,rename,rm} from 'node:fs/promises';
import {resolve,dirname,join,relative,isAbsolute,sep,parse} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {PublicError} from './core.mjs';
import {fetchGithubRelease,normalizeRepository} from './github-release.mjs';

const fail=(message,status=400)=>{throw new PublicError(message,status);};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function compareVersions(a,b){
  const parts=v=>{if(typeof v!=='string'||!/^\d+(\.\d+){0,3}$/.test(v))fail('Invalid extension version.');const n=v.split('.').map(Number);if(n.some(x=>x>65535))fail('Invalid extension version.');return [...n,...Array(4-n.length).fill(0)];};
  const x=parts(a),y=parts(b);for(let i=0;i<4;i++)if(x[i]!==y[i])return Math.sign(x[i]-y[i]);return 0;
}
const inside=(base,path)=>{const r=relative(base,path);return r!==''&&!r.startsWith('..'+sep)&&r!=='..'&&!isAbsolute(r);};
function safeFile(value){
  if(typeof value!=='string'||value.length>240||!value.split('/').every(p=>/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(p)&&!p.endsWith('.')&&!/^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i.test(p))||/(^|\/)(data|node_modules|\.git)(\/|$)/i.test(value))fail('The update contains an unsafe file path.');
  return value;
}
async function regularFile(base,file){const path=resolve(base,safeFile(file));if(!inside(base,path))fail('The update contains an unsafe file path.');let cursor=base;for(const part of file.split('/')){cursor=join(cursor,part);const s=await lstat(cursor);if(s.isSymbolicLink())fail('Update files cannot use symbolic links.');}const s=await lstat(path);if(!s.isFile())fail('The update contains an invalid file.');return path;}
async function readJSON(path){try{return JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code==='ENOENT')throw e;fail('The local update information is unreadable.');}}

export function createUpdater({configurationFile,renameFile=rename,fetchImpl=fetch}={}){
  let installing=false;
  async function configuration(){
    if(!configurationFile)return null;
    let c;try{c=await readJSON(configurationFile);}catch(e){if(e.code==='ENOENT')return null;throw e;}
    if(!c||typeof c.extensionDirectory!=='string'||typeof c.releaseDirectory!=='string'||!isAbsolute(c.extensionDirectory)||!isAbsolute(c.releaseDirectory))fail('Configure the installed extension and local release folders in Sebams Bridge.',503);
    const target=resolve(c.extensionDirectory),release=resolve(c.releaseDirectory);
    if(target===parse(target).root||target===release||inside(target,release)||inside(release,target))fail('The update folders must be separate.',503);
    // Only an existing extension folder explicitly configured on this PC is replaceable.
    if((await lstat(target)).isSymbolicLink()||(await realpath(target))!==target||!(await lstat(target)).isDirectory())fail('The installed extension folder is invalid.',503);
    if((await realpath(release))!==release||(await lstat(release)).isSymbolicLink())fail('The release folder cannot use symbolic links.',503);
    const manifest=await readJSON(join(target,'manifest.json'));
    if(manifest.manifest_version!==3||manifest.name!=='Sebams — A little space to focus')fail('The configured folder is not the Sebams extension.',503);
    return {target,release,manifest,repository:normalizeRepository(c.githubRepository||''),raw:c};
  }
  async function load(c){
    if(c.repository){
      const {bundle:m,bytes:metadata}=await fetchGithubRelease(c.repository,{fetchImpl});
      return validateRelease(m,metadata,c,true);
    }
    let metadata;try{metadata=await readFile(await regularFile(c.release,'release.json'));}catch(e){if(e.code==='ENOENT')fail('No local release is prepared yet.',404);throw e;}
    if(metadata.length>200000)fail('The update information is too large.');
    let m;try{m=JSON.parse(metadata);}catch{fail('The local update information is unreadable.');}
    return validateRelease(m,metadata,c,false);
  }
  async function validateRelease(m,metadata,c,remote){
    compareVersions(m?.version,'0');
    if(m.format!==(remote?'sebams-github-release':'sebams-local-release')||!Array.isArray(m.files)||!m.files.length||m.files.length>500||typeof m.notes!=='string'||m.notes.length>2000)fail('The release is invalid.');
    const names=new Set(),files=[];let total=0;
    for(const f of m.files){if(!f||typeof f!=='object')fail('The release contains invalid files.');safeFile(f.path);if(names.has(f.path.toLowerCase())||!Number.isInteger(f.size)||f.size<0||f.size>10*1024*1024||!/^[a-f0-9]{64}$/.test(f.sha256))fail('The release contains invalid files.');names.add(f.path.toLowerCase());total+=f.size;if(total>25*1024*1024)fail('The release is too large.');let bytes;
      if(remote){if(typeof f.data!=='string'||f.data.length!==4*Math.ceil(f.size/3)||!/^[A-Za-z0-9+/]*={0,2}$/.test(f.data))fail('The update contains invalid file data.');bytes=Buffer.from(f.data,'base64');if(bytes.toString('base64')!==f.data)fail('The update contains invalid file data.');}
      else{const path=await regularFile(c.release,'files/'+f.path);const stat=await lstat(path);if(stat.size!==f.size)fail('The update failed its integrity check. Prepare the release again.');bytes=await readFile(path);}
      if(bytes.length!==f.size||hash(bytes)!==f.sha256)fail('The update failed its integrity check. Prepare the release again.');files.push({...f,bytes});}
    const manifestFile=files.find(f=>f.path==='manifest.json');let manifest;try{manifest=JSON.parse(manifestFile?.bytes);}catch{fail('The release manifest is invalid.');}
    if(!manifest||manifest.name!==c.manifest.name||manifest.manifest_version!==3||manifest.version!==m.version)fail('This update is not a compatible Sebams release.');
    return {version:m.version,notes:m.notes,fingerprint:hash(metadata),files};
  }
  async function check(current){
    compareVersions(current,'0');const c=await configuration();if(!c)return {configured:false,current,available:false,message:'Updates are not configured. Run SetupUpdates.cmd in Sebams Bridge on this PC.'};const release=await load(c);
    return {configured:true,source:c.repository?'github':'local',repository:c.repository,current,installed:c.manifest.version,version:release.version,available:compareVersions(release.version,current)>0,needsReload:compareVersions(c.manifest.version,current)>0,notes:release.notes,fingerprint:release.fingerprint};
  }
  async function install(request){
    if(installing)fail('An update is already being installed.',409);installing=true;let stage;
    try{
      const c=await configuration();if(!c)fail('Local updates are not configured.',503);const release=await load(c);
      if(request?.version!==release.version||request?.fingerprint!==release.fingerprint)fail('The prepared release changed. Check for updates again.',409);
      if(compareVersions(release.version,c.manifest.version)<=0)fail('This version is already installed. Reload Sebams to use it.',409);
      const parent=dirname(c.target);stage=join(parent,'.sebams-update-'+randomUUID());const backupRoot=join(parent,'Sebams-version-backups');
      // Verify every computed move/delete target stays in the configured extension's parent.
      if(!inside(parent,stage)||!inside(parent,backupRoot))fail('Invalid update destination.');
      await mkdir(backupRoot,{recursive:true});if((await realpath(backupRoot))!==backupRoot)fail('The backup folder cannot use symbolic links.');
      const backup=join(backupRoot,c.manifest.version+'-'+randomUUID());if(!inside(backupRoot,backup))fail('Invalid backup destination.');
      await mkdir(stage);for(const f of release.files){const destination=resolve(stage,f.path);if(!inside(stage,destination))fail('Invalid update destination.');await mkdir(dirname(destination),{recursive:true});await writeFile(destination,f.bytes,{flag:'wx'});}
      await renameFile(c.target,backup);
      try{await renameFile(stage,c.target);stage=null;}catch(e){await renameFile(backup,c.target);throw e;}
      return {ok:true,version:release.version,backupCreated:true,reload:true};
    }finally{
      if(stage){const c=await configuration().catch(()=>null);if(c&&inside(dirname(c.target),stage)&&stage.startsWith(join(dirname(c.target),'.sebams-update-')))await rm(stage,{recursive:true,force:true});}installing=false;
    }
  }
  async function source(){const c=await configuration();return {configured:!!c,source:c?.repository?'github':'local',repository:c?.repository||''};}
  async function setSource(value){
    if(installing)fail('Wait for the current installation to finish.',409);
    if(!value||Object.keys(value).some(k=>k!=='repository'))fail('Only the GitHub repository can be changed here.');
    const repository=normalizeRepository(value.repository),c=await configuration();if(!c)fail('Run SetupUpdates.cmd in Sebams Bridge to choose this PC’s extension folder first.',503);
    const temporary=configurationFile+'.'+randomUUID()+'.tmp';try{await writeFile(temporary,JSON.stringify({...c.raw,githubRepository:repository},null,2)+'\n',{flag:'wx'});await rename(temporary,configurationFile);}finally{await rm(temporary,{force:true});}
    return {configured:true,source:repository?'github':'local',repository};
  }
  return {check,install,source,setSource};
}
