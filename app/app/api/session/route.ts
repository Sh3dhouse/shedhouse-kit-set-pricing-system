import {handle} from '../shared';
export const dynamic='force-dynamic';
export const GET=handle(async(_req,_repo,user)=>({email:user.email,sharedStorage:true,canApprove:user.email.toLowerCase()==='michel@shedhouse.co.nz'}));
