import {env} from 'cloudflare:workers';
import {taskService,TaskError} from '../../../lib/task-service.js';
export async function GET(request:Request){try{const service=taskService(env.DB,request.headers.get('oai-authenticated-user-id'));return Response.json(await service.snapshot(),{headers:{'Cache-Control':'no-store'}});}catch(error){return Response.json({error:error instanceof TaskError?error.message:'Unable to load Sebams.'},{status:error instanceof TaskError?error.status:500});}}
