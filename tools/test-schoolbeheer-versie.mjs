import {test} from 'node:test';
import assert from 'node:assert/strict';
import {maakVersieControle} from '../schoolbeheer-versie.mjs';
import {metRegistratieVersie} from '../schoolbeheer-opslag.mjs';
test('serverversie bepaalt volgende revisie; brongegevens blijven intact',()=>{
 const remote={registratieVersie:8,refter:{p:true}},next={registratieVersie:2,refter:{p:true,q:true}};
 assert.deepEqual(metRegistratieVersie(remote,next),{registratieVersie:9,refter:{p:true,q:true}});
 assert.equal(next.registratieVersie,2);assert.equal(remote.registratieVersie,8);
 assert.equal(metRegistratieVersie({},{}).registratieVersie,1);
});
test('nieuwe versie wacht op onbewaarde invoer en herlaadt slechts eenmaal',async()=>{
 let dirty=true,reloads=0,waiting=0;
 const check=maakVersieControle({versie:1,leesVersie:async()=>2,magVernieuwen:()=>!dirty,vernieuw:()=>reloads++,meld:w=>waiting+=w?1:0});
 await check();assert.equal(reloads,0);assert.equal(waiting,1);
 dirty=false;await check();await check();assert.equal(reloads,1);
});
test('gelijke, oudere, ongeldige of onbereikbare versie herlaadt niet',async()=>{
 for(const version of [1,0,'2',null,undefined]){
  await maakVersieControle({versie:1,leesVersie:async()=>version,magVernieuwen:()=>true,vernieuw:()=>assert.fail(),meld:()=>assert.fail()})();
 }
 await maakVersieControle({versie:1,leesVersie:async()=>{throw Error('offline');},magVernieuwen:()=>true,vernieuw:()=>assert.fail(),meld:()=>assert.fail()})();
});
test('trage overlappende versiecontroles veroorzaken geen dubbele navigatie',async()=>{
 let release,count=0;const pending=new Promise(r=>release=r);
 const check=maakVersieControle({versie:1,leesVersie:()=>pending,magVernieuwen:()=>true,vernieuw:()=>count++,meld:()=>{}});
 const a=check(),b=check();release(2);await Promise.all([a,b]);assert.equal(count,1);
});
