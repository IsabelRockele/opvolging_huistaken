import assert from 'node:assert/strict';
import {berekenJaarbudget} from '../maximumfactuur-budget.mjs';
import {verschilBrief} from '../nieuwjaarsbrieven-model.mjs';
import {maakBriefOpvolging} from '../nieuwjaarsbrieven-opvolging.js';
const kd={vastePosten:[{prijs:10}],activiteiten:[
 {date:'2026-09-20',price:15},
 {date:'2026-12-10',price:20},
 {datum:'2027-03-20',prijs:30},
 {date:'2026-11-10',price:100,cancelled:true},
 {date:'2025-10-20',price:50},
 {date:'2026-11-20',price:0,priceUnknown:true}
]};
let b=berekenJaarbudget(kd,'2026-2027','2026-10-24',105);
assert.equal(b.besteedCent,2500);assert.equal(b.geplandCent,5000);assert.equal(b.restCent,3000);assert.equal(b.onbekend,1);
b=berekenJaarbudget(kd,'2026-2027','2026-12-11',55);
assert.equal(b.besteedCent,4500);assert.equal(b.geplandCent,3000);assert.equal(b.restCent,-2000);
assert.equal(berekenJaarbudget({activiteiten:[{price:0.1},{price:0.2}]},'2026-2027','2026-10-24',1).restCent,70);
assert.deepEqual(verschilBrief({aantal:5,verwerkt:{aantal:3,bedragCent:180}}),{aantal:2,bedragCent:120});
assert.deepEqual(verschilBrief({aantal:1,verwerkt:{aantal:3,bedragCent:180}}),{aantal:-2,bedragCent:-120});
assert.deepEqual(verschilBrief({aantal:0,verwerkt:{aantal:3,bedragCent:180}}),{aantal:-3,bedragCent:-180});
const listeners=new Map(),el={innerHTML:'',querySelectorAll:()=>[]};
globalThis.document={getElementById:()=>el};
const ref=(db,...p)=>p.join('/');
const module=maakBriefOpvolging({db:{},doc:ref,collection:ref,esc:String,openKlas:()=>{},onSnapshot:(p,fn)=>{listeners.set(p,fn);return()=>listeners.delete(p);}});
module.start('2026-2027',['1A','2A']);
const cfg='schoolbeheer/2026-2027/instellingen/nieuwjaarsbrieven';
const a='schoolbeheer/2026-2027/klassen/1A/nieuwjaarsbrieven',c='schoolbeheer/2026-2027/klassen/2A/nieuwjaarsbrieven';
const send=(path,data)=>listeners.get(path)({docs:data.map(r=>({data:()=>r}))});
listeners.get(cfg)({data:()=>({prijsCent:60})});
send(a,[{aantal:5,verwerkt:{aantal:3,bedragCent:180}},{aantal:null},{aantal:0}]);
assert.match(el.innerHTML,/ophalen/);
send(c,[{aantal:3,verwerkt:{aantal:3,bedragCent:180}}]);
assert.match(el.innerHTML,/1A — 1 te verwerken/);assert.ok(!el.innerHTML.includes('2A —'));
send(a,[{aantal:5,verwerkt:{aantal:5,bedragCent:300}}]);
assert.match(el.innerHTML,/Geen nieuwjaarsbrieven meer/);
listeners.get(cfg)({data:()=>({prijsCent:70})});
assert.match(el.innerHTML,/2A — 1 te verwerken/);
module.sluit();assert.equal(listeners.size,0);
console.log('Jaarbudget met planning, annuleringen, onbekende prijzen, overschrijding, briefcorrecties en live opvolging gecontroleerd.');
