// @vitest-environment node
import {describe,it,expect} from 'vitest';import {webcrypto} from 'node:crypto';import {readFileSync,existsSync} from 'node:fs';import {resolve} from 'node:path';import {JSDOM} from 'jsdom';
import {zipSync,unzipSync,strToU8,strFromU8} from 'fflate';import {importWorkbook,exportWorkbook} from '../src/lib/excel';import type {LocalInventory} from '../src/types';
Object.defineProperty(globalThis,'crypto',{value:webcrypto,configurable:true});
const dom=new JSDOM();Object.defineProperty(globalThis,'DOMParser',{value:dom.window.DOMParser});Object.defineProperty(globalThis,'XMLSerializer',{value:dom.window.XMLSerializer});
const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const s=(ref:string,text:string)=>`<c r="${ref}" t="inlineStr"><is><t>${text}</t></is></c>`;
const fixture=()=>zipSync({
 'xl/workbook.xml':strToU8(`<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Estoque" sheetId="1" r:id="rId1"/></sheets></workbook>`),
 'xl/_rels/workbook.xml.rels':strToU8('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml" Type="worksheet"/></Relationships>'),
 'xl/worksheets/sheet1.xml':strToU8(`<worksheet xmlns="${ns}"><dimension ref="A1:F20"/><cols><col min="2" max="2" width="22" customWidth="1"/></cols><sheetData><row r="2">${s('A2','Cabeçalho preservado')}</row><row r="8">${s('B8','Código barras')}${s('C8','Descrição')}${s('D8','Unidade')}${s('E8','Estoque')}</row><row r="10">${s('B10','000123')}${s('C10','A &amp; B')}${s('D10','KG')}<c r="E10"><v>0.25</v></c><c r="F10"><f>E10*2</f><v>0.5</v></c></row><row r="11" hidden="1"/><row r="13">${s('B13','000123')}${s('C13','Produto repetido')}${s('D13','UN')}${s('E13','-')}</row><row r="14"><c r="B14"><v>7891234567890</v></c>${s('C14','Sem estoque')}${s('D14','UN')}<c r="E14"><v>0</v></c></row></sheetData><mergeCells count="1"><mergeCell ref="A2:F2"/></mergeCells></worksheet>`),
 'xl/styles.xml':strToU8('<original-styles/>'),'docProps/custom.xml':strToU8('<original-custom/>')
});
describe('Importação e retorno ao Excel',()=>{
 it('mantém códigos textuais, linhas repetidas, saldos e linha do cabeçalho',async()=>{const parsed=await importWorkbook('negativos.xlsx',fixture());expect(parsed.items).toHaveLength(3);expect(parsed.items.map(i=>i.row)).toEqual([10,13,14]);expect(parsed.items.map(i=>i.barcode)).toEqual(['000123','000123','7891234567890']);expect(parsed.items[1].reference).toBe('-');expect(parsed.sources[0].headerRow).toBe(8);expect(new Set(parsed.items.map(i=>i.id)).size).toBe(3);});
 it('acrescenta somente as colunas novas e preserva todas as outras partes do pacote',async()=>{
  const original=fixture(),parsed=await importWorkbook('negativos.xlsx',original),item=parsed.items[0];
  const inv:LocalInventory={id:'i',name:'Teste',mode:'solo',createdAt:'',...parsed,events:[{id:'e',itemId:item.id,actor:'Teste',quantity:0,note:'A & B',parentId:null,createdAt:'2026-10-03T12:00:00Z',synced:false}],approvals:{[item.id]:'e'}};
  const out=exportWorkbook(inv,parsed.sources[0],true),before=unzipSync(original),after=unzipSync(out);
  for(const path of Object.keys(before).filter(p=>p!==parsed.sources[0].sheetPath))expect(after[path]).toEqual(before[path]);
  const parse=(bytes:Uint8Array)=>new DOMParser().parseFromString(strFromU8(bytes),'application/xml');
  const a=parse(before[parsed.sources[0].sheetPath]),b=parse(after[parsed.sources[0].sheetPath]);
  expect(b.getElementsByTagName('parsererror')).toHaveLength(0);
  for(const cell of a.getElementsByTagNameNS(ns,'c')){const copy=[...b.getElementsByTagNameNS(ns,'c')].find(c=>c.getAttribute('r')===cell.getAttribute('r'));expect(copy?.textContent).toBe(cell.textContent);expect(copy?.getAttribute('t')).toBe(cell.getAttribute('t'));}
  const cells=new Map([...b.getElementsByTagNameNS(ns,'c')].map(c=>[c.getAttribute('r'),c.textContent]));
  expect(cells.get('G10')).toBe('0');expect(cells.get('H10')).toBe('-0.25');expect(cells.get('I13')).toBe('Não contado');expect(cells.has('G13')).toBe(false);
  expect(b.getElementsByTagNameNS(ns,'mergeCell')[0].getAttribute('ref')).toBe('A2:F2');expect(b.getElementsByTagNameNS(ns,'col')[0].getAttribute('width')).toBe('22');
  expect(parsed.sources[0].bytes).toEqual(original);
  expect(()=>exportWorkbook(inv,parsed.sources[0],false)).toThrow();
 });
});
const realRoot=resolve(process.cwd(),'Planilhas');
const consolidated=resolve(process.cwd(),'outputs/01a101cd-2262-7701-8ad4-73e3f2fc329b/Cadastro-unificado-produtos.xlsx');
describe.skipIf(!existsSync(resolve(realRoot,'Estoque positivos.xlsx')))('Arquivos reais de referência',()=>{
 for(const [group,expected,header] of [['positivos',17429,1],['negativos',5740,8],['zerados',13361,1]] as const){
  it(`identifica todos os ${expected} registros de ${group}`,async()=>{const name=`Estoque ${group}.xlsx`,parsed=await importWorkbook(name,new Uint8Array(readFileSync(resolve(realRoot,name))));expect(parsed.items).toHaveLength(expected);expect(parsed.sources).toHaveLength(1);expect(parsed.sources[0].headerRow).toBe(header);if(group==='negativos')expect(parsed.items.find(i=>i.row===3942)?.reference).toBe('-');},120000);
 }
});
describe.skipIf(!existsSync(consolidated))('Cadastro consolidado',()=>{
 it('importa somente a aba Cadastro e não duplica as linhas de revisão',async()=>{
  const parsed=await importWorkbook('Cadastro-unificado-produtos.xlsx',new Uint8Array(readFileSync(consolidated)));
  expect(parsed.items).toHaveLength(36530);
  expect(parsed.sources).toHaveLength(1);
  expect(parsed.sources[0].sheet).toBe('Cadastro');
 });
});
