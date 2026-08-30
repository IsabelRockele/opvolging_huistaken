import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig={apiKey:"AIzaSyA7KxXMvZ4dzBQDut3CMyWUblLte2tFzoQ",authDomain:"huiswerkapp-a311e.firebaseapp.com",projectId:"huiswerkapp-a311e",storageBucket:"huiswerkapp-a311e.appspot.com",messagingSenderId:"797169941164",appId:"1:797169941164:web:511d9618079f1378d0fd09"};
const firebaseApp=getApps()[0]||initializeApp(firebaseConfig),auth=getAuth(firebaseApp),firestore=getFirestore(firebaseApp);
const schoolyear=(()=>{const d=new Date(),start=d.getMonth()>=7?d.getFullYear():d.getFullYear()-1;return`${start}-${start+1}`})();
const status=(title,text,error=false)=>{const box=document.getElementById("portalSyncStatus");if(!box)return;box.classList.toggle("error-state",error);box.innerHTML=`<strong>${title}</strong><p>${text}</p>`};
const fullName=s=>{const first=String(s.voornaam||s.firstName||"").trim(),last=String(s.achternaam||s.lastName||"").trim(),direct=String(s.naam||s.name||s.fullName||s.volledigeNaam||"").trim();return first&&last?`${first} ${last}`:first||last||direct};
const active=s=>{const today=new Date().toISOString().slice(0,10);return s.actief!==false&&(!s.start||s.start<=today)&&(!s.end||s.end>=today)};

onAuthStateChanged(auth,async user=>{
 if(!user){status("Centrale klaslijst niet gekoppeld","Open TafelExpeditie vanuit de huiswerkapp terwijl je als leerkracht aangemeld bent.");return}
 try{
  status("Centrale klaslijst laden","Je klas van schooljaar 2026-2027 wordt opgehaald…");
  const email=String(user.email||"").toLowerCase(),snaps=await Promise.all([
   getDocs(query(collection(firestore,"klasleerkrachten"),where("leerkracht_uids","array-contains",user.uid))),
   email?getDocs(query(collection(firestore,"klasleerkrachten"),where("leerkracht_emails","array-contains",email))):Promise.resolve({docs:[]})
  ]),classes=new Set();
  snaps.forEach(snap=>snap.docs.forEach(d=>{const x=d.data()||{},y=String(x.schooljaar||schoolyear);if(x.actief!==false&&y===schoolyear){const c=String(x.klas||x.klasId||"").trim();if(c)classes.add(c)}}));
  const requested=new URLSearchParams(location.search).get("klas"),classNames=requested?[requested]:[...classes];
  if(!classNames.length){status("Geen klas gevonden",`Er is voor ${schoolyear} nog geen klas aan dit leerkrachtaccount gekoppeld.`,true);return}
  const loaded=await Promise.all(classNames.map(async className=>{const snap=await getDoc(doc(firestore,"schoolbeheer",schoolyear,"klassen",className));return snap.exists()?(snap.data().leerlingen||[]).filter(active).map(s=>({id:s.id||`${className}_${fullName(s)}`,name:fullName(s),className})).filter(s=>s.name):[]}));
  const students=loaded.flat();window.syncPortalStudents?.(students,{schoolyear,classLabel:classNames.join(", ")});
 }catch(err){console.error(err);status("Koppelen niet gelukt","Vernieuw de pagina. Blijft dit terugkomen, controleer dan de klaskoppeling in de huiswerkapp.",true)}
});
