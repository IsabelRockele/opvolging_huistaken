import assert from 'node:assert/strict';
import {bedrag,statusBrief,deadlineVoorbij,geldigAantal,pastInFilter,briefMaandStatus} from '../nieuwjaarsbrieven-model.mjs';
assert.equal(bedrag(3),180);
assert.equal(statusBrief(), 'Nog niet ingevuld');
assert.equal(statusBrief({aantal:3}), 'Nieuw — te verwerken');
const r={aantal:3,verwerkt:{aantal:3,bedragCent:180}};
assert.equal(statusBrief(r),'Verwerkt');
r.aantal=5;assert.match(statusBrief(r),/Gewijzigd/);
r.aantal=2;assert.match(statusBrief(r),/Gewijzigd/);
r.aantal=0;assert.match(statusBrief(r),/Gewijzigd/);
r.aantal=3;assert.match(statusBrief(r,70),/Gewijzigd/);
assert.equal(statusBrief({aantal:0}),'Geen brieven gewenst');
assert.equal(pastInFilter(undefined,'ingevuld'),false);
assert.equal(pastInFilter(undefined,'open'),false);
assert.equal(pastInFilter(undefined,'leeg'),true);
assert.equal(pastInFilter({aantal:0},'ingevuld'),true);
assert.equal(pastInFilter({aantal:0},'open'),false);
assert.equal(pastInFilter({aantal:2},'open'),true);
assert.equal(pastInFilter({aantal:0,verwerkt:{aantal:3,bedragCent:180}},'open'),true);
assert.equal(pastInFilter({aantal:3,verwerkt:{aantal:3,bedragCent:180}},'open'),false);
assert.equal(deadlineVoorbij('2026-12-01',new Date('2026-12-01T22:59:59Z')),false);
assert.equal(deadlineVoorbij('2026-12-01',new Date('2026-12-01T23:00:00Z')),true);
assert.equal(deadlineVoorbij('2026-10-21',new Date('2026-10-21T22:00:00Z')),true);
assert.equal(deadlineVoorbij('',new Date()),false);
for(const n of [-1,1.5,NaN,1000,Infinity])assert.equal(geldigAantal(n),false);
for(const n of [0,3,999])assert.equal(geldigAantal(n),true);
console.log('Bedragen, bijbestellen, verminderen tot nul, prijswijzigingen en Belgische deadline gecontroleerd.');
const tijd=iso=>({toDate:()=>new Date(iso)});
assert.equal(briefMaandStatus([]).size,0);
const maand=briefMaandStatus([
 {aantal:3,gewijzigdOp:tijd('2026-10-21T10:00:00Z')},
 {aantal:0,gewijzigdOp:tijd('2026-10-22T10:00:00Z')},
 {aantal:2,verwerkt:{aantal:3,bedragCent:180},gewijzigdOp:tijd('2026-10-31T23:15:00Z')},
 {aantal:1,verwerkt:{aantal:1,bedragCent:60},gewijzigdOp:tijd('2026-12-01T10:00:00Z')}
]);
assert.deepEqual([...maand.keys()],['2026-10','2026-11','2026-12']);
assert.equal(maand.get('2026-10').open,1);
assert.equal(maand.get('2026-11').open,1);
assert.equal(maand.get('2026-12').open,0);
assert.equal(maand.has('2027-01'),false);
console.log('Maandmappen: alleen maanden met invoer, nieuwe bestellingen, latere correcties en Belgische maandgrens gecontroleerd.');
