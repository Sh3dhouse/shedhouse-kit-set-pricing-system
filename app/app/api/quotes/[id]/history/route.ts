import {handle} from '../../../shared';
export const dynamic='force-dynamic';
export const GET=handle(async(req,repo)=>{const u=new URL(req.url);return repo.history(u.pathname.split('/').at(-2),u.searchParams.get('variant'));});
