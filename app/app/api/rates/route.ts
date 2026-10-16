import {env} from 'cloudflare:workers';
import {handle} from '../shared';
import {currentRates,publishRates} from '../../../server/rates.mjs';
export const dynamic='force-dynamic';
export const GET=handle(async()=>currentRates(env.DB));
export const POST=handle(async(req,_repo,user)=>publishRates(env.DB,await req.json(),user),true);
