import {supabase} from './supabase';import type {LocalInventory,Item,CountEvent,Source} from '../types';import {heads} from './counts';
function client(){if(!supabase)throw new Error('Configure o Supabase antes de sincronizar.');return supabase;}
async function rpc(name:string,args:Record<string,unknown>){const {data,error}=await client().rpc(name,args);if(error)throw new Error(error.message);return data;}
export async function userCompanies(userId:string){const {data,error}=await client().from('user_memberships').select('company_id,role').eq('user_id',userId);if(error)throw new Error(error.message);return data as {company_id:string;role:string}[];}
export async function publish(inv:LocalInventory,companyId:string,onProgress:(message:string)=>void){
 const {data:{user}}=await client().auth.getUser();if(!user)throw new Error('Entre com sua conta do Mercado.');
 const sources=inv.sources.map(({bytes,...source})=>source);
 await rpc('inventory_app_create',{_id:inv.id,_company:companyId,_name:inv.name,_mode:inv.mode,_sources:sources,_expected:inv.items.length});
 const {data:existing,error}=await client().from('inventory_app_sessions').select('state').eq('id',inv.id).single();if(error)throw new Error(error.message);
 if(existing.state==='CLOSED')throw new Error('Este inventário já foi encerrado na nuvem.');
 if(existing.state==='DRAFT')for(let i=0;i<inv.items.length;i+=400){await rpc('inventory_app_import',{_session:inv.id,_items:inv.items.slice(i,i+400)});onProgress(`Enviando cadastro: ${Math.min(i+400,inv.items.length).toLocaleString('pt-BR')} de ${inv.items.length.toLocaleString('pt-BR')}`);}
 await rpc('inventory_app_start',{_session:inv.id});
 return {...inv,remoteId:inv.id,companyId,ownerId:user.id,importComplete:true,approvals:{}};
}
async function allRows(table:string,sessionId:string){let rows:Record<string,unknown>[]=[];for(let offset=0;;offset+=1000){const {data,error}=await client().from(table).select('*').eq('session_id',sessionId).order(table==='inventory_app_approvals'?'item_id':'id').range(offset,offset+999);if(error)throw new Error(error.message);rows.push(...data);if(data.length<1000)break;}return rows;}
function countEvent(r:Record<string,unknown>):CountEvent{return {id:String(r.id),itemId:String(r.item_id),actor:String(r.actor_id),quantity:Number(r.quantity),note:String(r.note),createdAt:String(r.created_at),parentId:r.parent_id?String(r.parent_id):null,synced:true};}
export async function refresh(inv:LocalInventory){
 if(!inv.remoteId)return inv;
 const {data:s,error}=await client().from('inventory_app_sessions').select('*').eq('id',inv.remoteId).single();if(error)throw new Error(error.message);
 const merged=new Map(inv.events.map(e=>[e.id,e]));let lastSequence=inv.lastSequence??0;
 for(;;){const {data,error}=await client().from('inventory_app_counts').select('*').eq('session_id',inv.remoteId).gt('sequence',lastSequence).order('sequence').limit(1000);if(error)throw new Error(error.message);for(const row of data){merged.set(String(row.id),countEvent(row));lastSequence=Math.max(lastSequence,Number(row.sequence));}if(data.length<1000)break;}
 const decisions=await allRows('inventory_app_approvals',inv.remoteId),missing=decisions.map(d=>String(d.event_id)).filter(id=>!merged.has(id));
 for(let i=0;i<missing.length;i+=100){const {data,error}=await client().from('inventory_app_counts').select('*').eq('session_id',inv.remoteId).in('id',missing.slice(i,i+100));if(error)throw new Error(error.message);for(const row of data)merged.set(String(row.id),countEvent(row));}
 return {...inv,events:[...merged.values()],lastSequence,approvals:Object.fromEntries(decisions.map(d=>[String(d.item_id),String(d.event_id)])),closed:s.state==='CLOSED'};
}
export async function sync(inv:LocalInventory,onSaved:(inv:LocalInventory)=>Promise<void>){
 if(!inv.remoteId)return inv;
 let current=inv;
 for(const event of current.events.filter(e=>!e.synced)){
  await rpc('inventory_app_send',{_id:event.id,_session:inv.remoteId,_item:event.itemId,_quantity:event.quantity,_parent:event.parentId,_note:event.note});
  current={...current,events:current.events.map(e=>e.id===event.id?{...e,synced:true}:e)};await onSaved(current);
 }
 return refresh(current);
}
export async function remoteInventories(){const {data,error}=await client().from('inventory_app_sessions').select('id,name,mode,state,created_at,created_by,company_id,sources').neq('state','DRAFT').order('created_at',{ascending:false}).limit(100);if(error)throw new Error(error.message);return data;}
export async function downloadInventory(id:string):Promise<LocalInventory>{
 const {data:s,error}=await client().from('inventory_app_sessions').select('*').eq('id',id).single();if(error)throw new Error(error.message);
 const rows=await allRows('inventory_app_items',id);
 const inv:LocalInventory={id,name:s.name,mode:s.mode,createdAt:s.created_at,ownerId:s.created_by,companyId:s.company_id,remoteId:id,importComplete:true,closed:s.state==='CLOSED',items:rows.map(r=>r.data as Item),sources:(s.sources as Omit<Source,'bytes'>[]).map(source=>({...source,bytes:new Uint8Array()})),events:[],approvals:{}};
 return refresh(inv);
}
export async function approve(inv:LocalInventory,decisions:{item:string;event:string}[]){const payload=decisions.map(d=>({...d,expectedHeads:heads(inv.events,d.item).map(e=>e.id)}));for(let i=0;i<payload.length;i+=250)await rpc('inventory_app_approve',{_session:inv.remoteId,_decisions:payload.slice(i,i+250)});return refresh(inv);}
export async function closeInventory(inv:LocalInventory,confirmed:boolean){await rpc('inventory_app_close',{_session:inv.remoteId,_team_confirmed:confirmed});return refresh(inv);}
export async function canFinish(company:string){return Boolean(await rpc('has_company_permission',{_company_id:company,_permission:'inventory.finish'}));}
