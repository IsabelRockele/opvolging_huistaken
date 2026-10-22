import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {GROEP_INDELINGEN,groepIndeling} from '../groeigroepen-indeling.mjs';
const cases=[['KLS groeigroep K1 +','kleuters'],['Kls groeigroep 2 K3','kleuters'],['groeigroep K3 wiskunde - geel','kleuters'],['Taalhelden K2 + K3','kleuters'],['Taalhelden leerjaar 2','graad1'],['L1 en L2 lezen','graad1'],['L3 bewerkingen','graad2'],['L4','graad2'],['L5 en L6','graad3'],['3de graad - Leesgroep woordrijen','graad3'],['2de graad lezen','graad2'],['1ste graad','graad1'],['L2 + L3','overige'],['K3 en L1','overige'],['Onbekende naam','overige']];
for(const [naam,expected] of cases)assert.equal(groepIndeling({naam}),expected,naam);
assert.equal(groepIndeling({naam:'Taalhelden',leerlingen:[{klas:'L3A'},{klas:'L4B'}]}),'overige'); // Unknown class formats remain visible for review.
assert.equal(groepIndeling({naam:'Taalhelden',leerlingen:[{klas:'L3'},{klas:'L4'}]}),'graad2');
assert.equal(groepIndeling({naam:'K3',indeling:'graad1'}),'graad1');
const html=fs.readFileSync('groeigroepen.html','utf8');
const sample=cases.map(([naam],i)=>({id:'g'+i,naam,leerlingen:[{id:'s'+i,klas:'K2'}],domeinen:['lezen'],logboek:[{tekst:'Bestaande notitie '+i}],toetsen:[{score:4}],rapporten:{s:'Bewaren'},groeiplan:{weken:[{tekst:'Actie'}]},extraVeld:{blijft:true}}));
const original=JSON.stringify(sample),elements={groupSearch:{value:''},groups:{innerHTML:''}};
let writes=0;
const c=vm.createContext({GROEP_INDELINGEN,groepIndeling,groups:sample,active:null,tab:'basis',document:{querySelectorAll:()=>[]},$:id=>elements[id],esc:x=>String(x),studentNaam:s=>s.id,domainName:x=>x,magBewerken:()=>true,normalizeGroup:g=>g,renderWorkspace:()=>{},collectBasis:()=>{},collectGroeiplan:()=>{},persistActiveGroup:async()=>{writes++}});
vm.runInContext(html.slice(html.indexOf('const openIndelingen='),html.indexOf('function domainName(')),c);
c.renderGroups();assert.equal(JSON.stringify(sample),original);assert.equal(writes,0);
for(const g of sample)assert.equal(elements.groups.innerHTML.split('data-id="'+g.id+'"').length-1,1,'Elke groep precies eenmaal zichtbaar');
elements.groupSearch.value='Taalhelden';c.renderGroups();assert.ok(elements.groups.innerHTML.includes('Taalhelden leerjaar 2'));assert.ok(elements.groups.innerHTML.includes('data-category="graad1" open'));
c.active=sample[0];c.tab='basis';let collected=false;c.collectBasis=()=>{collected=true;c.active.naam+=' bewerkt'};await c.openGroup('g1');assert.equal(c.active.id,'g1');assert.ok(collected);assert.equal(writes,1);
c.persistActiveGroup=async()=>{throw Error('Test opslagfout')};await c.openGroup('g2');assert.equal(c.active.id,'g1','Bij opslagfout blijft huidige groep open');
sample[0].naam=cases[0][0];sample[1].naam=cases[1][0];assert.equal(JSON.stringify(sample),original,'Alle oorspronkelijke inhoud behouden naast expliciete bewerking');
// Verify the actual persistence function writes the same document with merge and all existing fields.
const p=vm.createContext({active:structuredClone(sample[0]),magBewerken:()=>true,year:()=> '2026-2027',bewaarTotVoorSchooljaar:()=> '2033-08-31',BEWAAR_JAREN_GROEIGROEP_LOGBOEK:6,maakFirebaseVeilig:x=>x,clearTimeout:()=>{},bewaarMeldingTimer:null,$:()=>null,setStatus:()=>{},setDoc:async(ref,data,options)=>{p.saved={ref,data,options}},groupRef:id=>'zorggroepen/'+id,serverTimestamp:()=> 'SERVER_TIME',user:{email:'test@example.org'},toonBewaarMelding:()=>{},console,alert:()=>{}});
vm.runInContext(html.slice(html.indexOf('async function persistActiveGroup('),html.indexOf('\nasync function carryActiveGroup',html.indexOf('async function persistActiveGroup(')))||'',p);
p.active.indeling='kleuters';await p.persistActiveGroup('Test bewaard');
assert.equal(p.saved.ref,'zorggroepen/g0');assert.equal(p.saved.options.merge,true);assert.equal(p.saved.data.indeling,'kleuters');
for(const key of ['leerlingen','logboek','toetsen','rapporten','groeiplan','extraVeld'])assert.deepEqual(p.saved.data[key],sample[0][key],key+' intact na opslag');
c.persistActiveGroup=async()=>{};c.emptyGroup=()=>({id:'nieuw',naam:'Nieuwe groeigroep',leerlingen:[],domeinen:[]});c.saveGroup=async()=>{};
await c.nieuweGroep('graad2');assert.equal(c.active.indeling,'graad2');assert.equal(c.active.id,'nieuw');
for(const g of sample)assert.ok(c.groups.some(x=>x.id===g.id),'Bestaande groep behouden bij aanmaken');
console.log('Geslaagd: indeling, alle groepen exact eenmaal zichtbaar, zoeken, behoud bestaande inhoud, opslag met merge, openen/bewerken, blokkeren bij opslagfout en nieuwe groep per graad.');
for(let leerjaar=1;leerjaar<=6;leerjaar++){
  for(const suffix of ['de','ste','e','']){
    assert.equal(groepIndeling({naam:`Taalhelden ${leerjaar}${suffix} leerjaar`,leerlingen:[{klas:'K2'}]}),'graad'+Math.ceil(leerjaar/2));
  }
}
console.log('Ook 1ste, 2de, 3de, 4de, 5de en 6de leerjaar correct ingedeeld; groepsnaam gaat voor leerlingklassen.');
