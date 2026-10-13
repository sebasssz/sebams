import {env} from 'cloudflare:workers';
import {requireChatGPTUser} from '../chatgpt-auth';
import {taskService} from '../../lib/task-service.js';
import Connection from '../connection';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const params=await searchParams,query=new URLSearchParams();for(const key of ['extension','nonce','auto'])if(typeof params[key]==='string')query.set(key,params[key] as string);const user=await requireChatGPTUser('/connect?'+query);const s=await taskService(env.DB,user.userId).snapshot();return <Connection userId={user.userId} initialTasks={s.records.filter((r:any)=>r.value?.type==='task'&&!r.value.done).map((r:any)=>r.value)} lastSync={s.lastSync} timezone={s.timezone} extension={query.get('extension')||''} nonce={query.get('nonce')||''} automatic={query.get('auto')==='1'}/>;}
