export const BRIDGE_URL = 'http://127.0.0.1:8787';
export const BRIDGE_ORIGIN = 'http://127.0.0.1/*';
export const hasBridgeAccess = async () => !globalThis.chrome?.runtime?.id || await chrome.permissions.contains({origins:[BRIDGE_ORIGIN]});
export const requestBridgeAccess = async () => !globalThis.chrome?.runtime?.id || await chrome.permissions.request({origins:[BRIDGE_ORIGIN]});

export async function bridgeRequest(path, token, {body,signal,fetcher=fetch,timeout=150000}={}) {
  if (!token) throw Error('Connect Sebams Bridge in Settings → AI first.');
  if (!await hasBridgeAccess()) throw Error('Enable the local connection in Settings → AI.');
  const controller=new AbortController(), abort=()=>controller.abort();
  signal?.addEventListener('abort',abort,{once:true});
  if(signal?.aborted)controller.abort();
  const timer=setTimeout(abort,timeout);
  try {
    const response=await fetcher(BRIDGE_URL+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer',redirect:'error'});
    const result=await response.json();
    if(!response.ok)throw Error(typeof result.error==='string'?result.error.slice(0,300):'The connection could not complete this request.');
    return result;
  } catch(error) {
    if(controller.signal.aborted)throw Error(signal?.aborted?'AI request cancelled.':'The AI took too long. Try again.');
    if(error instanceof TypeError)throw Error('Start Sebams Bridge on your PC, then try again.');
    if(error instanceof SyntaxError)throw Error('Sebams Bridge returned an unreadable reply. Restart the Bridge and try again.');
    throw error;
  } finally {clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
export function taskPrompt(task,instruction='Guíame con pistas para que pueda resolver esta tarea por mi cuenta. No des la solución completa.') {
  return `${instruction}\n\nTarea: ${task.text}\nLista: ${task.list}\nPrioridad: ${task.priority}\nFecha límite: ${task.dueDate||'Sin fecha'}${task.details?'\n\nEnunciado y detalles:\n'+task.details:''}${task.attachments?.length?'\n\nFotos para adjuntar en ChatGPT: '+task.attachments.map(image=>image.name).join(', '):''}`;
}
export function blobDataURL(blob) {
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('A task photo could not be read.'));reader.readAsDataURL(blob);});
}
export function normalizeAIResult(result) {
  if(!result||typeof result.text!=='string'||!result.text.trim()||result.text.length>20000||typeof result.model!=='string'||!result.model.trim()||result.model.length>100||!Number.isFinite(result.createdAt)||result.createdAt<0)throw Error('The AI returned an unavailable response.');
  return {text:result.text,model:result.model,createdAt:result.createdAt};
}
