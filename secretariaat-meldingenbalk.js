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

function plaatsBalk(meldingen,openAantal){
  document.getElementById("secretariaatMeldingenbalk")?.remove();
  if (!meldingen.length) return;
  const blok = document.createElement("aside");
  blok.id = "secretariaatMeldingenbalk";
  blok.setAttribute("aria-live","polite");
  const regels = meldingen.slice(0,3).map(m => `<li><strong>${esc(m.text)}</strong>${m._afgehandeld?'<small style="color:#267346;font-weight:700">✓ in orde</small>':m.due ? `<small>In orde tegen ${esc(m.due)}</small>` : ""}</li>`).join("");
  blok.innerHTML = `
    <button type="button" class="smb-icoon" aria-expanded="false" title="${openAantal?`${openAantal} melding${openAantal===1?"":"en"} nog te lezen of uit te voeren`:`${meldingen.length} recente melding${meldingen.length===1?"":"en"}`}">📣${openAantal?`<span>${openAantal}</span>`:""}</button>
    <div class="smb-inhoud" hidden>
      <div class="smb-kop"><strong>Meldingen van het secretariaat</strong><button type="button" class="smb-sluit" aria-label="Meldingen sluiten">×</button></div>
      <ul>${regels}</ul>
      ${meldingen.length>3?`<p>En nog ${meldingen.length-3} andere melding${meldingen.length-3===1?"":"en"}.</p>`:""}
      <a href="schoolbeheer.html" target="_blank" rel="noopener">Bekijken en antwoorden</a>
      <small class="smb-uitleg">Sluiten betekent niet dat je de melding gelezen of uitgevoerd hebt.</small>
    </div>`;
  const style = document.createElement("style");
  style.id = "secretariaatMeldingenbalkStijl";
  if(!document.getElementById(style.id)){
    style.textContent = `#secretariaatMeldingenbalk{box-sizing:border-box;position:relative;z-index:9998;margin-left:auto;color:#453400;font-family:Arial,sans-serif;flex:0 0 auto}#secretariaatMeldingenbalk .smb-icoon{position:relative;display:flex;align-items:center;justify-content:center;width:42px;height:38px;border:1px solid rgba(255,255,255,.5);border-radius:10px;background:rgba(255,255,255,.18);font-size:21px;cursor:pointer}#secretariaatMeldingenbalk .smb-icoon span{position:absolute;right:-6px;top:-7px;min-width:19px;height:19px;padding:0 4px;box-sizing:border-box;border-radius:999px;background:#e33d3d;color:#fff;font:bold 12px/19px Arial;text-align:center;box-shadow:0 0 0 2px #fff}#secretariaatMeldingenbalk .smb-inhoud{position:absolute;right:0;top:calc(100% + 9px);width:min(430px,calc(100vw - 24px));max-height:70vh;overflow:auto;padding:14px 16px;background:#fff9dc;border:2px solid #d59b00;border-radius:14px;box-shadow:0 10px 30px rgba(37,28,0,.28);color:#453400}#secretariaatMeldingenbalk .smb-kop{display:flex;justify-content:space-between;align-items:center;gap:16px;font-size:17px}#secretariaatMeldingenbalk ul{margin:10px 0;padding-left:22px}#secretariaatMeldingenbalk li+li{margin-top:8px}#secretariaatMeldingenbalk li small{display:block;font-weight:400}#secretariaatMeldingenbalk a{display:inline-block;background:#356d4c;color:#fff;text-decoration:none;font-weight:800;padding:8px 12px;border-radius:9px}#secretariaatMeldingenbalk button{font-family:inherit}.smb-sluit{width:31px;height:31px;background:#fff;border:1px solid #9f780b;border-radius:8px;color:#453400;font-size:22px;line-height:1;cursor:pointer}.smb-uitleg{display:block;margin-top:8px}@media print{#secretariaatMeldingenbalk{display:none!important}}`;
    document.head.appendChild(style);
  }
  const anker = document.querySelector(".banner-account, header .tools, header .actions, header, .topbar, #topbar");
  if(anker) anker.appendChild(blok); else document.body.insertAdjacentElement("afterbegin",blok);
  const icoon=blok.querySelector(".smb-icoon"),inhoud=blok.querySelector(".smb-inhoud");
  const sluit=()=>{inhoud.hidden=true;icoon.setAttribute("aria-expanded","false")};
  icoon.addEventListener("click",event=>{event.stopPropagation();inhoud.hidden=!inhoud.hidden;icoon.setAttribute("aria-expanded",String(!inhoud.hidden))});
  blok.querySelector(".smb-sluit").addEventListener("click",sluit);
  document.addEventListener("click",event=>{if(!blok.contains(event.target))sluit()});
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
      if(m.archived||(m.visibleUntil&&m.visibleUntil<vandaag)) return;
      const oud=!Array.isArray(m.targetClasses)&&typeof m.targetCare==="undefined";
      if(oud||(zorgRol?m.targetCare===true:true)) uniek.set(m.groupId||m.id,{...m,_afgehandeld:isAfgehandeld(m,user,zorgRol)});
    });
  });
  const meldingen=[...uniek.values()];
  plaatsBalk(meldingen,meldingen.filter(m=>!m._afgehandeld).length);
}

onAuthStateChanged(auth,user=>{if(user) laadMeldingen(user).catch(err=>console.warn("Meldingenbalk kon niet laden",err));});
