import {handle} from '../../shared';
export const dynamic='force-dynamic';
export const GET=handle(async(req,repo)=>{const u=new URL(req.url);return repo.get(u.pathname.split('/').at(-1),u.searchParams.get('variant'));});
export const PATCH=handle(async(req,repo,user)=>{const u=new URL(req.url);const {variant,expectedRevision,restore}=await req.json();return repo.archive(u.pathname.split('/').at(-1),variant,expectedRevision,user,restore===true);},true);
