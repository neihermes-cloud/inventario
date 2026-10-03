import type {CountEvent,LocalInventory} from '../types';
export function parseQuantity(value:string):number {
 if(!/^\d+(?:[.,]\d{1,3})?$/.test(value.trim()))throw new Error('Informe uma quantidade maior ou igual a zero, com até 3 casas decimais.');
 const n=Number(value.trim().replace(',','.'));if(!Number.isFinite(n)||n>1e9)throw new Error('Quantidade fora do limite permitido.');return n;
}
const indexes=new WeakMap<CountEvent[],{byId:Map<string,CountEvent>;byItem:Map<string,CountEvent[]>}>();
function index(events:CountEvent[]){
 let cached=indexes.get(events);if(cached)return cached;
 const byId=new Map(events.map(e=>[e.id,e])),superseded=new Set(events.map(e=>e.parentId).filter(Boolean)),byItem=new Map<string,CountEvent[]>();
 for(const e of events)if(!superseded.has(e.id)){const rows=byItem.get(e.itemId)??[];rows.push(e);byItem.set(e.itemId,rows);}
 cached={byId,byItem};indexes.set(events,cached);return cached;
}
export function heads(events:CountEvent[],itemId:string):CountEvent[]{return index(events).byItem.get(itemId)??[];}
export function status(inv:LocalInventory,itemId:string):'pending'|'counted'|'conflict'|'approved'{if(inv.approvals[itemId])return 'approved';const h=heads(inv.events,itemId);return h.length>1?'conflict':h.length===1?'counted':'pending';}
export function finalEvent(inv:LocalInventory,itemId:string):CountEvent|undefined{return index(inv.events).byId.get(inv.approvals[itemId]);}
export function difference(quantity:number,reference:number|string):number|null{return typeof reference==='number'?Math.round((quantity-reference)*1000)/1000:null;}
