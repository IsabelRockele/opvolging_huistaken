import fs from 'node:fs';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {createFirestoreApi} from '../handelingsplan-opslag.mjs';
const require=createRequire(new URL('../tmp/handelingsplan-tests/package.json',import.meta.url));
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,collection,getDoc,getDocs,setDoc,updateDoc,deleteDoc,Timestamp,serverTimestamp,setLogLevel}=require('firebase/firestore');
setLogLevel('silent');
const env=await initializeTestEnvironment({projectId:'demo-inspectie',firestore:{host:'127.0.0.1',port:8185,rules:fs.readFileSync('firestore.rules','utf8')}});
const db=(uid,verified=true,email=uid+'@test.be')=>env.authenticatedContext(uid,{email,email_verified:verified}).firestore();
const paths=[
 'overgangsbesprekingen/2026-2027/projecten/juf',
 'overgangsbesprekingen/2026-2027/dossiers/dossier',
 'oudercontacten/2026-2027/projecten/juf',
 'zorgoverleggen/2026-2027/klassen/1A/maanden/2026-10',
 'zorggroepen/groep',
 'handelingsplannen/leerling/plannen/plan',
 'handelingsplannen/leerling/plannen/plan/historiek/een',
 'schoolbeheer/2026-2027/klassen/1A'
];
const supportPaths=['leerkrachten/juf','schoolbeheer/2026-2027/instellingen/fototoestemming'];
let checks=0;
const ok=async p=>{await assertSucceeds(p);checks++;},no=async p=>{await assertFails(p);checks++;};
const grant=(extra={})=>({actief:true,vanaf:Timestamp.fromMillis(Date.now()-60000),tot:Timestamp.fromMillis(Date.now()+3600000),...extra});
try{
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async c=>{
  const d=c.firestore();
  for(const [uid,rol] of [['admin','beheerder'],['sec','secretariaat'],['juf','klasleerkracht'],['zorg','zorgleerkracht'],['directie','directie'],['coord','zorgcoordinator'],['expliciet','inspectie']])await setDoc(doc(d,'schoolrollen',uid),{rol});
  for(const uid of ['inspecteur','expliciet','verlopen','ingetrokken','toekomst','onbevestigd'])await setDoc(doc(d,'inspectiebezoeken',uid+'@test.be'),grant(uid==='verlopen'?{tot:Timestamp.fromMillis(Date.now()-1000)}:uid==='ingetrokken'?{actief:false}:uid==='toekomst'?{vanaf:Timestamp.fromMillis(Date.now()+60000)}:{}));
  for(const path of paths)await setDoc(doc(d,path),{schooljaar:'2026-2027',leerlingen:[],entries:{},eigenaar_uid:'juf',eigenaar_email:'juf@test.be'});
  for(const path of supportPaths)await setDoc(doc(d,path),{huistakenSignalen:{},bevestigd:true});
  await setDoc(doc(d,'schoolbeheer/2026-2027/klassen/1A'),{leerlingen:[{id:'leerling',first:'Test',last:'Leerling'}]});
  await setDoc(doc(d,'klasleerkrachten/2026-2027_1A'),{leerkracht_uids:['juf','sec'],leerkracht_emails:[]});
  await setDoc(doc(d,'handelingsplanCodes/leerling'),{dossierId:'leerling'});
  await setDoc(doc(d,'huiswerkklas/2026-2027/maanden/2026-10'),{naam:'Niet voor inspectie'});
 });
 for(const uid of ['inspecteur','expliciet'])for(const path of paths){
  await ok(getDoc(doc(db(uid),path)));
  await no(setDoc(doc(db(uid),path),{gewijzigd:true}));
  await no(updateDoc(doc(db(uid),path),{gewijzigd:true}));
  await no(deleteDoc(doc(db(uid),path)));
 }
 for(const path of supportPaths){await ok(getDoc(doc(db('inspecteur'),path)));await no(updateDoc(doc(db('inspecteur'),path),{test:true}));await no(getDoc(doc(db('verlopen'),path)));}
 const api=createFirestoreApi({sdk:require('firebase/firestore'),db:db('expliciet'),user:{uid:'expliciet',email:'expliciet@test.be'},catalog:{doelen:[]},now:()=>new Date('2026-10-21T12:00:00Z')});
 const dossier=await api({action:'load',context:{bron:'handelingsplan',schooljaar:'2026-2027',klas:'1A',leerlingId:'leerling'}});
 assert.equal(dossier.schrijfbaar,false);checks++;
 await assert.rejects(api({action:'save',context:{bron:'handelingsplan',schooljaar:'2026-2027',klas:'1A',leerlingId:'leerling'},planId:'plan'}));checks++;
 for(const uid of ['verlopen','ingetrokken','toekomst','onbevestigd'])for(const path of paths){
  await no(getDoc(doc(db(uid,uid!=='onbevestigd'),path)));
  await no(updateDoc(doc(db(uid,uid!=='onbevestigd'),path),{gewijzigd:true}));
 }
 for(const path of paths)await no(getDoc(doc(env.unauthenticatedContext().firestore(),path)));
 for(const path of paths.filter(p=>!p.startsWith('schoolbeheer/'))){
  await no(getDoc(doc(db('sec'),path)));
  await no(updateDoc(doc(db('sec'),path),{gewijzigd:true}));
 }
 for(const uid of ['inspecteur','expliciet','verlopen','ingetrokken']){
  await no(getDoc(doc(db(uid),'huiswerkklas/2026-2027/maanden/2026-10')));
  await no(setDoc(doc(db(uid),'veiligheidskopieen/test/versies/een'),{gebruiker:uid}));
  await no(setDoc(doc(db(uid),'inspectiebezoeken/ander@test.be'),grant()));
  await no(getDocs(collection(db(uid),'inspectiebezoeken')));
 }
 await ok(getDocs(collection(db('inspecteur'),'zorggroepen')));
 await ok(getDocs(collection(db('inspecteur'),'schoolbeheer/2026-2027/klassen')));
 await ok(getDocs(collection(db('inspecteur'),'handelingsplanCodes')));
 await ok(getDocs(collection(db('inspecteur'),'handelingsplannen')));
 await ok(getDoc(doc(db('inspecteur'),'inspectiebezoeken/inspecteur@test.be')));
 for(const uid of ['juf','zorg','directie','coord','admin']){
  await ok(getDoc(doc(db(uid),'zorggroepen/groep')));
  await ok(getDoc(doc(db(uid),'schoolbeheer/2026-2027/klassen/1A')));
  await ok(updateDoc(doc(db(uid),'schoolbeheer/2026-2027/klassen/1A'),{administratie:'Test'}));
 }
 for(const uid of ['zorg','directie','coord','admin'])await ok(updateDoc(doc(db(uid),'zorggroepen/groep'),{doelen:'Test'}));
 await no(updateDoc(doc(db('juf'),'zorggroepen/groep'),{doelen:'Onbevoegd'}));
 await no(getDoc(doc(db('zonderrol'),'zorggroepen/groep')));
 const ref=doc(db('admin'),'inspectiebezoeken/nieuw@test.be');
 await ok(setDoc(ref,{...grant(),gewijzigdDoor:'admin',gewijzigdOp:serverTimestamp()}));
 await ok(updateDoc(ref,{actief:false,gewijzigdDoor:'admin',gewijzigdOp:serverTimestamp()}));
 await no(setDoc(doc(db('sec'),'inspectiebezoeken/nieuw@test.be'),grant()));
 await no(deleteDoc(doc(db('admin'),'inspectiebezoeken/inspecteur@test.be')));
 await ok(setDoc(doc(db('inspecteur'),'schoolrollen/inspecteur'),{rol:'inspectie',inspectieEmail:'inspecteur@test.be'}));
 await no(updateDoc(doc(db('inspecteur'),'schoolrollen/inspecteur'),{rol:'beheerder'}));
 await no(setDoc(doc(db('verlopen'),'schoolrollen/verlopen'),{rol:'inspectie',inspectieEmail:'verlopen@test.be'}));
 await no(getDoc(doc(db('inspecteur',true,'ander@test.be'),'huiswerkklas/2026-2027/maanden/2026-10')));
 await no(updateDoc(doc(db('inspecteur',true,'ander@test.be'),'zorggroepen/groep'),{doelen:'Verboden'}));
 // A linked secretary remains excluded from care collections, while administration stays usable.
 await ok(updateDoc(doc(db('sec'),'schoolbeheer/2026-2027/klassen/1A'),{administratie:'Ongewijzigde toegang'}));
 console.log(`${checks} controles geslaagd: inspectie alleen lezen, einddatum, intrekken, e-mailverificatie, secretariaat geweigerd, personeel behouden.`);
}finally{await env.cleanup();}
