// Install test-only dependencies: npm install --prefix tmp/handelingsplan-tests @firebase/rules-unit-testing firebase
// Run with the Firestore emulator from firebase.handelingsplan-regels.json (port 8185).
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createFirestoreApi,basisCode} from '../handelingsplan-opslag.mjs';
import {today,schoolYear} from '../handelingsplan-validatie.mjs';
import {evaluatieDoelen} from '../handelingsplan-evaluatie.mjs';
const require=createRequire(new URL('../tmp/handelingsplan-tests/package.json',import.meta.url));
const {initializeTestEnvironment,assertFails}=require('@firebase/rules-unit-testing');
const sdk=require('firebase/firestore');
sdk.setLogLevel('silent');
const env=await initializeTestEnvironment({projectId:'demo-handelingsplan',firestore:{host:'127.0.0.1',port:8185,rules:fs.readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')}});
const catalog=JSON.parse(fs.readFileSync(new URL('../handelingsplan-doelen.json',import.meta.url),'utf8'));
const day=today(),year=schoolYear(day),priorYear=`${+year.slice(0,4)-1}-${year.slice(0,4)}`;
const context={bron:'zorgoverleg',schooljaar:year,klas:'2A',leerlingId:'pupil-a'};
const student={id:'pupil-a',first:'Fictieve',last:'Leerling',previousStudentId:'pupil-vorig',start:year.slice(0,4)+'-09-01',end:year.slice(5)+'-08-31'};
const p={kinddoel:'Testdoel',beginsituatie:'Beginsituatie',succescriterium:'Criteria',aanpak:'Aanpak',frequentie:'Dagelijks',verantwoordelijke:'Leerkracht',startdatum:day,evaluatiedatum:day,doelId:catalog.doelen[0].id};
const prior={schooljaar:priorYear,klas:'1A',periode:'Voorjaar',doel:'Voorgaand doel',aanpak:'Visuele steun',effect:'werkt',resultaat:'Meer zelfstandigheid',ouders:'Besproken',bron:'Overgangsbespreking'};
const path='handelingsplannen/pupil-vorig/plannen/plan-a';
let checks=0;
const check=label=>{checks++;console.log('OK '+label);};
const db=uid=>env.authenticatedContext(uid,{email:uid+'@example.test'}).firestore();
const api=(uid,weergaveRol='')=>createFirestoreApi({sdk,db:db(uid),user:{uid,email:uid+'@example.test'},catalog,weergaveRol});
async function seed(entries){await env.withSecurityRulesDisabled(async ctx=>{for(const [path,value] of Object.entries(entries))await sdk.setDoc(sdk.doc(ctx.firestore(),path),value);});}
try{
 await env.clearFirestore();
 await seed({
  'schoolrollen/teacher-a':{rol:'klasleerkracht'},'schoolrollen/teacher-b':{rol:'klasleerkracht'},'schoolrollen/secretariaat':{rol:'secretariaat'},
  ...Object.fromEntries(['directie','zorgcoordinator','zorgleerkracht','beheerder'].map(r=>['schoolrollen/'+r,{rol:r}])),
  [`klasleerkrachten/${year}_2A`]:{schooljaar:year,klas:'2A',leerkracht_uids:['teacher-a','beheerder'],leerkracht_emails:[]},
  [`klasleerkrachten/${year}_3A`]:{schooljaar:year,klas:'3A',leerkracht_uids:['teacher-b'],leerkracht_emails:[]},
  [`schoolbeheer/${year}/klassen/2A`]:{leerlingen:[student]},[`schoolbeheer/${year}/klassen/3A`]:{leerlingen:[{id:'pupil-b',first:'Ander'}]},
  [`overgangsbesprekingen/${year}/projecten/klas_2A`]:{eigenaar_uid:'teacher-a',eigenaar_email:'teacher-a@example.test',students:[{id:'fiche-a',schoolbeheerId:'pupil-vorig'}]}
 });
 const a=api('teacher-a');
 assert.deepEqual((await a({action:'leerlingen'})).klassen.map(k=>k.klas),['2A']);
 assert.equal((await a({action:'leerlingen'})).eigenKlassen,true);
 assert.deepEqual((await api('beheerder','klasleerkracht')({action:'leerlingen'})).klassen.map(k=>k.klas),['2A']);
 assert.deepEqual((await api('teacher-a','beheerder')({action:'leerlingen'})).klassen.map(k=>k.klas),['2A']);
 assert.deepEqual((await api('directie')({action:'leerlingen'})).klassen.map(k=>k.klas),['2A','3A']);
 await assert.rejects(api('secretariaat')({action:'leerlingen'}));
 assert.deepEqual((await a({action:'load',context:{...context,bron:'handelingsplan'}})).plannen,[]);
 check('Startscherm: eigen klas voor klasleerkracht, alle klassen voor directie, openen vanuit tegel');
 assert.deepEqual((await a({action:'load',context})).plannen,[]);check('Eigen klas: leeg dossier openen en gevalideerde koppeling aanmaken');
 const evaluatie={datum:day,uitgevoerd:'Oefenen',observatie:'Nog ondersteuning nodig',effect:'gedeeltelijk',doelbereik:'vooruitgang',besluit:'Verderzetten',doelen:evaluatieDoelen({...catalog.doelen[0],items:[]}).map(d=>({...d,resultaat:'nog-niet',actie:'Dagelijks inoefenen'}))};
 const save={action:'save',context,planId:'plan-a',operationId:'actie-1',expectedVersion:0,plan:p,eerdereAanpak:[prior],evaluatie};
 await a(save);await a(save);
 let loaded=await a({action:'load',context});assert.equal(loaded.plannen[0].versie,1);
 let hist=(await a({action:'history',context,planId:'plan-a'})).historiek;
 assert.equal(hist[0].evaluatie.doelen[0].actie,'Dagelijks inoefenen');
 assert.equal(loaded.plannen[0].laatsteEvaluatie.doelen[0].resultaat,'nog-niet');
 assert.equal(hist.length,1);assert.equal(hist[0].eerdereAanpak[0].klas,'1A');check('Bewaren, historiek, vroegere klas en herhaalde bewaaractie');
 await assert.rejects(a({...save,operationId:'stale'}),/collega/);check('Oude versie overschrijft geen werk van collega');
 for(const role of ['directie','zorgcoordinator','zorgleerkracht','beheerder']){
  const service=api(role);assert.equal((await service({action:'load',context})).plannen.length,1);
  const version=loaded.plannen[0].versie;
  await service({...save,operationId:'actie-'+role,expectedVersion:version,eerdereAanpak:[]});
  loaded=await service({action:'load',context});
 }check('Alle vier schoolbrede rollen kunnen raadplegen en aanvullen');
 for(const uid of ['teacher-b','secretariaat']){
  await assertFails(sdk.getDoc(sdk.doc(db(uid),path)));
  await assert.rejects(api(uid)({action:'load',context}));
 }await assertFails(sdk.getDoc(sdk.doc(env.unauthenticatedContext().firestore(),path)));check('Andere klas, secretariaat en niet-aangemelde gebruiker geweigerd');
 await assertFails(sdk.setDoc(sdk.doc(db('teacher-b'),'handelingsplanToegang/teacher-b/leerlingen/pupil-vorig'),{leerlingId:'pupil-b',dossierId:'pupil-vorig',schooljaar:year,klas:'3A',index:0}));
 await assertFails(sdk.setDoc(sdk.doc(db('teacher-b'),'handelingsplanCodes/pupil-b'),{leerlingId:'pupil-b',dossierId:'pupil-vorig',schooljaar:year,klas:'3A',index:0}));check('Vervalste koppeling naar leerling andere klas geweigerd');
 await assertFails(sdk.updateDoc(sdk.doc(db('teacher-a'),path),{aanpak:'Zonder historiek'}));
 await assertFails(sdk.deleteDoc(sdk.doc(db('teacher-a'),path)));
 await assertFails(sdk.updateDoc(sdk.doc(db('teacher-a'),path+'/historiek/actie-1'),{auteur:'Gewijzigd'}));check('Plan niet verwijderen; historie onveranderlijk; opslag zonder versie geweigerd');
 const transition={bron:'overgangsbespreking',schooljaar:year,projectId:'klas_2A',ficheId:'fiche-a'};
 assert.equal((await a({action:'load',context:transition})).plannen.length,1);check('Overgangsfiche met vorige centrale code vindt hetzelfde dossier');
 await seed({[`schoolbeheer/${year}/klassen/2A`]:{leerlingen:[{...student,verhuisdNaar:'3A'}]},[`schoolbeheer/${year}/klassen/3A`]:{leerlingen:[student]}});
 await assertFails(sdk.getDoc(sdk.doc(db('teacher-a'),path)));
 const b=api('teacher-b'),newContext={...context,klas:'3A'};
 loaded=await b({action:'load',context:newContext});assert.equal(loaded.plannen.length,1);
 await b({...save,context:newContext,expectedVersion:loaded.plannen[0].versie,operationId:'na-klaswissel',eerdereAanpak:[]});
 hist=(await b({action:'history',context:newContext,planId:'plan-a'})).historiek;
 assert.equal(hist[0].context.klas,'3A');assert.equal(hist.at(-1).context.klas,'2A');check('Klaswissel: vorige leerkracht verliest toegang, nieuwe ziet en vervolgt historiek');
 await seed({[`schoolbeheer/${year}/klassen/3A`]:{leerlingen:[{...student,end:'2000-01-01'}]}});
 await assertFails(sdk.getDoc(sdk.doc(db('teacher-b'),path)));check('Beëindigde inschrijving verliest toegang');
 await seed({[`schoolbeheer/${year}/klassen/3A`]:{leerlingen:[{...student,start:'2099-01-01'}]}});
 await assertFails(sdk.getDoc(sdk.doc(db('teacher-b'),path)));check('Toekomstige inschrijving krijgt nog geen toegang');
 // Simulates successive enrolments/repeating a year with new central IDs, retaining the stable dossier.
 for(const suffix of ['volgend-jaar','zittenblijver']){
  const next={...student,id:'pupil-'+suffix,previousStudentId:student.id,handelingsplanId:'pupil-vorig'};
  await seed({[`schoolbeheer/${year}/klassen/3A`]:{leerlingen:[next]}});
  assert.equal((await b({action:'load',context:{...newContext,leerlingId:next.id}})).plannen.length,1);
  assert.equal(basisCode(next),'pupil-vorig');
 }check('Nieuwe inschrijvingscodes en zittenblijven behouden dossier en alle versies');
 console.log(`${checks} groepen toegangs- en opslagcontroles geslaagd.`);
}finally{await env.cleanup();}
