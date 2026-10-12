import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../handelingsplan.js',import.meta.url),'utf8');
const handler=source.slice(source.indexOf('form.noValidate=true;'),source.indexOf("$('herstelInvoer').onclick="));
async function run({invalid=false,failDraft=false,failApi=false,failLoad=false,confirmed=true}={}){
 const els=new Map();const $=id=>{if(!els.has(id))els.set(id,{hidden:true});return els.get(id);};
 const notices=[];let sent=0,cleared=0,backups=0,focused=false;
 const c={form:{elements:invalid?[{willValidate:true,validity:{valid:false},name:'frequentie',closest:()=>null,focus:()=>{focused=true;}}]:[]},busy:false,dossier:{schrijfbaar:true},selectedGoals:[{}],operation:null,context:{},current:{id:'test',versie:1},dirty:true,demo:false,$,uuid:()=> 'retry-id',draft:()=>{if(failDraft)throw Error('Invoerfout');return {plan:{}};},structuredClone,backupInput:()=>backups++,saveNotice:(text)=>notices.push(text),message:(text)=>notices.push(text),clearBackup:()=>cleared++,setTimeout:()=>1,clearTimeout:()=>{},window:{scrollTo:()=>{}},load:async()=>{if(failLoad)throw Error('Laadfout');},api:async()=>{sent++;if(failApi)throw Error('Geen toegang');return confirmed?{bewaard:true}:{};}};
 vm.runInNewContext(handler,c);assert.equal(c.form.noValidate,true);await c.form.onsubmit({preventDefault(){}});
 return {c,notices,sent,cleared,backups,focused,els};
}
let r=await run({invalid:true});assert.equal(r.sent,0);assert(r.focused);assert(r.notices[0].includes('frequentie'));assert.equal(r.c.dirty,true);
r=await run({failDraft:true});assert(r.notices.at(-1).includes('Invoerfout'));assert.equal(r.c.busy,false);assert.equal(r.c.dirty,true);
r=await run({failApi:true});assert(r.notices.at(-1).includes('Geen toegang'));assert.equal(r.c.dirty,true);assert.equal(r.c.operation.operationId,'retry-id');assert.equal(r.cleared,0);assert(r.backups>0);
r=await run({confirmed:false});assert.equal(r.c.dirty,true);assert.equal(r.cleared,0);
r=await run();assert.equal(r.c.dirty,false);assert.equal(r.cleared,1);assert(r.notices.at(-1).includes('Handelingsplan bewaard'));
r=await run({failLoad:true});assert.equal(r.c.dirty,false);assert(r.notices.at(-1).startsWith('Bewaard, maar'));assert.equal(r.c.current.versie,2);
console.log('Bewaren: ontbrekende velden, invoerfout, opslagfout, ontbrekende bevestiging, succes en herlaadfout gecontroleerd.');
// Temporary same-tab backup is isolated by account and pupil, and expires.
const storage=new Map(),button={};
const backupCode=source.slice(source.indexOf('function backupKey()'),source.indexOf('function saveNotice('));
const b={draftOwner:'teacher-a',demo:false,context:{leerlingId:'child-a'},dirty:true,current:{id:'plan-a',versie:1},selectedGoals:[{goal:{id:'test'},items:[]}],priorDrafts:[],evalOpen:false,operation:null,form:{elements:[{name:'aanpak',value:'Fictieve invoer'}]},sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},$:id=>id==='eerdereVelden'?{hidden:true}:button,Date,JSON};
vm.runInNewContext(backupCode,b);b.backupInput();assert.equal(b.readBackup().values.aanpak,'Fictieve invoer');
b.draftOwner='teacher-b';assert.equal(b.readBackup(),null);b.draftOwner='teacher-a';b.context={leerlingId:'child-b'};assert.equal(b.readBackup(),null);b.context={leerlingId:'child-a'};
const stored=b.readBackup();stored.time=Date.now()-86400001;storage.set(b.backupKey(),JSON.stringify(stored));assert.equal(b.readBackup(),null);
b.backupInput();b.clearBackup();assert.equal(b.readBackup(),null);
console.log('Tijdelijke invoer: opslaan, teruglezen, scheiding per account/leerling, verval en opruimen gecontroleerd.');
