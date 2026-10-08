import { initStore, getState, getBridgeConfig, reconcileBridgeTasks } from './store.js';
import { bridgeRequest, hasBridgeAccess } from './ai.js';

export async function receiveBridgeTasks() {
  await initStore();
  const {token}=await getBridgeConfig();
  if(!token||!await hasBridgeAccess())return {added:0,acceptedIds:[]};
  await bridgeRequest('/workspace',token,{body:{workspaces:Object.entries(getState().workspaces).map(([id,w])=>({id,lists:w.lists}))},timeout:6000});
  const pending=await bridgeRequest('/tasks/pending',token,{timeout:6000});
  if((await getBridgeConfig()).token!==token||!pending.tasks?.length)return {added:0,acceptedIds:[]};
  const result=await reconcileBridgeTasks(pending.tasks);
  if(result.acceptedIds.length)await bridgeRequest('/tasks/ack',token,{body:{ids:result.acceptedIds},timeout:6000});
  return result;
}
