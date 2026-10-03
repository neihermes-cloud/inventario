import {unzipSync,zipSync,strFromU8,strToU8} from 'fflate';
import type {Item,LocalInventory,Source} from '../types';
import {difference,finalEvent,heads,status} from './counts';
const NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL='http://schemas.openxmlformats.org/package/2006/relationships';
const RID='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
function xml(bytes:Uint8Array){const doc=new DOMParser().parseFromString(strFromU8(bytes),'application/xml');if(doc.getElementsByTagName('parsererror').length)throw new Error('O Excel contém uma estrutura XML inválida.');return doc;}
function normalized(text:string){return text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');}
export function columnNumber(ref:string){return [...ref.replace(/\d/g,'')].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0);}
export function columnName(n:number){let s='';while(n>0){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26);}return s;}
function packageFiles(bytes:Uint8Array){let total=0;return unzipSync(bytes,{filter:f=>{total+=f.originalSize;if(total>128*1024*1024)throw new Error('Arquivo expandido excede 128 MB. Divida a importação.');return true;}});}
function decodeXml(value:string){return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'");}
function attr(raw:string,name:string){const match=raw.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`));return match?decodeXml(match[1]):'';}
function sharedStrings(files:Record<string,Uint8Array>){
 if(!files['xl/sharedStrings.xml'])return [];
 const text=strFromU8(files['xl/sharedStrings.xml']);
 return [...text.matchAll(/<(?:[A-Za-z_][\w.-]*:)?si\b[^>]*>([\s\S]*?)<\/(?:[A-Za-z_][\w.-]*:)?si>/g)].map(match=>[...match[1].matchAll(/<(?:[A-Za-z_][\w.-]*:)?t\b[^>]*>([\s\S]*?)<\/(?:[A-Za-z_][\w.-]*:)?t>/g)].map(t=>decodeXml(t[1])).join(''));
}
type RawCell={ref:string;type:string;value:string};
type RawRow={number:number;cells:RawCell[]};
function sheetRows(bytes:Uint8Array){
 const text=strFromU8(bytes),rows:RawRow[]=[];
 for(const rowMatch of text.matchAll(/<(?:[A-Za-z_][\w.-]*:)?row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:[A-Za-z_][\w.-]*:)?row>)/g)){
  const number=Number(attr(rowMatch[1],'r'));if(!number)continue;
  const cells:RawCell[]=[];const body=rowMatch[2]??'';
  for(const cellMatch of body.matchAll(/<(?:[A-Za-z_][\w.-]*:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:[A-Za-z_][\w.-]*:)?c>)/g)){
   const raw=cellMatch[1],content=cellMatch[2]??'',v=content.match(/<(?:[A-Za-z_][\w.-]*:)?v\b[^>]*>([\s\S]*?)<\/(?:[A-Za-z_][\w.-]*:)?v>/)?.[1]??'',inline=[...content.matchAll(/<(?:[A-Za-z_][\w.-]*:)?t\b[^>]*>([\s\S]*?)<\/(?:[A-Za-z_][\w.-]*:)?t>/g)].map(t=>decodeXml(t[1])).join('');
   cells.push({ref:attr(raw,'r'),type:attr(raw,'t'),value:inline||decodeXml(v)});
  }
  rows.push({number,cells});
 }
 return rows;
}
function cellValue(c:RawCell,strings:string[]):string|number {
 const value=c.type==='s'?strings[Number(c.value)]??'':c.type==='inlineStr'?c.value:c.value;
 return c.type==='str'||c.type==='e'||c.type==='inlineStr'||value===''||!Number.isFinite(Number(value))?value:Number(value);
}
function code(value:string|number|undefined){return value===undefined?'':String(value).trim();}
const aliases={description:['descricaodoproduto','descricao','produto','nome'],unit:['unidade','un','und'],reference:['estoquereferencia','estoque','estoqatual','estoqueatual','saldo','saldoestoque'],productCode:['codigoproduto','codigodoproduto','codigointerno'],barcode:['codigobarras','codigodebarras','codbarras','ean'],issue:['ocorrenciadecadastro'],candidates:['codigosbarrascandidatos'],sourceFile:['arquivocodigobarras'],sourceRow:['linhacodigobarras']};
type Mapping=Partial<Record<keyof typeof aliases,number>>;
export async function importWorkbook(name:string,bytes:Uint8Array):Promise<{sources:Source[];items:Item[]}>{
 if(!name.toLowerCase().endsWith('.xlsx'))throw new Error('Nesta primeira versão, use arquivos .xlsx. As exportações antigas .xls podem ser usadas por meio do cadastro consolidado.');
 if(bytes.byteLength>30*1024*1024)throw new Error('O arquivo excede 30 MB. Divida-o antes de importar.');
 const files=packageFiles(bytes);if(!files['xl/workbook.xml'])throw new Error('Este arquivo não é um Excel .xlsx válido.');
 const workbook=xml(files['xl/workbook.xml']),rels=xml(files['xl/_rels/workbook.xml.rels']);
 const links=new Map([...rels.getElementsByTagNameNS(REL,'Relationship')].map(r=>[r.getAttribute('Id'),r.getAttribute('Target')??'']));
 const strings=sharedStrings(files),sources:Source[]=[],items:Item[]=[];
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes.slice().buffer as ArrayBuffer))].map(n=>n.toString(16).padStart(2,'0')).join('');
 const sheets=[...workbook.getElementsByTagNameNS(NS,'sheet')];
 const hasCadastro=sheets.some(sh=>normalized(sh.getAttribute('name')??'')==='cadastro');
 for(const sh of sheets){
  const sheetName=sh.getAttribute('name')??'';
  if(hasCadastro&&/^(resumo|revisao|revisão)$/i.test(sheetName.trim()))continue;
  const target=links.get(sh.getAttributeNS(RID,'id'))??'';
  const sheetPath=target.startsWith('/')?target.slice(1):'xl/'+target.replace(/^\.\//,'');
  if(!files[sheetPath])continue;
  const rows=sheetRows(files[sheetPath]);
  let headerRow=0,mapping:Mapping={},lastColumn=0;
  for(const row of rows){
   for(const c of row.cells)lastColumn=Math.max(lastColumn,columnNumber(c.ref||'A1'));
   if(row.number>30||headerRow)continue;
   const candidate:Mapping={};
   for(const c of row.cells){
    const title=normalized(String(cellValue(c,strings)));
    for(const [key,labels] of Object.entries(aliases))if(labels.includes(title))candidate[key as keyof Mapping]=columnNumber(c.ref||'A1');
   }
   if(candidate.description&&candidate.unit&&candidate.reference&&(candidate.productCode||candidate.barcode)){headerRow=row.number;mapping=candidate;}
  }
  if(!headerRow)continue;
  if(lastColumn>16378)throw new Error('Não há espaço para acrescentar seis colunas a esta aba.');
  const sourceId=crypto.randomUUID(),before=items.length;
  for(const row of rows){
   const rowNumber=row.number;if(rowNumber<=headerRow)continue;
   const cells=new Map(row.cells.map(c=>[columnNumber(c.ref||'A1'),cellValue(c,strings)]));
   const description=code(cells.get(mapping.description!));if(!description)continue;
   const reference=cells.get(mapping.reference!)??'';
   const unit=code(cells.get(mapping.unit!));
   const barcode=code(cells.get(mapping.barcode??0)),productCode=code(cells.get(mapping.productCode??0));
   const warnings=[code(cells.get(mapping.issue??0)),!barcode&&!productCode?'Sem código na origem':'',!unit?'Unidade não informada':'',typeof reference!=='number'?'Saldo de referência não numérico':''].filter(Boolean);
   items.push({id:crypto.randomUUID(),sourceId,row:rowNumber,description,unit,barcode,productCode,reference,issue:warnings.join('. '),candidateCodes:code(cells.get(mapping.candidates??0)),sourceFile:code(cells.get(mapping.sourceFile??0)),sourceRow:typeof cells.get(mapping.sourceRow??0)==='number'?Number(cells.get(mapping.sourceRow!)):undefined});
  }
  if(items.length>before)sources.push({id:sourceId,name,hash,bytes,sheet:sh.getAttribute('name')??'',sheetPath,headerRow,lastColumn,rows:items.length-before});
 }
 if(!items.length)throw new Error('Não encontrei cabeçalhos de código, descrição, unidade e estoque. Use os modelos já analisados ou o Cadastro consolidado.');
 return {sources,items};
}
const labels=['Quantidade contada','Diferença','Situação da contagem','Responsável','Data/hora da contagem','Observação da contagem'];
export function exportWorkbook(inv:LocalInventory,source:Source,partial=false):Uint8Array {
 if(!partial&&(!inv.closed||inv.items.some(i=>!inv.approvals[i.id])))throw new Error('A exportação final exige todos os itens aprovados e o inventário encerrado.');
 const files=packageFiles(source.bytes),doc=xml(files[source.sheetPath]),sheetData=doc.getElementsByTagNameNS(NS,'sheetData')[0];
 if(!sheetData)throw new Error('A aba original não foi encontrada.');
 const rowMap=new Map([...sheetData.getElementsByTagNameNS(NS,'row')].map(r=>[Number(r.getAttribute('r')),r]));
 function write(rowNumber:number,col:number,value:string|number|undefined){
  if(value===undefined)return;let row=rowMap.get(rowNumber);
  if(!row){row=doc.createElementNS(NS,'row');row.setAttribute('r',String(rowNumber));const next=[...sheetData.children].find(r=>Number(r.getAttribute('r'))>rowNumber);sheetData.insertBefore(row,next??null);rowMap.set(rowNumber,row);}
  const ref=columnName(col)+rowNumber;if([...row.children].some(c=>c.getAttribute('r')===ref))throw new Error('A coluna de exportação já contém dados.');
  const c=doc.createElementNS(NS,'c');c.setAttribute('r',ref);
  if(typeof value==='number'){const v=doc.createElementNS(NS,'v');v.textContent=String(value);c.append(v);}
  else {c.setAttribute('t','inlineStr');const is=doc.createElementNS(NS,'is'),t=doc.createElementNS(NS,'t');t.setAttributeNS('http://www.w3.org/XML/1998/namespace','xml:space','preserve');t.textContent=value;is.append(t);c.append(is);}
  row.append(c);
 }
 labels.forEach((label,k)=>write(source.headerRow,source.lastColumn+k+1,label));
 for(const item of inv.items.filter(i=>i.sourceId===source.id)){
  const h=heads(inv.events,item.id),event=finalEvent(inv,item.id)??(partial&&h.length===1?h[0]:undefined);
  const state=status(inv,item.id),words={pending:'Não contado',counted:'Contado, não aprovado',conflict:'Conflito: revisar',approved:'Aprovado'};
  const values=[event?.quantity,event?difference(event.quantity,item.reference)??undefined:undefined,words[state],event?.actor,event?new Date(event.createdAt).toLocaleString('pt-BR'):undefined,event?.note];
  values.forEach((value,k)=>write(item.row,source.lastColumn+k+1,value));
 }
 for(const rowNumber of [source.headerRow,...inv.items.filter(i=>i.sourceId===source.id).map(i=>i.row)])rowMap.get(rowNumber)?.removeAttribute('spans');
 const dimension=doc.getElementsByTagNameNS(NS,'dimension')[0];
 if(dimension){const ref=dimension.getAttribute('ref')??'A1';const maxRow=[...rowMap.keys()].reduce((n,r)=>Math.max(n,r),Number(ref.split(':').pop()?.replace(/\D/g,''))||0);dimension.setAttribute('ref',`A1:${columnName(source.lastColumn+6)}${maxRow}`);}
 files[source.sheetPath]=strToU8(new XMLSerializer().serializeToString(doc));
 return zipSync(files,{level:6});
}
export function download(bytes:Uint8Array,name:string,mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'){
 const url=URL.createObjectURL(new Blob([bytes.slice().buffer as ArrayBuffer],{type:mime})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
}
