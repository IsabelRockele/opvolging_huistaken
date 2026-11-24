import assert from 'node:assert/strict';
import {maakMaandOverzichten} from '../maandarchief.js';
import {maakBriefOverzichten} from '../nieuwjaarsbrieven-archief.mjs';

const namen=['6A','K3','2A','1B','K1','10A','3A','K2','1A'];
const verwacht=['K1','K2','K3','1A','1B','2A','3A','6A','10A'];
const klassen=namen.map(klas=>({klas,leerlingen:[]}));
for(const soort of ['refter','aankopen','activiteiten','huiswerkklas']){
  const result=maakMaandOverzichten({soort,maand:'2026-11',schooljaar:'2026-2027',klassen});
  assert.deepEqual(result.map(k=>k.klas),verwacht,soort);
}
assert.deepEqual(maakBriefOverzichten({klassen}).map(k=>k.klas),verwacht);
assert.deepEqual(klassen.map(k=>k.klas),namen,'De bronvolgorde blijft intact');
console.log('Alle vijf PDF-lijsten: kleuterklassen eerst, daarna leerjaren in numerieke volgorde.');
