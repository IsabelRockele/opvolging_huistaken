import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/isabe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=process.cwd(),mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json'};
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',mime[path.extname(file)]||'text/plain');res.end(fs.readFileSync(file));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const appMock=`export const initializeApp=()=>({});export const getApps=()=>[{}];export const getApp=()=>({});`;
const authMock=`
export const getAuth=()=>({get currentUser(){return window.__user;},onAuthStateChanged:fn=>{queueMicrotask(()=>fn(window.__user));return()=>{};}});
export const onAuthStateChanged=(a,fn)=>{queueMicrotask(()=>fn(window.__user));return()=>{};};
export const signOut=async()=>{window.__user=null;};
export const sendSignInLinkToEmail=async(a,email,options)=>{window.__sent.push({email,options});};
export const isSignInWithEmailLink=()=>location.search.includes('oobCode=');
export const signInWithEmailLink=async(a,email)=>{window.__signed=email;};
`;
const dbMock=`
export class Timestamp{constructor(ms){this.ms=ms;}toMillis(){return this.ms;}toDate(){return new Date(this.ms);}static fromDate(d){return new Timestamp(+d);}}
const hydrate=v=>v&&typeof v==='object'&&'_ms'in v?new Timestamp(v._ms):Array.isArray(v)?v.map(hydrate):v&&typeof v==='object'&&!(v instanceof Timestamp)?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,hydrate(x)])):v;
export const getFirestore=()=>({});
export const doc=(db,...p)=>({path:p.join('/'),id:p.at(-1)});
export const collection=doc;
const snap=r=>({...r,ref:r,exists:()=>r.path in window.__db,data:()=>hydrate(window.__db[r.path])});
export const getDocFromServer=async r=>snap(r);
export const getDocsFromServer=async r=>{const docs=Object.keys(window.__db).filter(p=>p.startsWith(r.path+'/')&&!p.slice(r.path.length+1).includes('/')).map(p=>snap({path:p,id:p.split('/').at(-1)}));return {docs,empty:!docs.length,forEach:fn=>docs.forEach(fn)};};
export const setDoc=async(r,v)=>{window.__writes.push(r.path);window.__db[r.path]=v;};
export const updateDoc=async(r,v)=>{window.__writes.push(r.path);Object.assign(window.__db[r.path],v);window.__notify?.();};
export const serverTimestamp=()=>new Timestamp(Date.now());
export const onSnapshot=(r,fn)=>{window.__notify=()=>fn(snap(r));queueMicrotask(window.__notify);return()=>{};};
`;
const contexts=[];
async function make(role='inspectie',opts={}){
 const context=await browser.newContext({viewport:{width:1400,height:1000}});contexts.push(context);
 const user={uid:role==='beheerder'?'admin':role==='secretariaat'?'sec':'inspecteur',email:role==='beheerder'?'admin@test.be':'inspecteur@test.be',emailVerified:true};
 const now=Date.now(),d=new Date(),y=d.getMonth()>=8?d.getFullYear():d.getFullYear()-1,year=`${y}-${y+1}`;
 const data={
  ['schoolrollen/'+user.uid]:{rol:role},
  'inspectiebezoeken/inspecteur@test.be':{actief:!opts.revoked,vanaf:{_ms:now-60000},tot:{_ms:now+(opts.expired?-1000:3600000)}},
  ['schoolbeheer/'+year+'/klassen/1A']:{leerlingen:[{id:'kind',first:'Test',last:'Leerling',gok:'ja',gokNote:'Onderwijsaanpak'}]},
  ['klasleerkrachten/'+year+'_1A']:{leerkracht_uids:['juf'],klas:'1A'},
  ['overgangsbesprekingen/'+year+'/projecten/juf']:{klas:'1A',students:[{firstName:'Test',lastName:'Leerling',sterktes:'Leest graag',medicalNote:'Testnotitie'}]},
  ['oudercontacten/'+year+'/projecten/juf']:{klas:'1A',oudercontacten:[{titel:'Gesprek',datum:'2026-10-21',notities:'Goede start'}]},
  ['zorgoverleggen/'+year+'/klassen/1A/maanden/2026-10']:{entries:{kind:{doel:'Lezen',aanpak:'Samen oefenen'}}},
  'zorggroepen/groep':{schooljaar:year,naam:'Leesgroep',leerlingen:[{naam:'Test Leerling',klas:'1A'}],doelen:'Vlot lezen'},
  'handelingsplanCodes/kind':{dossierId:'kind'},
  'handelingsplannen/kind/plannen/plan':{kinddoel:'Ik lees vlot',startSchooljaar:year,laatstSchooljaar:year,aanpak:'Dagelijks oefenen'},
  'handelingsplannen/kind/plannen/plan/historiek/een':{versie:1,context:{schooljaar:year},evaluatie:'Vooruitgang'}
 };
 if(opts.noRole)delete data['schoolrollen/'+user.uid];
 await context.addInitScript(({user,data})=>{window.__user=user;window.__db=data;window.__writes=[];window.__sent=[];},{user,data});
 await context.route('https://www.gstatic.com/firebasejs/**',async route=>{
  const url=route.request().url();let body=url.includes('firebase-app.js')?appMock:url.includes('firebase-auth.js')?authMock:url.includes('firebase-firestore.js')?dbMock:'';
  if(!body){await route.abort();return;}await route.fulfill({contentType:'text/javascript',body,headers:{'Access-Control-Allow-Origin':'*'}});
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 return {page,errors,year};
}
let checks=0;
try{
 const {page,errors}=await make('beheerder');
 await page.goto(base+'/inspectiebeheer.html');await page.locator('#beheer').waitFor({state:'visible'});
 fs.mkdirSync('output/inspectie',{recursive:true});await page.screenshot({path:'output/inspectie/inspectiebeheer.png',fullPage:true});
 assert.match(await page.locator('h1').textContent(),/Inspectiebezoek/);checks++;
 await page.locator('#email').fill('bezoeker@test.be');await page.getByRole('button',{name:'Toegang bewaren',exact:true}).click();
 await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Toegang bewaard'));checks++;
 assert.equal(await page.evaluate(()=>__sent.length),0);checks++;
 await page.locator('#verstuur').click();await page.waitForFunction(()=>__sent.length===1);
 assert.equal(await page.evaluate(()=>__sent[0].email),'bezoeker@test.be');checks++;
 await page.locator('#test').click();await page.waitForURL('**/inspectie.html?simulatie=1');
 await page.waitForFunction(()=>document.getElementById('status').textContent.includes('geladen.'),null,{timeout:10000}).catch(async e=>{console.log('STATUS',await page.locator('body').innerText(),errors);throw e;});
 assert.match(await page.locator('#toegang').textContent(),/TESTWEERGAVE/);checks++;
 await page.locator('details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));await page.screenshot({path:'output/inspectie/inspectie-simulatie.png',fullPage:true});
 assert.deepEqual(errors,[]);checks++;
 const rootPage=await make('beheerder');
 await rootPage.page.context().route('https://www.gstatic.com/firebasejs/**',async route=>{
  const url=route.request().url();let body=url.includes('firebase-app.js')?appMock:url.includes('firebase-auth.js')?authMock:dbMock.replace("export const onSnapshot=(r,fn)=>{","export const onSnapshot=(r,fn)=>{if(location.pathname.endsWith('index.html'))return()=>{};");
  if(url.includes('firebase-auth.js'))body+='\nexport const createUserWithEmailAndPassword=()=>{},signInWithEmailAndPassword=()=>{},sendPasswordResetEmail=()=>{},updatePassword=()=>{},updateEmail=()=>{},reauthenticateWithCredential=()=>{},EmailAuthProvider={};';
  if(url.includes('firebase-firestore.js'))body+='\nexport const getDoc=getDocFromServer,getDocs=getDocsFromServer;export const query=x=>x,where=()=>{},orderBy=()=>{},runTransaction=()=>{};export class GeoPoint{};export class Bytes{};export class DocumentReference{};';
  await route.fulfill({contentType:'text/javascript',body,headers:{'Access-Control-Allow-Origin':'*'}});
 });
 await rootPage.page.goto(base+'/index.html');
 await rootPage.page.locator('#inspectiebeheerKnop').waitFor({state:'visible'});checks++;
 await rootPage.page.getByRole('button',{name:'📖 Inspectie (alleen lezen)',exact:true}).click();
 await rootPage.page.waitForFunction(()=>document.querySelector('#overgangKeuzeKnop')?.href.includes('inspectie.html'));
 assert.equal(await rootPage.page.locator('.portaal-tegel:visible').count(),6);checks++;
 await rootPage.page.screenshot({path:'output/inspectie/startscherm-inspectie.png',fullPage:true});
 assert.deepEqual(rootPage.errors,[]);checks++;
 for(const tool of ['overgang','oudercontact','zorgoverleg','handelingsplan','groeigroepen','gok']){
  const {page,errors}=await make();await page.goto(base+'/inspectie.html?tool='+tool);
  await page.waitForFunction(()=>document.getElementById('status').textContent.includes('geladen.'));
  assert.ok(await page.locator('details.record').count()>0,tool);checks++;
  assert.equal(await page.evaluate(()=>__writes.length),0,tool+' must never write');checks++;
  assert.equal(await page.locator('textarea,[contenteditable="true"]').count(),0);checks++;
  await page.locator('details.record').first().evaluate(el=>el.open=true);
  assert.deepEqual(errors,[]);checks++;
  if(tool==='gok'){
   await page.evaluate(()=>{__db['inspectiebezoeken/inspecteur@test.be'].actief=false;__notify();});
   await page.getByRole('heading',{name:'Geen toegang'}).waitFor();assert.equal(await page.locator('#viewer').count(),0);checks++;
  }
 }
 for(const pageName of ['overgangsbespreking','oudercontact','zorgoverleg','groeigroepen','gok-overzicht','handelingsplan']){
  // Test the shared entry guard in the real page before any application code starts.
  const {page}=await make('secretariaat');
  // Unknown imports from unrelated tools are stubbed with their requested named exports.
  await page.route('https://www.gstatic.com/firebasejs/**',async route=>{
   const url=route.request().url();let body=url.includes('firebase-app.js')?appMock:url.includes('firebase-auth.js')?authMock:dbMock;
   if(url.includes('firebase-auth.js'))body+='\nexport const reauthenticateWithCredential=()=>{};export const EmailAuthProvider={};';
   if(url.includes('firebase-firestore.js'))body+='\nexport const getDoc=getDocFromServer,getDocs=getDocsFromServer;export const query=(x)=>x,where=()=>{},orderBy=()=>{},runTransaction=()=>{throw Error("Unexpected write")},deleteDoc=()=>{throw Error("Unexpected delete")};';
   await route.fulfill({contentType:'text/javascript',body,headers:{'Access-Control-Allow-Origin':'*'}});
  });
  await page.goto(base+'/'+pageName+'.html');await page.getByRole('heading',{name:'Geen toegang'}).waitFor({timeout:10000});
  assert.equal(await page.evaluate(()=>__writes.length),0);checks++;
 }
 const expired=await make('inspectie',{expired:true});await expired.page.goto(base+'/inspectie.html');await expired.page.getByRole('heading',{name:'Geen toegang'}).waitFor();checks++;
 const invited=await make('inspectie',{noRole:true});await invited.page.goto(base+'/inspectie.html');
 await invited.page.waitForFunction(()=>document.getElementById('status').textContent.includes('geladen.'));
 assert.deepEqual(await invited.page.evaluate(()=>__writes),['schoolrollen/inspecteur']);checks++;
 assert.equal(await invited.page.evaluate(()=>__db['schoolrollen/inspecteur'].rol),'inspectie');checks++;
 console.log(`${checks} schermcontroles geslaagd: beheer, uitnodiging, simulatie, zes leesvensters, secretariaat, intrekken en vervaldatum.`);
}finally{await browser.close();await new Promise(r=>server.close(r));}
