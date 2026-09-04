import {getFirestore,doc,getDocFromServer,collection,getDocsFromServer,Timestamp,GeoPoint,Bytes,DocumentReference} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// Expliciet getypeerde waarden voor later gecontroleerd herstel; geen schrijf-API.
export function backupWaarde(v){
  if(v instanceof Timestamp)return {__firestoreType:'Timestamp',seconds:v.seconds,nanoseconds:v.nanoseconds};
  if(v instanceof GeoPoint)return {__firestoreType:'GeoPoint',latitude:v.latitude,longitude:v.longitude};
  if(v instanceof Bytes)return {__firestoreType:'Bytes',base64:v.toBase64()};
  if(v instanceof DocumentReference)return {__firestoreType:'DocumentReference',path:v.path};
  if(Array.isArray(v))return v.map(backupWaarde);
  if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,backupWaarde(x)]));
  if(typeof v==='number'&&!Number.isFinite(v))return {__firestoreType:'Number',value:String(v)};
  return v;
}

export function initKlassenBackup(app,auth){
  if(document.getElementById('klassenBackupKnop'))return;
  const banner=document.querySelector('.banner-account');if(!banner)return;
  const knop=document.createElement('button');knop.id='klassenBackupKnop';knop.type='button';knop.className='knop-banner';knop.textContent='Back-up van alle klassen';banner.append(knop);
  const modal=document.createElement('dialog');modal.style.cssText='max-width:740px;width:calc(100% - 50px);border:0;border-radius:16px;padding:24px;max-height:85vh;overflow:auto';
  modal.innerHTML=`<h2>Back-up van alle klassen</h2><p>Alle overgangsprojecten, overdrachtsdossiers, centrale klaslijsten en GOK-gegevens van het gekozen schooljaar. Inclusief de klaskoppelingen om de bronnen later te kunnen terugvinden.</p><p><strong>Alleen lezen:</strong> deze knop wijzigt niets en zet niets terug. Dit is geen back-up van de volledige schoolapp, bijvoorbeeld groeigroepen worden niet meegenomen.</p><label>Schooljaar <input id="backupSchooljaar" placeholder="2026-2027" pattern="[0-9]{4}-[0-9]{4}" style="font:inherit;padding:8px;width:145px"></label><p>Laat leerkrachten tijdens het maken liefst niet verder wijzigen: de bronnen worden na elkaar gelezen en vormen geen momentopname van precies hetzelfde tijdstip.</p><button type="button" id="backupLezen">1. Alle klassen lezen</button> <button type="button" id="backupDownload" disabled>2. JSON-back-up downloaden</button> <button type="button" id="backupSluiten">Sluiten</button><p id="backupStatus" role="status" aria-live="polite"></p><div id="backupOverzicht"></div><p><strong>Vertrouwelijke leerlinggegevens:</strong> bewaar op een beveiligde schoollocatie, niet in een openbare map. Bewaar meerdere gedateerde versies.</p>`;
  document.body.append(modal);
  const el=id=>modal.querySelector('#'+id),db=getFirestore(app);
  let busy=false,payload=null,owner=null;
  const status=t=>{el('backupStatus').textContent=t;};
  function reset(){payload=null;owner=null;el('backupDownload').disabled=true;el('backupOverzicht').replaceChildren();status('');}
  async function checkAdmin(uid){const snap=await getDocFromServer(doc(db,'schoolrollen',uid));if(auth.currentUser?.uid!==uid||!snap.exists()||snap.data().rol!=='beheerder')throw Error('Alleen het echte beheerdersaccount mag deze back-up maken.');}
  knop.onclick=()=>{reset();const d=new Date(),y=d.getMonth()>=8?d.getFullYear():d.getFullYear()-1;el('backupSchooljaar').value=`${y}-${y+1}`;modal.showModal();};
  el('backupSchooljaar').oninput=reset;
  el('backupSluiten').onclick=()=>{if(!busy)modal.close();};
  modal.addEventListener('cancel',e=>{if(busy)e.preventDefault();});modal.addEventListener('close',reset);
  auth.onAuthStateChanged(user=>{if(!user||owner&&user.uid!==owner){reset();if(!user){modal.close();knop.remove();modal.remove();}}});
  el('backupLezen').onclick=async()=>{
    if(busy)return;reset();const year=el('backupSchooljaar').value.trim(),m=year.match(/^(\d{4})-(\d{4})$/);
    if(!m||Number(m[2])!==Number(m[1])+1){status('Vul een schooljaar in zoals 2026-2027.');return;}
    const uid=auth.currentUser?.uid;if(!uid){status('Meld je eerst aan als beheerder.');return;}
    busy=true;el('backupLezen').disabled=true;el('backupSchooljaar').disabled=true;status('Beheerdersrechten controleren…');
    try{
      await checkAdmin(uid);owner=uid;
      const startedAt=new Date().toISOString(),documents=[],errors=[],sources=[];
      const paths=[`schoolbeheer/${year}/klassen`,`overgangsbesprekingen/${year}/projecten`,`overgangsbesprekingen/${year}/dossiers`,'klasleerkrachten'];
      for(const path of paths){
        if(auth.currentUser?.uid!==uid)throw Error('Aanmelding gewijzigd; download geblokkeerd.');
        status('Lezen: '+path);
        try{
          const snap=await getDocsFromServer(collection(db,path));let count=0;
          for(const d of snap.docs){const data=d.data();if(path==='klasleerkrachten'&&data.schooljaar&&data.schooljaar!==year)continue;if(path==='klasleerkrachten'&&!data.schooljaar&&/^\d{4}-\d{4}_/.test(d.id)&&!d.id.startsWith(year+'_'))continue;
            documents.push({path:d.ref.path,data:backupWaarde(data)});count++;
          }
          sources.push({path,count,readAt:new Date().toISOString(),ok:true});
        }catch(e){errors.push({path,error:e.code||e.message});sources.push({path,ok:false});}
      }
      await checkAdmin(uid);
      const classes=documents.filter(d=>d.path.startsWith(`schoolbeheer/${year}/klassen/`)).map(d=>({klas:d.path.split('/').at(-1),leerlingen:(d.data.leerlingen||[]).length,gok:(d.data.leerlingen||[]).filter(s=>s.gok==='ja').length})).sort((a,b)=>a.klas.localeCompare(b.klas,'nl',{numeric:true}));
      const warnings=[];if(!classes.length)warnings.push('Geen centrale klaslijsten gevonden. Controleer het schooljaar.');
      for(const source of sources)if(source.ok&&source.count===0)warnings.push('Geen documenten gevonden in '+source.path);
      const complete=errors.length===0&&classes.length>0;
      payload={format:'school-klassen-backup-v1',projectId:app.options.projectId,schooljaar:year,startedAt,finishedAt:new Date().toISOString(),complete,scope:'Centrale klasdocumenten, overgangsprojecten, overdrachtsdossiers en klaskoppelingen. Geen volledige databaseback-up.',consistency:'Opeenvolgende serverlezingen, geen atomaire momentopname.',sources,errors,warnings,classes,documents};
      status(complete?`Alle opgegeven bronnen gelezen: ${classes.length} klaslijsten, ${documents.length} documenten. Controleer het overzicht en download de back-up.`:'ONVOLLEDIG — niet alle bronnen of klaslijsten konden worden opgehaald. Een eventuele download is alleen een gedeeltelijke back-up.');
      const list=document.createElement('ul');for(const c of classes){const li=document.createElement('li');li.textContent=`${c.klas}: ${c.leerlingen} leerlingregistraties, ${c.gok} GOK (inclusief historische/inactieve registraties)`;list.append(li);}el('backupOverzicht').append(list);
      for(const t of [...sources.map(s=>`${s.path}: ${s.ok?s.count+' documenten':'LEESFOUT'}`),...errors.map(e=>e.path+': '+e.error),...warnings]){const p=document.createElement('p');p.textContent=t;el('backupOverzicht').append(p);}
      el('backupDownload').disabled=!documents.length;
    }catch(e){reset();status('Back-up gestopt: '+e.message);}finally{busy=false;el('backupLezen').disabled=false;el('backupSchooljaar').disabled=false;}
  };
  el('backupDownload').onclick=()=>{
    if(!payload||busy||auth.currentUser?.uid!==owner)return;
    const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`${payload.complete?'':'ONVOLLEDIG-'}klassen-backup-${payload.schooljaar}-${payload.finishedAt.replace(/[:.]/g,'-')}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
    status('Download aangevraagd. Controleer in Downloads of het JSON-bestand is opgeslagen en bewaar het veilig.'+(payload.complete?'':' LET OP: deze back-up is ONVOLLEDIG.'));
  };
}
