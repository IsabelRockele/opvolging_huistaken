import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const periodSource=fs.readFileSync('refter-periodes.js','utf8');
const api=await import('data:text/javascript;base64,'+Buffer.from(periodSource).toString('base64'));
const {periodeStart,periodeDagen,periodeEind,periodes,periodeRecord,splitsOudeRecords,magBevestigen}=api;
const vrij=d=>[0,3,6].includes(new Date(d+'T12:00:00Z').getUTCDay());
assert.deepEqual(periodeDagen('2026-09-28'),['2026-09-28','2026-09-29','2026-09-30']);
assert.deepEqual(periodeDagen('2026-10-01'),['2026-10-01','2026-10-02']);
assert.equal(magBevestigen('2026-09-28','2026-09-28',vrij),false);
assert.equal(magBevestigen('2026-09-28','2026-09-29',vrij),false);
assert.equal(magBevestigen('2026-09-28','2026-09-30',vrij),true);
assert.equal(magBevestigen('2026-10-01','2026-10-02',vrij),false);
assert.equal(magBevestigen('2026-10-01','2026-10-05',vrij),true);
assert.equal(periodeStart('2026-11-01'),'2026-10-26');
for(const year of [2025,2026,2027,2028]){
 const van=year+'-09-01',tot=(year+1)+'-06-30',ps=periodes(van,tot),days=ps.flatMap(periodeDagen).filter(d=>d>=van&&d<=tot);
 assert.equal(new Set(days).size,days.length);
 for(const p of ps){assert.ok(periodeDagen(p).every(d=>d.slice(0,7)===p.slice(0,7)));assert.ok(periodeDagen(p).length<=5);}
}
const old={'2026-09-28':{door:'test'}};assert.ok(periodeRecord(old,'2026-10-01'));splitsOudeRecords(old);assert.ok(old['2026-10-01']);assert.equal(old['2026-09-28'].periodeTot,'2026-09-30');delete old['2026-10-01'];assert.equal(periodeRecord(old,'2026-10-01'),null);assert.ok(periodeRecord(old,'2026-09-28'));
const source=fs.readFileSync('schoolbeheer.html','utf8');
const code=source.slice(source.indexOf('    function refterWeekDagen('),source.indexOf('    async function laadRefterWeekStatus('));
let vandaag='2026-09-30',secretary=false;
const data={refter:{},refterBevestigingen:{},processed:{refterWeken:{}}};
for(const p of periodes('2026-09-01','2026-09-27'))data.processed.refterWeken[p]={periodeTot:periodeEind(p)};
const ctx={...api,window:{},data,schooljaar:'2026-2027',startDate:()=> '2026-09-01',endDate:()=> '2027-06-30',isoDatum:()=>vandaag,datumPlusDagen:api.plusDag,maandagVan:d=>api.plusDag(d,-((new Date(d+'T12:00:00Z').getUTCDay()+6)%7)),isFree:(d,b)=>vrij(d)||(b?.vrijeDagen||[]).some(v=>v.start<=d&&v.end>=d),algemeneVrijeDag:(d,b)=>vrij(d)||(b?.vrijeDagen||[]).some(v=>v.start<=d&&v.end>=d),isSecretary:()=>secretary,gekozenRefterWeek:'',secretariaatOpvolgModus:false,user:{uid:'test'},activeClass:'2A',markDirty:()=>{},renderRefter:()=>{},confirm:()=>true,alert:m=>{throw Error(m)},formatDate:d=>d,esc:s=>s,maandNaam:m=>m};
vm.createContext(ctx);vm.runInContext(code,ctx);
assert.equal(ctx.standaardRefterWeek(),'2026-09-28');assert.ok(ctx.refterWoensdagBlok('2026-09-28').includes('afsluiten'));
vandaag='2026-10-01';assert.equal(ctx.standaardRefterWeek(),'2026-09-28');
vandaag='2026-09-30';ctx.window.bevestigRefterWeek('2026-09-28');assert.equal(data.refterBevestigingen['2026-09-28'].periodeTot,'2026-09-30');assert.equal(ctx.refterWeekBevestiging('2026-10-01'),null);
secretary=true;assert.ok(ctx.refterWekenVoorOpvolging(data,false).includes('2026-09-28'));ctx.window.toggleRefterWeekVerwerkt('2026-09-28');assert.equal(ctx.refterWeekVerwerkt('2026-09-28'),true);assert.equal(ctx.refterWeekVerwerkt('2026-10-01'),false);
secretary=false;vandaag='2026-10-01';assert.equal(ctx.standaardRefterWeek(),'2026-10-01');
vandaag='2026-10-05';assert.equal(ctx.verplichteRefterWeek(),'2026-10-01');ctx.window.bevestigRefterWeek('2026-10-01');assert.ok(data.refterBevestigingen['2026-09-28']);assert.ok(data.refterBevestigingen['2026-10-01']);assert.equal(ctx.standaardRefterWeek(),'2026-10-05');
// Vakantie blijft vrijdag beschikbaar, maandafsluiting volgt de laatste echte refterdag.
const holiday={vrijeDagen:[{start:'2026-11-02',end:'2026-11-08'}]};assert.equal(ctx.magRefterWeekBevestigen('2026-10-26','2026-10-30',holiday),true);
const freeLast={vrijeDagen:[{start:'2026-09-29',end:'2026-09-30'}]};assert.equal(ctx.magRefterWeekBevestigen('2026-09-28','2026-09-28',freeLast),false);
assert.equal(ctx.magRefterWeekBevestigen('2026-09-28','2026-09-29',freeLast),true);
// Startscherm: september weg na bevestiging, oktober komt maandag apart terug.
const portal=fs.readFileSync('script.js','utf8');new vm.Script(portal.replace(/^\s*import .*;\s*$/gm,'').replace('export { db };',''));
let banner='';ctx.document={getElementById:id=>id==='portaalRefterHerinnering'?{remove:()=>{banner=''}}:{insertAdjacentElement:(_,el)=>{banner=el.innerHTML}},createElement:()=>({})};
ctx.huidigSchooljaarVoorMeldingen=()=> '2026-2027';
const NativeDate=Date;ctx.Date=class extends NativeDate{constructor(...a){super(...(a.length?a:[vandaag+'T12:00:00']));}};
vm.runInContext(portal.slice(portal.indexOf('function toonRefterHerinneringOpStart('),portal.indexOf('async function toonOpvallendeStartmeldingen')),ctx);
const docs=[{snap:{exists:()=>true,data:()=>data}}];ctx.toonRefterHerinneringOpStart('klasleerkracht',docs);assert.equal(banner,'');delete data.refterBevestigingen['2026-10-01'];ctx.toonRefterHerinneringOpStart('klasleerkracht',docs);assert.ok(banner.includes('1 oktober'));assert.ok(!banner.includes('september'));
console.log('Maandgrenzen, bevestiging, afzonderlijke verwerking, blokkering oktober, oude registraties, vakantie, vrije dagen, weekend, startscherm en vier schooljaren gecontroleerd.');
