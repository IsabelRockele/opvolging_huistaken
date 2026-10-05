import {doc,getDocFromServer,runTransaction} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import {verplaatsKlasleerling,neemZorgMee,neemFicheMee,neemHuiswerkMee,klasPeildatum,gelijkeDocumentInhoud} from './klaswissel-model.mjs?v=20261005-inhoud';
import {zelfdeFotoregistratie} from './fototoestemming.js';

// Eén controleerbaar plan, gevolgd door één transactie met dezelfde bronversies.
// Bij een fout, conflict of ontbrekend leesrecht wordt niets overgezet.
export async function maakKlaswisselPlan(db,{jaar,van,naar,id,datum}) {
  const gelezen=new Map(), wijzigingen=new Map();
  async function lees(pad) {
    if(!gelezen.has(pad)) { const ref=doc(db,pad), snap=await getDocFromServer(ref); gelezen.set(pad,{ref,bestaat:snap.exists(),data:snap.exists()?snap.data():null}); }
    return gelezen.get(pad).data;
  }
  const bronPad=`schoolbeheer/${jaar}/klassen/${van}`, doelPad=`schoolbeheer/${jaar}/klassen/${naar}`;
  const [bron,doel]=await Promise.all([lees(bronPad),lees(doelPad)]);
  if(!bron||!doel) throw Error('Beide klassen moeten al bestaan.');
  if(datum>klasPeildatum(jaar)) throw Error('Voer de klaswissel op de ingangsdatum uit. Een toekomstige dossieroverdracht wordt nog niet ondersteund.');
  const wissel=verplaatsKlasleerling({bron,doel,id,datum,jaar,van,naar});
  wijzigingen.set(bronPad,wissel.bron); wijzigingen.set(doelPad,wissel.doel);
  const naam=[wissel.leerling.last||wissel.leerling.lastName,wissel.leerling.first||wissel.leerling.firstName].filter(Boolean).join(', ');
  const maanden=Array.from({length:10},(_,i)=>i<4?`${jaar.slice(0,4)}-${String(i+9).padStart(2,'0')}`:`${jaar.slice(5)}-${String(i-3).padStart(2,'0')}`);
  let zorgmaanden=0;
  for(const maand of maanden) {
    const pad=`zorgoverleggen/${jaar}/klassen/${naar}/maanden/${maand}`;
    const [b,d]=await Promise.all([lees(`zorgoverleggen/${jaar}/klassen/${van}/maanden/${maand}`),lees(pad)]);
    if(!b) continue;
    const bewaartermijnJaren=({K1:12,K2:11,K3:10,'1A':9,'2A':8,'3A':7,'4A':6,'5A':5,'6A':4})[naar]||12;
    const nieuw=neemZorgMee(b,d||{titel:`Zorgoverleg ${maand}`,schooljaar:jaar,klas:naar,maand,bewaarTot:`${Number(jaar.slice(0,4))+bewaartermijnJaren}-08-31`,bewaartermijnJaren,entries:{},groupActions:[]},id,naam,van);
    if(nieuw) {nieuw.klaswissel={leerlingId:id,zorgKey:String(id).replace(/[^a-z0-9_-]+/gi,'_'),van,naar,datum};wijzigingen.set(pad,nieuw);zorgmaanden++;}
  }
  async function projectPad(klas) {
    const koppeling=await lees(`klasleerkrachten/${jaar}_${klas}`);
    const uid=koppeling?.eigenaar_uid||koppeling?.leerkracht_uids?.[0];
    const pad=`overgangsbesprekingen/${jaar}/projecten/${uid||`klas_${klas.replace(/[^a-z0-9_-]+/gi,'_')}`}`;
    const project=await lees(pad);
    if(!project || !Array.isArray(project.students)) throw Error(`Geen geldige overgangsbespreking voor ${klas} gevonden. Open en controleer die eerst.`);
    if(project.klas && project.klas!==klas) throw Error(`De gekoppelde overgangsbespreking hoort bij ${project.klas}, niet bij ${klas}.`);
    return pad;
  }
  const [bp,dp]=await Promise.all([projectPad(van),projectPad(naar)]);
  if(bp===dp) throw Error('Beide klassen verwijzen naar hetzelfde overgangsdossier. Controleer de klaskoppelingen.');
  const fiches=neemFicheMee(gelezen.get(bp).data,gelezen.get(dp).data,wissel.leerling,van,naar,datum);
  wijzigingen.set(bp,fiches.bron); wijzigingen.set(dp,fiches.doel);
  for(const maand of maanden.filter(m=>m>=datum.slice(0,7))) {
    const pad=`huiswerkklas/${jaar}/maanden/${maand}`, inhoud=await lees(pad);
    if(inhoud) {const nieuw=neemHuiswerkMee(inhoud,{id,van,naar,datum});if(nieuw)wijzigingen.set(pad,nieuw);}
  }
  const fotoPad=`schoolbeheer/${jaar}/instellingen/fototoestemming`, foto=await lees(fotoPad);
  if(foto) {
    const nieuw={...foto}; let aangepast=false;
    for(const veld of ['uitzonderingen','ontbrekendeFormulieren','gecontroleerdeLeerlingen']) if(Array.isArray(foto[veld])) {
      nieuw[veld]=foto[veld].map(s=>{
        if(s.klas===van && zelfdeFotoregistratie(s,{leerlingId:id,naam,klas:van})) {aangepast=true;return {...s,klas:naar,leerlingId:id};}
        return s;
      });
    }
    if(aangepast) wijzigingen.set(fotoPad,nieuw);
  }
  return {jaar,van,naar,id,datum,naam,zorgmaanden,aankopen:wissel.aankopen,gelezen,wijzigingen};
}

export async function bewaarKlaswissel(db,plan,gebruiker) {
  const code=crypto.randomUUID(),gemaaktOpIso=new Date().toISOString();
  await runTransaction(db,async tx=>{
    for(const {ref,bestaat,data} of plan.gelezen.values()) {
      const snap=await tx.get(ref);
      if(snap.exists()!==bestaat || !gelijkeDocumentInhoud(snap.exists()?snap.data():null,data)) {
        const delen=ref.path.split('/'),onderdeel=delen[0]==='zorgoverleggen'?`het zorgoverleg van ${delen[3]} (${delen[5]})`:delen[0]==='overgangsbesprekingen'?'een overgangsbespreking':delen[0]==='huiswerkklas'?`de huiswerkklas (${delen[3]})`:delen[2]==='klassen'?`de klaslijst van ${delen[3]}`:'de klaskoppeling of fototoestemming';
        throw Error(`Er zijn intussen gegevens gewijzigd in ${onderdeel}. Maak een nieuw controle-overzicht; er is niets verplaatst.`);
      }
    }
    for(const [pad,nieuw] of plan.wijzigingen) {
      const oud=plan.gelezen.get(pad);
      const backup=doc(db,'veiligheidskopieen',pad.replace(/[^a-z0-9_-]+/gi,'__'),'versies',code);
      tx.set(backup,{bronPad:pad,bronBestond:oud.bestaat,bronData:oud.data,reden:`Klaswissel ${plan.van} naar ${plan.naar} vanaf ${plan.datum}`,schooljaar:plan.jaar,klas:plan.van,gebruiker,gemaaktOpIso,herstelStatus:'beschikbaar'});
      tx.set(oud.ref,nieuw);
    }
  });
}

export function openKlaswissel({db,jaar,van,id,klassen,gebruiker,voorbereiden,gereed}) {
  document.getElementById('klaswisselDialoog')?.remove();
  const dialog=document.createElement('dialog');dialog.id='klaswisselDialoog';dialog.style.cssText='max-width:680px;width:90%;border:0;border-radius:16px;padding:24px';
  dialog.innerHTML='<h2>Deze leerling verplaatsen vanaf datum</h2><p>De eerdere lijsten blijven bij de oude klas. De leerlingfiche, zorginhoud en afwezigheidsattesten gaan mee. Andere leerlingen worden niet vervangen.</p><label>Nieuwe klas <select id="wisselDoel"></select></label> <label>Vanaf <input id="wisselDatum" type="date"></label><p id="wisselStatus" role="status"></p><div id="wisselControle"></div><button id="wisselBekijk">Controle-overzicht maken</button> <button id="wisselBewaar" hidden>Deze klaswissel bewaren</button> <button id="wisselSluit">Sluiten</button>';
  document.body.append(dialog); const el=id=>dialog.querySelector('#'+id);
  for(const klas of klassen.filter(k=>k!==van)) el('wisselDoel').add(new Option(klas,klas));
  el('wisselDatum').value=klasPeildatum(jaar);el('wisselDatum').min=`${jaar.slice(0,4)}-09-01`;el('wisselDatum').max=klasPeildatum(jaar);
  let plan=null,busy=false;
  const reset=()=>{plan=null;el('wisselBewaar').hidden=true;el('wisselControle').textContent='';};
  el('wisselDoel').onchange=el('wisselDatum').onchange=reset;
  const vergrendel=value=>{busy=value;for(const x of dialog.querySelectorAll('input,select,button'))x.disabled=value;};
  dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
  el('wisselSluit').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());
  el('wisselBekijk').onclick=async()=>{
    reset();vergrendel(true);el('wisselStatus').textContent='Klaslijsten, dossiers en afgesloten registraties controleren…';
    try {
      await voorbereiden();
      plan=await maakKlaswisselPlan(db,{jaar,van,naar:el('wisselDoel').value,id,datum:el('wisselDatum').value});
      el('wisselControle').textContent=`${plan.naam}: ${van} → ${plan.naar} vanaf ${plan.datum}. De volledige overgangsfiche, ${plan.zorgmaanden} maand(en) zorginhoud, afwezigheidsattesten en ${plan.aankopen} aankoop/aankopen vanaf die datum gaan mee. Actuele klaslijsten volgen de nieuwe klas. Eerdere financiële registraties blijven bij ${van}.`;
      el('wisselStatus').textContent='Controle geslaagd. Bij bewaren wordt alles samen opgeslagen met veiligheidskopieën.';el('wisselBewaar').hidden=false;
    } catch(e) {el('wisselStatus').textContent=e.message;}
    finally {vergrendel(false);}
  };
  el('wisselBewaar').onclick=async()=>{
    if(!plan)return;vergrendel(true);el('wisselStatus').textContent='Klaswissel en veiligheidskopieën bewaren…';
    try {await bewaarKlaswissel(db,plan,gebruiker);dialog.close();await gereed();alert('Klaswissel bewaard. Open de betrokken lijsten opnieuw om de nieuwe klasindeling te zien.');}
    catch(e) {reset();el('wisselStatus').textContent='Niet verplaatst: '+e.message;}
    finally {vergrendel(false);}
  };
  dialog.showModal();
}
