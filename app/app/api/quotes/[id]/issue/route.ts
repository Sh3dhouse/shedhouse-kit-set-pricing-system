import {handle} from '../../../shared';
export const dynamic='force-dynamic';
export const POST=handle(async(req,repo,user)=>{const {variant,expectedRevision}=await req.json();const id=new URL(req.url).pathname.split('/').at(-2);return repo.issue(id,variant,expectedRevision,user);},true);
export const GET=handle(async(req,repo)=>{const u=new URL(req.url),id=u.pathname.split('/').at(-2);return repo.issued(id,u.searchParams.get('variant'));});
