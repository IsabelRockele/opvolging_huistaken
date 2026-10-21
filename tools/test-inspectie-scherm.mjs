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
export const createUserWithEmailAndPassword=()=>{},signInWithEmailAndPassword=()=>{},sendPasswordResetEmail=()=>{},updatePassword=()=>{},updateEmail=()=>{},reauthenticateWithCredential=()=>{},EmailAuthProvider={};
`;
const dbMock=`
export class Timestamp{constructor(ms){this.ms=ms;}toMillis(){return this.ms;}toDate(){return new Date(this.ms);}static fromDate(d){return new Timestamp(+d);}static now(){return new Timestamp(Date.now());}}
const hydrate=v=>v&&typeof v==='object'&&'_ms'in v?new Timestamp(v._ms):Array.isArray(v)?v.map(hydrate):v&&typeof v==='object'&&!(v instanceof Timestamp)?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,hydrate(x)])):v;
export const getFirestore=()=>({});
export const doc=(db,...p)=>({path:p.join('/'),id:p.at(-1)});
export const collection=(db,...p)=>({...doc(db,...p),kind:'collection'});
const snap=r=>({...r,ref:r,exists:()=>r.path in window.__db,data:()=>hydrate(window.__db[r.path]),get:k=>hydrate(window.__db[r.path]?.[k])});
export const getDocFromServer=async r=>snap(r);
export const getDocsFromServer=async r=>{let docs=Object.keys(window.__db).filter(p=>p.startsWith(r.path+'/')&&!p.slice(r.path.length+1).includes('/')).map(p=>snap({path:p,id:p.split('/').at(-1)}));for(const c of r.constraints||[]){if(c.type==='where')docs=docs.filter(d=>{const v=d.data()?.[c.field];return c.op==='array-contains'?(v||[]).includes(c.value):c.op==='=='?v===c.value:true;});}return {docs,size:docs.length,empty:!docs.length,forEach:fn=>docs.forEach(fn)};};
export const setDoc=async(r,v)=>{window.__writes.push(r.path);window.__db[r.path]=v;};
export const updateDoc=async(r,v)=>{window.__writes.push(r.path);Object.assign(window.__db[r.path],v);window.__notify?.();};
export const serverTimestamp=()=>new Timestamp(Date.now());
export const onSnapshot=(r,fn)=>{if(location.pathname.endsWith('index.html'))return()=>{};const notify=async()=>fn(r.kind==='collection'?await getDocsFromServer(r):snap(r));if(r.path.startsWith('inspectiebezoeken/'))window.__notify=notify;queueMicrotask(notify);return()=>{};};
export const getDoc=getDocFromServer,getDocs=getDocsFromServer;
export const query=(r,...constraints)=>({...r,constraints}),where=(field,op,value)=>({type:'where',field,op,value}),orderBy=()=>({}),limit=()=>({});
export const deleteDoc=async r=>{window.__writes.push(r.path);delete window.__db[r.path];};
export const runTransaction=async(db,fn)=>fn({get:getDocFromServer,set:setDoc,update:updateDoc,delete:deleteDoc});
export class GeoPoint{};export class Bytes{};export class DocumentReference{};
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
  ['klasleerkrachten/'+year+'_1A']:{leerkracht_uids:['juf'],leerkracht_emails:[],leerkracht_namen:['Testjuf'],klas:'1A',schooljaar:year},
  ['overgangsbesprekingen/'+year+'/projecten/juf']:{klas:'1A',students:[{id:'kind',schoolbeheerId:'kind',firstName:'Test',lastName:'Leerling',sterktes:'Leest graag',medicalNote:'Testnotitie'}]},
  ['oudercontacten/'+year+'/projecten/juf']:{klas:'1A',leerlingen:[{id:'kind',naam:'Test Leerling',schoolbeheerId:'kind'}],oudercontacten:[{id:'oc',naam:'Oudergesprek',type:'gesprek',datum:'2026-10-21',gesprekken:{kind:{nl:'Leest graag',positief:'Goede start'}}}]},
  ['zorgoverleggen/'+year+'/klassen/1A/maanden/2026-10']:{entries:{kind:{doel:'Lezen',aanpak:'Samen oefenen'}}},
  'zorggroepen/groep':{schooljaar:year,naam:'Leesgroep',leerlingen:[{id:'kind',naam:'Test Leerling',klas:'1A'}],doelen:'Vlot lezen'},
  'handelingsplanCodes/kind':{dossierId:'kind'},
  'handelingsplannen/kind/plannen/plan':{kinddoel:'Ik lees vlot',startSchooljaar:year,laatstSchooljaar:year,aanpak:'Dagelijks oefenen',status:'actief',startdatum:year.slice(0,4)+'-09-01'},
  'handelingsplannen/kind/plannen/plan/historiek/een':{versie:1,datum:'2026-10-21',context:{schooljaar:year,klas:'1A'},plan:{kinddoel:'Ik lees vlot',aanpak:'Dagelijks oefenen'}}
 };
 if(opts.noRole)delete data['schoolrollen/'+user.uid];
 await context.addInitScript(({user,data,simulatie})=>{window.__user=user;window.__db=data;window.__writes=[];window.__sent=[];if(simulatie)localStorage.setItem('lindeSimuleerRol_'+user.uid,'inspectie');},{user,data,simulatie:opts.simulatie});
 await context.route('https://www.gstatic.com/firebasejs/**',async route=>{
  const url=route.request().url();let body=url.includes('firebase-app.js')?appMock:url.includes('firebase-auth.js')?authMock:url.includes('firebase-firestore.js')?dbMock:'';
  if(!body){await route.abort();return;}await route.fulfill({contentType:'text/javascript',body,headers:{'Access-Control-Allow-Origin':'*'}});
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 return {page,errors,year};
}
let checks=0;
try{
 fs.mkdirSync('output/inspectie',{recursive:true});
 const admin=await make('beheerder');
 await admin.page.goto(base+'/inspectiebeheer.html');await admin.page.locator('#beheer').waitFor({state:'visible'});
 await admin.page.locator('#email').fill('bezoeker@test.be');await admin.page.getByRole('button',{name:'Toegang bewaren',exact:true}).click();
 await admin.page.waitForFunction(()=>document.getElementById('status').textContent.includes('Toegang bewaard'));checks++;
 assert.equal(await admin.page.evaluate(()=>__sent.length),0);checks++;
 await admin.page.locator('#verstuur').click();await admin.page.waitForFunction(()=>__sent.length===1);checks++;
 await admin.page.locator('#test').click();await admin.page.waitForURL('**/inspectie.html?simulatie=1');
 await admin.page.locator('#inspectieLeesbalk').waitFor();assert.equal(await admin.page.locator('#tools a').count(),6);checks++;
 const rootPage=await make('beheerder');await rootPage.page.goto(base+'/index.html');
 await rootPage.page.locator('#inspectiebeheerKnop').waitFor({state:'visible'});checks++;
 await rootPage.page.getByRole('button',{name:'📖 Inspectie (alleen lezen)',exact:true}).click();
 await rootPage.page.waitForFunction(()=>document.querySelector('#overgangKeuzeKnop')?.href.includes('overgangsbespreking.html'));
 assert.equal(await rootPage.page.locator('.portaal-tegel:visible').count(),6);checks++;
 assert.equal(await rootPage.page.locator('#beheerder-rolwissel').count(),0);checks++;
 assert.equal(await rootPage.page.locator('#inspectiebeheerKnop').count(),0);checks++;
 await rootPage.page.goto(base+'/index.html');
 await rootPage.page.locator('#inspectiebeheerKnop').waitFor({state:'visible'});checks++;
 await rootPage.page.getByRole('button',{name:'👩‍🏫 Klasleerkracht',exact:true}).click();
 await rootPage.page.waitForFunction(()=>localStorage.getItem('lindeSimuleerRol_admin')==='klasleerkracht');
 await rootPage.page.locator('#beheerder-rolwissel').waitFor({state:'visible'});checks++;
 assert.deepEqual(rootPage.errors,[]);checks++;
 const urls={overgang:'overgangsbespreking.html?beheerUid=juf&klas=1A',oudercontact:'oudercontact.html?beheerUid=juf&klas=1A&klasId=1A',zorgoverleg:'zorgoverleg.html',handelingsplan:'handelingsplan.html',groeigroepen:'groeigroepen.html',gok:'gok-overzicht.html'};
 for(const viewRole of ['inspectie','beheerder'])for(const tool of Object.keys(urls)){
  const {page,errors,year}=await make(viewRole,{simulatie:viewRole==='beheerder'});page.on('dialog',d=>d.dismiss());
  let url=urls[tool];if(tool==='handelingsplan')url+=`?bron=handelingsplan&schooljaar=${year}&klas=1A&leerlingId=kind`;
  await page.goto(base+'/'+url);await page.locator('#inspectieLeesbalk').waitFor();
  if(tool==='overgang'){
   await page.waitForFunction(()=>document.body.textContent.includes('Leerling'));
   await page.evaluate(()=>window.openFicheModal?.('kind'));
  }
  if(tool==='oudercontact'){
   await page.waitForFunction(()=>document.querySelector('#ocLijst')?.textContent.includes('Oudergesprek'));
   await page.evaluate(()=>window.openOc?.('oc'));
  }
  if(tool==='zorgoverleg'){
   await page.locator('#klasSelect').selectOption('1A');
   await page.waitForFunction(()=>document.querySelector('#students')?.textContent.includes('Leerling'));
  }
  if(tool==='groeigroepen'){
   await page.locator('#groups .group-card').first().click();await page.locator('#workspace').waitFor({state:'visible'});
  }
  if(tool==='handelingsplan'){
   await page.locator('[data-plan]').first().click();await page.locator('#editor').waitFor({state:'visible'});
   assert.equal(await page.locator('#planVelden').evaluate(el=>el.disabled),true);checks++;
  }
  if(tool==='gok'){
   await page.evaluate(()=>window.openKlas('1A'));await page.waitForFunction(()=>document.querySelector('#inhoud')?.textContent.includes('Leerling'));
  }
  await page.waitForTimeout(400);
  assert.deepEqual(errors,[],tool);checks++;
  assert.equal(await page.evaluate(()=>__writes.length),0,tool+' must not write');checks++;
  assert.equal(await page.getByText('Terug als beheerder',{exact:true}).count(),0);checks++;
  assert.equal(await page.locator('textarea:not([readonly]):not(:disabled)').count(),0,tool);checks++;
  await page.screenshot({path:'output/inspectie/'+tool+'-'+viewRole+'-vertrouwd.png',fullPage:true});
  if(tool==='gok'&&viewRole==='inspectie'){
   await page.evaluate(()=>{__db['inspectiebezoeken/inspecteur@test.be'].actief=false;__notify();});
   await page.getByRole('heading',{name:'Geen toegang'}).waitFor();checks++;
  }
 }
 for(const name of Object.values(urls)){
  const {page}=await make('secretariaat');await page.goto(base+'/'+name);await page.getByRole('heading',{name:'Geen toegang'}).waitFor();
  assert.equal(await page.evaluate(()=>__writes.length),0);checks++;
 }
 const expired=await make('inspectie',{expired:true});await expired.page.goto(base+'/inspectie.html');await expired.page.getByRole('heading',{name:'Geen toegang'}).waitFor();checks++;
 console.log(`${checks} schermcontroles geslaagd: vertrouwde tools, dezelfde fiches in leesstand, geen schrijfacties, secretariaat en vervaldatum.`);
}finally{await browser.close();await new Promise(r=>server.close(r));}
