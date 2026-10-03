// @vitest-environment node
// Executa PostgreSQL localmente; o banco real não recebe dados de teste.
import {PGlite} from '@electric-sql/pglite';import {readFileSync} from 'node:fs';import {resolve} from 'node:path';import {describe,it,expect,beforeAll,afterAll} from 'vitest';
let db:PGlite;
const company='10000000-0000-4000-8000-000000000001',otherCompany='10000000-0000-4000-8000-000000000002';
const manager='20000000-0000-4000-8000-000000000001',counter='20000000-0000-4000-8000-000000000002',outsider='20000000-0000-4000-8000-000000000003';
const session='30000000-0000-4000-8000-000000000001',source='40000000-0000-4000-8000-000000000001';
const item='50000000-0000-4000-8000-000000000001',second='50000000-0000-4000-8000-000000000002';
const e1='60000000-0000-4000-8000-000000000001',e2='60000000-0000-4000-8000-000000000002',e3='60000000-0000-4000-8000-000000000003';
async function as(actor:string,role='authenticated'){await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','${actor}',false); SET ROLE ${role};`);}
const call=(name:string,values:unknown[])=>db.query(`SELECT public.${name}(${values.map((_,i)=>'$'+(i+1)).join(',')})`,values);
beforeAll(async()=>{
 db=new PGlite();await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 GRANT USAGE ON SCHEMA auth TO authenticated,anon;GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,anon;
 CREATE TABLE public.fixture_members(user_id uuid,company_id uuid,can_finish boolean);
 INSERT INTO public.fixture_members VALUES('${manager}','${company}',true),('${counter}','${company}',false),('${outsider}','${otherCompany}',true);
 CREATE FUNCTION public.has_company_permission(_company_id uuid,_permission text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$SELECT EXISTS(SELECT 1 FROM public.fixture_members m WHERE m.user_id=auth.uid() AND m.company_id=_company_id AND (_permission<>'inventory.finish' OR m.can_finish))$$;`);
 await db.exec(readFileSync(resolve(process.cwd(),'supabase/migrations/20261003190000_inventory_app_pilot.sql'),'utf8'));
},120000);
afterAll(async()=>{await db?.close();});
describe.sequential('Segurança e concorrência das contagens',()=>{
 it('recusa acesso anônimo às tabelas e funções',async()=>{await as('','anon');await expect(db.query('SELECT * FROM public.inventory_app_sessions')).rejects.toThrow(/permission denied/i);await expect(call('inventory_app_can_view',[session])).rejects.toThrow(/permission denied/i);});
 it('cria a referência de origem e só abre após importar todos os itens',async()=>{
  await as(manager);const sources=JSON.stringify([{id:source,name:'Teste.xlsx',hash:'a'.repeat(64),rows:2}]);
  await call('inventory_app_create',[session,company,'Teste','team',sources,2]);await call('inventory_app_create',[session,company,'Teste','team',sources,2]);
  const row={id:item,sourceId:source,row:6,description:'Produto A',reference:2};await call('inventory_app_import',[session,JSON.stringify([row])]);await call('inventory_app_import',[session,JSON.stringify([row])]);
  await expect(call('inventory_app_start',[session])).rejects.toThrow(/incompleta/);
  await call('inventory_app_import',[session,JSON.stringify([{...row,id:second,row:7,description:'Produto B'}])]);await call('inventory_app_start',[session]);
  await expect(call('inventory_app_import',[session,JSON.stringify([row])])).rejects.toThrow(/encerrada/);
 });
 it('recusa alterações diretas nos saldos de referência',async()=>{await as(counter);await expect(db.query('UPDATE public.inventory_app_items SET data=$1 WHERE id=$2',[JSON.stringify({reference:999}),item])).rejects.toThrow(/permission denied/i);});
 it('registra zero e não duplica reenvios; rejeita reenvio com outra quantidade',async()=>{await as(counter);await call('inventory_app_send',[e1,session,item,0,null,'Sem estoque']);await call('inventory_app_send',[e1,session,item,0,null,'Sem estoque']);const result=await db.query<{actor_id:string;quantity:string}>('SELECT actor_id,quantity FROM public.inventory_app_counts');expect(result.rows).toHaveLength(1);expect(result.rows[0].actor_id).toBe(counter);expect(Number(result.rows[0].quantity)).toBe(0);await expect(call('inventory_app_send',[e1,session,item,1,null,'Sem estoque'])).rejects.toThrow(/dados diferentes/);});
 it('recusa negativos e decimais além da precisão permitida',async()=>{await as(counter);await expect(call('inventory_app_send',[e3,session,second,-1,null,''])).rejects.toThrow(/Quantidade inválida/);await expect(call('inventory_app_send',[e3,session,second,.0001,null,''])).rejects.toThrow(/Quantidade inválida/);});
 it('preserva contagens simultâneas e impede corrigir contagem de outra pessoa',async()=>{await as(manager);await expect(call('inventory_app_send',[e2,session,item,1,e1,''])).rejects.toThrow(/própria/);await call('inventory_app_send',[e2,session,item,1,null,'Segunda pessoa']);expect((await db.query('SELECT * FROM public.inventory_app_counts')).rows).toHaveLength(2);});
 it('contador não pode aprovar; gestor precisa conhecer os candidatos atuais',async()=>{
  await as(counter);await expect(call('inventory_app_approve',[session,JSON.stringify([{item,event:e1,expectedHeads:[e1,e2]}])])).rejects.toThrow(/autorizado/);
  await as(manager);await expect(call('inventory_app_approve',[session,JSON.stringify([{item,event:e1,expectedHeads:[e1]}])])).rejects.toThrow(/mudaram/);
  await call('inventory_app_approve',[session,JSON.stringify([{item,event:e1,expectedHeads:[e1,e2]}])]);
  await expect(call('inventory_app_send',[e3,session,item,5,null,''])).rejects.toThrow(/já aprovado/);
 });
 it('outra empresa não lê o inventário nem registra contagens',async()=>{await as(outsider);expect((await db.query('SELECT * FROM public.inventory_app_sessions')).rows).toHaveLength(0);expect((await db.query('SELECT * FROM public.inventory_app_items')).rows).toHaveLength(0);await expect(call('inventory_app_send',[e3,session,second,1,null,''])).rejects.toThrow(/Sem permissão/);});
 it('exige todos os itens aprovados e confirmação da equipe antes de encerrar',async()=>{
  await as(manager);await expect(call('inventory_app_close',[session,true])).rejects.toThrow(/pendentes/);
  await call('inventory_app_send',[e3,session,second,3,null,'']);await call('inventory_app_approve',[session,JSON.stringify([{item:second,event:e3,expectedHeads:[e3]}])]);
  await expect(call('inventory_app_close',[session,false])).rejects.toThrow(/aparelhos/);await call('inventory_app_close',[session,true]);
  expect((await db.query<{state:string}>('SELECT state FROM public.inventory_app_sessions')).rows[0].state).toBe('CLOSED');
 });
});
