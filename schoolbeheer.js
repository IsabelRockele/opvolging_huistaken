import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, onSnapshot, collection, query, where, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

const GROEPEN = [
  { id: "graad1", naam: "1A + 2A", klassen: ["1A", "2A"] },
  { id: "graad2", naam: "3A + 4A", klassen: ["3A", "4A"] },
  { id: "graad3", naam: "5A + 6A", klassen: ["5A", "6A"] }
];

const $ = id => document.getElementById(id);
const esc = value => String(value == null ? "" : value)
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const today = () => new Date().toISOString().slice(0, 10);
const currentSchooljaar = () => "2026-2027";

let user = null;
let rol = "";
let toegelatenKlassen = [];
let actieveGroep = null;
let actieveKlas = null;
let data = null;
let unsub = null;
let dirty = false;
let saveTimer = null;
// schoolbeheer-demo-js-codex
let demoMode = false;
// schoolbeheer-demo-rollen-js-codex
let demoRol = "";
// demo-rolwissel-js-codex
// meldingen-afvinken-js-codex
let demoStore = {};
// schoolbeheer-secretariaat-indeling-js-codex
// schoolbeheer-admin-verwerking-js-codex
// schoolbeheer-admin-datums-js-codex
// nieuw-schooljaar-demo-js-codex
// standaard-vrije-dagen-js-codex
// schoolbeheer-klasfocus-js-codex

function vulDemoData() {
  if (!data || !actieveKlas) return;
  const k = klasData();
  if (!k.leerlingen.length) {
    k.leerlingen = [
      { id: uid(), firstName: "Noor", lastName: "Peeters", startDatum: schooljaarStartDatum(), eindDatum: schooljaarEindDatum(), kindCollega: false },
      { id: uid(), firstName: "Lina", lastName: "Janssens", startDatum: schooljaarStartDatum(), eindDatum: schooljaarEindDatum(), kindCollega: true },
      { id: uid(), firstName: "Milan", lastName: "Vermeulen", startDatum: schooljaarStartDatum(), eindDatum: schooljaarEindDatum(), kindCollega: false },
      { id: uid(), firstName: "Aya", lastName: "Benali", startDatum: schooljaarStartDatum(), eindDatum: schooljaarEindDatum(), kindCollega: false },
      { id: uid(), firstName: "Ferre", lastName: "De Smet", startDatum: schooljaarStartDatum(), eindDatum: schooljaarEindDatum(), kindCollega: false }
    ];
  }
}




function alleKlassen() {
  return GROEPEN.flatMap(g => g.klassen);
}





const STANDAARD_VRIJE_DAGEN = {
  "2026-2027": [
    { naam: "Herfstvakantie", start: "2026-11-02", end: "2026-11-08" },
    { naam: "Wapenstilstand", start: "2026-11-11", end: "2026-11-11" },
    { naam: "Kerstvakantie", start: "2026-12-21", end: "2027-01-03" },
    { naam: "Krokusvakantie", start: "2027-02-08", end: "2027-02-14" },
    { naam: "Paasvakantie", start: "2027-03-29", end: "2027-04-11" },
    { naam: "Dag van de Arbeid", start: "2027-05-01", end: "2027-05-01" },
    { naam: "Hemelvaart", start: "2027-05-06", end: "2027-05-07" },
    { naam: "Pinkstermaandag", start: "2027-05-17", end: "2027-05-17" },
    { naam: "Zomervakantie", start: "2027-07-01", end: "2027-08-31" }
  ],
  "2027-2028": [
    { naam: "Herfstvakantie", start: "2027-11-01", end: "2027-11-07" },
    { naam: "Wapenstilstand", start: "2027-11-11", end: "2027-11-11" },
    { naam: "Kerstvakantie", start: "2027-12-27", end: "2028-01-09" },
    { naam: "Krokusvakantie", start: "2028-02-28", end: "2028-03-05" },
    { naam: "Paasvakantie", start: "2028-04-03", end: "2028-04-17" },
    { naam: "Dag van de Arbeid", start: "2028-05-01", end: "2028-05-01" },
    { naam: "Hemelvaart", start: "2028-05-25", end: "2028-05-26" },
    { naam: "Pinkstermaandag", start: "2028-06-05", end: "2028-06-05" },
    { naam: "Zomervakantie", start: "2028-07-01", end: "2028-08-31" }
  ],
  "2028-2029": [
    { naam: "Herfstvakantie", start: "2028-10-30", end: "2028-11-05" },
    { naam: "Wapenstilstand", start: "2028-11-11", end: "2028-11-11" },
    { naam: "Kerstvakantie", start: "2028-12-25", end: "2029-01-07" },
    { naam: "Krokusvakantie", start: "2029-02-12", end: "2029-02-18" },
    { naam: "Paasvakantie", start: "2029-04-02", end: "2029-04-15" },
    { naam: "Dag van de Arbeid", start: "2029-05-01", end: "2029-05-01" },
    { naam: "Hemelvaart", start: "2029-05-10", end: "2029-05-11" },
    { naam: "Pinkstermaandag", start: "2029-05-21", end: "2029-05-21" },
    { naam: "Zomervakantie", start: "2029-07-01", end: "2029-08-31" }
  ],
  "2029-2030": [
    { naam: "Herfstvakantie", start: "2029-10-29", end: "2029-11-04" },
    { naam: "Wapenstilstand", start: "2029-11-11", end: "2029-11-11" },
    { naam: "Kerstvakantie", start: "2029-12-24", end: "2030-01-06" },
    { naam: "Krokusvakantie", start: "2030-03-04", end: "2030-03-10" },
    { naam: "Paasvakantie", start: "2030-04-08", end: "2030-04-22" },
    { naam: "Dag van de Arbeid", start: "2030-05-01", end: "2030-05-01" },
    { naam: "Hemelvaart", start: "2030-05-30", end: "2030-05-31" },
    { naam: "Pinkstermaandag", start: "2030-06-10", end: "2030-06-10" },
    { naam: "Zomervakantie", start: "2030-07-01", end: "2030-08-31" }
  ]
};

function datumsTussen(start, end) {
  const result = [];
  const d = new Date(start + "T00:00:00");
  const last = new Date(end + "T00:00:00");
  while (d <= last) {
    result.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return result;
}

function standaardVrijeDagenVoorSchooljaar(schooljaar) {
  return STANDAARD_VRIJE_DAGEN[schooljaar || currentSchooljaar()] || [];
}

function renderStandaardVrijeDagenLijst() {
  const el = $("standaardVrijeDagenLijst");
  if (!el) return;
  const schooljaar = data?.schooljaar || currentSchooljaar();
  const items = standaardVrijeDagenVoorSchooljaar(schooljaar);
  if (!items.length) {
    el.innerHTML = `<p class="muted">Voor ${esc(schooljaar)} staat nog geen standaardkalender klaar. Die vullen we dan aan op basis van de officiele Vlaamse kalender.</p>`;
    return;
  }
  el.innerHTML = `<ul>${items.map(item => `<li><strong>${esc(item.naam)}</strong>: ${esc(item.start)}${item.end !== item.start ? " t.e.m. " + esc(item.end) : ""}</li>`).join("")}</ul>`;
}
const DOORSCHUIF = {
  "1A": "2A",
  "2A": "3A",
  "3A": "4A",
  "4A": "5A",
  "5A": "6A",
  "6A": "uit school"
};

function volgendSchooljaar(jaar) {
  const start = Number((jaar || currentSchooljaar()).slice(0, 4)) + 1;
  return `${start}-${start + 1}`;
}

function renderNieuwSchooljaar() {
  const volgend = volgendSchooljaar(data?.schooljaar || currentSchooljaar());
  const cards = alleKlassen().map(klas => {
    const naar = DOORSCHUIF[klas] || "onbekend";
    const groep = GROEPEN.find(g => g.klassen.includes(klas));
    const bronKlas = data?.klassen?.[klas] || { leerlingen: [] };
    const leerlingen = [...(bronKlas.leerlingen || [])].sort((a, b) => leerlingNaam(a).localeCompare(leerlingNaam(b), "nl"));
    return `<div class="overgang-card">
      <h3><span>${esc(klas)} naar ${esc(naar)}</span><span class="tag">${leerlingen.length} leerlingen</span></h3>
      <p class="muted">Vink leerlingen aan die in ${esc(klas)} blijven zitten. Niet aangevinkt schuift door.</p>
      <div class="overgang-list">
        ${leerlingen.length ? leerlingen.map(s => `<label><input type="checkbox" data-klas="${klas}" data-id="${s.id}"> ${esc(leerlingNaam(s))}</label>`).join("") : '<span class="muted">Nog geen leerlingen in deze klas.</span>'}
      </div>
    </div>`;
  }).join("");

  return `<section class="panel">
    <h2>Nieuw schooljaar voorbereiden</h2>
    <p class="muted">Demo voor ${esc(volgend)}. In de echte versie maakt dit een nieuw schooljaar aan zonder het huidige schooljaar te wissen.</p>
    <div class="notice" style="margin-bottom:12px">
      Werking: 1A naar 2A, 2A naar 3A, 3A naar 4A, 4A naar 5A, 5A naar 6A. Zittenblijvers blijven in hun huidige klas. 6A gaat uit school/archief.
    </div>
    <div class="overgang-grid">${cards}</div>
    <div class="actions" style="justify-content:flex-start;margin-top:14px">
      <button type="button" onclick="nieuwSchooljaarDemoMaken()">Demo-overzicht maken</button>
    </div>
    <div id="nieuwSchooljaarResultaat"></div>
  </section>`;
}

window.nieuwSchooljaarDemoMaken = function() {
  const resultaat = {};
  alleKlassen().forEach(k => resultaat[k] = []);

  alleKlassen().forEach(klas => {
    const naar = DOORSCHUIF[klas];
    const leerlingen = data?.klassen?.[klas]?.leerlingen || [];
    leerlingen.forEach(s => {
      const blijft = document.querySelector(`input[data-klas="${klas}"][data-id="${s.id}"]`)?.checked;
      if (blijft) resultaat[klas].push(`${leerlingNaam(s)} (blijft zitten)`);
      else if (naar && naar !== "uit school") resultaat[naar].push(leerlingNaam(s));
    });
  });

  const html = `<section class="panel" style="margin-top:12px">
    <h2>Demo-resultaat nieuw schooljaar</h2>
    <div class="overgang-grid">
      ${alleKlassen().map(klas => `<div class="overgang-card"><h3>${klas}</h3>${resultaat[klas].length ? `<ul>${resultaat[klas].map(n => `<li>${esc(n)}</li>`).join("")}</ul>` : '<p class="muted">Nog leeg. Secretariaat vult nieuwe leerlingen later aan.</p>'}</div>`).join("")}
    </div>
    <p class="muted" style="margin-top:10px">Dit is alleen een demo. Er wordt nog niets opgeslagen.</p>
  </section>`;
  $("nieuwSchooljaarResultaat").innerHTML = html;
};
function schooljaarStartDatum() {
  const jaar = (data?.schooljaar || currentSchooljaar()).slice(0, 4);
  return `${jaar}-09-01`;
}

function schooljaarEindDatum() {
  const einde = (data?.schooljaar || currentSchooljaar()).slice(5, 9);
  return `${einde}-07-30`;
}

function isStandaardStart(datum) {
  return !datum || datum === schooljaarStartDatum();
}

function isStandaardEinde(datum) {
  return !datum || datum === schooljaarEindDatum();
}

window.openAdminSubpanel = function(name) {
  const map = {
    klaslijsten: "adminSubKlaslijsten",
    vrijeDagen: "adminSubVrijeDagen",
    meldingen: "adminSubMeldingen",
    nieuwSchooljaar: "adminSubNieuwSchooljaar"
  };
  Object.values(map).forEach(id => {
    const el = $(id);
    if (el) el.classList.remove("active");
  });
  const doel = $(map[name]);
  if (!doel) return;

  if (name === "klaslijsten") {
    doel.innerHTML = $("panel-leerlingen").innerHTML;
  } else if (name === "vrijeDagen") {
    doel.innerHTML = $("panel-vrije-dagen") ? $("panel-vrije-dagen").innerHTML : "";
  } else if (name === "meldingen") {
    doel.innerHTML = $("panel-meldingen") ? $("panel-meldingen").innerHTML : "";
  } else if (name === "nieuwSchooljaar") {
    doel.innerHTML = renderNieuwSchooljaar();
  }
  doel.classList.add("active");
  renderAlles();
};
function refterVerwerktOpslaan() {
  if (!isSecretariaat()) return alert("Alleen secretariaat/directie kan verwerken.");
  data.secretariaat.verwerktTot.refter = $("refterVerwerktTotInput")?.value || "";
  markDirty();
  renderAlles();
}

window.activiteitVerwerktToggle = function(actId) {
  if (!isSecretariaat()) return alert("Alleen secretariaat/directie kan verwerken.");
  const act = klasData().activiteiten.find(a => a.id === actId);
  if (!act) return;
  act.verwerkt = !act.verwerkt;
  act.verwerktOp = act.verwerkt ? today() : "";
  act.verwerktDoor = act.verwerkt ? (user?.email || "demo secretariaat") : "";
  markDirty();
  renderAlles();
};

window.aankoopVerwerktToggle = function(aankoopId) {
  if (!isSecretariaat()) return alert("Alleen secretariaat/directie kan verwerken.");
  const aankoop = klasData().aankopen.find(a => a.id === aankoopId);
  if (!aankoop) return;
  aankoop.verwerkt = !aankoop.verwerkt;
  aankoop.verwerktOp = aankoop.verwerkt ? today() : "";
  aankoop.verwerktDoor = aankoop.verwerkt ? (user?.email || "demo secretariaat") : "";
  markDirty();
  renderAlles();
};
function renderKlassenSnelkeuze() {
  const box = $("klassenSnelkeuze");
  if (!box || !actieveGroep) return;
  const klassen = isSecretariaat() ? alleKlassen() : actieveGroep.klassen;
  box.innerHTML = klassen.map(klas => `<button type="button" class="ghost small ${klas === actieveKlas ? "active" : ""}" onclick="wisselKlas('${klas}')">${esc(klas)}</button>`).join("");
}

window.wisselKlas = function(klas) {
  const nieuweGroep = GROEPEN.find(g => g.klassen.includes(klas));
  if (nieuweGroep && nieuweGroep.id !== actieveGroep.id) {
    // Andere groep = apart Firebase-document -> volledig herladen
    openGroep(nieuweGroep.id, klas);
  } else {
    // Zelfde groep, enkel actieve klas wisselen
    actieveKlas = klas;
    const wissel = $("klasWissel");
    if (wissel) wissel.value = klas;
    renderAlles();
  }
};

function renderDeadlineKlassen() {
  const box = $("deadlineKlassen");
  if (!box) return;
  box.innerHTML = alleKlassen().map(klas => `<label><input type="checkbox" value="${klas}" checked> ${klas}</label>`).join("");
}

function renderVrijeDagenLijst() {
  const box = $("vrijeDagenLijst");
  if (!box || !data) return;
  const dagen = data.secretariaat?.vrijeDagen || [];
  box.innerHTML = dagen.length ? dagen.map(d => `<div class="vrije-dag-rij"><div><strong>${esc(d.datum || "")}</strong><br><span class="muted">${esc(d.notitie || "")}</span></div></div>`).join("") : `<div class="empty">Nog geen extra vrije dagen toegevoegd.</div>`;
}

function vrijeDagToevoegen() {
  if (!isSecretariaat()) return alert("Alleen secretariaat/directie kan vrije dagen toevoegen.");
  const datum = $("vrijeDagDatum").value;
  const notitie = $("vrijeDagReden").value.trim();
  if (!datum) return alert("Kies een datum.");
  data.secretariaat.vrijeDagen.push({ datum, notitie });
  $("vrijeDagDatum").value = "";
  $("vrijeDagReden").value = "";
  markDirty();
  renderAlles();
}
function setDemoRol(mode) {
  demoMode = true;
  demoRol = mode;
  rol = mode === "secretariaat" ? "secretariaat" : "";
  document.body.classList.toggle("demo-leerkracht", mode === "leerkracht");
  document.body.classList.toggle("demo-secretariaat", mode === "secretariaat");
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
  if (mode === "secretariaat") {
    document.querySelector('.tab[data-tab="administratie"]')?.classList.add("active");
    $("panel-administratie")?.classList.add("active");
  } else {
    document.querySelector('.tab[data-tab="leerlingen"]')?.classList.add("active");
    $("panel-leerlingen")?.classList.add("active");
  }
}


function meldingGeldtVoorKlas(melding, klas) {
  const klassen = melding.klassen || [];
  return !klassen.length || klassen.includes(klas);
}

function meldingIsVerlopen(melding) {
  return melding.datum && melding.datum < today();
}

window.meldingInOrdeToggle = function(meldingId, checked) {
  const melding = (data.secretariaat.deadlines || []).find(m => m.id === meldingId);
  if (!melding) return;
  if (!melding.inOrde) melding.inOrde = {};
  if (checked) {
    melding.inOrde[actieveKlas] = {
      door: user?.email || "demo leerkracht",
      op: today()
    };
  } else {
    delete melding.inOrde[actieveKlas];
  }
  markDirty();
  renderAlles();
};

window.meldingArchiveer = function(meldingId) {
  if (!isSecretariaat()) return alert("Alleen secretariaat kan meldingen archiveren.");
  const melding = (data.secretariaat.deadlines || []).find(m => m.id === meldingId);
  if (!melding) return;
  melding.archief = !melding.archief;
  markDirty();
  renderAlles();
};

window.meldingVerwijder = function(meldingId) {
  if (!isSecretariaat()) return alert("Alleen secretariaat kan meldingen verwijderen.");
  if (!confirm("Deze melding verwijderen?")) return;
  data.secretariaat.deadlines = (data.secretariaat.deadlines || []).filter(m => m.id !== meldingId);
  markDirty();
  renderAlles();
};

function renderMeldingenBeheer() {
  const box = $("deadlinesLijst");
  if (!box || !data) return;
  const meldingen = data.secretariaat.deadlines || [];
  if (!meldingen.length) {
    box.innerHTML = `<div class="empty">Nog geen meldingen.</div>`;
    return;
  }

  box.innerHTML = meldingen.map(m => {
    const klassen = (m.klassen && m.klassen.length ? m.klassen : alleKlassen());
    const verlopen = meldingIsVerlopen(m);
    const statussen = klassen.map(klas => {
      const ok = !!m.inOrde?.[klas];
      return `<span class="${ok ? "ok" : ""}">${esc(klas)} ${ok ? "in orde" : "open"}</span>`;
    }).join("");
    return `<div class="melding-card ${m.archief ? "archief" : ""} ${verlopen && !m.archief ? "verlopen" : ""}">
      <div>
        <strong>${esc(m.tekst)}</strong>
        <div class="melding-meta">
          <span class="tag">${esc(m.onderdeel || "melding")}</span>
          <span class="tag">${esc(m.datum || "")}</span>
          ${verlopen && !m.archief ? '<span class="tag pink">verlopen</span>' : ""}
          ${m.archief ? '<span class="tag">archief</span>' : ""}
        </div>
        <div class="melding-klas-status">${statussen}</div>
      </div>
      <div class="melding-acties secretariaat-only">
        <button type="button" class="ghost small" onclick="meldingArchiveer('${m.id}')">${m.archief ? "Terug actief" : "Archiveren"}</button>
        <button type="button" class="danger small" onclick="meldingVerwijder('${m.id}')">Verwijderen</button>
      </div>
    </div>`;
  }).join("");
}
function renderRolInfo() {
  const titel = $("rolTitel");
  const uitleg = $("rolUitleg");
  if (!titel || !uitleg) return;

  if (demoRol === "secretariaat") {
    titel.textContent = `Secretariaat - ${actieveGroep.naam}`;
    uitleg.textContent = "Kies een klas, controleer lijsten, maak meldingen en blokkeer wat verwerkt is.";
  } else {
    titel.textContent = `Leerkracht - ${actieveKlas}`;
    uitleg.textContent = "Je ziet alleen je eigen klas. Secretariaat verwerkt en blokkeert achteraf.";
  }
}

function renderMeldingen() {
  const panel = $("meldingenPanel");
  if (!panel || !data) return;
  const deadlines = data.secretariaat?.deadlines || [];
  const verwerktTot = data.secretariaat?.verwerktTot?.refter || "";
  const items = [];
  deadlines
    .filter(d => !d.archief && meldingGeldtVoorKlas(d, actieveKlas))
    .forEach(d => {
      const ok = !!d.inOrde?.[actieveKlas];
      items.push(`${esc(d.tekst)} tegen ${esc(d.datum)} ${ok ? "(in orde)" : ""}`);
    });


  if (!items.length) {
    panel.classList.add("hidden");
    panel.innerHTML = "";
    return;
  }

  panel.classList.remove("hidden");
  const actieveMeldingen = deadlines.filter(d => !d.archief && meldingGeldtVoorKlas(d, actieveKlas));
  panel.innerHTML = `<h3>Meldingen secretariaat</h3><ul>${actieveMeldingen.map(d => {
    const ok = !!d.inOrde?.[actieveKlas];
    return `<li><label style="display:inline-flex;gap:6px;align-items:center;margin:0"><input type="checkbox" ${ok ? "checked" : ""} onchange="meldingInOrdeToggle('${d.id}', this.checked)"> ${esc(d.tekst)} tegen ${esc(d.datum)}${ok ? " - in orde" : ""}</label></li>`;
  }).join("")}</ul>${verwerktTot ? `<p class="muted" style="margin:6px 0 0">Refter is verwerkt tot en met ${esc(verwerktTot)}. Correcties voor die datum gaan via secretariaat.</p>` : ""}`;
}

async function openDemoAlsLeerkracht() {
  setDemoRol("leerkracht");
  await openDemoGroep("graad1", "2A");
}

async function openDemoAlsSecretariaat() {
  setDemoRol("secretariaat");
  await openDemoGroep("graad1", "1A");
}


function wisselDemoRol(mode) {
  if (!demoMode || !data || !actieveGroep) {
    if (mode === "leerkracht") return openDemoAlsLeerkracht();
    return openDemoAlsSecretariaat();
  }
  setDemoRol(mode);
  if (mode === "leerkracht" && !actieveKlas) actieveKlas = "2A";
  renderAlles();
  show("app");
  setStatus("Demo - gedeelde testdata", "dirty");
}
function terugNaarDemoKeuze() {
  demoRol = "";
  demoMode = false;
  demoStore = {};
  document.body.classList.remove("demo-leerkracht", "demo-secretariaat");
  show("setup");
  setStatus("Kies demo");
}
function isSchoolBreed() {
  return ["directie", "zorgcoordinator", "zorgleerkracht", "secretariaat"].includes(rol);
}

function isSecretariaat() {
  return demoRol === "secretariaat" || ["directie", "secretariaat"].includes(rol);
}

function setStatus(text, cls = "") {
  const el = $("saveStatus");
  el.textContent = text;
  el.className = "status " + cls;
}

function show(which) {
  $("loadingPanel").classList.toggle("hidden", which !== "loading");
  $("setupPanel").classList.toggle("hidden", which !== "setup");
  $("appPanel").classList.toggle("hidden", which !== "app");
  $("tabs").classList.toggle("hidden", which !== "app");
}

function emptyData(groep) {
  const klassen = {};
  groep.klassen.forEach(klas => {
    klassen[klas] = {
      leerlingen: [],
      refter: {},
      activiteiten: [],
      aankopen: []
    };
  });
  return {
    schooljaar: currentSchooljaar(),
    groepId: groep.id,
    groepNaam: groep.naam,
    klassen,
    secretariaat: {
      vrijeDagen: [],
      verwerktTot: { refter: "" },
      deadlines: []
    },
    gedeeld: {
      notitie: "",
      migratieVanOudKlasbeheer: false
    }
  };
}

async function laadRol() {
  const snap = await getDoc(doc(db, "schoolrollen", user.uid));
  rol = snap.exists() ? String(snap.data().rol || "").toLowerCase() : "";
}

async function laadKlassenVoorLeerkracht() {
  if (isSchoolBreed()) {
    toegelatenKlassen = GROEPEN.flatMap(g => g.klassen);
    return;
  }

  const email = (user.email || "").toLowerCase();
  const uidQuery = query(collection(db, "klasleerkrachten"), where("leerkracht_uids", "array-contains", user.uid));
  const emailQuery = query(collection(db, "klasleerkrachten"), where("leerkracht_emails", "array-contains", email));
  const snaps = await Promise.all([getDocs(uidQuery), getDocs(emailQuery)]);
  const found = new Set();
  snaps.forEach(snap => snap.docs.forEach(d => {
    const item = d.data();
    if (item && item.klas) found.add(String(item.klas).trim());
  }));
  toegelatenKlassen = [...found];
}

function groepenVoorUser() {
  if (demoMode || isSchoolBreed()) return GROEPEN;
  const groepen = GROEPEN.filter(g => g.klassen.some(k => toegelatenKlassen.includes(k)));
  return groepen.length ? groepen : GROEPEN;
}

function vulKeuzes() {
  const groepen = groepenVoorUser();
  $("groepSelect").innerHTML = groepen.map(g => `<option value="${g.id}">${esc(g.naam)}</option>`).join("");
  $("groepWissel").innerHTML = $("groepSelect").innerHTML;
  updateKlasSelects();
}

function updateKlasSelects() {
  const groepId = $("groepSelect").value || $("groepWissel").value || groepenVoorUser()[0]?.id;
  const groep = GROEPEN.find(g => g.id === groepId) || groepenVoorUser()[0];
  const klassen = isSchoolBreed() ? groep.klassen : groep.klassen.filter(k => toegelatenKlassen.includes(k));
  const options = klassen.map(k => `<option value="${k}">${k}</option>`).join("");
  $("klasSelect").innerHTML = options;
  $("klasWissel").innerHTML = options;
}

function docRef() {
  const schooljaar = $("schooljaarInput")?.value?.trim() || currentSchooljaar();
  return doc(db, "schoolbeheer_groepen", `${schooljaar}_${actieveGroep.id}`);
}


async function openDemoGroep(groepId, klas) {
  demoMode = true;
  if (!demoRol) setDemoRol("secretariaat");
  actieveGroep = GROEPEN.find(g => g.id === groepId);
  actieveKlas = klas || actieveGroep.klassen[0];
  if (!actieveGroep || !actieveKlas) return;

  $("groepWissel").value = actieveGroep.id;
  updateKlasSelects();
  $("klasWissel").value = actieveKlas;
  $("schooljaarInput").value = currentSchooljaar();

  const key = actieveGroep.id;
  if (!demoStore[key]) {
    data = emptyData(actieveGroep);
    vulDemoData();
    data.secretariaat.deadlines = [
      { id: uid(), tekst: "Refterlijst van deze maand nakijken", datum: today(), doel: "alle", groepId: actieveGroep.id },
      { id: uid(), tekst: "Aankopen badmuts en turnshirt doorgeven", datum: today(), doel: "alle", groepId: actieveGroep.id }
    ];
    demoStore[key] = data;
  } else {
    data = demoStore[key];
    normaliseer();
  }

  renderAlles();
  setStatus("Demo - gedeelde testdata", "dirty");
  show("app");
}
async function openGroep(groepId, klas) {
  actieveGroep = GROEPEN.find(g => g.id === groepId);
  actieveKlas = klas || actieveGroep.klassen[0];
  if (!actieveGroep || !actieveKlas) return;

  $("groepWissel").value = actieveGroep.id;
  updateKlasSelects();
  $("klasWissel").value = actieveKlas;
  $("schooljaarInput").value = currentSchooljaar();

  if (unsub) unsub();
  setStatus("Laden...");
  unsub = onSnapshot(docRef(), async snap => {
    if (snap.exists()) {
      data = snap.data();
      normaliseer();
      renderAlles();
      setStatus("Bewaard", "saved");
      show("app");
    } else {
      // Document bestaat nog niet in Firebase.
      // GEEN saveNow() hier - dat zou een leeg document wegschrijven
      // en eventueel bestaande data van een andere groep overschrijven.
      // Pas opslaan bij de eerste echte wijziging (markDirty -> saveNow).
      data = emptyData(actieveGroep);
      normaliseer();
      renderAlles();
      setStatus("Nieuwe klas – wordt bewaard bij eerste wijziging", "dirty");
      show("app");
    }
  }, err => {
    console.error(err);
    console.warn("Firebase niet toegankelijk, demo blijft mogelijk:", err);
    alert("Firebase laat deze nieuwe proefversie nog niet toe.\n\nGebruik voorlopig de knop: Demo openen zonder Firebase.\nDan kan je de schermen testen zonder iets echt te bewaren.");
    setStatus("Firebase nog niet klaar");
  });
}

function normaliseer() {
  if (!data.klassen) data.klassen = {};
  actieveGroep.klassen.forEach(klas => {
    if (!data.klassen[klas]) data.klassen[klas] = { leerlingen: [], refter: {}, activiteiten: [], aankopen: [] };
    const k = data.klassen[klas];
    if (!Array.isArray(k.leerlingen)) k.leerlingen = [];
    if (!k.refter) k.refter = {};
    if (!Array.isArray(k.activiteiten)) k.activiteiten = [];
    if (!Array.isArray(k.aankopen)) k.aankopen = [];
  });
  if (!data.secretariaat) data.secretariaat = {};
  if (!Array.isArray(data.secretariaat.vrijeDagen)) data.secretariaat.vrijeDagen = [];
  if (!data.secretariaat.verwerktTot) data.secretariaat.verwerktTot = {};
  if (!Array.isArray(data.secretariaat.deadlines)) data.secretariaat.deadlines = [];
  if (!data.gedeeld) data.gedeeld = {};
}

function klasData() {
  return data.klassen[actieveKlas];
}

function markDirty() {
  dirty = true;
  setStatus("Wijzigingen...", "dirty");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 500);
}

async function saveNow() {
  if (!data || !actieveGroep) return;
  if (demoMode) {
    dirty = false;
    setStatus("Demo - gedeelde testdata", "dirty");
    return;
  }
  clearTimeout(saveTimer);
  data.schooljaar = $("schooljaarInput")?.value?.trim() || data.schooljaar || currentSchooljaar();
  data.groepId = actieveGroep.id;
  data.groepNaam = actieveGroep.naam;
  await setDoc(docRef(), {
    ...data,
    updatedAt: serverTimestamp(),
    updatedBy: user.email || user.uid
  }, { merge: true });
  dirty = false;
  setStatus("Bewaard", "saved");
}

function parseNaam(line) {
  const clean = line.trim().replace(/\s+/g, " ");
  if (!clean) return null;
  if (clean.includes(",")) {
    const [lastName, ...rest] = clean.split(",");
    return { firstName: rest.join(",").trim(), lastName: lastName.trim() };
  }
  if (clean.includes("\t")) {
    const [lastName, firstName] = clean.split("\t");
    return { firstName: (firstName || "").trim(), lastName: (lastName || "").trim() };
  }
  const parts = clean.split(" ");
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts.at(-1) };
}

function leerlingNaam(s) {
  return s.lastName ? `${s.lastName}, ${s.firstName}` : s.firstName;
}

function sortLeerlingen() {
  klasData().leerlingen.sort((a, b) => {
    const last = (a.lastName || "").localeCompare(b.lastName || "", "nl");
    if (last) return last;
    return (a.firstName || "").localeCompare(b.firstName || "", "nl");
  });
}

function actieveLeerlingenVoorDatum(dateString) {
  return klasData().leerlingen.filter(s => {
    const startOk = !s.startDatum || s.startDatum <= dateString;
    const eindOk = !s.eindDatum || s.eindDatum >= dateString;
    return startOk && eindOk;
  });
}

function importLeerlingen() {
  const lines = $("klaslijstInput").value.split(/\r?\n/).map(parseNaam).filter(Boolean);
  if (!lines.length) return alert("Plak eerst een klaslijst.");
  const bestaande = new Set(klasData().leerlingen.map(s => `${(s.lastName || "").toLowerCase()}|${(s.firstName || "").toLowerCase()}`));
  let added = 0;
  lines.forEach(n => {
    const key = `${n.lastName.toLowerCase()}|${n.firstName.toLowerCase()}`;
    if (bestaande.has(key)) return;
    klasData().leerlingen.push({
      id: uid(),
      firstName: n.firstName,
      lastName: n.lastName,
      startDatum: schooljaarStartDatum(),
      eindDatum: schooljaarEindDatum(),
      kindCollega: false
    });
    bestaande.add(key);
    added++;
  });
  sortLeerlingen();
  $("klaslijstInput").value = "";
  markDirty();
  renderAlles();
  alert(`${added} leerling(en) toegevoegd.`);
}

function nieuweLeerling() {
  const lastName = prompt("Achternaam?");
  if (lastName == null) return;
  const firstName = prompt("Voornaam?");
  if (firstName == null || !firstName.trim()) return;
  const later = confirm("Start deze leerling later dan 1 september?");
  const startDatum = later ? (prompt("Startdatum?", schooljaarStartDatum()) || schooljaarStartDatum()) : schooljaarStartDatum();
  klasData().leerlingen.push({
    id: uid(),
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    startDatum,
    eindDatum: schooljaarEindDatum(),
    kindCollega: false
  });
  sortLeerlingen();
  markDirty();
  renderAlles();
}

window.studentUpdate = function(id, field, value) {
  const s = klasData().leerlingen.find(x => x.id === id);
  if (!s) return;
  if (field === "kindCollega") s.kindCollega = !!value;
  else s[field] = value;
  sortLeerlingen();
  markDirty();
  renderAlles();
};

window.studentEindDatum = function(id) {
  const s = klasData().leerlingen.find(x => x.id === id);
  if (!s) return;
  const datum = prompt("Vanaf welke datum verlaat deze leerling de school? Oude gegevens blijven bewaard tot deze datum.", s.eindDatum && s.eindDatum !== schooljaarEindDatum() ? s.eindDatum : today());
  if (datum == null) return;
  s.eindDatum = datum.trim();
  markDirty();
  renderAlles();
};

function renderLeerlingen() {
  $("leerlingenKlasTitel").textContent = actieveKlas;
  const students = [...klasData().leerlingen];
  if (!students.length) {
    $("leerlingenLijst").innerHTML = `<div class="empty">Nog geen leerlingen voor ${esc(actieveKlas)}.</div>`;
    renderAankoopLeerlingen();
    return;
  }
  $("leerlingenLijst").innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Naam</th><th>Kind collega</th><th>Uitzondering</th><th></th></tr></thead>
    <tbody>${students.map(s => {
      const startTag = isStandaardStart(s.startDatum) ? "" : `<span class="uitzondering-datum">start ${esc(s.startDatum)}</span>`;
      const eindTag = isStandaardEinde(s.eindDatum) ? "" : `<span class="uitzondering-datum">uitgeschreven ${esc(s.eindDatum)}</span>`;
      return `<tr class="${s.kindCollega ? "collega-kind" : ""}">
        <td><span class="student-name">${esc(leerlingNaam(s))}</span></td>
        <td><input type="checkbox" ${s.kindCollega ? "checked" : ""} onchange="studentUpdate('${s.id}','kindCollega',this.checked)"></td>
        <td>${startTag || eindTag ? startTag + " " + eindTag : '<span class="muted">geen</span>'}</td>
        <td><button class="ghost small" onclick="studentEindDatum('${s.id}')">Uitschrijven</button></td>
      </tr>`;
    }).join("")}</tbody>
  </table></div>`;
  renderAankoopLeerlingen();
}

function monthDays(month) {
  const [year, m] = month.split("-").map(Number);
  const days = new Date(year, m, 0).getDate();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(year, m - 1, i + 1);
    return {
      date: `${year}-${String(m).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`,
      day: i + 1,
      weekDay: d.getDay()
    };
  });
}

function vrijeDagMap() {
  const map = new Set();
  standaardVrijeDagenVoorSchooljaar(data?.schooljaar || currentSchooljaar()).forEach(item => {
    datumsTussen(item.start, item.end).forEach(datum => map.add(datum));
  });
  (data.secretariaat.vrijeDagen || []).forEach(item => {
    const datum = typeof item === "string" ? item.slice(0, 10) : item.datum;
    if (datum) map.add(datum);
  });
  return map;
}

function isRefterLocked(date) {
  const tot = data.secretariaat.verwerktTot?.refter || "";
  return !!tot && date <= tot && !isSecretariaat();
}

function renderRefter() {
  const month = $("refterMaand").value || today().slice(0, 7);
  $("refterMaand").value = month;
  $("refterVerwerktTotView").value = data.secretariaat.verwerktTot?.refter || "";
  if ($("refterVerwerktTotInput")) $("refterVerwerktTotInput").value = data.secretariaat.verwerktTot?.refter || "";
  const days = monthDays(month);
  const vrij = vrijeDagMap();
  const monthData = klasData().refter[month] || { afwezig: {} };
  klasData().refter[month] = monthData;
  const students = actieveLeerlingenVoorDatum(`${month}-28`);
  if (!students.length) {
    $("refterTabel").innerHTML = `<div class="empty">Geen actieve leerlingen in deze maand.</div>`;
    return;
  }
  $("refterTabel").innerHTML = `<div class="table-wrap"><table class="refter-table">
    <thead><tr><th>Leerling</th>${days.map(d => `<th class="day ${d.weekDay === 0 || d.weekDay === 3 || d.weekDay === 6 || vrij.has(d.date) ? "weekend" : ""}">${d.day}</th>`).join("")}</tr></thead>
    <tbody>${students.map(s => `<tr class="${s.kindCollega ? "collega-kind" : ""}">
      <td><span class="student-name">${esc(leerlingNaam(s))}</span>${s.kindCollega ? ' <span class="tag green">collega</span>' : ''}</td>
      ${days.map(d => {
        const grijs = d.weekDay === 0 || d.weekDay === 3 || d.weekDay === 6 || vrij.has(d.date);
        const locked = isRefterLocked(d.date);
        if (grijs) return `<td class="day vrije-dag">-</td>`;
        const checked = !!monthData.afwezig?.[s.id]?.[d.date];
        return `<td class="day ${locked ? "locked-cell processed-row" : ""}"><input type="checkbox" ${checked ? "checked" : ""} ${locked ? "disabled" : ""} onchange="refterToggle('${month}','${s.id}','${d.date}',this.checked)">${locked ? "<br><span class=\"processed-pill\">verwerkt</span>" : ""}</td>`;
      }).join("")}
    </tr>`).join("")}</tbody>
  </table></div>`;
}

window.refterToggle = function(month, studentId, date, checked) {
  const monthData = klasData().refter[month] || { afwezig: {} };
  if (!monthData.afwezig) monthData.afwezig = {};
  if (!monthData.afwezig[studentId]) monthData.afwezig[studentId] = {};
  if (checked) monthData.afwezig[studentId][date] = true;
  else delete monthData.afwezig[studentId][date];
  klasData().refter[month] = monthData;
  markDirty();
};

function activiteitToevoegen() {
  const naam = $("actNaam").value.trim();
  const datum = $("actDatum").value || today();
  const prijs = Number($("actPrijs").value || 0);
  if (!naam) return alert("Vul een naam voor de activiteit in.");
  klasData().activiteiten.push({ id: uid(), naam, datum, prijs, afwezig: {}, verwerkt: false });
  $("actNaam").value = "";
  $("actPrijs").value = "0";
  markDirty();
  renderActiviteiten();
}

window.activiteitAfwezig = function(actId, studentId, checked) {
  const act = klasData().activiteiten.find(a => a.id === actId);
  if (!act) return;
  if (!act.afwezig) act.afwezig = {};
  if (checked) act.afwezig[studentId] = true;
  else delete act.afwezig[studentId];
  markDirty();
};

function renderActiviteiten() {
  $("activiteitenKlasTitel").textContent = actieveKlas;
  const list = klasData().activiteiten || [];
  if (!list.length) {
    $("activiteitenLijst").innerHTML = `<div class="empty">Nog geen activiteiten.</div>`;
    return;
  }
  const students = actieveLeerlingenVoorDatum(today());
  $("activiteitenLijst").innerHTML = list.map(act => `<div class="list-card">
    <h3>${esc(act.naam)} <span class="tag blue">${esc(act.datum)}</span> <span class="tag">${Number(act.prijs || 0).toFixed(2)} euro</span> ${act.verwerkt ? '<span class="processed-pill">verwerkt</span>' : ""}</h3>
    <p class="muted">${act.verwerkt ? "Verwerkt door secretariaat. Correcties verlopen via secretariaat." : "Vink afwezige leerlingen aan."}</p>
    <div class="actions secretariaat-only" style="justify-content:flex-start;margin-bottom:8px"><button type="button" class="secondary small" onclick="activiteitVerwerktToggle('${act.id}')">${act.verwerkt ? "Verwerking terug openen" : "Activiteit verwerkt"}</button></div>
    <div class="table-wrap"><table>
      <thead><tr><th>Leerling</th><th>Afwezig</th></tr></thead>
      <tbody>${students.map(s => `<tr class="${act.verwerkt ? "processed-row" : ""}"><td>${esc(leerlingNaam(s))}</td><td><input type="checkbox" ${act.afwezig?.[s.id] ? "checked" : ""} ${act.verwerkt && !isSecretariaat() ? "disabled" : ""} onchange="activiteitAfwezig('${act.id}','${s.id}',this.checked)"></td></tr>`).join("")}</tbody>
    </table></div>
  </div>`).join("");
}

function renderAankoopLeerlingen() {
  const select = $("aankoopLeerling");
  if (!select) return;
  select.innerHTML = klasData().leerlingen.map(s => `<option value="${s.id}">${esc(leerlingNaam(s))}</option>`).join("");
}

function aankoopToevoegen() {
  const studentId = $("aankoopLeerling").value;
  if (!studentId) return alert("Kies eerst een leerling.");
  klasData().aankopen.push({
    id: uid(),
    studentId,
    type: $("aankoopType").value,
    datum: $("aankoopDatum").value || today(),
    aantal: Math.max(1, Number($("aankoopAantal").value || 1)),
    prijs: Number($("aankoopPrijs")?.value || 0),
    verwerkt: false,
    verwerktOp: ""
  });
  if ($("aankoopPrijs")) $("aankoopPrijs").value = $("aankoopType").value === "turnshirt" ? "8" : "1";
  markDirty();
  renderAankopen();
}

function renderAankopen() {
  $("aankopenKlasTitel").textContent = actieveKlas;
  const list = klasData().aankopen || [];
  if (!list.length) {
    $("aankopenLijst").innerHTML = `<div class="empty">Nog geen aankopen.</div>`;
    return;
  }
  $("aankopenLijst").innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Datum</th><th>Leerling</th><th>Type</th><th>Aantal</th><th>Prijs</th><th>Status</th></tr></thead>
    <tbody>${list.map(a => {
      const s = klasData().leerlingen.find(x => x.id === a.studentId);
      return `<tr class="${a.verwerkt ? "processed-row" : ""}"><td>${esc(a.datum)}</td><td>${esc(s ? leerlingNaam(s) : "Onbekend")}</td><td>${esc(a.type)}</td><td>${esc(a.aantal)}</td><td>${Number(a.prijs || 0).toFixed(2)} euro</td><td>${a.verwerkt ? '<span class="processed-pill">verwerkt</span>' : '<span class="tag">open</span>'} <button type="button" class="ghost small secretariaat-only" onclick="aankoopVerwerktToggle('${a.id}')">${a.verwerkt ? "heropen" : "verwerk"}</button></td></tr>`;
    }).join("")}</tbody>
  </table></div>`;
}

function secretariaatOpslaan() {
  if (!isSecretariaat()) return alert("Alleen secretariaat/directie kan dit aanpassen.");
  data.secretariaat.vrijeDagen = $("vrijeDagenInput").value.split(/\r?\n/)
    .map(line => line.trim()).filter(Boolean)
    .map(line => ({ datum: line.slice(0, 10), notitie: line.slice(10).trim() }));
  data.secretariaat.verwerktTot.refter = $("refterVerwerktTotInput").value;
  markDirty();
  renderAlles();
}

function deadlineToevoegen() {
  if (!isSecretariaat()) return alert("Alleen secretariaat/directie kan deadlines maken.");
  const tekst = $("deadlineTekst").value.trim();
  const datum = $("deadlineDatum").value;
  if (!tekst || !datum) return alert("Vul melding en datum in.");
  const gekozenKlassen = [...document.querySelectorAll("#deadlineKlassen input:checked")].map(cb => cb.value);
  data.secretariaat.deadlines.push({ id: uid(), tekst, datum, onderdeel: $("deadlineOnderdeel")?.value || "", klassen: gekozenKlassen, groepId: actieveGroep.id, archief: false, inOrde: {} });
  $("deadlineTekst").value = "";
  markDirty();
  if (typeof renderSecretariaat === "function") renderSecretariaat();
  renderMeldingen();
}

function renderSecretariaat() {
  const sec = data.secretariaat;
  if ($("vrijeDagenInput")) $("vrijeDagenInput").value = (sec.vrijeDagen || []).map(d => `${d.datum || ""} ${d.notitie || ""}`.trim()).join("\n");
  if ($("refterVerwerktTotInput")) $("refterVerwerktTotInput").value = sec.verwerktTot?.refter || "";
  if ($("vrijeDagenInput")) $("vrijeDagenInput").disabled = !isSecretariaat();
  if ($("refterVerwerktTotInput")) $("refterVerwerktTotInput").disabled = !isSecretariaat();
  if ($("secretariaatOpslaanBtn")) $("secretariaatOpslaanBtn").disabled = !isSecretariaat();
  if ($("deadlineToevoegenBtn")) $("deadlineToevoegenBtn").disabled = !isSecretariaat();
  const deadlines = sec.deadlines || [];
  renderMeldingenBeheer();
  renderDeadlineKlassen();
  renderVrijeDagenLijst();
  renderStandaardVrijeDagenLijst();
}

function renderAlles() {
  if (!data || !actieveKlas) return;
  $("subtitle").textContent = `${actieveGroep.naam} - ${actieveKlas} - ${user.email || ""}`;
  const meldingenTab = $("meldingenTab"); if (meldingenTab) meldingenTab.classList.toggle("hidden", !isSecretariaat());
  const vrijeDagenTab = $("vrijeDagenTab"); if (vrijeDagenTab) vrijeDagenTab.classList.add("hidden");
  const werkboekenTab = $("werkboekenTab"); if (werkboekenTab) werkboekenTab.classList.toggle("hidden", !isSecretariaat());
  $("schooljaarInput").value = data.schooljaar || currentSchooljaar();
  renderKlassenSnelkeuze();
  renderRolInfo();
  renderMeldingen();
  renderLeerlingen();
  renderRefter();
  renderActiviteiten();
  renderAankopen();
  if (typeof renderSecretariaat === "function") renderSecretariaat();
  renderMeldingen();
}

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    $(`panel-${tab.dataset.tab}`).classList.add("active");
    renderAlles();
  });
});

$("groepSelect").addEventListener("change", updateKlasSelects);
$("groepWissel").addEventListener("change", () => {
  const groepId = $("groepWissel").value;
  const groep = GROEPEN.find(g => g.id === groepId);
  const klassen = isSchoolBreed() ? groep.klassen : groep.klassen.filter(k => toegelatenKlassen.includes(k));
  openGroep(groepId, klassen[0]);
});
$("klasWissel").addEventListener("change", () => {
  actieveKlas = $("klasWissel").value;
  renderAlles();
});
$("schooljaarInput").addEventListener("change", () => openGroep(actieveGroep.id, actieveKlas));
$("openGroepBtn").addEventListener("click", () => openGroep($("groepSelect").value, $("klasSelect").value));
const demoOpenBtn = $("demoOpenBtn");
if (demoOpenBtn) demoOpenBtn.addEventListener("click", () => openDemoGroep($("groepSelect").value, $("klasSelect").value));
const demoLeerkrachtBtn = $("demoLeerkrachtBtn");
if (demoLeerkrachtBtn) demoLeerkrachtBtn.addEventListener("click", openDemoAlsLeerkracht);
const demoSecretariaatBtn = $("demoSecretariaatBtn");
if (demoSecretariaatBtn) demoSecretariaatBtn.addEventListener("click", openDemoAlsSecretariaat);
const wisselNaarLeerkrachtBtn = $("wisselNaarLeerkrachtBtn");
if (wisselNaarLeerkrachtBtn) wisselNaarLeerkrachtBtn.addEventListener("click", () => wisselDemoRol("leerkracht"));
const wisselNaarSecretariaatBtn = $("wisselNaarSecretariaatBtn");
if (wisselNaarSecretariaatBtn) wisselNaarSecretariaatBtn.addEventListener("click", () => wisselDemoRol("secretariaat"));
const terugNaarDemoBtn = $("terugNaarDemoBtn");
if (terugNaarDemoBtn) terugNaarDemoBtn.addEventListener("click", terugNaarDemoKeuze);
$("importLeerlingenBtn").addEventListener("click", importLeerlingen);
$("nieuweLeerlingBtn").addEventListener("click", nieuweLeerling);
$("refterMaand").addEventListener("change", renderRefter);
$("activiteitToevoegenBtn").addEventListener("click", activiteitToevoegen);
$("aankoopToevoegenBtn").addEventListener("click", aankoopToevoegen);
if ($("secretariaatOpslaanBtn")) $("secretariaatOpslaanBtn").addEventListener("click", secretariaatOpslaan);
if ($("refterVerwerktOpslaanBtn")) $("refterVerwerktOpslaanBtn").addEventListener("click", refterVerwerktOpslaan);
if ($("deadlineToevoegenBtn")) $("deadlineToevoegenBtn").addEventListener("click", deadlineToevoegen);
if ($("vrijeDagToevoegenBtn")) $("vrijeDagToevoegenBtn").addEventListener("click", vrijeDagToevoegen);
if ($("aankoopType")) $("aankoopType").addEventListener("change", () => { if ($("aankoopPrijs")) $("aankoopPrijs").value = $("aankoopType").value === "turnshirt" ? "8" : "1"; });
$("logoutBtn").addEventListener("click", () => signOut(auth).then(() => location.href = "index.html"));
if ($("aankoopDatum")) $("aankoopDatum").value = schooljaarStartDatum().slice(0, 8) + "12";
if ($("actDatum")) $("actDatum").value = schooljaarStartDatum().slice(0, 8) + "12";
if ($("refterMaand")) $("refterMaand").value = schooljaarStartDatum().slice(0, 7);


// fix-demo-blijft-laden-codex
function startDemoSetupZonderFirebase() {
  if (data || demoMode) return;
  user = user || { email: "demo@school.local", uid: "demo" };
  rol = "secretariaat";
  toegelatenKlassen = alleKlassen();
  vulKeuzes();
  show("setup");
  setStatus("Demo klaar", "dirty");
}

setTimeout(startDemoSetupZonderFirebase, 1200);
onAuthStateChanged(auth, async authUser => {
  if (!authUser) {
    location.href = "index.html";
    return;
  }
  user = authUser;
  try {
    await laadRol();
    await laadKlassenVoorLeerkracht();
    const groepen = groepenVoorUser();
    if (!groepen.length) {
      show("setup");
      $("setupPanel").innerHTML = `<h2>Geen klas gevonden</h2><p class="muted">Je account is nog niet gekoppeld aan een klas in klasleerkrachten.</p>`;
      setStatus("Geen klas");
      return;
    }
    vulKeuzes();
    show("setup");
    setStatus("Kies klas");
  } catch (err) {
    console.error(err);
    alert("Schoolbeheer kon niet starten: " + err.message);
    setStatus("Fout");
  }
});













// herstel-demo-tabellen-codex
function demoLeerlingenVoorKlas(klas) {
  const lijsten = {
    "1A": [
      ["Peeters", "Noor", false],
      ["Janssens", "Lina", true],
      ["Vermeulen", "Milan", false]
    ],
    "2A": [
      ["Alghalban", "Lana", false],
      ["Bilican", "Ela", true],
      ["De Bondt", "Storm", false],
      ["De Ruysscher", "Mattiz", false],
      ["Deryckere", "Billie", false]
    ],
    "3A": [
      ["Dubois", "Virender", false],
      ["Karaman", "Enes", false],
      ["Mertens", "Lotte", true]
    ],
    "4A": [
      ["Symons", "Yliana", false],
      ["Yildiz", "Alper", false],
      ["Claes", "Rube", false]
    ],
    "5A": [
      ["Mertens", "Fien", false],
      ["Peeters", "Arne", false],
      ["Wouters", "Mila", true]
    ],
    "6A": [
      ["Marchand", "Davy", false],
      ["Stevens", "Lara", false],
      ["Boeykens", "Steffi", false]
    ]
  };
  return (lijsten[klas] || []).map(([lastName, firstName, kindCollega]) => ({
    id: uid(),
    firstName,
    lastName,
    startDatum: schooljaarStartDatum(),
    eindDatum: schooljaarEindDatum(),
    kindCollega
  }));
}

function vulDemoData() {
  if (!data) return;
  alleKlassen().forEach(klas => {
    if (!data.klassen[klas]) data.klassen[klas] = { leerlingen: [], refter: {}, activiteiten: [], aankopen: [] };
    if (!data.klassen[klas].leerlingen.length) {
      data.klassen[klas].leerlingen = demoLeerlingenVoorKlas(klas);
    }
  });
}

function demoMaand() {
  return schooljaarStartDatum().slice(0, 7);
}

function demoDatum(dag) {
  return `${demoMaand()}-${String(dag).padStart(2, "0")}`;
}

function zorgDatDemoMaandJuistStaat() {
  const maandEl = $("refterMaand");
  if (maandEl && demoMode && (!maandEl.value || maandEl.value < demoMaand())) maandEl.value = demoMaand();
  const actDatum = $("actDatum");
  if (actDatum && demoMode && (!actDatum.value || actDatum.value < schooljaarStartDatum())) actDatum.value = demoDatum(12);
  const aankoopDatum = $("aankoopDatum");
  if (aankoopDatum && demoMode && (!aankoopDatum.value || aankoopDatum.value < schooljaarStartDatum())) aankoopDatum.value = demoDatum(12);
}

function activiteitToevoegen() {
  const naam = $("actNaam").value.trim();
  const datum = $("actDatum").value || demoDatum(12);
  const prijs = Number($("actPrijs").value || 0);
  if (!naam) return alert("Vul een naam voor de activiteit in.");
  klasData().activiteiten.push({ id: uid(), naam, datum, prijs, afwezig: {}, verwerkt: false, verwerktOp: "" });
  $("actNaam").value = "";
  $("actPrijs").value = "0";
  markDirty();
  renderAlles();
}

function renderRefter() {
  zorgDatDemoMaandJuistStaat();
  const month = $("refterMaand").value || demoMaand();
  $("refterMaand").value = month;
  if ($("refterVerwerktTotView")) $("refterVerwerktTotView").value = data.secretariaat.verwerktTot?.refter || "";
  if ($("refterVerwerktTotInput")) $("refterVerwerktTotInput").value = data.secretariaat.verwerktTot?.refter || "";
  const days = monthDays(month);
  const vrij = vrijeDagMap();
  const monthData = klasData().refter[month] || { afwezig: {} };
  klasData().refter[month] = monthData;
  const students = actieveLeerlingenVoorDatum(`${month}-15`);
  if (!students.length) {
    $("refterTabel").innerHTML = `<div class="empty">Geen actieve leerlingen in deze maand. Controleer of de maand binnen het schooljaar valt.</div>`;
    return;
  }
  $("refterTabel").innerHTML = `<div class="table-wrap"><table class="refter-table">
    <thead><tr><th>Leerling</th>${days.map(d => `<th class="day ${d.weekDay === 0 || d.weekDay === 3 || d.weekDay === 6 || vrij.has(d.date) ? "weekend" : ""}">${d.day}</th>`).join("")}</tr></thead>
    <tbody>${students.map(s => `<tr class="${s.kindCollega ? "collega-kind" : ""}">
      <td><span class="student-name">${esc(leerlingNaam(s))}</span>${s.kindCollega ? ' <span class="tag green">collega</span>' : ''}</td>
      ${days.map(d => {
        const grijs = d.weekDay === 0 || d.weekDay === 3 || d.weekDay === 6 || vrij.has(d.date);
        const locked = isRefterLocked(d.date);
        if (grijs) return `<td class="day vrije-dag">-</td>`;
        const checked = !!monthData.afwezig?.[s.id]?.[d.date];
        return `<td class="day ${locked ? "locked-cell processed-row" : ""}"><input type="checkbox" ${checked ? "checked" : ""} ${locked ? "disabled" : ""} onchange="refterToggle('${month}','${s.id}','${d.date}',this.checked)">${locked ? "<br><span class=\"processed-pill\">verwerkt</span>" : ""}</td>`;
      }).join("")}
    </tr>`).join("")}</tbody>
  </table></div>`;
}

function renderActiviteiten() {
  $("activiteitenKlasTitel").textContent = actieveKlas;
  zorgDatDemoMaandJuistStaat();
  const list = [...(klasData().activiteiten || [])].sort((a, b) => (a.datum || "").localeCompare(b.datum || ""));
  const month = (list[0]?.datum || demoDatum(1)).slice(0, 7);
  const students = actieveLeerlingenVoorDatum(`${month}-15`);

  if (!students.length) {
    $("activiteitenLijst").innerHTML = `<div class="empty">Geen actieve leerlingen voor deze maand.</div>`;
    return;
  }

  if (!list.length) {
    $("activiteitenLijst").innerHTML = `<div class="empty">Nog geen activiteiten. Voeg bovenaan een activiteit toe; daarna verschijnt hier een maandtabel met activiteiten als kolommen.</div>`;
    return;
  }

  $("activiteitenLijst").innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Leerling</th>${list.map(act => `<th>${esc(act.naam)}<br><span class="muted">${esc(act.datum)} - ${Number(act.prijs || 0).toFixed(2)} euro</span>${act.verwerkt ? '<br><span class="processed-pill">verwerkt</span>' : ''}<br><button type="button" class="ghost small secretariaat-only" onclick="activiteitVerwerktToggle('${act.id}')">${act.verwerkt ? "heropen" : "verwerk"}</button></th>`).join("")}</tr></thead>
    <tbody>${students.map(s => `<tr>
      <td><span class="student-name">${esc(leerlingNaam(s))}</span></td>
      ${list.map(act => `<td class="${act.verwerkt ? "processed-row" : ""}"><label style="display:inline-flex;gap:6px;align-items:center;margin:0"><input type="checkbox" ${act.afwezig?.[s.id] ? "checked" : ""} ${act.verwerkt && !isSecretariaat() ? "disabled" : ""} onchange="activiteitAfwezig('${act.id}','${s.id}',this.checked)"> afwezig</label></td>`).join("")}
    </tr>`).join("")}</tbody>
  </table></div>`;
}

function renderAankoopLeerlingen() {
  const select = $("aankoopLeerling");
  if (!select || !data || !actieveKlas) return;
  const students = [...(klasData().leerlingen || [])].sort((a, b) => leerlingNaam(a).localeCompare(leerlingNaam(b), "nl"));
  select.innerHTML = students.map(s => `<option value="${s.id}">${esc(leerlingNaam(s))}</option>`).join("");
}

function aankoopToevoegen() {
  renderAankoopLeerlingen();
  const studentId = $("aankoopLeerling").value;
  if (!studentId) return alert("Kies eerst een leerling.");
  klasData().aankopen.push({
    id: uid(),
    studentId,
    type: $("aankoopType").value,
    datum: $("aankoopDatum").value || demoDatum(12),
    aantal: Math.max(1, Number($("aankoopAantal").value || 1)),
    prijs: Number($("aankoopPrijs")?.value || 0),
    verwerkt: false,
    verwerktOp: ""
  });
  if ($("aankoopPrijs")) $("aankoopPrijs").value = $("aankoopType").value === "turnshirt" ? "8" : "1";
  markDirty();
  renderAlles();
}