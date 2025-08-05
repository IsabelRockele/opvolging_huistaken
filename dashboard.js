// Importeer Firebase services
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const auth = getAuth();
const db = getFirestore();

// Globale variabelen om de staat van de app bij te houden
let currentUser;
let leerkrachtData = {
    leerlingen: [],
    huistaken: {},
    weekDatums: {} 
};

const statusOpties = ["op tijd", "te laat", "onvolledig", "niet gemaakt", "ziek"];
const kleuren = {
  "op tijd": "op-tijd", "te laat": "te-laat", "onvolledig": "onvolledig",
  "niet gemaakt": "niet-gemaakt", "ziek": "ziek", "geen": ""
};
const wekenConfig = { 1: 15, 2: 11, 3: 11 };

// Wacht tot de DOM geladen is
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, user => {
        if (user) {
            currentUser = user;
            document.getElementById('content').style.display = 'block';
            koppelDataEnRender();
            setupEventListeners();
        } else {
            window.location.href = 'index.html';
        }
    });
});

function setupEventListeners() {
    document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth));
    document.getElementById('addLeerlingBtn').addEventListener('click', voegLeerlingToe);
    document.getElementById('rapportperiode').addEventListener('change', renderTabel);
    // NIEUW: Koppel de nieuwe knop aan de reset-functie
    document.getElementById('nieuwSchooljaarBtn').addEventListener('click', startNieuwSchooljaar);
}

function koppelDataEnRender() {
    const docRef = doc(db, "leerkrachten", currentUser.uid);
    onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            leerkrachtData = docSnap.data();
            if (!leerkrachtData.leerlingen) leerkrachtData.leerlingen = [];
            if (!leerkrachtData.huistaken) leerkrachtData.huistaken = {};
            if (!leerkrachtData.weekDatums) leerkrachtData.weekDatums = {};
        }
        
        for (const periode in wekenConfig) {
            if (!leerkrachtData.weekDatums[periode] || leerkrachtData.weekDatums[periode].length !== wekenConfig[periode]) {
                leerkrachtData.weekDatums[periode] = Array(wekenConfig[periode]).fill('');
            }
        }
        renderTabel();
    });
}

function renderTabel() {
    const periode = document.getElementById("rapportperiode").value;
    const aantalWeken = wekenConfig[periode];
    const datumsVoorPeriode = leerkrachtData.weekDatums[periode] || Array(aantalWeken).fill('');
    const container = document.getElementById("tabelContainer");
    container.innerHTML = "";
    
    const leerlingDataForStorage = {};
    (leerkrachtData.leerlingen || []).forEach(l => {
        const statussen = leerkrachtData.huistaken[l.id]?.[periode] || Array(aantalWeken).fill('op tijd');
        leerlingDataForStorage[l.naam] = {
            statussen: statussen,
            datums: datumsVoorPeriode
        };
    });
    localStorage.setItem("detailPaginaData", JSON.stringify(leerlingDataForStorage));
    localStorage.setItem("huidigeRapportperiode", periode);

    if (!leerkrachtData.leerlingen || leerkrachtData.leerlingen.length === 0) {
        container.innerHTML = "<p>Voeg een leerling toe om te beginnen.</p>";
        return;
    }

    const tabel = document.createElement("table");
    const thead = tabel.insertRow();
    thead.innerHTML = "<th>Leerling</th>" + Array.from({length: aantalWeken}, (_, i) => 
        `<th>
            Week ${i+1}<br>
            <input type="date" value="${datumsVoorPeriode[i] || ''}" onchange="window.updateWeekDatum('${periode}', ${i}, this.value)" style="width: 110px;">
            <br>
            <button onclick="window.toggleWeek(${i})">Geen taak</button>
        </th>`).join("") + "<th>Overzicht (% op tijd)</th>";

    leerkrachtData.leerlingen.forEach(leerling => {
        const rij = tabel.insertRow();
        const naamCel = rij.insertCell();
        
        naamCel.innerHTML = `
            <a href="leerling.html?naam=${encodeURIComponent(leerling.naam)}">${leerling.naam}</a>
            <button class="verwijder-knop" onclick="window.verwijderLeerling('${leerling.id}')" title="Verwijder ${leerling.naam}">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6Z"/>
                    <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1ZM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118ZM2.5 3V2h11v1h-11Z"/>
                </svg>
            </button>
        `;

        const statussen = leerkrachtData.huistaken[leerling.id]?.[periode] || Array(aantalWeken).fill('op tijd');

        for (let j = 0; j < aantalWeken; j++) {
            const cel = rij.insertCell();
            const status = statussen[j] || 'op tijd';
            if (status === "geen") {
                cel.textContent = "Geen taak"; continue;
            }
            const select = document.createElement("select");
            statusOpties.forEach(optie => {
                const option = document.createElement("option");
                option.value = optie;
                option.textContent = optie;
                if (optie === status) option.selected = true;
                select.appendChild(option);
            });
            select.className = kleuren[status];
            select.onchange = (event) => updateStatus(leerling.id, periode, j, event.target.value);
            cel.appendChild(select);
        }
        
        const overzichtCel = rij.insertCell();
        const relevanteStatussen = statussen.filter(s => s !== 'ziek' && s !== 'geen');
        const aantalOpTijd = relevanteStatussen.filter(s => s === 'op tijd').length;
        overzichtCel.textContent = relevanteStatussen.length > 0 
            ? `${Math.round((aantalOpTijd / relevanteStatussen.length) * 100)}%` 
            : "N/A";
    });
    container.appendChild(tabel);
}

async function slaDataOp() {
    const docRef = doc(db, "leerkrachten", currentUser.uid);
    await setDoc(docRef, leerkrachtData, { merge: true });
}

async function voegLeerlingToe() {
    const input = document.getElementById('nieuweLeerlingNaam');
    const naam = input.value.trim();
    if (naam === '') { alert('Geef een naam op.'); return; }

    leerkrachtData.leerlingen.push({ id: `id_${Date.now()}`, naam: naam });
    leerkrachtData.leerlingen.sort((a, b) => a.naam.localeCompare(b.naam));

    input.value = '';
    await slaDataOp();
}

window.verwijderLeerling = async function(leerlingId) {
    if (confirm('Weet je zeker dat je deze leerling en alle bijbehorende data wilt verwijderen?')) {
        leerkrachtData.leerlingen = leerkrachtData.leerlingen.filter(l => l.id !== leerlingId);
        delete leerkrachtData.huistaken[leerlingId];
        await slaDataOp();
    }
}

async function updateStatus(leerlingId, periode, weekIndex, nieuweStatus) {
    if (!leerkrachtData.huistaken[leerlingId]) leerkrachtData.huistaken[leerlingId] = {};
    if (!leerkrachtData.huistaken[leerlingId][periode]) {
        leerkrachtData.huistaken[leerlingId][periode] = Array(wekenConfig[periode]).fill('op tijd');
    }
    leerkrachtData.huistaken[leerlingId][periode][weekIndex] = nieuweStatus;
    await slaDataOp();
}

window.updateWeekDatum = async function(periode, weekIndex, nieuweDatum) {
    if (!leerkrachtData.weekDatums[periode]) {
        leerkrachtData.weekDatums[periode] = Array(wekenConfig[periode]).fill('');
    }
    leerkrachtData.weekDatums[periode][weekIndex] = nieuweDatum;
    await slaDataOp();
    renderTabel();
}

window.toggleWeek = async function(index) {
    const periode = document.getElementById("rapportperiode").value;
    leerkrachtData.leerlingen.forEach(leerling => {
        if (!leerkrachtData.huistaken[leerling.id]) leerkrachtData.huistaken[leerling.id] = {};
        if (!leerkrachtData.huistaken[leerling.id][periode]) {
            leerkrachtData.huistaken[leerling.id][periode] = Array(wekenConfig[periode]).fill('op tijd');
        }
        const statussen = leerkrachtData.huistaken[leerling.id][periode];
        if (statussen[index] !== 'geen') {
            statussen[`_previous_${index}`] = statussen[index];
            statussen[index] = 'geen';
        } else {
            statussen[index] = statussen[`_previous_${index}`] || 'op tijd';
        }
    });
    await slaDataOp();
}

// NIEUW: Functie om de data van een schooljaar te wissen
async function startNieuwSchooljaar() {
    const bevestiging = prompt("OPGELET: U staat op het punt alle leerlingen, statussen en datums te verwijderen. Dit kan niet ongedaan worden gemaakt. Typ 'RESET' om te bevestigen.");
    if (bevestiging === 'RESET') {
        leerkrachtData.leerlingen = [];
        leerkrachtData.huistaken = {};
        leerkrachtData.weekDatums = {}; // Wis ook de datums
        
        // Sla de lege data op naar Firebase
        await slaDataOp();

        // De onSnapshot listener zal de lege tabel automatisch renderen
        alert("Alle data is gewist. U kunt beginnen met een nieuw schooljaar.");
    } else {
        alert("Actie geannuleerd.");
    }
}