import assert from 'node:assert/strict';
import {verplaatsKlasleerling,neemZorgMee,neemFicheMee,neemHuiswerkMee,leerlingActief,klasPeildatum} from '../klaswissel-model.mjs';
import {maakMaandOverzichten} from '../maandarchief.js';

const kind={id:'kind',first:'Kind',last:'Test',start:'2026-09-01',end:'2027-06-30',gok:'ja',medicalNote:'Bewaren',homeworkClass:true,homeworkClassDays:{dinsdag:true}};
const ander={id:'ander',first:'Ander',last:'Test',start:'2026-09-01',end:'2027-06-30'};
const bron={klas:'2A',leerlingen:[kind,ander],afwezigheidsattesten:{volgorde:['kind','ander'],registraties:{kind:{z1:true,b1:true},ander:{p1:true}}},
  aankopen:[{id:'oud',studentId:'kind',date:'2026-09-21',price:5,processed:true},{id:'open-oud',studentId:'kind',date:'2026-10-02',price:4},{id:'nieuw',studentId:'kind',date:'2026-10-05',price:6},{id:'anderaankoop',studentId:'ander',date:'2026-10-06',price:7}],
  activiteiten:[{id:'act-oud',name:'Museum',date:'2026-09-22',price:5,processed:true,attendanceConfirmed:true,absent:{ander:true}},{id:'act-open',name:'Sport',date:'2026-10-06',price:2,absent:{kind:true,ander:false}}],
  refter:{'2026-09':{kind:{'2026-09-21':true},ander:{'2026-09-22':true}},'2026-10':{kind:{'2026-10-02':true,'2026-10-05':true},ander:{'2026-10-06':true}}},
  processed:{refterWeken:{'2026-09-21':{periodeTot:'2026-09-25'}}},refterBevestigingen:{'2026-10-01':{periodeTot:'2026-10-02'}}};
const doel={klas:'1A',leerlingen:[{...ander,id:'doelkind'}],afwezigheidsattesten:{volgorde:['doelkind'],registraties:{doelkind:{z2:true}}},activiteiten:[{id:'andere-id',name:'Sport',date:'2026-10-06',price:2,absent:{doelkind:false}}],aankopen:[],refter:{'2026-10':{doelkind:{'2026-10-06':true}}}};
const args={bron,doel,id:'kind',datum:'2026-10-05',jaar:'2026-2027',van:'2A',naar:'1A'};
const voor=structuredClone(args),wissel=verplaatsKlasleerling(args);
assert.deepEqual(args,voor,'Plan mag invoer niet muteren');
assert.equal(wissel.bron.leerlingen[0].end,'2026-10-04');
assert.equal(wissel.leerling.start,'2026-10-05');
assert.equal(wissel.leerling.id,kind.id);
assert.equal(wissel.leerling.medicalNote,kind.medicalNote);
for(const datum of ['2026-09-01','2026-10-04','2026-10-05','2027-06-30']) {
  assert.equal(Number(leerlingActief(wissel.bron.leerlingen[0],args.jaar,datum))+Number(leerlingActief(wissel.leerling,args.jaar,datum)),1,'Nooit dubbel of ontbrekend op een datum');
}
assert.deepEqual(wissel.bron.leerlingen[1],ander);
assert.deepEqual(wissel.doel.leerlingen[0],doel.leerlingen[0]);
assert.deepEqual(wissel.bron.aankopen.map(a=>a.id),['oud','open-oud','anderaankoop']);
assert.equal(wissel.doel.aankopen[0].id,'nieuw');
assert.deepEqual(wissel.bron.activiteiten[0],bron.activiteiten[0]);
assert.deepEqual(wissel.bron.activiteiten[1].absent,{ander:false});
assert.deepEqual(wissel.doel.activiteiten[0].absent,{doelkind:false,kind:true});
assert.deepEqual(wissel.bron.refter['2026-10'].ander,bron.refter['2026-10'].ander);
assert.deepEqual(wissel.doel.refter['2026-10'].doelkind,doel.refter['2026-10'].doelkind);
assert.deepEqual(wissel.doel.afwezigheidsattesten.registraties,{doelkind:{z2:true},kind:{z1:true,b1:true}});
assert.deepEqual(wissel.bron.afwezigheidsattesten,bron.afwezigheidsattesten);
assert.deepEqual(wissel.doel.afwezigheidsattesten.volgorde,['doelkind','kind']);
assert.deepEqual(wissel.bron.refterBevestigingen,bron.refterBevestigingen);
for(const soort of ['refter','activiteiten','aankopen']) {
  const config={soort,maand:'2026-09',schooljaar:args.jaar,vandaag:'2026-10-05'};
  assert.deepEqual(maakMaandOverzichten({...config,klassen:[wissel.bron]}),maakMaandOverzichten({...config,klassen:[bron]}),`${soort}: september blijft exact gelijk`);
}
for(const verandering of [
  x=>x.doel.leerlingen.push({...kind}),
  x=>x.bron.aankopen[2].processed=true,
  x=>x.doel.activiteiten[0].processed=true,
  x=>x.doel.activiteiten[0].attendanceConfirmed=true,
  x=>x.doel.refterBevestigingen={'2026-10-05':{periodeTot:'2026-10-09'}},
  x=>x.bron.processed.refterWeken['2026-10-05']={periodeTot:'2026-10-09'},
  x=>x.doel.activiteiten=[],
  x=>x.datum='2026-02-30',
  x=>x.datum='2026-08-31'
]) {const a=structuredClone(args);verandering(a);assert.throws(()=>verplaatsKlasleerling(a));}
assert.throws(()=>verplaatsKlasleerling({...args,bron:wissel.bron,doel:wissel.doel}),'Herhalen mag niet dupliceren');

const zorg={entries:{kind:{notes:'Volledige notitie',zorgfase:'2',clbToestemming:'ja'},ander:{notes:'Niet wijzigen'}},groupActions:[{groep:'Lezen',studentKeys:['kind','ander'],studentNames:['Kind','Ander'],actie:'Oefenen',evaluatie:'Vooruitgang'}]};
const zorgDoel={entries:{doelkind:{notes:'Eigen notitie'}},groupActions:[{groep:'Eigen groep',studentKeys:['doelkind'],actie:'Behouden'}]};
const zorgVoor=structuredClone([zorg,zorgDoel]), z=neemZorgMee(zorg,zorgDoel,'kind','Test, Kind','2A');
assert.deepEqual([zorg,zorgDoel],zorgVoor);
assert.deepEqual(z.entries.kind,zorg.entries.kind);assert.deepEqual(z.entries.doelkind,zorgDoel.entries.doelkind);
assert.deepEqual(z.groupActions[0],zorgDoel.groupActions[0]);assert.deepEqual(z.groupActions[1].studentKeys,['kind']);
assert.throws(()=>neemZorgMee(zorg,z,'kind','Test, Kind','2A'));

const fiche={id:'fiche',schoolbeheerId:'kind',firstName:'Kind',lastName:'Test',notes:'Bewaar alles',testmomenten:[{score:7}],friends:['andere-fiche'],gok:'ja'};
const project={students:[fiche,{id:'ander',notes:'Bron behouden'}],groups:[{leden:['ander','fiche']}],locks:{ander:true}};
const doelProject={students:[{id:'doel',notes:'Doel behouden'}],groups:[{leden:['doel']}],locks:{doel:true}};
const p=neemFicheMee(project,doelProject,kind,'2A','1A','2026-10-05');
assert.deepEqual(p.doel.students[1],fiche);assert.deepEqual(p.doel.students[0],doelProject.students[0]);
assert.deepEqual(p.bron.students,[project.students[1]]);assert.deepEqual(p.bron.klaswisselArchief[0].fiche,fiche);
assert.deepEqual(p.bron.groups,project.groups);assert.deepEqual(p.doel.groups,doelProject.groups);
assert.throws(()=>neemFicheMee(project,p.doel,kind,'2A','1A','2026-10-05'));
const hw={enrolled:{'2A_kind':{klas:'2A',start:'2026-09-01',days:{dinsdag:true}},'1A_doelkind':{klas:'1A',days:{donderdag:true}}},attendance:{'2026-10-01':{'2A_kind':true},'2026-10-06':{'2A_kind':false,'1A_doelkind':true}}};
const h=neemHuiswerkMee(hw,{id:'kind',van:'2A',naar:'1A',datum:'2026-10-05'});
assert.deepEqual(h.attendance['2026-10-01'],hw.attendance['2026-10-01']);
assert.deepEqual(h.attendance['2026-10-06'],{'1A_kind':false,'1A_doelkind':true});
assert.deepEqual(h.enrolled['1A_doelkind'],hw.enrolled['1A_doelkind']);
assert.equal(h.enrolled['2A_kind'].history.at(-1).action,'stop');
assert.equal(h.enrolled['1A_kind'].history[0].from,'2026-10-05');
assert.equal(klasPeildatum(args.jaar,new Date(2026,9,5)),'2026-10-05');
console.log('Klaswissel: datumgrens, dossiers, attesten, huiswerkklas, historische exports, conflicten en behoud van andere leerlingen gecontroleerd.');
