import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {LEERPLANDOELEN_NEDERLANDS} from '../leerplandoelen-nederlands.js';
import {LEERPLANDOELEN_WISKUNDE} from '../leerplandoelen-wiskunde.js';
import {LEERPLANDOELEN_AANVULLEND} from '../leerplandoelen-aanvullend.js';
const html=fs.readFileSync(new URL('../groeigroepen.html',import.meta.url),'utf8');
for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
  if(match[1].includes('src=')||match[1].includes('application/'))continue;
  if(match[1].includes('module'))new vm.SourceTextModule(match[2]);else new vm.Script(match[2]);
}
const elements={};
const el=id=>elements[id]??={value:'',innerHTML:'',textContent:''};
const context=vm.createContext({LEERPLANDOELEN_NEDERLANDS,LEERPLANDOELEN_WISKUNDE,LEERPLANDOELEN_AANVULLEND,
  active:{groeiplan:{geselecteerdeDoelen:[]},domeinen:[]},DOMAINEN:[],doelenKiezerConcept:null,
  $:el,esc:s=>String(s??''),normalizeGroeiplan:p=>p,collectGroeiplan:()=>{},pasRaadpleegstandToe:()=>{},
  document:{querySelector:()=>null,querySelectorAll:()=>[]},CSS:{escape:s=>s},window:{}});
vm.runInContext(html.slice(html.indexOf('const LEERPLANDOELEN_PER_GEBIED='),html.indexOf('function renderGroeiplan(){')),context);
const run=code=>vm.runInContext(code,context);
const catalog=JSON.parse(fs.readFileSync(new URL('../handelingsplan-doelen.json',import.meta.url),'utf8'));
assert.equal(Object.keys(LEERPLANDOELEN_AANVULLEND).length,8);
assert.equal(Object.values(LEERPLANDOELEN_AANVULLEND).flat().length,1569);
const all=run('alleLeerplandoelen()');assert.equal(new Set(all.map(d=>d.nummer)).size,all.length);
assert.equal(run('doelenVoorLeergebied("Nederlands")'),LEERPLANDOELEN_NEDERLANDS);
assert.equal(run('doelenVoorLeergebied("Wiskunde")'),LEERPLANDOELEN_WISKUNDE);
const old={...LEERPLANDOELEN_NEDERLANDS[0],geselecteerdeItems:['bestaande-keuze'],eigenNotitie:'Behouden'};
context.active.groeiplan.geselecteerdeDoelen=[old];const original=JSON.stringify(old);
for(const [gebied,doelen] of Object.entries(LEERPLANDOELEN_AANVULLEND)){
  for(const d of doelen){
    const source=catalog.doelen.find(g=>g.id===d.id);
    assert.equal(d.tekst,source.tekst);assert.deepEqual(d.leeftijden,source.leeftijden);assert.deepEqual(d.aanklikbareItems,source.items);
    assert.equal(context.leergebiedVoorDoel(d),gebied);
  }
  const goal=doelen.find(d=>d.aanklikbareItems.length)||doelen[0];
  el('leerplandoelGebied').value=gebied;el('leerplandoelZoek').value=goal.nummer;
  el('leerplandoelLeeftijd').value=goal.leeftijden[0]||'';
  el('leerplandoelOnderdeel').value=goal.onderwerp;
  el('leerplandoelOnderverdeling').value=goal.subthema;
  run('renderGroeiplanDoelenZoeker()');assert(el('leerplandoelenResultaten').innerHTML.includes(goal.nummer));
  context.window.ggSchakelLeerplandoel(goal.nummer,true);
  if(goal.aanklikbareItems.length)context.window.ggSchakelLeerplandoelItem(goal.nummer,0,true);
  const selected=context.active.groeiplan.geselecteerdeDoelen.find(d=>d.nummer===goal.nummer);
  assert(selected);assert.equal(selected.vakgebied,gebied);
  if(goal.aanklikbareItems.length)assert(selected.geselecteerdeItems.includes(`${goal.aanklikbareItems[0].groep}::${goal.aanklikbareItems[0].tekst}`));
  assert(context.gekozenDoelenHtml([selected],'verwijder').includes(gebied));
  context.window.ggSchakelLeerplandoel(goal.nummer,false);
  assert.equal(JSON.stringify(context.active.groeiplan.geselecteerdeDoelen[0]),original);
}
console.log('8 vakgebieden en 1569 doelen: brongegevens, filters, kiezen, MIA/begrippen, verwijderen en behoud bestaande doelen gecontroleerd.');
