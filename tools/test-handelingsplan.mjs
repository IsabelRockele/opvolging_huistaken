import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {LEVELS,filterGoals,contextFromUrl,esc} from '../handelingsplan-model.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const data=JSON.parse(read('handelingsplan-doelen.json'));
assert.equal(data.doelen.length,3189);assert.equal(data.bronnen.length,10);
assert.equal(new Set(data.doelen.map(g=>g.id)).size,3189);
for(const goal of data.doelen){
  assert(goal.tekst&&goal.nummer&&goal.bron&&goal.rij>1);
  const filters={vakgebied:goal.vakgebied,leeftijd:goal.leeftijden[0]||'',...Object.fromEntries(LEVELS.map(l=>[l,goal[l]])),zoek:goal.nummer};
  assert(filterGoals(data.doelen,filters).some(g=>g.id===goal.id));
}
assert.equal(filterGoals(data.doelen,{vakgebied:'Bestaat niet'}).length,0);
assert.equal(esc('<script>"\''),'&lt;script&gt;&quot;&#39;');
assert.deepEqual(contextFromUrl('?bron=zorgoverleg&schooljaar=2026-2027&leerlingId=kind%2B1'),{bron:'zorgoverleg',schooljaar:'2026-2027',leerlingId:'kind+1'});
for(const file of ['zorgoverleg.html','overgangsbespreking.html','schoolbeheer.html']){
  const source=read(file);for(const match of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
    if(match[1].includes('src=')||match[1].includes('application/'))continue;
    if(match[1].includes('module'))new vm.SourceTextModule(match[2]);else new vm.Script(match[2]);
  }
  assert(source.includes(file==='schoolbeheer.html'?'handelingsplanId':'Handelingsplan'));
}
new vm.SourceTextModule(read('handelingsplan.js'));
const rollover=read('schoolbeheer.html').match(/function studentVoorNieuwSchooljaar\(s,doelSchooljaar\)\{[\s\S]*?\n    \}; \}/)[0];
const next=vm.runInNewContext(`(${rollover})`,{uid:()=> 'nieuwe-code'});
let pupil={id:'huidige-code',previousStudentId:'vorige-code',first:'Fictief'};
for(const year of ['2027-2028','2028-2029','2029-2030']){
  pupil=next(pupil,year);assert.equal(pupil.handelingsplanId,'vorige-code');assert.equal(pupil.start,year.slice(0,4)+'-09-01');
}
console.log('3189 doelen, filters, bronconsistentie, veilige tekstweergave en scripts van bestaande schermen gecontroleerd.');
