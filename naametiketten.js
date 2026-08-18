import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig={apiKey:"AIzaSyA7KxXMvZ4dzBQDut3CMyWUblLte2tFzoQ",authDomain:"huiswerkapp-a311e.firebaseapp.com",projectId:"huiswerkapp-a311e",storageBucket:"huiswerkapp-a311e.appspot.com",messagingSenderId:"797169941164",appId:"1:797169941164:web:511d9618079f1378d0fd09"};
const app=getApps().length?getApp():initializeApp(firebaseConfig), auth=getAuth(app), db=getFirestore(app);
const $=id=>document.getElementById(id), DEFAULT_CLASSES=["K1","K2","K3","1A","2A","3A","4A","5A","6A"];
function vergelijkKlassen(a,b){const sleutel=v=>{const s=String(v||'').toUpperCase(),k=s.match(/^K(\d+)(.*)$/),l=s.match(/^(\d+)(.*)$/);return k?[0,+k[1],k[2]]:l?[1,+l[1],l[2]]:[2,999,s]};const x=sleutel(a),y=sleutel(b);return x[0]-y[0]||x[1]-y[1]||x[2].localeCompare(y[2],'nl')}
let user=null,role="",klassen=[],leerlingen=[],geselecteerd=new Set();

function huidigSchooljaar(){const n=new Date(),s=n.getMonth()>=7?n.getFullYear():n.getFullYear()-1;return `${s}-${s+1}`}
function esc(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}
function isBreed(){return ["beheerder","secretariaat","directie","zorgcoordinator","zorgleerkracht"].includes(role)}
function voornaam(s){
  const roepnaam=String(s.roepnaam||s.callingName||"").trim(); if(roepnaam)return roepnaam;
  const direct=String(s.first||s.firstName||s.voornaam||"").trim(); if(direct)return direct;
  const volledig=String(s.naam||s.name||"").trim(); if(!volledig)return "";
  if(volledig.includes(","))return volledig.split(",").slice(1).join(",").trim();
  return volledig.split(/\s+/)[0];
}
function achternaam(s){
  const direct=String(s.last||s.lastName||s.achternaam||"").trim(); if(direct)return direct;
  const volledig=String(s.naam||s.name||"").trim(); if(!volledig)return "";
  if(volledig.includes(","))return volledig.split(",")[0].trim();
  return volledig.split(/\s+/).slice(1).join(" ").trim();
}
function leerlingId(s,index){return String(s.id||`${voornaam(s)}_${achternaam(s)}_${index}`)}
function basisVoornaam(s){
  const naam=voornaam(s); if($('schrijfwijze').value==='klein')return naam.toLocaleLowerCase('nl');
  return naam ? naam.charAt(0).toLocaleUpperCase('nl')+naam.slice(1) : '';
}
function etikettenNamen(){
  const telling=new Map();leerlingen.forEach(s=>{const k=voornaam(s).toLocaleLowerCase('nl');telling.set(k,(telling.get(k)||0)+1)});
  return leerlingen.map((s,index)=>{
    let naam=basisVoornaam(s);const dubbel=(telling.get(voornaam(s).toLocaleLowerCase('nl'))||0)>1,letter=achternaam(s).trim().charAt(0).toLocaleUpperCase('nl');
    if(dubbel&&letter)naam+=` ${letter}`;
    return {id:leerlingId(s,index),naam,leerling:s};
  });
}
function gekozenNamen(){return etikettenNamen().filter(x=>geselecteerd.has(x.id)).map(x=>x.naam)}
function inhoud(){return document.querySelector('input[name="inhoud"]:checked')?.value||'namen'}
function isTekst(){return inhoud()==='tekst'}
function eigenTekst(){return $('eigenTekst').value.replace(/\r/g,'').trim()}
function actief(s){const jaar=$('schooljaar').value.trim(),datum=`${jaar.slice(0,4)}-09-15`;return(!s.start||s.start<=datum)&&(!s.end||s.end>=datum)}
function modus(){return document.querySelector('input[name="modus"]:checked').value}
function basisGrootte(){return isTekst()?Math.max(8,Math.min(36,Number($('tekstLettergrootte').value)||18)):Math.max(26,Math.min(48,Number($('lettergrootte').value)||48))}
function isVet(){return $('vetgedrukt').checked}
function bladen(){
  if(isTekst()){const tekst=eigenTekst();return tekst?[Array(24).fill(tekst)]:[]}
  const namen=gekozenNamen().filter(Boolean);
  if(modus()==="volblad")return namen.map(n=>Array(24).fill(n));
  if(modus()==="halfblad"){const uit=[];for(let i=0;i<namen.length;i+=2)uit.push([...Array(12).fill(namen[i]),...Array(12).fill(namen[i+1]||"")]);return uit}
  const uit=[];for(let i=0;i<namen.length;i+=24)uit.push([...namen.slice(i,i+24),...Array(Math.max(0,24-namen.slice(i,i+24).length)).fill("")]);return uit;
}
function puntgrootte(naam){
  const basis=basisGrootte();if(!naam)return basis; const canvas=puntgrootte.canvas||(puntgrootte.canvas=document.createElement('canvas')),ctx=canvas.getContext('2d');
  if(isTekst()){
    for(let grootte=basis;grootte>=8;grootte--){
      ctx.font=`${isVet()?'bold ':''}${grootte}pt Arial`;let regelAantal=0,onbreekbaarTeBreed=false;
      String(naam).split('\n').forEach(bronregel=>{
        const woorden=bronregel.split(/\s+/).filter(Boolean);if(!woorden.length){regelAantal++;return}
        let regel='';woorden.forEach(woord=>{if(ctx.measureText(woord).width>190)onbreekbaarTeBreed=true;const voorstel=regel?`${regel} ${woord}`:woord;if(regel&&ctx.measureText(voorstel).width>190){regelAantal++;regel=woord}else regel=voorstel});if(regel)regelAantal++;
      });
      if(!onbreekbaarTeBreed&&regelAantal*grootte*1.18<=72)return grootte;
    }
    return 8;
  }
  ctx.font=`${isVet()?'bold ':''}${basis}pt Arial`;const breedte=ctx.measureText(naam).width,maximum=225;
  return Math.max(26,Math.min(basis,Math.floor(basis*maximum/Math.max(breedte,1))));
}
function render(){
  const opties=etikettenNamen(),namen=gekozenNamen().filter(Boolean),pagina=bladen()[0]||Array(24).fill("");
  $('naamOpties').classList.toggle('verborgen',isTekst());$('naamVerdeling').classList.toggle('verborgen',isTekst());$('tekstOpties').classList.toggle('verborgen',!isTekst());
  $('namen').innerHTML=opties.map(x=>`<label class="naam"><input type="checkbox" data-leerling-id="${esc(x.id)}" ${geselecteerd.has(x.id)?'checked':''}><span>${esc(x.naam)}</span></label>`).join('');
  $('namen').querySelectorAll('input[data-leerling-id]').forEach(v=>v.addEventListener('change',()=>{v.checked?geselecteerd.add(v.dataset.leerlingId):geselecteerd.delete(v.dataset.leerlingId);render()}));
  $('preview').innerHTML=pagina.map(n=>`<div class="etiket" style="font-size:${Math.max(7,puntgrootte(n)*.32)}px;font-weight:${isVet()?700:400}">${esc(n)}</div>`).join('');
  $('letterInfo').textContent=`Verkleind schermvoorbeeld · Word: Arial ${basisGrootte()} pt${isVet()?' vet':''}${isTekst()?'; indien nodig automatisch kleiner.':'; lange namen worden automatisch verkleind.'}`;
  $('bladBadge').textContent=`${bladen().length} ${bladen().length===1?'blad':'bladen'}`;
  $('download').disabled=isTekst()?!eigenTekst():!namen.length;
  $('status').textContent=isTekst()?(eigenTekst()?'Eén A4 met 24 identieke tekstetiketten staat klaar.':'Typ eerst de tekst die op ieder etiket moet komen.'):leerlingen.length?`${namen.length} van ${leerlingen.length} actieve leerling${leerlingen.length===1?'':'en'} geselecteerd in ${$('klas').value}.`:'Geen actieve leerlingen gevonden in deze klaslijst.';
}
async function laadRol(){const s=await getDoc(doc(db,'schoolrollen',user.uid));role=s.exists()?String(s.data().rol||'').toLowerCase():'';if(role==='beheerder'){const sim=localStorage.getItem('lindeSimuleerRol_'+user.uid);if(sim)role=sim}}
async function laadKlassen(){
  const jaar=$('schooljaar').value.trim();
  if(isBreed()){const snap=await getDocs(collection(db,'schoolbeheer',jaar,'klassen'));klassen=[...new Set([...DEFAULT_CLASSES,...snap.docs.map(d=>d.id)])]}
  else{const email=(user.email||'').toLowerCase(),qs=await Promise.all([getDocs(query(collection(db,'klasleerkrachten'),where('leerkracht_uids','array-contains',user.uid))),getDocs(query(collection(db,'klasleerkrachten'),where('leerkracht_emails','array-contains',email)))]);const set=new Set();qs.forEach(q=>q.docs.forEach(d=>{const x=d.data();if(String(x.schooljaar||jaar)===jaar&&x.klas)set.add(String(x.klas).trim())}));klassen=[...set]}
  klassen.sort(vergelijkKlassen);$('klas').innerHTML=klassen.map(k=>`<option>${esc(k)}</option>`).join('')||'<option value="">Geen klas</option>';await laadLeerlingen();
}
async function laadLeerlingen(){const klas=$('klas').value,jaar=$('schooljaar').value.trim();leerlingen=[];if(klas){const s=await getDoc(doc(db,'schoolbeheer',jaar,'klassen',klas));if(s.exists())leerlingen=(s.data().leerlingen||[]).filter(actief).sort((a,b)=>voornaam(a).localeCompare(voornaam(b),'nl'))}geselecteerd=new Set(leerlingen.map(leerlingId));render()}

function xml(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;')}
function tekstRunsXml(tekst,half){return String(tekst||'').split('\n').map((regel,i)=>`${i?'<w:r><w:br/></w:r>':''}<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>${isVet()?'<w:b/>':''}<w:sz w:val="${half}"/><w:szCs w:val="${half}"/></w:rPr><w:t xml:space="preserve">${xml(regel)}</w:t></w:r>`).join('')}
function celXml(naam){const half=puntgrootte(naam)*2;if(isTekst())return `<w:tc><w:tcPr><w:tcW w:w="3968" w:type="dxa"/><w:vAlign w:val="center"/><w:tcMar><w:top w:w="180" w:type="dxa"/><w:left w:w="283" w:type="dxa"/><w:bottom w:w="180" w:type="dxa"/><w:right w:w="283" w:type="dxa"/></w:tcMar></w:tcPr><w:p><w:pPr><w:spacing w:before="0" w:after="0"/><w:jc w:val="center"/></w:pPr>${naam?tekstRunsXml(naam,half):''}</w:p></w:tc>`;return `<w:tc><w:tcPr><w:tcW w:w="3968" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:ind w:right="258"/><w:jc w:val="center"/></w:pPr></w:p><w:p><w:pPr><w:ind w:left="258" w:right="258"/><w:jc w:val="center"/></w:pPr></w:p><w:p><w:pPr><w:ind w:left="258" w:right="258"/><w:jc w:val="center"/></w:pPr>${naam?tekstRunsXml(naam,half):''}</w:p></w:tc>`}
function tabelXml(namen){let r='',rijHoogte=isTekst()?1900:2098;for(let y=0;y<8;y++)r+=`<w:tr><w:trPr><w:cantSplit/><w:trHeight w:hRule="exact" w:val="${rijHoogte}"/></w:trPr>${namen.slice(y*3,y*3+3).map(celXml).join('')}</w:tr>`;return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblInd w:w="-15" w:type="dxa"/><w:tblBorders><w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/><w:insideH w:val="none"/><w:insideV w:val="none"/></w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="15" w:type="dxa"/><w:right w:w="15" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="3968"/><w:gridCol w:w="3968"/><w:gridCol w:w="3968"/></w:tblGrid>${r}</w:tbl>`}
function kleinAlinea(extra=''){return `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="1" w:lineRule="exact"/></w:pPr><w:r><w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr>${extra}</w:r></w:p>`}
function documentXml(paginas){const inhoud=paginas.map((p,i)=>tabelXml(p)+(i<paginas.length-1?kleinAlinea('<w:br w:type="page"/>'):'')).join('');return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${inhoud}${kleinAlinea()}<w:sectPr><w:type w:val="continuous"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="0" w:right="0" w:bottom="0" w:left="0" w:header="708" w:footer="708" w:gutter="0"/><w:cols w:space="708"/></w:sectPr></w:body></w:document>`}

const encoder=new TextEncoder();let crcTable=null;
function crc32(bytes){if(!crcTable){crcTable=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;crcTable[n]=c>>>0}}let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0}
function u16(n){return new Uint8Array([n&255,(n>>>8)&255])}function u32(n){return new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255])}function samen(...a){const l=a.reduce((s,x)=>s+x.length,0),o=new Uint8Array(l);let p=0;for(const x of a){o.set(x,p);p+=x.length}return o}
function zipBestanden(bestanden){const lokaal=[],centraal=[];let offset=0;for(const [naam,tekst] of Object.entries(bestanden)){const n=encoder.encode(naam),d=encoder.encode(tekst),crc=crc32(d),h=samen(u32(0x04034b50),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(d.length),u32(d.length),u16(n.length),u16(0),n);lokaal.push(h,d);centraal.push(samen(u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(d.length),u32(d.length),u16(n.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),n));offset+=h.length+d.length}const c=samen(...centraal),l=samen(...lokaal),e=samen(u32(0x06054b50),u16(0),u16(0),u16(centraal.length),u16(centraal.length),u32(c.length),u32(l.length),u16(0));return new Blob([l,c,e],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'})}
function maakDocx(){const paginas=bladen();if(!paginas.length)return;const bestanden={
  '[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>',
  '_rels/.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  'word/_rels/document.xml.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
  'word/styles.xml':'<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault/></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:style></w:styles>',
  'word/document.xml':documentXml(paginas)};
  const url=URL.createObjectURL(zipBestanden(bestanden)),a=document.createElement('a');a.href=url;a.download=isTekst()?`tekstetiketten_${$('schooljaar').value}.docx`:`naametiketten_${$('klas').value}_${$('schooljaar').value}_${modus()}.docx`;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
}

$('schooljaar').value=huidigSchooljaar();$('klas').addEventListener('change',laadLeerlingen);$('schooljaar').addEventListener('change',laadKlassen);$('schrijfwijze').addEventListener('change',render);$('lettergrootte').addEventListener('input',render);$('tekstLettergrootte').addEventListener('input',render);$('eigenTekst').addEventListener('input',render);$('vetgedrukt').addEventListener('change',render);document.querySelectorAll('input[name="inhoud"],input[name="modus"]').forEach(x=>x.addEventListener('change',render));$('selecteerAlles').addEventListener('click',()=>{geselecteerd=new Set(etikettenNamen().map(x=>x.id));render()});$('selecteerGeen').addEventListener('click',()=>{geselecteerd.clear();render()});$('download').addEventListener('click',maakDocx);
onAuthStateChanged(auth,async u=>{if(!u){location.href='index.html';return}user=u;try{await laadRol();await laadKlassen()}catch(e){console.error(e);$('status').textContent='De klaslijst kon niet worden geladen: '+e.message}});
