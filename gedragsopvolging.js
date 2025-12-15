// gedragsopvolging.js
// Module voor registreren en opvolgen van afspraken / sancties

// 🔹 1. Firebase APART initialiseren (veilig, enkel voor deze pagina)
import {
  initializeApp,
  getApps,
  getApp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteField,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ⚠️ Dit is dezelfde config als in script.js (huiswerkapp-a311e)
const firebaseConfig = {
  apiKey: "AIzaSyA7KxXMvZ4dzBQDut3CMyWUblLte2tFzoQ",
  authDomain: "huiswerkapp-a311e.firebaseapp.com",
  projectId: "huiswerkapp-a311e",
  storageBucket: "huiswerkapp-a311e.appspot.com",
  messagingSenderId: "797169941164",
  appId: "1:797169941164:web:511d9618079f1378d0fd09",
};

// ➜ voorkom fout "app already exists" als script.js al initialiseert
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);

// 🔹 2. Lokale state
let currentUser = null;
let leerlingen = [];
let sancties = {}; // structuur: { [leerlingId]: { [sanctieId]: {...} } }
let geselecteerdeLeerlingId = null;

// Mapping van types naar standaard aantal speeltijden
const TYPE_CONFIG = {
  Vechten: 4,
  Schelden: 2,
  "Vechten + schelden": 6,
  "Niet luisteren": 2,
  "Ongepast gedrag": 2,
  "Ongepast gedrag naar juf/meester": 4,
};
const TYPE_OPTIES = Object.keys(TYPE_CONFIG);

// Convenience
function getLeerkrachtDocRef() {
  if (!currentUser) {
    throw new Error("Geen ingelogde leerkracht.");
  }
  return doc(db, "leerkrachten", currentUser.uid);
}

// --- INIT ---
document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      // niet ingelogd → terug naar start
      window.location.href = "index.html";
      return;
    }
    currentUser = user;
    koppelData();
    setupUI();
  });
});

function setupUI() {
  const btnTerug = document.getElementById("btnTerugDashboard");
  const btnLogout = document.getElementById("btnLogout");
  const typeSelect = document.getElementById("typeSelect");
  const datumInput = document.getElementById("datumInput");
  const btnOpslaan = document.getElementById("btnOpslaan");
  const btnPdfLeerling = document.getElementById("btnPdfLeerling");
  const btnOverzichtSpeeltijden = document.getElementById("btnOverzichtSpeeltijden");
  const leerlingSelect = document.getElementById("leerlingSelect");

  // Terug naar dashboard
  btnTerug.addEventListener("click", () => {
    window.location.href = "dashboard.html";
  });

  // Uitloggen
  btnLogout.addEventListener("click", async () => {
    await signOut(auth);
  });

  // Type dropdown vullen
  TYPE_OPTIES.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    typeSelect.appendChild(opt);
  });

  // Datum default = vandaag
  const vandaag = new Date().toISOString().split("T")[0];
  datumInput.value = vandaag;

  // Bij typewijziging: standaard speeltijden invullen
  typeSelect.addEventListener("change", () => {
    const type = typeSelect.value;
    const veld = document.getElementById("speeltijdenInput");
    veld.value = TYPE_CONFIG[type] ?? 1;
  });
  typeSelect.dispatchEvent(new Event("change"));

  // Leerlingselectie
  leerlingSelect.addEventListener("change", () => {
    geselecteerdeLeerlingId = leerlingSelect.value || null;
    renderOverzicht();
  });

  // Registratie opslaan
  btnOpslaan.addEventListener("click", voegRegistratieToe);
console.log("DEBUG: Klik-event is gekoppeld aan voegRegistratieToe()");

  // PDF voor ouders
  btnPdfLeerling.addEventListener("click", genereerPdfVoorLeerling);
  btnOverzichtSpeeltijden.addEventListener("click", toonOverzichtSpeeltijden);
}

// --- DATA KOPPELEN ---
function koppelData() {
  const ref = getLeerkrachtDocRef();
  onSnapshot(ref, (snap) => {
    const data = snap.exists() ? snap.data() : {};
    leerlingen = data.leerlingen || [];
    sancties = data.sancties || {};

    vulLeerlingSelect();

    if (!geselecteerdeLeerlingId && leerlingen.length > 0) {
      geselecteerdeLeerlingId = leerlingen[0].id;
      const select = document.getElementById("leerlingSelect");
      if (select) select.value = geselecteerdeLeerlingId;
    }

    renderOverzicht();
  });
}

function vulLeerlingSelect() {
  const select = document.getElementById("leerlingSelect");
  if (!select) return;

  const huidige = select.value;
  select.innerHTML = '<option value="">Kies een leerling…</option>';

  const gesorteerd = [...leerlingen].sort((a, b) =>
    a.naam.localeCompare(b.naam, "nl", { sensitivity: "base" }),
  );

  gesorteerd.forEach((ll) => {
    const opt = document.createElement("option");
    opt.value = ll.id;
    opt.textContent = ll.naam;
    select.appendChild(opt);
  });

  if (huidige) {
    select.value = huidige;
  }
}

// --- REGISTRATIE TOEVOEGEN ---
async function voegRegistratieToe() {
    console.log("DEBUG: functie voegRegistratieToe() START");

console.log("DEBUG: geselecteerde leerling = ", geselecteerdeLeerlingId);

  if (!geselecteerdeLeerlingId) {
    alert("Kies eerst een leerling.");
    return;
  }

  const datumInput = document.getElementById("datumInput");
  const typeSelect = document.getElementById("typeSelect");
  const speeltijdenInput = document.getElementById("speeltijdenInput");
  const redenInput = document.getElementById("redenInput");

  const datum = datumInput.value;
  const type = typeSelect.value;
  const reden = (redenInput.value || "").trim();
  const speeltijden = parseInt(speeltijdenInput.value, 10) || 1;

  if (!datum) {
    alert("Gelieve een datum te kiezen.");
    return;
  }
  if (!type) {
    alert("Kies een type afspraak.");
    return;
  }

  const sanctieId = Date.now().toString();

  const payload = {
    [`sancties.${geselecteerdeLeerlingId}.${sanctieId}`]: {
      datum,
      type,
      reden,
      speeltijden,
      uitgezeten: 0,
    },
  };
console.log("DEBUG: payload = ", payload);
console.log("DEBUG: docRef = ", getLeerkrachtDocRef());

  try {
    await setDoc(getLeerkrachtDocRef(), payload, { merge: true });
    console.log("DEBUG: setDoc uitgevoerd zonder fout");

    redenInput.value = "";
  } catch (err) {
    console.error(err);
    alert("Opslaan is mislukt. Probeer opnieuw.");
  }
}

// --- OVERZICHT RENDEREN ---
function renderOverzicht() {
  const titel = document.getElementById("overzichtTitel");
  const totaalInfo = document.getElementById("totaalInfo");
  const tbody = document.querySelector("#sanctiesTabel tbody");
  const meldingGeenLeerling = document.getElementById("geenLeerlingMelding");
  const meldingGeenRegistraties = document.getElementById(
    "geenRegistratiesMelding",
  );

  if (!geselecteerdeLeerlingId) {
    titel.textContent = "Overzicht";
    totaalInfo.textContent = "";
    if (tbody) tbody.innerHTML = "";
    if (meldingGeenLeerling) meldingGeenLeerling.style.display = "block";
    if (meldingGeenRegistraties)
      meldingGeenRegistraties.style.display = "none";
    return;
  }

  const leerling = leerlingen.find((l) => l.id === geselecteerdeLeerlingId);
  const naam = leerling ? leerling.naam : "Onbekende leerling";

  titel.textContent = `Overzicht voor ${naam}`;

  const lijst = sancties[geselecteerdeLeerlingId] || {};
  const entries = Object.entries(lijst).map(([id, obj]) => ({ id, ...obj }));

  entries.sort((a, b) => {
    if (a.datum === b.datum) {
      return a.id.localeCompare(b.id);
    }
    return a.datum.localeCompare(b.datum);
  });

  if (entries.length === 0) {
    if (tbody) tbody.innerHTML = "";
    if (meldingGeenLeerling) meldingGeenLeerling.style.display = "none";
    if (meldingGeenRegistraties)
      meldingGeenRegistraties.style.display = "block";
    totaalInfo.textContent =
      "Nog geen registraties voor deze leerling.";
    return;
  } else {
    if (meldingGeenLeerling) meldingGeenLeerling.style.display = "none";
    if (meldingGeenRegistraties)
      meldingGeenRegistraties.style.display = "none";
  }

  let totaalSpeeltijden = 0;
  let totaalUitgezeten = 0;

  const rowsHtml = entries
    .map((s) => {
      const d = s.datum || "";
      const [y, m, day] = d.split("-");
      const datumMooi = day && m ? `${day}/${m}` : d;

      const speelt = Number(s.speeltijden || 0);
      const uit = Number(s.uitgezeten || 0);

      totaalSpeeltijden += speelt;
      totaalUitgezeten += uit;

      const restant = Math.max(speelt - uit, 0);

      return `
      <tr data-id="${s.id}">
        <td class="datum">${datumMooi}</td>
        <td>${escapeHtml(s.type || "")}</td>
        <td class="reden">${escapeHtml(s.reden || "")}</td>
        <td>
          <span class="badge-speeltijd">${speelt} speeltijd${speelt === 1 ? "" : "en"}</span>
        </td>
        <td>
          <span class="badge-uitgezeten">${uit} uitgezeten</span>
          ${
            restant > 0
              ? `<div style="font-size:0.8rem; color:#6b7280;">(${restant} resterend)</div>`
              : ""
          }
        </td>
        <td>
          <div class="actieknoppen">
            <button type="button" onclick="window.pasSpeeltijdAan('${s.id}', 1)">+1</button>
            <button type="button" onclick="window.pasSpeeltijdAan('${s.id}', -1)">-1</button>
            <button type="button" class="actie-verwijder" onclick="window.verwijderRegistratie('${s.id}')">Verwijder</button>
          </div>
        </td>
      </tr>
    `;
    })
    .join("");

  if (tbody) {
    tbody.innerHTML = rowsHtml;
  }

  const restantTotaal = Math.max(totaalSpeeltijden - totaalUitgezeten, 0);
  totaalInfo.textContent = `Totaal: ${totaalSpeeltijden} speeltijden (${totaalUitgezeten} reeds uitgezeten, ${restantTotaal} resterend).`;
}

// Kleine helper om HTML te escapen
function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
// --- Speeltijd-uitgezeten bijwerken ---
window.pasSpeeltijdAan = async function (sanctieId, delta) {
  if (!geselecteerdeLeerlingId) return;

  const lijst = sancties[geselecteerdeLeerlingId] || {};
  const s = lijst[sanctieId];
  if (!s) return;

  const huidige = Number(s.uitgezeten || 0);
  const max = Number(s.speeltijden || 0);
  let nieuw = huidige + delta;
  if (nieuw < 0) nieuw = 0;
  if (nieuw > max) nieuw = max;

  try {
    await updateDoc(getLeerkrachtDocRef(), {
      [`sancties.${geselecteerdeLeerlingId}.${sanctieId}.uitgezeten`]:
        nieuw,
    });
  } catch (err) {
    console.error(err);
    alert("Bijwerken is mislukt.");
  }
};

// --- Registratie verwijderen ---
window.verwijderRegistratie = async function (sanctieId) {
  if (!geselecteerdeLeerlingId) return;

  const leerling = leerlingen.find((l) => l.id === geselecteerdeLeerlingId);
  const naam = leerling ? leerling.naam : "deze leerling";
  if (!confirm(`Wil je deze registratie voor ${naam} echt verwijderen?`))
    return;

  try {
    await updateDoc(getLeerkrachtDocRef(), {
      [`sancties.${geselecteerdeLeerlingId}.${sanctieId}`]: deleteField(),
    });
  } catch (err) {
    console.error(err);
    alert("Verwijderen is mislukt.");
  }
};

// --- PDF PER LEERLING ---
async function genereerPdfVoorLeerling() {
  if (!geselecteerdeLeerlingId) {
    alert("Kies eerst een leerling.");
    return;
  }

  const leerling = leerlingen.find((l) => l.id === geselecteerdeLeerlingId);
  if (!leerling) {
    alert("Leerling niet gevonden.");
    return;
  }

  const lijst = sancties[geselecteerdeLeerlingId] || {};
  const entries = Object.entries(lijst).map(([id, obj]) => ({
    id,
    ...obj,
  }));
  if (entries.length === 0) {
    alert("Er zijn nog geen registraties voor deze leerling.");
    return;
  }

  entries.sort((a, b) => {
    if (a.datum === b.datum) return a.id.localeCompare(b.id);
    return a.datum.localeCompare(b.datum);
  });

  let totaalSpeeltijden = 0;
  entries.forEach((e) => {
    totaalSpeeltijden += Number(e.speeltijden || 0);
  });

  const container = document.getElementById("pdfContainer");
  if (!container) return;

  let html = `
    <h1>Gedragsopvolging – ${escapeHtml(leerling.naam)}</h1>
    <p>Overzicht van de registraties rond klasafspraken.</p>
    <p><strong>Totaal aantal speeltijden:</strong> ${totaalSpeeltijden}</p>
    <table style="width:100%; border-collapse: collapse; font-size: 11px; margin-top: 10px;">
      <thead>
        <tr>
          <th style="border:1px solid #ccc; padding:4px;">Datum</th>
          <th style="border:1px solid #ccc; padding:4px;">Type</th>
          <th style="border:1px solid #ccc; padding:4px;">Reden</th>
          <th style="border:1px solid #ccc; padding:4px;">Speeltijden</th>
        </tr>
      </thead>
      <tbody>
  `;

  entries.forEach((e) => {
    const d = e.datum || "";
    const [y, m, day] = d.split("-");
    const datumMooi = day && m ? `${day}/${m}/${y}` : d;
    html += `
      <tr>
        <td style="border:1px solid #ccc; padding:4px;">${datumMooi}</td>
        <td style="border:1px solid #ccc; padding:4px;">${escapeHtml(e.type || "")}</td>
        <td style="border:1px solid #ccc; padding:4px;">${escapeHtml(e.reden || "")}</td>
        <td style="border:1px solid #ccc; padding:4px; text-align:center;">${Number(e.speeltijden || 0)}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
    <p style="margin-top:14px; font-size:10px; color:#4b5563;">
      Dit overzicht kan met ouders besproken worden tijdens een gesprek of oudercontact.
    </p>
  `;

  container.innerHTML = html;

  const canvas = await window.html2canvas(container, { scale: 2 });
  const imgData = canvas.toDataURL("image/png");

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p", "mm", "a4");

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  const imgProps = pdf.getImageProperties(imgData);
  const ratio = imgProps.width / imgProps.height;

  let renderWidth = pdfWidth - 20;
  let renderHeight = renderWidth / ratio;
  if (renderHeight > pdfHeight - 20) {
    renderHeight = pdfHeight - 20;
    renderWidth = renderHeight * ratio;
  }

  pdf.addImage(
    imgData,
    "PNG",
    (pdfWidth - renderWidth) / 2,
    10,
    renderWidth,
    renderHeight,
  );

  pdf.save(`Gedragsopvolging_${leerling.naam}.pdf`);

  container.innerHTML = "";
}
function toonOverzichtSpeeltijden() {
  const box = document.getElementById("speeltijdenOverzicht");
  if (!box) return;

  let html = "<strong>Leerlingen die nog speeltijden moeten binnenzitten:</strong><ul>";
  let gevonden = false;

  leerlingen.forEach((leerling) => {
    const lijst = sancties[leerling.id] || {};
    let totaal = 0;
    let uitgezeten = 0;

    Object.values(lijst).forEach((s) => {
      totaal += Number(s.speeltijden || 0);
      uitgezeten += Number(s.uitgezeten || 0);
    });

    const restant = totaal - uitgezeten;

    if (restant > 0) {
      gevonden = true;
      html += `
  <li style="margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
    <span
      style="cursor:pointer;"
      onclick="document.getElementById('leerlingSelect').value='${leerling.id}';
               document.getElementById('leerlingSelect').dispatchEvent(new Event('change'));">
      ${leerling.naam} – ${restant} speeltijd${restant === 1 ? "" : "en"}
    </span>
    <button
      style="font-size:0.75rem;"
      onclick="markeerSpeeltijdUitgezeten('${leerling.id}')">
      +1 uitgezeten
    </button>
  </li>`;
    }
  });

  html += "</ul>";

  if (!gevonden) {
    html = "<strong>Alle speeltijden zijn uitgezeten 👍</strong>";
  }

  box.innerHTML = html;
  box.style.display = "block";
}
window.markeerSpeeltijdUitgezeten = async function (leerlingId) {
  const lijst = sancties[leerlingId];
  if (!lijst) return;

  // zoek oudste sanctie die nog niet volledig uitgezeten is
  const entries = Object.entries(lijst)
    .map(([id, s]) => ({ id, ...s }))
    .sort((a, b) => a.datum.localeCompare(b.datum));

  const sanctie = entries.find(
    (s) => Number(s.uitgezeten || 0) < Number(s.speeltijden || 0)
  );

  if (!sanctie) return;

  const nieuwAantal = Number(sanctie.uitgezeten || 0) + 1;

  await updateDoc(getLeerkrachtDocRef(), {
    [`sancties.${leerlingId}.${sanctie.id}.uitgezeten`]: nieuwAantal,
  });
};
