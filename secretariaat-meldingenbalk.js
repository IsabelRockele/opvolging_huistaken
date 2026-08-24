import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA7KxXMvZ4dzBQDut3CMyWUblLte2tFzoQ",
  authDomain: "huiswerkapp-a311e.firebaseapp.com",
  projectId: "huiswerkapp-a311e",
  storageBucket: "huiswerkapp-a311e.appspot.com",
  messagingSenderId: "797169941164",
  appId: "1:797169941164:web:511d9618079f1378d0fd09"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const ALLE_KLASSEN = ["K1","K2","K3","1A","2A","3A","4A","5A","6A"];
const esc = waarde => String(waarde ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");

function huidigSchooljaar(){
  const nu = new Date();
  const start = nu.getMonth() >= 7 ? nu.getFullYear() : nu.getFullYear() - 1;
  return `${start}-${start + 1}`;
}

function rolVan(user){
  try {
    const cache = JSON.parse(localStorage.getItem("lindeRolCache_" + user.uid) || "null");
    if (cache?.rol) return String(cache.rol).toLowerCase();
  } catch (_) {}
  return "";
}

function isAfgehandeld(melding,user,zorgRol){
  const status = zorgRol
    ? (melding.careAcks?.[user.uid]?.status || "")
    : (melding.done || melding.ackStatus === "done" ? "done" : melding.ackStatus === "read" ? "read" : "");
  return melding.responseType === "read" ? ["read","done"].includes(status) : status === "done";
}

function plaatsBalk(meldingen){
  document.getElementById("secretariaatMeldingenbalk")?.remove();
  if (!meldingen.length) return;
  const sleutels = meldingen.map(m => m.groupId || m.id).sort().join("|");
  const opslag = "lindeIngeklapteMeldingen";
  const ingeklapt = localStorage.getItem(opslag) === sleutels;
  const blok = document.createElement("aside");
  blok.id = "secretariaatMeldingenbalk";
  blok.className = ingeklapt ? "is-ingeklapt" : "";
  blok.setAttribute("aria-live","polite");
  const regels = meldingen.slice(0,3).map(m => `<li><strong>${esc(m.text)}</strong>${m.due ? `<small>In orde tegen ${esc(m.due)}</small>` : ""}</li>`).join("");
  blok.innerHTML = `
    <button type="button" class="smb-smal" aria-expanded="${!ingeklapt}">📣 Er ${meldingen.length===1?"is":"zijn"} nog ${meldingen.length} melding${meldingen.length===1?"":"en"} van het secretariaat <span>Openen ▾</span></button>
    <div class="smb-inhoud">
      <div class="smb-kop"><strong>📣 Melding${meldingen.length===1?"":"en"} van het secretariaat</strong><button type="button" class="smb-sluit">Verbergen ▴</button></div>
      <ul>${regels}</ul>
      ${meldingen.length>3?`<p>En nog ${meldingen.length-3} andere melding${meldingen.length-3===1?"":"en"}.</p>`:""}
      <a href="schoolbeheer.html" target="_blank" rel="noopener">Bekijken en antwoorden</a>
      <small class="smb-uitleg">Verbergen betekent niet dat je de melding gelezen of uitgevoerd hebt.</small>
    </div>`;
  const style = document.createElement("style");
  style.id = "secretariaatMeldingenbalkStijl";
  if(!document.getElementById(style.id)){
    style.textContent = `#secretariaatMeldingenbalk{box-sizing:border-box;position:sticky;top:0;z-index:9998;margin:0;background:#fff4bf;border-bottom:2px solid #d59b00;box-shadow:0 4px 12px rgba(70,53,0,.16);color:#453400;font-family:Arial,sans-serif}#secretariaatMeldingenbalk .smb-inhoud{max-width:1500px;margin:auto;padding:12px 22px}#secretariaatMeldingenbalk .smb-kop{display:flex;justify-content:space-between;align-items:center;gap:16px;font-size:18px}#secretariaatMeldingenbalk ul{margin:8px 0;padding-left:24px}#secretariaatMeldingenbalk li+li{margin-top:5px}#secretariaatMeldingenbalk li small{display:block;font-weight:400}#secretariaatMeldingenbalk a{display:inline-block;background:#356d4c;color:#fff;text-decoration:none;font-weight:800;padding:8px 12px;border-radius:9px}#secretariaatMeldingenbalk button{font:inherit;cursor:pointer}.smb-sluit{background:transparent;border:1px solid #9f780b;border-radius:8px;padding:6px 10px;color:#453400}.smb-smal{display:none;width:100%;border:0;background:#ffe27c;color:#453400;font-weight:800;padding:10px 18px;text-align:left}.smb-smal span{float:right}.smb-uitleg{display:block;margin-top:8px}.is-ingeklapt .smb-inhoud{display:none}.is-ingeklapt .smb-smal{display:block}@media print{#secretariaatMeldingenbalk{display:none!important}}`;
    document.head.appendChild(style);
  }
  const anker = document.querySelector("header, .topbar, #topbar");
  if(anker) anker.insertAdjacentElement("afterend",blok); else document.body.insertAdjacentElement("afterbegin",blok);
  blok.querySelector(".smb-sluit").addEventListener("click",()=>{localStorage.setItem(opslag,sleutels);blok.classList.add("is-ingeklapt");blok.querySelector(".smb-smal").setAttribute("aria-expanded","false")});
  blok.querySelector(".smb-smal").addEventListener("click",()=>{localStorage.removeItem(opslag);blok.classList.remove("is-ingeklapt");blok.querySelector(".smb-smal").setAttribute("aria-expanded","true")});
}

async function laadMeldingen(user){
  let rol = rolVan(user);
  if(rol === "beheerder") rol = localStorage.getItem("lindeSimuleerRol_" + user.uid) || rol;
  if(rol === "secretariaat") return;
  const email = String(user.email || "").toLowerCase();
  const zorgRol = ["beheerder","directie","zorgcoordinator","zorgleerkracht"].includes(rol);
  const [uidSnaps,emailSnaps] = await Promise.all([
    getDocs(query(collection(db,"klasleerkrachten"),where("leerkracht_uids","array-contains",user.uid))),
    email ? getDocs(query(collection(db,"klasleerkrachten"),where("leerkracht_emails","array-contains",email))) : Promise.resolve({docs:[]})
  ]);
  const klassen = new Set();
  [...uidSnaps.docs,...emailSnaps.docs].forEach(d=>{
    const x=d.data()||{}, sj=huidigSchooljaar();
    if(x.schooljaar===sj&&x.klas) klassen.add(String(x.klas).toUpperCase());
    else if(d.id.startsWith(sj+"_")) klassen.add(d.id.slice(sj.length+1).toUpperCase());
  });
  const teLezen = zorgRol ? ALLE_KLASSEN : [...klassen];
  if(!teLezen.length) return;
  const vandaag = new Date().toISOString().slice(0,10);
  const documenten = await Promise.all(teLezen.map(klas=>getDoc(doc(db,"schoolbeheer",huidigSchooljaar(),"klassen",klas))));
  const uniek = new Map();
  documenten.forEach(snap=>{
    if(!snap.exists()) return;
    (snap.data().messages||[]).forEach(m=>{
      if(m.archived||(m.visibleUntil&&m.visibleUntil<vandaag)||isAfgehandeld(m,user,zorgRol)) return;
      const oud=!Array.isArray(m.targetClasses)&&typeof m.targetCare==="undefined";
      if(oud||(zorgRol?m.targetCare===true:true)) uniek.set(m.groupId||m.id,m);
    });
  });
  plaatsBalk([...uniek.values()]);
}

onAuthStateChanged(auth,user=>{if(user) laadMeldingen(user).catch(err=>console.warn("Meldingenbalk kon niet laden",err));});
