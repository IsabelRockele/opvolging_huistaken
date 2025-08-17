// Importeer Firebase services
import { getAuth, onAuthStateChanged, signOut, updatePassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const auth = getAuth();
const db = getFirestore();

// Globale variabelen
let currentUser;
let leerkrachtData = {
    leerlingen: [],
    huistaken: {},
    weekDatums: {} 
};
let klasOverzichtChartInstance = null; // Variabele voor het diagram

const statusOpties = ["op tijd", "te laat", "onvolledig", "niet gemaakt", "ziek", "geen"];
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
    document.getElementById('nieuwSchooljaarBtn').addEventListener('click', startNieuwSchooljaar);
    document.getElementById('wijzigWachtwoordBtn').addEventListener('click', wijzigWachtwoord);
    document.getElementById('toonOverzichtBtn').addEventListener('click', toonKlasOverzicht);
    document.getElementById('printOverzichtBtn').addEventListener('click', () => window.print());
    document.getElementById('printAlleLeerlingenBtn').addEventListener('click', genereerBulkPdf);
}

function wijzigWachtwoord() {
    const nieuwWachtwoord = prompt("Voer uw nieuwe wachtwoord in. Het moet minstens 6 tekens lang zijn.");
    
    if (nieuwWachtwoord && nieuwWachtwoord.length >= 6) {
        updatePassword(currentUser, nieuwWachtwoord).then(() => {
            alert("Uw wachtwoord is succesvol gewijzigd.");
        }).catch((error) => {
            alert("Fout bij het wijzigen van het wachtwoord: " + error.message);
        });
    } else if (nieuwWachtwoord) {
        alert("Wachtwoord te kort. Het moet minstens 6 tekens bevatten.");
    }
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

function renderKlasOverzicht() {
    const periode = document.getElementById("rapportperiode").value;
    const textContainer = document.getElementById("klasOverzichtText");
    const chartCanvas = document.getElementById("klasOverzichtChart");
    
    let telling = {
        "op tijd": 0, "te laat": 0, "onvolledig": 0, "niet gemaakt": 0
    };
    let totaal = 0;
    const leerlingScores = {};
    leerkrachtData.leerlingen.forEach(l => {
        leerlingScores[l.naam] = { "te laat": 0, "onvolledig": 0, "niet gemaakt": 0 };
    });

    if (!leerkrachtData.leerlingen || leerkrachtData.leerlingen.length === 0) {
        chartCanvas.style.display = 'none';
        textContainer.innerHTML = "<p>Voeg eerst leerlingen toe.</p>";
        return;
    }

    leerkrachtData.leerlingen.forEach(leerling => {
        const statussen = leerkrachtData.huistaken[leerling.id]?.[periode] || [];
        statussen.forEach(status => {
            if (status !== 'ziek' && status !== 'geen') {
                totaal++;
                if (telling.hasOwnProperty(status)) telling[status]++;
            }
            if (leerlingScores[leerling.naam]?.hasOwnProperty(status)) {
                leerlingScores[leerling.naam][status]++;
            }
        });
    });
    
    let overzichtHTML = `<h2>Klasoverzicht Rapportperiode ${periode}</h2>`;

    if (totaal === 0) {
        chartCanvas.style.display = 'none';
        overzichtHTML += "<p>Nog geen data beschikbaar om een overzicht te maken.</p>";
    } else {
        chartCanvas.style.display = 'block';
        if (klasOverzichtChartInstance) klasOverzichtChartInstance.destroy();
        const ctx = chartCanvas.getContext('2d');
        klasOverzichtChartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(telling).map(k => `${k.charAt(0).toUpperCase() + k.slice(1)} (${Math.round(telling[k]/totaal*100)}%)`),
                datasets: [{
                    data: Object.values(telling),
                    backgroundColor: ["#c8f7c5", "#fdd49a", "#fff7a8", "#f4cccc"]
                }]
            },
            options: {
                responsive: true,
                animation: false,
                plugins: { legend: { position: 'bottom' } }
            }
        });
        // De aparte lijst met percentages is hier weggehaald voor een rustiger beeld
    }

    overzichtHTML += `<hr style="margin: 20px 0;"><h3>Aandachtspunten per categorie</h3>`;
    const statussenOmTeChecken = ["te laat", "onvolledig", "niet gemaakt"];
    statussenOmTeChecken.forEach(status => {
        const statusNaam = status.charAt(0).toUpperCase() + status.slice(1);
        overzichtHTML += `<h4>${statusNaam}</h4>`;
        const gesorteerdeLeerlingen = Object.entries(leerlingScores)
            .map(([naam, scores]) => ({ naam, aantal: scores[status] }))
            .filter(l => l.aantal > 0).sort((a, b) => b.aantal - a.aantal);
        if (gesorteerdeLeerlingen.length === 0) {
            overzichtHTML += `<p style="font-style: italic;">Geen.</p>`;
        } else {
            overzichtHTML += `<ul style="list-style-type: none; padding-left: 10px;">`;
            gesorteerdeLeerlingen.slice(0, 3).forEach(leerling => {
                overzichtHTML += `<li>${leerling.naam} (${leerling.aantal} keer)</li>`;
            });
            overzichtHTML += `</ul>`;
        }
    });
    textContainer.innerHTML = overzichtHTML;
}

// *** DEZE FUNCTIE IS GECORRIGEERD ***
function toonKlasOverzicht() {
    const dialog = document.getElementById('klasOverzichtDialog');
    // EERST de pop-up tonen...
    dialog.showModal();
    // ...DAN pas de inhoud genereren.
    renderKlasOverzicht();
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
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="  0 16 16">
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

async function genereerBulkPdf() {
    const btn = document.getElementById('printAlleLeerlingenBtn');
    btn.textContent = 'PDF genereren...';
    btn.disabled = true;

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const periode = document.getElementById("rapportperiode").value;
    const datums = leerkrachtData.weekDatums[periode] || Array(wekenConfig[periode]).fill('');
    const renderContainer = document.getElementById('pdf-render-container');

    const leerlingen = leerkrachtData.leerlingen;

    for (let i = 0; i < leerlingen.length; i++) {
        const leerling = leerlingen[i];
        
        const statussen = (leerkrachtData.huistaken[leerling.id]?.[periode] || []).filter(s => s !== 'geen');
        const telling = {"op tijd": 0, "te laat": 0, "onvolledig": 0, "niet gemaakt": 0, "ziek": 0};
        statussen.forEach(s => { if(telling[s] !== undefined) telling[s]++; });

        let samenvattingHTML = '<h3>Samenvatting</h3><ul>';
        const statusDetails = {"te laat": [], "onvolledig": [], "niet gemaakt": [], "ziek": []};
        (leerkrachtData.huistaken[leerling.id]?.[periode] || []).forEach((status, index) => {
            if (statusDetails[status]) {
                const datumString = datums[index];
                if (datumString) {
                    const [year, month, day] = datumString.split('-');
                    statusDetails[status].push(`${day}/${month}/${year}`);
                } else {
                    statusDetails[status].push(`(geen datum)`);
                }
            }
        });
        samenvattingHTML += `<li><strong>Op tijd:</strong> ${telling['op tijd']} keer</li>`;
        for (const [status, datumLijst] of Object.entries(statusDetails)) {
            if (datumLijst.length > 0) {
                const statusNaam = status.charAt(0).toUpperCase() + status.slice(1);
                samenvattingHTML += `<li><strong>${statusNaam}:</strong> ${datumLijst.length} keer<ul>`;
                datumLijst.forEach(d => { samenvattingHTML += `<li>${d}</li>`; });
                samenvattingHTML += `</ul></li>`;
            }
        }
        samenvattingHTML += "</ul>";
        
        renderContainer.innerHTML = `
            <h1>Overzicht voor ${leerling.naam}</h1>
            <canvas id="temp-chart"></canvas>
            <div id="temp-summary">${samenvattingHTML}</div>
        `;

        new Chart(document.getElementById('temp-chart').getContext('2d'), {
            type: 'pie',
            data: {
                labels: Object.keys(telling),
                datasets: [{
                    data: Object.values(telling),
                    backgroundColor: ["#c8f7c5", "#ffe0b3", "#fff9c4", "#f8d7da", "#d0e7ff"]
                }]
            },
            options: { animation: false }
        });
        
        const canvas = await html2canvas(renderContainer);
        const imgData = canvas.toDataURL('image/png');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    }
    
    pdf.save(`rapporten-periode-${periode}.pdf`);
    renderContainer.innerHTML = '';
    btn.textContent = 'PDF Alle Rapporten';
    btn.disabled = false;
}

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

    let startPeriode = 0;
    while (!startPeriode || !wekenConfig[startPeriode]) {
        const periodeInput = prompt(`In welke rapportperiode start ${naam}? (1, 2, of 3)`);
        if (periodeInput === null) return;
        
        const periodeNum = parseInt(periodeInput.match(/\d+/)?.[0], 10);
        if (wekenConfig[periodeNum]) {
            startPeriode = periodeNum;
        } else {
            alert("Ongeldige invoer. Voer alstublieft 1, 2, of 3 in.");
        }
    }

    let startWeekInPeriode = 0;
    const maxWeken = wekenConfig[startPeriode];
    while (!startWeekInPeriode || startWeekInPeriode < 1 || startWeekInPeriode > maxWeken) {
        const weekInput = prompt(`In welke week van periode ${startPeriode} start ${naam}? (een getal tussen 1 en ${maxWeken})`);
        if (weekInput === null) return;
        
        const weekNum = parseInt(weekInput.match(/\d+/)?.[0], 10);
        if (weekNum >= 1 && weekNum <= maxWeken) {
            startWeekInPeriode = weekNum;
        } else {
            alert(`Ongeldige invoer. Voer een getal in tussen 1 en ${maxWeken}.`);
        }
    }
    
    let startWeekAbsoluut = startWeekInPeriode;
    for (let i = 1; i < startPeriode; i++) {
        startWeekAbsoluut += wekenConfig[i];
    }

    const nieuweLeerling = { id: `id_${Date.now()}`, naam: naam };
    leerkrachtData.leerlingen.push(nieuweLeerling);
    leerkrachtData.leerlingen.sort((a, b) => a.naam.localeCompare(b.naam));
    leerkrachtData.huistaken[nieuweLeerling.id] = {};

    let wekenVoorgaandePeriodes = 0;
    const periodes = Object.keys(wekenConfig).sort((a, b) => a - b); 

    for (const periode of periodes) {
        const aantalWekenInPeriode = wekenConfig[periode];
        const nieuweStatussen = Array(aantalWekenInPeriode).fill('op tijd');
        const startWeekRelatief = startWeekAbsoluut - wekenVoorgaandePeriodes;

        if (startWeekRelatief > 1) {
            for (let i = 0; i < aantalWekenInPeriode; i++) {
                if ((i + 1) < startWeekRelatief) {
                    nieuweStatussen[i] = 'geen';
                }
            }
        }
        
        leerkrachtData.huistaken[nieuweLeerling.id][periode] = nieuweStatussen;
        wekenVoorgaandePeriodes += aantalWekenInPeriode;
    }

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

async function startNieuwSchooljaar() {
    const bevestiging = prompt("OPGELET: U staat op het punt alle leerlingen, statussen en datums te verwijderen. Dit kan niet ongedaan worden gemaakt. Typ 'RESET' om te bevestigen.");
    if (bevestiging === 'RESET') {
        leerkrachtData.leerlingen = [];
        leerkrachtData.huistaken = {};
        leerkrachtData.weekDatums = {};
        
        await slaDataOp();

        alert("Alle data is gewist. U kunt beginnen met een nieuw schooljaar.");
    } else {
        alert("Actie geannuleerd.");
    }
}