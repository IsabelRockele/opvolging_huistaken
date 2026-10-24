import {statusBrief} from './nieuwjaarsbrieven-model.mjs?v=20261024';

export function maakBriefOpvolging({db,doc,collection,onSnapshot,esc,openKlas}) {
  let scope='',stops=[],records=new Map(),ontvangen=new Set(),prijs=60,configGeladen=false,fout=false,klassen=[];
  function sluit(){stops.forEach(stop=>stop());stops=[];scope='';}
  function teken(){
    const el=document.getElementById('briefOpvolging');if(!el)return;
    if(fout){el.innerHTML='<p role="alert">Nieuwjaarsbrieven konden niet geladen worden. Open de module Nieuwjaarsbrieven om opnieuw te proberen.</p>';return;}
    if(!configGeladen||ontvangen.size!==klassen.length){el.innerHTML='<p class="muted">Bestellingen ophalen…</p>';return;}
    const open=klassen.map(klas=>({klas,aantal:(records.get(klas)||[]).filter(r=>statusBrief(r,prijs).includes('te verwerken')).length})).filter(k=>k.aantal);
    el.innerHTML=open.length?`<div class="actions">${open.map(k=>`<button class="heeft-open" data-brief-klas="${esc(k.klas)}">${esc(k.klas)} — ${k.aantal} te verwerken</button>`).join('')}</div>`:'<p><strong>✓ Geen nieuwjaarsbrieven meer te verwerken</strong></p>';
    el.querySelectorAll('[data-brief-klas]').forEach(b=>b.addEventListener('click',()=>openKlas(b.dataset.briefKlas)));
  }
  function start(jaar,lijst){
    const sleutel=jaar+'/'+lijst.join(',');
    if(scope===sleutel){teken();return;}
    sluit();scope=sleutel;klassen=[...lijst];records=new Map();ontvangen=new Set();prijs=60;configGeladen=false;fout=false;
    const error=err=>{if(scope!==sleutel)return;console.warn(err);fout=true;teken();};
    stops.push(onSnapshot(doc(db,'schoolbeheer',jaar,'instellingen','nieuwjaarsbrieven'),snap=>{if(scope!==sleutel)return;prijs=snap.data()?.prijsCent??60;configGeladen=true;teken();},error));
    for(const klas of klassen)stops.push(onSnapshot(collection(db,'schoolbeheer',jaar,'klassen',klas,'nieuwjaarsbrieven'),snap=>{if(scope!==sleutel)return;records.set(klas,snap.docs.map(d=>d.data()));ontvangen.add(klas);teken();},error));
    teken();
  }
  return {start,sluit};
}
