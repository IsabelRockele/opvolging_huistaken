import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {initializeApp,deleteApp} from 'firebase/app';
import {getAuth,createUserWithEmailAndPassword,signInAnonymously,deleteUser} from 'firebase/auth';
import * as f from 'firebase/firestore';
import {firebaseGame} from './.generated/firebase-game.mjs';
const config={apiKey:'AIzaSyA7KxXMvZ4dzBQDut3CMyWUblLte2tFzoQ',projectId:'huiswerkapp-a311e',authDomain:'huiswerkapp-a311e.firebaseapp.com'};
const settings={kind:'tables',words:[],tables:[2],multiply:true,divide:false,add:true,subtract:false,bridge:false,maxSplit:10,count:10};

test('online: two teachers, two children, approval, isolation, answers and reconnect', {skip:process.env.KLASRACE_LIVE_TEST!=='1',timeout:120000},async()=>{
 const require=createRequire(import.meta.url),cli=require('C:/Users/isabe/AppData/Roaming/npm/node_modules/firebase-tools/lib/auth.js');
 const account=cli.getGlobalDefaultAccount(),tokens=await cli.getAccessToken(account.tokens.refresh_token,account.tokens.scopes);
 const apps=[],roles=[],rooms=[],practices=[];f.setLogLevel('silent');
 const admin=async(path,method='GET',body)=>{
  const r=await fetch('https://firestore.googleapis.com/v1/projects/huiswerkapp-a311e/databases/(default)/documents/'+path,{method,headers:{Authorization:'Bearer '+tokens.access_token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  if(!r.ok&&r.status!==404)throw Error('Test setup/cleanup: '+r.status);return r;
 };
 async function client(isTeacher){
  const app=initializeApp(config,'klasrace-test-'+crypto.randomUUID()),auth=getAuth(app),db=f.getFirestore(app);apps.push({app,auth,db});
  if(isTeacher){await createUserWithEmailAndPassword(auth,'klasrace-test-'+crypto.randomUUID()+'@example.invalid',crypto.randomUUID()+'Aa1!');roles.push(auth.currentUser.uid);await admin('schoolrollen/'+auth.currentUser.uid,'PATCH',{fields:{rol:{stringValue:'klasleerkracht'}}});}
  else await signInAnonymously(auth);
  return {auth,db,api:firebaseGame({...f,signInAnonymously},auth,db)};
 }
 async function read(c,s,predicate=()=>true){
  for(let i=0;i<60;i++){const r=await c.api({action:'read',...s});if(!r.loading&&predicate(r))return r;await new Promise(r=>setTimeout(r,150));}throw Error('Realtime update timed out');
 }
 try{
  const a=await client(true),b=await client(true),p=await client(false),q=await client(false);
  const [ar,br]=await Promise.all([a.api({action:'create',settings,className:'TEST 2A'}),b.api({action:'create',settings,className:'TEST 2B'})]);rooms.push(ar.code,br.code);assert.notEqual(ar.code,br.code);
  const [ap,bp]=await Promise.all([p.api({action:'join',code:ar.code,name:'Test Noor'}),q.api({action:'join',code:br.code,name:'Test Milan'})]);
  assert.equal((await read(p,{code:ar.code})).me.approved,false);
  assert.equal((await read(a,ar)).players.length,0);
  await assert.rejects(f.updateDoc(f.doc(p.db,'zisa_klasrace',ar.code,'players',p.auth.currentUser.uid),{approved:true}),e=>e.code==='permission-denied');
  await assert.rejects(f.getDocs(f.collection(p.db,'zisa_klasrace',br.code,'players')),e=>e.code==='permission-denied');
  await assert.rejects(f.updateDoc(f.doc(a.db,'zisa_klasrace',br.code),{status:'ended'}),e=>e.code==='permission-denied');
  await Promise.all([a.api({action:'approve',...ar,playerId:ap.id}),b.api({action:'approve',...br,playerId:bp.id})]);
  assert.deepEqual((await read(a,ar,r=>r.players.length===1)).players.map(p=>p.name),['Test Noor']);
  assert.deepEqual((await read(b,br,r=>r.players.length===1)).players.map(p=>p.name),['Test Milan']);
  await assert.rejects(f.getDoc(f.doc(p.db,'zisa_klasrace',br.code,'private','quiz')),e=>e.code==='permission-denied');
  await assert.rejects(f.updateDoc(f.doc(p.db,'zisa_klasrace',br.code,'players',q.auth.currentUser.uid),{score:1}),e=>e.code==='permission-denied');
  assert.equal((await p.api({action:'join',code:ar.code,name:'Test Noor'})).id,ap.id);
  const wrong=await q.api({action:'join',code:ar.code,name:'Verkeerde klas'});
  await assert.rejects(a.api({action:'start',...ar}),/wachtende/);
  assert.deepEqual((await read(a,ar,r=>r.pending.length===1)).players.map(p=>p.name),['Test Noor']);
  await a.api({action:'remove',...ar,playerId:wrong.id});
  console.log('Approval and class isolation verified');await Promise.all([a.api({action:'start',...ar}),b.api({action:'start',...br})]);
  console.log('Both games started');await new Promise(r=>setTimeout(r,4300));
  const first=await read(p,{code:ar.code},r=>!!r.me.question),numbers=first.me.question.text.split(' × ').map(Number),answer=numbers[0]*numbers[1];
  await Promise.all([p.api({action:'answer',code:ar.code,index:0,answer}),p.api({action:'answer',code:ar.code,index:0,answer})]);
  assert.equal((await read(a,ar,r=>r.players[0]?.score===1)).players[0].score,1);
  assert.equal((await read(b,br)).players[0].score,0);
  const quiz=(await f.getDoc(f.doc(p.db,'zisa_klasrace',ar.code,'private','quiz'))).data().questions;
  for(let i=1;i<quiz.length;i++)await p.api({action:'answer',code:ar.code,index:i,answer:quiz[i].answer});
  assert.equal((await read(a,ar,r=>r.status==='ended')).status,'ended');
  console.log('Answers stayed isolated and the completed race ended');assert.equal((await read(b,br)).status,'running');
  console.log('One game ended independently');await b.api({action:'remove',...br,playerId:bp.id});
  await assert.rejects(f.getDoc(f.doc(q.db,'zisa_klasrace',br.code,'private','quiz')),e=>e.code==='permission-denied');
  const entry={label:'de maan',answer:'maan',article:'de',caseSensitive:false,spoken:'de maan'};
  const practice=await a.api({action:'practice-create',title:'Testdictee',entries:[entry]});practices.push(practice.id);
  assert.equal((await q.api({action:'practice-read',id:practice.id})).entries[0].answer,'maan');
  const spelling=await a.api({action:'create',className:'TEST dictee',settings:{...settings,kind:'spelling',words:['de maan'],entries:[entry],count:1}});rooms.push(spelling.code);
  const sp=await p.api({action:'join',code:spelling.code,name:'Test Noor'});await a.api({action:'approve',...spelling,playerId:sp.id});await a.api({action:'start',...spelling});
  await new Promise(r=>setTimeout(r,4300));
  await p.api({action:'answer',code:spelling.code,index:0,answer:'man'});
  assert.equal((await read(p,{code:spelling.code},r=>r.me?.mistakes===1)).me.correction,'maan');
  await assert.rejects(a.api({action:'next',...spelling}),/iedereen/);
  await p.api({action:'answer',code:spelling.code,index:0,answer:'maan'});await a.api({action:'next',...spelling});
  assert.equal((await read(a,spelling)).status,'ended');
  console.log('Spelling correction and independent practice QR verified');
 }finally{
  // Delete only the unique records created by this test.
  for(const code of rooms){for(const sub of ['players','names','private']){const response=await admin('zisa_klasrace/'+code+'/'+sub);if(response.ok){const data=await response.json();for(const d of data.documents||[])await admin(d.name.split('/documents/')[1],'DELETE');}}await admin('zisa_klasrace/'+code,'DELETE');}
  for(const id of practices)await admin('zisa_klasrace_oefenen/'+id,'DELETE');
  for(const uid of roles)await admin('schoolrollen/'+uid,'DELETE');
  for(const {app,auth,db} of apps){await f.terminate(db);if(auth.currentUser)await deleteUser(auth.currentUser);await deleteApp(app);}
 }
});
