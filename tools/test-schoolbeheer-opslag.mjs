import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
import {voegWijzigingenSamen as merge, controleerKlasVersie, metRegistratieVersie} from '../schoolbeheer-opslag.mjs';
const html=fs.readFileSync(new URL('../schoolbeheer.html',import.meta.url),'utf8');
const clone=structuredClone;
const base=()=>({klas:'1A',schooljaar:'2026-2027',refter:{},activiteiten:[
  {id:'toneel',absent:{},attendanceConfirmed:false,price:5},
  {id:'gwp',categorie:'gwp',absent:{},attendanceConfirmed:false,price:150}
],leerlingen:[]});

test('twee stale sessies behouden elkaars refterdagen en leerlingen',()=>{
  const b=base(),a=clone(b),c=clone(b);
  a.refter={'2026-11':{anna:{'2026-11-16':true}}};
  c.refter={'2026-11':{ben:{'2026-11-17':true}}};
  const result=merge(b,c,merge(b,a,b));
  assert.equal(result.refter['2026-11'].anna['2026-11-16'],true);
  assert.equal(result.refter['2026-11'].ben['2026-11-17'],true);
});
for(const id of ['toneel','gwp'])test(`${id}: prijs, afwezigheden en andere activiteiten blijven behouden`,()=>{
  const b=base(),a=clone(b),c=clone(b);
  a.activiteiten.find(x=>x.id===id).absent.anna=true;
  c.activiteiten.find(x=>x.id===id).price=20;
  const result=merge(b,c,merge(b,a,b));
  assert.equal(result.activiteiten.find(x=>x.id===id).absent.anna,true);
  assert.equal(result.activiteiten.find(x=>x.id===id).price,20);
  assert.equal(result.activiteiten.length,2);
  c.activiteiten.find(x=>x.id===id).absent.ben=true;
  assert.deepEqual(merge(b,c,result).activiteiten.find(x=>x.id===id).absent,{anna:true,ben:true});
});
test('verwijderde activiteiten worden niet opnieuw toegevoegd; nieuwe blijven staan',()=>{
  const b=base(),a=clone(b),remote=clone(b);
  a.activiteiten[0].price=8;remote.activiteiten.shift();remote.activiteiten.push({id:'nieuw',absent:{}});
  assert.deepEqual(merge(b,a,remote).activiteiten.map(x=>x.id),['gwp','nieuw']);
});
test('een gewijzigde afwezigheid maakt gelijktijdige bevestiging ongeldig',()=>{
  const b=base(),a=clone(b),remote=clone(b);
  a.activiteiten[0].absent.anna=true;remote.activiteiten[0].attendanceConfirmed=true;
  assert.equal(merge(b,a,remote).activiteiten[0].attendanceConfirmed,false);
});

function fixture(){
  let server=base(),pause=null,fail=false;
  const writes=[],listeners=[];
  const c=vm.createContext({console,structuredClone,Map,Date,JSON,Promise,window:{addEventListener(){}},
    db:{},data:clone(server),activeClass:'1A',schooljaar:'2026-2027',saveTimer:null,
    opgeslagenBasis:clone(server),opslagBelofte:null,unsub:null,tab:'refter',
    voegWijzigingenSamen:merge,controleerKlasVersie,metRegistratieVersie,startVersieControle:()=>{},kopieDocument:clone,
    classRef:(klas=c.activeClass,jaar=c.schooljaar)=>({path:`schoolbeheer/${jaar}/klassen/${klas}`}),
    clearTimeout(){},setTimeout:()=>123,setStatus(text){c.status=text;},$:()=>({value:'2026-2027'}),
    bewaarTotVoorSchooljaar:()=>'',BEWAAR_JAREN_SCHOOLBEHEER:2,
    schoolbeheerVeiligheidskopie:async()=>{if(pause)await pause;},
    runTransaction:async(_,fn)=>{if(fail)throw Error('offline');return fn({get:async()=>({exists:()=>true,data:()=>clone(server)}),set:(ref,value)=>{writes.push(ref.path);server=clone(value);}});},
    normalize(){},renderMetScrollbehoud(){},isSecretary:()=>true,
    toonSchermLaden(){},verbergSchermLaden(){},laadMfInstellingen:async()=>{},
    luisterNaarFotoToestemming(){},renderScope(){},renderKlasPills(){},setActiveNav(){},esc:x=>x,
    lokaleBewaringTot:0,onSnapshot:(ref,cb)=>{listeners.push(cb);return ()=>{};},alert:()=>{}
  });
  const start=html.indexOf('    function markDirty()');
  vm.runInContext(html.slice(start,html.indexOf('    function maandNaam(',start)),c);
  vm.runInContext(html.slice(html.indexOf('    let klasLaadVersie='),html.indexOf('    async function toonKlasNietGestart')).replace('let klasLaadVersie=0, klasWisselBewaring=null, opslagBelofte=null, opgeslagenBasis=null;','let klasLaadVersie=0, klasWisselBewaring=null;'),c);
  return {c,writes,listeners,server:()=>server,setServer:x=>server=x,pause:()=>{let done;pause=new Promise(r=>done=r);return done;},fail:value=>fail=value};
}
test('vinkjes tijdens opslag, ook terug uitvinken, worden na elkaar bewaard',async()=>{
  const f=fixture(),done=f.pause();
  f.c.data.refter={nov:{anna:{ma:true}}};const first=f.c.saveNow();
  f.c.data.refter.nov.anna.ma=false;f.c.data.activiteiten[1].absent.ben=true;
  const second=f.c.saveNow();done();await Promise.all([first,second]);
  assert.equal(f.server().refter.nov.anna.ma,false);
  assert.equal(f.server().activiteiten[1].absent.ben,true);
  assert.equal(f.c.status,'Bewaard');
});
test('mislukte opslag behoudt vinkjes en kan opnieuw worden geprobeerd',async()=>{
  const f=fixture();f.c.data.activiteiten[0].absent.anna=true;f.fail(true);
  await assert.rejects(f.c.saveNow(),/offline/);
  assert.match(f.c.status,/Niet bewaard/);assert.equal(f.c.data.activiteiten[0].absent.anna,true);
  f.fail(false);await f.c.saveNow();assert.equal(f.server().activiteiten[0].absent.anna,true);
});
test('binnenkomende snapshot bewaart nog niet opgeslagen vinkjes',async()=>{
  const f=fixture();await f.c.window.openClass('1A');
  f.listeners[0]({exists:()=>true,data:()=>base()});
  f.c.data.activiteiten[1].absent.anna=true;f.c.saveTimer=123;
  const remote=base();remote.activiteiten[0].absent.ben=true;f.setServer(remote);
  f.listeners[0]({exists:()=>true,data:()=>clone(remote)});
  await f.c.saveNow();
  assert.equal(f.server().activiteiten[1].absent.anna,true);
  assert.equal(f.server().activiteiten[0].absent.ben,true);
});
test('klas wisselen wacht ook op reeds gestarte opslag en schrijft nooit naar doelklas',async()=>{
  const f=fixture(),done=f.pause();f.c.data.refter={nov:{anna:{ma:true}}};
  const save=f.c.saveNow(),switching=f.c.window.openClass('2A');
  assert.equal(f.c.activeClass,'1A');done();await Promise.all([save,switching]);
  assert.equal(f.c.activeClass,'2A');assert.ok(f.writes.every(path=>path.endsWith('/1A')));
});
test('klasverplaatsing blokkeert opslaan vanuit verouderde klaslijst',async()=>{
  const f=fixture();f.c.data.refter={nov:{anna:{ma:true}}};
  f.setServer({...base(),klaswisselVersie:1});await assert.rejects(f.c.saveNow(),/klas veranderd/);
  assert.equal(f.writes.length,0);
});

test('opslag blijft gebonden aan ingelezen klas en schooljaar bij veranderde navigatie',async()=>{
  const f=fixture();f.c.data.refter={nov:{anna:{ma:true}}};
  f.c.activeClass='2A';f.c.schooljaar='2027-2028';await f.c.saveNow();
  assert.deepEqual(f.writes,['schoolbeheer/2026-2027/klassen/1A']);
  assert.equal(f.server().klas,'1A');assert.equal(f.server().schooljaar,'2026-2027');
});

test('secretariaat schrijft bij prijswijziging geen verouderde refter of GWP terug',async()=>{
  let server=base();const ref={path:'schoolbeheer/2026-2027/klassen/1A'};
  const c=vm.createContext({kopieDocument:clone,voegWijzigingenSamen:merge,controleerKlasVersie,metRegistratieVersie,startVersieControle:()=>{},
    db:{},schoolbeheerVeiligheidskopie:async()=>{},
    firestoreGetDoc:async()=>{const read=clone(server);return {exists:()=>true,data:()=>clone(read)};},
    runTransaction:async(_,fn)=>fn({get:async()=>({exists:()=>true,data:()=>clone(server)}),set:(_,value)=>server=clone(value)}),
    firestoreSetDoc:()=>assert.fail('class writes must use a transaction')
  });
  vm.runInContext(html.slice(html.indexOf('    const gelezenKlasVersies'),html.indexOf('    async function deleteDoc(ref)')),c);
  const read=(await c.getDoc(ref)).data();read.activiteiten[0].price=30;
  server.refter={nov:{anna:{ma:true}}};server.activiteiten[1].absent.ben=true;
  await c.setDoc(ref,read);
  assert.equal(server.refter.nov.anna.ma,true);assert.equal(server.activiteiten[1].absent.ben,true);
  assert.equal(server.activiteiten[0].price,30);
});

test('bevestigen van een oudere GWP-lijst bevestigt geen nieuwe afwezigheden',()=>{
  const b=base(),a=clone(b),remote=clone(b);
  a.activiteiten[1].attendanceConfirmed=true;remote.activiteiten[1].absent.ben=true;
  const result=merge(b,a,remote).activiteiten[1];
  assert.equal(result.absent.ben,true);assert.equal(result.attendanceConfirmed,false);
});

for(const id of ['toneel','gwp'])test(`${id}: bevestiging blijft opgeslagen bij andere veldvolgorde vanuit Firebase`,async()=>{
  const f=fixture();
  const b=base();b.activiteiten.find(a=>a.id===id).absent={anna:true,ben:false,caro:true};
  f.c.data=clone(b);f.c.opgeslagenBasis=clone(b);
  const remote=clone(b);remote.activiteiten.find(a=>a.id===id).absent={caro:true,ben:false,anna:true};
  f.setServer(remote);
  const a=f.c.data.activiteiten.find(a=>a.id===id);
  a.attendanceConfirmed=true;a.attendanceConfirmedAt='2026-11-24T09:00:00Z';a.attendanceConfirmedBy='leerkracht';
  await f.c.saveNow();
  const stored=f.server().activiteiten.find(a=>a.id===id);
  assert.equal(stored.attendanceConfirmed,true);
  assert.equal(stored.attendanceConfirmedAt,'2026-11-24T09:00:00Z');
  assert.equal(f.c.data.activiteiten.find(a=>a.id===id).attendanceConfirmed,true);
  assert.deepEqual(stored.absent,{caro:true,ben:false,anna:true});
  // This is the same persisted confirmation the secretariat receives on reload.
  await f.c.window.openClass('1A');
  f.listeners[0]({exists:()=>true,data:()=>clone(f.server())});
  assert.equal(f.c.data.activiteiten.find(a=>a.id===id).attendanceConfirmed,true);
});

test('expliciet aanwezig en ontbrekend vinkje betekenen dezelfde aanwezigheid',()=>{
  const b=base(),local=clone(b),remote=clone(b);
  local.activiteiten[0].attendanceConfirmed=true;
  remote.activiteiten[0].absent={ben:false};
  assert.equal(merge(b,local,remote).activiteiten[0].attendanceConfirmed,true);
});

for(const duringSave of [false,true])test(`ingeplande activiteit: aanvinken en echte bevestigingsknop${duringSave?' tijdens lopende opslag':''}`,async()=>{
  const f=fixture(),b=base();
  b.activiteiten=[{id:'gepland',name:'Uitstap',date:'2026-11-24',price:5,processed:false}];
  f.c.data=clone(b);f.c.opgeslagenBasis=clone(b);f.setServer(clone(b));
  Object.assign(f.c,{
    isSecretary:()=>false,leerkrachtLijstGesloten:()=>false,activiteitDatumBereikt:()=>true,
    activeStudents:()=>[{id:'anna'},{id:'ben'}],activityMonth:'2026-11',
    document:{querySelectorAll:()=>['anna','ben'].map(sid=>({dataset:{activityId:'gepland',studentId:sid},checked:!!f.c.data.activiteiten[0].absent?.[sid]}))},
    user:{email:'teacher@example.test'},confirm:()=>true,renderActivities(){},
    alert:message=>assert.fail(message)
  });
  vm.runInContext(html.slice(html.indexOf('    window.confirmActivityAttendance ='),html.indexOf('    window.cancelActivity =')),f.c);
  f.c.data.activiteiten[0].absent={ben:false,anna:true};
  let saving,done;
  if(duringSave){done=f.pause();saving=f.c.saveNow();}
  else {await f.c.saveNow();const remote=clone(f.server());remote.activiteiten[0].absent={anna:true,ben:false};f.setServer(remote);}
  f.c.window.confirmActivityAttendance('gepland');
  assert.equal(f.c.data.activiteiten[0].attendanceConfirmed,true);
  if(done){done();await saving;}
  await f.c.saveNow();
  assert.equal(f.server().activiteiten[0].attendanceConfirmed,true);
  assert.equal(f.server().activiteiten[0].absent.anna,true);
  assert.equal(f.server().activiteiten[0].absent.ben,false);
  assert.equal(f.server().activiteiten[0].attendanceConfirmedBy,'teacher@example.test');
});
