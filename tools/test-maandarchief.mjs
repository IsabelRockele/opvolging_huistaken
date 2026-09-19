import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const source=fs.readFileSync(new URL('../maandarchief.js',import.meta.url),'utf8');
const {maakMaandOverzichten,maakMaandPdf}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
for(const file of ['schoolbeheer.html','huiswerkklas.html']){
  const html=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
  for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g))if(!m[1].includes('src='))new vm.Script(m[2].replace(/^\s*import\s.*?;\s*$/gm,''));
}
const klas={klas:'2A',leerlingen:[{id:'1',last:'De Voorbeeld',first:'Noor',start:'2026-09-01',end:'2027-06-30'},{id:'2',last:'Oud',first:'Amir',end:'2026-10-06'},{id:'3',last:'Collega',first:'Lina',colleague:true}],refter:{'2026-10':{'1':{'2026-10-02':true}}},refterBevestigingen:{'2026-09-28':{door:'leerkracht',bevestigdOp:'2026-10-05'}},processed:{refterWeken:{}},activiteiten:[{id:'a',date:'2026-10-02',name:'Uitstap',price:5,attendanceConfirmed:true,absent:{'2':true}},{id:'b',date:'2026-10-08',name:'Zwemmen',price:1,attendanceConfirmed:false},{id:'c',date:'2026-10-09',name:'Geannuleerd',price:7,cancelled:true,cancelReason:'Regen'}],aankopen:[{date:'2026-10-04',studentId:'1',type:'badmuts',price:1,processed:true},{date:'2026-09-30',studentId:'1',price:8}]};
const basis={maand:'2026-10',schooljaar:'2026-2027',klassen:[klas],vandaag:'2026-11-01'};
const snapshot=JSON.stringify(klas);
const refter=maakMaandOverzichten({...basis,soort:'refter'})[0];
const nr=refter.tabellen[0].rijen.find(r=>r[0]==='De Voorbeeld Noor');
assert.equal(nr[1],'A');assert.equal(nr[2],'X');assert.equal(nr[5],'?');assert.equal(nr[3],'-');assert.equal(nr.at(-1),'1');
assert.equal(refter.tabellen[0].kop.length,33);
assert.ok(refter.tabellen[0].rijen.find(r=>r[0].startsWith('Collega')).slice(1,-1).every(c=>c==='-'));
const purchases=maakMaandOverzichten({...basis,soort:'aankopen'})[0];assert.equal(purchases.tabellen[0].rijen.length,1);
const acts=maakMaandOverzichten({...basis,soort:'activiteiten'})[0];const ar=acts.tabellen[1].rijen.find(r=>r[0]==='De Voorbeeld Noor');assert.deepEqual(ar.slice(1),['A','?','-','5.00']);
const hw={enrolled:{'2A_old':{klas:'2A',name:'Uitgeschreven leerling',active:false,days:{dinsdag:true}},'2A_1':{klas:'2A',name:'De Voorbeeld Noor',days:{dinsdag:true},history:[{from:'2026-10-08',free:true,days:{donderdag:true}}]}},dates:['2026-10-06','2026-10-08','2026-10-13'],attendance:{'2026-10-06':{'2A_old':true,'2A_1':false},'2026-10-08':{'2A_1':true}},processedDates:{'2026-10-06':true},cancelledDates:{'2026-10-13':{}},supervisors:{'2026-10-06':['Voorbeeld begeleider']}};
const homework=maakMaandOverzichten({...basis,soort:'huiswerkklas',huiswerk:hw})[0];
assert.ok(homework.tabellen[0].rijen.some(r=>r[0]==='Uitgeschreven leerling'&&r.at(-2)==='1'));
assert.deepEqual(homework.tabellen[0].rijen.find(r=>r[0]==='De Voorbeeld Noor').slice(1),['X','A*','-','1','0']);
assert.equal(JSON.stringify(klas),snapshot);
assert.throws(()=>maakMaandOverzichten({...basis,soort:'refter',maand:'2027-10'}));
const oudJaar=maakMaandOverzichten({...basis,schooljaar:'2025-2026',maand:'2025-10',soort:'aankopen'});assert.equal(oudJaar[0].tabellen[0].rijen.length,0);
// Realistische proefbestanden, inclusief lange namen, veel leerlingen en activiteiten.
if(process.argv.includes('--pdf')){
  const {jsPDF}=require('../jspdf.umd.min.js');
  const leerlingen=Array.from({length:34},(_,i)=>({id:String(i+1),last:i===0?'Van Den Voorbeeldnaam Met Een Langere Familienaam':'Voorbeeld',first:'Leerling '+(i+1),start:'2026-09-01'}));
  const groot={...klas,leerlingen,activiteiten:Array.from({length:14},(_,i)=>({...klas.activiteiten[i%3],id:String(i),name:'Activiteit '+(i+1)+' - bezoek aan het natuurmuseum en de educatieve tentoonstelling',date:'2026-10-'+String(i+1).padStart(2,'0')}))};
  const klassen=[groot,{...klas,klas:'3B'},{klas:'4A',leerlingen:[]}];
  fs.mkdirSync('tmp/pdfs/maandarchief',{recursive:true});
  for(const soort of ['refter','aankopen','activiteiten','huiswerkklas']){
    const opties={...basis,soort,klassen,huiswerk:hw};const overzichten=maakMaandOverzichten(opties);
    const pdf=maakMaandPdf(jsPDF,{...opties,overzichten,aangemaakt:new Date('2026-11-01T12:00:00Z')});
    fs.writeFileSync(`tmp/pdfs/maandarchief/${soort}.pdf`,Buffer.from(pdf.output('arraybuffer')));
    console.log(`${soort}: ${pdf.getNumberOfPages()} pagina's`);
  }
}
console.log('Maandexports: filters, maandgrens, oude leerlingen, statussen, bedragen, jaarselectie, ongewijzigde brongegevens en paginascripts gecontroleerd.');
