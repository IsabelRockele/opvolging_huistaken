import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const source=fs.readFileSync(new URL('../fototoestemming.js',import.meta.url),'utf8');
const {wijzigFotostatus,wijzigFotoreden,zelfdeFotoregistratie,maakFotoPdf}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
for(const file of ['schoolbeheer.html','foto-overzicht.html']){
 const html=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
 for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g))if(!m[1].includes('src='))new vm.Script(m[2].replace(/^\s*import\s.*?;\s*$/gm,''));
}
const leerling={leerlingId:'1',naam:'Voorbeeld, Noor',klas:'2A'};
let item=wijzigFotostatus({},leerling,'nee','Ouders geven geen toestemming voor publicatie.');
assert.equal(item.uitzonderingen[0].reden,'Ouders geven geen toestemming voor publicatie.');
item.uitzonderingen=wijzigFotoreden(item,leerling,'Alleen geen publicatie op sociale media.');
assert.equal(item.uitzonderingen[0].reden,'Alleen geen publicatie op sociale media.');
item=wijzigFotostatus(item,leerling,'ja');
assert.equal(item.uitzonderingen.length,0);assert.equal(item.ontbrekendeFormulieren.length,0);
assert.equal(wijzigFotoreden(item,leerling,'Late wijziging').length,0);
item=wijzigFotostatus(item,leerling,'onbekend');assert.equal(item.ontbrekendeFormulieren.length,1);
item=wijzigFotostatus(item,leerling,'ja');assert.equal(item.ontbrekendeFormulieren.length,0);
assert.equal(zelfdeFotoregistratie({...leerling,leerlingId:'2'},leerling),false);
assert.equal(zelfdeFotoregistratie({naam:leerling.naam,klas:'2A'},leerling),true);
assert.equal(zelfdeFotoregistratie({naam:leerling.naam,klas:'3A'},leerling),false);
const {jsPDF}=require('../jspdf.umd.min.js');
const leerlingen=Array.from({length:55},(_,i)=>({leerlingId:String(i),naam:i===0?'Van de Lange Voorbeeldfamilienaam, Noor Elisabeth':'Voorbeeldleerling '+(i+1),klas:i<20?'2A':'3B',reden:i===0?'Geen toestemming voor publicatie op de schoolwebsite of op sociale media. Alleen klasfoto’s voor intern gebruik zijn toegestaan.':i%3?'Ouders geven geen toestemming.':''}));
fs.mkdirSync('tmp/pdfs/foto',{recursive:true});
for(const soort of ['nee','onbekend']){
 const pdf=maakFotoPdf(jsPDF,{soort,schooljaar:'2026-2027',leerlingen});
 assert.ok(pdf.getNumberOfPages()>1);fs.writeFileSync(`tmp/pdfs/foto/${soort}.pdf`,Buffer.from(pdf.output('arraybuffer')));
}
const empty=maakFotoPdf(jsPDF,{soort:'nee',schooljaar:'2026-2027',leerlingen:[]});assert.equal(empty.getNumberOfPages(),1);
const long=maakFotoPdf(jsPDF,{soort:'nee',schooljaar:'2026-2027',leerlingen:[{...leerling,reden:'Een lange opmerking. '.repeat(200)}]});assert.ok(long.getNumberOfPages()>1);
console.log('Fotostatus, verwijdering van reden, ontbrekende formulieren, gelijktijdige wijzigingen, syntax en PDF-paginering gecontroleerd.');
// Controleer ook de echte bewaarfunctie en het automatisch hertekende overzicht.
const school=fs.readFileSync(new URL('../schoolbeheer.html',import.meta.url),'utf8');
let opgeslagen={bevestigd:true,...wijzigFotostatus({},leerling,'nee','Geen publicatie')};
const context=vm.createContext({window:{},kanFotoAanpassen:()=>true,data:{leerlingen:[{id:'1'}]},name:()=>leerling.naam,activeClass:'2A',schooljaar:'2026-2027',fotoToestemmingRef:()=> 'foto',db:{},user:{uid:'leerkracht'},fotoToestemmingData:opgeslagen,wijzigFotostatus,Date,console,alert:msg=>{throw Error(msg)},runTransaction:async(_,fn)=>fn({get:async()=>({exists:()=>true,data:()=>opgeslagen}),set:(_,item)=>{opgeslagen={...opgeslagen,...item};}})});
vm.runInContext(school.slice(school.indexOf('    window.zetFotoStatus='),school.indexOf('    window.bevestigFotoKlas=')),context);
assert.equal(await context.window.zetFotoStatus('1','ja'),true);
assert.equal(opgeslagen.uitzonderingen.length,0);
const overview=fs.readFileSync(new URL('../foto-overzicht.html',import.meta.url),'utf8');
const elements={};const element=id=>elements[id]||=(id==='zoek'?{value:''}:{innerHTML:'',textContent:''});
const view=vm.createContext({$:element,instelling:{bevestigd:true,...wijzigFotostatus({},leerling,'nee','Geen publicatie')},schooljaar:'2026-2027',klasleerlingen:[],magBeheren:()=>true,actieveFotoRegistratie:()=>true,esc:x=>String(x),klasSort:(a,b)=>a.localeCompare(b),datumTekst:()=>'',Set});
vm.runInContext(overview.slice(overview.indexOf('    function fotoRij('),overview.indexOf("    $('overzicht').addEventListener")),view);
vm.runInContext('renderOverzicht()',view);assert.ok(element('overzicht').innerHTML.includes('Geen publicatie'));
view.instelling=opgeslagen;vm.runInContext('renderOverzicht()',view);
assert.ok(!element('overzicht').innerHTML.includes(leerling.naam));assert.ok(!element('overzicht').innerHTML.includes('Geen publicatie'));
console.log('Echte klaslijst-bewaarfunctie en vernieuwd foto-overzicht: naam en reden verdwijnen samen.');

const samen=maakFotoPdf(jsPDF,{schooljaar:'2026-2027',uitzonderingen:leerlingen.slice(0,3),ontbrekendeFormulieren:[{naam:'Voorbeeld, Mila',klas:'1A'}]});
assert.equal(samen.getNumberOfPages(),1);
const tekst=samen.output();assert.ok(tekst.includes('Mag niet op de foto'));assert.ok(tekst.includes('Formulier ontbreekt'));assert.ok(tekst.includes('Voorbeeld, Mila'));
fs.writeFileSync('tmp/pdfs/foto/samen.pdf',Buffer.from(samen.output('arraybuffer')));
const grootSamen=maakFotoPdf(jsPDF,{schooljaar:'2026-2027',uitzonderingen:leerlingen,ontbrekendeFormulieren:leerlingen});
assert.ok(grootSamen.getNumberOfPages()>3);
console.log('Gecombineerde PDF bevat beide overzichten, samen op één pagina wanneer er plaats is.');
