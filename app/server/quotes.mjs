import {parseBackup,transfer,calculate,DEFAULT_RATES} from '../public/pricing.js';
import {requireApprover,requireStaff} from './authority.mjs';
export class ApiError extends Error{constructor(status,message){super(message);this.status=status;}}
export const variants=new Set(['KIT_ONLY','KIT_PLUS_WORK']);
export function requireVariant(v){if(!variants.has(v))throw new ApiError(400,'Choose KIT_ONLY or KIT_PLUS_WORK.');return v;}
export function requireIdentity(user){if(!user?.userId||!user?.email)throw new ApiError(401,'Sign in with ChatGPT to use shared quotes.');return user;}
export function requireMutation(request){if(request.headers.get('origin')!==new URL(request.url).origin)throw new ApiError(403,'The request must come from this pricing app.');if(!request.headers.get('content-type')?.startsWith('application/json'))throw new ApiError(415,'Use a JSON request.');}
export function normalize(raw){
 if(!raw||typeof raw!=='object'||JSON.stringify(raw).length>200000)throw new ApiError(400,'Quote data is missing or too large.');
 if(typeof raw.id!=='string'||!/^[a-zA-Z0-9-]{10,80}$/.test(raw.id))throw new ApiError(400,'Invalid quote ID.');
 let q;try{q=parseBackup(JSON.stringify({format:'sh-pricing-backup',schema_version:raw.calculationVersion==='2.0'?'2.0':'1.0',quote:raw}));}catch(e){throw new ApiError(400,e.message);}
 q.id=raw.id;q.costsConfirmed=raw.costsConfirmed===true;q.scopeConfirmed=raw.scopeConfirmed===true;
 if(q.calculationVersion==='2.0'){q.standardScopeConfirmed=raw.standardScopeConfirmed===true;q.pricingValidated=raw.pricingValidated===true;q.status='DRAFT';}return q;
}
const fromRow=r=>r?{...JSON.parse(r.document),id:r.id,variant:r.variant,updatedAt:r.updated_at,_revision:r.revision,_createdAt:r.created_at,_updatedBy:r.updated_by_email,_archived:r.archived_at!==null}:null;
const historySQL=`INSERT INTO quote_history (quote_id,revision,document,action,changed_at,changed_by,changed_by_email) SELECT id,revision,document,?,updated_at,updated_by,updated_by_email FROM quotes WHERE id=? AND mutation_id=?`;
export function repository(db,bases){return {
 async list(variant,{archived=false,cursor=null}={}){requireVariant(variant);let values=[variant];let where=`variant=? AND archived_at IS ${archived?'NOT ':''}NULL`;
 if(cursor){let c;try{c=JSON.parse(atob(cursor));}catch{throw new ApiError(400,'Invalid page cursor.');}if(!Array.isArray(c)||c.length!==2||c.some(x=>typeof x!=='string'))throw new ApiError(400,'Invalid page cursor.');where+=' AND (updated_at < ? OR (updated_at = ? AND id < ?))';values.push(c[0],c[0],c[1]);}
 const {results}=await db.prepare(`SELECT * FROM quotes WHERE ${where} ORDER BY updated_at DESC,id DESC LIMIT 101`).bind(...values).all();const rows=results.slice(0,100),last=rows.at(-1);return {quotes:rows.map(fromRow),nextCursor:results.length>100?btoa(JSON.stringify([last.updated_at,last.id])):null};},
 async get(id,variant){requireVariant(variant);const row=await db.prepare('SELECT * FROM quotes WHERE id=? AND variant=?').bind(id,variant).first();if(!row)throw new ApiError(404,'Quote not found in this workflow.');return fromRow(row);},
 async save(raw,revision,user){requireIdentity(user);const q=normalize(raw);requireVariant(q.variant);if(!Number.isInteger(revision)||revision<0)throw new ApiError(400,'A valid expected revision is required.');
 if(revision>0){let existing;try{existing=await this.get(q.id,q.variant);}catch(e){if(e.status===404)throw new ApiError(409,'Quote is not in this workflow. Reload the shared library.');throw e;}if(existing.calculationVersion==='2.0'&&q.calculationVersion!=='2.0')throw new ApiError(400,'A V2 quote cannot be downgraded to historical pricing.');}
 if(q.calculationVersion==='2.0'){requireStaff(user);if(user.email.toLowerCase()!=='michel@shedhouse.co.nz'){
 const old=revision>0?await this.get(q.id,q.variant):null;
 const sameRates=(a,b)=>Object.keys(DEFAULT_RATES).every(k=>a?.[k]===b?.[k]);
 if(old&&old.calculationVersion==='2.0'&&!sameRates(q.rateSet,old.rateSet))throw new ApiError(403,'Only the pricing approver can change a quote rate snapshot.');
 if(!old){const {currentRates}=await import('./rates.mjs');const rates=await currentRates(db);if(!sameRates(q.rateSet,rates))throw new ApiError(403,'Start a new quote with the published rates.');}
 }}
 const now=new Date().toISOString(),op=crypto.randomUUID(),document=JSON.stringify(q);let stmt;
 if(revision===0)stmt=db.prepare('INSERT INTO quotes (id,variant,document,revision,created_at,updated_at,created_by,updated_by,updated_by_email,archived_at,mutation_id) VALUES (?,?,?,1,?,?,?,?,?,NULL,?) ON CONFLICT(id) DO NOTHING').bind(q.id,q.variant,document,now,now,user.userId,user.userId,user.email,op);
 else stmt=db.prepare('UPDATE quotes SET document=?,revision=revision+1,updated_at=?,updated_by=?,updated_by_email=?,mutation_id=? WHERE id=? AND variant=? AND revision=? AND archived_at IS NULL').bind(document,now,user.userId,user.email,op,q.id,q.variant,revision);
 const result=await db.batch([stmt,db.prepare(historySQL).bind('save',q.id,op)]);if(result[0].meta.changes!==1)throw new ApiError(409,'This quote changed on another device or is archived. Reload the shared version, or save your draft as a new copy.');return this.get(q.id,q.variant);},
 async archive(id,variant,revision,user,restore=false){requireIdentity(user);requireVariant(variant);if(!Number.isInteger(revision)||revision<1)throw new ApiError(400,'A valid expected revision is required.');const now=new Date().toISOString(),op=crypto.randomUUID();const stmt=db.prepare(`UPDATE quotes SET archived_at=?,revision=revision+1,updated_at=?,updated_by=?,updated_by_email=?,mutation_id=? WHERE id=? AND variant=? AND revision=? AND archived_at IS ${restore?'NOT ':''}NULL`).bind(restore?null:now,now,user.userId,user.email,op,id,variant,revision);const result=await db.batch([stmt,db.prepare(historySQL).bind(restore?'restore':'archive',id,op)]);if(result[0].meta.changes!==1)throw new ApiError(409,'The shared quote changed. Refresh the library before trying again.');return this.get(id,variant);},
 async history(id,variant){await this.get(id,variant);const {results}=await db.prepare('SELECT revision,action,changed_at,changed_by_email FROM quote_history WHERE quote_id=? ORDER BY revision DESC LIMIT 100').bind(id).all();return results;},
 async issue(id,variant,revision,user){requireApprover(user);const q=await this.get(id,variant);if(q._revision!==revision||q._archived)throw new ApiError(409,'Reload the current active quote before approval.');if(q.calculationVersion!=='2.0')throw new ApiError(400,'Historical quotes remain unchanged; create a V2 copy to approve.');const result=calculate(q,bases);if(!result.ready)throw new ApiError(400,result.issues.join(' '));
 const now=new Date().toISOString(),op=crypto.randomUUID(),issueId=crypto.randomUUID();const doc=normalize(q);doc.status='ISSUED';doc.approvedBy=user.email;doc.approvedAt=now;const document=JSON.stringify(doc),snapshot=JSON.stringify(transfer(doc,bases));
 const out=await db.batch([db.prepare('UPDATE quotes SET document=?,revision=revision+1,updated_at=?,updated_by=?,updated_by_email=?,mutation_id=? WHERE id=? AND variant=? AND revision=? AND archived_at IS NULL').bind(document,now,user.userId,user.email,op,id,variant,revision),db.prepare(historySQL).bind('issue',id,op),db.prepare('INSERT INTO quote_issues(id,quote_id,quote_revision,document,result,issued_at,issued_by) SELECT ?,id,revision,document,?,?,? FROM quotes WHERE id=? AND mutation_id=?').bind(issueId,snapshot,now,user.email,id,op)]);if(out[0].meta.changes!==1)throw new ApiError(409,'Quote changed during approval. Reload and retry.');return this.get(id,variant);},
 async issued(id,variant){await this.get(id,variant);const {results}=await db.prepare('SELECT id,quote_revision,result,issued_at,issued_by FROM quote_issues WHERE quote_id=? ORDER BY quote_revision DESC').bind(id).all();return results.map(r=>({...r,result:JSON.parse(r.result)}));},
 async export(id,variant){const q=await this.get(id,variant);return transfer(q,bases);}
};}
