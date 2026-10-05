import { plusDag, periodeDagen } from './refter-periodes.js';

export function klasPeildatum(jaar, nu = new Date()) {
  const vandaag = `${nu.getFullYear()}-${String(nu.getMonth()+1).padStart(2,'0')}-${String(nu.getDate()).padStart(2,'0')}`;
  return [ `${jaar.slice(0,4)}-09-01`, vandaag, `${jaar.slice(5)}-06-30` ].sort()[1];
}
export function leerlingActief(s, jaar, datum = klasPeildatum(jaar)) {
  const start=s.start||s.startDatum||'', eind=s.end||s.eindDatum||'';
  return !s.startNiet && s.actief!==false && s.inactief!==true && (!start||start<=datum) && (!eind||eind>=datum);
}
const naamKey = s => `${s.first||s.firstName||''}|${s.last||s.lastName||''}`.trim().toLocaleLowerCase('nl');
export const zorgKey = id => String(id).replace(/[^a-z0-9_-]+/gi,'_');
const kopie = x => Array.isArray(x) ? x.map(kopie) : x && Object.getPrototypeOf(x)===Object.prototype ? Object.fromEntries(Object.entries(x).map(([k,v])=>[k,kopie(v)])) : x;
export const kopieDocument=kopie;
// Firestore-kaarten hebben geen betekenisvolle veldvolgorde. Arrays wel.
export function gelijkeDocumentInhoud(a,b) {
  if(Object.is(a,b))return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object')return false;
  if(Array.isArray(a)||Array.isArray(b))return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>gelijkeDocumentInhoud(v,b[i]));
  // Timestamp, GeoPoint en Bytes vergelijken met hun eigen getypeerde methode.
  if(typeof a.isEqual==='function')return Object.getPrototypeOf(a)===Object.getPrototypeOf(b)&&a.isEqual(b);
  if(a instanceof Date||b instanceof Date)return a instanceof Date&&b instanceof Date&&a.getTime()===b.getTime();
  // DocumentReference bevat een cyclische Firestore-verbinding.
  const ar=a.type==='document'&&a.firestore&&Object.getPrototypeOf(a)!==Object.prototype;
  const br=b.type==='document'&&b.firestore&&Object.getPrototypeOf(b)!==Object.prototype;
  if(ar||br)return !!ar&&!!br&&a.path===b.path&&a.firestore===b.firestore&&a.converter===b.converter;
  const ak=Object.keys(a),bk=Object.keys(b);
  return ak.length===bk.length&&ak.every(k=>Object.hasOwn(b,k)&&gelijkeDocumentInhoud(a[k],b[k]));
}
function eis(voorwaarde, melding) { if(!voorwaarde) throw Error(melding); }

// Zuivere bewerking: uitsluitend de gekozen leerling; invoer wordt nooit gewijzigd.
export function verplaatsKlasleerling({bron, doel, id, datum, jaar, van, naar}) {
  eis(van && naar && van!==naar, 'Kies een andere doelklas.');
  eis(/^\d{4}-\d{2}-\d{2}$/.test(datum) && plusDag(datum,0)===datum && datum>=`${jaar.slice(0,4)}-09-01` && datum<=`${jaar.slice(5)}-06-30`, 'Kies een geldige datum binnen het schooljaar.');
  const s=(bron.leerlingen||[]).find(s=>s.id===id);
  eis(s && leerlingActief(s,jaar,datum), 'De leerling is op deze datum niet actief in de bronklas.');
  eis(!(doel.leerlingen||[]).some(x=>x.id===id || naamKey(x)===naamKey(s)), 'Deze leerling of een naamgenoot staat al in de doelklas. Controleer dit eerst; er wordt niets overschreven.');
  // Afgesloten bedragen mogen door terugdateren niet wijzigen.
  for(const k of [bron,doel]) {
    eis(!(k.activiteiten||[]).some(a=>a.processed && a.date>=datum && a.date<=(s.end||`${jaar.slice(5)}-06-30`)), 'Er zijn al afgesloten activiteiten vanaf de wisseldatum. Controleer die eerst.');
    eis(!(k.aankopen||[]).some(a=>a.studentId===id && a.processed && a.date>=datum), 'Er zijn al afgesloten aankopen voor deze leerling vanaf de wisseldatum.');
    eis(!(k.processed?.refter>=datum), 'Er is al refter verwerkt vanaf de wisseldatum.');
    eis(!Object.entries(k.processed?.refterWeken||{}).some(([d,v])=>v && periodeDagen(d).some(dag=>dag>=datum)), 'Er zijn al afgesloten refterdagen vanaf de wisseldatum. Controleer die eerst.');
  }
  const b=kopie(bron), d=kopie(doel), oud=b.leerlingen.find(x=>x.id===id);
  eis(!Object.values(doel.refter||{}).some(r=>Object.hasOwn(r,id)), 'Er bestaan al refterregistraties voor deze leerling in de doelklas. Controleer die eerst.');
  eis(!(doel.activiteiten||[]).some(a=>a.date>=datum && a.attendanceConfirmed), 'Er zijn al bevestigde activiteiten in de doelklas vanaf de wisseldatum. Heropen die eerst om de nieuwe leerling te kunnen controleren.');
  eis(!Object.entries(doel.refterBevestigingen||{}).some(([week,v])=>v && periodeDagen(week).some(dag=>dag>=datum)), 'Er is al refter bevestigd in de doelklas vanaf de wisseldatum. Heropen die periode eerst.');
  const nieuw={...kopie(s),start:datum,end:s.end||`${jaar.slice(5)}-06-30`,bronKlas:van,klaswisselVanaf:datum};
  delete nieuw.verhuisdNaar; delete nieuw.verhuisdOp;
  if('startDatum' in nieuw) nieuw.startDatum=datum;
  oud.end=plusDag(datum,-1); if('eindDatum' in oud) oud.eindDatum=oud.end;
  oud.verhuisdNaar=naar; oud.klaswisselVanaf=datum;
  if(s.homeworkClass || s.homeworkClassHistory?.length) {
    const geschiedenis=s.homeworkClassHistory||[];
    const laatste=geschiedenis.filter(h=>h.from<=datum).sort((a,b)=>a.from.localeCompare(b.from)).at(-1);
    const start={from:datum,action:laatste?.action||'start',days:laatste?.days||s.homeworkClassDays||{},free:laatste?.free??!!s.homeworkClassFree};
    nieuw.homeworkClassHistory=[start,...kopie(geschiedenis.filter(h=>h.from>datum))];
    nieuw.homeworkClassStart=datum;
    oud.homeworkClassEnd=oud.end;
    oud.homeworkClassHistory=[...kopie(geschiedenis.filter(h=>h.from<datum)),{from:datum,action:'stop',days:{},reden:`Klaswissel naar ${naar}`}];
    if(!geschiedenis.length) oud.homeworkClassHistory.unshift({from:s.homeworkClassStart||s.start||`${jaar.slice(0,4)}-09-01`,action:'start',days:s.homeworkClassDays||{},free:!!s.homeworkClassFree});
  }
  (d.leerlingen||=[]).push(nieuw);
  // Aankopen vóór de grens blijven ook onafgerekend bij de oorspronkelijke klas.
  const aankopen=(b.aankopen||[]).filter(a=>a.studentId===id && a.date>=datum);
  eis(!aankopen.some(a=>(d.aankopen||[]).some(x=>x.id===a.id)), 'Een aankoopcode bestaat al in de doelklas.');
  if(aankopen.length) { b.aankopen=b.aankopen.filter(a=>!aankopen.includes(a)); (d.aankopen||=[]).push(...aankopen); }
  for(const [maand,regels] of Object.entries(b.refter||{})) {
    for(const [dag,waarde] of Object.entries(regels[id]||{})) if(dag>=datum) {
      d.refter||={}; d.refter[maand]||={}; d.refter[maand][id]||={};
      d.refter[maand][id][dag]=waarde; delete regels[id][dag];
    }
  }
  for(const a of b.activiteiten||[]) if(a.date>=datum && Object.hasOwn(a.absent||{},id)) {
    const matches=(d.activiteiten||[]).filter(x=>x.date===a.date && x.name===a.name && Number(x.price||0)===Number(a.price||0) && !x.cancelled);
    eis(matches.length===1, `Aanwezigheid bij “${a.name}” op ${a.date} kan niet eenduidig aan een activiteit in ${naar} worden gekoppeld.`);
    eis(!Object.hasOwn(matches[0].absent||{},id), 'Er bestaat al een aanwezigheidsregistratie voor deze leerling bij de doelactiviteit.');
    matches[0].absent||={}; matches[0].absent[id]=a.absent[id]; delete a.absent[id];
  }
  const attestId=String(id).replaceAll('.','_');
  if(Object.hasOwn(b.afwezigheidsattesten?.registraties||{},attestId)) {
    d.afwezigheidsattesten||={volgorde:[],registraties:{}};
    d.afwezigheidsattesten.registraties||={};
    eis(!Object.hasOwn(d.afwezigheidsattesten.registraties,attestId), 'Er bestaan al afwezigheidsattesten voor deze leerling in de doelklas.');
    d.afwezigheidsattesten.registraties[attestId]=kopie(b.afwezigheidsattesten.registraties[attestId]);
  }
  if(d.afwezigheidsattesten) {
    d.afwezigheidsattesten.volgorde||=[];
    if(!d.afwezigheidsattesten.volgorde.includes(attestId)) d.afwezigheidsattesten.volgorde.push(attestId);
  }
  for(const k of [b,d]) { k.klaswisselVersie=(k.klaswisselVersie||0)+1; (k.klaswissels||=[]).push({leerlingId:id,van,naar,datum}); }
  return {bron:b,doel:d,leerling:nieuw,aankopen:aankopen.length};
}

export function neemZorgMee(bron,doel,id,naam,van) {
  const k=zorgKey(id), acties=(bron.groupActions||[]).filter(g=>(g.studentKeys||[]).includes(k));
  if(!bron.entries?.[k] && !acties.length) return null;
  eis(!doel.entries?.[k], 'Er bestaat al zorginhoud voor deze leerling in de doelklas.');
  const d=kopie(doel); d.entries||={};
  if(bron.entries?.[k]) d.entries[k]=kopie(bron.entries[k]);
  if(acties.length) (d.groupActions||=[]).push(...acties.map(g=>({...kopie(g),groep:`${g.groep||'Groepsactie'} (uit ${van})`,studentKeys:[k],studentNames:[naam]})));
  d.klaswisselVersie=(d.klaswisselVersie||0)+1;
  return d;
}

export function neemHuiswerkMee(oud,{id,van,naar,datum}) {
  const bk=`${van}_${zorgKey(id)}`, dk=`${naar}_${zorgKey(id)}`;
  if(!oud.enrolled?.[bk] && !Object.values(oud.attendance||{}).some(r=>Object.hasOwn(r,bk))) return null;
  eis(!oud.enrolled?.[dk] && !Object.values(oud.attendance||{}).some(r=>Object.hasOwn(r,dk)), 'Er zijn al huiswerkklasgegevens voor deze leerling in de doelklas.');
  eis(!Object.entries(oud.processedDates||{}).some(([dag,v])=>v&&dag>=datum), 'Er zijn al huiswerkklasdagen verwerkt vanaf de wisseldatum.');
  const d=kopie(oud),inschrijving=d.enrolled?.[bk];
  if(inschrijving) {
    const historie=inschrijving.history||[];
    const laatste=historie.filter(h=>h.from<=datum).sort((a,b)=>a.from.localeCompare(b.from)).at(-1);
    d.enrolled[dk]={...kopie(inschrijving),klas:naar,start:datum,history:[{from:datum,action:laatste?.action||'start',days:laatste?.days||inschrijving.days||{},free:laatste?.free??!!inschrijving.free},...kopie(historie.filter(h=>h.from>datum))]};
    inschrijving.end=plusDag(datum,-1);
    inschrijving.history=[...historie.filter(h=>h.from<datum),{from:datum,action:'stop',days:{}}];
    if(!historie.length)inschrijving.history.unshift({from:inschrijving.start||datum.slice(0,7)+'-01',action:'start',days:inschrijving.days||{},free:!!inschrijving.free});
  }
  for(const [dag,rij] of Object.entries(d.attendance||{})) if(dag>=datum && Object.hasOwn(rij,bk)) {rij[dk]=rij[bk];delete rij[bk];}
  return d;
}

export function neemFicheMee(bron,doel,leerling,van,naar,datum) {
  const matches=(bron.students||[]).filter(s=>String(s.schoolbeheerId||'')===String(leerling.id) || (!s.schoolbeheerId && naamKey(s)===naamKey(leerling)));
  eis(matches.length===1, 'De overgangsfiche ontbreekt of is niet eenduidig gekoppeld. Controleer de bronfiche eerst.');
  const fiche=matches[0];
  eis(!(doel.students||[]).some(s=>s.id===fiche.id || String(s.schoolbeheerId||'')===String(leerling.id) || naamKey(s)===naamKey(leerling)), 'Er bestaat al een overgangsfiche voor deze leerling of naamgenoot in de doelklas.');
  const b=kopie(bron), d=kopie(doel);
  b.students=b.students.filter(s=>s.id!==fiche.id);
  (b.klaswisselArchief||=[]).push({van,naar,datum,fiche:kopie(fiche),groepen:kopie((b.groups||[]).filter(g=>g.ids?.includes(fiche.id))),vergrendeling:b.locks?.[fiche.id]??null});
  if(b.groups)b.groups=b.groups.map(g=>Array.isArray(g.ids)?{...g,ids:g.ids.filter(id=>id!==fiche.id)}:g);
  if(b.locks)delete b.locks[fiche.id];
  (d.students||=[]).push({...kopie(fiche),schoolbeheerId:leerling.id});
  b.klaswisselVersie=(b.klaswisselVersie||0)+1; d.klaswisselVersie=(d.klaswisselVersie||0)+1;
  return {bron:b,doel:d};
}
