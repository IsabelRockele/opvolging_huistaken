const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const html = fs.readFileSync(require('node:path').join(__dirname, '..', 'schoolbeheer.html'), 'utf8');
function fixture() {
  const listeners=[], renders=[], writes=[];
  const content={innerHTML:''};
  const c=vm.createContext({window:{}, console, Date, Map,
    data:{klas:'1A',leerlingen:['vorige klas'],processed:{refterWeken:{week:true}}},
    activeClass:'1A',schooljaar:'2026-2027',tab:'refter',saveTimer:null,unsub:null,
    lokaleBewaringTot:Date.now()+2500,gekozenRefterWeek:'oud',
    secretariaatOpvolgModus:false,secretariaatArchiefModus:'',secretariaatAankoopCategorie:'',
    isSecretary:()=>true,clearTimeout(){},setStatus(){},toonSchermLaden(){},verbergSchermLaden(){},
    luisterNaarFotoToestemming(){},renderScope(){},renderKlasPills(){},setActiveNav(){},normalize(){},
    esc:x=>x,$:id=>id==='schooljaarInput'?{value:'2026-2027'}:content,
    classRef:()=>c.activeClass,onSnapshot:(ref,ok,err)=>{listeners.push({ref,ok,err});return ()=>{};},
    renderMetScrollbehoud:()=>renders.push({klas:c.activeClass,data:c.data,tab:c.tab,week:c.gekozenRefterWeek}),
    render:()=>{if(c.data)renders.push({klas:c.activeClass,data:c.data});},
    bewaarTotVoorSchooljaar:()=>'',BEWAAR_JAREN_SCHOOLBEHEER:2,
    setDoc:async(ref,data)=>writes.push({ref,data:structuredClone(data)}),alert:message=>{throw Error(message);}
  });
  vm.runInContext(html.slice(html.indexOf('    let klasLaadVersie='),html.indexOf('    async function toonKlasNietGestart')),c);
  vm.runInContext(html.slice(html.indexOf('    async function saveNow()'),html.indexOf('\n',html.indexOf('    async function saveNow()'))),c);
  for(const name of ['openOpvolgingRefter','openOpvolgingKlas']) {
    const start=html.indexOf('    window.'+name+'=');
    vm.runInContext(html.slice(start,html.indexOf('\n',start)),c);
  }
  c.openClass=c.window.openClass;
  const deliver=(index,klas)=>listeners[index].ok({exists:()=>true,data:()=>({klas,leerlingen:[klas]})});
  return {c,listeners,renders,writes,deliver};
}
test('nieuwe klas toont geen vorige lijst en rendert ook vlak na bewaren',async()=>{
  const f=fixture();await f.c.window.openOpvolgingRefter('2A','2026-09-14');
  assert.equal(f.c.data,null);assert.equal(f.renders.length,0);
  f.deliver(0,'2A');assert.equal(f.renders.length,1);
  assert.equal(f.renders[0].data.klas,'2A');assert.equal(f.renders[0].week,'2026-09-14');
});
test('uitgestelde verwerking wordt bij de oorspronkelijke klas opgeslagen',async()=>{
  const f=fixture();f.c.saveTimer=123;
  await f.c.window.openOpvolgingRefter('2A','2026-09-14');
  assert.equal(f.writes.length,1);assert.equal(f.writes[0].ref,'1A');
  assert.equal(f.writes[0].data.klas,'1A');assert.equal(f.writes[0].data.processed.refterWeken.week,true);
  assert.equal(f.c.saveTimer,null);f.deliver(0,'2A');assert.equal(f.c.data.klas,'2A');
});
test('late updates van de vorige klas kunnen de gekozen klas niet overschrijven',async()=>{
  const f=fixture();await f.c.window.openOpvolgingRefter('2A','2026-09-14');
  await f.c.window.openOpvolgingRefter('3A','2026-09-07');
  f.deliver(1,'3A');f.deliver(0,'2A');
  assert.equal(f.c.data.klas,'3A');assert.equal(f.renders.length,1);
});
test('ook aankopen wachten op de gekozen klasgegevens',async()=>{
  const f=fixture();await f.c.window.openOpvolgingKlas('2A','aankoop','2026-09');
  assert.equal(f.renders.length,0);f.deliver(0,'2A');
  assert.equal(f.renders[0].tab,'aankopen');assert.equal(f.renders[0].data.klas,'2A');
});
test('snel doorklikken tijdens bewaren opent alleen de laatst gekozen klas',async()=>{
  const f=fixture();let finish;
  f.c.setDoc=()=>new Promise(resolve=>{finish=resolve;});f.c.saveTimer=123;
  const first=f.c.window.openOpvolgingRefter('2A','2026-09-14');
  const last=f.c.window.openOpvolgingRefter('3A','2026-09-07');
  assert.equal(f.listeners.length,0);finish();await Promise.all([first,last]);
  assert.equal(f.listeners.length,1);assert.equal(f.listeners[0].ref,'3A');
  f.deliver(0,'3A');assert.equal(f.renders[0].week,'2026-09-07');
});
