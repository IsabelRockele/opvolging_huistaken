import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
let loadedClassName="",loadedAccessToken="";
const accessFromUrl=new URLSearchParams(location.search).get("toegang")||"";
const randomToken=()=>[...crypto.getRandomValues(new Uint8Array(18))].map(x=>x.toString(16).padStart(2,"0")).join("");
const hash=async value=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,"0")).join("");
const studentDocId=(token,id,pin)=>hash(`${token}|${id}|${pin}`);
async function publishClassAccess(){
 if(!loadedAccessToken||!loadedClassName)return false;const snapshot=window.getTafelExpeditieCloudData?.();if(!snapshot)return false;
 const pupils=snapshot.students.filter(s=>s.portalClass===loadedClassName),roster=pupils.map((s,i)=>({id:String(s.portalId||s.id),firstName:String(s.firstName||s.name).replace(/\s*\(test\)$/i,""),classNumber:s.isTeacherTest?0:Number(s.classNumber||i+1),teacherTest:!!s.isTeacherTest}));
 await setDoc(doc(firestore,"tafelexpeditie_klassen",loadedAccessToken),{className:loadedClassName,schoolyear,students:roster,updatedAt:new Date().toISOString()},{merge:true});
 for(const s of pupils){if(!s.pin)continue;const sid=String(s.portalId||s.id),key=await studentDocId(loadedAccessToken,sid,s.pin),settings=s.useCustom?{...snapshot.settings,...s.custom,modes:{...snapshot.settings.modes,...(s.custom?.modes||{})}}:snapshot.settings,assignments=(snapshot.assignments||[]).filter(a=>(!a.className||a.className===loadedClassName)&&(a.target==="all"||(a.targets||[]).includes(s.id)));await setDoc(doc(firestore,"tafelexpeditie_klassen",loadedAccessToken,"leerlingen",key),{studentId:sid,firstName:s.firstName||s.name,className:loadedClassName,schoolyear,settings,assignments},{merge:true})}
 window.currentClassQrUrl=`${location.origin}${location.pathname}?toegang=${loadedAccessToken}`;window.dispatchEvent(new CustomEvent("class-qr-ready"));return true
}
window.requestPortalPublish=()=>publishClassAccess().catch(err=>{console.error(err);status("Klas-QR nog niet gepubliceerd","Voeg eerst de aanvullende Firebase-regels toe.",true)});
async function loadPublicAccess(token){const snap=await getDoc(doc(firestore,"tafelexpeditie_klassen",token));if(!snap.exists())throw new Error("QR niet gevonden");window.publicClassAccessToken=token;window.loadPublicClass?.(snap.data())}
window.loginPublicStudent=async(studentId,pin)=>{const key=await studentDocId(accessFromUrl||window.publicClassAccessToken,studentId,pin),snap=await getDoc(doc(firestore,"tafelexpeditie_klassen",accessFromUrl||window.publicClassAccessToken,"leerlingen",key));if(!snap.exists())return null;window.publicStudentDocKey=key;return snap.data()};
window.savePublicStudentProgress=async payload=>{if(!window.publicStudentDocKey||!window.publicClassAccessToken)return;await setDoc(doc(firestore,"tafelexpeditie_klassen",window.publicClassAccessToken,"leerlingen",window.publicStudentDocKey),payload,{merge:true})};
async function loadClass(className){
 status("Centrale klaslijst laden",`${className} · ${schoolyear} wordt opgehaald…`);
 const groupId=groupForClass(className),groupRef=groupId?doc(firestore,"schoolbeheer_groepen",`${schoolyear}_${groupId}`):null,legacyRef=doc(firestore,"schoolbeheer",schoolyear,"klassen",className),[legacySnap,groupSnap]=await Promise.all([getDoc(legacyRef),groupRef?getDoc(groupRef):Promise.resolve(null)]),legacyData=legacySnap.exists()?legacySnap.data():{},useLegacy=Array.isArray(legacyData.leerlingen)&&legacyData.leerlingen.length>0,classRef=useLegacy?legacyRef:groupRef,root=useLegacy?legacyData:groupSnap?.exists()?groupSnap.data():{},data=useLegacy?root:(root.klassen?.[className]||{}),codes={...(data.tafelExpeditieCodes||{})},used=new Set(Object.values(codes).map(String)),students=(data.leerlingen||[]).filter(active).sort((a,b)=>{const x=nameParts(a),y=nameParts(b);return x.last.localeCompare(y.last,"nl-BE",{sensitivity:"base"})||x.first.localeCompare(y.first,"nl-BE",{sensitivity:"base"})}).map((s,index)=>{const n=nameParts(s);return{id:String(s.id||`${className}_${n.full}`),name:n.full,firstName:n.first||n.full,lastName:n.last,classNumber:index+1,className}}).filter(s=>s.name);let changed=false;
 students.forEach(s=>{if(!codes[s.id]){codes[s.id]=newCode(used);changed=true}s.pin=String(codes[s.id])});
 const codePath=useLegacy?"tafelExpeditieCodes":`klassen.${className}.tafelExpeditieCodes`;let codesCentral=!changed;if(changed){try{if(useLegacy)await setDoc(classRef,{tafelExpeditieCodes:codes},{merge:true});else await updateDoc(classRef,{[codePath]:codes});codesCentral=true}catch(err){console.warn("Centrale inlogcodes konden niet worden bewaard",err)}}students.forEach(s=>s.codeIsCentral=codesCentral);
 loadedClassRef=classRef;loadedCodePath=codePath;loadedCodes={...codes};loadedClassName=className;loadedAccessToken=String(data.tafelExpeditieQrToken||"");if(!loadedAccessToken){loadedAccessToken=randomToken();try{if(useLegacy)await setDoc(classRef,{tafelExpeditieQrToken:loadedAccessToken},{merge:true});else await updateDoc(classRef,{[`klassen.${className}.tafelExpeditieQrToken`]:loadedAccessToken})}catch(err){console.warn("QR-token kon niet worden bewaard",err)}}localStorage.setItem("tafelExpeditieBeheerKlas",className);window.syncPortalStudents?.(students,{schoolyear,classLabel:className});if(loadedAccessToken){for(const s of students){try{const key=await studentDocId(loadedAccessToken,s.id,s.pin),cloud=await getDoc(doc(firestore,"tafelexpeditie_klassen",loadedAccessToken,"leerlingen",key));if(cloud.exists())window.mergeCloudStudentProgress?.(s.id,cloud.data())}catch(err){console.warn("Voortgang kon nog niet worden geladen",err)}}}await publishClassAccess().catch(err=>{console.warn("QR-klas kon nog niet worden gepubliceerd",err)})
}
 window.rotatePortalStudentCode=async(studentId,oldPin)=>{if(!loadedClassRef||!loadedCodePath||!studentId)return null;const used=new Set(Object.values(loadedCodes).map(String)),code=newCode(used),oldKey=loadedAccessToken&&oldPin?await studentDocId(loadedAccessToken,studentId,oldPin):"";loadedCodes[String(studentId)]=code;if(loadedCodePath.includes("."))await updateDoc(loadedClassRef,{[loadedCodePath]:loadedCodes});else await setDoc(loadedClassRef,{tafelExpeditieCodes:loadedCodes},{merge:true});if(oldKey)await deleteDoc(doc(firestore,"tafelexpeditie_klassen",loadedAccessToken,"leerlingen",oldKey)).catch(err=>console.warn("Oude leerlingcode kon niet meteen worden verwijderd",err));return code};
function showClassPicker(classNames,selected){
 const choice=document.getElementById("portalClassChoice"),picker=document.getElementById("portalClassPicker");if(!choice||!picker)return;
 choice.classList.remove("hidden");picker.innerHTML=classNames.map(c=>`<option value="${c}" ${c===selected?"selected":""}>${c}</option>`).join("");
 picker.onchange=e=>loadClass(e.target.value).catch(err=>{console.error(err);status("Koppelen niet gelukt","De gekozen klas kon niet worden geladen.",true)})
}

onAuthStateChanged(auth,async user=>{
 if(!user){if(accessFromUrl){try{await signInAnonymously(auth)}catch(err){console.error(err);window.showPublicLoginError?.("Anoniem aanmelden staat nog niet aan in Firebase.")}return}status("Centrale klaslijst niet gekoppeld","Open TafelExpeditie vanuit de huiswerkapp terwijl je als leerkracht aangemeld bent.");return}
 try{
  if(accessFromUrl){await loadPublicAccess(accessFromUrl);return}
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
