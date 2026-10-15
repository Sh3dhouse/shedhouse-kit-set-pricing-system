import { handle } from '../shared';
export const dynamic='force-dynamic';
export const GET=handle(async(req,repo)=>{const u=new URL(req.url);return repo.list(u.searchParams.get('variant'),{archived:u.searchParams.get('archived')==='1',cursor:u.searchParams.get('cursor')});});
export const POST=handle(async(req,repo,user)=>{const {quote,expectedRevision}=await req.json();return repo.save(quote,expectedRevision,user);},true);
