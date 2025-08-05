// Importeer Firebase services
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const auth = getAuth();
const db = getFirestore();

// Globale variabelen om de staat van de app bij te houden
let currentUser;
let leerkrachtData = {
    leerlingen: [],
    huistaken: {}
};

const statusOpties = ["op tijd", "te laat", "onvolledig", "niet gemaakt", "ziek"];
const kleuren = {
  "op tijd": "op-tijd", "te laat": "te-laat", "onvolledig": "onvolledig",
  "niet gemaakt": "niet-gemaakt", "ziek": "ziek", "geen": ""
};
const wekenConfig = { 1: 15, 2: 11, 3: 11 };

// Wacht tot de DOM geladen is
document.addEventListener('DOMContentLoaded', () => {
    // Luister naar authenticatie-status
    onAuthStateChanged(auth, user => {
        if (user) {
            // Gebruiker is ingelogd
            currentUser = user;
            document.getElementById('content').style.display = 'block';
            koppelDataEnRender();
            setupEventListeners();
        } else {
            // Gebruiker is niet ingelogd, stuur terug naar de login pagina
            window.location.href = 'index.html';
        }
    });
});

function setupEventListeners() {
    document.getElementById('logoutBtn').addEventListener('click', () => {
        signOut(auth);
    });

    document.getElementById('addLeerlingBtn').addEventListener('click', voegLeerlingToe);
    document.getElementById('rapportperiode').addEventListener('change', renderTabel);
}

// Koppelt een real-time listener aan de data van de leerkracht
function koppelDataEnRender() {
    const docRef = doc(db, "leerkrachten", currentUser.uid);
    onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            leerkrachtData = docSnap.data();
            // Zorg dat de basisstructuur altijd bestaat
            if (!leerkrachtData.leerlingen) leerkrachtData.leerlingen = [];
            if (!leerkrachtData.huistaken) leerkrachtData.huistaken = {};
        } else {
            // Document bestaat nog niet, dit is waarschijnlijk een nieuwe leerkracht
            console.log("Nieuwe leerkracht, data wordt geïnitialiseerd.");
        }
        renderAlles();
    });
}

// Functie om de volledige interface te vernieuwen
function renderAlles() {
    renderLeerlingBeheer();
    renderTabel();
}

// Render de lijst met leerlingen en verwijderknoppen
function renderLeerlingBeheer() {
    const lijst = document.getElementById('leerlingenLijst');
    lijst.innerHTML = '';
    leerkrachtData.leerlingen.forEach(leerling => {
        const li = document.createElement('li');
        li.textContent = leerling.naam;
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Verwijder';
        deleteBtn.onclick = () => verwijderLeerling(leerling.id);
        li.appendChild(deleteBtn);
        lijst.appendChild(li);
    });
}

// Render de huistakentabel
function renderTabel() {
    const periode = document.getElementById("rapportperiode").value;
    const aantalWeken = wekenConfig[periode];
    const container = document.getElementById("tabelContainer");
    container.innerHTML = "";
    
    // Data voorbereiden voor leerling.html (localStorage)
    const leerlingDataForStorage = {};
    leerkrachtData.leerlingen.forEach(l => {
        leerlingDataForStorage[l.naam] = leerkrachtData.huistaken[l.id]?.[periode] || [];
    });
    localStorage.setItem("huistakenData", JSON.stringify(leerlingDataForStorage));
    localStorage.setItem("huidigeRapportperiode", periode);

    if (leerkrachtData.leerlingen.length === 0) {
        container.innerHTML = "<p>Voeg eerst leerlingen toe bij 'Klasbeheer'.</p>";
        return;
    }

    const tabel = document.createElement("table");
    const thead = tabel.insertRow();
    thead.innerHTML = "<th>Leerling</th>" + Array.from({length: aantalWeken}, (_, i) => 
        `<th>Week ${i+1}<br><button onclick="window.toggleWeek(${i})">Geen taak</button></th>`).join("") + "<th>Overzicht (% op tijd)</th>";

    leerkrachtData.leerlingen.forEach(leerling => {
        const rij = tabel.insertRow();
        const naamCel = rij.insertCell();
        naamCel.innerHTML = `<a href="leerling.html?naam=${encodeURIComponent(leerling.naam)}">${leerling.naam}</a>`;

        const statussen = leerkrachtData.huistaken[leerling.id]?.[periode] || Array(aantalWeken).fill('op tijd');

        for (let j = 0; j < aantalWeken; j++) {
            const cel = rij.insertCell();
            const status = statussen[j] || 'op tijd'; // Fallback
            if (status === "geen") {
                cel.textContent = "Geen taak";
                continue;
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
            select.onchange = function () {
                updateStatus(leerling.id, periode, j, this.value);
            };
            cel.appendChild(select);
        }
        
        // Berekening overzicht
        const overzichtCel = rij.insertCell();
        const relevanteStatussen = statussen.filter(s => s !== 'ziek' && s !== 'geen');
        const aantalOpTijd = relevanteStatussen.filter(s => s === 'op tijd').length;
        if(relevanteStatussen.length > 0) {
            overzichtCel.textContent = `${Math.round((aantalOpTijd / relevanteStatussen.length) * 100)}%`;
        } else {
            overzichtCel.textContent = "N/A";
        }
    });
    container.appendChild(tabel);
}

// --- DATA MANIPULATIE FUNCTIES ---

async function slaDataOp() {
    const docRef = doc(db, "leerkrachten", currentUser.uid);
    await setDoc(docRef, leerkrachtData, { merge: true });
}

async function voegLeerlingToe() {
    const input = document.getElementById('nieuweLeerlingNaam');
    const naam = input.value.trim();
    if (naam === '') {
        alert('Geef een naam op.');
        return;
    }

    const nieuweLeerling = {
        id: `id_${Date.now()}`, // Simpele unieke ID
        naam: naam
    };

    leerkrachtData.leerlingen.push(nieuweLeerling);
    input.value = '';
    await slaDataOp(); // onSnapshot zal de UI automatisch bijwerken
}

async function verwijderLeerling(leerlingId) {
    if (confirm('Weet je zeker dat je deze leerling en alle bijbehorende data wilt verwijderen?')) {
        leerkrachtData.leerlingen = leerkrachtData.leerlingen.filter(l => l.id !== leerlingId);
        delete leerkrachtData.huistaken[leerlingId]; // Verwijder ook de huistakendata
        await slaDataOp();
    }
}

async function updateStatus(leerlingId, periode, weekIndex, nieuweStatus) {
    if (!leerkrachtData.huistaken[leerlingId]) {
        leerkrachtData.huistaken[leerlingId] = {};
    }
    if (!leerkrachtData.huistaken[leerlingId][periode]) {
        leerkrachtData.huistaken[leerlingId][periode] = Array(wekenConfig[periode]).fill('op tijd');
    }
    leerkrachtData.huistaken[leerlingId][periode][weekIndex] = nieuweStatus;
    await slaDataOp();
}

window.toggleWeek = async function(index) {
    const periode = document.getElementById("rapportperiode").value;
    leerkrachtData.leerlingen.forEach(leerling => {
        // Zorg ervoor dat de data voor deze leerling bestaat
        if (!leerkrachtData.huistaken[leerling.id]) leerkrachtData.huistaken[leerling.id] = {};
        if (!leerkrachtData.huistaken[leerling.id][periode]) {
            leerkrachtData.huistaken[leerling.id][periode] = Array(wekenConfig[periode]).fill('op tijd');
        }
        
        const statussen = leerkrachtData.huistaken[leerling.id][periode];
        if (statussen[index] !== 'geen') {
            statussen[`_previous_${index}`] = statussen[index]; // Sla vorige staat op
            statussen[index] = 'geen';
        } else {
            statussen[index] = statussen[`_previous_${index}`] || 'op tijd';
        }
    });
    await slaDataOp();
}