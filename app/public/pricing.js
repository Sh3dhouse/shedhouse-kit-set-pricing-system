import * as legacy from './legacy-pricing.js';
export const SCHEMA_VERSION='2.0';
export const {COST_TYPES,WORK_TYPES,todayNZ,amount}=legacy;
export const DEFAULT_RATES=Object.freeze({version:'SH-2026-V2-1',residentialRate:2700,garageRate:1200,kitMargin:30,constructionMargin:10,contingency:5,gst:15,validated:false});
export const ARRANGEMENTS={SUPPLY_ONLY:'Kitset supply only',CUSTOMER_MANAGED:'Customer-managed subcontractors',SH_MANAGED:'Fully managed construction'};
// Decimal half-up rounding at monetary boundaries.
export function round(value){if(!Number.isFinite(value))return null;const [m,e='0']=String(value).split('e');return Number(Math.round(Number(m+'e'+(Number(e)+2)))+'e-2');}
export const addDays=(date,n)=>{const d=new Date(date+'T00:00:00Z');if(!Number.isFinite(d.getTime()))return '';d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
export const isDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
export function newQuote(variant,baseId=1,rates=DEFAULT_RATES){const q=legacy.newQuote(variant,baseId);return {...q,calculationVersion:'2.0',rateSet:{...rates},supplyComparable:Object.fromEntries(COST_TYPES.map(([k])=>[k,true])),arrangement:variant==='KIT_ONLY'?'SUPPLY_ONLY':'SH_MANAGED',residentialArea:'',garageArea:'',totalEnclosedArea:'',kitMargin:rates.kitMargin,constructionMargin:rates.constructionMargin,contingencyRate:rates.contingency,gst:rates.gst,validUntil:addDays(q.date,30),supplierExpiry:'',standardScopeConfirmed:false,pricingValidated:false,overrideReason:'',status:'DRAFT',work:q.work.map(w=>({...w,margin:rates.constructionMargin,payer:'SH',areaCategory:['SITE','CONSENT','ENGINEERING'].includes(w.code)?'SITE_SPECIFIC':'SHARED',comparable:false,uncertain:false,expiry:'',discount:0})),kitDiscount:0};}
export function colourBand(rate){return !Number.isFinite(rate)?'Not comparable':rate<1950?'Pricing review':rate<=2250?'Green':rate<=2500?'Black':'Red';}
const num=v=>{const n=amount(v);return n!==null&&Number.isFinite(n)?n:null;};
const percent=v=>{const n=num(v);return n!==null&&n>=0&&n<100?n:null;};
export function calculate(q,bases,asOf=todayNZ()){
 if(q.calculationVersion!=='2.0')return legacy.calculate(q,bases);
 const issues=[],base=bases.find(b=>b.id===Number(q.baseId));
 const activeCosts=COST_TYPES.map(([key,label])=>{const source=base?.[key]??0,override=num(q.costs?.[key]);return {key,label,source,cost:amount(q.costs?.[key])===null?source:override,overridden:amount(q.costs?.[key])!==null};});
 const costValid=!!base&&activeCosts.every(x=>x.cost!==null&&x.cost>=0)&&activeCosts[0].cost>0;
 if(!costValid)issues.push('Enter valid supply costs; primary kit cost must be above zero.');
 const kitMargin=percent(q.kitMargin),constructionMargin=percent(q.constructionMargin),contingencyRate=percent(q.contingencyRate),gstPercent=num(q.gst),rates=q.rateSet||{};
 const ratesValid=[kitMargin,constructionMargin,contingencyRate].every(x=>x!==null)&&gstPercent!==null&&gstPercent>=0&&gstPercent<=100&&num(rates.residentialRate)>0&&num(rates.garageRate)>0;
 if(!ratesValid)issues.push('Enter valid rates; gross margins and contingency must be below 100%.');
 const areaR=num(q.residentialArea),areaG=num(q.garageArea),enclosed=num(q.totalEnclosedArea),areaValid=areaR!==null&&areaG!==null&&areaR>=0&&areaG>=0&&areaR+areaG>0&&enclosed!==null&&Math.abs(areaR+areaG-enclosed)<0.000001;
 if(!areaValid)issues.push('Enter residential, garage and total enclosed areas; the separate areas must reconcile.');
 const arrangementValid=q.variant==='KIT_ONLY'?q.arrangement==='SUPPLY_ONLY':['CUSTOMER_MANAGED','SH_MANAGED'].includes(q.arrangement);
 if(!arrangementValid)issues.push('Select an arrangement matching this quote workflow.');
 const kitCost=costValid?activeCosts.reduce((a,x)=>a+x.cost,0):null,discount=num(q.kitDiscount??0);
 const kitSale=costValid&&kitMargin!==null&&discount!==null&&discount>=0?round(kitCost/(1-kitMargin/100)-discount):null;
 if(kitSale===null||kitSale<0)issues.push('Enter a valid kit discount and margin.');
 let override=kitMargin!==num(rates.kitMargin)||constructionMargin!==num(rates.constructionMargin)||contingencyRate!==num(rates.contingency)||gstPercent!==num(rates.gst)||discount>0;
 const work=WORK_TYPES.map(([code,label])=>{
  const w=q.work?.find(x=>x.code===code)||{};
  if(q.variant==='KIT_ONLY'||!w.included)return {...w,code,label,included:false,cost:0,sale:0,reserve:0,valid:true};
  const quantity=num(w.quantity),unitCost=num(w.unitCost),margin=percent(w.margin),discount=num(w.discount??0);
  const payerValid=['SH','CUSTOMER'].includes(w.payer)&&(q.arrangement!=='SH_MANAGED'||w.payer==='SH');
  const valid=!!w.scope?.trim()&&['sum','m2','m3','m','hr','each'].includes(w.unit)&&quantity!==null&&quantity>0&&unitCost!==null&&unitCost>=0&&payerValid&&['RESIDENTIAL','GARAGE_SHED','SHARED','SITE_SPECIFIC'].includes(w.areaCategory)&&discount!==null&&discount>=0&&(w.payer==='CUSTOMER'||margin!==null&&contingencyRate!==null)&&(!w.expiry||isDate(w.expiry));
  const cost=valid?quantity*unitCost:null,reserve=valid?(w.payer==='SH'&&w.uncertain?round(cost*contingencyRate/100):0):null;
  const sale=valid?round(w.payer==='CUSTOMER'?cost:(cost+reserve)/(1-margin/100)-discount):null;
  if(!valid||sale<0)issues.push(`Complete ${label}: scope, payer, area, quantity, cost, margin and validity.`);
  if(w.payer==='SH'&&(margin!==constructionMargin||discount>0))override=true;
  return {...w,code,label,cost,reserve,sale,comparable:w.comparable===true&&w.areaCategory!=='SITE_SPECIFIC',valid:valid&&sale>=0};
 });
 const workValid=work.every(w=>w.valid),sum=(key,predicate=()=>true)=>round(work.filter(w=>w.included&&predicate(w)).reduce((a,w)=>a+(w[key]??0),0));
 const workSale=workValid?sum('sale',w=>w.payer==='SH'):null,thirdParty=workValid?sum('sale',w=>w.payer==='CUSTOMER'):null;
 const constructionCost=workValid?sum('cost',w=>w.payer==='SH'):null,contingency=workValid?sum('reserve',w=>w.payer==='SH'):null;
 const subtotal=kitSale!==null&&kitSale>=0&&workSale!==null?round(kitSale+workSale):null,gstRate=ratesValid?gstPercent/100:null;
 const gst=subtotal!==null&&gstRate!==null?round(subtotal*gstRate):null,total=gst!==null?round(subtotal+gst):null;
 const target=areaValid&&ratesValid?round(areaR*rates.residentialRate+areaG*rates.garageRate):null;
 const comparable=arrangementValid&&q.arrangement!=='SUPPLY_ONLY'&&q.standardScopeConfirmed===true&&areaValid&&ratesValid&&workValid&&kitSale!==null&&kitSale>=0;
 const comparableKitSale=kitSale!==null&&kitCost>0?round(kitSale*activeCosts.filter(c=>q.supplyComparable?.[c.key]!==false).reduce((a,c)=>a+c.cost,0)/kitCost):null;
 const comparableSale=comparable?round(comparableKitSale+sum('sale',w=>w.comparable)):null,combinedRate=comparable?comparableSale/(areaR+areaG):null;
 const kitProfit=kitSale!==null?round(kitSale-kitCost):null,constructionProfit=workSale!==null?round(workSale-constructionCost):null;
 if(override&&!q.overrideReason?.trim())issues.push('Explain pricing overrides or discounts for administrator approval.');
 if(!q.costsConfirmed)issues.push('Confirm current supplier and selected work costs.');
 if(!q.scopeConfirmed)issues.push('Confirm scope, exclusions and terms.');
 if(q.pricingValidated!==true)issues.push('Validate detailed pricing against current costs before issue.');
 if(q.arrangement!=='SUPPLY_ONLY'&&!q.standardScopeConfirmed)issues.push('Confirm the complete standard scope, or keep this as an internal estimate.');
 for(const key of ['customer','site','reference','specification','supplierQuote','supplierReference','inclusions','exclusions','terms'])if(!q[key]?.trim())issues.push(`Complete ${key}.`);
 const expiries=[q.supplierExpiry,...work.filter(w=>w.included).map(w=>w.expiry)].filter(Boolean);
 const validityValid=isDate(q.date)&&isDate(q.validUntil)&&(!q.supplierExpiry||isDate(q.supplierExpiry))&&expiries.every(isDate);
 const validityCap=validityValid?[addDays(q.date,30),...expiries].sort()[0]:null;
 if(!validityValid||q.validUntil<q.date||q.validUntil>validityCap)issues.push('Validity must be within 30 days and no later than supplier or work quotation expiry.');
 if(isDate(q.validUntil)&&q.validUntil<asOf)issues.push('Quote expired; reconfirm costs and obtain approval before reissue.');
 return {base,issues,costValid:costValid&&ratesValid,ready:issues.length===0,activeCosts,kitCost,rate:kitMargin===null?null:kitMargin/100,gstRate,kitSale,work,workSale,subtotal,gst,total,thirdParty,projectBudget:subtotal!==null&&thirdParty!==null?round(subtotal+thirdParty):null,constructionCost,kitProfit,constructionProfit,contingency,constructionProfitAfterReserve:constructionProfit!==null?round(constructionProfit-contingency):null,portalRevenue:0,portalCost:0,portalContribution:0,profit:kitProfit!==null&&constructionProfit!==null?round(kitProfit+constructionProfit):null,areaValid,target,targetCombinedRate:target===null?null:target/(areaR+areaG),comparableKitSale,comparableSale,combinedRate,band:colourBand(combinedRate),override,validityCap};
}
export function transfer(q,bases){if(q.calculationVersion!=='2.0')return legacy.transfer(q,bases);const r=calculate(q,bases);return {schema_version:'2.0',calculation_version:'2.0',pricing_variant:q.variant,construction_arrangement:q.arrangement,quote_reference:q.reference,customer_name:q.customer,site_address:q.site,quote_date:q.date,valid_until:q.validUntil,currency:'NZD',rate_set:{...q.rateSet},residential_area_m2:num(q.residentialArea),garage_area_m2:num(q.garageArea),total_enclosed_area_m2:num(q.totalEnclosedArea),kit_cost_ex_gst:r.kitCost,kit_sale_ex_gst:r.kitSale,kit_profit_ex_gst:r.kitProfit,construction_sale_ex_gst:r.workSale,construction_cost_ex_gst:r.constructionCost,construction_profit_ex_gst:r.constructionProfit,contingency_reserve_ex_gst:r.contingency,construction_profit_after_reserve_ex_gst:r.constructionProfitAfterReserve,portal_revenue_ex_gst:0,portal_cost_ex_gst:0,third_party_budget_ex_gst:r.thirdParty,total_ex_gst:r.subtotal,gst_rate:r.gstRate,gst_amount:r.gst,total_inc_gst:r.total,combined_rate_ex_gst:r.combinedRate,colour_band:r.band,issue_status:q.status==='ISSUED'?'Issued':r.ready?'Awaiting approval':'Draft',details:{work:r.work,costs:r.activeCosts,supply_comparable:q.supplyComparable,issues:r.issues,override_reason:q.overrideReason}};}
// Imported backups never inherit approval or issued status.
export function parseBackup(text){const x=JSON.parse(text);if(x.schema_version==='1.0')return legacy.parseBackup(text);if(x.format!=='sh-pricing-backup'||x.schema_version!=='2.0'||!['KIT_ONLY','KIT_PLUS_WORK'].includes(x.quote?.variant))throw Error('Choose an SH pricing backup.');if(x.quote.calculationVersion!=='2.0')return legacy.parseBackup(JSON.stringify({...x,schema_version:'1.0'}));const raw=x.quote,q=newQuote(raw.variant);for(const key of ['customer','site','reference','date','validUntil','specification','supplierReference','supplierQuote','inclusions','exclusions','terms','supplierExpiry','overrideReason','arrangement'])if(typeof raw[key]==='string')q[key]=raw[key];for(const key of ['baseId','gst','kitMargin','constructionMargin','contingencyRate','kitDiscount','residentialArea','garageArea','totalEnclosedArea'])if(typeof raw[key]==='number'||typeof raw[key]==='string')q[key]=raw[key];if(!Number.isInteger(Number(q.baseId))||Number(q.baseId)<1||Number(q.baseId)>5)throw Error('Unknown base proposal.');q.costs=Object.fromEntries(COST_TYPES.map(([k])=>[k,typeof raw.costs?.[k]==='number'||typeof raw.costs?.[k]==='string'?raw.costs[k]:'']));q.rateSet={...DEFAULT_RATES,...Object.fromEntries(Object.keys(DEFAULT_RATES).filter(k=>['number','string','boolean'].includes(typeof raw.rateSet?.[k])).map(k=>[k,raw.rateSet[k]]))};q.supplyComparable=Object.fromEntries(COST_TYPES.map(([k])=>[k,raw.supplyComparable?.[k]!==false]));q.work=q.work.map(w=>{const r=raw.work?.find?.(x=>x.code===w.code);if(!r)return w;for(const k of ['scope','unit','payer','areaCategory','expiry'])if(typeof r[k]==='string')w[k]=r[k];for(const k of ['quantity','unitCost','margin','discount'])if(['number','string'].includes(typeof r[k]))w[k]=r[k];for(const k of ['included','comparable','uncertain'])w[k]=r[k]===true;return w;});return q;}
