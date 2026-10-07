import {LEVELS,STATUS,EFFECT,PROGRESS,FIELDS,esc,filterGoals,contextFromUrl} from './handelingsplan-model.mjs';
import {buildPlanPdf} from './handelingsplan-pdf.mjs';
const $ = id => document.getElementById(id), form = $('planForm');
const demo = new URLSearchParams(location.search).get('demo') === '1';
const context = contextFromUrl(location.search);
let api, catalog, dossier, current = null, selectedGoal = null, goalItems = [], dirty = false, busy = false, evalOpen = false, operation = null, limit = 35, historyToken = 0;
const uuid = () => crypto.randomUUID();
const priorFields=['schooljaar','klas','periode','doel','aanpak','effect','resultaat','ouders','bron'];
let priorDrafts=[];
function priorHtml(p){return `<div class="history-grid">${Object.entries({doel:'Toenmalig doel',periode:'Periode',aanpak:'Geprobeerd',effect:'Effect',resultaat:'Resultaat en wat we meenemen',ouders:'Ouderafspraken toen',bron:'Informatiebron / betrokken leerkracht'}).map(([k,label])=>`<div><strong>${label}</strong><p>${esc(k==='effect'?EFFECT[p[k]]:p[k]||'—')}</p></div>`).join('')}</div>`;}
function paintPriorDrafts(){
  $('eerdereConcepten').innerHTML=priorDrafts.map((p,i)=>`<details open><summary>${esc(p.schooljaar)} · ${esc(p.klas)} · ${esc(p.doel)}</summary>${priorHtml(p)}<p>Nog niet bewaard. Klik onderaan op Handelingsplan bewaren.</p><button type="button" class="secondary" data-remove-prior="${i}">Deze toevoeging verwijderen</button></details>`).join('');
  $('eerdereConcepten').querySelectorAll('[data-remove-prior]').forEach(b=>b.onclick=()=>{priorDrafts.splice(Number(b.dataset.removePrior),1);paintPriorDrafts();dirtyMark();});
}
function message(text='',error=false){$('melding').textContent=text;$('melding').classList.toggle('error',error);}
function dirtyMark(){dirty=true;operation=null;$('bewaarStatus').textContent='Wijzigingen nog niet bewaard.';}
function field(name){return form.elements.namedItem(name);}
function dateLabel(value){return value ? value.slice(0,10).split('-').reverse().join('/') : '—';}
function goalHtml(g){return `<strong>${esc(g.vakgebied)} · ${esc(g.nummer)}</strong><p>${esc(g.tekst)}</p><p class="meta">${esc(LEVELS.map(k=>g[k]).filter(Boolean).join(' › '))}</p><p class="meta">Leeftijd: ${esc(g.leeftijden.join(', ') || 'niet aangeduid in bron')} jaar</p>${g.toelichting?.length?`<details><summary>Toelichting en voorbeelden uit de doelenset</summary>${g.toelichting.map(t=>`<p>${esc(t)}</p>`).join('')}</details>`:''}`;}
function paintChosen(){
  $('gekozenDoel').innerHTML=selectedGoal ? goalHtml(selectedGoal)+(selectedGoal.items?.length ? `<details><summary>Doel verfijnen met MIA / begrippen</summary>${selectedGoal.items.map((item,i)=>`<label class="item-check"><input type="checkbox" data-goal-item="${i}" ${goalItems.includes(i)?'checked':''} ${current?.versie?'disabled':''}><span><strong>${esc(item.groep)}</strong>: ${esc(item.tekst)}</span></label>`).join('')}</details>`:''):'Kies een doel uit de GO!-doelensets.';
  $('gekozenDoel').querySelectorAll('[data-goal-item]').forEach(el=>el.onchange=()=>{goalItems=[...$('gekozenDoel').querySelectorAll('[data-goal-item]:checked')].map(x=>Number(x.dataset.goalItem));dirtyMark();});
}
function paintOverview(){
  $('plannen').innerHTML=dossier.plannen.length ? dossier.plannen.map(p=>`<article class="plan-card"><span class="badge ${p.status==='actief'?'':'closed'}">${esc(STATUS[p.status])}</span>${p.status==='actief' && p.evaluatiedatum < dossier.vandaag?'<span class="badge late">Evaluatie gepland vóór vandaag</span>':''}<h3>${esc(p.kinddoel)}</h3><p>${esc(p.doel.vakgebied)} · ${esc(p.doel.nummer)} — ${esc(p.doel.tekst)}</p><p class="meta">Gestart in ${esc(p.startSchooljaar)}${p.startKlas?` · ${esc(p.startKlas)}`:""} · volgende evaluatie ${dateLabel(p.evaluatiedatum)}</p>${p.laatsteEvaluatie?`<p><strong>Laatste evaluatie (${dateLabel(p.laatsteEvaluatie.datum)}):</strong> ${esc(EFFECT[p.laatsteEvaluatie.effect])}<br>${esc(p.laatsteEvaluatie.besluit)}</p>`:'<p>Nog geen evaluatie vastgelegd.</p>'}<button class="secondary" type="button" data-plan="${esc(p.id)}">Plan en voorgeschiedenis bekijken</button></article>`).join(''):'<div class="empty"><h3>Nog geen handelingsplan</h3><p>Start vanuit een leerplandoel en leg vast hoe jullie eraan werken.</p></div>';
  $('plannen').querySelectorAll('[data-plan]').forEach(b=>b.onclick=()=>openPlan(dossier.plannen.find(p=>p.id===b.dataset.plan)));
}
async function load(){
  $('pdf').disabled=true;
  const result=await api({action:'load',context});
  dossier=result;
  $('leerling').textContent=`${result.naam} · ${result.klas} · ${result.schooljaar}`;
  $('overzicht').hidden=false;
  $('nieuw').hidden=!result.schrijfbaar;
  $('archief').hidden=result.schrijfbaar;
  $('archief').textContent=`Alleen raadplegen: je opent ${result.schooljaar}. Het lopende schooljaar is ${result.huidigSchooljaar}. Voor wijzigingen open je de actieve leerling in het lopende schooljaar.`;
  paintOverview();message();
}
function toggleEval(open){
  evalOpen=open;$('evaluatieVelden').hidden=!open;$('evaluatieToevoegen').hidden=open;
  ['datum','effect','uitgevoerd','observatie','doelbereik','besluit'].forEach(k=>{field(`eval_${k}`).required=open;});
  if(open && !field('eval_datum').value) field('eval_datum').value=dossier.vandaag;
}
async function openPlan(p=null){
  if(dirty && !confirm('Je hebt onbewaarde wijzigingen. Wil je die verlaten?'))return;
  current=p?structuredClone(p):{id:uuid(),versie:0};
  selectedGoal=p?.doel?structuredClone(p.doel):null;goalItems=selectedGoal?.items.map((_,i)=>i)||[];
  form.reset();toggleEval(false);dirty=false;operation=null;$('bewaarStatus').textContent='';
  priorDrafts=[];paintPriorDrafts();$('eerdereVelden').hidden=true;$('eerdereToevoegen').hidden=false;$('eerdereFout').textContent='';
  const currentYear=Number(dossier.huidigSchooljaar.slice(0,4));
  field('eerder_schooljaar').innerHTML=Array.from({length:16},(_,i)=>{const y=currentYear-i;return `<option value="${y}-${y+1}">${y}-${y+1}</option>`;}).join('');
  field('eerder_schooljaar').value=`${currentYear-1}-${currentYear}`;
  $('eerdereAanpakSectie').hidden=!dossier.schrijfbaar;
  for(const key of Object.keys(FIELDS)) field(key).value=p?.[key] || (key==='startdatum'?dossier.vandaag:key==='status'?'actief':'');
  field('startdatum').readOnly=!!p;
  field('startdatum').max=dossier.vandaag;field('eval_datum').max=dossier.vandaag;
  $('planVelden').disabled=!dossier.schrijfbaar;$('bewaar').hidden=!dossier.schrijfbaar;
  $('kiesDoel').hidden=!!p || !dossier.schrijfbaar;
  $('evaluatieSectie').hidden=!dossier.schrijfbaar;
  $('planTitel').textContent=p?'Handelingsplan':'Nieuw handelingsplan';
  message();
  $('planContext').textContent=p?`Gestart in ${p.startSchooljaar}${p.startKlas?' · '+p.startKlas:''} · nu ${dossier.klas} · versie ${p.versie}`:`Nieuw plan · ${dossier.schooljaar} · ${dossier.klas}`;
  $('overzicht').hidden=true;$('editor').hidden=false;paintChosen();
  $('pdf').disabled=false;
  const token=++historyToken;
  $('historiekSectie').hidden=!p;$('historiek').textContent='Voorgeschiedenis laden…';$('eerdereHistoriek').innerHTML='';
  if(p){try{const data=await api({action:'history',context,planId:p.id});if(token===historyToken)paintHistory(data.historiek);}catch(e){if(token===historyToken)$('historiek').textContent=`Voorgeschiedenis niet geladen: ${e.message}`;}}
  window.scrollTo({top:0,behavior:'smooth'});
}
function planSnapshot(p){return Object.entries(FIELDS).map(([key,label])=>`<div><strong>${esc(label)}</strong><p>${esc(key==='status'?STATUS[p[key]]:p[key] || '—')}</p></div>`).join('');}
function paintHistory(events){
  const earlier=events.flatMap(e=>(e.eerdereAanpak||[]).map(p=>({...p,ingevoerdOp:e.datum,auteur:e.auteur}))).sort((a,b)=>b.schooljaar.localeCompare(a.schooljaar)||a.klas.localeCompare(b.klas,'nl'));
  $('eerdereHistoriek').innerHTML=earlier.length?`<h4>Achteraf aangevulde aanpak per schooljaar en klas</h4>${earlier.map(p=>`<details open><summary>${esc(p.schooljaar)} · ${esc(p.klas)} · ${esc(p.doel)}</summary><p class="meta">Achteraf ingevoerd op ${dateLabel(p.ingevoerdOp)} door ${esc(p.auteur)}.</p>${priorHtml(p)}</details>`).join('')}<h4>Bewaarde versies van het handelingsplan</h4>`:'';
  $('historiek').innerHTML=events.length?events.map(e=>`<details><summary>${dateLabel(e.datum)} · ${e.evaluatie?'Evaluatie en aanpak':e.eerdereAanpak?.length?'Eerdere aanpak aangevuld':'Plan bewaard'} · ${esc(e.context.schooljaar)} · ${esc(e.context.klas)} · versie ${e.versie}</summary><p class="meta">${esc(e.auteur)} · ${esc(e.context.klas)} · vanuit ${esc(e.context.bron)}</p>${e.evaluatie?`<div class="history-grid">${Object.entries({datum:'Evaluatiedatum',uitgevoerd:'Uitgevoerd',observatie:'Observatie',effect:'Effect van de aanpak',doelbereik:'Doelbereik',besluit:'Besluit',ouders:'Besproken met ouders'}).map(([k,label])=>`<div><strong>${label}</strong><p>${esc(k==='effect'?EFFECT[e.evaluatie[k]]:k==='doelbereik'?PROGRESS[e.evaluatie[k]]:e.evaluatie[k]||'—')}</p></div>`).join('')}</div>`:''}<h4>Plan en afspraken op dat moment</h4><div class="history-grid">${planSnapshot(e.plan)}</div></details>`).join(''):'Nog geen bewaarde momenten.';
}
function filters(){return Object.fromEntries(['vakgebied','leeftijd',...LEVELS].map(k=>[k,$(k).value]).concat([['zoek',$('zoekDoel').value]]));}
function options(el,values,label,keep=true){const old=keep?el.value:'';el.innerHTML=`<option value="">${label}</option>`+values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');el.value=values.includes(old)?old:'';}
function refreshFilters(changed){
  const index=LEVELS.indexOf(changed);
  if(changed==='vakgebied'||changed==='leeftijd')LEVELS.forEach(l=>$(l).value='');
  else if(index>=0)LEVELS.slice(index+1).forEach(l=>$(l).value='');
  for(const level of LEVELS){const values=[...new Set(filterGoals(catalog.doelen,filters(),level).map(g=>g[level]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'nl'));options($(level),values,'Alle');$(level).disabled=!values.length;}
  limit=35;paintResults();
}
function paintResults(){
  const matches=filterGoals(catalog.doelen,filters());
  $('aantalDoelen').textContent=`${matches.length} doelen gevonden · ${Math.min(limit,matches.length)} getoond`;
  $('doelenResultaten').innerHTML=matches.slice(0,limit).map(g=>`<article class="goal-item">${goalHtml(g)}<button type="button" data-select-goal="${esc(g.id)}">Dit doel kiezen</button></article>`).join('')||'<p>Geen doelen gevonden. Kies een andere filter of zoekterm.</p>';
  $('meerDoelen').hidden=matches.length<=limit;
  $('doelenResultaten').querySelectorAll('[data-select-goal]').forEach(b=>b.onclick=()=>{selectedGoal=structuredClone(catalog.doelen.find(g=>g.id===b.dataset.selectGoal));goalItems=[];paintChosen();dirtyMark();$('doelenDialog').close();});
}
function draft(){
  const plan=Object.fromEntries(Object.keys(FIELDS).map(k=>[k,field(k).value]));
  plan.doelId=selectedGoal.id;plan.doelItems=goalItems;
  const evaluatie=evalOpen?Object.fromEntries(['datum','effect','uitgevoerd','observatie','doelbereik','besluit','ouders'].map(k=>[k,field(`eval_${k}`).value])):null;
  return {plan,evaluatie,eerdereAanpak:structuredClone(priorDrafts)};
}
form.addEventListener('input',dirtyMark);form.addEventListener('change',dirtyMark);
form.onsubmit=async e=>{
  e.preventDefault();if(busy || !dossier.schrijfbaar)return;
  if(!$('eerdereVelden').hidden){$('bewaarStatus').textContent='Klik eerst bij de eerdere aanpak op Aan plan toevoegen, of laat die invoer weg.';$('eerdereKlaar').focus();return;}
  if(!selectedGoal){$('bewaarStatus').textContent='Kies eerst een leerplandoel.';$('kiesDoel').focus();return;}
  operation ||= {action:'save',context,planId:current.id,expectedVersion:current.versie,operationId:uuid(),...draft()};
  const request=structuredClone(operation);busy=true;$('bewaar').disabled=true;$('planVelden').disabled=true;$('sluiten').disabled=true;
  $('bewaarStatus').textContent='Bezig met bewaren…';
  try{
    await api(request);dirty=false;operation=null;
    // Een geslaagde opslag blijft geslaagd, ook als opnieuw laden even mislukt.
    $('bewaarStatus').textContent='Handelingsplan bewaard.';
    try{await load();$('editor').hidden=true;message('Handelingsplan bewaard. De vorige aanpak en evaluaties blijven beschikbaar.');}
    catch(error){current.versie=request.expectedVersion+1;$('bewaarStatus').textContent='Bewaard, maar het overzicht kon niet vernieuwd worden. Herlaad vóór je verder werkt.';$('bewaar').hidden=true;message(error.message,true);}
  }catch(error){$('bewaarStatus').textContent=error.message || 'Bewaren niet bevestigd. Je invoer blijft staan; probeer opnieuw.';}
  finally{busy=false;$('bewaar').disabled=false;$('planVelden').disabled=!dossier.schrijfbaar;$('sluiten').disabled=false;}
};
$('nieuw').onclick=()=>openPlan();
$('eerdereToevoegen').onclick=()=>{
  priorFields.filter(k=>k!=='schooljaar').forEach(k=>field(`eerder_${k}`).value='');
  $('eerdereVelden').hidden=false;$('eerdereToevoegen').hidden=true;$('eerdereFout').textContent='';
};
$('eerdereKlaar').onclick=()=>{
  const p=Object.fromEntries(priorFields.map(k=>[k,field(`eerder_${k}`).value.trim()]));
  if(['schooljaar','klas','doel','aanpak','effect','resultaat','bron'].some(k=>!p[k])){$('eerdereFout').textContent='Vul schooljaar, klas, doel, aanpak, effect, resultaat en informatiebron in.';return;}
  if(priorDrafts.length>=20){$('eerdereFout').textContent='Bewaar deze toevoegingen eerst voordat je er meer toevoegt.';return;}
  priorDrafts.push(p);paintPriorDrafts();$('eerdereVelden').hidden=true;$('eerdereToevoegen').hidden=false;dirtyMark();
};
$('eerdereAnnuleren').onclick=()=>{if(!confirm('Deze nog niet toegevoegde eerdere aanpak weglaten?'))return;priorFields.filter(k=>k!=='schooljaar').forEach(k=>field(`eerder_${k}`).value='');$('eerdereVelden').hidden=true;$('eerdereToevoegen').hidden=false;};
$('sluiten').onclick=()=>{if(dirty&&!confirm('Onbewaarde wijzigingen verlaten?'))return;dirty=false;historyToken++;$('editor').hidden=true;$('overzicht').hidden=false;$('pdf').disabled=true;};
$('evaluatieToevoegen').onclick=()=>{toggleEval(true);dirtyMark();};
$('evaluatieAnnuleren').onclick=()=>{if(!confirm('Deze nog niet bewaarde evaluatie weglaten?'))return;['datum','effect','uitgevoerd','observatie','doelbereik','besluit','ouders'].forEach(k=>field(`eval_${k}`).value='');toggleEval(false);dirtyMark();};
$('kiesDoel').onclick=()=>{$('doelenDialog').showModal();refreshFilters('');};
$('doelenSluiten').onclick=()=>$('doelenDialog').close();
$('filters').addEventListener('change',e=>refreshFilters(e.target.id));
$('zoekDoel').oninput=()=>{limit=35;paintResults();};$('meerDoelen').onclick=()=>{limit+=35;paintResults();};
window.addEventListener('beforeunload',e=>{if(dirty||busy){e.preventDefault();e.returnValue='';}});
// Print volledige veldinhoud; textarea-scrolvakken zouden tekst kunnen afkappen.
let printReplacements=[],printDetails=[];
window.addEventListener('beforeprint',()=>{
  document.querySelectorAll('#editor textarea,#editor input,#editor select').forEach(el=>{if(el.type==='checkbox')return;const p=document.createElement('div');p.className='print-value';p.textContent=el.tagName==='SELECT'?el.selectedOptions[0]?.textContent || '':el.value;el.after(p);printReplacements.push([el,p,el.hidden]);el.hidden=true;});
  document.querySelectorAll('#historiekSectie details').forEach(el=>{printDetails.push([el,el.open]);el.open=true;});
});
window.addEventListener('afterprint',()=>{printReplacements.forEach(([el,p,hidden])=>{el.hidden=hidden;p.remove();});printDetails.forEach(([el,open])=>el.open=open);printReplacements=[];printDetails=[];});
$('print').onclick=()=>window.print();
$('pdf').onclick=async()=>{
  if(busy||!current)return;
  if(!selectedGoal){message('Kies eerst een leerplandoel voor de PDF.',true);return;}
  if(!$('eerdereVelden').hidden){message('Klik eerst op Aan plan toevoegen om de eerdere aanpak ook in de PDF op te nemen.',true);return;}
  $('pdf').disabled=true;
  try{
    const events=current.versie?(await api({action:'history',context,planId:current.id})).historiek:[];
    const values=draft();
    const pdf=buildPlanPdf(window.jspdf.jsPDF,{naam:dossier.naam,klas:dossier.klas,schooljaar:dossier.schooljaar,
      plan:{...values.plan,doel:{...selectedGoal,items:goalItems.map(i=>selectedGoal.items[i])}},events,priorDrafts,evaluation:values.evaluatie,concept:dirty||!current.versie});
    pdf.save(`Handelingsplan_${dossier.naam.replace(/[^a-z0-9_-]/gi,'_')}_${dossier.schooljaar}.pdf`);
    message('PDF gedownload, inclusief bewaarde voorgeschiedenis.');
  }catch(e){message(`PDF niet gemaakt: ${e.message}`,true);}finally{$('pdf').disabled=$('editor').hidden;}
};
async function start(){
  const response=await fetch('./handelingsplan-doelen.json');if(!response.ok)throw Error('De doelenbibliotheek kon niet geladen worden.');catalog=await response.json();
  options($('vakgebied'),[...new Set(catalog.doelen.map(g=>g.vakgebied))].sort((a,b)=>a.localeCompare(b,'nl')),'Alle vakgebieden',false);
  options($('leeftijd'),catalog.leeftijden,'Alle leeftijden',false);
  if(demo){$('demoBanner').hidden=false;api=(await import('./handelingsplan-demo.mjs')).createDemoApi(catalog);await load();return;}
  if(!context.schooljaar || !context.bron)throw Error('Open deze pagina via de knop Handelingsplan bij een kind in zorgoverleg of overgangsbespreking.');
  const [{initializeApp},{getAuth,onAuthStateChanged},sdk,{createFirestoreApi}]=await Promise.all([
    import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js'),import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js'),import('./handelingsplan-opslag.mjs')]);
  const app=initializeApp({apiKey:'AIzaSyA7KxXMvZ4dzBQDut3CMyWUblLte2tFzoQ',authDomain:'huiswerkapp-a311e.firebaseapp.com',projectId:'huiswerkapp-a311e',storageBucket:'huiswerkapp-a311e.appspot.com',messagingSenderId:'797169941164',appId:'1:797169941164:web:511d9618079f1378d0fd09'});
  onAuthStateChanged(getAuth(app),async user=>{
    if(!user){$('overzicht').hidden=true;$('editor').hidden=true;dossier=null;message('Meld je aan via de toepassing en open daarna opnieuw het handelingsplan.',true);return;}
    api=createFirestoreApi({sdk,db:sdk.getFirestore(app),user,catalog});
    try{await load();}catch(e){message(e.message,true);}
  });
}
start().catch(e=>message(e.message,true));
