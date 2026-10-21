import {initializeApp, getApps, getApp} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {getAuth, onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {getFirestore, doc, getDocFromServer, setDoc, onSnapshot} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
export const app = getApps().length ? getApp() : initializeApp({apiKey:'AIzaSyA7KxXMvZ4dzBQDut3CMyWUblLte2tFzoQ',authDomain:'huiswerkapp-a311e.firebaseapp.com',projectId:'huiswerkapp-a311e',storageBucket:'huiswerkapp-a311e.appspot.com',messagingSenderId:'797169941164',appId:'1:797169941164:web:511d9618079f1378d0fd09'});
export const auth = getAuth(app), db = getFirestore(app);
export const zorgTools = [
  ['overgang','Overgangsbespreking'], ['oudercontact','Oudercontact'], ['zorgoverleg','Zorgoverleg'],
  ['handelingsplan','Handelingsplan'], ['groeigroepen','Groeigroepen'], ['gok','GOK-overzicht']
];
export const zorgToolUrl = tool => ({overgang:'overgangsbespreking.html',oudercontact:'oudercontact.html',zorgoverleg:'zorgoverleg.html',handelingsplan:'handelingsplan.html',groeigroepen:'groeigroepen.html',gok:'gok-overzicht.html'}[tool] || 'inspectie.html');
export const readyUser = () => new Promise(resolve => {const stop=onAuthStateChanged(auth,u=>{stop();resolve(u);});});
export function geldigBezoek(g, now=Date.now()) {
  return g?.actief===true && g.vanaf?.toMillis?.()<=now && g.tot?.toMillis?.()>now;
}
export async function toegang(user) {
  const snap=await getDocFromServer(doc(db,'schoolrollen',user.uid));
  const rol=snap.data()?.rol||'';
  if(rol==='beheerder') return {rol, simulatie:localStorage.getItem('lindeSimuleerRol_'+user.uid)==='inspectie'};
  if(rol && rol!=='inspectie') return {rol};
  if(!user.emailVerified) return {rol};
  const bezoek=await getDocFromServer(doc(db,'inspectiebezoeken',user.email.toLowerCase()));
  if(!bezoek.exists()) return {rol};
  const geldig=geldigBezoek(bezoek.data());
  // Pin this identity to a permanent read-only role. Changing an email address
  // must never make an inspector fall back to older generic signed-in rights.
  if(!rol && geldig) await setDoc(doc(db,'schoolrollen',user.uid),{rol:'inspectie',inspectieEmail:user.email.toLowerCase()});
  return {rol:'inspectie', bezoek:bezoek.data(), geldig};
}
export function blokkeer(tekst) {
  document.body.replaceChildren();
  const main=document.createElement('main');main.style.cssText='max-width:650px;margin:70px auto;padding:28px;font:18px Arial;background:#fff;border:1px solid #ddd;border-radius:16px';
  const h=document.createElement('h1');h.textContent='Geen toegang';
  const p=document.createElement('p');p.textContent=tekst;
  const a=document.createElement('a');a.href='index.html';a.textContent='Terug naar het startscherm';
  main.append(h,p,a);document.body.append(main);
}
let gate;
export function vereisZorgToegang(tool) {
  return gate ||= (async()=>{
    const user=await readyUser();
    if(!user){location.replace('index.html');return new Promise(()=>{});}
    try {
      const t=await toegang(user);
      if(t.rol==='inspectie'||t.simulatie){
        if(!t.simulatie&&!t.geldig){blokkeer('Je inspectietoegang is nog niet begonnen, afgelopen of ingetrokken.');return new Promise(()=>{});}
        activeerLeesstand(user,t,tool);
        return {...t,alleenLezen:true};
      }
      if(t.rol==='secretariaat'||(t.rol==='beheerder'&&localStorage.getItem('lindeSimuleerRol_'+user.uid)==='secretariaat')){
        blokkeer('Deze zes tools voor leerling en zorg zijn niet beschikbaar voor het secretariaat.');return new Promise(()=>{});
      }
      return t;
    }catch(e){blokkeer('De toegangscontrole kon niet worden uitgevoerd. Probeer opnieuw via het startscherm.');return new Promise(()=>{});}
  })();
}
function activeerLeesstand(user,t,tool){
  if(window.inspectieAlleenLezen)return;
  Object.defineProperty(window,'inspectieAlleenLezen',{value:true,writable:false});
  document.documentElement.classList.add('inspectie-leesstand');
  const css=document.createElement('link');css.rel='stylesheet';css.href='inspectie-leesstand.css?v=20261021-2';document.head.append(css);
  const bar=document.createElement('aside');bar.id='inspectieLeesbalk';bar.setAttribute('aria-label','Inspectie leesstand');
  const title=document.createElement('strong');title.textContent='Inspectie — alleen lezen';bar.append(title);
  const nav=document.createElement('nav');
  for(const [id,label]of zorgTools){const a=document.createElement('a');a.href=zorgToolUrl(id);a.textContent=label;if(id===tool)a.setAttribute('aria-current','page');nav.append(a);}
  bar.append(nav);
  const back=document.createElement('a');back.href='index.html';back.textContent='Startscherm';
  bar.append(back);document.body.prepend(bar);
  const navField=el=>el.closest('#inspectieLeesbalk') || /zoek|search|filter|schooljaar|maandSelect|klasSelect|keuzeKlas|keuzeLeerling|jaarSelect|rapportPeriode|ptFilter|sort/i.test(el.id||'') || /filter|search/.test(el.className||'');
  const mutation=el=>{
    if(el.closest('#inspectieLeesbalk'))return false;
    const code=[el.id,el.title,el.getAttribute('onclick'),el.textContent].join(' ');
    return /bewaar|opsla|toevoeg|verwijder|wissen|bewerken|nieuw|herstel|import|doorgeven|doorsturen|kopie|overzetten|bevestig|genereer|verdeel|reset|wijzig|samenvoeg|openModal\(|openKlasKoppelingen|saveStudent|saveAndGo|addGroup|remove|delete|saveBtn|carry|✏|🗑/i.test(code);
  };
  const lock=()=>{
    const status=document.getElementById('saveStatusText');if(status&&status.textContent!=='Alleen lezen')status.textContent='Alleen lezen';
    document.querySelectorAll('input,textarea,select,[contenteditable="true"]').forEach(el=>{
      if(navField(el)){if(el.disabled)el.disabled=false;return;}
      if(el.tagName==='TEXTAREA'||el.tagName==='INPUT'&&['text','email','number','date','time','datetime-local'].includes(el.type)){if(!el.readOnly)el.readOnly=true;}
      else if(el.matches('input,select')&&!el.disabled)el.disabled=true;
      if(el.hasAttribute('contenteditable'))el.setAttribute('contenteditable','false');
    });
    document.querySelectorAll('button,label[for],#headerImportBtn').forEach(el=>{if(mutation(el)&&!el.hidden)el.hidden=true;});
    document.querySelectorAll('[draggable="true"]').forEach(el=>el.setAttribute('draggable','false'));
  };
  lock();let scheduled=false;
  const observer=new MutationObserver(()=>{if(!scheduled){scheduled=true;queueMicrotask(()=>{scheduled=false;lock();});}});
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&mutation(b)){e.preventDefault();e.stopImmediatePropagation();}},true);
  document.addEventListener('dblclick',e=>{if(e.target.closest('[ondblclick]')){e.preventDefault();e.stopImmediatePropagation();}},true);
  document.addEventListener('submit',e=>{e.preventDefault();e.stopImmediatePropagation();},true);
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();e.stopImmediatePropagation();}},true);
  if(!t.simulatie){
    let grant=t.bezoek;
    const check=()=>{if(!geldigBezoek(grant)){clearInterval(timer);observer.disconnect();blokkeer('Je tijdelijke inspectietoegang is afgelopen of ingetrokken.');}};
    const timer=setInterval(check,1000);
    onSnapshot(doc(db,'inspectiebezoeken',user.email.toLowerCase()),s=>{grant=s.data();check();},()=>{grant=null;check();});
  }
}
