import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../chatgpt-auth';
import { repository,requireIdentity,requireMutation } from '../../server/quotes.mjs';
import bases from '../../public/bases.json';
import {requireStaff} from '../../server/authority.mjs';
export function handle(action:any,mutates=false){return async(request:Request)=>{try{
 const user=requireIdentity(await getChatGPTUser());
 requireStaff(user);
 if(!env.DB)return Response.json({error:'Shared storage is not configured.'},{status:503,headers:{'Cache-Control':'no-store'}});
 if(mutates){requireMutation(request);if(Number(request.headers.get('content-length')||0)>250000)return Response.json({error:'Quote data is too large.'},{status:413});}
 const result=await action(request,repository(env.DB,bases),user);
 return Response.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch(error:any){if(!error.status)console.error('Shared quote request failed',error);return Response.json({error:error.status?error.message:'Shared quotes are temporarily unavailable. Your local draft is safe.'},{status:error.status||503,headers:{'Cache-Control':'no-store'}});}};}
