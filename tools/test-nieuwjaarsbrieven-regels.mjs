import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../tmp/handelingsplan-tests/package.json',import.meta.url));
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,setDoc,updateDoc,getDoc,Timestamp}=require('firebase/firestore');
const env=await initializeTestEnvironment({projectId:'demo-nieuwjaarsbrieven',firestore:{host:'127.0.0.1',port:8185,rules:fs.readFileSync('firestore.rules','utf8')}});
const db=uid=>env.authenticatedContext(uid,{email:uid+'@test.be'}).firestore();
const pad='schoolbeheer/2026-2027/klassen/1A/nieuwjaarsbrieven/kind';
const cfg='schoolbeheer/2026-2027/instellingen/nieuwjaarsbrieven';
const order=uid=>({aantal:3,naam:'Test Kind',gewijzigdDoor:uid+'@test.be',gewijzigdOp:Timestamp.now()});
try{
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async c=>{
   for(const [uid,rol] of [['juf','klasleerkracht'],['ander','klasleerkracht'],['zorg','zorgleerkracht'],['sec','secretariaat']])await setDoc(doc(c.firestore(),'schoolrollen',uid),{rol});
   await setDoc(doc(c.firestore(),'klasleerkrachten/2026-2027_1A'),{leerkracht_uids:['juf'],leerkracht_emails:[]});
 });
 await assertSucceeds(setDoc(doc(db('juf'),pad),order('juf')));
 await assertFails(getDoc(doc(db('ander'),pad)));
 await assertFails(updateDoc(doc(db('ander'),pad),{aantal:5}));
 await assertSucceeds(setDoc(doc(db('zorg'),pad),order('zorg')));
 await assertFails(setDoc(doc(db('juf'),cfg),{prijsCent:60,deadline:'',sluitOp:null}));
 await assertFails(updateDoc(doc(db('juf'),pad),{verwerkt:{aantal:3,bedragCent:180}}));
 await assertSucceeds(updateDoc(doc(db('sec'),pad),{verwerkt:{aantal:3,bedragCent:180}}));
 await assertSucceeds(updateDoc(doc(db('juf'),pad),{aantal:0,gewijzigdDoor:'juf@test.be'}));
 await assertFails(updateDoc(doc(db('juf'),pad),{aantal:-1}));
 await assertFails(updateDoc(doc(db('juf'),pad),{aantal:1.5}));
 await assertSucceeds(setDoc(doc(db('sec'),cfg),{prijsCent:60,deadline:'2020-01-01',sluitOp:Timestamp.fromDate(new Date('2020-01-01'))}));
 await assertFails(updateDoc(doc(db('juf'),pad),{aantal:5}));
 await assertFails(updateDoc(doc(db('zorg'),pad),{aantal:5,gewijzigdDoor:'zorg@test.be'}));
 await assertSucceeds(updateDoc(doc(db('sec'),pad),{aantal:5}));
 await assertSucceeds(getDoc(doc(db('juf'),pad)));
 await assertFails(setDoc(doc(db('juf'),pad+'/geschiedenis/fake'),{actie:'aantal',gewijzigdDoor:'juf@test.be'}));
 await assertSucceeds(setDoc(doc(db('sec'),cfg),{prijsCent:70,deadline:'',sluitOp:null}));
 await assertSucceeds(updateDoc(doc(db('juf'),pad),{aantal:6}));
 await assertFails(setDoc(doc(db('sec'),cfg),{prijsCent:-1,deadline:'',sluitOp:null}));
 console.log('Rechten gecontroleerd: eigen klas, zorg alle klassen, secretariaat verwerking/instellingen, deadline en leesrechten.');
}finally{await env.cleanup();}
