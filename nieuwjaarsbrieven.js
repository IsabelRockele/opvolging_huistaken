import { STANDAARD_PRIJS, bedrag, statusBrief, deadlineVoorbij, geldigAantal, pastInFilter } from './nieuwjaarsbrieven-model.mjs?v=20261021';
import { maakAfvinklijst } from './nieuwjaarsbrieven-afdruk.mjs?v=20261021';

// Orders live separately from class documents so saving another school module cannot overwrite them.
export function maakNieuwjaarsbrieven({db,doc,collection,onSnapshot,runTransaction,Timestamp,context,esc}) {
  let scope='', stop=[], instellingen={}, orders=new Map(), geladen=0, fout='', bezig=false, filter='alle', bewaarMelding='';
  let invoer=Promise.resolve();
  const euro=cent=>new Intl.NumberFormat('nl-BE',{style:'currency',currency:'EUR'}).format(cent/100);
  const prijs=()=>instellingen.prijsCent ?? STANDAARD_PRIJS;
  const configRef=jaar=>doc(db,'schoolbeheer',jaar,'instellingen','nieuwjaarsbrieven');
  const orderRef=(jaar,klas,id)=>doc(db,'schoolbeheer',jaar,'klassen',klas,'nieuwjaarsbrieven',id);
  const toon=()=>{if(context().tab==='nieuwjaarsbrieven')render();};
  function sluit(){stop.forEach(fn=>fn());stop=[];scope='';}
  function render(){
    // Replacing the table resets its scroll position and can also clamp the
    // surrounding page's scroll position while its contents are replaced.
    const doel=document.getElementById('content');
    const c=context(), zelfdeKlas=scope===`${c.jaar}/${c.klas}/${c.secretariaat}`;
    // Keep the actual selection control alive throughout
    // editing. Replacing it during a pointer press can move the next click.
    if(zelfdeKlas&&document.activeElement?.dataset?.nbId&&doel.contains(document.activeElement))return;
    const posities=[];
    if(zelfdeKlas){
      for(let el=doel;el;el=el.parentElement)posities.push([el,el.scrollTop,el.scrollLeft]);
    }
    const tabellen=zelfdeKlas?[...doel.querySelectorAll('.table-wrap')].map(el=>[el.scrollTop,el.scrollLeft]):[];
    try{renderInhoud();}finally{
      doel.querySelectorAll('.table-wrap').forEach((el,i)=>{
        if(tabellen[i]){el.scrollTop=tabellen[i][0];el.scrollLeft=tabellen[i][1];}
      });
      for(const [el,top,left] of posities){el.scrollTop=top;el.scrollLeft=left;}
    }
  }
  function renderInhoud(){
    const c=context(), key=`${c.jaar}/${c.klas}/${c.secretariaat}`;
    if(scope!==key){
      sluit();scope=key;instellingen={};orders=new Map();geladen=0;fout='';bewaarMelding='';
      const ontvang=(fn)=>snap=>{if(scope!==key)return;fn(snap);geladen|=fn===ontvangConfig?1:2;toon();};
      const ontvangConfig=snap=>{instellingen=snap.exists()?snap.data():{};};
      const error=e=>{fout='Laden mislukt: '+e.message;toon();};
      stop.push(onSnapshot(configRef(c.jaar),ontvang(ontvangConfig),error));
      // Each class has a small independent subscription; this also supplies the school overview.
      const klassen=c.secretariaat?c.klassen:[c.klas];let ontvangen=new Set();
      for(const klas of klassen)stop.push(onSnapshot(collection(db,'schoolbeheer',c.jaar,'klassen',klas,'nieuwjaarsbrieven'),snap=>{
        if(scope!==key)return;
        for(const [k,v] of orders)if(v.klas===klas)orders.delete(k);
        snap.docs.forEach(d=>orders.set(`${klas}/${d.id}`,{...d.data(),id:d.id,klas}));
        ontvangen.add(klas);if(ontvangen.size===klassen.length)geladen|=2;toon();
      },error));
    }
    const doel=document.getElementById('content');
    if(fout){doel.innerHTML=`<div class="panel"><h2>Nieuwjaarsbrieven</h2><p role="alert">${esc(fout)}</p><button onclick="nbVernieuw()">Opnieuw proberen</button></div>`;return;}
    if(geladen!==3){doel.innerHTML='<div class="panel"><h2>Nieuwjaarsbrieven</h2><p>Gegevens laden…</p></div>';return;}
    const dicht=deadlineVoorbij(instellingen.deadline), mag=c.secretariaat||!dicht;
    const leerlingen=new Map(c.leerlingen.map(s=>[s.id,s]));
    const ids=new Set([...leerlingen.keys(),...[...orders.values()].filter(r=>r.klas===c.klas).map(r=>r.id)]);
    let aantal=0,totaal=0;
    const rijen=[...ids].map(id=>{const order=orders.get(`${c.klas}/${id}`),r=order?.aantal===null?undefined:order,s=leerlingen.get(id),naam=s?c.naam(s):r?.naam||id, a=r?.aantal??0, status=statusBrief(r,prijs()), open=status.includes('te verwerken');aantal+=a;totaal+=bedrag(a,prijs());
      if(!pastInFilter(r,filter,prijs()))return '';
      const verschil=r?.verwerkt?bedrag(a,prijs())-r.verwerkt.bedragCent:0;
      return `<tr><td>${esc(naam)}${!s?'<br><small>Niet meer op actieve klaslijst</small>':''}</td><td><select aria-label="Aantal voor ${esc(naam)}" data-nb-id="${esc(id)}" ${!mag||bezig?'disabled':''} style="min-width:180px"><option value="" ${!r?'selected':''} ${r?.verwerkt?'disabled':''}>Nog niet ingevuld</option>${Array.from({length:1000},(_,n)=>`<option value="${n}" ${r&&a===n?'selected':''}>${n===0?'Geen brieven gewenst (0)':n}</option>`).join('')}</select></td><td>${r?euro(bedrag(a,prijs())):"—"}</td><td><span class="tag ${status==='Verwerkt'?'done':''}">${esc(status)}</span>${r?.verwerkt?`<br><small>Laatst verwerkt: ${r.verwerkt.aantal} brief/brieven · ${euro(r.verwerkt.bedragCent)}<br>${esc(r.verwerkt.door)} · ${esc(r.verwerkt.op?.toDate?.().toLocaleString('nl-BE')||'')}${open?`<br><strong>${r.verwerkt.aantal} → ${a} · verschil ${verschil>=0?'+':''}${euro(verschil)}</strong>`:''}</small>`:''}${r?.gewijzigdDoor?`<br><small>Invoer: ${esc(r.gewijzigdDoor)} · ${esc(r.gewijzigdOp?.toDate?.().toLocaleString('nl-BE')||'')}</small>`:''}</td>${c.secretariaat?`<td>${r&&(open||!r.verwerkt)?`<button data-nb-process="${esc(id)}" ${bezig?'disabled':''}>Verwerkt</button>`:''}</td>`:''}</tr>`;
    }).join('');
    doel.innerHTML=`<div class="panel"><h2>✉️ Nieuwjaarsbrieven — ${esc(c.klas)} — ${esc(c.jaar)}</h2><p>Prijs per brief: <strong>${euro(prijs())}</strong>. ${instellingen.deadline?`Invullen tot en met <strong>${esc(instellingen.deadline)}</strong>.`:'Er is nog geen deadline ingesteld.'}</p>${dicht?'<div class="notice">De deadline is voorbij. Wijzigingen kunnen alleen nog via het secretariaat.</div>':''}
      ${c.secretariaat?`<details class="notice no-print"><summary>Prijs en deadline voor dit schooljaar instellen</summary><p>Een prijswijziging herberekent alle bedragen. Reeds verwerkte bestellingen met een ander bedrag verschijnen opnieuw als gewijzigd.</p><div class="row"><label>Prijs per brief (€)<input id="nbPrijs" type="number" min="0" max="100" step="0.01" value="${(prijs()/100).toFixed(2)}"></label><label>Deadline (tot en met)<input id="nbDeadline" type="date" value="${esc(instellingen.deadline||'')}"></label><button onclick="nbInstellingen()" ${bezig?'disabled':''}>Instellingen bewaren</button></div></details><div class="notice"><strong>Schooloverzicht — nog te verwerken</strong><div class="actions">${c.klassen.map(k=>{const n=[...orders.values()].filter(r=>r.klas===k&&statusBrief(r,prijs()).includes('te verwerken')).length;return `<button class="${n?'':'white'}" data-nb-class="${esc(k)}">${esc(k)} · ${n} open</button>`;}).join('')}</div></div>`:''}
      <div class="actions no-print"><button type="button" class="white" onclick="nbAfvinklijst()" ${bezig?'disabled':''}>🖨️ Afvinklijst afdrukken</button><span class="muted">Volledige klaslijst met aantallen en afvinkvakjes voor op papier.</span></div><p><strong>Totaal klas: ${aantal} brieven · ${euro(totaal)}</strong></p><p role="status" aria-live="polite">${bezig?'Bewaren…':esc(bewaarMelding)}</p><label class="no-print">Toon<select id="nbFilter"><option value="alle" ${filter==='alle'?'selected':''}>Alle kinderen</option><option value="ingevuld" ${filter==='ingevuld'?'selected':''}>Enkel ingevulde kinderen</option><option value="open" ${filter==='open'?'selected':''}>Enkel nog te verwerken kinderen</option><option value="leeg" ${filter==='leeg'?'selected':''}>Enkel nog niet ingevulde kinderen</option></select></label><p class="muted">Kies een aantal om te bewaren. Kies “Nog niet ingevuld” zolang er nog geen antwoord is, of “Geen brieven gewenst (0)” bij een bevestigde nee. Een vermindering van een verwerkte bestelling naar 0 blijft zichtbaar voor verwerking.</p><div class="table-wrap"><table><thead><tr><th>Leerling</th><th>Aantal</th><th>Bedrag</th><th>Status</th>${c.secretariaat?'<th>Verwerking</th>':''}</tr></thead><tbody>${rijen||`<tr><td colspan="5">Geen leerlingen of bestellingen in deze selectie.</td></tr>`}</tbody></table></div></div>`;
    doel.querySelectorAll('[data-nb-id]').forEach(el=>{
      el.addEventListener('change',()=>{
        const id=el.dataset.nbId,raw=el.value;
        invoer=invoer.then(()=>wijzig(id,raw===''?null:Number(raw),raw===''?'reset':raw));
        return invoer;
      });
      el.addEventListener('blur',()=>setTimeout(toon,0));
    });
    doel.querySelectorAll('[data-nb-process]').forEach(el=>el.addEventListener('click',()=>verwerk(el.dataset.nbProcess)));
    doel.querySelectorAll('[data-nb-class]').forEach(el=>el.addEventListener('click',()=>c.openKlas(el.dataset.nbClass)));
    document.getElementById('nbFilter').onchange=e=>{filter=e.target.value;render();};
  }
  async function actie(fn){if(bezig)return;bezig=true;toon();try{await fn();bewaarMelding='✓ Bewaard';}catch(e){bewaarMelding='Niet bewaard. Probeer opnieuw.';alert('Niet bewaard: '+e.message);}finally{bezig=false;toon();}}
  async function wijzig(id,aantal,raw){
    if(raw!=='reset'&&(raw===''||!geldigAantal(aantal))){alert('Vul een geheel aantal van 0 tot en met 999 in.');toon();return;}
    const c=context(),naam=c.leerlingen.find(s=>s.id===id);
    await actie(()=>runTransaction(db,async tx=>{
      const cfg=await tx.get(configRef(c.jaar)),ref=orderRef(c.jaar,c.klas,id),snap=await tx.get(ref),oud=snap.exists()?snap.data():null;
      if(!c.secretariaat&&deadlineVoorbij(cfg.data()?.deadline))throw Error('De deadline is voorbij. Neem contact op met het secretariaat.');
      if(aantal===null&&oud?.verwerkt)throw Error('Deze bestelling is al verwerkt. Laat het secretariaat de bestelling corrigeren.');
      if(oud?.aantal===aantal)return;
      const nieuw={aantal,naam:naam?c.naam(naam):oud?.naam||id,gewijzigdDoor:c.gebruiker,gewijzigdOp:Timestamp.now()};
      tx.set(ref,{...oud,...nieuw});
      tx.set(doc(collection(ref,'geschiedenis')),{...nieuw,vorigAantal:oud?.aantal??null,actie:'aantal'});
    }));
  }
  async function verwerk(id){
    const c=context();if(!c.secretariaat)return;
    const gezien=orders.get(`${c.klas}/${id}`),gezienPrijs=prijs();if(!gezien)return;
    await actie(()=>runTransaction(db,async tx=>{
      const cfg=await tx.get(configRef(c.jaar)),ref=orderRef(c.jaar,c.klas,id),snap=await tx.get(ref),r=snap.data(),p=cfg.data()?.prijsCent??STANDAARD_PRIJS;
      if(!r||r.aantal!==gezien.aantal||p!==gezienPrijs||r.gewijzigdOp?.toMillis()!==gezien.gewijzigdOp?.toMillis())throw Error('De bestelling is ondertussen gewijzigd. Controleer de nieuwe gegevens en verwerk opnieuw.');
      const verwerkt={aantal:r.aantal,bedragCent:bedrag(r.aantal,p),door:c.gebruiker,op:Timestamp.now()};
      tx.update(ref,{verwerkt});tx.set(doc(collection(ref,'geschiedenis')),{actie:'verwerkt',...verwerkt});
    }));
  }
  window.nbInstellingen=async()=>{
    const c=context();if(!c.secretariaat)return;
    const raw=document.getElementById('nbPrijs').value,p=Number(raw),deadline=document.getElementById('nbDeadline').value;
    if(raw===''||!Number.isFinite(p)||p<0||p>100||Math.abs(p*100-Math.round(p*100))>0.00001){alert('Vul een geldige prijs in met maximaal twee decimalen.');return;}
    // Firestore stores the exact Brussels midnight after the inclusive deadline.
    let sluitOp=null;
    if(deadline){const d=new Date(deadline+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);const dag=d.toISOString().slice(0,10);let t=new Date(dag+'T00:00:00Z');const uur=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Brussels',hour:'2-digit',hourCycle:'h23'}).format(t));t=new Date(t.getTime()-uur*3600000);sluitOp=Timestamp.fromDate(t);}
    await actie(()=>runTransaction(db,async tx=>{const ref=configRef(c.jaar),oud=await tx.get(ref);tx.set(ref,{prijsCent:Math.round(p*100),deadline,sluitOp,gewijzigdDoor:c.gebruiker,gewijzigdOp:Timestamp.now()});tx.set(doc(collection(ref,'geschiedenis')),{actie:'instellingen',prijsCent:Math.round(p*100),deadline,vorigePrijsCent:oud.data()?.prijsCent??60,vorigeDeadline:oud.data()?.deadline||'',door:c.gebruiker,op:Timestamp.now()});}));
  };
  window.nbVernieuw=()=>{sluit();render();};
  window.nbAfvinklijst=()=>{
    if(geladen!==3||bezig)return;
    const c=context(),venster=window.open('','_blank');
    if(!venster){alert('Sta pop-ups toe om de afvinklijst te openen.');return;}
    venster.opener=null;
    venster.document.open();
    venster.onload=()=>{venster.focus();venster.print();};
    venster.document.write(maakAfvinklijst({klas:c.klas,jaar:c.jaar,leerlingen:c.leerlingen,orders,naam:c.naam}));
    venster.document.close();
  };
  return {render,sluit};
}
