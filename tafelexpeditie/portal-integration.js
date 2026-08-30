import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig={apiKey:"AIzaSyA7KxXMvZ4dzBQDut3CMyWUblLte2tFzoQ",authDomain:"huiswerkapp-a311e.firebaseapp.com",projectId:"huiswerkapp-a311e",storageBucket:"huiswerkapp-a311e.appspot.com",messagingSenderId:"797169941164",appId:"1:797169941164:web:511d9618079f1378d0fd09"};
const firebaseApp=getApps()[0]||initializeApp(firebaseConfig),auth=getAuth(firebaseApp),firestore=getFirestore(firebaseApp);
const schoolyear=(()=>{const d=new Date(),start=d.getMonth()>=7?d.getFullYear():d.getFullYear()-1;return`${start}-${start+1}`})();
const status=(title,text,error=false)=>{const box=document.getElementById("portalSyncStatus"),summary=document.getElementById("portalSyncSummary");if(!box||!summary)return;box.classList.toggle("error-state",error);summary.innerHTML=`<strong>${title}</strong><p>${text}</p>`};
const nameParts=s=>{const official=String(s.first||s.firstName||s.voornaam||"").trim(),first=String(s.roepnaam||s.roepNaam||s.callingName||official.split(/\s+/)[0]||"").trim()||String(s.naam||s.name||"").trim().split(/[, ]+/).filter(Boolean).at(-1)||"",directLast=String(s.last||s.lastName||s.achternaam||"").trim(),full=String(s.naam||s.name||"").trim(),last=directLast||(full.includes(",")?full.split(",")[0].trim():full.split(/\s+/).slice(1).join(" ").trim());return{first,last,full:[first,last].filter(Boolean).join(" ")}};
const fullName=s=>nameParts(s).full;
const active=s=>{const reference=`${schoolyear.slice(0,4)}-09-15`,start=s.startDatum||s.start||"",end=s.eindDatum||s.end||"";return s.actief!==false&&(!start||start<=reference)&&(!end||end>=reference)};
const newCode=used=>{let code;do{code=String(Math.floor(1000+Math.random()*9000))}while(used.has(code));used.add(code);return code};
const groupForClass=className=>({"1A":"graad1","2A":"graad1","3A":"graad2","4A":"graad2","5A":"graad3","6A":"graad3"})[String(className).toUpperCase()]||"";
let loadedClassRef=null,loadedCodes={},loadedCodePath="";
async function loadClass(className){
 status("Centrale klaslijst laden",`${className} · ${schoolyear} wordt opgehaald…`);
 const groupId=groupForClass(className),groupRef=groupId?doc(firestore,"schoolbeheer_groepen",`${schoolyear}_${groupId}`):null,legacyRef=doc(firestore,"schoolbeheer",schoolyear,"klassen",className),[legacySnap,groupSnap]=await Promise.all([getDoc(legacyRef),groupRef?getDoc(groupRef):Promise.resolve(null)]),legacyData=legacySnap.exists()?legacySnap.data():{},useLegacy=Array.isArray(legacyData.leerlingen)&&legacyData.leerlingen.length>0,classRef=useLegacy?legacyRef:groupRef,root=useLegacy?legacyData:groupSnap?.exists()?groupSnap.data():{},data=useLegacy?root:(root.klassen?.[className]||{}),codes={...(data.tafelExpeditieCodes||{})},used=new Set(Object.values(codes).map(String)),students=(data.leerlingen||[]).filter(active).sort((a,b)=>{const x=nameParts(a),y=nameParts(b);return x.last.localeCompare(y.last,"nl-BE",{sensitivity:"base"})||x.first.localeCompare(y.first,"nl-BE",{sensitivity:"base"})}).map((s,index)=>{const n=nameParts(s);return{id:String(s.id||`${className}_${n.full}`),name:n.full,firstName:n.first||n.full,lastName:n.last,classNumber:index+1,className}}).filter(s=>s.name);let changed=false;
 students.forEach(s=>{if(!codes[s.id]){codes[s.id]=newCode(used);changed=true}s.pin=String(codes[s.id])});
 const codePath=useLegacy?"tafelExpeditieCodes":`klassen.${className}.tafelExpeditieCodes`;let codesCentral=!changed;if(changed){try{if(useLegacy)await setDoc(classRef,{tafelExpeditieCodes:codes},{merge:true});else await updateDoc(classRef,{[codePath]:codes});codesCentral=true}catch(err){console.warn("Centrale inlogcodes konden niet worden bewaard",err)}}students.forEach(s=>s.codeIsCentral=codesCentral);
 loadedClassRef=classRef;loadedCodePath=codePath;loadedCodes={...codes};localStorage.setItem("tafelExpeditieBeheerKlas",className);window.syncPortalStudents?.(students,{schoolyear,classLabel:className})
}
window.rotatePortalStudentCode=async studentId=>{if(!loadedClassRef||!loadedCodePath||!studentId)return null;const used=new Set(Object.values(loadedCodes).map(String)),code=newCode(used);loadedCodes[String(studentId)]=code;if(loadedCodePath.includes("."))await updateDoc(loadedClassRef,{[loadedCodePath]:loadedCodes});else await setDoc(loadedClassRef,{tafelExpeditieCodes:loadedCodes},{merge:true});return code};
function showClassPicker(classNames,selected){
 const choice=document.getElementById("portalClassChoice"),picker=document.getElementById("portalClassPicker");if(!choice||!picker)return;
 choice.classList.remove("hidden");picker.innerHTML=classNames.map(c=>`<option value="${c}" ${c===selected?"selected":""}>${c}</option>`).join("");
 picker.onchange=e=>loadClass(e.target.value).catch(err=>{console.error(err);status("Koppelen niet gelukt","De gekozen klas kon niet worden geladen.",true)})
}

onAuthStateChanged(auth,async user=>{
 if(!user){status("Centrale klaslijst niet gekoppeld","Open TafelExpeditie vanuit de huiswerkapp terwijl je als leerkracht aangemeld bent.");return}
 try{
  status("Centrale klaslijst laden","Je klas van schooljaar 2026-2027 wordt opgehaald…");
  const email=String(user.email||"").toLowerCase(),roleSnap=await getDoc(doc(firestore,"schoolrollen",user.uid)),roleData=roleSnap.data()||{},role=String(roleData.rol||"").toLowerCase(),teacherName=String(roleData.naam||roleData.displayName||user.displayName||email.split("@")[0]||"Leerkracht").trim(),schoolWide=["beheerder","directie","zorgcoordinator","zorgleerkracht"].includes(role),snaps=await Promise.all([
   getDocs(query(collection(firestore,"klasleerkrachten"),where("leerkracht_uids","array-contains",user.uid))),
   email?getDocs(query(collection(firestore,"klasleerkrachten"),where("leerkracht_emails","array-contains",email))):Promise.resolve({docs:[]})
  ]),classes=new Set();
  snaps.forEach(snap=>snap.docs.forEach(d=>{const x=d.data()||{},y=String(x.schooljaar||schoolyear);if(x.actief!==false&&y===schoolyear){const c=String(x.klas||x.klasId||"").trim();if(c)classes.add(c)}}));
  if(schoolWide){const all=await getDocs(collection(firestore,"klasleerkrachten"));all.docs.forEach(d=>{const x=d.data()||{},y=String(x.schooljaar||schoolyear),c=String(x.klas||x.klasId||"").trim();if(x.actief!==false&&y===schoolyear&&c)classes.add(c)})}
  const requested=new URLSearchParams(location.search).get("klas"),classNames=requested?[requested]:[...classes].sort((a,b)=>a.localeCompare(b,"nl",{numeric:true}));
  if(!classNames.length){status("Geen klas gevonden",`Er is voor ${schoolyear} nog geen klas aan dit leerkrachtaccount gekoppeld.`,true);return}
  const preferred=requested||localStorage.getItem("tafelExpeditieBeheerKlas"),selected=classNames.includes(preferred)?preferred:classNames[0];
  window.portalTeacherInfo={id:user.uid,name:teacherName,email};window.dispatchEvent(new CustomEvent("portal-teacher-ready"));
  if(classNames.length>1)showClassPicker(classNames,selected);
  await loadClass(selected);
 }catch(err){console.error(err);status("Koppelen niet gelukt","Vernieuw de pagina. Blijft dit terugkomen, controleer dan de klaskoppeling in de huiswerkapp.",true)}
});
