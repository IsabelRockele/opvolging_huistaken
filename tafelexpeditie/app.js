
const STORAGE_KEY="tafeltrainer_v4";
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const views={landing:$("#landingView"),studentLogin:$("#studentLoginView"),studentHome:$("#studentHomeView"),teacher:$("#teacherDashboardView"),setup:$("#setupView"),exercise:$("#exerciseView"),result:$("#resultView"),homework:$("#homeworkView"),flashcards:$("#flashcardsView"),raceBoard:$("#raceBoardView"),studentRaceLobby:$("#studentRaceLobbyView")};
const teacherTabs={settings:$("#teacherSettingsTab"),class:$("#teacherClassTab"),assignments:$("#teacherAssignmentsTab"),discover:$("#teacherDiscoverTab"),race:$("#teacherRaceTab"),results:$("#teacherResultsTab"),medals:$("#teacherMedalsTab"),homework:$("#teacherHomeworkTab"),flashcards:$("#teacherFlashcardsTab")};
let db=loadDb(),currentStudentId=null,currentMode=null,currentSession=null,timerId=null,questionTimerId=null,questionTickId=null,isPreview=false,returnContext="student",lastHomework=null,lastHomeworkConfig=null,editStudentId=null,currentAssignmentId=null,currentLiveRace=null,currentRaceParticipants=[],raceBoardTick=null;
let publicStudentMode=false,publicCompletedAssignmentIds=new Set();

function defaults(){return{version:5,students:[],sessions:[],factStats:{},assignments:[],settings:{factorPosition:"front",multiply:true,divide:true,families:true,missing:true,visual:true,tables:[2,5,10],modes:{learn:true,mix:true,smart:true,remediate:true,tempo:true},defaultCount:20,defaultTempo:120,fluentSeconds:3}}}
function loadDb(){
 try{
  const raw=localStorage.getItem(STORAGE_KEY)||localStorage.getItem("tafeltrainer_v3")||localStorage.getItem("tafeltrainer_v2")||localStorage.getItem("tafeltrainer_v1");
  if(!raw)return defaults();
  const old=JSON.parse(raw),d=defaults();
  return {...d,...old,settings:{...d.settings,...(old.settings||{}),modes:{...d.settings.modes,...((old.settings||{}).modes||{})}}}
 }catch(e){return defaults()}
}
function saveDb(){localStorage.setItem(STORAGE_KEY,JSON.stringify(db))}
window.getTafelExpeditieCloudData=()=>db;
window.mergeCloudStudentProgress=function(portalId,cloud){const s=db.students.find(x=>String(x.portalId||x.id)===String(portalId));if(!s||!cloud)return;const incoming=(cloud.sessions||[]).map(x=>({...x,studentId:s.id})),seen=new Set(db.sessions.map(x=>x.id));incoming.forEach(x=>{if(!seen.has(x.id))db.sessions.push(x)});const publicStats=cloud.factStats?.[`public_${portalId}`]||Object.values(cloud.factStats||{})[0];if(publicStats)db.factStats[s.id]=publicStats;(cloud.completedAssignmentIds||[]).forEach(id=>{const a=(db.assignments||[]).find(x=>x.id===id);if(a){a.completedBy=a.completedBy||[];if(!a.completedBy.includes(s.id))a.completedBy.push(s.id)}});saveDb()};
window.loadPublicClass=function(data){publicStudentMode=true;db.activePortalClass=data.className||"";db.students=(data.students||[]).map(s=>({id:`public_${s.id}`,cloudLoginId:String(s.id),name:s.firstName,firstName:s.firstName,lastName:"",classNumber:s.classNumber||0,isTeacherTest:!!s.teacherTest,pin:"",portalClass:data.className||"",portalSchoolyear:data.schoolyear||""}));refreshStudentSelects();resetStudentLogin();$("#teacherTopBtn").classList.add("hidden");$(".build-warning").classList.add("hidden");showView("studentLogin")};
window.showPublicLoginError=message=>{showView("studentLogin");$("#studentNameStep").innerHTML=`<div class="empty-state error-state">${esc(message)}</div>`};
function showView(name){if(publicStudentMode&&name==="landing"){resetStudentLogin();name="studentLogin"}Object.values(views).forEach(v=>v.classList.remove("active"));views[name].classList.add("active");$("#goLandingBtn").classList.toggle("hidden",publicStudentMode||name==="landing")}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function rand(a){return a[Math.floor(Math.random()*a.length)]}
function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
function studentById(id){return db.students.find(s=>s.id===id)}
function studentSort(a,b){if(!!a.isTeacherTest!==!!b.isTeacherTest)return a.isTeacherTest?1:-1;return String(a.lastName||a.name).localeCompare(String(b.lastName||b.name),"nl-BE")||String(a.firstName||a.name).localeCompare(String(b.firstName||b.name),"nl-BE")}
function teacherStudentName(s){return s.lastName&&s.firstName?`${s.lastName} ${s.firstName}`:s.name}
function visibleStudents(){return (db.activePortalClass?db.students.filter(s=>s.portalClass===db.activePortalClass):db.students).slice().sort(studentSort)}
function makePin(){let p;do{p=String(Math.floor(1000+Math.random()*9000))}while(db.students.some(s=>s.pin===p));return p}
function studentSettings(id){const s=studentById(id);return s?.useCustom?{...db.settings,...s.custom,modes:{...db.settings.modes,...(s.custom?.modes||{})}}:db.settings}

function buildChecks(){
 const html=Array.from({length:10},(_,i)=>i+1).map(n=>`<label class="check"><input type="checkbox" value="${n}"> tafel ${n}</label>`).join("");
 $("#tableChecks").innerHTML=html;$("#settingsTableChecks").innerHTML=html;$("#assignmentTableChecks").innerHTML=html;$("#homeworkTableChecks").innerHTML=html;$("#raceTableChecks").innerHTML=html
}
function selected(container){return [...container.querySelectorAll("input:checked")].map(x=>+x.value)}
function setChecks(container,nums){container.querySelectorAll("input").forEach(x=>x.checked=nums.includes(+x.value))}
function refreshStudentSelects(){
 const students=visibleStudents(),opts=students.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("")||'<option value="">Nog geen leerlingen</option>';
 ["#teacherStudentSelect","#previewStudentSelect","#homeworkStudentSelect"].forEach(id=>$(id).innerHTML=opts);
 const tiles=$("#loginStudentTiles");if(tiles)tiles.innerHTML=students.map((s,i)=>`<button class="student-name-tile ${s.isTeacherTest?"teacher-login-tile":""}" data-student-id="${esc(s.id)}"><span>${s.isTeacherTest?"★":s.classNumber||i+1}</span><strong>${esc(s.firstName||s.name)}</strong><small>${esc(s.isTeacherTest?"testspeler":s.lastName||"")}</small></button>`).join("")||'<div class="empty-state">Er zijn nog geen leerlingen geladen.</div>';
 tiles?.querySelectorAll("[data-student-id]").forEach(b=>b.addEventListener("click",()=>chooseLoginStudent(b.dataset.studentId)));
 const checks=$("#assignmentStudentChecks");if(checks)checks.innerHTML=students.map(s=>`<label class="checkline"><input type="checkbox" value="${s.id}"> ${esc(s.name)}</label>`).join("")||'<span class="muted">Nog geen leerlingen in deze klas.</span>';
}
function createStudent(name,pin){
 name=name.trim();if(!name)return;
 db.students.push({id:uid(),name,pin:(pin||"").trim()||makePin(),createdAt:new Date().toISOString(),useCustom:false,custom:{},portalClass:db.activePortalClass||""});
 saveDb();refreshAllTeacher();window.requestPortalPublish?.()
}
function addTeacherTestProfile(){
 const info=window.portalTeacherInfo;if(!info){alert("Je leerkrachtgegevens worden nog geladen. Probeer over enkele seconden opnieuw.");return}
 const id=`teacher_test_${info.id}_${db.activePortalClass||"klas"}`,existing=studentById(id);if(existing){if(!existing.pin){existing.pin=makePin();saveDb();refreshAllTeacher()}window.requestPortalPublish?.();alert(`${existing.name} staat al als testspeler in deze klas met code ${existing.pin}.`);return}
 const display=/^(juf|meester)\b/i.test(info.name)?info.name:`Leerkracht ${info.name}`;
 db.students.push({id,name:`${display} (test)`,firstName:display,lastName:"",pin:makePin(),isTeacherTest:true,teacherUid:info.id,createdAt:new Date().toISOString(),useCustom:false,custom:{},portalClass:db.activePortalClass||"",portalSchoolyear:"2026-2027"});saveDb();refreshAllTeacher();window.requestPortalPublish?.();const added=studentById(id);alert(`${display} is toegevoegd als testspeler met code ${added.pin}. Je kunt nu ook het aanmelden aan het bord tonen.`)
}
window.syncPortalStudents=function(portalStudents,meta={}){
 db.activePortalClass=meta.classLabel||db.activePortalClass||"";
 const byPortalId=new Map(db.students.filter(s=>s.portalId).map(s=>[String(s.portalId),s]));
 const byName=new Map(db.students.map(s=>[String(s.name||"").trim().toLocaleLowerCase("nl-BE"),s]));
 let added=0,updated=0;
 (portalStudents||[]).forEach(p=>{
  const portalId=String(p.id||"").trim(),name=String(p.name||"").trim();if(!name)return;
  let s=(portalId&&byPortalId.get(portalId))||byName.get(name.toLocaleLowerCase("nl-BE"));
  if(s){if(s.name!==name){s.name=name;updated++}s.firstName=p.firstName||s.firstName||name;s.lastName=p.lastName||s.lastName||"";s.classNumber=p.classNumber||s.classNumber;s.pin=String(p.codeIsCentral?p.pin:(s.pin||p.pin||makePin()));s.portalId=portalId||s.portalId;s.portalClass=p.className||s.portalClass;s.portalSchoolyear=meta.schoolyear||s.portalSchoolyear}
  else{s={id:portalId?`portal_${portalId}`:uid(),portalId,name,firstName:p.firstName||name,lastName:p.lastName||"",classNumber:p.classNumber,pin:String(p.pin||makePin()),createdAt:new Date().toISOString(),useCustom:false,custom:{},portalClass:p.className||"",portalSchoolyear:meta.schoolyear||""};db.students.push(s);added++}
 });
 saveDb();refreshAllTeacher();
 const box=$("#portalSyncStatus"),summary=$("#portalSyncSummary");if(box&&summary){box.classList.add("success-state");summary.innerHTML=`<strong>Centrale klaslijst gekoppeld</strong><p>${esc(meta.classLabel||"Je klas")} · ${esc(meta.schoolyear||"")} · ${portalStudents.length} actieve leerlingen. ${added?`${added} toegevoegd. `:""}${updated?`${updated} naam/namen bijgewerkt.`:""}</p>`}
 return db.students.filter(s=>s.portalSchoolyear===meta.schoolyear)
};
function classRowHtml(s){
 return `<tr><td>${esc(teacherStudentName(s))}${s.isTeacherTest?' <span class="tag">TESTSPELER</span>':""}</td><td><b>${esc(s.pin||"")}</b></td><td>${s.isTeacherTest?"Testprofiel leerkracht":s.useCustom?"Persoonlijk":"Klasinstellingen"}</td><td><div class="row compact"><button class="secondary edit-student" data-id="${s.id}">Instellen</button><button class="secondary rotate-code" data-id="${s.id}">Nieuwe code</button><button class="danger delete-student" data-id="${s.id}">Verwijder</button></div></td></tr>`
}
function renderClass(){
 $("#classRows").innerHTML=visibleStudents().map(classRowHtml).join("")||'<tr><td colspan="4">Nog geen leerlingen.</td></tr>';
 $$(".edit-student").forEach(b=>b.addEventListener("click",()=>openStudentSettings(b.dataset.id)));
 $$(".rotate-code").forEach(b=>b.addEventListener("click",()=>rotateStudentCode(b.dataset.id,b)));
 $$(".delete-student").forEach(b=>b.addEventListener("click",()=>deleteStudent(b.dataset.id)))
}
async function rotateStudentCode(id,button){
 const s=studentById(id);if(!s||!confirm(`Een nieuwe code maken voor ${s.name}? De oude code werkt daarna niet meer.`))return;
 const oldText=button?.textContent;if(button){button.disabled=true;button.textContent="Even wachten…"}
 try{const central=s.portalId&&window.rotatePortalStudentCode?await window.rotatePortalStudentCode(s.portalId,s.pin):null;s.pin=String(central||makePin());saveDb();renderClass();await window.requestPortalPublish?.();alert(`De nieuwe code voor ${s.name} is ${s.pin}. Druk indien nodig een nieuw inlogkaartje af.`)}catch(err){console.error(err);alert("De nieuwe code kon niet centraal worden bewaard. Er is niets gewijzigd.");if(button){button.disabled=false;button.textContent=oldText}}
}
function deleteStudent(id){
 const s=studentById(id);if(!s)return;
 if(confirm(`"${s.name}" en alle resultaten verwijderen?`)){
  db.students=db.students.filter(x=>x.id!==id);db.sessions=db.sessions.filter(x=>x.studentId!==id);delete db.factStats[id];saveDb();refreshAllTeacher()
 }
}
function openStudentSettings(id){
 const s=studentById(id);if(!s)return;editStudentId=id;
 $("#studentSettingsName").textContent=s.name;$("#studentUseCustom").checked=!!s.useCustom;
 const c=s.custom||{};$("#studentFactorPosition").value=c.factorPosition||db.settings.factorPosition;$("#studentTablesInput").value=(c.tables||db.settings.tables).join(", ");
 $("#studentMultiply").checked=c.multiply??db.settings.multiply;$("#studentDivide").checked=c.divide??db.settings.divide;
 $("#studentSettingsDialog").showModal()
}

function loadSettingsForm(){
 const s=db.settings;
 $$('input[name="factorPosition"]').forEach(r=>r.checked=r.value===s.factorPosition);
 $("#setMultiply").checked=s.multiply;$("#setDivide").checked=s.divide;$("#setFamilies").checked=s.families;$("#setMissing").checked=s.missing;$("#setVisual").checked=s.visual;
 setChecks($("#settingsTableChecks"),s.tables);
 $("#modeLearn").checked=s.modes.learn;$("#modeMix").checked=s.modes.mix;$("#modeSmart").checked=s.modes.smart;$("#modeRemediate").checked=s.modes.remediate;$("#modeTempo").checked=s.modes.tempo;
 $("#defaultCount").value=String(s.defaultCount);$("#defaultTempo").value=String(s.defaultTempo);$("#fluentSeconds").value=String(s.fluentSeconds)
}
function saveSettingsFromForm(){
 db.settings.factorPosition=$('input[name="factorPosition"]:checked')?.value||"front";
 db.settings.multiply=$("#setMultiply").checked;db.settings.divide=$("#setDivide").checked;db.settings.families=$("#setFamilies").checked;db.settings.missing=$("#setMissing").checked;db.settings.visual=$("#setVisual").checked;
 if(!db.settings.multiply&&!db.settings.divide){db.settings.multiply=true;$("#setMultiply").checked=true}
 db.settings.tables=selected($("#settingsTableChecks"));if(!db.settings.tables.length)db.settings.tables=[2];
 db.settings.modes={learn:$("#modeLearn").checked,mix:$("#modeMix").checked,smart:$("#modeSmart").checked,remediate:$("#modeRemediate").checked,tempo:$("#modeTempo").checked};
 db.settings.defaultCount=+$("#defaultCount").value;db.settings.defaultTempo=+$("#defaultTempo").value;db.settings.fluentSeconds=+$("#fluentSeconds").value;
 saveDb();window.requestPortalPublish?.();$("#settingsSaved").textContent="Instellingen opgeslagen.";setTimeout(()=>$("#settingsSaved").textContent="",1800)
}

function teacherTab(name){
 $$(".teacher-tab").forEach(b=>b.classList.toggle("active",b.dataset.teacherTab===name));Object.entries(teacherTabs).forEach(([k,v])=>v.classList.toggle("active",k===name));
 if(name==="results"){renderTeacherResults($("#teacherStudentSelect").value||visibleStudents()[0]?.id);renderClassMedalBoard()}
 if(name==="class")renderClass()
 if(name==="assignments"){renderAssignments();renderPreviewCenter()}
 if(name==="discover")renderPreviewCenter()
 if(name==="race")renderRaceTeacher()
 if(name==="medals"){renderClassMedalBoard();renderClassExpedition()}
 if(name==="homework")updateHomeworkPositionHint()
}
function enterTeacher(){refreshAllTeacher();loadSettingsForm();showView("teacher");teacherTab("settings")}
function refreshAllTeacher(){refreshStudentSelects();renderClass();loadSettingsForm()}
window.refreshTafelExpeditieTeacher=refreshAllTeacher;

function printPinCards(){
 const students=visibleStudents();if(!students.length){alert("Voeg eerst leerlingen toe.");return}
 const w=window.open("","_blank"),cards=students.map(s=>`<article><b>TafelExpeditie</b><h2>${esc(s.name)}</h2><p>Jouw inlogcode van de leerkracht</p><strong>${esc(s.pin)}</strong><small>Bewaar dit kaartje goed.</small></article>`).join("");
 w.document.write(`<!doctype html><html><head><title>Inlogkaartjes</title><style>@page{size:A4;margin:12mm}body{font-family:Arial;display:grid;grid-template-columns:1fr 1fr;gap:8mm}article{border:2px dashed #18324a;border-radius:12px;padding:9mm;text-align:center;break-inside:avoid}article>b{color:#087f78}h2{margin:6mm 0 2mm}p{margin:0;color:#647383}strong{display:block;font-size:30pt;letter-spacing:7px;margin:5mm}small{display:block}</style></head><body>${cards}</body></html>`);w.document.close();w.focus();setTimeout(()=>w.print(),250)
}
function printCodeList(){
 const students=visibleStudents().sort(studentSort);if(!students.length){alert("Er zijn nog geen leerlingen in deze klas.");return}
 const className=db.activePortalClass||"Klas",schoolyear=students[0]?.portalSchoolyear||"2026-2027",rows=students.map((s,i)=>`<tr><td>${s.isTeacherTest?"★":s.classNumber||i+1}</td><td>${esc(teacherStudentName(s))}</td><td><strong>${esc(s.pin)}</strong></td><td></td></tr>`).join(""),frame=document.createElement("iframe");
 frame.setAttribute("aria-hidden","true");frame.style.cssText="position:fixed;width:1px;height:1px;right:0;bottom:0;border:0;opacity:0;pointer-events:none";document.body.appendChild(frame);const d=frame.contentDocument;d.open();d.write(`<!doctype html><html><head><title>Inlogcodes ${esc(className)}</title><style>@page{size:A4;margin:14mm}body{font-family:Arial;color:#18324a}h1{margin:0 0 4px}p{margin:0 0 18px;color:#647383}table{width:100%;border-collapse:collapse}th,td{border:1px solid #9ca9a5;padding:9px;text-align:left}th{background:#edf6f3}td:first-child{width:36px;text-align:center}td:nth-child(3){width:110px;font-size:14pt;letter-spacing:2px}td:last-child{width:150px}</style></head><body><h1>TafelExpeditie · inlogcodes</h1><p>${esc(className)} · schooljaar ${esc(schoolyear)} · alleen voor de leerkracht</p><table><thead><tr><th>Nr.</th><th>Naam</th><th>Code</th><th>Notitie</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);d.close();const cleanup=()=>setTimeout(()=>frame.remove(),300);frame.contentWindow.addEventListener("afterprint",cleanup,{once:true});setTimeout(()=>{frame.contentWindow.focus();frame.contentWindow.print();setTimeout(cleanup,30000)},250)
}

function importClassFile(file){
 const reader=new FileReader();
 reader.onload=()=>{
  let txt=String(reader.result||"").replace(/^\uFEFF/,""),lines=txt.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(!lines.length)return;
  const sep=lines[0].includes(";")?";":lines[0].includes(",")?",":null;
  let start=0;
  if(/naam|name/i.test(lines[0]))start=1;
  let added=0;
  for(let i=start;i<lines.length;i++){
   let parts=sep?lines[i].split(sep).map(x=>x.trim().replace(/^"|"$/g,"")):[lines[i]];
   let name=parts[0],pin=parts[1]||"";
   if(name&&!db.students.some(s=>s.name.toLowerCase()===name.toLowerCase())){createStudent(name,pin);added++}
  }
  saveDb();refreshAllTeacher();alert(`${added} leerling(en) toegevoegd.`)
 };
 reader.readAsText(file)
}
function downloadClassTemplate(){
 const blob=new Blob(["naam,inlogcode\nAnna,1234\nBilal,5678\nCharlie,\n"],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="klaslijst_voorbeeld.csv";a.click();URL.revokeObjectURL(url)
}

function chooseLoginStudent(id){const s=studentById(id);if(!s)return;currentStudentId=id;$("#chosenStudentName").textContent=`Hallo, ${s.firstName||s.name}!`;$("#loginPin").value="";$("#loginError").textContent="";$("#studentNameStep").classList.add("hidden");$("#studentCodeStep").classList.remove("hidden")}
function resetStudentLogin(){currentStudentId=null;$("#loginPin").value="";$("#loginError").textContent="";$("#studentCodeStep").classList.add("hidden");$("#studentNameStep").classList.remove("hidden")}
async function loginStudent(){
 const id=currentStudentId,pin=$("#loginPin").value.trim(),s=studentById(id);
 if(publicStudentMode){const cloud=s&&await window.loginPublicStudent?.(s.cloudLoginId,pin);if(!cloud){$("#loginError").textContent="Naam of toegewezen code klopt niet. Vraag je leerkracht om hulp.";return}db.settings={...db.settings,...(cloud.settings||{})};s.useCustom=false;s.custom={};publicCompletedAssignmentIds=new Set(cloud.completedAssignmentIds||[]);db.assignments=(cloud.assignments||[]).map(a=>({...a,target:"all",targets:[],completedBy:publicCompletedAssignmentIds.has(a.id)?[id]:[]}));db.sessions=cloud.sessions||[];db.factStats=cloud.factStats||{};s.pin=pin}
 else if(!s||pin!==s.pin){$("#loginError").textContent="Naam of toegewezen code klopt niet. Vraag je leerkracht om hulp.";return}
 currentStudentId=id;isPreview=false;returnContext="student";$("#loginPin").value="";$("#loginError").textContent="";renderStudentHome();showView("studentHome")
}
function qrData(url,size=6){if(!window.qrcode)throw new Error("QR-module niet geladen");const qr=window.qrcode(0,"M");qr.addData(url);qr.make();return qr.createDataURL(size,3)}
function printDocumentHtml(html){const frame=document.createElement("iframe");frame.setAttribute("aria-hidden","true");frame.style.cssText="position:fixed;width:1px;height:1px;right:0;bottom:0;border:0;opacity:0";document.body.appendChild(frame);const d=frame.contentDocument;d.open();d.write(html);d.close();const cleanup=()=>setTimeout(()=>frame.remove(),300),images=[...d.images],ready=Promise.all(images.map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.addEventListener("load",resolve,{once:true});img.addEventListener("error",resolve,{once:true})})));Promise.race([ready,new Promise(resolve=>setTimeout(resolve,4000))]).then(()=>d.fonts?.ready).finally(()=>{frame.contentWindow.addEventListener("afterprint",cleanup,{once:true});frame.contentWindow.focus();frame.contentWindow.print();setTimeout(cleanup,30000)})}
function printClassQr(){try{const url=window.currentClassQrUrl;if(!url)return alert("De klas-QR wordt nog gepubliceerd. Controleer de aanvullende Firebase-regels en probeer opnieuw.");const qr=qrData(url,9),name=db.activePortalClass||"Klas",mascot=new URL("assets/rekenroef-mascotte.png",location.href).href;printDocumentHtml(`<!doctype html><html><head><style>@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;width:210mm;height:297mm;padding:11mm;background:#fffaf0;font-family:Arial,sans-serif;color:#16324b}.poster{position:relative;width:100%;height:100%;overflow:hidden;border:3mm solid #0b8f87;border-radius:9mm;background:linear-gradient(180deg,#fff 0%,#fffdf6 70%,#fff3cd 100%);box-shadow:inset 0 0 0 1.2mm #f4b942;text-align:center}.dots{position:absolute;inset:0;background-image:radial-gradient(#f4b942 1.2px,transparent 1.2px);background-size:11mm 11mm;opacity:.16}.content{position:relative;z-index:2;padding:11mm 14mm 8mm}.top{min-height:45mm;padding-right:39mm;text-align:left}.eyebrow{display:inline-block;padding:2mm 5mm;border-radius:99px;background:#e2f5f2;color:#087970;font-size:12pt;font-weight:800;letter-spacing:.5px}.class{color:#e46b36}h1{margin:4mm 0 1.5mm;font-size:31pt;line-height:1;color:#16324b}h2{margin:0;color:#5b6f7f;font-size:15pt;font-weight:600}.mascot{position:absolute;right:10mm;top:7mm;width:42mm;height:42mm;object-fit:contain}.qr-wrap{display:inline-block;margin:4mm auto 3mm;padding:4mm;border:1.4mm solid #16324b;border-radius:7mm;background:#fff;box-shadow:0 2.5mm 0 #d9eee9}.qr{display:block;width:104mm;height:104mm;image-rendering:pixelated}.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm;margin:4mm 0}.step{min-height:26mm;padding:3mm 2mm;border:1px solid #b8d7d2;border-radius:5mm;background:#fff}.number{display:grid;place-items:center;width:9mm;height:9mm;margin:0 auto 2mm;border-radius:50%;background:#f4b942;color:#16324b;font-size:15pt;font-weight:900}.step b{display:block;font-size:11pt}.step span{display:block;margin-top:1mm;color:#607483;font-size:8.5pt}.footer{margin-top:4mm;font-size:10pt;font-weight:700;color:#087970}.corner{position:absolute;border-radius:50%;background:#f4b942;opacity:.23}.c1{width:35mm;height:35mm;left:-16mm;bottom:-14mm}.c2{width:24mm;height:24mm;right:-10mm;bottom:22mm}</style></head><body><main class="poster"><div class="dots"></div><span class="corner c1"></span><span class="corner c2"></span><div class="content"><header class="top"><span class="eyebrow">TAFELEXPEDITIE · <span class="class">${esc(name)}</span></span><h1>Ik oefen de tafels</h1><h2>Op weg van begrijpen naar vlot kennen!</h2></header><img class="mascot" src="${mascot}" alt=""><div class="qr-wrap"><img class="qr" src="${qr}" alt="QR-code voor de klas"></div><section class="steps"><div class="step"><span class="number">1</span><b>Scan de QR-code</b><span>Gebruik de camera van je iPad.</span></div><div class="step"><span class="number">2</span><b>Kies je naam</b><span>Zoek je klasnummer in de lijst.</span></div><div class="step"><span class="number">3</span><b>Geef je code in</b><span>Start jouw persoonlijke missie.</span></div></section><div class="footer">Veel oefenplezier! · Schooljaar 2026-2027</div></div></main></body></html>`)}catch(err){console.error(err);alert("De QR kon niet worden gemaakt. Vernieuw de pagina en probeer opnieuw.")}}
function printLoginLabels(){try{const url=window.currentClassQrUrl;if(!url)return alert("Maak eerst de klas-QR actief.");const qr=qrData(url,4),students=visibleStudents(),pages=[];for(let i=0;i<students.length||i===0;i+=24){const batch=students.slice(i,i+24),labels=[...batch,...Array(24-batch.length).fill(null)].map(s=>s?`<article><div><b>TafelExpeditie</b><strong>${esc(s.firstName||s.name)}</strong><span>${esc(db.activePortalClass||"")} · code <em>${esc(s.pin)}</em></span></div><img src="${qr}"></article>`:`<article></article>`).join("");pages.push(`<section class="sheet">${labels}</section>`)}printDocumentHtml(`<!doctype html><html><head><style>@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Arial;color:#18324a}.sheet{width:210mm;height:296mm;display:grid;grid-template-columns:repeat(3,70mm);grid-template-rows:repeat(8,37mm);break-after:page;page-break-after:always}.sheet:last-child{break-after:auto;page-break-after:auto}article{width:70mm;height:37mm;padding:3mm 3.5mm;display:grid;grid-template-columns:1fr 25mm;align-items:center;overflow:hidden}article div{display:grid;gap:1.2mm}article>b{font-size:8pt;color:#078d82}strong{font-size:13pt}span{font-size:8.5pt}em{font-style:normal;font-weight:900;font-size:12pt;letter-spacing:1px}img{width:24mm;height:24mm;image-rendering:pixelated}</style></head><body>${pages.join("")}</body></html>`)}catch(err){console.error(err);alert("De etiketten konden niet worden gemaakt. Vernieuw de pagina en probeer opnieuw.")}}
function renderStudentHome(){
 const s=studentById(currentStudentId),cfg=studentSettings(currentStudentId);if(!s)return;
 $("#studentLogoutBtn").textContent=isPreview?"Terug naar testcentrum":"Afmelden";
 $("#studentWelcomeName").textContent=`Hallo, ${s.name}!`;
 $("#studentAssignmentText").textContent=`Jouw tafels: ${cfg.tables.join(", ")} · ${cfg.factorPosition==="front"?"tafelgetal vooraan":cfg.factorPosition==="back"?"tafelgetal achteraan":"beide richtingen"}`;
 renderStudentAssignments();
 const defs=[
  ["learn","🧩","Fase 1 · Leren","Eerst zien, dan kiezen, daarna zelf oplossen"],["mix","🎲","Fase 2 · Inoefenen","Gekende tafel-feiten en vraagvormen door elkaar"],
  ["smart","🎯","Fase 3 · Automatiseren","Moeilijke en trage oefeningen vaker"],["remediate","🛠️","Gericht remediëren","Probleemfeiten opnieuw opbouwen en herhalen"],
  ["knowledge","✓","Kennistoets","Juist rekenen zonder tijdsdruk"],["flash","⚡","Flitstoets","Automatisatie: tijd per oefening"],["sprint","⏱️","Tempomissie","Zoveel mogelijk juist binnen de tijd"]
 ];
 const checkup=checkupDue(currentStudentId)?`<button class="mode-card student-mode checkup-card" data-mode="checkup"><span class="mode-icon">🔎</span><strong>Korte tafelcheck</strong><span>10 vragen bepalen wat jij extra moet oefenen</span></button>`:"";
 $("#studentModes").innerHTML=checkup+defs.filter(x=>["knowledge","flash","sprint"].includes(x[0])?cfg.modes.tempo:cfg.modes[x[0]]).map(([m,ic,t,sub])=>`<button class="mode-card student-mode" data-mode="${m}"><span class="mode-icon">${ic}</span><strong>${t}</strong><span>${sub}</span></button>`).join("")||'<div class="panel">Er staan nog geen oefeningen voor jou klaar.</div>';
 $$(".student-mode").forEach(b=>b.addEventListener("click",()=>{currentAssignmentId=null;b.dataset.mode==="checkup"?startCheckup():openSetup(b.dataset.mode)}));
 const sessions=db.sessions.filter(x=>x.studentId===currentStudentId),ans=sessions.flatMap(s=>s.answers),correct=ans.filter(a=>a.correct).length,p=ans.length?Math.round(correct/ans.length*100):0;
 $("#studentProgressSummary").innerHTML=`<div><strong>${sessions.length}</strong><span>oefenbeurten</span></div><div><strong>${ans.length}</strong><span>oefeningen</span></div><div><strong>${p}%</strong><span>juist</span></div>`
 renderStudentMedals(currentStudentId);renderStudentLiveRace()
}

function raceKind(){return document.querySelector('input[name="raceKind"]:checked')?.value||"race"}
function raceQuestionSet(tables,operation,count){const pool=shuffle(allFacts(tables,operation,db.settings)),out=[];for(let i=0;i<count;i++){const q=addVariant({...pool[i%pool.length]},"smart",i,db.settings,"direct");out.push({key:q.key,op:q.op,table:q.table,n:q.n,a:q.a,b:q.b,answer:q.answer,userAnswer:q.userAnswer,text:q.text,displayText:q.displayText||q.text,variant:"direct"})}return out}
function renderRaceTeacher(){
 setChecks($("#raceTableChecks"),db.settings.tables);const r=currentLiveRace,status=$("#raceTeacherStatus"),participants=currentRaceParticipants.length;$("#openRaceBoardBtn").disabled=!r;$("#startRaceBtn").disabled=!r||r.status!=="lobby"||!participants;$("#stopRaceBtn").disabled=!r||!["lobby","running"].includes(r.status);
 if(!r){status.innerHTML="<strong>Nog geen live spel</strong><p>Maak eerst een spel. Daarna kunnen de kinderen deelnemen.</p>";return}
 const label=r.kind==="team"?"Samen naar de finish":"Zebrarace",state=r.status==="lobby"?"wacht op het startsein":r.status==="running"?"is bezig":"is afgelopen";status.innerHTML=`<strong>${label} ${state}</strong><p>${participants} deelnemer${participants===1?"":"s"} klaar · ${r.questions?.length||0} oefeningen per kind.</p>`
}
async function createRace(){const tables=selected($("#raceTableChecks"));if(!tables.length)return alert("Kies minstens één tafel voor het spel.");if(!window.createLiveRace)return alert("Open TafelExpeditie vanuit de huiswerktool om een live spel te starten.");const count=+$("#raceQuestionCount").value,operation=$("#raceOperation").value,kind=raceKind(),questions=raceQuestionSet(tables,operation,count);$("#createRaceBtn").disabled=true;try{await window.createLiveRace({kind,tables,operation,count,questions,title:kind==="team"?"Samen naar de finish":"Zebrarace"})}catch(err){console.error(err);alert("Het live spel kon niet worden gemaakt. Controleer eerst de aanvullende Firebase-regels.")}finally{$("#createRaceBtn").disabled=false}}
function renderStudentLiveRace(){const box=$("#studentLiveRace");if(!box)return;const r=currentLiveRace;if(!publicStudentMode||!r||!["lobby","running"].includes(r.status)){box.classList.add("hidden");box.innerHTML="";return}box.classList.remove("hidden");box.innerHTML=`<div><span class="eyebrow">LIVE MET DE KLAS</span><h3>${r.kind==="team"?"⭐ Samen naar de finish":"🏁 Zebrarace"}</h3><p>${r.status==="lobby"?"Je zebra kan nu aansluiten. Daarna wachten we samen op het startsein.":"De race is al begonnen. Sluit snel aan!"}</p></div><button id="joinLiveRaceBtn">Ik doe mee!</button>`;$("#joinLiveRaceBtn").addEventListener("click",joinLiveRace)}
async function joinLiveRace(){if(!currentLiveRace||!window.joinLiveRace)return;const s=studentById(currentStudentId);await window.joinLiveRace({raceId:currentLiveRace.id,classNumber:s.classNumber||0,firstName:s.firstName||s.name,total:currentLiveRace.questions.length});showView("studentRaceLobby");$("#studentRaceLobbyTitle").textContent=currentLiveRace.kind==="team"?"Jij helpt de klasster vooruit!":"Je zebra staat klaar!";if(currentLiveRace.status==="running")beginLiveRace(currentLiveRace)}
function beginLiveRace(race){if(!race||currentSession?.raceId===race.id)return;currentMode="liveRace";currentSession={id:uid(),studentId:currentStudentId,mode:"liveRace",raceId:race.id,raceKind:race.kind,plannedCount:race.questions.length,startedAt:new Date().toISOString(),answers:[],questions:race.questions.map(q=>({...q})),index:0,streak:0,stars:0,wrongAttempts:0};$("#exerciseStudent").textContent=`Klasnummer ${studentById(currentStudentId)?.classNumber||""} · LIVE`;$("#timerBox").classList.add("hidden");$("#streakBox").classList.remove("hidden");$("#starBox").classList.add("hidden");$("#stopBtn").classList.add("hidden");showView("exercise");renderQuestion()}
function finishLiveRace(stopped=false){const s=currentSession;if(!s)return;s.finishedAt=new Date().toISOString();s.stopped=stopped;if(!stopped)window.updateLiveRaceProgress?.({raceId:s.raceId,progress:s.questions.length,total:s.questions.length,wrong:s.wrongAttempts||0,finished:true,elapsedMs:new Date(s.finishedAt)-new Date(s.startedAt)});renderResult(s);currentSession=null;currentMode=null;showView("result")}
window.onLiveRaceUpdate=race=>{currentLiveRace=race;if(currentStudentId)renderStudentLiveRace();if(race?.status==="running"&&views.studentRaceLobby.classList.contains("active"))beginLiveRace(race);if(race?.status==="finished"&&currentSession?.raceId===race.id)finishLiveRace(true);renderRaceTeacher();if(views.raceBoard.classList.contains("active"))renderRaceBoard()};
window.onLiveRaceParticipants=rows=>{currentRaceParticipants=rows||[];renderRaceTeacher();if(views.raceBoard.classList.contains("active"))renderRaceBoard()};
function openRaceBoard(){if(!currentLiveRace)return;showView("raceBoard");renderRaceBoard();clearInterval(raceBoardTick);raceBoardTick=setInterval(renderRaceBoard,1000)}
function previewRaceBoard(kind){const questions=Array.from({length:10},(_,i)=>({text:`${i+1} × 2 =`,userAnswer:(i+1)*2,answer:(i+1)*2,table:2,n:i+1,op:"multiply",variant:"direct"}));currentLiveRace={id:"preview",kind,status:"running",questions,startedAt:new Date(Date.now()-43000).toISOString()};const classChildren=visibleStudents().filter(s=>!s.isTeacherTest);currentRaceParticipants=classChildren.map((s,i)=>{const progress=(i*7+3)%11,done=progress>=10;return{classNumber:s.classNumber||i+1,firstName:s.firstName||s.name||`Kind ${i+1}`,progress,total:10,finished:done,finishedAt:done?new Date(Date.now()-4000+i*100).toISOString():null,elapsedMs:done?39000+i*100:0}});openRaceBoard()}
function renderRaceBoard(){const r=currentLiveRace;if(!r)return;const rows=[...currentRaceParticipants],total=r.questions?.length||r.count||10,finished=r.status==="finished";$("#raceBoardKind").textContent=r.kind==="team"?"SAMEN NAAR DE FINISH":"LIVE ZEBRARACE";$("#raceBoardTitle").textContent=r.status==="lobby"?`${rows.length} zebra${rows.length===1?"":"'s"} klaar voor de start`:finished?"Wat een finish!":"Vooruit, zebra's!";const elapsed=r.startedAt?Math.max(0,Date.now()-new Date(r.startedAt).getTime()):0;$("#raceBoardTimer").textContent=`${String(Math.floor(elapsed/60000)).padStart(2,"0")}:${String(Math.floor(elapsed/1000)%60).padStart(2,"0")}`;const scene=$("#raceBoardScene");scene.classList.toggle("team",r.kind==="team");scene.classList.toggle("individual",r.kind!=="team");const lanes=$("#raceBoardParticipants"),team=$("#teamRaceProgress");if(r.kind==="team"){lanes.innerHTML="";team.classList.remove("hidden");const gained=rows.reduce((n,x)=>n+(x.progress||0),0),possible=Math.max(1,rows.length*total),pct=Math.min(100,Math.round(gained/possible*100));team.innerHTML=`<div class="team-star" style="left:calc(${pct}% - 45px)">★</div><div class="team-progress-copy"><b>${pct}%</b><span>${gained} juiste stappen samen</span></div>`}else{team.classList.add("hidden");lanes.style.setProperty("--racer-count",Math.max(1,rows.length));lanes.style.setProperty("--racer-size",`${rows.length<=18?72:rows.length<=24?58:50}px`);const markers='<span class="race-marker start"><b>START</b></span><span class="race-marker finish"><b>FINISH</b></span>';lanes.innerHTML=rows.length?markers+rows.map(x=>{const pct=x.finished?100:Math.min(100,Math.round((x.progress||0)/total*100));return`<div class="race-lane"><span class="racing-zebra${x.finished?" finished":""}" style="--race-progress:${pct/100}"><img src="assets/zebra-racer-token-v2.png" alt="Zebra klasnummer ${esc(x.classNumber||"?")}${x.finished?", gefinisht":""}"><b>${esc(x.classNumber||"?")}</b></span></div>`}).join(""):'<div class="race-waiting">De zebra’s verschijnen zodra kinderen op “Ik doe mee” drukken.</div>'}const leaders=rows.filter(x=>x.finished).sort((a,b)=>String(a.finishedAt).localeCompare(String(b.finishedAt))||(a.elapsedMs||0)-(b.elapsedMs||0)).slice(0,5),board=$("#raceLeaderboard");board.classList.toggle("hidden",!finished);if(finished)board.innerHTML=`<h2>🏆 Top 5</h2><div>${leaders.map((x,i)=>`<article><b>${i+1}</b><span>${esc(x.firstName)} · nr. ${esc(x.classNumber)}</span><strong>${((x.elapsedMs||0)/1000).toFixed(1)} s</strong></article>`).join("")||"Iedereen heeft dapper meegedaan!"}</div><p>${leaders.length===5?"De eerste vijf bereikten de finish. De race is afgelopen.":`${rows.filter(x=>x.finished).length} kinderen bereikten de finish.`}</p>`}

const previewModes=[
 {group:"practice",mode:"learn",icon:"🧩",title:"Fase 1 · Leren",text:"Eerst zien, dan kiezen en daarna zelf oplossen; fouten keren terug met hulp"},
 {group:"practice",mode:"mix",icon:"🎲",title:"Fase 2 · Inoefenen",text:"Gekende tafelfeiten en verschillende vraagvormen door elkaar"},
 {group:"practice",mode:"smart",icon:"🎯",title:"Fase 3 · Automatiseren",text:"Moeilijke, trage en weinig geoefende feiten komen vaker terug"},
 {group:"practice",mode:"remediate",icon:"🛠️",title:"Gerichte remediëring",text:"Probleemfeiten opnieuw opbouwen, steun afbouwen en fouten herhalen"},
 {group:"test",mode:"checkup",icon:"🔎",title:"Korte tafelcheck",text:"10 vragen brengen in kaart wat al gekend is en wat extra oefening vraagt"},
 {group:"test",mode:"knowledge",icon:"✓",title:"Kennistoets",text:"Juistheid zonder tijdsdruk"},
 {group:"test",mode:"flash",icon:"⚡",title:"Flitstoets",text:"Instelbare tijd per oefening"},
 {group:"test",mode:"sprint",icon:"⏱️",title:"Tempomissie",text:"Zoveel mogelijk binnen de totale tijd"}
];
function previewModeHtml(x){return `<button class="preview-mode-card" data-preview-mode="${x.mode}"><span class="mode-icon">${x.icon}</span><span><strong>${x.title}</strong><small>${x.text}</small></span><b>Test →</b></button>`}
function renderPreviewCenter(){
 const empty='<div class="empty-state">Voeg eerst een leerling toe om met klasinstellingen te testen.</div>',hasStudent=!!$("#previewStudentSelect").value;
 $("#previewPracticeModes").innerHTML=hasStudent?previewModes.filter(x=>x.group==="practice").map(previewModeHtml).join(""):empty;
 $("#previewTestModes").innerHTML=hasStudent?previewModes.filter(x=>x.group==="test").map(previewModeHtml).join(""):empty;
 $$('[data-preview-mode]').forEach(b=>b.addEventListener("click",()=>startDirectPreview(b.dataset.previewMode)));renderCelebrationPreview()
}
function startDirectPreview(mode){const id=$("#previewStudentSelect").value;if(!id)return;currentStudentId=id;currentAssignmentId=null;isPreview=true;returnContext="discover";if(mode==="checkup"){startCheckup();return}openSetup(mode)}

function modeLabel(mode){return({learn:"Fase 1 · Leren",mix:"Fase 2 · Inoefenen",smart:"Fase 3 · Automatiseren",remediate:"Gerichte remediëring",checkup:"Korte tafelcheck",knowledge:"Kennistoets",flash:"Flitstoets",sprint:"Tempomissie",tempo:"Tempotoets"})[mode]||mode}
function isAssessmentMode(mode){return ["knowledge","flash","sprint","test","tempo","checkup"].includes(mode)}
function checkupDue(id){const sessions=db.sessions.filter(s=>s.studentId===id),last=[...sessions].reverse().find(s=>s.mode==="checkup");if(!last)return true;const later=sessions.filter(s=>s.mode!=="checkup"&&new Date(s.startedAt)>new Date(last.startedAt)).length,days=(Date.now()-new Date(last.startedAt).getTime())/86400000;return later>=5||days>=14}
function startCheckup(){const cfg=studentSettings(currentStudentId);currentMode="checkup";openSetup("checkup");setChecks($("#tableChecks"),cfg.tables);$("#questionCount").value="10";$("#operationSelect").value=cfg.multiply&&cfg.divide?"both":cfg.divide?"divide":"multiply";startExercise()}
function assignmentStudents(a){if(a.target==="all")return visibleStudents();const ids=Array.isArray(a.targets)?a.targets:[a.target];return db.students.filter(s=>ids.includes(s.id))}
function assignmentDone(a,id){return (a.completedBy||[]).includes(id)}
function renderAssignments(){
 setChecks($("#assignmentTableChecks"),db.settings.tables);const rows=[...(db.assignments||[])].filter(a=>!a.className||!db.activePortalClass||a.className===db.activePortalClass).reverse();
 $("#assignmentRows").innerHTML=rows.length?rows.map(a=>{const learners=assignmentStudents(a),done=learners.filter(s=>assignmentDone(a,s.id)).length,forWho=a.target==="all"?"hele klasgroep":`${learners.length} leerling${learners.length===1?"":"en"}`,measure=a.mode==="sprint"?`${Math.round((a.tempo||120)/60)} min.`:a.mode==="flash"?`${a.count} oefeningen · ${a.perQuestion||3} sec./oefening`:`${a.count} oefeningen`;return `<article class="assignment-card teacher-assignment"><div><span class="mission-type">${a.kind==="test"?"TOETS · ":""}${esc(modeLabel(a.mode))}</span><h4>${esc(a.title)}</h4><p>${forWho} · ${(a.operation==="multiply"?"maal":a.operation==="divide"?"deel":"maal + delen")} · ${a.tables.map(t=>`×${t}`).join(" · ")} · ${measure}${a.due?` · tegen ${new Date(a.due+"T12:00:00").toLocaleDateString("nl-BE")}`:""}</p></div><div class="assignment-status"><b>${done}/${learners.length}</b><span>klaar</span><button class="secondary delete-assignment" data-id="${a.id}">Verwijder</button></div></article>`}).join(""):'<div class="empty-state">Nog geen missies. Zet hierboven de eerste klaar.</div>';
 $$(".delete-assignment").forEach(b=>b.addEventListener("click",()=>{db.assignments=db.assignments.filter(a=>a.id!==b.dataset.id);saveDb();renderAssignments();window.requestPortalPublish?.()}))
}
function createAssignment(){
 const tables=selected($("#assignmentTableChecks")),modes=[...$("#assignmentModeChecks").querySelectorAll("input:checked")].map(x=>x.value),title=$("#assignmentTitle").value.trim(),targetMode=$("#assignmentTarget").value,targets=targetMode==="selection"?[...$("#assignmentStudentChecks").querySelectorAll("input:checked")].map(x=>x.value):[];if(!modes.length){$("#assignmentSaved").textContent="Kies minstens één oefenvorm.";return}if(!tables.length){$("#assignmentSaved").textContent="Kies minstens één tafel.";return}if(targetMode==="selection"&&!targets.length){$("#assignmentSaved").textContent="Kies minstens één leerling.";return}
 modes.forEach((mode,sequence)=>{const kind=isAssessmentMode(mode)?"test":"practice",missionTitle=title?(modes.length>1?`${title} · ${modeLabel(mode)}`:title):modeLabel(mode);db.assignments.push({id:uid(),target:targetMode==="all"?"all":"selection",targets,className:db.activePortalClass||"",kind,mode,sequence,operation:$("#assignmentOperation").value,tempo:+$("#assignmentTempo").value,perQuestion:+$("#assignmentPerQuestion").value,count:+$("#assignmentCount").value,tables,due:$("#assignmentDue").value,title:missionTitle,createdAt:new Date(Date.now()+sequence).toISOString(),completedBy:[]})});saveDb();$("#assignmentTitle").value="";const verb=modes.length===1?"staat":"staan";$("#assignmentSaved").textContent=`${modes.length} missie${modes.length===1?"":"s"} ${verb} klaar ${targetMode==="all"?"voor de hele klasgroep":`voor ${targets.length} leerling${targets.length===1?"":"en"}`}.`;renderAssignments();window.requestPortalPublish?.()
}
function renderStudentAssignments(){
 const student=studentById(currentStudentId),today=new Date().toLocaleDateString("sv-SE"),assigned=(db.assignments||[]).filter(a=>(!a.className||!student?.portalClass||a.className===student.portalClass)&&(a.target==="all"||a.target===currentStudentId||(Array.isArray(a.targets)&&a.targets.includes(currentStudentId)))),all=assigned.filter(a=>assignmentDone(a,currentStudentId)||!a.due||a.due>=today),open=all.filter(a=>!assignmentDone(a,currentStudentId)),done=all.filter(a=>assignmentDone(a,currentStudentId));
 const card=a=>{const measure=a.mode==="sprint"?`${Math.round((a.tempo||120)/60)} min. zoveel mogelijk`:`${a.count} vragen`;return `<button class="assignment-card student-assignment ${a.kind==="test"?"test-card":""}" data-id="${a.id}"><span class="mission-check">${a.kind==="test"?"✓":a.mode==="tempo"?"⏱":"★"}</span><span><small>${a.kind==="test"?"TOETS · ":""}${esc(modeLabel(a.mode))}</small><strong>${esc(a.title)}</strong><em>${a.tables.map(t=>`tafel ${t}`).join(" · ")} · ${measure}${a.due?` · tegen ${new Date(a.due+"T12:00:00").toLocaleDateString("nl-BE")}`:""}</em></span><b>Start →</b></button>`};
 const completed=a=>`<article class="assignment-card completed-assignment"><span class="completed-check">✓</span><span><small>KLAAR</small><strong>${esc(a.title)}</strong><em>${esc(modeLabel(a.mode))} · goed gedaan!</em></span><b>Afgerond</b></article>`;
 $("#studentAssignments").innerHTML=`<h4 class="assignment-group-title">Nog te doen</h4>${open.length?open.map(card).join(""):'<div class="empty-state success-state">Alles klaar! Je hebt geen openstaande missies.</div>'}${done.length?`<h4 class="assignment-group-title completed-title">Klaar!</h4><div class="completed-list">${done.map(completed).join("")}</div>`:""}`;
 $$(".student-assignment").forEach(b=>b.addEventListener("click",()=>openAssignment(b.dataset.id)))
}
function openAssignment(id){const a=(db.assignments||[]).find(x=>x.id===id);if(!a)return;currentAssignmentId=id;currentMode=["knowledge","flash","sprint"].includes(a.mode)?a.mode:a.kind==="test"?(a.mode==="tempo"?"sprint":"knowledge"):a.mode;openSetup(currentMode);setChecks($("#tableChecks"),a.tables);$("#questionCount").value=String(a.count);$("#operationSelect").value=a.operation||"both";$("#tempoSeconds").value=String(a.tempo||120);$("#perQuestionSeconds").value=String(a.perQuestion||3);startExercise()}

function factKey(op,a,b){return`${op}:${a}:${b}`}
function makeMultiplyFact(table,n,cfg,direction=null){
 let dir=direction||cfg.factorPosition;if(dir==="both")dir=Math.random()<.5?"front":"back";
 let a=dir==="front"?table:n,b=dir==="front"?n:table;
 return{op:"multiply",table,n,a,b,answer:a*b,key:factKey("multiply",a,b),text:`${a} × ${b} =`,direction:dir}
}
function makeDivideFact(table,n,cfg){
 const product=table*n;
 return{op:"divide",table,n,a:product,b:table,answer:n,key:factKey("divide",product,table),text:`${product} : ${table} =`}
}
function allFacts(tables,operation,cfg){
 const facts=[];
 tables.forEach(t=>{for(let n=1;n<=10;n++){if(operation!=="divide")facts.push(makeMultiplyFact(t,n,cfg));if(operation!=="multiply")facts.push(makeDivideFact(t,n,cfg))}});
 return facts
}
function statFor(studentId,key){return db.factStats[studentId]?.[key]}
function weakness(f,id){
 const st=statFor(id,f.key);if(!st)return 8;
 const acc=st.correct/st.attempts,avg=st.correct?st.totalCorrectMs/st.correct:12000;
 return(1-acc)*10+Math.min(avg/(db.settings.fluentSeconds*1000),4)+(st.attempts<2?2:0)
}
function weightedPool(facts,id){const out=[];facts.forEach(f=>{const w=Math.max(1,Math.round(weakness(f,id)));for(let i=0;i<w;i++)out.push(f)});return out}
function addVariant(q,mode,index,cfg,forced=null){
 if(isAssessmentMode(mode)){q.variant="direct";q.userAnswer=q.answer;return q}
 const cycles={learn:["visual","choice","missing","family","direct"],mix:["choice","truefalse","missing","family","direct"],smart:["direct","choice","missing","direct","truefalse"],remediate:["visual","visual","missing","family","choice"]};
 const cycle=cycles[mode]||cycles.mix;
 q.variant=forced||cycle[index%cycle.length];
 if(q.variant==="visual"&&!cfg.visual)q.variant="direct";
 if(q.variant==="missing"&&!cfg.missing)q.variant="direct";
 if(q.variant==="family"&&!cfg.families)q.variant="direct";
 q.userAnswer=q.answer;
 if(q.variant==="choice"){
  const wrong=new Set();while(wrong.size<3){const w=q.answer+rand([-5,-4,-3,-2,-1,1,2,3,4,5]);if(w>=0&&w!==q.answer)wrong.add(w)}q.choices=shuffle([q.answer,...wrong])
 }
 if(q.variant==="truefalse"){
  const good=Math.random()<.5;q.statementAnswer=good?q.answer:Math.max(0,q.answer+rand([-3,-2,-1,1,2,3]));if(!good&&q.statementAnswer===q.answer)q.statementAnswer++;q.userAnswer=good?1:0
 }
 if(q.variant==="missing"){
  if(q.op==="multiply"){q.displayText=`□ × ${q.b} = ${q.answer}`;q.userAnswer=q.a}
  else{q.displayText=`${q.a} : □ = ${q.answer}`;q.userAnswer=q.b}
 }
 if(q.variant==="family"){
  if(q.op==="multiply"){q.displayText=`${q.answer} : ${q.a} =`;q.userAnswer=q.b;q.prompt="Maal en deel zijn omgekeerde bewerkingen."}
  else{q.displayText=`${q.b} × ${q.answer} =`;q.userAnswer=q.a;q.prompt="Gebruik maal als omgekeerde bewerking."}
 }
 return q
}
function makeQuestions(mode,tables,operation,count,cfg){
 let facts=allFacts(tables,operation,cfg),base=[];
 if(mode==="checkup")return shuffle(facts).slice(0,count).map((q,i)=>addVariant({...q},mode,i,cfg));
 if(mode==="learn"){
  const order=[1,2,5,10,3,4,6,7,8,9],targets=[...facts].sort((a,b)=>tables.indexOf(a.table)-tables.indexOf(b.table)||order.indexOf(a.n)-order.indexOf(b.n)||Number(a.op==="divide")-Number(b.op==="divide")).slice(0,Math.ceil(count/3));
  targets.forEach(q=>{base.push(addVariant({...q},mode,0,cfg,"visual"));base.push(addVariant({...q},mode,1,cfg,"choice"))});targets.forEach(q=>base.push(addVariant({...q},mode,4,cfg,"direct")));return base.slice(0,count)
 }
 if(mode==="remediate"){
  const targets=[...facts].sort((a,b)=>weakness(b,currentStudentId)-weakness(a,currentStudentId)).slice(0,Math.max(3,Math.ceil(count/3)));
  targets.forEach(q=>{base.push(addVariant({...q},mode,0,cfg,"visual"));base.push(addVariant({...q},mode,2,cfg,"missing"))});targets.forEach(q=>base.push(addVariant({...q},mode,4,cfg,"direct")));return base.slice(0,count)
 }
 if(mode==="smart")facts=weightedPool(facts,currentStudentId);else facts=shuffle(facts);
 for(let i=0;i<count;i++)base.push({...facts[i%facts.length]});
 return base.map((q,i)=>addVariant(q,mode,i,cfg))
}
function openSetup(mode){
 currentMode=mode;const cfg=studentSettings(currentStudentId);$("#setupTitle").textContent=({learn:"Fase 1 · Leren",mix:"Fase 2 · Inoefenen",smart:"Fase 3 · Automatiseren",remediate:"Gericht remediëren",checkup:"Korte tafelcheck",knowledge:"Kennistoets zonder tijd",flash:"Flitstoets per oefening",sprint:"Tempomissie",tempo:"Tempomissie",test:"Kennistoets"})[mode];
 $("#tempoTimeWrap").classList.toggle("hidden",!["sprint","tempo"].includes(mode));$("#perQuestionTimeWrap").classList.toggle("hidden",mode!=="flash");$("#remediateInfo").classList.toggle("hidden",mode!=="remediate");
 $("#questionCount").value=String(cfg.defaultCount);$("#tempoSeconds").value=String(cfg.defaultTempo);
 $("#questionCount").closest("label").classList.toggle("hidden",["sprint","tempo"].includes(mode));
 const info={learn:"Elk nieuw tafel-feit wordt eerst zichtbaar opgebouwd, daarna gekozen en pas dan zonder hulp opgelost.",mix:"Gekende tafel-feiten komen in verschillende vraagvormen door elkaar terug.",smart:"Moeilijke, trage en weinig geoefende tafel-feiten komen vaker en vooral zonder hulp terug.",remediate:"Een kleine groep probleemfeiten wordt opnieuw opgebouwd. Een fout antwoord keert later in dezelfde oefenbeurt terug.",checkup:"Tien korte vragen zonder hulp brengen in kaart wat al gekend is en wat extra oefening nodig heeft.",knowledge:"Meet of je het juiste antwoord kunt vinden. Er is geen tijdsdruk en je krijgt feedback na afloop.",flash:"Elke oefening heeft een eigen tijdslimiet. Juist maar te traag is nog niet geautomatiseerd.",sprint:"Los binnen de totale tijd zoveel mogelijk oefeningen op. We meten aantal, nauwkeurigheid en correcte antwoorden per minuut.",tempo:"Los binnen de totale tijd zoveel mogelijk oefeningen op."};$("#modeInfo").textContent=info[mode]||"";
 setChecks($("#tableChecks"),mode==="learn"?[cfg.tables[0]]:cfg.tables);
 let op="both";if(cfg.multiply&&!cfg.divide)op="multiply";if(!cfg.multiply&&cfg.divide)op="divide";$("#operationSelect").value=op;
 $("#tableChecks").classList.remove("locked");$("#tableChecks").querySelectorAll("input").forEach(x=>x.disabled=false);$("#questionCount").disabled=false;$("#operationSelect").disabled=!(cfg.multiply&&cfg.divide);$("#previewBadge").classList.toggle("hidden",!isPreview);showView("setup")
}
function startExercise(){
 const cfg=studentSettings(currentStudentId),tables=selected($("#tableChecks"));if(!tables.length){$("#setupError").textContent="Kies minstens één tafel.";return}
 const op=$("#operationSelect").value,selectedCount=+$("#questionCount").value,count=["sprint","tempo"].includes(currentMode)?100:selectedCount,seconds=["sprint","tempo"].includes(currentMode)?+$("#tempoSeconds").value:null,perQuestion=currentMode==="flash"?+$("#perQuestionSeconds").value:null;
 currentSession={id:uid(),studentId:currentStudentId,assignmentId:currentAssignmentId,mode:currentMode,operation:op,tables,plannedCount:count,requiredCount:selectedCount,startedAt:new Date().toISOString(),answers:[],questions:makeQuestions(currentMode,tables,op,count,cfg),index:0,remainingSeconds:seconds,perQuestionSeconds:perQuestion,preview:isPreview,streak:0,stars:0};
 $("#streakBox").textContent="🔥 0";$("#starBox").textContent="★ 0";$("#streakBox").classList.toggle("hidden",isAssessmentMode(currentMode));$("#starBox").classList.toggle("hidden",isAssessmentMode(currentMode));
 $("#exerciseStudent").textContent=studentById(currentStudentId)?.name+(isPreview?" · TESTMODUS":"");$("#timerBox").classList.toggle("hidden",!["sprint","tempo","flash"].includes(currentMode));$("#stopBtn").classList.remove("hidden");showView("exercise");if(["sprint","tempo"].includes(currentMode))startTimer();renderQuestion()
}
function startTimer(){clearInterval(timerId);updateTimer();timerId=setInterval(()=>{currentSession.remainingSeconds--;updateTimer();if(currentSession.remainingSeconds<=0){clearInterval(timerId);finishSession(true)}},1000)}
function updateTimer(){const s=Math.max(0,currentSession.remainingSeconds||0);$("#timerText").textContent=`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`}
function clearQuestionTimer(){clearTimeout(questionTimerId);clearInterval(questionTickId);questionTimerId=null;questionTickId=null}
function startQuestionTimer(){
 clearQuestionTimer();if(!currentSession?.perQuestionSeconds)return;const end=performance.now()+currentSession.perQuestionSeconds*1000;
 const tick=()=>{$("#timerText").textContent=`${Math.max(0,(end-performance.now())/1000).toFixed(1)} s`};tick();questionTickId=setInterval(tick,100);questionTimerId=setTimeout(()=>handleAnswer(null,true),currentSession.perQuestionSeconds*1000)
}
function supportHtml(q){
 if(q.variant!=="visual")return"";
 if(q.op==="multiply"){
  const groups=Array.from({length:q.a},()=>`<span class="group">${Array.from({length:q.b},()=>'<i class="counter"></i>').join("")}</span>`).join("");
  return `<strong>${q.a} groepen van ${q.b}</strong><div class="groups">${groups}</div><p>Herhaalde optelling: ${Array.from({length:q.a},()=>q.b).join(" + ")} = ?</p><p>${q.a} keer ${q.b} → ${q.a} × ${q.b} = ?</p>`
 }
 const groups=Array.from({length:q.answer},()=>`<span class="group">${Array.from({length:q.b},()=>'<i class="counter"></i>').join("")}</span>`).join("");
 const subtraction=[q.a,...Array.from({length:q.answer},()=>`− ${q.b}`)].join(" ");return `<strong>Verdeel ${q.a} in groepjes van ${q.b}. Hoeveel groepjes zie je?</strong><div class="groups">${groups}</div><p>Herhaalde aftrekking: ${subtraction} = 0</p><p>${q.a} : ${q.b} = ? en ? × ${q.b} = ${q.a}</p>`
}
function renderQuestion(){
 if(!currentSession)return;if(currentSession.index>=currentSession.questions.length){finishSession(false);return}
 currentSession.acceptingAnswer=true;
 const q=currentSession.questions[currentSession.index],sprint=["sprint","tempo"].includes(currentSession.mode);$("#progressText").textContent=sprint?`${currentSession.index} opgelost`:`${currentSession.index+1} / ${currentSession.questions.length}`;$("#progressFill").style.width=sprint?"100%":`${currentSession.index/currentSession.questions.length*100}%`;
 $("#feedback").textContent="";$("#feedback").className="feedback";$("#choiceBox").innerHTML="";$("#choiceBox").classList.add("hidden");$("#answerForm").classList.remove("hidden");
 $("#exercisePrompt").textContent=q.prompt||({direct:"Flitsvraag",choice:"Kies het antwoord",truefalse:"Juist of fout?",missing:"Zoek het ontbrekende getal",family:"Omgekeerde bewerking",visual:"Kijk en reken"})[q.variant]||"Oefening";
 let display=q.displayText||q.text;if(q.variant==="truefalse")display=`${q.text.replace("=","").trim()} = ${q.statementAnswer}`;$("#questionText").textContent=display;
 const sh=supportHtml(q);$("#supportBox").innerHTML=sh;$("#supportBox").classList.toggle("hidden",!sh);
 if(q.variant==="choice"){choiceButtons(q.choices.map(v=>[String(v),v]))}
 else if(q.variant==="truefalse"){choiceButtons([["Juist",1],["Fout",0]])}
 else{$("#answerInput").value="";setTimeout(()=>$("#answerInput").focus(),0)}
 currentSession.questionStartedAt=performance.now();startQuestionTimer()
}
function choiceButtons(items){$("#answerForm").classList.add("hidden");$("#choiceBox").classList.remove("hidden");items.forEach(([lab,val])=>{const b=document.createElement("button");b.type="button";b.className="choice-btn";b.textContent=lab;b.addEventListener("click",()=>handleAnswer(val));$("#choiceBox").appendChild(b)})}
function makeRetryQuestion(q,mode){const base={op:q.op,table:q.table,n:q.n,a:q.a,b:q.b,answer:q.answer,key:q.key,text:q.text,direction:q.direction,retryCount:(q.retryCount||0)+1},cfg=studentSettings(currentStudentId),forced=base.retryCount===1&&["learn","remediate"].includes(mode)?"visual":base.retryCount===1?"choice":"direct",retry=addVariant(base,mode,0,cfg,forced);retry.prompt=base.retryCount===1?"We proberen deze nog eens met hulp.":"Nog één keer zonder hulp.";return retry}
function handleAnswer(value,timedOut=false){
 if(!currentSession||!currentSession.acceptingAnswer||currentSession.index>=currentSession.questions.length)return;currentSession.acceptingAnswer=false;clearQuestionTimer();const q=currentSession.questions[currentSession.index],ms=timedOut?currentSession.perQuestionSeconds*1000:Math.max(100,Math.round(performance.now()-currentSession.questionStartedAt)),correct=!timedOut&&Number(value)===Number(q.userAnswer),fluent=correct&&ms<=db.settings.fluentSeconds*1000;
 const a={key:q.key,op:q.op,table:q.table,n:q.n,question:q.displayText||q.text,expected:q.userAnswer,given:timedOut?null:+value,correct,fluent,timedOut,ms,variant:q.variant};
 if(currentSession.mode==="liveRace"){currentSession.answers.push(a);if(!correct){currentSession.wrongAttempts=(currentSession.wrongAttempts||0)+1;$("#feedback").textContent="Nog eens proberen — je zebra wacht even.";$("#feedback").className="feedback bad";window.updateLiveRaceProgress?.({raceId:currentSession.raceId,progress:currentSession.index,total:currentSession.questions.length,wrong:currentSession.wrongAttempts,finished:false});setTimeout(renderQuestion,650);return}currentSession.index++;currentSession.streak++;$("#streakBox").textContent=`🔥 ${currentSession.streak}`;window.updateLiveRaceProgress?.({raceId:currentSession.raceId,progress:currentSession.index,total:currentSession.questions.length,wrong:currentSession.wrongAttempts||0,finished:currentSession.index>=currentSession.questions.length,elapsedMs:Date.now()-new Date(currentSession.startedAt).getTime()});$("#feedback").textContent="Juist! Je zebra gaat vooruit!";$("#feedback").className="feedback ok";if(currentSession.index>=currentSession.questions.length){setTimeout(finishLiveRace,500);return}setTimeout(renderQuestion,350);return}
 currentSession.answers.push(a);if(!isPreview)updateStat(currentStudentId,a);currentSession.streak=correct?currentSession.streak+1:0;if(correct)currentSession.stars+=fluent?2:1;
 $("#streakBox").textContent=`🔥 ${currentSession.streak}`;$("#starBox").textContent=`★ ${currentSession.stars}`;$$(".choice-btn").forEach(b=>b.disabled=true);currentSession.index++;if(!correct&&!isAssessmentMode(currentSession.mode)&&(q.retryCount||0)<2){const at=Math.min(currentSession.questions.length,currentSession.index+2);currentSession.questions.splice(at,0,makeRetryQuestion(q,currentSession.mode))}
 if(isAssessmentMode(currentSession.mode)){$("#feedback").textContent=timedOut?"Tijd voorbij — volgende oefening":"Antwoord bewaard";$("#feedback").className="feedback";setTimeout(renderQuestion,timedOut?450:180);return}
 $("#feedback").textContent=correct?(fluent?"Juist én vlot! +2 sterren":"Juist! Probeer het straks nog wat vlotter. +1 ster"):`Nog niet. ${q.text} ${q.answer}`;$("#feedback").className="feedback "+(correct?"ok":"bad");setTimeout(renderQuestion,correct?600:1200)
}
function updateStat(id,a){db.factStats[id]||={};const st=db.factStats[id][a.key]||={attempts:0,correct:0,totalCorrectMs:0};st.attempts++;if(a.correct){st.correct++;st.totalCorrectMs+=a.ms}saveDb()}
function finishSession(timeUp){
 if(!currentSession)return;clearInterval(timerId);clearQuestionTimer();currentSession.finishedAt=new Date().toISOString();currentSession.timeUp=!!timeUp;delete currentSession.questions;if(!isPreview){db.sessions.push(currentSession);const completed=currentSession.mode==="sprint"||currentSession.mode==="tempo"?timeUp:currentSession.answers.length>=currentSession.plannedCount;if(currentSession.assignmentId&&completed){const a=(db.assignments||[]).find(x=>x.id===currentSession.assignmentId);if(a){a.completedBy=a.completedBy||[];if(!a.completedBy.includes(currentStudentId))a.completedBy.push(currentStudentId)}if(publicStudentMode)publicCompletedAssignmentIds.add(currentSession.assignmentId)}saveDb();if(publicStudentMode)window.savePublicStudentProgress?.({sessions:db.sessions,factStats:db.factStats,completedAssignmentIds:[...publicCompletedAssignmentIds]})}renderResult(currentSession);currentSession=null;currentAssignmentId=null;showView("result")
}
function renderResult(s){const n=s.answers.length,c=s.answers.filter(a=>a.correct).length,unanswered=s.answers.filter(a=>a.timedOut).length,wrong=n-c-unanswered,p=n?Math.round(c/n*100):0,avg=n?s.answers.reduce((x,a)=>x+a.ms,0)/n/1000:0,fluentCount=s.answers.filter(a=>a.correct&&(a.fluent??a.ms<=db.settings.fluentSeconds*1000)).length,slow=c-fluentCount,durationMs=Math.max(1000,new Date(s.finishedAt)-new Date(s.startedAt)),rate=c/(durationMs/60000),automated=p>=90&&slow===0;$("#scorePct").textContent=p+"%";$("#scoreCorrect").textContent=s.mode==="liveRace"?`${Math.min(s.index,s.plannedCount)}/${s.plannedCount}`:`${c}/${n}`;$("#scoreWrong").textContent=s.mode==="liveRace"?s.wrongAttempts||0:wrong;$("#scoreUnanswered").textContent=unanswered;$("#avgTime").textContent=avg.toFixed(1)+" s";$("#scoreFluent").textContent=fluentCount;$("#scoreSlow").textContent=slow;$("#scoreRate").textContent=rate.toFixed(1);$("#resultMessage").textContent=s.mode==="liveRace"?(s.stopped?"Het spel is afgelopen. Goed meegedaan!":"Finish! Kijk naar het smartboard en moedig de andere zebra’s aan."):isPreview?"Testmodus: dit resultaat wordt niet opgeslagen.":automated?"Beheerst: juist én vlot!":p>=90?"Heel nauwkeurig, maar nog niet geautomatiseerd. Oefen verder met flitsvragen.":p>=75?"Goed op weg. Herhaal vooral de moeilijke feiten.":"Deze tafels vragen nog uitleg en visuele ondersteuning.";$("#mistakeList").innerHTML=s.mode==="liveRace"?"":s.answers.filter(a=>!a.correct||!(a.fluent??a.ms<=db.settings.fluentSeconds*1000)).slice(0,12).map(a=>`<span class="check">${esc(a.question)} ${a.expected} · ${a.timedOut?"niet binnen de tijd":a.correct?"juist maar traag":"fout"}</span>`).join("")}

function masteryFor(id,table){
 const stats=Object.entries(db.factStats[id]||{}).filter(([k])=>k.includes(`:${table}:`)||k.endsWith(`:${table}`)).map(([,v])=>v);
 if(!stats.length)return{level:"gray",label:"geen gegevens",acc:null,avg:null};
 const at=stats.reduce((s,x)=>s+x.attempts,0),co=stats.reduce((s,x)=>s+x.correct,0),ms=stats.reduce((s,x)=>s+x.totalCorrectMs,0),acc=co/at,avg=co?ms/co:99999,t=db.settings.fluentSeconds*1000;
 if(acc>=.9&&avg<=t)return{level:"green",label:"vlot",acc,avg};if(acc>=.75&&avg<=t*1.7)return{level:"orange",label:"nog oefenen",acc,avg};return{level:"red",label:"moeilijk",acc,avg}
}
function tableAchievement(id,table){
 const sessions=db.sessions.filter(s=>s.studentId===id&&isAssessmentMode(s.mode)&&!s.preview),rows=sessions.flatMap(s=>(s.answers||[]).filter(a=>Number(a.table)===Number(table)).map(a=>({...a,date:String(s.finishedAt||s.startedAt||"").slice(0,10),sessionId:s.id}))),byOp=op=>rows.filter(a=>a.op===op),measure=op=>{const a=byOp(op),correct=a.filter(x=>x.correct),dates=new Set(a.map(x=>x.date).filter(Boolean));return{attempts:a.length,dates:dates.size,accuracy:a.length?correct.length/a.length:0,avg:correct.length?correct.reduce((n,x)=>n+x.ms,0)/correct.length:99999}};
 const multiply=measure("multiply"),divide=measure("divide"),dates=new Set(rows.map(x=>x.date).filter(Boolean)).size,limit=db.settings.fluentSeconds*1000,everEarned=dates>=2&&multiply.attempts>=5&&divide.attempts>=5&&multiply.accuracy>=.9&&divide.accuracy>=.9&&multiply.avg<=limit&&divide.avg<=limit,last=[...sessions].reverse().find(s=>(s.answers||[]).filter(a=>Number(a.table)===Number(table)).length>=3),latest=(last?.answers||[]).filter(a=>Number(a.table)===Number(table)),latestCorrect=latest.filter(a=>a.correct),latestAccuracy=latest.length?latestCorrect.length/latest.length:1,latestAvg=latestCorrect.length?latestCorrect.reduce((n,x)=>n+x.ms,0)/latestCorrect.length:0,needsRefresh=everEarned&&latest.length>=3&&(latestAccuracy<.8||latestAvg>limit*1.7),earned=everEarned&&!needsRefresh;
 const evidence=multiply.attempts+divide.attempts,almost=!earned&&!needsRefresh&&dates>=1&&multiply.attempts>=3&&divide.attempts>=3&&multiply.accuracy>=.8&&divide.accuracy>=.8;
 return{earned,everEarned,needsRefresh,almost,evidence,dates,multiply,divide}
}
function earnedTables(id){return Array.from({length:10},(_,i)=>i+1).filter(t=>tableAchievement(id,t).earned)}
function celebrationLevel(id){
 const earned=earnedTables(id),almost=Array.from({length:10},(_,i)=>i+1).filter(t=>tableAchievement(id,t).almost&&!earned.includes(t));let title="Mijn tafelgroei",milestone="Dappere ontdekker",message="Je zet moedige stappen. Elke oefening maakt jouw denksporen sterker.";
 if([2,5,10].every(t=>earned.includes(t))){milestone="Eerste tafelsterren";message="De tafels van 2, 5 en 10 zitten al stevig in je rugzak. Wat een mooie basis!"}
 if(earned.length>=5){milestone="Sterke tafelkenner";message="Je kent al minstens vijf maal- én deeltafels juist en vlot. Blijf rustig verder bouwen."}
 if(earned.length>=8){milestone="Tafelexpert";message="Je schakelt knap tussen maal en deel. Nog enkele ontdekkingen en jouw expeditie is compleet!"}
 if(earned.length===10){title="TafelExpeditie-diploma";milestone="Volleerde tafelreiziger";message="Alle maal- en deeltafels zijn juist én vlot gekend. Jij hebt de volledige expeditie afgelegd!"}
 else if(!earned.length&&almost.length){milestone="Volhardende groeier";message="Je antwoorden worden steeds juister. Met korte oefenmomenten groeit ook jouw vlotheid."}
 return{earned,almost,title,milestone,message}
}
function previewCelebrationLevel(){
 const value=$("#celebrationPreviewLevel")?.value||"start",count=value==="almost"?0:Number(value)||0,earned=Array.from({length:count},(_,i)=>i+1),almost=value==="almost"?[2]:[];let title="Mijn tafelgroei",milestone="Dappere ontdekker",message="Je zet moedige stappen. Elke oefening maakt jouw denksporen sterker.";
 if(value==="almost"){milestone="Volhardende groeier";message="Je antwoorden worden steeds juister. Met korte oefenmomenten groeit ook jouw vlotheid."}
 if(count===3){milestone="Eerste tafelsterren";message="De tafels van 2, 5 en 10 zitten al stevig in je rugzak. Wat een mooie basis!";earned.splice(0,3,2,5,10)}
 if(count===5){milestone="Sterke tafelkenner";message="Je kent al minstens vijf maal- én deeltafels juist en vlot. Blijf rustig verder bouwen."}
 if(count===8){milestone="Tafelexpert";message="Je schakelt knap tussen maal en deel. Nog enkele ontdekkingen en jouw expeditie is compleet!"}
 if(count===10){title="TafelExpeditie-diploma";milestone="Volleerde tafelreiziger";message="Alle maal- en deeltafels zijn juist én vlot gekend. Jij hebt de volledige expeditie afgelegd!"}
 return{earned,almost,title,milestone,message}
}
function previewExpeditionData(){const pct=Number($("#classExpeditionPreviewLevel")?.value||0),stage=pct>=100?"Samen aangekomen!":pct>=75?"De feestheuvel is in zicht":pct>=50?"Halverwege de zebrareis":pct>=25?"Samen over de brug":"Onze expeditie vertrekt";return{pct,stage,earned:pct,possible:100}}
function renderCelebrationPreview(){
 const card=$("#celebrationPreviewCard"),map=$("#classExpeditionPreview");if(!card||!map)return;const level=previewCelebrationLevel(),data=previewExpeditionData();
 card.innerHTML=`<h4>Mijn TafelExpeditie-kaart · voorbeeld</h4><p>${esc(level.message)}</p><div class="medal-row">${Array.from({length:10},(_,i)=>{const t=i+1,state=level.earned.includes(t)?"earned":level.almost.includes(t)?"almost":i<Math.max(1,level.earned.length+1)?"working":"",icon=state==="earned"?"🏅":state==="almost"?"★":state==="working"?"●":"○",label=state==="earned"?"behaald":state==="almost"?"bijna":state==="working"?"oefenen":"start";return`<div class="table-medal ${state}"><span>${icon}</span><b>${t}</b><small>${label}</small></div>`}).join("")}</div><p><b>${esc(level.milestone)}</b></p>`;
 map.innerHTML=`<div class="expedition-title">Onze zebraklas · ${esc(data.stage)}</div><div class="expedition-progress"><i style="width:${data.pct}%"></i></div><div class="expedition-caption">Voorbeeld van de gezamenlijke vooruitgang · ${data.pct}%</div>`;const printBtn=$("#printPreviewCertificateBtn"),atStart=$("#celebrationPreviewLevel").value==="start";printBtn.disabled=atStart;printBtn.textContent=atStart?"Nog geen certificaat bij de start":"Bekijk voorbeeld groeicertificaat"
}
function medalState(id,t){const a=tableAchievement(id,t),m=masteryFor(id,t);if(a.needsRefresh)return["refresh","↻","opfrissen"];if(a.earned)return["earned","🏅","behaald"];if(a.almost||m.level==="green")return["almost","★","bijna"];if(a.evidence||m.acc!=null)return["working","●","oefenen"];return["","○","start"]}
function renderStudentMedals(id){const box=$("#studentMedalMap");if(!box)return;const level=celebrationLevel(id);box.innerHTML=`<h4>Mijn TafelExpeditie-kaart</h4><p>${esc(level.message)}</p><div class="medal-row">${Array.from({length:10},(_,i)=>{const t=i+1,[state,icon,label]=medalState(id,t);return`<div class="table-medal ${state}" title="Tafel ${t}: ${label}"><span>${icon}</span><b>${t}</b><small>${label}</small></div>`}).join("")}</div>`}
function classExpeditionData(){const pupils=visibleStudents().filter(s=>!s.isTeacherTest),tables=db.settings.tables?.length?db.settings.tables:Array.from({length:10},(_,i)=>i+1),possible=Math.max(1,pupils.length*tables.length),earned=pupils.reduce((n,s)=>n+tables.filter(t=>tableAchievement(s.id,t).earned).length,0),pct=Math.round(earned/possible*100),stage=pct>=100?"Samen aangekomen!":pct>=75?"De feestheuvel is in zicht":pct>=50?"Halverwege de zebrareis":pct>=25?"Samen over de brug":"Onze expeditie vertrekt";return{pupils,tables,earned,possible,pct,stage}}
function renderCelebrations(id){
 const holder=$("#celebrationReadiness");if(!holder)return;const level=celebrationLevel(id),student=studentById(id),earned=level.earned.length?level.earned.join(", "):"nog geen",almost=level.almost.length?level.almost.join(", "):"—";
 holder.innerHTML=`<article class="celebration-card"><strong>${esc(student?.firstName||student?.name||"")} · ${esc(level.milestone)}</strong><p>Medaille voor tafel: ${earned}</p></article><article class="celebration-card"><strong>Bijna klaar voor een medaille</strong><p>Tafel: ${almost}</p></article>`;
}
function renderClassExpedition(){const map=$("#classExpedition");if(!map)return;const data=classExpeditionData();map.innerHTML=`<div class="expedition-title">${esc(db.activePortalClass||"Onze zebraklas")} · ${esc(data.stage)}</div><div class="expedition-progress"><i style="width:${data.pct}%"></i></div><div class="expedition-caption">Samen ${data.earned} van ${data.possible} tafelmedailles verzameld · ${data.pct}%</div>`}
function classMedalRows(){return visibleStudents().filter(s=>!s.isTeacherTest).map(s=>({student:s,earned:earnedTables(s.id)}))}
function renderClassMedalBoard(){const box=$("#classMedalBoard");if(!box)return;const rows=classMedalRows();box.innerHTML=rows.map(({student,earned})=>{const states=Array.from({length:10},(_,i)=>medalState(student.id,i+1));return`<article class="class-medal-row"><span class="class-medal-name"><i>${esc(student.classNumber||"★")}</i>${esc(student.firstName||student.name)}</span><span class="class-medal-total">${earned.length}/10</span><div class="class-medal-dots">${states.map(([state,icon,label],i)=>`<span class="class-medal-dot ${state}" title="Tafel ${i+1}: ${label}"><b>${i+1}</b><em>${icon}</em></span>`).join("")}</div></article>`}).join("")||'<div class="empty-state">Nog geen kinderen in deze klas.</div>'}
function certificateHtml(student,levelOverride){
 const level=levelOverride||celebrationLevel(student.id),bg=new URL("assets/zebra-groeicertificaat.png",location.href).href,earned=level.earned.length?level.earned.join(" · "):"ik groei verder",schoolyear=student.portalSchoolyear||"2026-2027";
 return`<section class="certificate"><img src="${bg}" alt=""><div class="certificate-copy"><span>ZEBRAKLAS · 2DE LEERJAAR</span><h1>${esc(level.title)}</h1><p class="for">voor</p><h2>${esc(student.firstName||student.name)}</h2><h3>${esc(level.milestone)}</h3><p class="message">${esc(level.message)}</p><div class="tables"><b>Mijn stevig gekende maal- en deeltafels</b><strong>${esc(earned)}</strong></div><p class="growth">Niet vergelijken, wel groeien — stap voor stap, op jouw tempo.</p><footer><span>Schooljaar ${esc(schoolyear)}</span><span>Datum: ${new Date().toLocaleDateString("nl-BE")}</span><span>Handtekening: __________________________</span></footer></div></section>`
}
function certificateDocument(students,levelOverride){return`<!doctype html><html><head><style>@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;font-family:"Trebuchet MS",Arial;color:#18324a}.certificate{position:relative;width:210mm;height:297mm;overflow:hidden;page-break-after:always}.certificate:last-child{page-break-after:auto}.certificate>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.certificate-copy{position:absolute;z-index:2;left:25mm;right:25mm;top:30mm;text-align:center}.certificate-copy>span{font-size:11pt;font-weight:900;letter-spacing:2px;color:#087f78}h1{font-size:28pt;margin:6mm 0 10mm}p.for{margin:0;color:#647383}h2{font-size:27pt;margin:2mm 0 5mm;border-bottom:.6mm solid #e2ad32;padding-bottom:3mm}h3{font-size:19pt;color:#087f78;margin:5mm 0}.message{font-size:14pt;line-height:1.55;max-width:130mm;margin:0 auto 8mm}.tables{display:grid;gap:3mm;padding:6mm;border:1px solid #bfd8d3;border-radius:5mm;background:#ffffffdf}.tables strong{font-size:18pt;color:#b3660b}.growth{font-size:11pt;font-style:italic;margin-top:8mm}footer{position:absolute;top:198mm;left:0;width:112mm;display:grid;grid-template-columns:1fr 1fr;gap:8mm 6mm;text-align:left;font-size:9pt}footer span:first-child{grid-column:1;grid-row:2}footer span:nth-child(2){grid-column:2;grid-row:2}footer span:last-child{grid-column:1/-1;grid-row:1;font-size:10pt;font-weight:700;white-space:nowrap}</style></head><body>${students.map(s=>certificateHtml(s,levelOverride)).join("")}</body></html>`}
function printGrowthCertificate(){const s=studentById($("#teacherStudentSelect").value);if(s)printDocumentHtml(certificateDocument([s]))}
function printReadyCertificates(){const ready=visibleStudents().filter(s=>!s.isTeacherTest&&celebrationLevel(s.id).earned.length);if(!ready.length)return alert("Er zijn nog geen behaalde tafelmedailles om te vieren.");printDocumentHtml(certificateDocument(ready))}
function classExpeditionDocument(d,isPreview=false){const bg=new URL("assets/zebraklas-expeditie-v3.png",location.href).href,name=isPreview?"Onze zebraklas":db.activePortalClass||"Onze zebraklas",progress=isPreview?`voorbeeldstand · ${d.pct}%`:`samen ${d.earned} van ${d.possible} tafelmedailles`;return`<!doctype html><html><head><style>@page{size:A4 landscape;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Arial;color:#18324a}.map{position:relative;width:297mm;height:210mm;overflow:hidden}.map img{width:100%;height:100%;object-fit:cover}.copy{position:absolute;left:20mm;right:20mm;top:10mm;text-align:center}.copy h1{font-size:25pt;margin:0 0 2mm}.copy p{font-size:13pt;margin:0}.bar{height:5mm;border:1mm solid white;background:#ffffffcc;border-radius:99px;margin:4mm 30mm;overflow:hidden}.bar i{display:block;height:100%;width:${d.pct}%;background:#087f78}.footer{position:absolute;left:15mm;right:15mm;bottom:8mm;text-align:center;font-weight:bold;background:#ffffffdc;border-radius:4mm;padding:3mm}</style></head><body><section class="map"><img src="${bg}"><div class="copy"><h1>${esc(name)} · onze TafelExpeditie</h1><p>${esc(d.stage)} — ${esc(progress)}</p><div class="bar"><i></i></div></div><div class="footer">Wij helpen elkaar vooruit. Iedereen groeit op zijn eigen tempo.</div></section></body></html>`}
function printClassExpedition(){printDocumentHtml(classExpeditionDocument(classExpeditionData()))}
function printPreviewCertificate(){printDocumentHtml(certificateDocument([{id:"preview",name:"Voorbeeldnaam",firstName:"Voorbeeldnaam",portalSchoolyear:"2026-2027"}],previewCelebrationLevel()))}
function printPreviewExpedition(){printDocumentHtml(classExpeditionDocument(previewExpeditionData(),true))}
function printClassMedalBoard(){const rows=classMedalRows(),name=db.activePortalClass||"Onze zebraklas",body=rows.map(({student,earned})=>`<tr><td>${esc(student.classNumber||"")}</td><td>${esc(student.firstName||student.name)}</td>${Array.from({length:10},(_,i)=>{const [state,icon]=medalState(student.id,i+1);return`<td class="${state}">${icon}</td>`}).join("")}<td><b>${earned.length}/10</b></td></tr>`).join("");printDocumentHtml(`<!doctype html><html><head><style>@page{size:A4 landscape;margin:12mm}body{font-family:Arial;color:#18324a}h1{margin:0}p{color:#607483}table{width:100%;border-collapse:collapse}th,td{border:1px solid #b9c8c4;padding:7px;text-align:center}th:nth-child(2),td:nth-child(2){text-align:left}.earned{background:#fff1bb;color:#a96d00;font-size:16pt}.refresh{background:#e8f3f1;color:#087f78;font-size:16pt}</style></head><body><h1>${esc(name)} · klasmedaillebord</h1><p>🏅 behaald · ↻ tijdelijk opfrissen. Elke medaille vraagt twee toetsmomenten waarop de maal- én deeltafel juist en vlot gekend zijn.</p><table><thead><tr><th>Nr.</th><th>Naam</th>${Array.from({length:10},(_,i)=>`<th>${i+1}</th>`).join("")}<th>Totaal</th></tr></thead><tbody>${body}</tbody></table></body></html>`)}
function renderTeacherResults(id){
 if(!id){$("#overviewCards").innerHTML="";$("#masteryGrid").innerHTML="";$("#sessionRows").innerHTML="";$("#learningAdvice").innerHTML="";return}
 const ss=db.sessions.filter(s=>s.studentId===id).slice().reverse(),a=ss.flatMap(s=>s.answers),c=a.filter(x=>x.correct).length,p=a.length?Math.round(c/a.length*100):0,avg=a.length?a.reduce((x,y)=>x+y.ms,0)/a.length/1000:0;
 $("#overviewCards").innerHTML=`<div><strong>${ss.length}</strong><span>sessies</span></div><div><strong>${a.length}</strong><span>oefeningen</span></div><div><strong>${p}%</strong><span>juist</span></div><div><strong>${avg.toFixed(1)} s</strong><span>gem. antwoordtijd</span></div>`;
 $("#masteryGrid").innerHTML=Array.from({length:10},(_,i)=>{const t=i+1,m=masteryFor(id,t);return`<div class="mastery-card ${m.level}"><strong>Tafel ${t}</strong><span>${m.label}</span><small>${m.acc==null?"Nog niet geoefend":Math.round(m.acc*100)+"% juist · "+(m.avg/1000).toFixed(1)+" s"}</small></div>`}).join("");
 const levels=Array.from({length:10},(_,i)=>({table:i+1,...masteryFor(id,i+1)})),difficult=levels.filter(x=>x.level==="red").map(x=>x.table),slow=levels.filter(x=>x.level==="orange").map(x=>x.table);$("#learningAdvice").innerHTML=`<b>Volgende beste stap</b><p>${difficult.length?`Remedieer tafel${difficult.length>1?"s":""} ${difficult.join(", ")} met groepjes en bewerkingsfamilies.`:slow.length?`De antwoorden op tafel${slow.length>1?"s":""} ${slow.join(", ")} zijn meestal juist, maar nog niet vlot. Plan korte flitsrondes.`:a.length?"De actieve tafels worden vlot beheerst. Voeg een moeilijkere tafel of gemengde deeltafels toe.":"Start met een korte nulmeting van 10 vragen."}</p>`;
 $("#sessionRows").innerHTML=ss.slice(0,25).map(s=>{const n=s.answers.length,c=s.answers.filter(a=>a.correct).length,av=n?s.answers.reduce((x,a)=>x+a.ms,0)/n/1000:0,slow=s.answers.filter(a=>a.correct&&a.ms>db.settings.fluentSeconds*1000).length;return`<tr><td>${new Date(s.startedAt).toLocaleDateString("nl-BE")}</td><td>${modeLabel(s.mode)}</td><td>${n?Math.round(c/n*100):0}%${slow?` · ${slow} traag`:""}</td><td>${av.toFixed(1)} s</td><td>${n}</td></tr>`}).join("")||'<tr><td colspan="5">Nog geen sessies.</td></tr>'
 renderCelebrations(id)
}

function studentLevel(id){const a=db.sessions.filter(s=>s.studentId===id).flatMap(s=>s.answers);if(a.length<15)return"basis";const acc=a.filter(x=>x.correct).length/a.length,avg=a.reduce((x,y)=>x+y.ms,0)/a.length;if(acc>=.95&&avg<=db.settings.fluentSeconds*1000)return"expert"; if(acc>=.88)return"uitdaging"; if(acc>=.75)return"kern"; return"basis"}
function focusFacts(id,count,tables=null,operation=null){
 const cfg=studentSettings(id),chosen=(tables&&tables.length?tables:cfg.tables).map(Number),facts=allFacts(chosen,operation||(cfg.multiply&&cfg.divide?"both":cfg.multiply?"multiply":"divide"),cfg).filter(f=>chosen.includes(f.table));
 return facts.sort((a,b)=>weakness(b,id)-weakness(a,id)).slice(0,Math.max(count,12))
}
function displayFact(f,blank=true){return`${f.text} ${blank?'<span class="answer-line"></span>':f.answer}`}
function factFamily(f){return f.op==="multiply"?{x:f.a,y:f.b,product:f.answer,table:f.table,n:f.n}:{x:f.b,y:f.answer,product:f.a,table:f.table,n:f.n}}
function uniqueFamilyFacts(facts,count=3){
 const seen=new Set(),preferred=[],squares=[];
 shuffle(facts).forEach(f=>{const x=factFamily(f),pair=[x.x,x.y].sort((a,b)=>a-b),key=`${pair[0]}-${pair[1]}-${x.product}`;if(seen.has(key))return;seen.add(key);(x.x===x.y?squares:preferred).push(f)});
 return [...preferred,...squares].slice(0,count)
}
function missingFact(f){if(f.op==="divide")return{text:`${f.a} : ${f.b} = □`,answer:f.answer};return f.a===f.table?{text:`${f.a} × □ = ${f.answer}`,answer:f.b}:{text:`□ × ${f.b} = ${f.answer}`,answer:f.a}}
function makeHomework(id,levelChoice,play,options={}){
 const personalCfg=studentSettings(id),cfg={...personalCfg,factorPosition:options.factorPosition||personalCfg.factorPosition},tables=(options.tables&&options.tables.length?options.tables:cfg.tables).map(Number),operation=options.operation||(cfg.multiply&&cfg.divide?"both":cfg.multiply?"multiply":"divide"),level=levelChoice&&levelChoice!=="auto"?levelChoice:studentLevel(id),facts=allFacts(tables,operation,cfg).sort((a,b)=>weakness(b,id)-weakness(a,id)).slice(0,30),tasks=[],answers=[];
 const getF=()=>rand(facts);let nr=1;
 if(level==="basis"){
  const learningFacts=shuffle(facts).slice(0,3);tasks.push({type:"learning-chain",title:`${nr++}. Van beeld naar bewerking`,items:learningFacts});answers.push({title:tasks.at(-1).title,items:learningFacts.map(f=>f.op==="multiply"?`${Array.from({length:f.a},()=>f.b).join(" + ")} = ${f.answer}; ${f.a} × ${f.b} = ${f.answer}`:`${[f.a,...Array.from({length:f.answer},()=>`− ${f.b}`)].join(" ")} = 0; ${f.a} : ${f.b} = ${f.answer}`)});
  const visualPool=shuffle(facts.filter(f=>(f.op==="multiply"?f.answer:f.a)<=40)),visualFacts=[];for(const f of (visualPool.length?visualPool:facts)){if(!visualFacts.some(x=>x.n==f.n&&x.op==f.op))visualFacts.push(f);if(visualFacts.length===3)break}while(visualFacts.length<3)visualFacts.push(getF());tasks.push({type:"visual-set",title:`${nr++}. Kijk, groepeer en reken`,items:visualFacts});answers.push({title:tasks.at(-1).title,items:visualFacts.map(f=>displayFact(f,false))});
  const core=facts.slice(0,5); tasks.push({type:"core",title:`${nr++}. Probeer het nu zelf`,items:core}); answers.push({title:tasks.at(-1).title,items:core.map(f=>displayFact(f,false))});
 }
 if(level==="kern"){
  const core=facts.slice(0,6); tasks.push({type:"core",title:`${nr++}. Flits en schrijf`,items:core}); answers.push({title:tasks.at(-1).title,items:core.map(f=>displayFact(f,false))});
  const f=getF(),t=f.table||2; tasks.push({type:"snake",title:`${nr++}. Sprongenslang`,step:t,values:Array.from({length:7},(_,i)=>i===0?0:(i===6?t*6:null))}); answers.push({title:tasks.at(-1).title,items:[Array.from({length:7},(_,i)=>i*t).join(" – ")]});
 }
 if(level==="uitdaging"){
  const fs=shuffle(facts).slice(0,5),missing=fs.map(missingFact);tasks.push({type:"missing",title:`${nr++}. Zoek de verborgen getallen`,items:missing.map(x=>x.text)});answers.push({title:tasks.at(-1).title,items:missing.map(x=>`${x.text.replace("□",x.answer)}`)});
  const indFacts=shuffle(facts).slice(0,4),wrongIndex=Math.floor(Math.random()*indFacts.length),items=indFacts.map((x,i)=>({statement:`${x.text} ${i===wrongIndex?x.answer+rand([-2,-1,1,2]):x.answer}`,good:i!==wrongIndex,correct:x.answer}));tasks.push({type:"detective",title:`${nr++}. Zoek de fout`,items});answers.push({title:tasks.at(-1).title,items:items.map(x=>x.good?`${x.statement} is juist`:`${x.statement} moet ${x.correct} zijn`)});
  const representationItems=shuffle(facts).slice(0,4);tasks.push({type:"representation-match",title:`${nr++}. Verbind wat bij elkaar hoort`,items:representationItems});answers.push({title:tasks.at(-1).title,items:representationItems.map(f=>f.op==="multiply"?`${f.a} × ${f.b} = ${f.answer} ↔ ${Array.from({length:f.a},()=>f.b).join(" + ")}`:`${f.a} : ${f.b} = ${f.answer} ↔ ${[f.a,...Array.from({length:f.answer},()=>`− ${f.b}`)].join(" ")} = 0`)})
 }
 if(level==="expert"){
  const f=getF(),fam=factFamily(f),mul=cfg.factorPosition==="back"?`${fam.n} × ${fam.table}`:`${fam.table} × ${fam.n}`;tasks.push({type:"expert",title:`${nr++}. Tafelbreker`,family:fam,position:cfg.factorPosition});answers.push({title:tasks.at(-1).title,items:[`${mul} = ${fam.product}; ${fam.product} : ${fam.table} = ${fam.n}; ontbrekende factor ${fam.n}; ontbrekend deeltal ${fam.product}`]});
  tasks.push({type:"family",title:`${nr++}. Bouw de bewerkingsfamilie`,items:[f],position:cfg.factorPosition});answers.push({title:tasks.at(-1).title,items:[`${mul} = ${fam.product}; ${fam.product} : ${fam.table} = ${fam.n}`]});
  const tripleItems=uniqueFamilyFacts(facts,4).map(factFamily);tasks.push({type:"family-triples",title:`${nr++}. Drie getallen, vier verbanden`,items:tripleItems,position:cfg.factorPosition});answers.push({title:tasks.at(-1).title,items:tripleItems.map(x=>{const m=cfg.factorPosition==="back"?`${x.n} × ${x.table}`:`${x.table} × ${x.n}`;return`${m} = ${x.product}; ${x.product} : ${x.table} = ${x.n}; ontbrekende factor ${x.n}; ontbrekend deeltal ${x.product}`})})
 }
 if(operation!=="multiply"&&level!=="basis"){
  const inverseItems=uniqueFamilyFacts(facts.filter(f=>f.op==="divide"),3);if(inverseItems.length){tasks.push({type:"inverse-pairs",title:`${nr++}. Delen en vermenigvuldigen horen bij elkaar`,items:inverseItems,position:cfg.factorPosition});answers.push({title:tasks.at(-1).title,items:inverseItems.map(f=>{const m=cfg.factorPosition==="back"?`${f.answer} × ${f.b}`:`${f.b} × ${f.answer}`;return`${f.a} : ${f.b} = ${f.answer} en ${m} = ${f.a}`})})}
 }
 const levelTypes={
 basis:["grid","snake"],
  kern:["calcgrid","match","answerbank","domino"],
  uitdaging:["family","domino","detective","missing"],
  expert:["family","detective"]
 },usedTypes=new Set(tasks.map(t=>t.type)),bank=shuffle(levelTypes[level]||levelTypes.kern).filter(type=>!usedTypes.has(type)),wanted=Math.min(bank.length,Math.max(2,Math.min(5,+play||4)));
 for(const type of bank.slice(0,wanted)){
  const f=getF(),fs=shuffle(facts).slice(0,6),k=nr++;
  if(type==="calcgrid"){const table=f.table,factors=shuffle([1,2,3,4,5,6,7,8,9,10]).slice(0,6),divide=operation==="divide"||(operation==="both"&&f.op==="divide"),position=cfg.factorPosition;tasks.push({type,title:`${k}. Rekenrooster`,table,factors,op:divide?"divide":"multiply",position});answers.push({title:tasks.at(-1).title,items:factors.map((n,i)=>{if(divide)return`${table*n} : ${table} = ${n}`;const back=position==="back"||(position==="both"&&i%2===1),a=back?n:table,b=back?table:n;return`${a} × ${b} = ${a*b}`})})}
  if(type==="grid"){const t=f.table||2;tasks.push({type,title:`${k}. Tafelrooster`,table:t,values:Array.from({length:10},(_,i)=>i%3===0?(i+1)*t:null)});answers.push({title:tasks.at(-1).title,items:[Array.from({length:10},(_,i)=>(i+1)*t).join(", ")]})}
  if(type==="detective"){const items=fs.map((x,j)=>{const good=j%2===0,v=good?x.answer:x.answer+rand([-2,-1,1,2]);return{statement:`${x.text.replace("=","").trim()} = ${v}`,good,correct:x.answer}});tasks.push({type,title:`${k}. Foutendetective`,items});answers.push({title:tasks.at(-1).title,items:items.map(x=>x.good?"juist":`fout → ${x.correct}`)})}
  if(type==="domino"){tasks.push({type,title:`${k}. Dominoketting`,items:fs});answers.push({title:tasks.at(-1).title,items:fs.map(x=>displayFact(x,false))})}
  if(type==="family"){const familyItems=uniqueFamilyFacts(facts,3);tasks.push({type,title:`${k}. Geef de omgekeerde bewerking`,items:familyItems,position:cfg.factorPosition});answers.push({title:tasks.at(-1).title,items:familyItems.map(x=>{if(x.op==="multiply")return`${x.a} × ${x.b} = ${x.answer} → ${x.answer} : ${x.table} = ${x.n}`;const m=cfg.factorPosition==="back"?`${x.answer} × ${x.table}`:`${x.table} × ${x.answer}`;return`${x.a} : ${x.b} = ${x.answer} → ${m} = ${x.a}`})})}
  if(type==="snake"){const t=f.table||2;tasks.push({type,title:`${k}. Sprongenslang`,step:t,values:Array.from({length:7},(_,i)=>i===0?0:(i===6?t*6:null))});answers.push({title:tasks.at(-1).title,items:[Array.from({length:7},(_,i)=>i*t).join(" – ")]})}
  if(type==="match"){const items=fs,answerValues=shuffle(items.map(x=>x.answer));tasks.push({type,title:`${k}. Wat hoort bij elkaar?`,items,answerValues});answers.push({title:tasks.at(-1).title,items:items.map(x=>`${x.text} ${x.answer}`)})}
 if(type==="answerbank"){const items=fs,answerValues=shuffle(items.map(x=>x.answer));tasks.push({type,title:`${k}. Kies uit de antwoordbank`,items,answerValues});answers.push({title:tasks.at(-1).title,items:items.map(x=>`${x.text} ${x.answer}`)})}
 }
 if(level==="kern"){
  const sf=getF(),table=sf.table,n=sf.n||rand([2,3,4,5]),divide=operation==="divide"||(operation==="both"&&sf.op==="divide"),item=divide?{op:"divide",total:table*n,groups:table,each:n}:{op:"multiply",groups:sf.a,each:sf.b,total:sf.answer};tasks.push({type:"story",title:`${nr++}. Eén rekenverhaal`,items:[item],level});answers.push({title:tasks.at(-1).title,items:[divide?`${item.total} : ${item.groups} = ${item.each}`:`${item.groups} × ${item.each} = ${item.total}`]})
 }
 if(level==="uitdaging"){
  const storyFacts=shuffle(facts).slice(0,2),items=storyFacts.map((f,i)=>{const fam=factFamily(f),extra=Math.min(i+2,Math.max(1,fam.product-1));if(f.op==="multiply")return{prompt:`In de zebraklas staan ${fam.x} doosjes met telkens ${fam.y} stiften. ${extra} stiften schrijven niet meer. Hoeveel goede stiften blijven er over?`,steps:[`${fam.x} × ${fam.y} = ${fam.product}`,`${fam.product} − ${extra} = ${fam.product-extra}`],answer:`Er blijven ${fam.product-extra} goede stiften over.`};return{prompt:`De juf verdeelt ${fam.product} kaartjes in groepjes van ${fam.x}. Eén groepje is al uitgedeeld. Hoeveel groepjes liggen er nog?`,steps:[`${fam.product} : ${fam.x} = ${fam.y}`,`${fam.y} − 1 = ${fam.y-1}`],answer:`Er liggen nog ${fam.y-1} groepjes.`}});tasks.push({type:"reasoning-stories",title:`${nr++}. Twee vraagstukken met een extra denkstap`,items,level});answers.push({title:tasks.at(-1).title,items:items.map(x=>`${x.steps.join("; ")} — ${x.answer}`)})
 }
 if(level==="expert"){
  const expertFacts=facts.filter(f=>factFamily(f).x>=2),familyFacts=uniqueFamilyFacts(expertFacts.length?expertFacts:facts,2).map(factFamily);while(familyFacts.length<2)familyFacts.push(factFamily(rand(expertFacts.length?expertFacts:facts)));const a=familyFacts[0],b=familyFacts[1],newEach=b.n+2,newTotal=b.table*newEach,finalMultiply=cfg.factorPosition==="back"?`${newEach} × ${b.table}`:`${b.table} × ${newEach}`,items=[{prompt:`Team Zebra legt ${a.x} rijen van ${a.y} fiches. Team Kompas legt ${a.x-1} rijen van ${a.y} fiches. Hoeveel fiches heeft Team Zebra meer?`,steps:[`${a.x} × ${a.y} = ${a.product}`,`${a.x-1} × ${a.y} = ${(a.x-1)*a.y}`,`${a.product} − ${(a.x-1)*a.y} = ${a.y}`],answer:`Team Zebra heeft ${a.y} fiches meer.`},{prompt:`Er zijn ${b.product} vlaggetjes, eerlijk verdeeld over ${b.table} groepjes. Elk groepje krijgt daarna nog 2 vlaggetjes. Hoeveel vlaggetjes zijn er dan in totaal nodig?`,steps:[`${b.product} : ${b.table} = ${b.n}`,`${b.n} + 2 = ${newEach}`,`${finalMultiply} = ${newTotal}`],answer:`Er zijn ${newTotal} vlaggetjes nodig.`}];tasks.push({type:"reasoning-stories",title:`${nr++}. Expert-doordenkers`,items,level});answers.push({title:tasks.at(-1).title,items:items.map(x=>`${x.steps.join("; ")} — ${x.answer}`)})
 }
 tasks.forEach(t=>t.difficulty=level);return{id,level,tables,operation,factorPosition:cfg.factorPosition,tasks,answers}
}
function taskHtml(t){
 if(t.type==="learning-chain")return `<section class="hw-section learning-chain"><h2>${t.title}</h2><p>Bekijk elk beeld. Schrijf wat je ziet eerst als herhaalde optelling of aftrekking en daarna als maal- of deeloefening.</p><div class="learning-chain-grid">${t.items.map((f,i)=>{if(f.op==="divide"){const dots=Array.from({length:f.a},()=>'<i class="visual-dot"></i>').join(""),subtract=[f.a,...Array.from({length:f.answer},()=>`− ${f.b}`)].join(" ");return `<article><b>${String.fromCharCode(97+i)}.</b><p>Verdeel <strong>${f.a}</strong> in groepen van <strong>${f.b}</strong>.</p><div class="loose-dots compact-dots">${dots}</div><div class="learning-lines"><span>${subtract} = <i></i></span><span>${f.a} : ${f.b} = <i></i></span></div></article>`}const groups=Array.from({length:f.a},()=>`<span class="visual-group">${Array.from({length:f.b},()=>'<i class="visual-dot"></i>').join("")}</span>`).join(""),addition=Array.from({length:f.a},()=>f.b).join(" + ");return `<article><b>${String.fromCharCode(97+i)}.</b><p><strong>${f.a}</strong> groepen van <strong>${f.b}</strong>.</p><div class="visual-groups compact-groups">${groups}</div><div class="learning-lines"><span>${addition} = <i></i></span><span>${f.a} × ${f.b} = <i></i></span></div></article>`}).join("")}</div></section>`;
 if(t.type==="inverse-pairs")return `<section class="hw-section inverse-pairs"><h2>${t.title}</h2><p>Bekijk de groepjes. Schrijf telkens de deling en de omgekeerde vermenigvuldiging.</p><div class="inverse-pair-grid">${t.items.map(f=>{const groups=Array.from({length:f.answer},()=>`<span class="visual-group">${Array.from({length:f.b},()=>'<i class="visual-dot"></i>').join("")}</span>`).join(""),multiplication=t.position==="back"?`<i></i> × ${f.b} = ${f.a}`:`${f.b} × <i></i> = ${f.a}`;return `<article><div class="visual-groups compact-groups">${groups}</div><div class="relation-arrows"><span>delen door ${f.b} →</span><span>← maal ${f.b}</span></div><div class="pair-lines"><span>${f.a} : ${f.b} = <i></i></span><span>${multiplication}</span></div></article>`}).join("")}</div></section>`;
 if(t.type==="representation-match"){const left=t.items.map(f=>f.op==="multiply"?`${f.a} keer ${f.b}`:`${f.a} gedeeld door ${f.b}`),middle=t.items.map(f=>f.op==="multiply"?Array.from({length:f.a},()=>f.b).join(" + "):[f.a,...Array.from({length:f.answer},()=>`− ${f.b}`)].join(" ")+" = 0"),right=t.items.map(f=>f.text.replace("=","").trim());return `<section class="hw-section representation-match"><h2>${t.title}</h2><p>Trek lijnen tussen de drie vakken die bij dezelfde bewerking horen.</p><div class="representation-board"><div>${shuffle(left).map(x=>`<span>${x}</span>`).join("")}</div><div>${shuffle(middle).map(x=>`<span>${x}</span>`).join("")}</div><div>${shuffle(right).map(x=>`<span>${x}</span>`).join("")}</div></div></section>`}
 if(t.type==="family-triples")return `<section class="hw-section family-triples"><h2>${t.title}</h2><p>Gebruik in elk blok alleen de drie getallen. Vul de vier verbanden aan in de gekozen schrijfwijze.</p><div class="family-triple-grid">${t.items.map(x=>{const mult=t.position==="back"?`<i></i> × ${x.table} = <i></i>`:`${x.table} × <i></i> = <i></i>`,missing=t.position==="back"?`<i></i> × ${x.table}`:`${x.table} × <i></i>`;return`<article><div class="triple-numbers"><b>${x.table}</b><b>${x.n}</b><b>${x.product}</b></div><div class="triple-lines"><span>${mult}</span><span>${x.product} : ${x.table} = <i></i></span><span>${missing} = ${x.product}</span><span><i></i> : ${x.table} = ${x.n}</span></div></article>`}).join("")}</div></section>`;
 if(t.type==="core")return `<section class="hw-section"><h2>${t.title}</h2><div class="hw-grid">${t.items.map(f=>`<div class="hw-item">${displayFact(f)}</div>`).join("")}</div></section>`;
 if(t.type==="missing")return `<section class="hw-section"><h2>${t.title}</h2><p>Schrijf het ontbrekende getal in het hokje.</p><div class="puzzle-box missing-grid">${t.items.map(x=>`<div class="hw-item">${esc(x).replace("□",'<span class="inline-answer-box"></span>')}</div>`).join("")}</div></section>`;
 if(t.type==="visual-set")return `<section class="hw-section visual-set"><h2>${t.title}</h2>${t.items.map((f,i)=>{if(f.op==="divide"){const dots=Array.from({length:f.a},()=>'<i class="visual-dot"></i>').join("");return `<div class="visual-exercise"><h3>${String.fromCharCode(97+i)}. Maak zelf groepjes</h3><p>Zet telkens een kring rond <b>${f.b}</b> stippen. Hoeveel groepjes kun je maken?</p><div class="loose-dots">${dots}</div><div class="visual-answer">${f.a} : ${f.b} = <span class="answer-line"></span></div></div>`}const groups=Array.from({length:f.a},()=>`<span class="visual-group">${Array.from({length:f.b},()=>'<i class="visual-dot"></i>').join("")}</span>`).join("");return `<div class="visual-exercise"><h3>${String.fromCharCode(97+i)}. Kijk naar de groepjes</h3><p>Hoeveel stippen zijn er samen?</p><div class="visual-groups">${groups}</div><div class="visual-answer">${f.a} × ${f.b} = <span class="answer-line"></span></div></div>`}).join("")}</section>`;
 if(t.type==="visual"){const f=t.f;if(f.op==="divide"){const groups=Array.from({length:f.answer},()=>`<span class="visual-group">${Array.from({length:f.b},()=>'<i class="visual-dot"></i>').join("")}</span>`).join("");return `<section class="hw-section"><h2>${t.title}</h2><p>Verdeel <b>${f.a}</b> stippen in groepjes van <b>${f.b}</b>. Hoeveel groepjes zijn er?</p><div class="visual-groups">${groups}</div><div class="visual-answer">${f.a} : ${f.b} = <span class="answer-line"></span></div></section>`}const groups=Array.from({length:f.a},()=>`<span class="visual-group">${Array.from({length:f.b},()=>'<i class="visual-dot"></i>').join("")}</span>`).join("");return `<section class="hw-section"><h2>${t.title}</h2><div class="visual-groups">${groups}</div><div class="visual-answer">${f.a} groepen van ${f.b} → ${f.a} × ${f.b} = <span class="answer-line"></span></div></section>`}
 if(t.type==="detective")return `<section class="hw-section"><h2>${t.title}</h2><div class="puzzle-box">${t.items.map(x=>`<div class="jf-row"><span>${x.statement}</span><span><i class="jf-box"></i> juist</span><span><i class="jf-box"></i> fout</span></div><div class="correction-line">Fout? Verbeter: <span></span></div>`).join("")}</div></section>`;
 if(t.type==="snake")return `<section class="hw-section"><h2>${t.title}</h2><p>Tel telkens <b>${t.step}</b> verder.</p><div class="jump-snake">${t.values.map((v,i)=>`${i?'<span class="snake-arrow">→</span>':''}<span class="snake-cell">${v===null?"":v}</span>`).join("")}</div></section>`;
 if(t.type==="calcgrid"){const divide=t.op==="divide";if(divide){const dividends=t.factors.map(n=>n*t.table);return `<section class="hw-section"><h2>${t.title}</h2><p>Deel elk deeltal door <b>${t.table}</b>. Schrijf de uitkomst in het lege vak.</p><div class="division-table"><b>Deeltal</b><b>Deler</b><b>Uitkomst</b>${dividends.map(n=>`<span>${n}</span><span>${t.table}</span><i></i>`).join("")}</div></section>`}return `<section class="hw-section"><h2>${t.title}</h2><p>Lees de factoren van links naar rechts. Schrijf de uitkomst in het lege vak.</p><div class="multiplication-table"><b>Eerste factor</b><b>Tweede factor</b><b>Uitkomst</b>${t.factors.map((n,i)=>{const back=t.position==="back"||(t.position==="both"&&i%2===1);return`<span>${back?n:t.table}</span><span>${back?t.table:n}</span><i></i>`}).join("")}</div></section>`}
 if(t.type==="grid")return `<section class="hw-section"><h2>${t.title}</h2><p>Vul de tafel van <b>${t.table}</b> verder aan.</p><div class="number-grid">${t.values.map(v=>`<div class="cell">${v??""}</div>`).join("")}</div></section>`;
 if(t.type==="story"){const items=t.items||[t];return `<section class="hw-section story-set"><h2>${t.title}</h2>${items.map((x,i)=>{const text=x.op==="divide"?`Er zijn <b>${x.total}</b> potloden. Verdeel ze eerlijk over <b>${x.groups}</b> doosje${x.groups===1?"":"s"}. Hoeveel komen er in elk doosje?`:x.groups===1?`Er is <b>1</b> doosje met <b>${x.each}</b> potloden. Hoeveel zijn er samen?`:`Er zijn <b>${x.groups}</b> doosjes met telkens <b>${x.each}</b> potloden. Hoeveel zijn er samen?`;return `<div class="mini-story"><b>${i+1}.</b><p>${text}</p><span class="story-answer"></span></div>`}).join("")}</section>`}
 if(t.type==="reasoning-stories")return `<section class="hw-section reasoning-stories"><h2>${t.title}</h2><p>Schrijf bij elke denkstap een bewerking. Noteer daarna een volledige antwoordzin.</p>${t.items.map((x,i)=>`<article class="reasoning-story"><b>${i+1}.</b><p>${x.prompt}</p><div class="reasoning-work"><span>Bewerking 1</span><i></i><span>Bewerking 2</span><i></i>${x.steps.length>2?'<span>Bewerking 3</span><i></i>':''}<span>Antwoordzin</span><i class="wide"></i></div></article>`).join("")}</section>`;
 if(t.type==="domino")return `<section class="hw-section"><h2>${t.title}</h2><p>Reken uit en vul de lege helft aan.</p><div class="domino-row">${t.items.map(x=>`<div class="domino"><span>${esc(x.text.replace("=","").trim())}</span><span></span></div>`).join("")}</div></section>`;
 if(t.type==="match")return `<section class="hw-section"><h2>${t.title}</h2><p>Trek een lijn van elke oefening naar de juiste uitkomst.</p><div class="match-board"><div>${t.items.map(x=>`<span>${esc(x.text.replace("=","").trim())}</span>`).join("")}</div><div>${t.answerValues.map(x=>`<span>${x}</span>`).join("")}</div></div></section>`;
 if(t.type==="answerbank")return `<section class="hw-section"><h2>${t.title}</h2><p>Elk antwoord uit de antwoordbank gebruik je één keer.</p><div class="answer-bank">${t.answerValues.map(x=>`<b>${x}</b>`).join("")}</div><div class="hw-grid">${t.items.map(x=>`<div class="hw-item">${displayFact(x)}</div>`).join("")}</div></section>`;
 if(t.type==="family")return `<section class="hw-section"><h2>${t.title}</h2><p>Schrijf bij elke oefening de omgekeerde bewerking en los die op.</p><div class="inverse-list">${t.items.map((f,i)=>{const source=`${f.text} ${f.answer}`,inverse=f.op==="multiply"?`<span class="inline-answer-box"></span> : ${f.table} = ${f.n}`:t.position==="back"?`${f.answer} × ${f.table} = <span class="inline-answer-box"></span>`:`${f.table} × ${f.answer} = <span class="inline-answer-box"></span>`;return `<div class="inverse-card"><b>${i+1}.</b><div class="inverse-source">${source}</div><span class="inverse-arrow">→</span><div class="inverse-answer"><small>Omgekeerde bewerking</small>${inverse}</div></div>`}).join("")}</div></section>`;
 if(t.type==="expert"){const f=t.family,b='<i class="inline-answer-box"></i>',mult=t.position==="back"?`${f.n} × ${f.table}`:`${f.table} × ${f.n}`,missing=t.position==="back"?`${b} × ${f.table}`:`${f.table} × ${b}`;return `<section class="hw-section"><h2>${t.title}</h2><div class="challenge-box"><p>Gebruik de tafel van <b>${f.table}</b> en behoud overal dezelfde schrijfwijze.</p><div class="expert-grid"><span>${mult} = ${b}</span><span>${f.product} : ${f.table} = ${b}</span><span>${missing} = ${f.product}</span><span>${b} : ${f.table} = ${f.n}</span></div></div></section>`}
 return `<section class="hw-section"><h2>${t.title}</h2><div class="puzzle-box">${(t.items||[]).map(x=>`<div class="hw-item">${x}</div>`).join("")}</div></section>`
}
function renderHomework(hw){
 lastHomework=hw;const s=studentById(hw.id);$("#hwName").textContent=s.name;$("#answersFor").textContent=`Voor ${s.name}`;
 const parts=hw.tasks.map(t=>taskHtml(t).replace('<section class="',`<section data-difficulty="${t.difficulty}" class="`));
 const levelName=hw.level.charAt(0).toUpperCase()+hw.level.slice(1),positionLabel=hw.factorPosition==="back"?"tafelgetal achteraan":hw.factorPosition==="front"?"tafelgetal vooraan":"beide richtingen";$("#homeworkContent").innerHTML=`<div class="hw-level-chip">${levelName} · tafel${hw.tables.length>1?"s":""} ${hw.tables.join(", ")} · ${hw.operation==="multiply"?"maal":hw.operation==="divide"?"delen":"maal en delen"} · ${positionLabel}</div><div class="difficulty-legend single-level"><span><i class="${hw.level}"></i> alle oefeningen op niveau ${hw.level}</span></div>`+parts.join("");
 $("#homeworkContent").querySelectorAll(".hw-section>h2").forEach(h=>{const m=h.textContent.match(/^(\d+)\.\s*(.*)$/),level=h.parentElement.dataset.difficulty;if(!m||!level)return;h.innerHTML=`<span class="difficulty-marker ${level}" aria-label="${level}">${m[1]}</span><span>${esc(m[2])}</span>`});
 $("#answersContent").innerHTML=hw.answers.map(a=>`<section class="hw-section"><h2>${a.title}</h2>${a.items.map(x=>`<div>${x}</div>`).join("")}</section>`).join("");$("#answersSheet").classList.add("hidden");showView("homework")
}

function flashFact(table,n,type,position){
 const pos=position==="class"?db.settings.factorPosition:position,dir=pos==="both"?(n%2?"front":"back"):pos;
 if(type==="divide"){const product=table*n;return{front:`${product} : ${table} =`,answer:n,check:`Controle: ${table} × ${n} = ${product}`}}
 if(type==="family"&&n%2===0){const product=table*n;return{front:`${product} : ${table} =`,answer:n,check:`Hoort bij: ${table} × ${n} = ${product}`}}
 const a=dir==="back"?n:table,b=dir==="back"?table:n;return{front:`${a} × ${b} =`,answer:a*b,check:`Hoort bij: ${a*b} : ${table} = ${n}`}
}
function reorderFlashBacks(items,duplex){
 const cols=3,rows=Math.ceil(items.length/cols),grid=Array.from({length:rows},(_,r)=>items.slice(r*cols,r*cols+cols));
 if(duplex==="long")return grid.flatMap(row=>[...row].reverse());
 return [...grid].reverse().flatMap(row=>[...row].reverse())
}
function flashCardHtml(card,back,cut){
 if(!card)return'<div class="flash-card flash-empty"></div>';
 return `<div class="flash-card ${cut?"":"no-cut"}"><div>${back?`<div class="flash-answer">${card.answer}</div><span class="flash-small">${esc(card.check)}</span>`:`<div class="flash-main">${esc(card.front)}</div><span class="flash-small">Zeg het antwoord vlot.</span>`}</div></div>`
}
function generateFlashcards(){
 const table=+$("#flashTableSelect").value,type=$("#flashTypeSelect").value,position=$("#flashPositionSelect").value,count=+$("#flashCountSelect").value,duplex=$("#flashDuplexSelect").value,cut=$("#flashCutSelect").value==="yes";
 const cards=Array.from({length:count},(_,i)=>flashFact(table,i<10?i+1:[5,10][i-10],type,position)),slots=[...cards,...Array(12-count).fill(null)],backs=reorderFlashBacks(slots,duplex);
 $("#flashFrontGrid").innerHTML=slots.map(c=>flashCardHtml(c,false,cut)).join("");$("#flashBackGrid").innerHTML=backs.map(c=>flashCardHtml(c,true,cut)).join("");
 $("#flashFrontPage").dataset.table=String(table);$("#flashBackPage").dataset.duplex=duplex;showView("flashcards")
}
function printFlashcards(){document.body.classList.add("flash-printing");const cleanup=()=>document.body.classList.remove("flash-printing");window.addEventListener("afterprint",cleanup,{once:true});window.print();setTimeout(cleanup,1500)}

function exportBackup(){const b=new Blob([JSON.stringify(db,null,2)],{type:"application/json"}),u=URL.createObjectURL(b),a=document.createElement("a");a.href=u;a.download=`tafeltrainer-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(u)}
function importBackup(file){const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);db={...defaults(),...x,settings:{...defaults().settings,...x.settings}};saveDb();refreshAllTeacher();alert("Backup geïmporteerd.")}catch(e){alert("Ongeldige backup.")}};r.readAsText(file)}

buildChecks();setChecks($("#homeworkTableChecks"),db.settings.tables);refreshStudentSelects();

$("#enterTeacherBtn").addEventListener("click",enterTeacher);$("#teacherTopBtn").addEventListener("click",enterTeacher);
$("#enterStudentLoginBtn").addEventListener("click",()=>{refreshStudentSelects();resetStudentLogin();showView("studentLogin")});$("#studentLoginBackBtn").addEventListener("click",()=>{if(publicStudentMode){resetStudentLogin();showView("studentLogin")}else showView("landing")});$("#goLandingBtn").addEventListener("click",()=>showView("landing"));
$("#chooseOtherStudentBtn").addEventListener("click",resetStudentLogin);$("#loginKeypad").innerHTML=[1,2,3,4,5,6,7,8,9,"wis",0,"⌫"].map(x=>`<button type="button" data-key="${x}">${x}</button>`).join("");$("#loginKeypad").addEventListener("click",e=>{const key=e.target.closest("[data-key]")?.dataset.key;if(key===undefined)return;const input=$("#loginPin");if(key==="wis")input.value="";else if(key==="⌫")input.value=input.value.slice(0,-1);else if(input.value.length<4)input.value+=key;$("#loginError").textContent=""});
$("#studentLoginBtn").addEventListener("click",loginStudent);$("#studentLogoutBtn").addEventListener("click",()=>{if(isPreview){const tab=returnContext==="discoverHome"?"discover":"assignments";isPreview=false;returnContext="teacher";showView("teacher");teacherTab(tab)}else{currentStudentId=null;resetStudentLogin();showView(publicStudentMode?"studentLogin":"landing")}});
$$(".teacher-tab").forEach(b=>b.addEventListener("click",()=>teacherTab(b.dataset.teacherTab)));
$("#saveSettingsBtn").addEventListener("click",saveSettingsFromForm);
$("#createAssignmentBtn").addEventListener("click",createAssignment);
function updateAssignmentForm(){const modes=[...$("#assignmentModeChecks").querySelectorAll("input:checked")].map(x=>x.value);$("#assignmentTempo").closest("label").classList.toggle("hidden",!modes.includes("sprint"));$("#assignmentPerQuestion").closest("label").classList.toggle("hidden",!modes.includes("flash"));$("#assignmentCount").closest("label").classList.toggle("hidden",modes.length>0&&modes.every(m=>m==="sprint"))}
$("#assignmentModeChecks").addEventListener("change",updateAssignmentForm);updateAssignmentForm();
function updateAssignmentTarget(){$("#assignmentStudentsField").classList.toggle("hidden",$("#assignmentTarget").value!=="selection")}
$("#assignmentTarget").addEventListener("change",updateAssignmentTarget);updateAssignmentTarget();
$("#assignmentSelectAll").addEventListener("click",()=>$("#assignmentStudentChecks").querySelectorAll("input").forEach(x=>x.checked=true));
$("#assignmentSelectNone").addEventListener("click",()=>$("#assignmentStudentChecks").querySelectorAll("input").forEach(x=>x.checked=false));
$("#printPinsBtn").addEventListener("click",printPinCards);
$("#printCodeListBtn").addEventListener("click",printCodeList);
$("#printClassQrBtn").addEventListener("click",printClassQr);
$("#printLoginLabelsBtn").addEventListener("click",printLoginLabels);
window.addEventListener("class-qr-ready",()=>{$("#classQrStatus").textContent="De klas-QR is klaar. Je kunt de klas-QR en de persoonlijke agendastickers nu afdrukken."});
$("#addTeacherTestBtn").addEventListener("click",addTeacherTestProfile);
$("#addStudentTeacherBtn").addEventListener("click",()=>{$("#studentNameInput").value="";$("#studentPinInput").value="";$("#studentDialog").showModal()});
$("#studentForm").addEventListener("submit",e=>{e.preventDefault();createStudent($("#studentNameInput").value,$("#studentPinInput").value);$("#studentDialog").close()});
$("#studentSettingsForm").addEventListener("submit",e=>{e.preventDefault();const s=studentById(editStudentId);if(!s)return;s.useCustom=$("#studentUseCustom").checked;const nums=$("#studentTablesInput").value.split(/[,; ]+/).map(Number).filter(n=>n>=1&&n<=10);let multiply=$("#studentMultiply").checked,divide=$("#studentDivide").checked;if(!multiply&&!divide)multiply=true;s.custom={factorPosition:$("#studentFactorPosition").value,tables:nums.length?nums:db.settings.tables,multiply,divide};saveDb();renderClass();window.requestPortalPublish?.();$("#studentSettingsDialog").close()});
$("#classImportInput").addEventListener("change",e=>{if(e.target.files[0])importClassFile(e.target.files[0]);e.target.value=""});$("#downloadClassTemplateBtn").addEventListener("click",downloadClassTemplate);
$("#previewStudentSelect").addEventListener("change",renderPreviewCenter);
$("#createRaceBtn").addEventListener("click",createRace);$("#openRaceBoardBtn").addEventListener("click",openRaceBoard);$("#previewZebraRaceBtn").addEventListener("click",()=>previewRaceBoard("race"));$("#previewTeamRaceBtn").addEventListener("click",()=>previewRaceBoard("team"));$("#startRaceBtn").addEventListener("click",()=>window.setLiveRaceStatus?.("running"));$("#stopRaceBtn").addEventListener("click",()=>window.setLiveRaceStatus?.("finished"));$("#raceBoardBackBtn").addEventListener("click",()=>{clearInterval(raceBoardTick);showView("teacher");teacherTab("race")});$("#leaveRaceBtn").addEventListener("click",()=>{renderStudentHome();showView("studentHome")});
$("#celebrationPreviewLevel").addEventListener("change",renderCelebrationPreview);$("#classExpeditionPreviewLevel").addEventListener("change",renderCelebrationPreview);$("#printPreviewCertificateBtn").addEventListener("click",printPreviewCertificate);$("#printPreviewExpeditionBtn").addEventListener("click",printPreviewExpedition);
$("#startPreviewBtn").addEventListener("click",()=>{const id=$("#previewStudentSelect").value;if(!id)return;currentStudentId=id;isPreview=true;returnContext="discoverHome";renderStudentHome();$("#studentWelcomeName").textContent+= " · TESTMODUS";showView("studentHome")});
$("#setupBackBtn").addEventListener("click",()=>{currentAssignmentId=null;if(returnContext==="teacher"||returnContext==="discover"){showView("teacher");teacherTab(returnContext==="discover"?"discover":"assignments")}else showView("studentHome")});
$("#startBtn").addEventListener("click",startExercise);$("#answerForm").addEventListener("submit",e=>{e.preventDefault();const v=$("#answerInput").value.trim();if(v!==""&&Number.isFinite(+v))handleAnswer(+v)});
$("#stopBtn").addEventListener("click",()=>{if(confirm("Oefening stoppen?"))finishSession(false)});
$("#resultBackBtn").addEventListener("click",()=>{if(isPreview&&(returnContext==="teacher"||returnContext==="discover")){showView("teacher");teacherTab(returnContext==="discover"?"discover":"assignments");isPreview=false}else if(isPreview){renderStudentHome();$("#studentWelcomeName").textContent+= " · TESTMODUS";showView("studentHome")}else{renderStudentHome();showView("studentHome")}});
$("#teacherStudentSelect").addEventListener("change",e=>renderTeacherResults(e.target.value));
$("#printGrowthCertificateBtn").addEventListener("click",printGrowthCertificate);$("#printReadyCertificatesBtn").addEventListener("click",printReadyCertificates);$("#printClassExpeditionBtn").addEventListener("click",printClassExpedition);$("#printClassMedalBoardBtn").addEventListener("click",printClassMedalBoard);
$("#exportBtn").addEventListener("click",exportBackup);$("#importInput").addEventListener("change",e=>{if(e.target.files[0])importBackup(e.target.files[0]);e.target.value=""});
$("#generateHomeworkBtn").addEventListener("click",()=>{const id=$("#homeworkStudentSelect").value;if(!id)return;currentStudentId=id;const manual=$("#homeworkSource").value==="manual",tables=manual?selected($("#homeworkTableChecks")):null;if(manual&&!tables.length){alert("Kies minstens één tafel voor de huistaak.");return}const factorPosition=$("#homeworkFactorPosition").value==="student"?studentSettings(id).factorPosition:db.settings.factorPosition;lastHomeworkConfig={level:$("#homeworkLevel").value,play:+$("#homeworkPlay").value,options:{tables,operation:manual?$("#homeworkOperation").value:null,factorPosition}};renderHomework(makeHomework(id,lastHomeworkConfig.level,lastHomeworkConfig.play,lastHomeworkConfig.options))});
function updateHomeworkSource(){const manual=$("#homeworkSource").value==="manual";$("#homeworkTablesField").classList.toggle("disabled-field",!manual);$("#homeworkTableChecks").querySelectorAll("input").forEach(x=>x.disabled=!manual);$("#homeworkOperation").disabled=!manual}
$("#homeworkSource").addEventListener("change",updateHomeworkSource);updateHomeworkSource();
function positionText(position){return position==="back"?"tafelgetal achteraan":position==="front"?"tafelgetal vooraan":"beide richtingen"}
function updateHomeworkPositionHint(){const id=$("#homeworkStudentSelect").value,position=$("#homeworkFactorPosition").value==="student"?studentSettings(id).factorPosition:db.settings.factorPosition;$("#homeworkPositionHint").textContent=`Deze huistaak gebruikt: ${positionText(position)}.`}
$("#homeworkFactorPosition").addEventListener("change",updateHomeworkPositionHint);$("#homeworkStudentSelect").addEventListener("change",updateHomeworkPositionHint);updateHomeworkPositionHint();
$("#homeworkBackBtn").addEventListener("click",()=>{showView("teacher");teacherTab("homework")});$("#regenerateHomeworkBtn").addEventListener("click",()=>{if(lastHomeworkConfig)renderHomework(makeHomework(currentStudentId,lastHomeworkConfig.level,lastHomeworkConfig.play,lastHomeworkConfig.options))});$("#printHomeworkBtn").addEventListener("click",()=>window.print());$("#toggleAnswersBtn").addEventListener("click",()=>{$("#answersSheet").classList.toggle("hidden")});
$("#generateFlashcardsBtn").addEventListener("click",generateFlashcards);
$("#flashBackBtn").addEventListener("click",()=>{showView("teacher");teacherTab("flashcards")});
$("#flashPrintBtn").addEventListener("click",printFlashcards);

$("#celebrationPreviewLevel").value="3";showView("landing");
