// Framework-independent pricing contract shared by both workflows and future SHP adapters.
export const SCHEMA_VERSION='1.0';
export const WORK_TYPES=[['SLAB','Slab supply & installation'],['SITE','Earthworks & site preparation'],['ERECTION','Kit-set erection'],['PRELIMS','Preliminary & general'],['CONSENT','Consent fees'],['ENGINEERING','Engineering & inspections'],['OTHER1','Other work 1'],['OTHER2','Other work 2']];
export const COST_TYPES=[['primary','Primary kit supply'],['secondary','Secondary kit / garage'],['freight','Kit freight'],['paFreight','PA door freight'],['rollerFreight','Roller door freight'],['delivery','Delivery to site'],['extras','Other supply extras']];
export const round=n=>Math.round((n+Number.EPSILON)*100)/100;
export const amount=v=>v===null||v===undefined||(typeof v==='string'&&v.trim()==='')?null:(typeof v==='number'?v:Number(v));
export const todayNZ=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Pacific/Auckland',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function newQuote(variant,baseId=1){return {id:crypto.randomUUID(),variant,baseId,customer:'',site:'',reference:'',date:todayNZ(),validUntil:'',specification:'',supplierReference:'',supplierQuote:'',inclusions:'',exclusions:variant==='KIT_ONLY'?'Slab, earthworks, erection, site labour, consent and engineering services unless expressly included.':'',terms:'',method:'Markup',rate:'',gst:15,costs:{},work:WORK_TYPES.map(([code])=>({code,included:false,scope:'',unit:'sum',quantity:'',unitCost:'',markup:''})),costsConfirmed:false,scopeConfirmed:false,updatedAt:null};}
function realDate(s){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;}
export function calculate(q,bases){
 const issues=[],base=bases.find(b=>b.id===Number(q.baseId));
 if(!base)return {issues:['Choose a valid base proposal.'],costValid:false,ready:false,kitSale:null,total:null,work:[],activeCosts:[]};
 const activeCosts=COST_TYPES.map(([key,label])=>{const source=base[key]??0;const override=amount(q.costs[key]);const cost=override===null?source:override;return {key,label,source,cost,overridden:override!==null};});
 const costValid=activeCosts.every(r=>Number.isFinite(r.cost)&&r.cost>=0)&&activeCosts[0].cost>0;
 if(!costValid)issues.push('Enter valid supply costs; primary kit cost must be above zero.');
 const rate=amount(q.rate)===null?(q.method==='Markup'?base.markup:base.markup/(1+base.markup)):amount(q.rate)/100;
 const rateValid=Number.isFinite(rate)&&rate>=0&&['Markup','Gross margin'].includes(q.method)&&(q.method!=='Gross margin'||rate<1);
 if(!rateValid)issues.push('Enter a valid pricing rate; gross margin must be below 100%.');
 const gstRate=amount(q.gst)===null?null:amount(q.gst)/100;
 const gstValid=gstRate!==null&&Number.isFinite(gstRate)&&gstRate>=0&&gstRate<=1;
 if(!gstValid)issues.push('Enter a GST rate from 0% to 100%.');
 const kitCost=costValid?activeCosts.reduce((s,r)=>s+r.cost,0):null;
 const kitSale=costValid&&rateValid?round(q.method==='Markup'?kitCost*(1+rate):kitCost/(1-rate)):null;
 const work=WORK_TYPES.map(([code,label])=>{
  const w=q.work.find(r=>r.code===code)||{code,included:false};
  if(q.variant!=='KIT_PLUS_WORK'||!w.included)return {...w,code,label,included:false,cost:0,sale:0,valid:true};
  const qty=amount(w.quantity),unitCost=amount(w.unitCost),markup=amount(w.markup);
  const valid=!!w.scope.trim()&&['sum','m2','m3','m','hr','each'].includes(w.unit)&&[qty,unitCost,markup].every(x=>x!==null&&Number.isFinite(x))&&qty>0&&unitCost>=0&&markup>=0;
  if(!valid)issues.push(`Complete ${label.toLowerCase()}: scope, quantity, cost and markup.`);
  return {...w,code,label,cost:valid?qty*unitCost:null,sale:valid?round(qty*unitCost*(1+markup/100)):null,valid};
 });
 const workValid=work.every(w=>w.valid),workSale=workValid?round(work.reduce((s,w)=>s+w.sale,0)):null;
 const subtotal=kitSale!==null&&workValid?round(kitSale+workSale):null;
 const gst=subtotal!==null&&gstValid?round(subtotal*gstRate):null;
 const total=gst!==null?round(subtotal+gst):null;
 const checks=[['customer','Add the customer name.'],['site','Add the site address.'],['reference','Add a quote reference.'],['specification','Describe the exact building specification.'],['supplierQuote','Add the supplier quotation reference.'],['supplierReference','Add the supplier / kit reference.'],['inclusions','Describe what is included.'],['exclusions','Describe the exclusions.'],['terms','Add supply and payment terms.']];
 checks.forEach(([key,msg])=>{if(!q[key]?.trim())issues.push(msg);});
 if(!realDate(q.date)||!realDate(q.validUntil))issues.push('Enter a quote date and valid-until date.');
 else if(q.validUntil<q.date)issues.push('Validity must end on or after the quote date.');
 if(!q.costsConfirmed)issues.push('Confirm current supplier and selected work costs.');
 if(!q.scopeConfirmed)issues.push('Confirm the scope, exclusions and terms.');
 return {base,issues,costValid:costValid&&rateValid&&gstValid,ready:issues.length===0,activeCosts,kitCost,rate,gstRate,kitSale,work,workSale,subtotal,gst,total,profit:subtotal===null?null:round(subtotal-kitCost-work.reduce((s,r)=>s+(r.cost||0),0))};
}
export function transfer(q,bases){const r=calculate(q,bases);return {schema_version:SCHEMA_VERSION,pricing_variant:q.variant,quote_reference:q.reference,customer_name:q.customer,site_address:q.site,quote_date:q.date,valid_until:q.validUntil,base_number:q.baseId,specification:q.specification,supplier_quote_reference:q.supplierQuote,currency:'NZD',issue_status:r.ready?'Ready to issue':'Draft',kit_cost_ex_gst:r.kitCost,kit_sale_ex_gst:r.kitSale,gst_rate:r.gstRate,...Object.fromEntries(r.work.map(w=>[w.code.toLowerCase()+'_sale_ex_gst',w.sale])),total_ex_gst:r.subtotal,gst_amount:r.gst,total_inc_gst:r.total,details:{supplier_reference:q.supplierReference,inclusions:q.inclusions,exclusions:q.exclusions,terms:q.terms,costs:r.activeCosts,work:r.work,pricing_method:q.method,pricing_rate:r.rate,issues:r.issues}};}
// Validate imported backups before they reach UI or calculations. No executable content is evaluated.
export function parseBackup(text){const x=JSON.parse(text);if(x.format!=='sh-pricing-backup'||x.schema_version!==SCHEMA_VERSION||!x.quote)throw Error('Choose an SH Pricing backup JSON file (schema 1.0).');const raw=x.quote;if(!['KIT_ONLY','KIT_PLUS_WORK'].includes(raw.variant))throw Error('Unknown pricing workflow.');const q=newQuote(raw.variant);for(const key of ['customer','site','reference','date','validUntil','specification','supplierReference','supplierQuote','inclusions','exclusions','terms','method','rate','gst'])if(typeof raw[key]==='string'||typeof raw[key]==='number')q[key]=['rate','gst'].includes(key)?raw[key]:String(raw[key]);q.baseId=Number(raw.baseId);if(!Number.isInteger(q.baseId)||q.baseId<1||q.baseId>5)throw Error('Unknown base proposal.');q.costs=Object.fromEntries(COST_TYPES.map(([key])=>[key,typeof raw.costs?.[key]==='string'||typeof raw.costs?.[key]==='number'?raw.costs[key]:'']));q.work=q.work.map(w=>{const r=Array.isArray(raw.work)?raw.work.find(r=>r.code===w.code):null;return r?{...w,included:r.included===true,scope:typeof r.scope==='string'?r.scope:'',unit:typeof r.unit==='string'?r.unit:'sum',...Object.fromEntries(['quantity','unitCost','markup'].map(k=>[k,typeof r[k]==='string'||typeof r[k]==='number'?r[k]:'']))}:w;});return q;}
