import fs from 'node:fs';
import assert from 'node:assert/strict';
const docs=new Map(),clone=structuredClone;
const snap=ref=>({exists:()=>docs.has(ref.path),data:()=>clone(docs.get(ref.path))});
let fail=false;
globalThis.klaswisselTestFirestore={
  doc:(db,...path)=>({path:path.join('/')}),getDocFromServer:async ref=>snap(ref),
  runTransaction:async(db,fn)=>{const writes=[];await fn({get:async ref=>snap(ref),set:(ref,data)=>writes.push([ref.path,clone(data)])});if(fail)throw Error('Gesimuleerde bewaarfout');for(const [p,d] of writes)docs.set(p,d);}
};
let source=fs.readFileSync(new URL('../klaswissel.js',import.meta.url),'utf8');
source=source.replace(/^import .*firebase-firestore.js';/m,'const {doc,getDocFromServer,runTransaction}=globalThis.klaswisselTestFirestore;').replace('./klaswissel-model.mjs?v=20261005-inhoud','./klaswissel-model.mjs');
for(const f of ['klaswissel-model.mjs','fototoestemming.js'])source=source.replace(`'./${f}'`,JSON.stringify(new URL('../'+f,import.meta.url).href));
const {maakKlaswisselPlan,bewaarKlaswissel}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const jaar='2026-2027',b=`schoolbeheer/${jaar}/klassen/2A`,d=`schoolbeheer/${jaar}/klassen/1A`,bp=`overgangsbesprekingen/${jaar}/projecten/bron`,dp=`overgangsbesprekingen/${jaar}/projecten/doel`;
docs.set(b,{leerlingen:[{id:'kind',first:'Test',last:'Kind',start:'2026-09-01',end:'2027-06-30'},{id:'ander',first:'Andere',last:'Leerling'}]});
docs.set(d,{leerlingen:[{id:'doelkind',first:'Doel',last:'Leerling'}]});
docs.set(`klasleerkrachten/${jaar}_2A`,{leerkracht_uids:['bron']});docs.set(`klasleerkrachten/${jaar}_1A`,{leerkracht_uids:['doel']});
docs.set(bp,{klas:'2A',students:[{id:'fiche',schoolbeheerId:'kind',notes:'Gevulde fiche'},{id:'andere-fiche',notes:'Niet wijzigen'}]});
docs.set(dp,{klas:'1A',students:[{id:'doelfiche',notes:'Ook niet wijzigen'}]});
const zorg=`zorgoverleggen/${jaar}/klassen/2A/maanden/2026-09`,zorgDoel=`zorgoverleggen/${jaar}/klassen/1A/maanden/2026-09`;
docs.set(zorg,{entries:{kind:{notes:'September'},ander:{notes:'Andere notities'}}});
const args={jaar,van:'2A',naar:'1A',id:'kind',datum:'2026-10-05'};
const voor=clone([...docs]);
let plan=await maakKlaswisselPlan({},args);
assert.deepEqual([...docs],voor,'Controleren mag niets schrijven');
fail=true;await assert.rejects(()=>bewaarKlaswissel({},plan,'beheerder'),/bewaarfout/);assert.deepEqual([...docs],voor,'Mislukte opslag is atomair');fail=false;
docs.get(dp).students[0].notes='Nieuwe invoer door andere leerkracht';
const gelijktijdig=clone([...docs]);
await assert.rejects(()=>bewaarKlaswissel({},plan,'beheerder'),/intussen/);assert.deepEqual([...docs],gelijktijdig,'Gewijzigd dossier mag niet overschreven worden');
plan=await maakKlaswisselPlan({},args);
// Firestore kan dezelfde velden vanuit de lokale cache en server in een andere
// volgorde teruggeven. Dat is geen inhoudelijke wijziging.
const andereVeldvolgorde=v=>Array.isArray(v)?v.map(andereVeldvolgorde):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).reverse().map(([k,x])=>[k,andereVeldvolgorde(x)])):v;
for(const [pad,inhoud] of docs)docs.set(pad,andereVeldvolgorde(inhoud));
await bewaarKlaswissel({},plan,'beheerder');
assert.equal(docs.get(b).leerlingen[0].end,'2026-10-04');assert.equal(docs.get(d).leerlingen[1].start,'2026-10-05');
assert.equal(docs.get(dp).students[0].notes,'Nieuwe invoer door andere leerkracht');
assert.equal(docs.get(dp).students[1].notes,'Gevulde fiche');
assert.deepEqual(docs.get(zorg),voor.find(([p])=>p===zorg)[1]);
assert.equal(docs.get(zorgDoel).entries.kind.notes,'September');
for(const [pad] of plan.wijzigingen) {
  const backup=[...docs].find(([p,v])=>p.startsWith('veiligheidskopieen/')&&v.bronPad===pad)?.[1];
  assert.ok(backup,`Veiligheidskopie ontbreekt voor ${pad}`);
  assert.deepEqual(backup.bronData,plan.gelezen.get(pad).data);
}
await assert.rejects(()=>maakKlaswisselPlan({},args),/niet actief/);
delete globalThis.klaswisselTestFirestore;
console.log('Transactie: controle zonder schrijven, volledige overdracht met exacte veiligheidskopieën, conflicten, herhaling en bewaarfouten gecontroleerd.');
