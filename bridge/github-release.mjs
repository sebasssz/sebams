import {createHash} from 'node:crypto';
import {PublicError} from './core.mjs';
const fail=(message,status=400)=>{throw new PublicError(message,status);};
export function normalizeRepository(value){
  if(typeof value!=='string'||value.length>250)fail('Use a public GitHub repository URL or owner/repository.');
  let name=value.trim();if(!name)return '';
  if(name.startsWith('https://')){let url;try{url=new URL(name);}catch{fail('Use a public GitHub repository URL or owner/repository.');}if(url.hostname!=='github.com'||url.username||url.password||url.port||url.search||url.hash)fail('Use a public GitHub repository URL or owner/repository.');name=url.pathname.replace(/^\/|\/$/g,'');}
  name=name.replace(/\.git$/,'');
  if(!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?\/[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(name))fail('Use a public GitHub repository URL or owner/repository.');return name;
}
async function download(url,{fetchImpl,signal,maxBytes,api=false}){
  for(let hop=0;hop<4;hop++){
    const response=await fetchImpl(url,{signal,redirect:'manual',headers:api?{'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'Sebams-Bridge'}:{'Accept':'application/octet-stream'}});
    if([301,302,303,307,308].includes(response.status)){
      const next=new URL(response.headers.get('location')||'',url);await response.body?.cancel();
      if(api||next.protocol!=='https:'||next.username||next.password||next.port||!['release-assets.githubusercontent.com','objects.githubusercontent.com'].includes(next.hostname))fail('GitHub returned an unexpected download address.');url=next.href;continue;
    }
    if(response.status===404)fail('No public release was found. Publish a stable GitHub Release with sebams-update.json attached.',404);
    if([403,429].includes(response.status))fail('GitHub has temporarily limited update checks. Try again later.',503);
    if(!response.ok)fail('GitHub could not provide this release. Try again later.',503);
    if(Number(response.headers.get('content-length'))>maxBytes){await response.body?.cancel();fail('The GitHub release is too large.');}
    const chunks=[];let bytes=0;const reader=response.body?.getReader();if(!reader)fail('GitHub returned an empty download.');
    try{while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.length;if(bytes>maxBytes)fail('The GitHub release is too large.');chunks.push(Buffer.from(part.value));}}catch(e){await reader.cancel().catch(()=>{});throw e;}finally{reader.releaseLock();}
    return Buffer.concat(chunks);
  }fail('GitHub redirected the download too many times.');
}
export async function fetchGithubRelease(repository,{fetchImpl=fetch}={}){
  const repo=normalizeRepository(repository),signal=AbortSignal.timeout(20000);
  try{
    const metadata=await download('https://api.github.com/repos/'+repo+'/releases/latest',{fetchImpl,signal,maxBytes:1000000,api:true});
    let release;try{release=JSON.parse(metadata);}catch{fail('GitHub returned invalid release information.');}
    const assets=release?.assets?.filter(a=>a.name==='sebams-update.json');
    if(release?.draft||release?.prerelease||!assets||assets.length!==1||typeof release.tag_name!=='string')fail('Attach one sebams-update.json file to a stable GitHub Release.');
    const asset=assets[0];if(!Number.isInteger(asset.size)||asset.size<1||asset.size>36*1024*1024)fail('The GitHub update file is invalid or too large.');
    let url;try{url=new URL(asset.browser_download_url);}catch{fail('GitHub returned an invalid download address.');}
    const expected='/'+repo+'/releases/download/'+encodeURIComponent(release.tag_name)+'/sebams-update.json';
    if(url.protocol!=='https:'||url.hostname!=='github.com'||url.username||url.password||url.port||url.search||url.hash||url.pathname.toLowerCase()!==expected.toLowerCase())fail('The update asset belongs to a different repository.');
    const bytes=await download(url.href,{fetchImpl,signal,maxBytes:36*1024*1024});
    if(bytes.length!==asset.size)fail('The GitHub download is incomplete. Try again.');
    if(asset.digest&&asset.digest!=='sha256:'+createHash('sha256').update(bytes).digest('hex'))fail('The GitHub download failed its integrity check.');
    let bundle;try{bundle=JSON.parse(bytes);}catch{fail('The GitHub update file is unreadable.');}
    if(!bundle||release.tag_name!=='v'+bundle.version&&release.tag_name!==bundle.version)fail('The GitHub release tag does not match its update file.');
    return {bundle,bytes};
  }catch(error){if(error instanceof PublicError)throw error;fail('Could not reach GitHub. Check this PC’s internet connection and try again.',503);}
}
