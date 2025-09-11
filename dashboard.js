// Importeer Firebase services
import { getAuth, onAuthStateChanged, signOut, updatePassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, doc, onSnapshot, setDoc, updateDoc, getDoc,
  arrayUnion, arrayRemove, deleteField
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const auth = getAuth();
const db = getFirestore();

// Globale variabelen
let currentUser;
let huidigeModus = localStorage.getItem('huidigeModus') || null;
let klasOverzichtChartInstance = null; // Voor de klasoverzicht-grafiek
let kolomMigratieUitgevoerd = false;   // voorkomt herhaalde migraties in één sessie

let leerkrachtData = {
  leerlingen: [],
  weekKolommen: {},
  dagKolommen: {},
  weekDatums: {},
  huistakenWeek: {},
  huistakenDag: {}
};

const statusOpties = ["op tijd", "te laat", "onvolledig", "niet gemaakt", "ziek", "geen"];
const kleuren = {
  "op tijd": "op-tijd", "te laat": "te-laat", "onvolledig": "onvolledig",
  "niet gemaakt": "niet-gemaakt", "ziek": "ziek", "geen": "", "niet-aanwezig": "niet-aanwezig"
};
const chartKleuren = {
  "op tijd": "#c8f7c5", "te laat": "#ffe0b3",
  "onvolledig": "#fff9c4", "niet gemaakt": "#f8d7da", "ziek": "#d0e7ff",
  "geen": "#f0f0f0"
};
const dagNamen = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];

// --- HELPERS VOOR DOCREF & BASISDOC ---
const getDocRef = () => doc(db, "leerkrachten", currentUser.uid);

// Alleen bij eerste keer een basisdocument zetten (NIET meer 'leerlingen' invullen!)
async function ensureLeerkrachtDocExists() {
  const ref = getDocRef();
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      weekKolommen: { 1: [], 2: [], 3: [] },
      dagKolommen:  { 1: [], 2: [], 3: [] },
      weekDatums:   {},
      huistakenWeek: {},
      huistakenDag:  {}
    }, { merge: true });
  }
}

/** Robuuste uitleesfuncties die zowel array- als object-vorm aankunnen */
function getWeekKolommenArray(periode) {
  const raw = leerkrachtData.weekKolommen?.[periode];
  if (Array.isArray(raw)) return [...raw].sort((a,b)=>a-b);
  if (raw && typeof raw === 'object') return Object.keys(raw).map(Number).sort((a,b)=>a-b);
  return [];
}
function getDagKolommenArray(periode) {
  const raw = leerkrachtData.dagKolommen?.[periode];
  if (Array.isArray(raw)) return [...raw].sort();
  if (raw && typeof raw === 'object') return Object.keys(raw).sort();
  return [];
}

/** Detecteer en migreer oude object-vorm naar array-vorm (éénmalig per sessie) */
async function migrateKolommenIfNeeded(data) {
  if (kolomMigratieUitgevoerd) return;
  const updates = {};
  for (const periode of [1,2,3]) {
    const dagRaw = data.dagKolommen?.[periode];
    if (dagRaw && !Array.isArray(dagRaw) && typeof dagRaw === 'object') {
      updates[`dagKolommen.${periode}`] = Object.keys(dagRaw).sort();
    }
    const weekRaw = data.weekKolommen?.[periode];
    if (weekRaw && !Array.isArray(weekRaw) && typeof weekRaw === 'object') {
      updates[`weekKolommen.${periode}`] = Object.keys(weekRaw).map(Number).sort((a,b)=>a-b);
    }
  }
  if (Object.keys(updates).length > 0) {
    await updateDoc(getDocRef(), updates);
    kolomMigratieUitgevoerd = true;
  }
}

// --- INIT & AUTH ---
document.addEventListener('DOMContentLoaded', () => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      await ensureLeerkrachtDocExists();   // verzeker dat basisdoc bestaat (klaslijst blijft ongewijzigd)
      setupEventListeners();
      koppelDataEnRender();
    } else {
      window.location.href = 'index.html';
    }
  });
});

function setupEventListeners() {
  document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth));
  document.getElementById('wijzigWachtwoordBtn').addEventListener('click', wijzigWachtwoord);
  document.getElementById('nieuwSchooljaarBtn').addEventListener('click', startNieuwSchooljaar);
  document.getElementById('kiesModusWeek').addEventListener('click', () => setModus('week'));
  document.getElementById('kiesModusDag').addEventListener('click', () => setModus('dag'));
  document.getElementById('wisselModusBtn').addEventListener('click', wisselModus);
  document.getElementById('addLeerlingBtn').addEventListener('click', voegLeerlingToe);
  document.getElementById('rapportperiode').addEventListener('change', renderHoofdweergave);
  document.getElementById('toonOverzichtBtn').addEventListener('click', toonKlasOverzicht);
  document.getElementById('printOverzichtBtn').addEventListener('click', () => window.print());
  document.getElementById('printAlleLeerlingenBtn').addEventListener('click', genereerBulkPdf);
}

// --- DATA & RENDERING ---
function koppelDataEnRender() {
  const docRef = getDocRef();
  onSnapshot(docRef, async (docSnap) => {
    const data = docSnap.exists() ? docSnap.data() : {};
    leerkrachtData = {
      leerlingen: data.leerlingen || [],
      weekKolommen: data.weekKolommen || {},
      dagKolommen: data.dagKolommen || {},
      weekDatums: data.weekDatums || {},
      huistakenWeek: data.huistakenWeek || {},
      huistakenDag: data.huistakenDag || {}
    };
    await migrateKolommenIfNeeded(data);
    initializeerDataStructuur();
    updateUIModus();
  });
}

function initializeerDataStructuur() {
  for (const periode of [1, 2, 3]) {
    if (!leerkrachtData.weekKolommen[periode]) leerkrachtData.weekKolommen[periode] = [];
    if (!leerkrachtData.dagKolommen[periode]) leerkrachtData.dagKolommen[periode] = [];
    if (!leerkrachtData.weekDatums[periode]) leerkrachtData.weekDatums[periode] = {};
  }
}

function renderHoofdweergave() {
  if (!huidigeModus) return;
  prepareDataForDetailPages();
  document.getElementById('weergave-titel').textContent = `Huistakenoverzicht per ${huidigeModus}`;
  try {
    if (huidigeModus === 'week') renderTabelWeek();
    else renderTabelDag();
  } catch (e) {
    console.error(e);
    document.getElementById("tabelContainer").innerHTML =
      `<p style="color:#a00">Er is iets misgelopen bij het laden. Herlaad de pagina of probeer opnieuw.</p>`;
  }
}

function prepareDataForDetailPages() {
  localStorage.setItem('detailPaginaData', JSON.stringify({
    ...leerkrachtData,
    huidigeModus,
    huidigePeriode: document.getElementById("rapportperiode").value
  }));
}

// --- MODUS BEHEER ---
function setModus(modus) {
  huidigeModus = modus;
  localStorage.setItem('huidigeModus', modus);
  updateUIModus();
}
function wisselModus() { setModus(huidigeModus === 'week' ? 'dag' : 'week'); }

function updateUIModus() {
  const isModusGekozen = !!huidigeModus;
  document.getElementById('modus-keuzescherm').style.display = isModusGekozen ? 'none' : 'block';
  document.getElementById('content').style.display = isModusGekozen ? 'block' : 'none';
  if (isModusGekozen) {
    document.getElementById('wisselModusBtn').textContent = `Wissel naar weergave per ${huidigeModus === 'week' ? 'dag' : 'week'}`;
    renderHoofdweergave();
  }
}

// --- TABEL RENDERING ---
function renderTabelWeek() {
  const periode = document.getElementById("rapportperiode").value;
  const weekKolommen = getWeekKolommenArray(periode);
  const container = document.getElementById("tabelContainer");

  if (leerkrachtData.leerlingen.length === 0) {
    container.innerHTML = "<p>Voeg een leerling toe om te beginnen.</p>";
    return;
  }

  const headHTML = weekKolommen.map(weekNum => {
    const datum = leerkrachtData.weekDatums[periode]?.[weekNum] || '';
    return `<th>
      Week ${weekNum} <button class="kolom-verwijder-knop" onclick="window.verwijderWeekKolom('${periode}', ${weekNum})">X</button><br>
      <input type="date" value="${datum}" onchange="window.updateWeekDatum('${periode}', ${weekNum}, this.value)">
    </th>`;
  }).join('');

  const bodyHTML = leerkrachtData.leerlingen.sort((a, b) => a.naam.localeCompare(b.naam)).map(leerling => {
    const weekData = leerkrachtData.huistakenWeek[leerling.id]?.[periode] || {};
    let rowHTML = `<tr>${createLeerlingCelHTML(leerling)}`;
    rowHTML += weekKolommen.map(weekNum => {
      if (leerling.startWeek && weekNum < leerling.startWeek) {
        return `<td><div class="status-cel niet-aanwezig">Niet aanwezig</div></td>`;
      }
      const data = weekData[weekNum] || { status: 'op tijd', opmerking: '' };
      return `<td>${createStatusCelHTML(leerling.id, periode, weekNum, data, 'week')}</td>`;
    }).join('');
    return rowHTML + '<td></td></tr>';
  }).join('');

  container.innerHTML = `
    <table>
      <thead><tr><th>Leerling</th>${headHTML}<th><button class="kolom-toevoegen-knop" onclick="window.voegWeekKolomToe('${periode}')">+</button></th></tr></thead>
      <tbody>${bodyHTML}</tbody>
    </table>`;
}

function renderTabelDag() {
  const periode = document.getElementById("rapportperiode").value;
  const dagKolommen = getDagKolommenArray(periode);
  const container = document.getElementById("tabelContainer");

  if (leerkrachtData.leerlingen.length === 0) {
    container.innerHTML = "<p>Voeg een leerling toe om te beginnen.</p>";
    return;
  }

  const headHTML = dagKolommen.map(datum => {
    const dagNaam = dagNamen[new Date(datum + 'T12:00:00').getDay()];
    return `<th>
      <span>${dagNaam.toUpperCase()}</span>
      <input type="date" value="${datum}" onchange="window.updateDagDatum('${periode}', '${datum}', this.value)">
      <button class="kolom-verwijder-knop" onclick="window.verwijderDagKolom('${periode}', '${datum}')">X</button>
    </th>`;
  }).join('');

  const bodyHTML = leerkrachtData.leerlingen
    .sort((a, b) => a.naam.localeCompare(b.naam))
    .map(leerling => {
      const dagData = leerkrachtData.huistakenDag[leerling.id]?.[periode] || {};
      let rowHTML = `<tr>${createLeerlingCelHTML(leerling)}`;
      rowHTML += dagKolommen.map(datum => {
        if (leerling.startDatum && datum < leerling.startDatum) {
          return `<td><div class="status-cel niet-aanwezig">Niet aanwezig</div></td>`;
        }
        const data = dagData[datum] || { status: 'op tijd', opmerking: '' };
        return `<td>${createStatusCelHTML(leerling.id, periode, datum, data, 'dag')}</td>`;
      }).join('');
      return rowHTML + '<td></td></tr>';
    }).join('');

  // + knop om eenvoudig nieuwe dag toe te voegen
  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Leerling</th>
          ${headHTML}
          <th>
            <button class="kolom-toevoegen-knop" title="Nieuwe dag toevoegen" onclick="window.openDagToevoegen('${periode}')">+</button>
          </th>
        </tr>
      </thead>
      <tbody>${bodyHTML}</tbody>
    </table>`;
}

// --- HULP FUNCTIES ---
function createLeerlingCelHTML(leerling) {
  return `<td><div class="leerling-cel">
    <span class="leerling-naam" title="${leerling.naam}"><a href="leerling.html?naam=${encodeURIComponent(leerling.naam)}">${leerling.naam}</a></span>
    <button class="verwijder-knop" onclick="window.verwijderLeerling('${leerling.id}')" title="Verwijder ${leerling.naam}"><svg viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6Z"/><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1ZM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118ZM2.5 3V2h11v1h-11Z"/></svg></button>
  </div></td>`;
}

function createStatusCelHTML(leerlingId, periode, identifier, data, modus) {
  const status = data.status;
  const className = kleuren[status] || '';
  const optionsHTML = statusOpties.map(optie => {
    const isSelected = (optie === status) ? 'selected' : '';
    const optionClassName = kleuren[optie] || '';
    return `<option value="${optie}" class="${optionClassName}" ${isSelected}>${optie}</option>`;
  }).join('');
  const params = JSON.stringify({ leerlingId, periode, identifier, modus });
  const onchangeAttr = `window.updateStatus(${params}, this.value)`;
  const selectHTML = `<select class="${className}" onchange="${onchangeAttr.replace(/"/g, '&quot;')}">${optionsHTML}</select>`;
  let opmerkingHTML = '';
  if (['te laat', 'onvolledig', 'niet gemaakt'].includes(status)) {
    const titel = data.opmerking ? `Opmerking: ${data.opmerking}` : 'Voeg opmerking toe';
    opmerkingHTML = `<span class="opmerking-icoon" title="${titel}" onclick='window.bewerkOpmerking(${params})'>💬</span>`;
  }
  return `<div class="status-cel">${selectHTML}${opmerkingHTML}</div>`;
}

// --- DATA MANIPULATIE ---
async function sendUpdate(payload) {
  await setDoc(getDocRef(), payload, { merge: true });
}

window.updateStatus = async (params, nieuweStatus) => {
  const { leerlingId, periode, identifier, modus } = params;
  const dataKey = modus === 'week' ? 'huistakenWeek' : 'huistakenDag';
  const cellDataPayload = { status: nieuweStatus };
  const isCommentStatus = ['te laat', 'onvolledig', 'niet gemaakt'].includes(nieuweStatus);
  if (isCommentStatus) {
    const currentOpmerking = leerkrachtData[dataKey]?.[leerlingId]?.[periode]?.[identifier]?.opmerking || '';
    cellDataPayload.opmerking = currentOpmerking;
  } else {
    cellDataPayload.opmerking = '';
  }
  const finalPayload = {
    [dataKey]: { [leerlingId]: { [periode]: { [identifier]: cellDataPayload } } }
  };
  await sendUpdate(finalPayload);
};

window.bewerkOpmerking = async (params) => {
  const { leerlingId, periode, identifier, modus } = params;
  const dataKey = modus === 'week' ? 'huistakenWeek' : 'huistakenDag';
  const currentOpmerking = leerkrachtData[dataKey]?.[leerlingId]?.[periode]?.[identifier]?.opmerking || '';
  const nieuweOpmerking = prompt("Voer hier de opmerking in:", currentOpmerking);
  if (nieuweOpmerking !== null) {
    const payload = {
      [dataKey]: { [leerlingId]: { [periode]: { [identifier]: { opmerking: nieuweOpmerking } } } }
    };
    await sendUpdate(payload);
  }
};

window.voegWeekKolomToe = async (periode) => {
  const weekKolommen = getWeekKolommenArray(periode);
  const laatsteWeek = weekKolommen.length > 0 ? Math.max(...weekKolommen) : 0;
  await updateDoc(getDocRef(), { [`weekKolommen.${periode}`]: arrayUnion(laatsteWeek + 1) });
};

window.verwijderWeekKolom = async (periode, weekNum) => {
  if (!confirm(`Zeker dat je Week ${weekNum} wilt verwijderen?`)) return;
  const updates = {};
  updates[`weekKolommen.${periode}`] = arrayRemove(weekNum);
  updates[`weekDatums.${periode}.${weekNum}`] = deleteField();
  leerkrachtData.leerlingen.forEach(l => {
    updates[`huistakenWeek.${l.id}.${periode}.${weekNum}`] = deleteField();
  });
  await updateDoc(getDocRef(), updates);
};

window.updateWeekDatum = async (periode, weekNum, nieuweDatum) => {
  await sendUpdate({ weekDatums: { [periode]: { [weekNum]: nieuweDatum } } });
};

window.voegDagKolomToe = async (nieuweDatum, periode) => {
  if (nieuweDatum) {
    await updateDoc(getDocRef(), { [`dagKolommen.${periode}`]: arrayUnion(nieuweDatum) });
  }
};

window.openDagToevoegen = async (periode) => {
  const vandaag = new Date().toISOString().split('T')[0];
  const nieuweDatum = prompt("Nieuwe dag toevoegen (formaat: JJJJ-MM-DD):", vandaag);
  if (!nieuweDatum) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nieuweDatum)) {
    alert("Ongeldige datum. Gebruik het formaat JJJJ-MM-DD.");
    return;
  }
  await window.voegDagKolomToe(nieuweDatum, periode);
};

window.verwijderDagKolom = async (periode, datum) => {
  if (!confirm("Zeker dat je deze dag wilt verwijderen?")) return;
  const updates = {};
  updates[`dagKolommen.${periode}`] = arrayRemove(datum);
  leerkrachtData.leerlingen.forEach(l => {
    updates[`huistakenDag.${l.id}.${periode}.${datum}`] = deleteField();
  });
  await updateDoc(getDocRef(), updates);
};

window.updateDagDatum = async (periode, oudeDatum, nieuweDatum) => {
  if (oudeDatum === nieuweDatum || !nieuweDatum) return;
  const dagKolommen = getDagKolommenArray(periode);
  const newKolommen = dagKolommen.map(d => d === oudeDatum ? nieuweDatum : d).sort();
  const updates = {};
  updates[`dagKolommen.${periode}`] = newKolommen;
  leerkrachtData.leerlingen.forEach(l => {
    const dagData = leerkrachtData.huistakenDag[l.id]?.[periode]?.[oudeDatum];
    if (dagData) {
      updates[`huistakenDag.${l.id}.${periode}.${nieuweDatum}`] = dagData;
      updates[`huistakenDag.${l.id}.${periode}.${oudeDatum}`] = deleteField();
    }
  });
  await updateDoc(getDocRef(), updates);
};

window.voegLeerlingToe = async () => {
  try {
    const input = document.getElementById('nieuweLeerlingNaam');
    const naam = (input.value || '').trim();
    if (!naam) { alert('Geef een naam op.'); return; }

    const nieuweLeerling = { id: `id_${Date.now()}`, naam };

    if (huidigeModus === 'week') {
      const startWeek = parseInt(
        prompt(`In welke week start ${naam}? (Laat leeg of typ 1 indien vanaf begin)`),
        10
      );
      if (!isNaN(startWeek) && startWeek > 0) nieuweLeerling.startWeek = startWeek;
    } else { // huidigeModus === 'dag'
      const vandaag = new Date().toISOString().split('T')[0];
      const startDatum = prompt(`Op welke datum start ${naam}? (Formaat: JJJJ-MM-DD)`, vandaag);
      if (startDatum) nieuweLeerling.startDatum = startDatum;
    }

    await setDoc(getDocRef(), { leerlingen: arrayUnion(nieuweLeerling) }, { merge: true });
    input.value = '';
  } catch (err) {
    console.error(err);
    alert('Toevoegen mislukt. Controleer uw internetverbinding en probeer opnieuw. (Details in console)');
  }
};

window.verwijderLeerling = async (leerlingId) => {
  const leerling = leerkrachtData.leerlingen.find(l => l.id === leerlingId);
  if (!leerling || !confirm(`Zeker dat u ${leerling.naam} wilt verwijderen?`)) return;

  const updates = {
    leerlingen: arrayRemove(leerling),
    [`huistakenWeek.${leerlingId}`]: deleteField(),
    [`huistakenDag.${leerlingId}`]: deleteField()
  };
  await updateDoc(getDocRef(), updates);
};

// --- AUTH & BEHEER FUNCTIES ---
async function startNieuwSchooljaar() {
  if (prompt("OPGELET: U staat op het punt alle leerlingen- en huistaakdata te verwijderen. Kolommen blijven bewaard. Typ 'RESET' om te bevestigen.") !== 'RESET') return;
  await updateDoc(getDocRef(), {
    leerlingen: [],
    huistakenWeek: {},
    huistakenDag: {}
  });
  alert("Alle leerlingen en hun huistaakdata zijn verwijderd. U kunt een nieuwe klaslijst ingeven.");
}

function wijzigWachtwoord() {
  const nieuwWachtwoord = prompt("Voer uw nieuwe wachtwoord in (min. 6 tekens).");
  if (nieuwWachtwoord && nieuwWachtwoord.length >= 6) {
    updatePassword(currentUser, nieuwWachtwoord)
      .then(() => alert("Wachtwoord is succesvol gewijzigd."))
      .catch(err => alert("Fout: " + err.message));
  } else if (nieuwWachtwoord) {
    alert("Wachtwoord te kort.");
  }
}

// --- RAPPORTAGE FUNCTIES ---
function toonKlasOverzicht() {
  const periode = document.getElementById("rapportperiode").value;

  // Telling per categorie
  const tellingTotaal = { "op tijd": 0, "te laat": 0, "onvolledig": 0, "niet gemaakt": 0, "ziek": 0 };
  // Voor top-3 per categorie
  const tellingPerStudent = { "te laat": {}, "onvolledig": {}, "niet gemaakt": {}, "ziek": {} };

  for (const leerling of leerkrachtData.leerlingen) {
    const dataBron = huidigeModus === 'week' ? leerkrachtData.huistakenWeek : leerkrachtData.huistakenDag;
    const kolommen   = huidigeModus === 'week' ? getWeekKolommenArray(periode) : getDagKolommenArray(periode);
    const leerlingData = dataBron[leerling.id]?.[periode] || {};

    kolommen.forEach(kolom => {
      if (huidigeModus === 'week' && leerling.startWeek && kolom < leerling.startWeek) return;
      if (huidigeModus === 'dag'  && leerling.startDatum && kolom < leerling.startDatum) return;

      const data = leerlingData[kolom] || { status: 'op tijd', opmerking: '' };
      if (tellingTotaal[data.status] !== undefined) tellingTotaal[data.status]++;
      if (tellingPerStudent[data.status]) {
        tellingPerStudent[data.status][leerling.naam] = (tellingPerStudent[data.status][leerling.naam] || 0) + 1;
      }
    });
  }

  const dialog      = document.getElementById('klasOverzichtDialog');
  const chartCanvas = document.getElementById('klasOverzichtChart');
  const detailsDiv  = document.getElementById('klasOverzichtText');

  // Vernietig vorige grafiek indien aanwezig
  if (klasOverzichtChartInstance) {
    klasOverzichtChartInstance.destroy();
    klasOverzichtChartInstance = null;
  }

  // Tekstuele samenvatting + top 3’s
  let detailsHTML = "<h3>Top 3 per categorie</h3>";
  for (const [status, studenten] of Object.entries(tellingPerStudent)) {
    const gesorteerd = Object.entries(studenten)
      .map(([naam, aantal]) => ({ naam, aantal }))
      .sort((a, b) => b.aantal - a.aantal);
    if (gesorteerd.length > 0) {
      const top3 = gesorteerd.slice(0, 3);
      const statusTitel = status.charAt(0).toUpperCase() + status.slice(1);
      detailsHTML += `<h4>${statusTitel}</h4><ol>`;
      top3.forEach(item => { detailsHTML += `<li>${item.naam} (${item.aantal}×)</li>`; });
      detailsHTML += `</ol>`;
    }
  }

  // NIEUW: Top 3 totaal (te laat + onvolledig + niet gemaakt)
  const probleemStatussen = ["te laat", "onvolledig", "niet gemaakt"];
  const totaalPerLeerling = {};
  probleemStatussen.forEach(st => {
    for (const [naam, aantal] of Object.entries(tellingPerStudent[st])) {
      totaalPerLeerling[naam] = (totaalPerLeerling[naam] || 0) + aantal;
    }
  });
  const topTotaal = Object.entries(totaalPerLeerling)
    .map(([naam, aantal]) => ({ naam, aantal }))
    .sort((a, b) => b.aantal - a.aantal)
    .slice(0, 3);
  if (topTotaal.length > 0) {
    detailsHTML += `<h3>Top 3 totaal (te laat + onvolledig + niet gemaakt)</h3><ol>`;
    topTotaal.forEach(item => { detailsHTML += `<li>${item.naam} (${item.aantal}×)</li>`; });
    detailsHTML += `</ol>`;
  }

  // NIEUW: compacte samenvatting met percentages
  const totaal = Object.values(tellingTotaal).reduce((a, b) => a + b, 0);
  const samenvattingLijst = ["op tijd","te laat","onvolledig","niet gemaakt","ziek"]
    .filter(key => tellingTotaal[key] > 0);
  if (samenvattingLijst.length > 0) {
    detailsHTML += "<h3>Samenvatting</h3><ul>";
    samenvattingLijst.forEach(key => {
      const pct = totaal > 0 ? Math.round((tellingTotaal[key] / totaal) * 100) : 0;
      detailsHTML += `<li><strong>${key}</strong>: ${tellingTotaal[key]} (${pct}%)</li>`;
    });
    detailsHTML += "</ul>";
  } else {
    detailsHTML += `<p>Er zijn nog geen registraties voor de gekozen weergave en periode.</p>`;
  }
  detailsDiv.innerHTML = detailsHTML;

  // Grafiek (filter '0' en verberg 'geen' indien ooit aanwezig)
  const chartKeys = ["op tijd","te laat","onvolledig","niet gemaakt","ziek"]
    .filter(k => tellingTotaal[k] > 0);
  const chartData = chartKeys.map(k => tellingTotaal[k]);
  const chartLabels = chartKeys.map(k => {
    const pct = totaal > 0 ? Math.round((tellingTotaal[k] / totaal) * 100) : 0;
    return `${k} (${pct}%)`;
  });
  const chartColors = chartKeys.map(k => chartKleuren[k]);

  klasOverzichtChartInstance = new Chart(chartCanvas.getContext('2d'), {
    type: 'pie',
    data: { labels: chartLabels, datasets: [{ data: chartData, backgroundColor: chartColors }] },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
  });

  // BELANGRIJK: toon de dialoog
  dialog.showModal();
}


function berekenLeerlingData(leerling, periode) {
  const telling = {};
  statusOpties.forEach(optie => telling[optie] = 0);
  const statusDetails = {"te laat": [], "onvolledig": [], "niet gemaakt": [], "ziek": []};

  if (huidigeModus === 'week') {
    const weekKolommen = getWeekKolommenArray(periode);
    const weekData = leerkrachtData.huistakenWeek[leerling.id]?.[periode] || {};
    const weekDatums = leerkrachtData.weekDatums[periode] || {};
    weekKolommen.forEach(weekNum => {
      if (leerling.startWeek && weekNum < leerling.startWeek) return;
      const data = weekData[weekNum] || { status: 'op tijd', opmerking: '' };
      if (telling[data.status] !== undefined) telling[data.status]++;
      if (statusDetails[data.status]) {
        const datumString = weekDatums[weekNum];
        const formattedDate = datumString ? `${datumString.split('-')[2]}/${datumString.split('-')[1]}` : `Week ${weekNum}`;
        const opmerking = data.opmerking ? ` (${data.opmerking})` : '';
        statusDetails[data.status].push(`${formattedDate}${opmerking}`);
      }
    });
  } else { // modus === 'dag'
    const dagKolommen = getDagKolommenArray(periode);
    const dagData = leerkrachtData.huistakenDag[leerling.id]?.[periode] || {};
    dagKolommen.forEach(datum => {
      if (leerling.startDatum && datum < leerling.startDatum) return;
      const data = dagData[datum] || { status: 'op tijd', opmerking: '' };
      if (telling[data.status] !== undefined) telling[data.status]++;
      if (statusDetails[data.status]) {
        const formattedDate = `${datum.split('-')[2]}/${datum.split('-')[1]}`;
        const opmerking = data.opmerking ? ` (${data.opmerking})` : '';
        statusDetails[data.status].push(`${formattedDate}${opmerking}`);
      }
    });
  }
  return { telling, statusDetails };
}

async function genereerBulkPdf() {
  const periode = document.getElementById("rapportperiode").value;
  const gesorteerdeLeerlingen = [...leerkrachtData.leerlingen].sort((a, b) => a.naam.localeCompare(b.naam));
  if (gesorteerdeLeerlingen.length === 0) {
    alert("Er zijn geen leerlingen om een rapport voor te genereren.");
    return;
  }

  const progressDialog = document.getElementById('progressDialog');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  progressDialog.showModal();

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p', 'mm', 'a4');
  const container = document.getElementById('pdf-render-container');

  for (let i = 0; i < gesorteerdeLeerlingen.length; i++) {
    const leerling = gesorteerdeLeerlingen[i];

    const { telling, statusDetails } = berekenLeerlingData(leerling, periode);

    let samenvattingHTML = "<h3>Samenvatting</h3><ul>";
    samenvattingHTML += `<li><strong>Op tijd:</strong> ${telling['op tijd']} keer</li>`;
    for (const [status, detailLijst] of Object.entries(statusDetails)) {
      if (detailLijst.length > 0) {
        const statusNaam = status.charAt(0).toUpperCase() + status.slice(1);
        samenvattingHTML += `<li><strong>${statusNaam}:</strong> ${detailLijst.length} keer<ul>`;
        detailLijst.forEach(d => { samenvattingHTML += `<li>${d}</li>`; });
        samenvattingHTML += `</ul></li>`;
      }
    }
    samenvattingHTML += "</ul>";

    container.innerHTML = `
      <h1>Overzicht voor ${leerling.naam}</h1>
      <h2>Rapportperiode ${periode}</h2>
      <canvas id="pdf-chart-${leerling.id}" width="400" height="400"></canvas>
      <div id="pdf-samenvatting">${samenvattingHTML}</div>
    `;

    // Chart per leerling
    const totaal = Object.values(telling).reduce((a, b) => a + b, 0);
    new Chart(document.getElementById(`pdf-chart-${leerling.id}`).getContext('2d'), {
      type: 'pie',
      data: {
        labels: Object.keys(telling).map(key => {
          const waarde = telling[key];
          if (waarde === 0) return '';
          const percentage = totaal > 0 ? Math.round((waarde / totaal) * 100) : 0;
          return `${key} (${percentage}%)`;
        }).filter(l => l !== ''),
        datasets: [{
          data: Object.values(telling).filter(v => v > 0),
          backgroundColor: Object.keys(telling).filter(k => telling[k] > 0).map(k => chartKleuren[k])
        }]
      },
      options: { animation: false, responsive: false, plugins: { legend: { position: "bottom" } } }
    });

    // Render naar PDF
    const canvas = await html2canvas(container, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

    // voortgang
    const progress = Math.round(((i + 1) / gesorteerdeLeerlingen.length) * 100);
    progressBar.style.width = progress + '%';
    progressText.textContent = `Rapport ${i + 1} / ${gesorteerdeLeerlingen.length} (${leerling.naam})`;
  }

  progressDialog.close();
  pdf.save(`Rapporten Periode ${periode}.pdf`);
  container.innerHTML = '';
}
