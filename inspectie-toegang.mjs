import {initializeApp, getApps, getApp} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {getAuth, onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {getFirestore, doc, getDocFromServer, setDoc} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
export const app = getApps().length ? getApp() : initializeApp({apiKey:'AIzaSyA7KxXMvZ4dzBQDut3CMyWUblLte2tFzoQ',authDomain:'huiswerkapp-a311e.firebaseapp.com',projectId:'huiswerkapp-a311e',storageBucket:'huiswerkapp-a311e.appspot.com',messagingSenderId:'797169941164',appId:'1:797169941164:web:511d9618079f1378d0fd09'});
export const auth = getAuth(app), db = getFirestore(app);
export const zorgTools = [
  ['overgang','Overgangsbespreking'], ['oudercontact','Oudercontact'], ['zorgoverleg','Zorgoverleg'],
  ['handelingsplan','Handelingsplan'], ['groeigroepen','Groeigroepen'], ['gok','GOK-overzicht']
];
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
        location.replace('inspectie.html?tool='+encodeURIComponent(tool));return new Promise(()=>{});
      }
      if(t.rol==='secretariaat'||(t.rol==='beheerder'&&localStorage.getItem('lindeSimuleerRol_'+user.uid)==='secretariaat')){
        blokkeer('Deze zes tools voor leerling en zorg zijn niet beschikbaar voor het secretariaat.');return new Promise(()=>{});
      }
      return t;
    }catch(e){blokkeer('De toegangscontrole kon niet worden uitgevoerd. Probeer opnieuw via het startscherm.');return new Promise(()=>{});}
  })();
}
