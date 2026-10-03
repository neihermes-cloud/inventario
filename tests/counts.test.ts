import {describe,it,expect} from 'vitest';
import {parseQuantity,heads,status,difference} from '../src/lib/counts';
import type {CountEvent,LocalInventory} from '../src/types';
const event=(id:string,actor:string,parentId:string|null=null):CountEvent=>({id,actor,parentId,itemId:'item',quantity:0,note:'',createdAt:'2026-10-03T12:00:00Z',synced:false});
describe('Regras do levantamento',()=>{
 it('distingue zero de vazio e aceita vírgula decimal',()=>{expect(parseQuantity('0')).toBe(0);expect(parseQuantity('1,125')).toBe(1.125);for(const value of ['', '-1','1,0000','1.000,50','NaN','Infinity','1e3'])expect(()=>parseQuantity(value)).toThrow();});
 it('mantém contagens concorrentes e elimina somente a versão corrigida',()=>{const rows=[event('a','pessoa1'),event('b','pessoa2'),event('c','pessoa1','a')];expect(heads(rows,'item').map(e=>e.id)).toEqual(['b','c']);const inv={events:rows,approvals:{}} as LocalInventory;expect(status(inv,'item')).toBe('conflict');expect(status(inv,'outro')).toBe('pending');});
 it('detecta ramificações da mesma pessoa em aparelhos diferentes',()=>{const rows=[event('a','pessoa1'),event('b','pessoa1','a'),event('c','pessoa1','a')];expect(heads(rows,'item').map(e=>e.id)).toEqual(['b','c']);});
 it('preserva referência não numérica e calcula diferença sem ruído decimal',()=>{expect(difference(0,'-')).toBeNull();expect(difference(.3,.1)).toBe(.2);expect(difference(0,2)).toBe(-2);});
});
