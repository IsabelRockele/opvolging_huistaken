const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('klassen-backup.js','utf8').replace(/^import .*;\r?\n/,'').replaceAll('export function','function');
class Element{constructor(){this.children=[];this.listeners={};this.value='2026-2027';}append(e){this.children.push(e);}replaceChildren(){this.children=[];}addEventListener(k,f){this.listeners[k]=f;}querySelector(k){return nodes[k]??=new Element();}showModal(){}close(){this.listeners.close?.();}remove(){}click(){}}
let nodes;
async function test(role,fail){
 nodes={};let reads=0;const auth={currentUser:{uid:'admin'},onAuthStateChanged:()=>{}};
 const c={document:{getElementById:()=>null,querySelector:()=>new Element(),createElement:()=>new Element()},getFirestore:()=>({}),doc:(_,path,uid)=>({path,uid}),collection:(_,path)=>path,getDocFromServer:async()=>({exists:()=>true,data:()=>({rol:role})}),getDocsFromServer:async path=>{reads++;if(fail&&path.endsWith('/projecten'))throw {code:'permission-denied'};return {docs:path.endsWith('/klassen')?[{id:'2A',ref:{path:path+'/2A'},data:()=>({leerlingen:[{gok:'ja'}]})}]:[]};},Timestamp:class{},GeoPoint:class{},Bytes:class{},DocumentReference:class{},Date,Blob,URL,setTimeout};
 c.document.body=new Element();const create=c.document.createElement;c.document.createElement=()=>Object.assign(create(),{style:{}});
 vm.createContext(c);vm.runInContext(source,c);c.initKlassenBackup({options:{projectId:'huiswerkapp-a311e'}},auth);
 await nodes['#backupLezen'].onclick();
 if(role!=='beheerder'){assert.equal(reads,0);assert.match(nodes['#backupStatus'].textContent,/gestopt/);return;}
 assert.equal(reads,4);assert.equal(nodes['#backupDownload'].disabled,false);
 assert.match(nodes['#backupStatus'].textContent,fail?/ONVOLLEDIG/:/Alle opgegeven bronnen gelezen/);
 nodes['#backupSchooljaar'].oninput();assert.equal(nodes['#backupDownload'].disabled,true);
 const ts=new c.Timestamp();ts.seconds=10;ts.nanoseconds=42;assert.equal(c.backupWaarde(ts).nanoseconds,42);
}
(async()=>{await test('beheerder',false);await test('beheerder',true);await test('zorgleerkracht',false);assert(!/\b(setDoc|updateDoc|deleteDoc|runTransaction|writeBatch)\s*\(/.test(source));console.log('Volledige scan, gedeeltelijke scan, rolcontrole, reset, timestamps en alleen-lezen gecontroleerd.');})().catch(e=>{console.error(e);process.exitCode=1;});
