
const STORAGE_KEY="tafeltrainer_v4";
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const views={landing:$("#landingView"),studentLogin:$("#studentLoginView"),studentHome:$("#studentHomeView"),teacher:$("#teacherDashboardView"),setup:$("#setupView"),exercise:$("#exerciseView"),result:$("#resultView"),homework:$("#homeworkView"),flashcards:$("#flashcardsView")};
const teacherTabs={settings:$("#teacherSettingsTab"),class:$("#teacherClassTab"),assignments:$("#teacherAssignmentsTab"),results:$("#teacherResultsTab"),homework:$("#teacherHomeworkTab"),flashcards:$("#teacherFlashcardsTab")};
let db=loadDb(),currentStudentId=null,currentMode=null,currentSession=null,timerId=null,questionTimerId=null,questionTickId=null,isPreview=false,returnContext="student",lastHomework=null,lastHomeworkConfig=null,editStudentId=null,currentAssignmentId=null;
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
function showView(name){Object.values(views).forEach(v=>v.classList.remove("active"));views[name].classList.add("active");$("#goLandingBtn").classList.toggle("hidden",name==="landing")}
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
 $("#tableChecks").innerHTML=html;$("#settingsTableChecks").innerHTML=html;$("#assignmentTableChecks").innerHTML=html;$("#homeworkTableChecks").innerHTML=html
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
 if(name==="results")renderTeacherResults($("#teacherStudentSelect").value||visibleStudents()[0]?.id);
 if(name==="class")renderClass()
 if(name==="assignments"){renderAssignments();renderPreviewCenter()}
}
function enterTeacher(){refreshAllTeacher();loadSettingsForm();showView("teacher");teacherTab("settings")}
function refreshAllTeacher(){refreshStudentSelects();renderClass();loadSettingsForm()}

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
 if(publicStudentMode){const cloud=s&&await window.loginPublicStudent?.(s.cloudLoginId,pin);if(!cloud){$("#loginError").textContent="Naam of toegewezen code klopt niet. Vraag je leerkracht om hulp.";return}db.settings={...db.settings,...(cloud.settings||{})};s.useCustom=false;s.custom={};publicCompletedAssignmentIds=new Set(cloud.completedAssignmentIds||[]);db.assignments=(cloud.assignments||[]).filter(a=>!publicCompletedAssignmentIds.has(a.id)).map(a=>({...a,target:"all",targets:[]}));db.sessions=cloud.sessions||[];db.factStats=cloud.factStats||{};s.pin=pin}
 else if(!s||pin!==s.pin){$("#loginError").textContent="Naam of toegewezen code klopt niet. Vraag je leerkracht om hulp.";return}
 currentStudentId=id;isPreview=false;returnContext="student";$("#loginPin").value="";$("#loginError").textContent="";renderStudentHome();showView("studentHome")
}
function qrData(url,size=6){if(!window.qrcode)throw new Error("QR-module niet geladen");const qr=window.qrcode(0,"M");qr.addData(url);qr.make();return qr.createDataURL(size,3)}
function printDocumentHtml(html){const frame=document.createElement("iframe");frame.setAttribute("aria-hidden","true");frame.style.cssText="position:fixed;width:1px;height:1px;right:0;bottom:0;border:0;opacity:0";document.body.appendChild(frame);const d=frame.contentDocument;d.open();d.write(html);d.close();const cleanup=()=>setTimeout(()=>frame.remove(),300);frame.contentWindow.addEventListener("afterprint",cleanup,{once:true});setTimeout(()=>{frame.contentWindow.focus();frame.contentWindow.print();setTimeout(cleanup,30000)},500)}
function printClassQr(){try{const url=window.currentClassQrUrl;if(!url)return alert("De klas-QR wordt nog gepubliceerd. Controleer de aanvullende Firebase-regels en probeer opnieuw.");const img=qrData(url,9),name=db.activePortalClass||"Klas";printDocumentHtml(`<!doctype html><html><head><style>@page{size:A4;margin:18mm}body{font-family:Arial;text-align:center;color:#18324a}h1{font-size:28pt}img{width:115mm;height:115mm;image-rendering:pixelated}p{font-size:16pt}small{display:block;margin-top:10mm}</style></head><body><h1>TafelExpeditie · ${esc(name)}</h1><p>Scan · kies je roepnaam · geef je code in</p><img src="${img}"><small>Schooljaar 2026-2027</small></body></html>`)}catch(err){console.error(err);alert("De QR kon niet worden gemaakt. Vernieuw de pagina en probeer opnieuw.")}}
function printLoginLabels(){try{const url=window.currentClassQrUrl;if(!url)return alert("Maak eerst de klas-QR actief.");const qr=qrData(url,4),students=visibleStudents(),pages=[];for(let i=0;i<students.length||i===0;i+=24){const batch=students.slice(i,i+24),labels=[...batch,...Array(24-batch.length).fill(null)].map(s=>s?`<article><div><b>TafelExpeditie</b><strong>${esc(s.firstName||s.name)}</strong><span>${esc(db.activePortalClass||"")} · code <em>${esc(s.pin)}</em></span></div><img src="${qr}"></article>`:`<article></article>`).join("");pages.push(`<section class="sheet">${labels}</section>`)}printDocumentHtml(`<!doctype html><html><head><style>@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Arial;color:#18324a}.sheet{width:210mm;height:296mm;display:grid;grid-template-columns:repeat(3,70mm);grid-template-rows:repeat(8,37mm);break-after:page;page-break-after:always}.sheet:last-child{break-after:auto;page-break-after:auto}article{width:70mm;height:37mm;padding:3mm 3.5mm;display:grid;grid-template-columns:1fr 25mm;align-items:center;overflow:hidden}article div{display:grid;gap:1.2mm}article>b{font-size:8pt;color:#078d82}strong{font-size:13pt}span{font-size:8.5pt}em{font-style:normal;font-weight:900;font-size:12pt;letter-spacing:1px}img{width:24mm;height:24mm;image-rendering:pixelated}</style></head><body>${pages.join("")}</body></html>`)}catch(err){console.error(err);alert("De etiketten konden niet worden gemaakt. Vernieuw de pagina en probeer opnieuw.")}}
function renderStudentHome(){
 const s=studentById(currentStudentId),cfg=studentSettings(currentStudentId);if(!s)return;
 $("#studentLogoutBtn").textContent=isPreview?"Terug naar testcentrum":"Afmelden";
 $("#studentWelcomeName").textContent=`Hallo, ${s.name}!`;
 $("#studentAssignmentText").textContent=`Jouw tafels: ${cfg.tables.join(", ")} · ${cfg.factorPosition==="front"?"tafelgetal vooraan":cfg.factorPosition==="back"?"tafelgetal achteraan":"beide richtingen"}`;
 renderStudentAssignments();
 const defs=[
  ["learn","🧩","Aanleren & oefenen","Kijken, begrijpen en inoefenen"],["mix","🎲","Gemengd oefenen","Afwisselende spelvragen door elkaar"],
  ["smart","🎯","Slim oefenen","Extra wat nog moeilijk of traag is"],["remediate","🛠️","Remediëren","Kleine stappen met gerichte hulp"],
  ["knowledge","✓","Kennistoets","Juist rekenen zonder tijdsdruk"],["flash","⚡","Flitstoets","Automatisatie: tijd per oefening"],["sprint","⏱️","Tempomissie","Zoveel mogelijk juist binnen de tijd"]
 ];
 $("#studentModes").innerHTML=defs.filter(x=>["knowledge","flash","sprint"].includes(x[0])?cfg.modes.tempo:cfg.modes[x[0]]).map(([m,ic,t,sub])=>`<button class="mode-card student-mode" data-mode="${m}"><span class="mode-icon">${ic}</span><strong>${t}</strong><span>${sub}</span></button>`).join("")||'<div class="panel">Er staan nog geen oefeningen voor jou klaar.</div>';
 $$(".student-mode").forEach(b=>b.addEventListener("click",()=>{currentAssignmentId=null;openSetup(b.dataset.mode)}));
 const sessions=db.sessions.filter(x=>x.studentId===currentStudentId),ans=sessions.flatMap(s=>s.answers),correct=ans.filter(a=>a.correct).length,p=ans.length?Math.round(correct/ans.length*100):0;
 $("#studentProgressSummary").innerHTML=`<div><strong>${sessions.length}</strong><span>oefenbeurten</span></div><div><strong>${ans.length}</strong><span>oefeningen</span></div><div><strong>${p}%</strong><span>juist</span></div>`
}

const previewModes=[
 {group:"practice",mode:"learn",icon:"🧩",title:"Aanleren & gericht oefenen",text:"Visueel opbouwen en steun afbouwen"},
 {group:"practice",mode:"mix",icon:"🎲",title:"Gemengd oefenen",text:"Afwisselende vraagvormen en tafels"},
 {group:"practice",mode:"smart",icon:"🎯",title:"Slim oefenen",text:"Moeilijke en trage oefeningen vaker"},
 {group:"practice",mode:"remediate",icon:"🛠️",title:"Remediëren",text:"Kleine stappen met visuele hulp"},
 {group:"test",mode:"knowledge",icon:"✓",title:"Kennistoets",text:"Juistheid zonder tijdsdruk"},
 {group:"test",mode:"flash",icon:"⚡",title:"Flitstoets",text:"Instelbare tijd per oefening"},
 {group:"test",mode:"sprint",icon:"⏱️",title:"Tempomissie",text:"Zoveel mogelijk binnen de totale tijd"}
];
function previewModeHtml(x){return `<button class="preview-mode-card" data-preview-mode="${x.mode}"><span class="mode-icon">${x.icon}</span><span><strong>${x.title}</strong><small>${x.text}</small></span><b>Test →</b></button>`}
function renderPreviewCenter(){
 const empty='<div class="empty-state">Voeg eerst een leerling toe om met klasinstellingen te testen.</div>',hasStudent=!!$("#previewStudentSelect").value;
 $("#previewPracticeModes").innerHTML=hasStudent?previewModes.filter(x=>x.group==="practice").map(previewModeHtml).join(""):empty;
 $("#previewTestModes").innerHTML=hasStudent?previewModes.filter(x=>x.group==="test").map(previewModeHtml).join(""):empty;
 $$('[data-preview-mode]').forEach(b=>b.addEventListener("click",()=>startDirectPreview(b.dataset.previewMode)))
}
function startDirectPreview(mode){const id=$("#previewStudentSelect").value;if(!id)return;currentStudentId=id;currentAssignmentId=null;isPreview=true;returnContext="teacher";openSetup(mode)}

function modeLabel(mode){return({learn:"Aanleren & oefenen",mix:"Gemengde training",smart:"Slimme training",remediate:"Remediëring",knowledge:"Kennistoets",flash:"Flitstoets",sprint:"Tempomissie",tempo:"Tempotoets"})[mode]||mode}
function isAssessmentMode(mode){return ["knowledge","flash","sprint","test","tempo"].includes(mode)}
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
 const student=studentById(currentStudentId),list=(db.assignments||[]).filter(a=>(!a.className||!student?.portalClass||a.className===student.portalClass)&&(a.target==="all"||a.target===currentStudentId||(Array.isArray(a.targets)&&a.targets.includes(currentStudentId)))&&!assignmentDone(a,currentStudentId));
 $("#studentAssignments").innerHTML=list.length?list.map(a=>{const measure=a.mode==="sprint"?`${Math.round((a.tempo||120)/60)} min. zoveel mogelijk`:`${a.count} vragen`;return `<button class="assignment-card student-assignment ${a.kind==="test"?"test-card":""}" data-id="${a.id}"><span class="mission-check">${a.kind==="test"?"✓":a.mode==="tempo"?"⏱":"★"}</span><span><small>${a.kind==="test"?"TOETS · ":""}${esc(modeLabel(a.mode))}</small><strong>${esc(a.title)}</strong><em>${a.tables.map(t=>`tafel ${t}`).join(" · ")} · ${measure}${a.due?` · tegen ${new Date(a.due+"T12:00:00").toLocaleDateString("nl-BE")}`:""}</em></span><b>Start →</b></button>`}).join(""):'<div class="empty-state success-state">Alles klaar! Je hebt geen openstaande missies.</div>';
 $$(".student-assignment").forEach(b=>b.addEventListener("click",()=>openAssignment(b.dataset.id)))
}
function openAssignment(id){const a=(db.assignments||[]).find(x=>x.id===id);if(!a)return;currentAssignmentId=id;currentMode=["knowledge","flash","sprint"].includes(a.mode)?a.mode:a.kind==="test"?(a.mode==="tempo"?"sprint":"knowledge"):a.mode;openSetup(currentMode);setChecks($("#tableChecks"),a.tables);$("#questionCount").value=String(a.count);$("#operationSelect").value=a.operation||"both";$("#tempoSeconds").value=String(a.tempo||120);$("#perQuestionSeconds").value=String(a.perQuestion||3);$("#tableChecks").classList.add("locked");$("#tableChecks").querySelectorAll("input").forEach(x=>x.disabled=true);$("#operationSelect").disabled=true;$("#questionCount").disabled=true;$("#setupTitle").textContent=a.kind==="test"?`Toets · ${a.title}`:a.title}

function factKey(op,a,b){return`${op}:${a}:${b}`}
function makeMultiplyFact(table,n,cfg,direction=null){
 let dir=direction||cfg.factorPosition;if(dir==="both")dir=Math.random()<.5?"front":"back";
 let a=dir==="front"?table:n,b=dir==="front"?n:table;
 return{op:"multiply",table,n,a,b,answer:a*b,key:factKey("multiply",a,b),text:`${a} × ${b} =`,direction:dir}
}
function makeDivideFact(table,n,cfg){
 const product=table*n;
 const variant=Math.random()<.5?0:1;
 if(variant===0)return{op:"divide",table,n,a:product,b:table,answer:n,key:factKey("divide",product,table),text:`${product} : ${table} =`};
 return{op:"divide",table,n,a:product,b:n,answer:table,key:factKey("divide",product,n),text:`${product} : ${n} =`}
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
function addVariant(q,mode,index,cfg){
 if(isAssessmentMode(mode)){q.variant="direct";q.userAnswer=q.answer;return q}
 const cycles={learn:["visual","choice","missing","family","direct"],mix:["choice","truefalse","missing","family","direct"],smart:["direct","choice","missing","direct","truefalse"],remediate:["visual","visual","missing","family","choice"]};
 const cycle=cycles[mode]||cycles.mix;
 q.variant=cycle[index%cycle.length];
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
 if(mode==="remediate"){facts=facts.sort((a,b)=>weakness(b,currentStudentId)-weakness(a,currentStudentId)).slice(0,14)}
 else if(mode==="smart")facts=weightedPool(facts,currentStudentId);
 for(let i=0;i<count;i++)base.push({...rand(facts)});
 return base.map((q,i)=>addVariant(q,mode,i,cfg))
}
function openSetup(mode){
 currentMode=mode;const cfg=studentSettings(currentStudentId);$("#setupTitle").textContent=({learn:"Aanleren & gericht oefenen",mix:"Gemengd oefenen",smart:"Slim oefenen",remediate:"Remediëren",knowledge:"Kennistoets zonder tijd",flash:"Flitstoets per oefening",sprint:"Tempomissie",tempo:"Tempomissie",test:"Kennistoets"})[mode];
 $("#tempoTimeWrap").classList.toggle("hidden",!["sprint","tempo"].includes(mode));$("#perQuestionTimeWrap").classList.toggle("hidden",mode!=="flash");$("#remediateInfo").classList.toggle("hidden",mode!=="remediate");
 $("#questionCount").value=String(cfg.defaultCount);$("#tempoSeconds").value=String(cfg.defaultTempo);
 $("#questionCount").closest("label").classList.toggle("hidden",["sprint","tempo"].includes(mode));
 const info={learn:"Je start met kijken en begrijpen. Daarna volgen kiezen, aanvullen, omkeren en zelf antwoorden.",mix:"Meerkeuze, juist/fout, ontbrekende getallen en bewerkingsfamilies wisselen elkaar af.",smart:"Moeilijke, trage en weinig geoefende tafel-feiten komen vaker terug.",remediate:"Visuele groepjes en tussenstappen bouwen de tafel opnieuw op. Fouten keren later terug.",knowledge:"Meet of je het juiste antwoord kunt vinden. Er is geen tijdsdruk en je krijgt feedback na afloop.",flash:"Elke oefening heeft een eigen tijdslimiet. Juist maar te traag is nog niet geautomatiseerd.",sprint:"Los binnen de totale tijd zoveel mogelijk oefeningen op. We meten aantal, nauwkeurigheid en correcte antwoorden per minuut.",tempo:"Los binnen de totale tijd zoveel mogelijk oefeningen op."};$("#modeInfo").textContent=info[mode]||"";
 setChecks($("#tableChecks"),mode==="learn"?[cfg.tables[0]]:cfg.tables);
 let op="both";if(cfg.multiply&&!cfg.divide)op="multiply";if(!cfg.multiply&&cfg.divide)op="divide";$("#operationSelect").value=op;
 $("#tableChecks").classList.remove("locked");$("#tableChecks").querySelectorAll("input").forEach(x=>x.disabled=false);$("#questionCount").disabled=false;$("#operationSelect").disabled=!(cfg.multiply&&cfg.divide);$("#previewBadge").classList.toggle("hidden",!isPreview);showView("setup")
}
function startExercise(){
 const cfg=studentSettings(currentStudentId),tables=selected($("#tableChecks"));if(!tables.length){$("#setupError").textContent="Kies minstens één tafel.";return}
 const op=$("#operationSelect").value,selectedCount=+$("#questionCount").value,count=["sprint","tempo"].includes(currentMode)?100:selectedCount,seconds=["sprint","tempo"].includes(currentMode)?+$("#tempoSeconds").value:null,perQuestion=currentMode==="flash"?+$("#perQuestionSeconds").value:null;
 currentSession={id:uid(),studentId:currentStudentId,assignmentId:currentAssignmentId,mode:currentMode,operation:op,tables,plannedCount:count,requiredCount:selectedCount,startedAt:new Date().toISOString(),answers:[],questions:makeQuestions(currentMode,tables,op,count,cfg),index:0,remainingSeconds:seconds,perQuestionSeconds:perQuestion,preview:isPreview,streak:0,stars:0};
 $("#streakBox").textContent="🔥 0";$("#starBox").textContent="★ 0";$("#streakBox").classList.toggle("hidden",isAssessmentMode(currentMode));$("#starBox").classList.toggle("hidden",isAssessmentMode(currentMode));
 $("#exerciseStudent").textContent=studentById(currentStudentId)?.name+(isPreview?" · TESTMODUS":"");$("#timerBox").classList.toggle("hidden",!["sprint","tempo","flash"].includes(currentMode));showView("exercise");if(["sprint","tempo"].includes(currentMode))startTimer();renderQuestion()
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
  return `<strong>${q.a} groepen van ${q.b}</strong><div class="groups">${groups}</div><p>${Array.from({length:q.a},()=>q.b).join(" + ")} = ?</p>`
 }
 const groups=Array.from({length:q.answer},()=>`<span class="group">${Array.from({length:q.b},()=>'<i class="counter"></i>').join("")}</span>`).join("");
 return `<strong>Verdeel ${q.a} in groepjes van ${q.b}. Hoeveel groepjes zie je?</strong><div class="groups">${groups}</div><p>Vermenigvuldigen en delen zijn omgekeerde bewerkingen.</p>`
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
function handleAnswer(value,timedOut=false){
 if(!currentSession||!currentSession.acceptingAnswer||currentSession.index>=currentSession.questions.length)return;currentSession.acceptingAnswer=false;clearQuestionTimer();const q=currentSession.questions[currentSession.index],ms=timedOut?currentSession.perQuestionSeconds*1000:Math.max(100,Math.round(performance.now()-currentSession.questionStartedAt)),correct=!timedOut&&Number(value)===Number(q.userAnswer),fluent=correct&&ms<=db.settings.fluentSeconds*1000;
 const a={key:q.key,op:q.op,table:q.table,n:q.n,question:q.displayText||q.text,expected:q.userAnswer,given:timedOut?null:+value,correct,fluent,timedOut,ms,variant:q.variant};
 currentSession.answers.push(a);if(!isPreview)updateStat(currentStudentId,a);currentSession.streak=correct?currentSession.streak+1:0;if(correct)currentSession.stars+=fluent?2:1;
 $("#streakBox").textContent=`🔥 ${currentSession.streak}`;$("#starBox").textContent=`★ ${currentSession.stars}`;$$(".choice-btn").forEach(b=>b.disabled=true);currentSession.index++;
 if(isAssessmentMode(currentSession.mode)){$("#feedback").textContent=timedOut?"Tijd voorbij — volgende oefening":"Antwoord bewaard";$("#feedback").className="feedback";setTimeout(renderQuestion,timedOut?450:180);return}
 $("#feedback").textContent=correct?(fluent?"Juist én vlot! +2 sterren":"Juist! Probeer het straks nog wat vlotter. +1 ster"):`Nog niet. ${q.text} ${q.answer}`;$("#feedback").className="feedback "+(correct?"ok":"bad");setTimeout(renderQuestion,correct?600:1200)
}
function updateStat(id,a){db.factStats[id]||={};const st=db.factStats[id][a.key]||={attempts:0,correct:0,totalCorrectMs:0};st.attempts++;if(a.correct){st.correct++;st.totalCorrectMs+=a.ms}saveDb()}
function finishSession(timeUp){
 if(!currentSession)return;clearInterval(timerId);clearQuestionTimer();currentSession.finishedAt=new Date().toISOString();currentSession.timeUp=!!timeUp;delete currentSession.questions;if(!isPreview){db.sessions.push(currentSession);const completed=currentSession.mode==="sprint"||currentSession.mode==="tempo"?timeUp:currentSession.answers.length>=currentSession.plannedCount;if(currentSession.assignmentId&&completed){const a=(db.assignments||[]).find(x=>x.id===currentSession.assignmentId);if(a){a.completedBy=a.completedBy||[];if(!a.completedBy.includes(currentStudentId))a.completedBy.push(currentStudentId)}if(publicStudentMode)publicCompletedAssignmentIds.add(currentSession.assignmentId)}saveDb();if(publicStudentMode)window.savePublicStudentProgress?.({sessions:db.sessions,factStats:db.factStats,completedAssignmentIds:[...publicCompletedAssignmentIds]})}renderResult(currentSession);currentSession=null;currentAssignmentId=null;showView("result")
}
function renderResult(s){const n=s.answers.length,c=s.answers.filter(a=>a.correct).length,unanswered=s.answers.filter(a=>a.timedOut).length,wrong=n-c-unanswered,p=n?Math.round(c/n*100):0,avg=n?s.answers.reduce((x,a)=>x+a.ms,0)/n/1000:0,fluentCount=s.answers.filter(a=>a.correct&&(a.fluent??a.ms<=db.settings.fluentSeconds*1000)).length,slow=c-fluentCount,durationMs=Math.max(1000,new Date(s.finishedAt)-new Date(s.startedAt)),rate=c/(durationMs/60000),automated=p>=90&&slow===0;$("#scorePct").textContent=p+"%";$("#scoreCorrect").textContent=`${c}/${n}`;$("#scoreWrong").textContent=wrong;$("#scoreUnanswered").textContent=unanswered;$("#avgTime").textContent=avg.toFixed(1)+" s";$("#scoreFluent").textContent=fluentCount;$("#scoreSlow").textContent=slow;$("#scoreRate").textContent=rate.toFixed(1);$("#resultMessage").textContent=isPreview?"Testmodus: dit resultaat wordt niet opgeslagen.":automated?"Beheerst: juist én vlot!":p>=90?"Heel nauwkeurig, maar nog niet geautomatiseerd. Oefen verder met flitsvragen.":p>=75?"Goed op weg. Herhaal vooral de moeilijke feiten.":"Deze tafels vragen nog uitleg en visuele ondersteuning.";$("#mistakeList").innerHTML=s.answers.filter(a=>!a.correct||!(a.fluent??a.ms<=db.settings.fluentSeconds*1000)).slice(0,12).map(a=>`<span class="check">${esc(a.question)} ${a.expected} · ${a.timedOut?"niet binnen de tijd":a.correct?"juist maar traag":"fout"}</span>`).join("")}

function masteryFor(id,table){
 const stats=Object.entries(db.factStats[id]||{}).filter(([k])=>k.includes(`:${table}:`)||k.endsWith(`:${table}`)).map(([,v])=>v);
 if(!stats.length)return{level:"gray",label:"geen gegevens",acc:null,avg:null};
 const at=stats.reduce((s,x)=>s+x.attempts,0),co=stats.reduce((s,x)=>s+x.correct,0),ms=stats.reduce((s,x)=>s+x.totalCorrectMs,0),acc=co/at,avg=co?ms/co:99999,t=db.settings.fluentSeconds*1000;
 if(acc>=.9&&avg<=t)return{level:"green",label:"vlot",acc,avg};if(acc>=.75&&avg<=t*1.7)return{level:"orange",label:"nog oefenen",acc,avg};return{level:"red",label:"moeilijk",acc,avg}
}
function renderTeacherResults(id){
 if(!id){$("#overviewCards").innerHTML="";$("#masteryGrid").innerHTML="";$("#sessionRows").innerHTML="";$("#learningAdvice").innerHTML="";return}
 const ss=db.sessions.filter(s=>s.studentId===id).slice().reverse(),a=ss.flatMap(s=>s.answers),c=a.filter(x=>x.correct).length,p=a.length?Math.round(c/a.length*100):0,avg=a.length?a.reduce((x,y)=>x+y.ms,0)/a.length/1000:0;
 $("#overviewCards").innerHTML=`<div><strong>${ss.length}</strong><span>sessies</span></div><div><strong>${a.length}</strong><span>oefeningen</span></div><div><strong>${p}%</strong><span>juist</span></div><div><strong>${avg.toFixed(1)} s</strong><span>gem. antwoordtijd</span></div>`;
 $("#masteryGrid").innerHTML=Array.from({length:10},(_,i)=>{const t=i+1,m=masteryFor(id,t);return`<div class="mastery-card ${m.level}"><strong>Tafel ${t}</strong><span>${m.label}</span><small>${m.acc==null?"Nog niet geoefend":Math.round(m.acc*100)+"% juist · "+(m.avg/1000).toFixed(1)+" s"}</small></div>`}).join("");
 const levels=Array.from({length:10},(_,i)=>({table:i+1,...masteryFor(id,i+1)})),difficult=levels.filter(x=>x.level==="red").map(x=>x.table),slow=levels.filter(x=>x.level==="orange").map(x=>x.table);$("#learningAdvice").innerHTML=`<b>Volgende beste stap</b><p>${difficult.length?`Remedieer tafel${difficult.length>1?"s":""} ${difficult.join(", ")} met groepjes en bewerkingsfamilies.`:slow.length?`De antwoorden op tafel${slow.length>1?"s":""} ${slow.join(", ")} zijn meestal juist, maar nog niet vlot. Plan korte flitsrondes.`:a.length?"De actieve tafels worden vlot beheerst. Voeg een moeilijkere tafel of gemengde deeltafels toe.":"Start met een korte nulmeting van 10 vragen."}</p>`;
 $("#sessionRows").innerHTML=ss.slice(0,25).map(s=>{const n=s.answers.length,c=s.answers.filter(a=>a.correct).length,av=n?s.answers.reduce((x,a)=>x+a.ms,0)/n/1000:0,slow=s.answers.filter(a=>a.correct&&a.ms>db.settings.fluentSeconds*1000).length;return`<tr><td>${new Date(s.startedAt).toLocaleDateString("nl-BE")}</td><td>${modeLabel(s.mode)}</td><td>${n?Math.round(c/n*100):0}%${slow?` · ${slow} traag`:""}</td><td>${av.toFixed(1)} s</td><td>${n}</td></tr>`}).join("")||'<tr><td colspan="5">Nog geen sessies.</td></tr>'
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
 const cfg=studentSettings(id),tables=(options.tables&&options.tables.length?options.tables:cfg.tables).map(Number),operation=options.operation||(cfg.multiply&&cfg.divide?"both":cfg.multiply?"multiply":"divide"),level=levelChoice&&levelChoice!=="auto"?levelChoice:studentLevel(id),facts=focusFacts(id,30,tables,operation),tasks=[],answers=[];
 const getF=()=>rand(facts);let nr=1;
 if(level==="basis"){
  const visualPool=shuffle(facts.filter(f=>(f.op==="multiply"?f.answer:f.a)<=40)),visualFacts=[];for(const f of (visualPool.length?visualPool:facts)){if(!visualFacts.some(x=>x.n==f.n&&x.op==f.op))visualFacts.push(f);if(visualFacts.length===3)break}while(visualFacts.length<3)visualFacts.push(getF());tasks.push({type:"visual-set",title:`${nr++}. Kijk, groepeer en reken`,items:visualFacts});answers.push({title:tasks.at(-1).title,items:visualFacts.map(f=>displayFact(f,false))});
  const core=facts.slice(0,5); tasks.push({type:"core",title:`${nr++}. Probeer het nu zelf`,items:core}); answers.push({title:tasks.at(-1).title,items:core.map(f=>displayFact(f,false))});
 }
 if(level==="kern"){
  const core=facts.slice(0,6); tasks.push({type:"core",title:`${nr++}. Flits en schrijf`,items:core}); answers.push({title:tasks.at(-1).title,items:core.map(f=>displayFact(f,false))});
  const f=getF(),t=f.table||2; tasks.push({type:"snake",title:`${nr++}. Sprongenslang`,step:t,values:Array.from({length:7},(_,i)=>i===0?0:(i===6?t*6:null))}); answers.push({title:tasks.at(-1).title,items:[Array.from({length:7},(_,i)=>i*t).join(" – ")]});
 }
 if(level==="uitdaging"){
  const fs=shuffle(facts).slice(0,5),missing=fs.map(missingFact);tasks.push({type:"missing",title:`${nr++}. Zoek de verborgen getallen`,items:missing.map(x=>x.text)});answers.push({title:tasks.at(-1).title,items:missing.map(x=>`${x.text.replace("□",x.answer)}`)});
  const indFacts=shuffle(facts).slice(0,4),wrongIndex=Math.floor(Math.random()*indFacts.length),items=indFacts.map((x,i)=>({statement:`${x.text} ${i===wrongIndex?x.answer+rand([-2,-1,1,2]):x.answer}`,good:i!==wrongIndex,correct:x.answer}));tasks.push({type:"detective",title:`${nr++}. Zoek de fout`,items});answers.push({title:tasks.at(-1).title,items:items.map(x=>x.good?`${x.statement} is juist`:`${x.statement} moet ${x.correct} zijn`)})
 }
 if(level==="expert"){
  const f=getF(),fam=factFamily(f);tasks.push({type:"expert",title:`${nr++}. Tafelbreker`,family:fam});answers.push({title:tasks.at(-1).title,items:[`${fam.table} × ${fam.n} = ${fam.product}; ${fam.product} : ${fam.table} = ${fam.n}; ${fam.n} × ${fam.table} = ${fam.product}; ${fam.product} : ${fam.n} = ${fam.table}`]});
  tasks.push({type:"family",title:`${nr++}. Bouw de bewerkingsfamilie`,items:[f]});answers.push({title:tasks.at(-1).title,items:[`${fam.x} × ${fam.y} = ${fam.product}; ${fam.y} × ${fam.x} = ${fam.product}; ${fam.product} : ${fam.x} = ${fam.y}; ${fam.product} : ${fam.y} = ${fam.x}`]});
 }
 const usedTypes=new Set(tasks.map(t=>t.type)),anchor=rand(["calcgrid","grid","match"]),allTypes=[anchor,...shuffle(["calcgrid","grid","match","story","detective","domino","family","snake","answerbank"].filter(x=>x!==anchor))],bank=allTypes.filter(type=>!usedTypes.has(type)),wanted=Math.min(bank.length,Math.max(3,Math.min(6,+play||4)));
 for(const type of bank.slice(0,wanted)){
  const f=getF(),fs=shuffle(facts).slice(0,6),k=nr++;
  if(type==="calcgrid"){const table=f.table,factors=shuffle([1,2,3,4,5,6,7,8,9,10]).slice(0,6),divide=operation==="divide"||(operation==="both"&&f.op==="divide");tasks.push({type,title:`${k}. Rekenrooster`,table,factors,op:divide?"divide":"multiply"});answers.push({title:tasks.at(-1).title,items:factors.map(n=>divide?`${table*n} : ${table} = ${n}`:`${table} × ${n} = ${table*n}`)})}
  if(type==="grid"){const t=f.table||2;tasks.push({type,title:`${k}. Tafelrooster`,table:t,values:Array.from({length:10},(_,i)=>i%3===0?(i+1)*t:null)});answers.push({title:tasks.at(-1).title,items:[Array.from({length:10},(_,i)=>(i+1)*t).join(", ")]})}
  if(type==="story"){const storyItems=fs.slice(0,3).map(sf=>{const table=sf.table,n=sf.n||rand([2,3,4,5]),divide=operation==="divide"||(operation==="both"&&sf.op==="divide");if(divide)return{op:"divide",total:table*n,groups:table,each:n};let groups=table,each=n;if(cfg.factorPosition==="back"||(cfg.factorPosition==="both"&&Math.random()<.5)){groups=n;each=table}return{op:"multiply",groups,each,total:groups*each}});tasks.push({type,title:`${k}. Drie rekenverhalen`,items:storyItems,level});answers.push({title:tasks.at(-1).title,items:storyItems.map(x=>x.op==="divide"?`${x.total} : ${x.groups} = ${x.each}`:`${x.groups} × ${x.each} = ${x.total}`)})}
  if(type==="detective"){const items=fs.map((x,j)=>{const good=j%2===0,v=good?x.answer:x.answer+rand([-2,-1,1,2]);return{statement:`${x.text.replace("=","").trim()} = ${v}`,good,correct:x.answer}});tasks.push({type,title:`${k}. Foutendetective`,items});answers.push({title:tasks.at(-1).title,items:items.map(x=>x.good?"juist":`fout → ${x.correct}`)})}
  if(type==="domino"){tasks.push({type,title:`${k}. Dominoketting`,items:fs});answers.push({title:tasks.at(-1).title,items:fs.map(x=>displayFact(x,false))})}
  if(type==="family"){const familyItems=uniqueFamilyFacts(facts,3);tasks.push({type,title:`${k}. Geef de omgekeerde bewerking`,items:familyItems});answers.push({title:tasks.at(-1).title,items:familyItems.map(x=>x.op==="multiply"?`${x.a} × ${x.b} = ${x.answer} → ${x.answer} : ${x.b} = ${x.a}`:`${x.a} : ${x.b} = ${x.answer} → ${x.b} × ${x.answer} = ${x.a}`)})}
  if(type==="snake"){const t=f.table||2;tasks.push({type,title:`${k}. Sprongenslang`,step:t,values:Array.from({length:7},(_,i)=>i===0?0:(i===6?t*6:null))});answers.push({title:tasks.at(-1).title,items:[Array.from({length:7},(_,i)=>i*t).join(" – ")]})}
  if(type==="match"){const items=fs,answerValues=shuffle(items.map(x=>x.answer));tasks.push({type,title:`${k}. Wat hoort bij elkaar?`,items,answerValues});answers.push({title:tasks.at(-1).title,items:items.map(x=>`${x.text} ${x.answer}`)})}
  if(type==="answerbank"){const items=fs,answerValues=shuffle(items.map(x=>x.answer));tasks.push({type,title:`${k}. Kies uit de antwoordbank`,items,answerValues});answers.push({title:tasks.at(-1).title,items:items.map(x=>`${x.text} ${x.answer}`)})}
 }
 return{id,level,tables,operation,tasks,answers}
}
function taskHtml(t){
 if(t.type==="core")return `<section class="hw-section"><h2>${t.title}</h2><div class="hw-grid">${t.items.map(f=>`<div class="hw-item">${displayFact(f)}</div>`).join("")}</div></section>`;
 if(t.type==="missing")return `<section class="hw-section"><h2>${t.title}</h2><p>Schrijf het ontbrekende getal in het hokje.</p><div class="puzzle-box missing-grid">${t.items.map(x=>`<div class="hw-item">${esc(x).replace("□",'<span class="inline-answer-box"></span>')}</div>`).join("")}</div></section>`;
 if(t.type==="visual-set")return `<section class="hw-section visual-set"><h2>${t.title}</h2>${t.items.map((f,i)=>{if(f.op==="divide"){const dots=Array.from({length:f.a},()=>'<i class="visual-dot"></i>').join("");return `<div class="visual-exercise"><h3>${String.fromCharCode(97+i)}. Maak zelf groepjes</h3><p>Zet telkens een kring rond <b>${f.b}</b> stippen. Hoeveel groepjes kun je maken?</p><div class="loose-dots">${dots}</div><div class="visual-answer">${f.a} : ${f.b} = <span class="answer-line"></span></div></div>`}const groups=Array.from({length:f.a},()=>`<span class="visual-group">${Array.from({length:f.b},()=>'<i class="visual-dot"></i>').join("")}</span>`).join("");return `<div class="visual-exercise"><h3>${String.fromCharCode(97+i)}. Kijk naar de groepjes</h3><p>Hoeveel stippen zijn er samen?</p><div class="visual-groups">${groups}</div><div class="visual-answer">${f.a} × ${f.b} = <span class="answer-line"></span></div></div>`}).join("")}</section>`;
 if(t.type==="visual"){const f=t.f;if(f.op==="divide"){const groups=Array.from({length:f.answer},()=>`<span class="visual-group">${Array.from({length:f.b},()=>'<i class="visual-dot"></i>').join("")}</span>`).join("");return `<section class="hw-section"><h2>${t.title}</h2><p>Verdeel <b>${f.a}</b> stippen in groepjes van <b>${f.b}</b>. Hoeveel groepjes zijn er?</p><div class="visual-groups">${groups}</div><div class="visual-answer">${f.a} : ${f.b} = <span class="answer-line"></span></div></section>`}const groups=Array.from({length:f.a},()=>`<span class="visual-group">${Array.from({length:f.b},()=>'<i class="visual-dot"></i>').join("")}</span>`).join("");return `<section class="hw-section"><h2>${t.title}</h2><div class="visual-groups">${groups}</div><div class="visual-answer">${f.a} groepen van ${f.b} → ${f.a} × ${f.b} = <span class="answer-line"></span></div></section>`}
 if(t.type==="detective")return `<section class="hw-section"><h2>${t.title}</h2><div class="puzzle-box">${t.items.map(x=>`<div class="jf-row"><span>${x.statement}</span><span><i class="jf-box"></i> juist</span><span><i class="jf-box"></i> fout</span></div><div class="correction-line">Fout? Verbeter: <span></span></div>`).join("")}</div></section>`;
 if(t.type==="snake")return `<section class="hw-section"><h2>${t.title}</h2><p>Tel telkens <b>${t.step}</b> verder.</p><div class="jump-snake">${t.values.map((v,i)=>`${i?'<span class="snake-arrow">→</span>':''}<span class="snake-cell">${v===null?"":v}</span>`).join("")}</div></section>`;
 if(t.type==="calcgrid"){const divide=t.op==="divide";if(divide){const dividends=t.factors.map(n=>n*t.table);return `<section class="hw-section"><h2>${t.title}</h2><p>Deel elk deeltal door <b>${t.table}</b>. Schrijf de uitkomst in het lege vak.</p><div class="division-table"><b>Deeltal</b><b>Deler</b><b>Uitkomst</b>${dividends.map(n=>`<span>${n}</span><span>${t.table}</span><i></i>`).join("")}</div></section>`}return `<section class="hw-section"><h2>${t.title}</h2><p>Vermenigvuldig <b>${t.table}</b> met elk getal bovenaan. Schrijf de uitkomsten in de lege vakken.</p><div class="calc-grid"><b>×</b>${t.factors.map(n=>`<b>${n}</b>`).join("")}<b>${t.table}</b>${t.factors.map(()=>'<span></span>').join("")}</div></section>`}
 if(t.type==="grid")return `<section class="hw-section"><h2>${t.title}</h2><p>Vul de tafel van <b>${t.table}</b> verder aan.</p><div class="number-grid">${t.values.map(v=>`<div class="cell">${v??""}</div>`).join("")}</div></section>`;
 if(t.type==="story"){const items=t.items||[t];return `<section class="hw-section story-set"><h2>${t.title}</h2>${items.map((x,i)=>{const text=x.op==="divide"?`Er zijn <b>${x.total}</b> potloden. Verdeel ze eerlijk over <b>${x.groups}</b> doosjes. Hoeveel komen er in elk doosje?`:`Er zijn <b>${x.groups}</b> doosjes met telkens <b>${x.each}</b> potloden. Hoeveel zijn er samen?`;return `<div class="mini-story"><b>${i+1}.</b><p>${text}</p><span class="story-answer"></span></div>`}).join("")}</section>`}
 if(t.type==="domino")return `<section class="hw-section"><h2>${t.title}</h2><p>Reken uit en vul de lege helft aan.</p><div class="domino-row">${t.items.map(x=>`<div class="domino"><span>${esc(x.text.replace("=","").trim())}</span><span></span></div>`).join("")}</div></section>`;
 if(t.type==="match")return `<section class="hw-section"><h2>${t.title}</h2><p>Trek een lijn van elke oefening naar de juiste uitkomst.</p><div class="match-board"><div>${t.items.map(x=>`<span>${esc(x.text.replace("=","").trim())}</span>`).join("")}</div><div>${t.answerValues.map(x=>`<span>${x}</span>`).join("")}</div></div></section>`;
 if(t.type==="answerbank")return `<section class="hw-section"><h2>${t.title}</h2><p>Elk antwoord uit de antwoordbank gebruik je één keer.</p><div class="answer-bank">${t.answerValues.map(x=>`<b>${x}</b>`).join("")}</div><div class="hw-grid">${t.items.map(x=>`<div class="hw-item">${displayFact(x)}</div>`).join("")}</div></section>`;
 if(t.type==="family")return `<section class="hw-section"><h2>${t.title}</h2><p>Schrijf bij elke oefening de omgekeerde bewerking en los die op.</p><div class="inverse-list">${t.items.map((f,i)=>{const source=`${f.text} ${f.answer}`,inverse=f.op==="multiply"?`<span class="inline-answer-box"></span> : <span class="inline-answer-box"></span> = <span class="inline-answer-box"></span>`:`<span class="inline-answer-box"></span> × <span class="inline-answer-box"></span> = <span class="inline-answer-box"></span>`;return `<div class="inverse-card"><b>${i+1}.</b><div class="inverse-source">${source}</div><span class="inverse-arrow">→</span><div class="inverse-answer"><small>Omgekeerde bewerking</small>${inverse}</div></div>`}).join("")}</div></section>`;
 if(t.type==="expert"){const f=t.family,b='<i class="inline-answer-box"></i>';return `<section class="hw-section"><h2>${t.title}</h2><div class="challenge-box"><p>Vul de vier ontbrekende getallen aan. Gebruik alleen de bewerkingsfamilie van <b>${f.table}</b>, <b>${f.n}</b> en <b>${f.product}</b>.</p><div class="expert-grid"><span>${f.table} × ${b} = ${f.product}</span><span>${f.product} : ${f.table} = ${b}</span><span>${b} × ${f.table} = ${f.product}</span><span>${f.product} : ${b} = ${f.table}</span></div></div></section>`}
 return `<section class="hw-section"><h2>${t.title}</h2><div class="puzzle-box">${(t.items||[]).map(x=>`<div class="hw-item">${x}</div>`).join("")}</div></section>`
}
function renderHomework(hw){
 lastHomework=hw;const s=studentById(hw.id);$("#hwName").textContent=s.name;$("#answersFor").textContent=`Voor ${s.name}`;
 const parts=hw.tasks.map(taskHtml);
 $("#homeworkContent").innerHTML=`<div class="hw-level-chip">${hw.level.charAt(0).toUpperCase()+hw.level.slice(1)} · tafel${hw.tables.length>1?"s":""} ${hw.tables.join(", ")} · ${hw.operation==="multiply"?"maal":hw.operation==="divide"?"delen":"maal en delen"}</div>`+parts.join("");
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
$("#enterStudentLoginBtn").addEventListener("click",()=>{refreshStudentSelects();resetStudentLogin();showView("studentLogin")});$("#studentLoginBackBtn").addEventListener("click",()=>showView("landing"));$("#goLandingBtn").addEventListener("click",()=>showView("landing"));
$("#chooseOtherStudentBtn").addEventListener("click",resetStudentLogin);$("#loginKeypad").innerHTML=[1,2,3,4,5,6,7,8,9,"wis",0,"⌫"].map(x=>`<button type="button" data-key="${x}">${x}</button>`).join("");$("#loginKeypad").addEventListener("click",e=>{const key=e.target.closest("[data-key]")?.dataset.key;if(key===undefined)return;const input=$("#loginPin");if(key==="wis")input.value="";else if(key==="⌫")input.value=input.value.slice(0,-1);else if(input.value.length<4)input.value+=key;$("#loginError").textContent=""});
$("#studentLoginBtn").addEventListener("click",loginStudent);$("#studentLogoutBtn").addEventListener("click",()=>{if(isPreview){isPreview=false;returnContext="teacher";showView("teacher");teacherTab("assignments")}else{currentStudentId=null;showView("landing")}});
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
$("#startPreviewBtn").addEventListener("click",()=>{const id=$("#previewStudentSelect").value;if(!id)return;currentStudentId=id;isPreview=true;returnContext="previewHome";renderStudentHome();$("#studentWelcomeName").textContent+= " · TESTMODUS";showView("studentHome")});
$("#setupBackBtn").addEventListener("click",()=>{currentAssignmentId=null;if(returnContext==="teacher"){showView("teacher");teacherTab("assignments")}else showView("studentHome")});
$("#startBtn").addEventListener("click",startExercise);$("#answerForm").addEventListener("submit",e=>{e.preventDefault();const v=$("#answerInput").value.trim();if(v!==""&&Number.isFinite(+v))handleAnswer(+v)});
$("#stopBtn").addEventListener("click",()=>{if(confirm("Oefening stoppen?"))finishSession(false)});
$("#resultBackBtn").addEventListener("click",()=>{if(isPreview&&returnContext==="teacher"){showView("teacher");teacherTab("assignments");isPreview=false}else if(isPreview){renderStudentHome();$("#studentWelcomeName").textContent+= " · TESTMODUS";showView("studentHome")}else{renderStudentHome();showView("studentHome")}});
$("#teacherStudentSelect").addEventListener("change",e=>renderTeacherResults(e.target.value));
$("#exportBtn").addEventListener("click",exportBackup);$("#importInput").addEventListener("change",e=>{if(e.target.files[0])importBackup(e.target.files[0]);e.target.value=""});
$("#generateHomeworkBtn").addEventListener("click",()=>{const id=$("#homeworkStudentSelect").value;if(!id)return;currentStudentId=id;const manual=$("#homeworkSource").value==="manual",tables=manual?selected($("#homeworkTableChecks")):null;if(manual&&!tables.length){alert("Kies minstens één tafel voor de huistaak.");return}lastHomeworkConfig={level:$("#homeworkLevel").value,play:+$("#homeworkPlay").value,options:{tables,operation:manual?$("#homeworkOperation").value:null}};renderHomework(makeHomework(id,lastHomeworkConfig.level,lastHomeworkConfig.play,lastHomeworkConfig.options))});
function updateHomeworkSource(){const manual=$("#homeworkSource").value==="manual";$("#homeworkTablesField").classList.toggle("disabled-field",!manual);$("#homeworkTableChecks").querySelectorAll("input").forEach(x=>x.disabled=!manual);$("#homeworkOperation").disabled=!manual}
$("#homeworkSource").addEventListener("change",updateHomeworkSource);updateHomeworkSource();
$("#homeworkBackBtn").addEventListener("click",()=>{showView("teacher");teacherTab("homework")});$("#regenerateHomeworkBtn").addEventListener("click",()=>{if(lastHomeworkConfig)renderHomework(makeHomework(currentStudentId,lastHomeworkConfig.level,lastHomeworkConfig.play,lastHomeworkConfig.options))});$("#printHomeworkBtn").addEventListener("click",()=>window.print());$("#toggleAnswersBtn").addEventListener("click",()=>{$("#answersSheet").classList.toggle("hidden")});
$("#generateFlashcardsBtn").addEventListener("click",generateFlashcards);
$("#flashBackBtn").addEventListener("click",()=>{showView("teacher");teacherTab("flashcards")});
$("#flashPrintBtn").addEventListener("click",printFlashcards);

showView("landing");
