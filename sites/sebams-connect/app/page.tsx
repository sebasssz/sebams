import {env} from 'cloudflare:workers';
import {requireChatGPTUser} from './chatgpt-auth';
import {taskService} from '../lib/task-service.js';
import Connection from './connection';
export const dynamic='force-dynamic';
export default async function Page(){const user=await requireChatGPTUser('/');const s=await taskService(env.DB,user.userId).snapshot();return <Connection userId={user.userId} initialTasks={s.records.filter((r:any)=>r.value?.type==='task'&&!r.value.done).map((r:any)=>r.value)} lastSync={s.lastSync} timezone={s.timezone}/>;}
