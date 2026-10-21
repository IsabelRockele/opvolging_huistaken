import assert from 'node:assert/strict';
import {maakNieuwjaarsbrieven} from '../nieuwjaarsbrieven.js';
globalThis.window={};const alerts=[];globalThis.alert=s=>alerts.push(s);
const store=new Map(),listeners=new Map();let tick=0;
const Timestamp={now:()=>({toMillis:()=>++tick,toDate:()=>new Date()}),fromDate:d=>d};
// Stable timestamps emulate the persisted Firestore values.
Timestamp.now=()=>{const n=++tick;return {toMillis:()=>n,toDate:()=>new Date(n)};};
const controls=new Map(),events=new Map();
const page={scrollTop:0,scrollLeft:0,parentElement:null};
let table={scrollTop:0,scrollLeft:0},html='';
const content={contains:el=>el===globalThis.document.activeElement,parentElement:page,scrollTop:0,scrollLeft:0,
  get innerHTML(){return html;},
  set innerHTML(value){html=value;table={scrollTop:0,scrollLeft:0};page.scrollTop=0;page.scrollLeft=0;},
  querySelectorAll(selector){
  if(selector==='.table-wrap')return html.includes('class="table-wrap')?[table]:[];
  const attr=selector.slice(1,-1),re=new RegExp(attr+'="([^"]+)"','g');
  return [...this.innerHTML.matchAll(re)].map(m=>({dataset:{nbId:m[1],nbProcess:m[1],nbClass:m[1],nbGeen:m[1],nbReset:m[1]},value:'',addEventListener(type,fn){events.set(attr+'/'+m[1]+(type==='blur'?'/blur':''),{fn,el:this});}}));
}};
globalThis.document={getElementById:id=>id==='content'?content:controls.has(id)?controls.get(id):controls.set(id,{}).get(id)};
const ref=(...parts)=>parts.filter(p=>p!==db).map(p=>typeof p==='object'?p.path:p).join('/');
const db={};let auto=0;
const doc=(...parts)=>({path:parts.length===1?parts[0].path+'/auto'+(++auto):ref(...parts)});
const collection=(...parts)=>({path:ref(...parts)});
const snap=path=>({exists:()=>store.has(path),data:()=>store.get(path)});
function notify(){for(const [path,fn]of listeners){const list=[...store].filter(([p])=>p.startsWith(path+'/')&&p.slice(path.length+1).indexOf('/')===-1);fn(path.endsWith('nieuwjaarsbrieven')&&path.includes('/klassen/')?{docs:list.map(([p,v])=>({id:p.split('/').at(-1),data:()=>v}))}:snap(path));}}
let c={jaar:'2026-2027',klas:'1A',tab:'nieuwjaarsbrieven',secretariaat:false,klassen:['1A','2A'],leerlingen:[{id:'kind',first:'Test'}],naam:s=>s.first,gebruiker:'juf@test.be',openKlas:()=>{}};
const module=maakNieuwjaarsbrieven({db,doc,collection,Timestamp,context:()=>c,esc:String,
 onSnapshot:(r,fn)=>{listeners.set(r.path,fn);queueMicrotask(notify);return()=>listeners.delete(r.path);},
 runTransaction:async(_,fn)=>{const writes=[];await fn({get:async r=>snap(r.path),set:(r,v)=>writes.push([r.path,v]),update:(r,v)=>writes.push([r.path,{...store.get(r.path),...v}])});writes.forEach(([p,v])=>store.set(p,v));notify();}
});
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const order='schoolbeheer/2026-2027/klassen/1A/nieuwjaarsbrieven/kind';
const cfg='schoolbeheer/2026-2027/instellingen/nieuwjaarsbrieven';
async function change(n){const e=events.get('data-nb-id/kind');e.el.value=String(n);await e.fn();await settle();}
module.render();await settle();
assert.match(content.innerHTML,/Test/);assert.match(content.innerHTML,/Nog niet ingevuld/);
assert.match(content.innerHTML,/value="" placeholder="Nog niet ingevuld"/);
controls.get('nbFilter').onchange({target:{value:'ingevuld'}});
assert.ok(!content.innerHTML.includes('data-nb-id="kind"'));
controls.get('nbFilter').onchange({target:{value:'open'}});
assert.ok(!content.innerHTML.includes('data-nb-id="kind"'));
controls.get('nbFilter').onchange({target:{value:'alle'}});
await change(0);
assert.equal(store.get(order).aantal,0);assert.match(content.innerHTML,/Geen brieven gewenst/);
await change('Nog niet ingevuld');
assert.equal(store.get(order).aantal,null);
assert.match(content.innerHTML,/value="" placeholder="Nog niet ingevuld"/);
assert.ok(!content.innerHTML.includes('data-nb-reset="kind"'));
assert.ok([...store].some(([p,v])=>p.startsWith(order+'/geschiedenis/')&&v.aantal===null&&v.vorigAantal===0));
controls.get('nbFilter').onchange({target:{value:'leeg'}});
assert.ok(content.innerHTML.includes('data-nb-id="kind"'));
controls.get('nbFilter').onchange({target:{value:'ingevuld'}});
assert.ok(!content.innerHTML.includes('data-nb-id="kind"'));
controls.get('nbFilter').onchange({target:{value:'alle'}});
await change(0);
controls.get('nbFilter').onchange({target:{value:'ingevuld'}});
assert.ok(content.innerHTML.includes('data-nb-id="kind"'));
controls.get('nbFilter').onchange({target:{value:'open'}});
assert.ok(!content.innerHTML.includes('data-nb-id="kind"'));
controls.get('nbFilter').onchange({target:{value:'alle'}});
page.scrollTop=720;page.scrollLeft=12;table.scrollTop=240;table.scrollLeft=180;
await change(3);assert.equal(store.get(order).aantal,3);assert.match(content.innerHTML,/1,80/);
assert.equal(page.scrollTop,720);assert.equal(page.scrollLeft,12);
assert.equal(table.scrollTop,240);assert.equal(table.scrollLeft,180);
// Incoming live updates must preserve both the page and table position too.
notify();
assert.equal(page.scrollTop,720);assert.equal(table.scrollTop,240);assert.equal(table.scrollLeft,180);
// Arrow-key choices must keep the focused selection and table in place.
const focused=events.get('data-nb-id/kind').el;
document.activeElement=focused;
const before=content.innerHTML,oldTable=table;
focused.value='4';const first=events.get('data-nb-id/kind').fn();
focused.value='5';const second=events.get('data-nb-id/kind').fn();
await Promise.all([first,second]);await settle();
assert.equal(store.get(order).aantal,5);
assert.equal(content.innerHTML,before);assert.equal(table,oldTable);
assert.equal(controls.get('nbTotaalAantal').textContent,'5 brieven');
assert.equal(controls.get('nbTotaalAntwoord').textContent,'Alle kinderen zijn ingevuld.');
document.activeElement=null;
await events.get('data-nb-id/kind/blur').fn();await new Promise(resolve=>setTimeout(resolve,5));
assert.match(content.innerHTML,/value="5"/);
assert.ok(!content.innerHTML.includes('<option value="9"'));
assert.ok(content.innerHTML.includes('<option value="8"'));
await change(12);assert.equal(store.get(order).aantal,12);assert.match(content.innerHTML,/value="12"/);
await change(3);
c.secretariaat=true;c.gebruiker='sec@test.be';module.render();await settle();
await events.get('data-nb-process/kind').fn();await settle();assert.match(content.innerHTML,/>Verwerkt</);
c.secretariaat=false;c.gebruiker='juf@test.be';module.render();await settle();await change(1);
assert.match(content.innerHTML,/Gewijzigd/);assert.match(content.innerHTML,/3 → 1/);
await change(0);assert.match(content.innerHTML,/3 → 0/);
store.set(cfg,{prijsCent:60,deadline:'2020-01-01'});notify();
await change(4);assert.equal(store.get(order).aantal,0);assert.match(alerts.at(-1),/deadline/);
c.secretariaat=true;c.gebruiker='sec@test.be';module.render();await settle();await change(2);assert.equal(store.get(order).aantal,2);
// Reject processing when the reviewed order changed before the transaction reads it.
const process=events.get('data-nb-process/kind').fn;
store.set(order,{...store.get(order),aantal:8});await process();await settle();
assert.equal(store.get(order).verwerkt.aantal,3);assert.match(alerts.at(-1),/ondertussen gewijzigd/);
notify();store.set(cfg,{prijsCent:70,deadline:''});notify();assert.match(content.innerHTML,/5,60/);
assert.ok([...store.keys()].some(p=>p.startsWith(order+'/geschiedenis/')));
// Class totals include every order in this class, regardless of row filter.
store.set('schoolbeheer/2026-2027/klassen/1A/nieuwjaarsbrieven/ander',{aantal:4});
store.set('schoolbeheer/2026-2027/klassen/2A/nieuwjaarsbrieven/ander',{aantal:99});
c.leerlingen.push({id:'leeg',first:'Nog geen antwoord'});
notify();
assert.match(content.innerHTML,/id="nbTotaalAantal"[^>]*>12 brieven/);
assert.match(content.innerHTML,/1 kind heeft nog geen antwoord/);
controls.get('nbFilter').onchange({target:{value:'leeg'}});
assert.match(content.innerHTML,/id="nbTotaalAantal"[^>]*>12 brieven/);
module.sluit();assert.equal(listeners.size,0);
console.log('Scherm en opslag gecontroleerd: invoer, verwerking, correctie, nul, deadline, actuele prijs, geschiedenis en gelijktijdige wijziging.');
