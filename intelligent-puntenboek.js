const DOMAINS={
  Nederlands:["Spelling","Begrijpend lezen","Creatief schrijven","Taalbeschouwing"],
  WO:["Mens en maatschappij","Natuur","Geschiedenis","Aardrijkskunde"],
  Wiskunde:["Getallen","Bewerkingen","Maal- en deeltafels","Cijferen","Meetkunde","Meten","Vraagstukken","Tabellen en grafieken"]
};
const GOALS={
  "Spelling":["Ik schrijf hoorwoorden correct","Ik pas de regel voor korte en lange klanken toe","Ik schrijf woorden met ei/ij en au/ou"],
  "Begrijpend lezen":["Ik vind expliciete informatie in een tekst","Ik bepaal de hoofdgedachte","Ik leid informatie af uit tekst en beeld"],
  "Creatief schrijven":["Ik schrijf een samenhangende tekst","Ik gebruik hoofdletters en leestekens","Ik kies passende woorden"],
  "Taalbeschouwing":["Ik herken woordsoorten","Ik bouw een correcte zin","Ik herken onderwerp en persoonsvorm"],
  "Mens en maatschappij":["Ik herken gevoelens en sociale situaties","Ik handel veilig en respectvol","Ik vergelijk gewoonten en leefwijzen"],
  "Natuur":["Ik herken kenmerken van dieren en planten","Ik beschrijf een eenvoudige levenscyclus","Ik onderzoek materialen en verschijnselen"],
  "Geschiedenis":["Ik orden gebeurtenissen in de tijd","Ik vergelijk vroeger en nu","Ik gebruik een eenvoudige tijdlijn"],
  "Aardrijkskunde":["Ik lees een eenvoudige kaart","Ik herken landschappen","Ik situeer plaatsen in mijn omgeving"],
  "Getallen":["Ik lees, schrijf en orden getallen tot 100","Ik splits getallen tot 100","Ik plaats getallen op de getallenas"],
  "Bewerkingen":["Ik tel en trek af tot 100","Ik kies een passende rekenstrategie","Ik controleer mijn uitkomst"],
  "Maal- en deeltafels":["Ik automatiseer de tafels van 2, 5 en 10","Ik leg het verband tussen maal en delen","Ik pas tafels toe in een context"],
  "Cijferen":["Ik noteer een bewerking correct onder elkaar","Ik reken cijferend op en af","Ik controleer een cijferbewerking"],
  "Meetkunde":["Ik herken vlakke figuren en ruimtefiguren","Ik beschrijf plaats en richting","Ik herken symmetrie"],
  "Meten":["Ik kies een passende maateenheid","Ik meet lengte, inhoud en gewicht","Ik lees klok en kalender"],
  "Vraagstukken":["Ik haal gegevens uit een vraagstuk","Ik kies de juiste bewerking","Ik formuleer een antwoordzin"],
  "Tabellen en grafieken":["Ik lees gegevens uit een tabel","Ik lees een eenvoudige grafiek","Ik vergelijk en interpreteer gegevens"]
};
const KEYWORDS={
  "Ik lees, schrijf en orden getallen tot 100":["getal","groter","kleiner","orden","rangschik"],
  "Ik splits getallen tot 100":["splits","tiental","eenheid"],
  "Ik tel en trek af tot 100":["tel op","trek af","som","verschil","+","-"],
  "Ik automatiseer de tafels van 2, 5 en 10":["maal","keer","tafel","product"],
  "Ik haal gegevens uit een vraagstuk":["vraagstuk","hoeveel","antwoordzin"],
  "Ik lees gegevens uit een tabel":["tabel","kolom","rij"],
  "Ik lees een eenvoudige grafiek":["grafiek","diagram"],
  "Ik vind expliciete informatie in een tekst":["tekst","waarom","wie","waar","wanneer"],
  "Ik bepaal de hoofdgedachte":["hoofdgedachte","titel","gaat de tekst"],
  "Ik gebruik hoofdletters en leestekens":["hoofdletter","punt","komma","vraagteken"],
  "Ik schrijf hoorwoorden correct":["schrijf","dictee","woord"]
};
const today=()=>new Date().toISOString().slice(0,10);
const id=()=>Math.random().toString(36).slice(2,9);
const initials=n=>n.split(/\s+/).map(x=>x[0]).slice(0,2).join("").toUpperCase();
const pct=(a,b)=>b?Math.round(a/b*100):0;
let state=load();
let activeView="overzicht",testStep=1,draftQuestions=[],filterSubject="Alle",feedbackStudent=null;

function load(){try{return JSON.parse(localStorage.getItem("groeiboek-v1"))||{students:[],tests:[],period:1}}catch{return{students:[],tests:[],period:1}}}
function save(){localStorage.setItem("groeiboek-v1",JSON.stringify(state))}
function toast(msg){const t=document.querySelector("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
function studentResults(studentId){
  const rows=[];
  state.tests.forEach(t=>t.questions.forEach(q=>{const v=t.scores?.[studentId]?.[q.id];if(v!==""&&v!=null)rows.push({test:t,q,value:+v,pct:pct(+v,+q.max)})}));
  return rows.sort((a,b)=>new Date(a.test.date)-new Date(b.test.date));
}
function goalGroups(studentId){
  const map={};studentResults(studentId).forEach(r=>(map[r.q.goal]??=[]).push(r));return map;
}
function classGoalGroups(){
  const map={};state.students.forEach(s=>Object.entries(goalGroups(s.id)).forEach(([g,rs])=>{map[g]??=[];map[g].push(...rs)}));return map;
}
function avg(rs){return rs.length?Math.round(rs.reduce((s,r)=>s+r.pct,0)/rs.length):0}
function trend(rs){if(rs.length<2)return 0;return rs.at(-1).pct-rs[0].pct}

function render(){
  document.querySelector("#periodeSelect").value=state.period;
  document.querySelector("#periodNumber").textContent=state.period;
  renderOverview();renderStudents();renderTests();renderAnalysisSelectors();renderAnalysis();renderFeedback();
}
function renderOverview(){
  const periodTests=state.tests.filter(t=>+t.period===+state.period),results=state.students.flatMap(s=>studentResults(s.id)).filter(r=>+r.test.period===+state.period);
  const groups=classGoalGroups(),goals=Object.keys(groups);
  const classAvg=avg(results),growing=goals.filter(g=>trend(groups[g])>=5).length;
  document.querySelector("#metrics").innerHTML=[
    ["▤",periodTests.length,"toetsen deze periode",""],
    ["♙",state.students.length,"leerlingen in je klas",""],
    ["◎",goals.length,"leerdoelen gevolgd",""],
    ["↗",classAvg+"%","klasgemiddelde",growing?`${growing} doelen groeien`:"Nog geen vergelijking"]
  ].map(x=>`<div class="metric"><div class="metric-top"><span class="metric-icon">${x[0]}</span><span class="trend">${x[3]}</span></div><strong>${x[1]}</strong><small>${x[2]}</small></div>`).join("");
  const top=goals.sort((a,b)=>groups[b].length-groups[a].length).slice(0,4);
  document.querySelector("#growthList").innerHTML=top.length?top.map(g=>{const a=avg(groups[g]);return`<div class="growth-row"><div class="growth-label"><strong>${g}</strong><small>${groups[g][0].test.subject} · ${groups[g].length} metingen</small></div><div class="bar"><i style="width:${a}%"></i></div><div class="growth-score">${a}%</div></div>`}).join(""):`<div class="empty">Voeg je eerste toets toe om groei per leerdoel te zien.</div>`;
  const attention=state.students.map(s=>{const rs=studentResults(s.id),tr=rs.length>1?rs.at(-1).pct-rs.slice(-3,-1).reduce((a,r)=>a+r.pct,0)/Math.min(2,rs.length-1):0;return{s,score:avg(rs),tr}}).filter(x=>x.score<65||x.tr<-8).sort((a,b)=>a.score-b.score).slice(0,4);
  document.querySelector("#attentionList").innerHTML=attention.length?attention.map(x=>`<div class="attention-item"><span class="avatar">${initials(x.s.name)}</span><div><strong>${x.s.name}</strong><small>${x.score}% gemiddeld</small></div><span class="status ${x.tr<0?"down":"up"}">${x.tr<0?"↓":"→"} ${Math.abs(Math.round(x.tr))}%</span></div>`).join(""):`<div class="empty">Nog geen opvallende dalingen. Mooi zo.</div>`;
  document.querySelector("#recentTests").innerHTML=periodTests.length?periodTests.sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,4).map(testRow).join(""):`<div class="empty">Nog geen toetsen in deze rapportperiode.</div>`;
}
function testRow(t){const vals=state.students.flatMap(s=>t.questions.map(q=>({value:t.scores?.[s.id]?.[q.id],max:q.max}))).filter(r=>r.value!==""&&r.value!=null);const sc=pct(vals.reduce((a,r)=>a+(+r.value),0),vals.reduce((a,r)=>a+(+r.max),0));return`<div class="test-row"><div><span class="subject-dot">${t.subject==="Wiskunde"?"∑":t.subject==="Nederlands"?"Aa":"⌁"}</span><strong>${t.title}</strong><small>${t.domain}</small></div><small>${new Date(t.date).toLocaleDateString("nl-BE")}</small><small>${t.questions.length} vragen</small><span class="score-badge">${sc||"—"}${sc?"%":""}</span><button class="icon-btn" onclick="openScores('${t.id}')" title="Scores bekijken">›</button></div>`}
function renderStudents(){
  document.querySelector("#studentGrid").innerHTML=state.students.length?state.students.map(s=>{const rs=studentResults(s.id);return`<div class="student-card"><span class="avatar">${initials(s.name)}</span><div><strong>${s.name}</strong><br><small>${rs.length} metingen · ${avg(rs)||"—"}${rs.length?"%":""}</small></div><button class="icon-btn" onclick="removeStudent('${s.id}')" aria-label="Verwijder ${s.name}">×</button></div>`}).join(""):`<div class="empty">Je klaslijst is nog leeg. Voeg je leerlingen toe om te starten.</div>`;
}
function renderTests(){
  const ts=state.tests.filter(t=>filterSubject==="Alle"||t.subject===filterSubject);
  document.querySelector("#testList").innerHTML=ts.length?ts.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(t=>`<article class="test-card"><div><h3>${t.title}</h3><p>${new Date(t.date).toLocaleDateString("nl-BE")} · Periode ${t.period}</p></div><div><strong>${t.subject}</strong><p>${t.domain}</p></div><div><strong>${t.questions.length} vragen</strong><p>${new Set(t.questions.map(q=>q.goal)).size} leerdoelen</p></div><div><button class="button ghost" onclick="openScores('${t.id}')">Scores</button> <button class="icon-btn" onclick="deleteTest('${t.id}')">×</button></div></article>`).join(""):`<div class="empty">Geen toetsen gevonden.</div>`;
}
function renderAnalysisSelectors(){
  const el=document.querySelector("#analysisStudent"),old=el.value;el.innerHTML=`<option value="class">Hele klas</option>`+state.students.map(s=>`<option value="${s.id}">${s.name}</option>`).join("");if([...el.options].some(o=>o.value===old))el.value=old;
}
function renderAnalysis(){
  const sid=document.querySelector("#analysisStudent").value||"class",subject=document.querySelector("#analysisSubject").value;
  const groups=sid==="class"?classGoalGroups():goalGroups(sid);
  const entries=Object.entries(groups).filter(([,rs])=>subject==="Alle"||rs[0].test.subject===subject);
  const name=sid==="class"?"de klas":state.students.find(s=>s.id===sid)?.name;
  const best=[...entries].sort((a,b)=>trend(b[1])-trend(a[1]))[0],risk=[...entries].sort((a,b)=>trend(a[1])-trend(b[1]))[0];
  document.querySelector("#analysisContent").innerHTML=`<div class="analysis-grid"><div>${entries.length?entries.map(([g,rs])=>`<article class="goal-card"><div class="goal-head"><div><h3>${g}</h3><p>${rs[0].test.subject} · ${rs.length} metingen</p></div><span class="status ${trend(rs)>=0?"up":"down"}">${trend(rs)>=0?"↑":"↓"} ${Math.abs(trend(rs))}%</span></div><div class="spark">${rs.slice(-7).map(r=>`<span style="height:${r.pct}%"><b>${r.pct}</b></span>`).join("")}</div></article>`).join(""):`<div class="empty">Nog onvoldoende gegevens voor deze keuze.</div>`}</div><aside class="insight"><p class="eyebrow">SLIM INZICHT</p><h2>${name} in beeld</h2><p>${best?`De duidelijkste groei zien we bij <strong>${best[0]}</strong> (${trend(best[1])>=0?"+":""}${trend(best[1])}%).`:"Voeg minstens twee toetsen met hetzelfde leerdoel toe om evolutie te vergelijken."}</p>${risk&&trend(risk[1])<0?`<p>Let extra op <strong>${risk[0]}</strong>: de recente score ligt ${Math.abs(trend(risk[1]))}% lager dan de eerste meting.</p>`:""}</aside></div>`;
}
function feedbackFor(s){
  const groups=goalGroups(s.id),entries=Object.entries(groups),strong=entries.filter(([,r])=>avg(r)>=80).sort((a,b)=>avg(b[1])-avg(a[1])).slice(0,2),growth=entries.filter(([,r])=>r.length>1&&trend(r)>=8).sort((a,b)=>trend(b[1])-trend(a[1]))[0],focus=entries.filter(([,r])=>avg(r)<65||trend(r)<-8).sort((a,b)=>avg(a[1])-avg(b[1]))[0];
  if(!entries.length)return`${s.name} heeft in deze versie nog geen ingevoerde toetsresultaten. Zodra er scores zijn, verschijnt hier automatisch een persoonlijke feedbacktekst.`;
  const first=s.name.split(" ")[0];let txt=`${first} werkte deze rapportperiode met inzet aan de verschillende leerdoelen. `;
  if(strong.length)txt+=`${first} toont een sterke beheersing van ${strong.map(x=>x[0].toLowerCase()).join(" en ")}. `;
  if(growth)txt+=`Heel mooi is de vooruitgang bij ${growth[0].toLowerCase()}: over de verschillende toetsen heen groeide de score met ${trend(growth[1])} procentpunten. `;
  if(focus)txt+=`Een volgend oefenpunt is ${focus[0].toLowerCase()}. Met gerichte herhaling en voldoende tijd kan ${first} hierin verder groeien. `;
  else txt+=`De resultaten blijven mooi stabiel. Blijf met dezelfde zorg en nieuwsgierigheid verder werken. `;
  return txt;
}
function renderFeedback(){
  if(!feedbackStudent||!state.students.some(s=>s.id===feedbackStudent))feedbackStudent=state.students[0]?.id;
  document.querySelector("#feedbackStudents").innerHTML=state.students.map(s=>`<button class="feedback-student ${s.id===feedbackStudent?"active":""}" onclick="selectFeedback('${s.id}')"><span class="avatar">${initials(s.name)}</span><span><strong>${s.name}</strong><br><small>${studentResults(s.id).length} metingen</small></span></button>`).join("")||`<div class="empty">Voeg leerlingen toe.</div>`;
  const s=state.students.find(x=>x.id===feedbackStudent);document.querySelector("#feedbackEditor").innerHTML=s?`<p class="eyebrow">CONCEPT VOOR RAPPORT ${state.period}</p><h2>${s.name}</h2><div class="feedback-meta"><span>✓ kijkt over alle periodes</span><span>✓ benoemt groei</span><span>✓ positief geformuleerd</span></div><textarea id="feedbackText">${feedbackFor(s)}</textarea><div class="feedback-actions"><button class="button ghost" onclick="regenerateFeedback()">Opnieuw maken</button><button class="button primary" onclick="copyFeedback()">Kopieer tekst</button></div>`:`<div class="empty">Kies of voeg een leerling toe om feedback te maken.</div>`;
}
function switchView(view){activeView=view;document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===`view-${view}`));document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.view===view));const names={overzicht:"Goedemorgen, juf",leerlingen:"Je klas",toetsen:"Je puntenboek",analyse:"Groei doorheen de tijd",feedback:"Rapportfeedback"};document.querySelector("#pageTitle").textContent=names[view];window.scrollTo({top:0,behavior:"smooth"})}

function updateDomains(){const sub=document.querySelector("#testSubject").value;document.querySelector("#testDomain").innerHTML=DOMAINS[sub].map(d=>`<option>${d}</option>`).join("")}
function openNewTest(){
  if(!state.students.length){document.querySelector("#studentDialog").showModal();toast("Voeg eerst je klaslijst toe");return}
  testStep=1;draftQuestions=[];delete document.querySelector("#testForm").dataset.editId;document.querySelector("#testForm").reset();document.querySelector("#testDate").value=today();updateDomains();showStep();document.querySelector("#testDialog").showModal()
}
function showStep(){document.querySelectorAll(".step").forEach((e,i)=>e.classList.toggle("active",i===testStep-1));document.querySelectorAll(".steps span").forEach((e,i)=>e.classList.toggle("active",i<=testStep-1));document.querySelector("#prevStep").style.visibility=testStep===1?"hidden":"visible";document.querySelector("#nextStep").textContent=testStep===3?"Toets bewaren":"Volgende"}
function defaultQuestion(text="",n=draftQuestions.length+1){
  const domain=document.querySelector("#testDomain").value,all=GOALS[domain]||["Algemeen leerdoel"];let goal=all[0],low=(text||"").toLowerCase(),best=0;Object.entries(KEYWORDS).forEach(([g,ks])=>{if(!all.includes(g))return;const sc=ks.filter(k=>low.includes(k)).length;if(sc>best){best=sc;goal=g}});return{id:id(),label:`V${n}`,text:text.slice(0,120)||`Vraag ${n}`,goal,max:1}
}
function renderQuestionEditor(){const domain=document.querySelector("#testDomain").value,goals=GOALS[domain]||[];document.querySelector("#questionEditor").innerHTML=draftQuestions.map((q,i)=>`<div class="question-row" data-i="${i}"><label>Vraag<input data-k="label" value="${escapeHtml(q.label)}"></label><label>Omschrijving<input data-k="text" value="${escapeHtml(q.text)}"></label><label>Leerdoel<select data-k="goal">${goals.map(g=>`<option ${g===q.goal?"selected":""}>${g}</option>`).join("")}</select></label><label>Op<input type="number" min=".5" step=".5" data-k="max" value="${q.max}"></label><button type="button" class="icon-btn" onclick="removeQuestion(${i})">×</button></div>`).join("");document.querySelectorAll(".question-row input,.question-row select").forEach(el=>el.addEventListener("change",e=>{const i=+e.target.closest(".question-row").dataset.i;draftQuestions[i][e.target.dataset.k]=e.target.dataset.k==="max"?+e.target.value:e.target.value}))}
function buildScoreTable(existing){
  const totalMax=draftQuestions.reduce((sum,q)=>sum+(+q.max||0),0);
  document.querySelector("#scoreTable").innerHTML=`<thead><tr><th>Leerling</th>${draftQuestions.map(q=>`<th class="question-heading" title="${escapeHtml(q.text)}"><strong>${escapeHtml(q.label)}</strong><small>${escapeHtml(q.text)}</small><b>op ${q.max}</b></th>`).join("")}<th class="total-heading">Totaal<br><small>op ${totalMax}</small></th></tr></thead><tbody>${state.students.map(s=>`<tr data-score-row="${s.id}"><td><span class="avatar">${initials(s.name)}</span> <strong>${escapeHtml(s.name)}</strong></td>${draftQuestions.map(q=>`<td><input type="number" min="0" max="${q.max}" step=".5" aria-label="${escapeHtml(s.name)}, ${escapeHtml(q.label)}, op ${q.max}" data-student="${s.id}" data-question="${q.id}" data-max="${q.max}" value="${existing?.[s.id]?.[q.id]??""}"></td>`).join("")}<td class="total-cell"><strong class="total-value">—</strong><small class="total-percent"></small></td></tr>`).join("")}</tbody>`;
  document.querySelectorAll("#scoreTable input").forEach(input=>input.addEventListener("input",()=>updateScoreRow(input.closest("tr"))));
  document.querySelectorAll("#scoreTable tbody tr").forEach(updateScoreRow);
}
function scoreClass(value,max){
  if(value===""||value==null)return"";
  const ratio=(+value)/(+max||1);
  if(ratio<.5)return"score-low";
  if(ratio<=.6)return"score-middle";
  return"score-good";
}
function updateScoreRow(row){
  let achieved=0,possible=0,hasScore=false;
  row.querySelectorAll("input").forEach(input=>{
    input.classList.remove("score-low","score-middle","score-good","score-invalid");
    const max=+input.dataset.max;
    possible+=max;
    if(input.value==="")return;
    hasScore=true;
    const value=+input.value;
    if(value<0||value>max){input.classList.add("score-invalid");return}
    input.classList.add(scoreClass(value,max));
    achieved+=value;
  });
  const cell=row.querySelector(".total-cell"),valueEl=cell.querySelector(".total-value"),percentEl=cell.querySelector(".total-percent");
  cell.classList.remove("total-low","total-middle","total-good");
  if(!hasScore||!possible){valueEl.textContent="—";percentEl.textContent="";return}
  const percentage=Math.round(achieved/possible*100);
  valueEl.textContent=`${achieved} / ${possible}`;
  percentEl.textContent=`${percentage}%`;
  cell.classList.add(percentage<50?"total-low":percentage<=60?"total-middle":"total-good");
}
async function readPdf(file){
  const status=document.querySelector("#pdfStatus");status.textContent="Pdf wordt gelezen…";
  try{if(!window.pdfjsLib){await new Promise((res,rej)=>{const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";s.onload=res;s.onerror=rej;document.head.appendChild(s)});pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"}
    const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;let text="";for(let p=1;p<=pdf.numPages;p++){const page=await pdf.getPage(p),content=await page.getTextContent();text+=" "+content.items.map(x=>x.str).join(" ")}
    const chunks=text.split(/(?=(?:vraag\s*)?\d{1,2}[\.\):]\s)/i).map(x=>x.trim()).filter(x=>x.length>8).slice(0,15);draftQuestions=(chunks.length?chunks:[text]).slice(0,12).map((x,i)=>defaultQuestion(x,i+1));status.textContent=`✓ ${pdf.numPages} pagina${pdf.numPages>1?"'s":""} gelezen · ${draftQuestions.length} vragen voorgesteld`;
  }catch(e){draftQuestions=[defaultQuestion("",1),defaultQuestion("",2),defaultQuestion("",3)];status.textContent="De tekst kon niet automatisch worden gelezen. Je kunt de vragen handmatig aanvullen."}
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function saveTest(){
  const scores={};document.querySelectorAll("#scoreTable input").forEach(inp=>{scores[inp.dataset.student]??={};scores[inp.dataset.student][inp.dataset.question]=inp.value});
  const editId=document.querySelector("#testForm").dataset.editId;const t={id:editId||id(),title:document.querySelector("#testTitle").value||"Naamloze toets",date:document.querySelector("#testDate").value,subject:document.querySelector("#testSubject").value,domain:document.querySelector("#testDomain").value,period:+state.period,questions:draftQuestions,scores};
  const idx=state.tests.findIndex(x=>x.id===editId);if(idx>=0)state.tests[idx]=t;else state.tests.push(t);delete document.querySelector("#testForm").dataset.editId;save();document.querySelector("#testDialog").close();render();switchView("toetsen");toast("Toets en scores zijn bewaard")
}
function openScores(tid){const t=state.tests.find(x=>x.id===tid);if(!t)return;testStep=3;draftQuestions=structuredClone(t.questions);document.querySelector("#testTitle").value=t.title;document.querySelector("#testDate").value=t.date;document.querySelector("#testSubject").value=t.subject;updateDomains();document.querySelector("#testDomain").value=t.domain;document.querySelector("#testForm").dataset.editId=t.id;buildScoreTable(t.scores);showStep();document.querySelector("#testDialog").showModal()}
function removeStudent(sid){if(!confirm("Deze leerling uit de klaslijst verwijderen? De scores in bestaande toetsen blijven bewaard."))return;state.students=state.students.filter(s=>s.id!==sid);save();render()}
function deleteTest(tid){if(!confirm("Deze toets en alle ingevoerde scores verwijderen?"))return;state.tests=state.tests.filter(t=>t.id!==tid);save();render()}
function removeQuestion(i){draftQuestions.splice(i,1);renderQuestionEditor()}
function selectFeedback(sid){feedbackStudent=sid;renderFeedback()}
function copyFeedback(){navigator.clipboard.writeText(document.querySelector("#feedbackText").value);toast("Feedback gekopieerd")}
function regenerateFeedback(){const s=state.students.find(x=>x.id===feedbackStudent);document.querySelector("#feedbackText").value=feedbackFor(s);toast("Feedback opnieuw opgebouwd")}
function demo(){
  if(state.students.length&&!confirm("Voorbeeldgegevens toevoegen aan je huidige gegevens?"))return;
  const names=["Lina Peeters","Noah Janssens","Mila Vermeulen","Adam El Amrani","Louise De Smet","Finn Maes","Yara Jacobs","Arthur Willems"];const students=names.map(name=>({id:id(),name}));
  const makeTest=(title,date,subject,domain,goals,base)=>{const questions=goals.map((g,i)=>({id:id(),label:`V${i+1}`,text:`Oefening ${i+1}`,goal:g,max:5})),scores={};students.forEach((s,si)=>{scores[s.id]={};questions.forEach((q,qi)=>{scores[s.id][q.id]=Math.max(1,Math.min(5,Math.round((base+((si*7+qi*11)%35))/20)))})});return{id:id(),title,date,subject,domain,period:date<"2026-01-01"?1:2,questions,scores}};
  const tests=[
    makeTest("Getallen tot 100","2025-10-08","Wiskunde","Getallen",GOALS.Getallen.slice(0,2),50),
    makeTest("Herhaling getallen","2025-12-03","Wiskunde","Getallen",GOALS.Getallen.slice(0,2),60),
    makeTest("Lezen: De herfst","2025-11-14","Nederlands","Begrijpend lezen",GOALS["Begrijpend lezen"].slice(0,2),55),
    makeTest("Getallen en splitsen","2026-02-12","Wiskunde","Getallen",GOALS.Getallen.slice(0,2),68),
    makeTest("Lezen: Op reis","2026-02-22","Nederlands","Begrijpend lezen",GOALS["Begrijpend lezen"].slice(0,2),66)
  ];state={students:[...state.students,...students],tests:[...state.tests,...tests],period:2};save();render();toast("Voorbeeldklas en toetsen toegevoegd")
}

document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>switchView(b.dataset.view)));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>switchView(b.dataset.go)));
document.querySelectorAll("[data-action='new-test']").forEach(b=>b.addEventListener("click",openNewTest));
document.querySelector("#addStudentsBtn").addEventListener("click",()=>document.querySelector("#studentDialog").showModal());
document.querySelector("#syncStudentsBtn").addEventListener("click",async()=>{
  const button=document.querySelector("#syncStudentsBtn"),label=button.textContent;
  button.disabled=true;button.textContent="Klaslijst ophalen…";
  try{
    if(typeof window.haalTweedeLeerjaarOp!=="function")throw new Error("De koppeling met klaslijsten is nog niet geladen.");
    const resultaat=await window.haalTweedeLeerjaarOp();
    const leerlingen=Array.isArray(resultaat)?resultaat:resultaat.leerlingen;
    const bronSchooljaar=Array.isArray(resultaat)?"":resultaat.schooljaar;
    const bestaand=new Map(state.students.map(s=>[s.name.toLowerCase(),s]));
    leerlingen.forEach(leerling=>{
      const sleutel=leerling.name.toLowerCase();
      if(!bestaand.has(sleutel)){
        state.students.push({id:leerling.id||id(),name:leerling.name,schoolbeheerId:leerling.id});
      }
    });
    save();render();toast(`${leerlingen.length} leerlingen uit klas 2A (${bronSchooljaar}) ingelezen`);
  }catch(error){toast(error.message||"Klaslijst ophalen is niet gelukt")}
  finally{button.disabled=false;button.textContent=label}
});
document.querySelector("#saveStudentsBtn").addEventListener("click",e=>{e.preventDefault();const names=document.querySelector("#studentNames").value.split(/\r?\n|;/).map(x=>x.trim()).filter(Boolean);names.forEach(name=>state.students.push({id:id(),name}));document.querySelector("#studentNames").value="";save();document.querySelector("#studentDialog").close();render();toast(`${names.length} leerling${names.length===1?"":"en"} toegevoegd`)});
document.querySelector("#periodeSelect").addEventListener("change",e=>{state.period=+e.target.value;save();render()});
document.querySelector("#testSubject").addEventListener("change",updateDomains);
document.querySelector("#testPdf").addEventListener("change",e=>e.target.files[0]&&readPdf(e.target.files[0]));
document.querySelector("#addQuestionBtn").addEventListener("click",()=>{draftQuestions.push(defaultQuestion());renderQuestionEditor()});
document.querySelector("#prevStep").addEventListener("click",()=>{testStep=Math.max(1,testStep-1);showStep()});
document.querySelector("#cancelTestBtn").addEventListener("click",()=>{
  delete document.querySelector("#testForm").dataset.editId;
  document.querySelector("#testDialog").close();
});
document.querySelector("#nextStep").addEventListener("click",()=>{if(testStep===1){if(!document.querySelector("#testTitle").value||!document.querySelector("#testDate").value){toast("Vul eerst de titel en datum in");return}if(!draftQuestions.length)draftQuestions=[defaultQuestion("",1),defaultQuestion("",2),defaultQuestion("",3)];renderQuestionEditor()}if(testStep===2)buildScoreTable();if(testStep===3){saveTest();return}testStep++;showStep()});
document.querySelectorAll(".filter").forEach(b=>b.addEventListener("click",()=>{filterSubject=b.dataset.subject;document.querySelectorAll(".filter").forEach(x=>x.classList.toggle("active",x===b));renderTests()}));
document.querySelector("#analysisStudent").addEventListener("change",renderAnalysis);document.querySelector("#analysisSubject").addEventListener("change",renderAnalysis);
document.querySelector("#copyAllBtn").addEventListener("click",()=>{navigator.clipboard.writeText(state.students.map(s=>`${s.name}\n${feedbackFor(s)}`).join("\n\n"));toast("Alle feedback gekopieerd")});
document.querySelector("#demoBtn").addEventListener("click",demo);
document.querySelector("#pageEyebrow").textContent=new Date().toLocaleDateString("nl-BE",{weekday:"long",day:"numeric",month:"long"});
window.openScores=openScores;window.removeStudent=removeStudent;window.deleteTest=deleteTest;window.removeQuestion=removeQuestion;window.selectFeedback=selectFeedback;window.copyFeedback=copyFeedback;window.regenerateFeedback=regenerateFeedback;
render();
