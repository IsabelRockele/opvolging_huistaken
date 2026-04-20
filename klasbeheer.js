// ==============================================
// KLASBEHEER - Firebase-gekoppelde versie
// ==============================================
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, doc, onSnapshot, setDoc, updateDoc, getDoc,
  collection, query, where, getDocs, arrayUnion, arrayRemove, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Firebase-config (zelfde als script.js/dashboard.js van de huiswerkapp)
const firebaseConfig = {
  apiKey: "AIzaSyA7KxXMvZ4dzBQDut3CMyWUblLte2tFzoQ",
  authDomain: "huiswerkapp-a311e.firebaseapp.com",
  projectId: "huiswerkapp-a311e",
  storageBucket: "huiswerkapp-a311e.appspot.com",
  messagingSenderId: "797169941164",
  appId: "1:797169941164:web:511d9618079f1378d0fd09"
};

// Init (hergebruik app indien al geïnitialiseerd)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// ==============================================
// GLOBALE STAAT
// ==============================================
let huidigeUser = null;
let teamId = null;
let teamData = null;       // lokale kopie van de volledige data
let teamUnsubscribe = null; // voor realtime listener
let huidigLeerjaar = 'L1'; // voor werkboeken schakelaar
let knutselFilter = 'alle';
let geselecteerdeCatId = null; // voor stock accordion
let aanHetBewarenBezig = false;
let bewaarTimer = null;

// ==============================================
// STANDAARD STARTDATA
// ==============================================
function standaardData(eigenaarUid, eigenaarEmail) {
  return {
    eigenaar: eigenaarUid,
    leden_uids: [eigenaarUid],
    leden_emails: [eigenaarEmail.toLowerCase()],
    aangemaakt: serverTimestamp(),
    laatst_gewijzigd: serverTimestamp(),

    instellingen: {
      naam: '',
      klasNr: '',
      kinderen: 23,
      reserve: 5,
      schooljaar: '2026-2027',
      huidigSchooljaar: '2026-2027'
    },

    // Werkboeken per leerjaar
    werkboeken: {
      L1: [],
      L2: [
        {
          id: 'm1',
          naam: 'Karakter leerjaar 2',
          uitgever: 'Van In',
          delen: [
            { id: 'd1', naam: 'Werkschrift a', stock: 8 },
            { id: 'd2', naam: 'Werkschrift b', stock: 4 }
          ]
        },
        {
          id: 'm2',
          naam: 'Taalkanjers – werkboek',
          uitgever: 'Plantyn',
          delen: [
            { id: 'd3', naam: 'Deel A', stock: 9 },
            { id: 'd4', naam: 'Deel B', stock: 6 },
            { id: 'd5', naam: 'Deel C', stock: 6 },
            { id: 'd6', naam: 'Deel D', stock: 5 },
            { id: 'd7', naam: 'Deel E', stock: 5 }
          ]
        },
        {
          id: 'm3',
          naam: 'Taalkanjers – spellingboek',
          uitgever: 'Plantyn',
          delen: [
            { id: 'd8', naam: 'Deel A', stock: 8 },
            { id: 'd9', naam: 'Deel B', stock: 6 },
            { id: 'd10', naam: 'Deel C', stock: 6 },
            { id: 'd11', naam: 'Deel D', stock: 5 },
            { id: 'd12', naam: 'Deel E', stock: 5 }
          ]
        },
        {
          id: 'm4',
          naam: 'Wiskanjers IJsbergversie',
          uitgever: 'Plantyn',
          delen: [
            { id: 'd13', naam: 'Blok 1', stock: 7 },
            { id: 'd14', naam: 'Blok 2', stock: 5 },
            { id: 'd15', naam: 'Blok 3', stock: 5 },
            { id: 'd16', naam: 'Blok 4', stock: 4 },
            { id: 'd17', naam: 'Blok 5', stock: 4 },
            { id: 'd18', naam: 'Blok 6', stock: 5 },
            { id: 'd19', naam: 'Blok 7', stock: 5 },
            { id: 'd20', naam: 'Blok 8', stock: 6 },
            { id: 'd21', naam: 'Blok 9', stock: 6 },
            { id: 'd22', naam: 'Blok 10', stock: 16 }
          ]
        }
      ]
    },

    budget: 0,
    lyreco: [],
    actions: [],
    knutsels: [],

    stockCats: [
      {
        id: 'sc1', naam: 'Materiaal kids', icoon: '✏️',
        producten: [
          { id: 'sp1', naam: 'lijmstiften', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp2', naam: 'schrijfpotloden', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp3', naam: 'gommen', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp4', naam: 'fluostiften', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp5', naam: 'groene balpennen', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp6', naam: 'kleurpotloden', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp7', naam: 'stiften', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp8', naam: 'whiteboardstiften', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp9', naam: 'slijpers', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp10', naam: 'wachtmappen blauw', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp11', naam: 'agendamap blauw', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp12', naam: 'brievenmap rood', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp13', naam: 'huistakenmap wit', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp14', naam: 'frixion pen', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp15', naam: 'vullingen frixion pen', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp16', naam: 'gekl. kopieerpapier (levenslijnen)', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp17', naam: 'toonmappen', l1: 0, l2: 0, bestel: 0, winkel: '' }
        ]
      },
      {
        id: 'sc2', naam: 'Materiaal leerkracht', icoon: '👩‍🏫',
        producten: [
          { id: 'sp18', naam: 'rode balpennen', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp19', naam: 'whiteboardstiften', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp20', naam: 'magneetband', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp21', naam: 'lamineerhoezen', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp22', naam: 'etiketten', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp23', naam: 'nietjes', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp24', naam: 'plakband', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp25', naam: 'Tipp-ex', l1: 0, l2: 0, bestel: 0, winkel: '' }
        ]
      },
      {
        id: 'sc3', naam: 'Knutselmateriaal', icoon: '✂️',
        producten: [
          { id: 'sp26', naam: 'vouwblaadjes', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp27', naam: 'A4 tekenpapier wit', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp28', naam: 'A3 tekenpapier wit', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp29', naam: 'scharen', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp30', naam: "wasco's", l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp31', naam: 'ijslollystokjes', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp32', naam: 'wol', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp33', naam: 'isomobollen', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp34', naam: 'aluminiumfolie', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp35', naam: 'vloeibare lijm', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp36', naam: 'satéstokjes', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp37', naam: 'sponsjes', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp38', naam: 'ribbelkarton', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp39', naam: 'klei: creall', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp40', naam: 'pompons', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp41', naam: 'splitpennen', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp42', naam: 'houten of plastiek vorken', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp43', naam: 'raffia', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp44', naam: 'chenilledraad', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp45', naam: 'rietjes', l1: 0, l2: 0, bestel: 0, winkel: '' }
        ]
      },
      {
        id: 'sc4', naam: 'Crêpe-papier', icoon: '🎨',
        producten: [
          { id: 'sp46', naam: 'rood', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp47', naam: 'oranje', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp48', naam: 'geel', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp49', naam: 'groen', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp50', naam: 'blauw', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp51', naam: 'bruin', l1: 0, l2: 0, bestel: 0, winkel: '' }
        ]
      },
      {
        id: 'sc5', naam: 'Gekleurd tekenpapier', icoon: '📄',
        producten: [
          { id: 'sp52', naam: 'groen', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp53', naam: 'geel', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp54', naam: 'blauw', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp55', naam: 'oranje', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp56', naam: 'rood', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp57', naam: 'zwart', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp58', naam: 'roze', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp59', naam: 'bruin', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp60', naam: 'paars', l1: 0, l2: 0, bestel: 0, winkel: '' }
        ]
      },
      {
        id: 'sc6', naam: 'Froezelpapier', icoon: '🌸',
        producten: [
          { id: 'sp61', naam: 'geel', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp62', naam: 'oranje', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp63', naam: 'rood', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp64', naam: 'roze', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp65', naam: 'blauw', l1: 0, l2: 0, bestel: 0, winkel: '' }
        ]
      },
      {
        id: 'sc7', naam: 'Verf', icoon: '🖌️',
        producten: [
          { id: 'sp66', naam: 'geel', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp67', naam: 'oranje', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp68', naam: 'rood', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp69', naam: 'blauw', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp70', naam: 'groen', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp71', naam: 'roze', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp72', naam: 'bruin', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp73', naam: 'zwart', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp74', naam: 'wit', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp75', naam: 'verfrollen', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp76', naam: 'plexiglas', l1: 0, l2: 0, bestel: 0, winkel: '' }
        ]
      },
      {
        id: 'sc8', naam: 'Moeder- en vaderdag', icoon: '💐',
        producten: [
          { id: 'sp77', naam: 'strijkparels', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp78', naam: 'borden strijkparels', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp79', naam: 'schildersdoeken', l1: 0, l2: 0, bestel: 0, winkel: '' },
          { id: 'sp80', naam: 'schilderijhangertjes', l1: 0, l2: 0, bestel: 0, winkel: '' }
        ]
      }
    ]
  };
}

// ==============================================
// AUTH LIFECYCLE
// ==============================================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // Niet ingelogd
    tooSchermen({ loading: false, login: true, team: false, app: false });
    return;
  }
  huidigeUser = user;
  await opzoekenTeam();
});

// Zoek of de user al in een team zit
async function opzoekenTeam() {
  tooSchermen({ loading: true, login: false, team: false, app: false });

  try {
    // Zoek teams waar de gebruiker lid van is (via uid)
    const q = query(
      collection(db, "klasbeheer_teams"),
      where("leden_uids", "array-contains", huidigeUser.uid)
    );
    const snap = await getDocs(q);

    if (!snap.empty) {
      // Gebruiker zit in een team (eerste team nemen)
      teamId = snap.docs[0].id;
      koppelRealtime();
      return;
    }

    // Zoek op e-mail (iemand heeft deze user uitgenodigd maar uid is nog niet gekoppeld)
    const emailQ = query(
      collection(db, "klasbeheer_teams"),
      where("leden_emails", "array-contains", (huidigeUser.email || '').toLowerCase())
    );
    const emailSnap = await getDocs(emailQ);

    if (!emailSnap.empty) {
      // Toevoegen aan team: uid registreren
      teamId = emailSnap.docs[0].id;
      const ref = doc(db, "klasbeheer_teams", teamId);
      await updateDoc(ref, {
        leden_uids: arrayUnion(huidigeUser.uid)
      });
      koppelRealtime();
      return;
    }

    // Geen team → toon team-keuzescherm
    tooSchermen({ loading: false, login: false, team: true, app: false });

  } catch (err) {
    console.error("Fout bij opzoeken team:", err);
    alert("Er ging iets mis bij het laden. Probeer opnieuw te laden.");
  }
}

// Realtime listener koppelen aan team-doc
function koppelRealtime() {
  if (teamUnsubscribe) teamUnsubscribe();

  const ref = doc(db, "klasbeheer_teams", teamId);
  teamUnsubscribe = onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      console.error("Team-document verdwenen");
      return;
    }
    teamData = snap.data();
    // Zorg dat alle velden bestaan (backward compat)
    normaliseerTeamData();
    // Eerste keer: app tonen
    tooSchermen({ loading: false, login: false, team: false, app: true });
    // Alles renderen
    allesRenderen();
    zetSyncStatus('✓ Bewaard in cloud', false);
  }, (err) => {
    console.error("Realtime fout:", err);
    zetSyncStatus('⚠️ Verbinding verloren', true);
  });
}

function normaliseerTeamData() {
  if (!teamData) return;
  if (!teamData.instellingen) teamData.instellingen = {
    naam: '', klasNr: '', kinderen: 23, reserve: 5,
    schooljaar: '2026-2027', huidigSchooljaar: '2026-2027'
  };
  if (!teamData.werkboeken) teamData.werkboeken = { L1: [], L2: [] };
  if (!teamData.werkboeken.L1) teamData.werkboeken.L1 = [];
  if (!teamData.werkboeken.L2) teamData.werkboeken.L2 = [];
  if (!Array.isArray(teamData.lyreco)) teamData.lyreco = [];
  if (!Array.isArray(teamData.actions)) teamData.actions = [];
  if (!Array.isArray(teamData.knutsels)) teamData.knutsels = [];
  if (!Array.isArray(teamData.stockCats)) teamData.stockCats = [];
  if (!Array.isArray(teamData.leden_emails)) teamData.leden_emails = [];
  if (!Array.isArray(teamData.leden_uids)) teamData.leden_uids = [];
  if (typeof teamData.budget !== 'number') teamData.budget = 0;

  // Normaliseer stock-producten (oude versies missen 'winkel')
  teamData.stockCats.forEach(cat => {
    if (!Array.isArray(cat.producten)) cat.producten = [];
    cat.producten.forEach(p => {
      if (p.winkel === undefined) p.winkel = '';
      if (p.l1 === undefined) p.l1 = 0;
      if (p.l2 === undefined) p.l2 = 0;
      if (p.bestel === undefined) p.bestel = 0;
    });
  });

  // Normaliseer knutsels (oude versie had 'cyclus' ipv 'schooljaar')
  teamData.knutsels.forEach(k => {
    if (k.schooljaar === undefined) k.schooljaar = '';
  });
}

// Nieuw team aanmaken
window.nieuwTeamAanmaken = async function () {
  if (!huidigeUser) return;

  // Vraag meteen de e-mail van de collega (of leeg voor solo)
  const uitleg = `Je start een nieuw klasbeheer-team.\n\nJij bent de eigenaar. Wil je nu al iemand uitnodigen?\n\nVul hieronder het e-mailadres in van je collega (zoals ze is ingelogd in de huiswerkapp), of klik op OK met een leeg vak als je solo wil starten.\n\nJe kan later altijd collega's toevoegen of verwijderen via "Instellingen → Teamleden".`;

  const collegaEmail = prompt(uitleg, '');
  if (collegaEmail === null) return; // Annuleren

  const extra_email = collegaEmail.trim().toLowerCase();
  if (extra_email && !extra_email.includes('@')) {
    alert('Dit lijkt geen geldig e-mailadres. Probeer opnieuw.');
    return;
  }
  if (extra_email === (huidigeUser.email || '').toLowerCase()) {
    alert('Dat is je eigen e-mailadres. Je zit automatisch al in het team.');
    return;
  }

  try {
    // Nieuwe team-ID op basis van uid + timestamp
    const nieuwTeamId = huidigeUser.uid + '_' + Date.now().toString(36);
    const ref = doc(db, "klasbeheer_teams", nieuwTeamId);
    const startdata = standaardData(huidigeUser.uid, huidigeUser.email);
    if (extra_email) {
      startdata.leden_emails.push(extra_email);
    }
    await setDoc(ref, startdata);
    teamId = nieuwTeamId;
    koppelRealtime();

    // Bevestiging na aanmaken
    if (extra_email) {
      setTimeout(() => {
        alert(`✅ Team aangemaakt!\n\n${extra_email} is uitgenodigd. Zodra zij inlogt op de huiswerkapp en naar klasbeheer gaat, ziet ze automatisch jullie gedeelde team.\n\nJij kan nu beginnen met invullen.`);
      }, 500);
    } else {
      setTimeout(() => {
        alert(`✅ Team aangemaakt!\n\nJe kan nu beginnen met invullen. Later kan je collega's toevoegen via "Instellingen → Teamleden".`);
      }, 500);
    }
  } catch (err) {
    console.error(err);
    alert("Fout bij aanmaken team: " + err.message);
  }
};

// Nakijken of user ondertussen is toegevoegd
window.kijkTeamStatus = async function () {
  if (!huidigeUser) return;
  await opzoekenTeam();
  if (!teamId) {
    alert(`Je bent (nog) niet in een team toegevoegd.\n\nVraag aan je collega om jouw e-mailadres (${huidigeUser.email}) toe te voegen via "Instellingen → Teamleden".`);
  }
};

// ==============================================
// SCHERM-HELPERS
// ==============================================
function tooSchermen({ loading, login, team, app }) {
  document.getElementById('loading-scherm').style.display = loading ? 'block' : 'none';
  document.getElementById('login-scherm').style.display = login ? 'block' : 'none';
  document.getElementById('team-scherm').style.display = team ? 'block' : 'none';
  document.getElementById('app-scherm').style.display = app ? 'block' : 'none';
}

function zetSyncStatus(tekst, bezig) {
  const el = document.getElementById('sync-status');
  if (el) {
    el.textContent = tekst;
    el.classList.toggle('bezig', !!bezig);
  }
}

// ==============================================
// BEWAREN (debounced)
// ==============================================
function planBewaren() {
  if (!teamData || !teamId) return;
  zetSyncStatus('⏳ Bewaren...', true);
  clearTimeout(bewaarTimer);
  bewaarTimer = setTimeout(bewaarNu, 400);
}

async function bewaarNu() {
  if (!teamData || !teamId || aanHetBewarenBezig) return;
  aanHetBewarenBezig = true;
  try {
    const ref = doc(db, "klasbeheer_teams", teamId);
    // Alleen de velden die we bewerken — niet eigenaar/leden overschrijven
    await updateDoc(ref, {
      instellingen: teamData.instellingen,
      werkboeken: teamData.werkboeken,
      budget: teamData.budget,
      lyreco: teamData.lyreco,
      actions: teamData.actions,
      knutsels: teamData.knutsels,
      stockCats: teamData.stockCats,
      laatst_gewijzigd: serverTimestamp()
    });
    zetSyncStatus('✓ Bewaard in cloud', false);
  } catch (err) {
    console.error("Bewaarfout:", err);
    zetSyncStatus('⚠️ Kon niet bewaren', true);
  } finally {
    aanHetBewarenBezig = false;
  }
}

// ==============================================
// HELPERS
// ==============================================
function maakId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function escape(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);
}

function totaalNodig() {
  return (teamData.instellingen.kinderen || 0) + (teamData.instellingen.reserve || 0);
}

// ==============================================
// TABS
// ==============================================
document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('actief'));
    document.querySelectorAll('.paneel').forEach(x => x.classList.remove('actief'));
    t.classList.add('actief');
    document.getElementById('paneel-' + t.dataset.tab).classList.add('actief');
  });
});

// ==============================================
// RENDER ALLES
// ==============================================
function allesRenderen() {
  klasInstellingenTonen();
  werkboekenTonen();
  lyrecoTonen();
  actionTonen();
  budgetTonen();
  knutselsTonen();
  stockTonen();
  ledenTonen();
}

function klasInstellingenTonen() {
  const i = teamData.instellingen;
  document.getElementById('klas-naam').value = i.naam || '';
  document.getElementById('klas-nr').value = i.klasNr || '';
  document.getElementById('klas-kinderen').value = i.kinderen ?? 23;
  document.getElementById('klas-reserve').value = i.reserve ?? 5;
  document.getElementById('klas-schooljaar').value = i.schooljaar || '';
  document.getElementById('klas-totaal-nr').textContent = totaalNodig();
  document.getElementById('huidig-schooljaar').value = i.huidigSchooljaar || '';
  document.getElementById('team-naam-label').textContent = i.klasNr || i.naam || 'Mijn team';
  document.getElementById('aantal-leden').textContent = (teamData.leden_emails?.length || 0) + ' leden';
}

window.klasInstellingenZetten = function () {
  teamData.instellingen.naam = document.getElementById('klas-naam').value.trim();
  teamData.instellingen.klasNr = document.getElementById('klas-nr').value.trim();
  teamData.instellingen.kinderen = parseInt(document.getElementById('klas-kinderen').value) || 0;
  teamData.instellingen.reserve = parseInt(document.getElementById('klas-reserve').value) || 0;
  teamData.instellingen.schooljaar = document.getElementById('klas-schooljaar').value.trim();
  document.getElementById('klas-totaal-nr').textContent = totaalNodig();
  planBewaren();
  // Live update: alleen de getallen in de tabel bijwerken, GEEN hele tabel herteekenen
  // (anders verlies je focus tijdens typen)
  werkboekenCijfersLive();
};

window.huidigSchooljaarZetten = function () {
  teamData.instellingen.huidigSchooljaar = document.getElementById('huidig-schooljaar').value.trim();
  planBewaren();
  knutselsTonen();
};

// ==============================================
// WERKBOEKEN (met L1/L2 schakelaar)
// ==============================================
window.leerjaarWisselen = function (lj) {
  huidigLeerjaar = lj;
  document.querySelectorAll('.leerjaar-knop').forEach(k => {
    k.classList.toggle('actief', k.dataset.leerjaar === lj);
  });
  werkboekenTonen();
};

function werkboekenTonen() {
  if (!teamData) return;
  const methodes = teamData.werkboeken[huidigLeerjaar] || [];
  const container = document.getElementById('wb-methodes');
  const lbl = document.getElementById('wb-leerjaar-label');
  if (lbl) lbl.textContent = `(voor ${huidigLeerjaar === 'L1' ? 'leerjaar 1' : 'leerjaar 2'})`;

  if (methodes.length === 0) {
    container.innerHTML = `<p style="text-align:center;padding:30px;color:var(--grijs);font-style:italic;">Nog geen methodes voor ${huidigLeerjaar === 'L1' ? 'leerjaar 1' : 'leerjaar 2'}. Voeg er hieronder één toe.</p>`;
    const bestelDiv = document.getElementById('wb-bestel');
    if (bestelDiv) bestelDiv.style.display = 'none';
    werkboekenStatsTonen();
    return;
  }

  const nodig = totaalNodig();

  container.innerHTML = methodes.map(m => {
    const rijen = m.delen.map(d => werkboekRijHtml(m.id, d, nodig)).join('');

    return `
      <div class="methode">
        <div class="methode-kop">
          <h3>📘 ${escape(m.naam)} ${m.uitgever ? '<span style="font-weight:400;opacity:0.85;font-size:0.9em;">(' + escape(m.uitgever) + ')</span>' : ''}</h3>
          <div class="methode-acties">
            <button class="knop klein grijs" onclick="methodeHernoemen('${m.id}')">✏️ Hernoemen</button>
            <button class="knop klein rood" onclick="methodeVerwijderen('${m.id}')">🗑️ Verwijderen</button>
          </div>
        </div>
        <div class="methode-body">
          <div class="tabel-wrap">
            <table class="vol">
              <thead>
                <tr>
                  <th>Deel</th>
                  <th class="getal">In stock</th>
                  <th class="getal">Nodig</th>
                  <th class="getal">Bijbestellen</th>
                  <th></th>
                </tr>
              </thead>
              <tbody id="wb-body-${m.id}">${rijen}</tbody>
            </table>
          </div>
          <div class="deel-toevoegen">
            <div>
              <label>Nieuw deel</label>
              <input type="text" id="nieuw-deel-naam-${m.id}" placeholder="bv. Deel F">
            </div>
            <div>
              <label>Stock</label>
              <input type="number" min="0" value="0" id="nieuw-deel-stock-${m.id}" style="width:80px;">
            </div>
            <button class="knop klein" onclick="deelToevoegen('${m.id}')">➕ Toevoegen</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  werkboekenStatsTonen();
  werkboekBestellijstTonen();
}

// Genereert HTML voor één rij in de werkboek-tabel (GEEN per-deel kinderen/reserve meer)
function werkboekRijHtml(mId, d, nodig) {
  const stock = d.stock || 0;
  const tekort = Math.max(0, nodig - stock);

  return `
    <tr id="wb-rij-${d.id}">
      <td>${escape(d.naam)}</td>
      <td class="getal">
        <input type="number" min="0" value="${stock}" class="tabel-input"
          onchange="stockDeelUpdaten('${mId}','${d.id}',this.value)">
      </td>
      <td class="getal" id="wb-nodig-${d.id}"><strong>${nodig}</strong></td>
      <td class="getal ${tekort > 0 ? 'bestel-getal' : 'ok'}" id="wb-tekort-${d.id}">
        ${tekort > 0 ? '+' + tekort : '✓'}
      </td>
      <td class="getal">
        <button class="knop klein grijs" onclick="deelHernoemen('${mId}','${d.id}')" title="Hernoemen">✏️</button>
        <button class="knop klein rood" onclick="deelVerwijderen('${mId}','${d.id}')" title="Verwijderen">🗑️</button>
      </td>
    </tr>
  `;
}

// Werk de stats-balk bovenaan bij (zonder tabel te hertekenen)
function werkboekenStatsTonen() {
  const stats = document.getElementById('wb-stats');
  if (!stats || !teamData) return;
  const methodes = teamData.werkboeken[huidigLeerjaar] || [];
  const nodig = totaalNodig();

  let totaalDelen = 0;
  let totaalBijbestellen = 0;
  methodes.forEach(m => {
    m.delen.forEach(d => {
      totaalDelen++;
      const tekort = Math.max(0, nodig - (d.stock || 0));
      totaalBijbestellen += tekort;
    });
  });

  stats.innerHTML = `
    <div>👥 <strong>${nodig}</strong> per deel nodig <span style="color:var(--tekst-zacht);">(${teamData.instellingen.kinderen || 0} kinderen + ${teamData.instellingen.reserve || 0} reserve)</span></div>
    <div>📚 <strong>${methodes.length}</strong> methodes, <strong>${totaalDelen}</strong> delen</div>
    <div>🛒 Totaal bij te bestellen: <strong>${totaalBijbestellen}</strong> werkboeken</div>
  `;
}

// Werk alleen de cijfers in alle rijen bij (Nodig + Bijbestellen), zonder tabel te hertekenen.
// Gebruikt bij wijziging van "aantal kinderen" of "reserve" bovenaan.
function werkboekenCijfersLive() {
  if (!teamData) return;
  const nodig = totaalNodig();
  const methodes = teamData.werkboeken[huidigLeerjaar] || [];

  methodes.forEach(m => {
    m.delen.forEach(d => {
      const tekort = Math.max(0, nodig - (d.stock || 0));

      const nodigCel = document.getElementById('wb-nodig-' + d.id);
      if (nodigCel) nodigCel.innerHTML = '<strong>' + nodig + '</strong>';

      const tekortCel = document.getElementById('wb-tekort-' + d.id);
      if (tekortCel) {
        tekortCel.className = 'getal ' + (tekort > 0 ? 'bestel-getal' : 'ok');
        tekortCel.textContent = tekort > 0 ? '+' + tekort : '✓';
      }
    });
  });

  werkboekenStatsTonen();
  werkboekBestellijstTonen();
}

// Werk één rij bij (bij stock-wijziging) zonder hele tabel te hertekenen
function werkboekRijBijwerken(d) {
  const nodig = totaalNodig();
  const tekort = Math.max(0, nodig - (d.stock || 0));

  const nodigCel = document.getElementById('wb-nodig-' + d.id);
  if (nodigCel) nodigCel.innerHTML = '<strong>' + nodig + '</strong>';

  const tekortCel = document.getElementById('wb-tekort-' + d.id);
  if (tekortCel) {
    tekortCel.className = 'getal ' + (tekort > 0 ? 'bestel-getal' : 'ok');
    tekortCel.textContent = tekort > 0 ? '+' + tekort : '✓';
  }
}

// Bestellijst onderaan bijwerken
function werkboekBestellijstTonen() {
  if (!teamData) return;
  const nodig = totaalNodig();
  const methodes = teamData.werkboeken[huidigLeerjaar] || [];
  const bestelRijen = [];
  methodes.forEach(m => {
    m.delen.forEach(d => {
      const tekort = Math.max(0, nodig - (d.stock || 0));
      if (tekort > 0) {
        bestelRijen.push({ methode: m.naam, uitgever: m.uitgever, deel: d.naam, aantal: tekort });
      }
    });
  });

  const bestelDiv = document.getElementById('wb-bestel');
  const bestelInhoud = document.getElementById('wb-bestel-inhoud');
  const schooljaarSpan = document.getElementById('wb-bestel-schooljaar');
  if (schooljaarSpan) schooljaarSpan.textContent = teamData.instellingen.schooljaar ? '(' + teamData.instellingen.schooljaar + ' · ' + huidigLeerjaar + ')' : '';

  if (!bestelDiv || !bestelInhoud) return;

  if (bestelRijen.length === 0) {
    bestelDiv.style.display = 'none';
  } else {
    bestelDiv.style.display = 'block';
    bestelInhoud.innerHTML = `
      <table class="vol">
        <thead><tr><th>Methode</th><th>Uitgever</th><th>Deel</th><th class="getal">Aantal</th></tr></thead>
        <tbody>
          ${bestelRijen.map(r => `
            <tr>
              <td>${escape(r.methode)}</td>
              <td>${escape(r.uitgever || '')}</td>
              <td>${escape(r.deel)}</td>
              <td class="getal bestel-getal">${r.aantal}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
}

window.methodeToevoegen = function () {
  const naam = document.getElementById('nieuw-methode-naam').value.trim();
  const uitgever = document.getElementById('nieuw-methode-uitgever').value.trim();
  const deelNaam = document.getElementById('nieuw-methode-deel').value.trim();
  const deelStock = parseInt(document.getElementById('nieuw-methode-stock').value) || 0;

  if (!naam) { alert('Geef een naam voor de methode.'); return; }
  if (!deelNaam) { alert('Geef een naam voor het eerste deel.'); return; }

  teamData.werkboeken[huidigLeerjaar].push({
    id: maakId(),
    naam,
    uitgever,
    delen: [{ id: maakId(), naam: deelNaam, stock: deelStock }]
  });

  document.getElementById('nieuw-methode-naam').value = '';
  document.getElementById('nieuw-methode-uitgever').value = '';
  document.getElementById('nieuw-methode-deel').value = '';
  document.getElementById('nieuw-methode-stock').value = 0;

  planBewaren();
  werkboekenTonen();
};

window.methodeHernoemen = function (mId) {
  const methodes = teamData.werkboeken[huidigLeerjaar];
  const m = methodes.find(x => x.id === mId);
  if (!m) return;
  const nieuweNaam = prompt('Nieuwe naam van de methode:', m.naam);
  if (nieuweNaam === null) return;
  const nieuweUitgever = prompt('Nieuwe uitgeverij:', m.uitgever || '');
  if (nieuweUitgever === null) return;
  m.naam = nieuweNaam.trim() || m.naam;
  m.uitgever = nieuweUitgever.trim();
  planBewaren();
  werkboekenTonen();
};

window.methodeVerwijderen = function (mId) {
  const methodes = teamData.werkboeken[huidigLeerjaar];
  const m = methodes.find(x => x.id === mId);
  if (!m) return;
  if (!confirm(`Methode "${m.naam}" en alle delen verwijderen?`)) return;
  teamData.werkboeken[huidigLeerjaar] = methodes.filter(x => x.id !== mId);
  planBewaren();
  werkboekenTonen();
};

window.deelToevoegen = function (mId) {
  const m = teamData.werkboeken[huidigLeerjaar].find(x => x.id === mId);
  if (!m) return;
  const input = document.getElementById('nieuw-deel-naam-' + mId);
  const stockInput = document.getElementById('nieuw-deel-stock-' + mId);
  const naam = input.value.trim();
  if (!naam) { alert('Geef een naam voor het deel.'); return; }
  const stock = parseInt(stockInput.value) || 0;

  m.delen.push({ id: maakId(), naam, stock });
  planBewaren();
  werkboekenTonen();
};

window.deelVerwijderen = function (mId, dId) {
  const m = teamData.werkboeken[huidigLeerjaar].find(x => x.id === mId);
  if (!m) return;
  const d = m.delen.find(x => x.id === dId);
  if (!d) return;
  if (!confirm(`Deel "${d.naam}" verwijderen?`)) return;
  m.delen = m.delen.filter(x => x.id !== dId);
  planBewaren();
  werkboekenTonen();
};

window.deelHernoemen = function (mId, dId) {
  const m = teamData.werkboeken[huidigLeerjaar].find(x => x.id === mId);
  if (!m) return;
  const d = m.delen.find(x => x.id === dId);
  if (!d) return;
  const nieuweNaam = prompt('Nieuwe naam voor het deel:', d.naam);
  if (nieuweNaam === null) return;
  d.naam = nieuweNaam.trim() || d.naam;
  planBewaren();
  werkboekenTonen();
};

// Alleen stock bijwerken - focus blijft in input, geen tabel-hertekenen
window.stockDeelUpdaten = function (mId, dId, waarde) {
  const m = teamData.werkboeken[huidigLeerjaar].find(x => x.id === mId);
  if (!m) return;
  const d = m.delen.find(x => x.id === dId);
  if (!d) return;
  d.stock = parseInt(waarde) || 0;
  planBewaren();
  werkboekRijBijwerken(d);
  werkboekenStatsTonen();
  werkboekBestellijstTonen();
};


// LYRECO
// ==============================================
function lyrecoTonen() {
  if (!teamData) return;
  const body = document.getElementById('ly-body');
  const foot = document.getElementById('ly-foot');
  const stats = document.getElementById('ly-stats');
  const items = teamData.lyreco;

  if (items.length === 0) {
    body.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--grijs);padding:20px;font-style:italic;">Nog geen artikels. Voeg er hierboven één toe.</td></tr>';
    foot.innerHTML = '';
    stats.innerHTML = '';
    return;
  }

  let totExcl = 0, totIncl = 0, totAantal = 0;

  body.innerHTML = items.map(ly => {
    const subExcl = (ly.prijs || 0) * (ly.bestel || 0);
    const subIncl = subExcl * (1 + (ly.btw || 0) / 100);
    totExcl += subExcl;
    totIncl += subIncl;
    totAantal += (ly.bestel || 0);

    return `
      <tr>
        <td><input type="text" value="${escape(ly.artikel)}" class="tabel-input" style="width:100%;text-align:left;" onchange="lyrecoUpdaten('${ly.id}','artikel',this.value)"></td>
        <td><input type="text" value="${escape(ly.nr)}" class="tabel-input" style="width:100%;text-align:left;" onchange="lyrecoUpdaten('${ly.id}','nr',this.value)"></td>
        <td><input type="number" min="0" value="${ly.stock}" class="tabel-input klein" onchange="lyrecoUpdaten('${ly.id}','stock',this.value)"></td>
        <td><input type="number" min="0" value="${ly.bestel}" class="tabel-input klein" onchange="lyrecoUpdaten('${ly.id}','bestel',this.value)"></td>
        <td><input type="number" min="0" step="0.01" value="${ly.prijs}" class="tabel-input" onchange="lyrecoUpdaten('${ly.id}','prijs',this.value)"></td>
        <td>
          <select class="tabel-input klein" style="width:70px;text-align:left;" onchange="lyrecoUpdaten('${ly.id}','btw',this.value)">
            <option value="6" ${ly.btw == 6 ? 'selected' : ''}>6%</option>
            <option value="21" ${ly.btw == 21 ? 'selected' : ''}>21%</option>
          </select>
        </td>
        <td class="getal">€ ${subExcl.toFixed(2)}</td>
        <td class="getal"><strong>€ ${subIncl.toFixed(2)}</strong></td>
        <td><button class="knop klein rood" onclick="lyrecoVerwijderen('${ly.id}')">🗑️</button></td>
      </tr>
    `;
  }).join('');

  foot.innerHTML = `
    <tr style="background:var(--creme-warm);font-weight:800;">
      <td colspan="3">TOTAAL</td>
      <td class="getal">${totAantal}</td>
      <td></td>
      <td></td>
      <td class="getal">€ ${totExcl.toFixed(2)}</td>
      <td class="getal">€ ${totIncl.toFixed(2)}</td>
      <td></td>
    </tr>
  `;

  stats.innerHTML = `
    <div>🖍️ <strong>${items.length}</strong> artikels</div>
    <div>📦 Totaal te bestellen: <strong>${totAantal}</strong> stuks</div>
    <div>💰 Totaal incl. BTW: <strong>€ ${totIncl.toFixed(2)}</strong></div>
  `;

  budgetTonen();
}

window.lyrecoToevoegen = function () {
  const artikel = document.getElementById('ly-artikel').value.trim();
  if (!artikel) { alert('Geef een artikelnaam.'); return; }

  teamData.lyreco.push({
    id: maakId(),
    artikel,
    nr: document.getElementById('ly-nr').value.trim(),
    prijs: parseFloat(document.getElementById('ly-prijs').value) || 0,
    btw: parseInt(document.getElementById('ly-btw').value) || 21,
    bestel: parseInt(document.getElementById('ly-bestel').value) || 0,
    stock: parseInt(document.getElementById('ly-stock').value) || 0,
    min: parseInt(document.getElementById('ly-min').value) || 0
  });

  document.getElementById('ly-artikel').value = '';
  document.getElementById('ly-nr').value = '';
  document.getElementById('ly-prijs').value = 0;
  document.getElementById('ly-bestel').value = 1;
  document.getElementById('ly-stock').value = 0;
  document.getElementById('ly-min').value = 0;

  planBewaren();
  lyrecoTonen();
};

window.lyrecoUpdaten = function (id, veld, waarde) {
  const ly = teamData.lyreco.find(x => x.id === id);
  if (!ly) return;
  if (['stock','bestel','min','btw'].includes(veld)) ly[veld] = parseInt(waarde) || 0;
  else if (veld === 'prijs') ly[veld] = parseFloat(waarde) || 0;
  else ly[veld] = waarde;
  planBewaren();
  lyrecoTonen();
};

window.lyrecoVerwijderen = function (id) {
  const ly = teamData.lyreco.find(x => x.id === id);
  if (!ly) return;
  if (!confirm(`Artikel "${ly.artikel}" verwijderen?`)) return;
  teamData.lyreco = teamData.lyreco.filter(x => x.id !== id);
  planBewaren();
  lyrecoTonen();
};

// ==============================================
// ACTION-AANKOPEN
// ==============================================
function actionTonen() {
  if (!teamData) return;
  const body = document.getElementById('ac-body');
  const foot = document.getElementById('ac-foot');
  const items = teamData.actions;

  if (items.length === 0) {
    body.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--grijs);padding:20px;font-style:italic;">Nog geen aankopen.</td></tr>';
    foot.innerHTML = '';
    return;
  }

  let tot = 0;
  body.innerHTML = items.map(a => {
    tot += (a.prijs || 0);
    return `
      <tr>
        <td><input type="date" value="${a.datum || ''}" class="tabel-input" style="width:130px;text-align:left;" onchange="actionUpdaten('${a.id}','datum',this.value)"></td>
        <td><input type="text" value="${escape(a.naam)}" class="tabel-input" style="width:100%;text-align:left;" onchange="actionUpdaten('${a.id}','naam',this.value)"></td>
        <td><input type="text" value="${escape(a.winkel)}" class="tabel-input" style="width:100px;text-align:left;" onchange="actionUpdaten('${a.id}','winkel',this.value)"></td>
        <td><input type="number" min="0" step="0.01" value="${a.prijs}" class="tabel-input" onchange="actionUpdaten('${a.id}','prijs',this.value)"></td>
        <td><button class="knop klein rood" onclick="actionVerwijderen('${a.id}')">🗑️</button></td>
      </tr>
    `;
  }).join('');

  foot.innerHTML = `
    <tr style="background:var(--creme-warm);font-weight:800;">
      <td colspan="3">TOTAAL</td>
      <td class="getal">€ ${tot.toFixed(2)}</td>
      <td></td>
    </tr>
  `;

  budgetTonen();
}

window.actionToevoegen = function () {
  const naam = document.getElementById('ac-naam').value.trim();
  if (!naam) { alert('Geef een naam voor de aankoop.'); return; }

  teamData.actions.push({
    id: maakId(),
    naam,
    winkel: document.getElementById('ac-winkel').value.trim() || 'Action',
    prijs: parseFloat(document.getElementById('ac-prijs').value) || 0,
    datum: document.getElementById('ac-datum').value || new Date().toISOString().split('T')[0]
  });

  document.getElementById('ac-naam').value = '';
  document.getElementById('ac-winkel').value = 'Action';
  document.getElementById('ac-prijs').value = 0;

  planBewaren();
  actionTonen();
};

window.actionUpdaten = function (id, veld, waarde) {
  const a = teamData.actions.find(x => x.id === id);
  if (!a) return;
  if (veld === 'prijs') a[veld] = parseFloat(waarde) || 0;
  else a[veld] = waarde;
  planBewaren();
  actionTonen();
};

window.actionVerwijderen = function (id) {
  const a = teamData.actions.find(x => x.id === id);
  if (!a) return;
  if (!confirm(`Aankoop "${a.naam}" verwijderen?`)) return;
  teamData.actions = teamData.actions.filter(x => x.id !== id);
  planBewaren();
  actionTonen();
};

// ==============================================
// BUDGET
// ==============================================
function budgetTonen() {
  if (!teamData) return;
  document.getElementById('budget-bedrag').value = teamData.budget || 0;
  const overzicht = document.getElementById('budget-overzicht');

  let lyrecoIncl = 0;
  teamData.lyreco.forEach(l => {
    lyrecoIncl += (l.prijs || 0) * (l.bestel || 0) * (1 + (l.btw || 0) / 100);
  });
  let actionTotaal = 0;
  teamData.actions.forEach(a => { actionTotaal += (a.prijs || 0); });
  const totaal = lyrecoIncl + actionTotaal;
  const over = (teamData.budget || 0) - totaal;

  overzicht.innerHTML = `
    <div><strong>Budget</strong><span>€ ${(teamData.budget || 0).toFixed(2)}</span></div>
    <div><strong>Lyreco (incl. BTW)</strong><span>€ ${lyrecoIncl.toFixed(2)}</span></div>
    <div><strong>Action &amp; andere</strong><span>€ ${actionTotaal.toFixed(2)}</span></div>
    <div><strong>Totaal uitgegeven</strong><span>€ ${totaal.toFixed(2)}</span></div>
    <div><strong>Over</strong><span class="over ${over < 0 ? 'neg' : ''}">€ ${over.toFixed(2)}</span></div>
  `;
}

window.budgetZetten = function () {
  teamData.budget = parseFloat(document.getElementById('budget-bedrag').value) || 0;
  planBewaren();
  budgetTonen();
};

// ==============================================
// STOCK KLASMATERIAAL (accordion)
// ==============================================
function stockTonen() {
  if (!teamData) return;
  const knoppen = document.getElementById('stock-cat-knoppen');
  const stats = document.getElementById('stock-stats');

  // Stats
  let totaalProducten = 0;
  let totaalTeBestellen = 0;
  let producttypenTeBestellen = 0;
  teamData.stockCats.forEach(cat => {
    cat.producten.forEach(p => {
      totaalProducten++;
      const bestel = parseInt(p.bestel) || 0;
      if (bestel > 0) {
        totaalTeBestellen += bestel;
        producttypenTeBestellen++;
      }
    });
  });

  stats.innerHTML = `
    <div>📦 <strong>${teamData.stockCats.length}</strong> categorieën</div>
    <div>📋 <strong>${totaalProducten}</strong> producten</div>
    <div>🛒 <strong>${producttypenTeBestellen}</strong> te bestellen <span style="color:var(--tekst-zacht);">(${totaalTeBestellen} stuks)</span></div>
  `;

  // Categorie-knoppen links
  if (teamData.stockCats.length === 0) {
    knoppen.innerHTML = '<p style="color:var(--grijs);font-size:0.85em;font-style:italic;text-align:center;padding:10px 0;">Nog geen categorieën.</p>';
  } else {
    knoppen.innerHTML = teamData.stockCats.map(cat => {
      const teBestellen = cat.producten.filter(p => (parseInt(p.bestel) || 0) > 0).length;
      const actief = geselecteerdeCatId === cat.id ? 'actief' : '';
      return `
        <button class="stock-cat-knop ${actief}" onclick="stockCatSelecteren('${cat.id}')">
          <span>${escape(cat.icoon || '📂')}</span>
          <span>${escape(cat.naam)}</span>
          ${teBestellen > 0 ? `<span class="badge">${teBestellen}</span>` : ''}
        </button>
      `;
    }).join('');
  }

  // Rechts: inhoud van geselecteerde categorie
  stockCatInhoudTonen();
}

window.stockCatSelecteren = function (catId) {
  geselecteerdeCatId = catId;
  stockTonen();
};

function stockCatInhoudTonen() {
  const container = document.getElementById('stock-cat-inhoud');
  if (!geselecteerdeCatId) {
    container.innerHTML = `
      <div class="stock-geen-selectie">
        <span class="icoon-groot">📂</span>
        Kies een categorie links om producten te zien en te bewerken.
      </div>
    `;
    return;
  }

  const cat = teamData.stockCats.find(c => c.id === geselecteerdeCatId);
  if (!cat) {
    geselecteerdeCatId = null;
    stockCatInhoudTonen();
    return;
  }

  const rijen = cat.producten.length === 0
    ? '<tr><td colspan="7" style="text-align:center;color:var(--grijs);padding:20px;font-style:italic;">Nog geen producten in deze categorie.</td></tr>'
    : cat.producten.map(p => {
        const winkelClass = p.winkel === 'Lyreco' ? 'lyreco' :
                            p.winkel === 'Action' ? 'action' :
                            p.winkel ? 'ander' : '';
        const totaal = (parseInt(p.l1) || 0) + (parseInt(p.l2) || 0);
        return `
          <tr>
            <td>
              <input type="text" value="${escape(p.naam)}" class="stock-naam-input"
                onchange="stockProductUpdaten('${cat.id}','${p.id}','naam',this.value)">
            </td>
            <td class="nummer">
              <input type="number" min="0" value="${p.l1}" class="stock-input-num"
                onchange="stockProductUpdaten('${cat.id}','${p.id}','l1',this.value)">
            </td>
            <td class="nummer">
              <input type="number" min="0" value="${p.l2}" class="stock-input-num"
                onchange="stockProductUpdaten('${cat.id}','${p.id}','l2',this.value)">
            </td>
            <td class="totaal-kol">
              <span class="stock-totaal" id="totaal-${p.id}">${totaal}</span>
            </td>
            <td class="nummer">
              <input type="number" min="0" value="${p.bestel}" class="stock-input-num te-bestellen"
                onchange="stockProductUpdaten('${cat.id}','${p.id}','bestel',this.value)">
            </td>
            <td class="winkel-kol">
              <select class="stock-winkel-select ${winkelClass}"
                onchange="stockProductUpdaten('${cat.id}','${p.id}','winkel',this.value)">
                <option value="" ${!p.winkel ? 'selected' : ''}>—</option>
                <option value="Lyreco" ${p.winkel === 'Lyreco' ? 'selected' : ''}>🖍️ Lyreco</option>
                <option value="Action" ${p.winkel === 'Action' ? 'selected' : ''}>🛍️ Action</option>
                <option value="Ander" ${p.winkel === 'Ander' ? 'selected' : ''}>📍 Ander</option>
              </select>
            </td>
            <td class="acties-kol">
              <button class="stock-verwijder" onclick="stockProductVerwijderen('${cat.id}','${p.id}')" title="Product verwijderen">🗑️</button>
            </td>
          </tr>
        `;
      }).join('');

  container.innerHTML = `
    <div class="stock-cat-kop">
      <h3>${escape(cat.icoon || '')} ${escape(cat.naam)}</h3>
      <div class="stock-cat-acties">
        <button class="knop klein grijs" onclick="stockCatHernoemen('${cat.id}')">✏️ Hernoemen</button>
        <button class="knop klein rood" onclick="stockCatVerwijderen('${cat.id}')">🗑️ Categorie verwijderen</button>
      </div>
    </div>

    <table class="stock-tabel">
      <thead>
        <tr>
          <th>Product</th>
          <th class="nummer">Stock L1</th>
          <th class="nummer">Stock L2</th>
          <th class="totaal-kol">Totaal</th>
          <th class="nummer">Te bestellen</th>
          <th class="winkel-kol">Winkel</th>
          <th class="acties-kol"></th>
        </tr>
      </thead>
      <tbody>${rijen}</tbody>
    </table>

    <div class="stock-product-toevoegen">
      <div>
        <label>Nieuw product</label>
        <input type="text" id="nieuw-stock-naam-${cat.id}" placeholder="bv. knopen">
      </div>
      <div>
        <label>Stock L1</label>
        <input type="number" min="0" value="0" id="nieuw-stock-l1-${cat.id}">
      </div>
      <div>
        <label>Stock L2</label>
        <input type="number" min="0" value="0" id="nieuw-stock-l2-${cat.id}">
      </div>
      <div>
        <label>Te bestellen</label>
        <input type="number" min="0" value="0" id="nieuw-stock-bestel-${cat.id}">
      </div>
      <div>
        <label>Winkel</label>
        <select id="nieuw-stock-winkel-${cat.id}">
          <option value="">—</option>
          <option value="Lyreco">🖍️ Lyreco</option>
          <option value="Action">🛍️ Action</option>
          <option value="Ander">📍 Ander</option>
        </select>
      </div>
      <button class="knop klein" onclick="stockProductToevoegen('${cat.id}')">➕</button>
    </div>
  `;
}

window.stockCatToevoegenPrompt = function () {
  const naam = prompt('Naam van de nieuwe categorie:');
  if (!naam || !naam.trim()) return;
  const icoon = prompt('Icoon/emoji voor deze categorie (mag leeg):', '📂');
  if (icoon === null) return;

  const nieuweCat = {
    id: maakId(),
    naam: naam.trim(),
    icoon: (icoon || '📂').trim(),
    producten: []
  };
  teamData.stockCats.push(nieuweCat);
  geselecteerdeCatId = nieuweCat.id;
  planBewaren();
  stockTonen();
};

window.stockCatHernoemen = function (catId) {
  const cat = teamData.stockCats.find(c => c.id === catId);
  if (!cat) return;
  const nieuweNaam = prompt('Nieuwe naam:', cat.naam);
  if (nieuweNaam === null) return;
  const nieuwIcoon = prompt('Nieuw icoon (mag leeg):', cat.icoon || '');
  if (nieuwIcoon === null) return;
  cat.naam = nieuweNaam.trim() || cat.naam;
  cat.icoon = nieuwIcoon.trim();
  planBewaren();
  stockTonen();
};

window.stockCatVerwijderen = function (catId) {
  const cat = teamData.stockCats.find(c => c.id === catId);
  if (!cat) return;
  if (!confirm(`Categorie "${cat.naam}" met alle ${cat.producten.length} producten verwijderen?`)) return;
  teamData.stockCats = teamData.stockCats.filter(c => c.id !== catId);
  if (geselecteerdeCatId === catId) geselecteerdeCatId = null;
  planBewaren();
  stockTonen();
};

window.stockProductToevoegen = function (catId) {
  const cat = teamData.stockCats.find(c => c.id === catId);
  if (!cat) return;
  const naamEl = document.getElementById('nieuw-stock-naam-' + catId);
  const naam = naamEl.value.trim();
  if (!naam) { alert('Geef een naam voor het product.'); return; }

  cat.producten.push({
    id: maakId(),
    naam,
    l1: parseInt(document.getElementById('nieuw-stock-l1-' + catId).value) || 0,
    l2: parseInt(document.getElementById('nieuw-stock-l2-' + catId).value) || 0,
    bestel: parseInt(document.getElementById('nieuw-stock-bestel-' + catId).value) || 0,
    winkel: document.getElementById('nieuw-stock-winkel-' + catId).value || ''
  });

  planBewaren();
  stockTonen();
};

window.stockProductVerwijderen = function (catId, productId) {
  const cat = teamData.stockCats.find(c => c.id === catId);
  if (!cat) return;
  const p = cat.producten.find(x => x.id === productId);
  if (!p) return;
  if (!confirm(`Product "${p.naam}" verwijderen?`)) return;
  cat.producten = cat.producten.filter(x => x.id !== productId);
  planBewaren();
  stockTonen();
};

window.stockProductUpdaten = function (catId, productId, veld, waarde) {
  const cat = teamData.stockCats.find(c => c.id === catId);
  if (!cat) return;
  const p = cat.producten.find(x => x.id === productId);
  if (!p) return;

  if (['l1', 'l2', 'bestel'].includes(veld)) {
    p[veld] = parseInt(waarde) || 0;
  } else {
    p[veld] = waarde;
  }
  planBewaren();

  // Alleen bij winkel-wijziging de hele tabel hertekenen (kleur dropdown verandert)
  // Voor naam en cijfers: alleen stats/totaal updaten, tabel blijft staan → geen focus-verlies
  if (veld === 'winkel') {
    stockTonen();
  } else {
    // Update totaal-cel live als L1 of L2 is gewijzigd
    if (veld === 'l1' || veld === 'l2') {
      const totaalEl = document.getElementById('totaal-' + productId);
      if (totaalEl) {
        totaalEl.textContent = (parseInt(p.l1) || 0) + (parseInt(p.l2) || 0);
      }
    }
    stockStatsBijwerken();
    stockCatKnopBadgesBijwerken();
  }
};

function stockStatsBijwerken() {
  const stats = document.getElementById('stock-stats');
  if (!stats || !teamData) return;
  let totaalProducten = 0;
  let totaalTeBestellen = 0;
  let producttypenTeBestellen = 0;
  teamData.stockCats.forEach(cat => {
    cat.producten.forEach(p => {
      totaalProducten++;
      const bestel = parseInt(p.bestel) || 0;
      if (bestel > 0) {
        totaalTeBestellen += bestel;
        producttypenTeBestellen++;
      }
    });
  });
  stats.innerHTML = `
    <div>📦 <strong>${teamData.stockCats.length}</strong> categorieën</div>
    <div>📋 <strong>${totaalProducten}</strong> producten</div>
    <div>🛒 <strong>${producttypenTeBestellen}</strong> te bestellen <span style="color:var(--tekst-zacht);">(${totaalTeBestellen} stuks)</span></div>
  `;
}

function stockCatKnopBadgesBijwerken() {
  const container = document.getElementById('stock-cat-knoppen');
  if (!container) return;
  teamData.stockCats.forEach(cat => {
    const knop = container.querySelector(`[onclick="stockCatSelecteren('${cat.id}')"]`);
    if (!knop) return;
    const teBestellen = cat.producten.filter(p => (parseInt(p.bestel) || 0) > 0).length;
    let badge = knop.querySelector('.badge');
    if (teBestellen > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'badge';
        knop.appendChild(badge);
      }
      badge.textContent = teBestellen;
    } else if (badge) {
      badge.remove();
    }
  });
}

// ==============================================
// KNUTSELS
// ==============================================
function knutselsTonen() {
  if (!teamData) return;
  const grid = document.getElementById('kn-grid');
  const bestel = document.getElementById('kn-bestel');
  const bestelLijst = document.getElementById('kn-bestel-lijst');
  const huidig = teamData.instellingen.huidigSchooljaar || '';

  // Filter toepassen
  let filtered = teamData.knutsels.slice();
  if (knutselFilter === 'dit-jaar') {
    filtered = filtered.filter(k => k.schooljaar === huidig);
  } else if (knutselFilter !== 'alle') {
    filtered = filtered.filter(k => k.feest === knutselFilter);
  }

  // Sorteren: dit-jaar eerst, dan op feest
  filtered.sort((a, b) => {
    const aDit = (a.schooljaar === huidig) ? 0 : 1;
    const bDit = (b.schooljaar === huidig) ? 0 : 1;
    if (aDit !== bDit) return aDit - bDit;
    return (a.feest || '').localeCompare(b.feest || '');
  });

  if (filtered.length === 0) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:30px;color:var(--grijs);font-style:italic;">Geen knutselideetjes in deze selectie.</p>';
  } else {
    const feestEmoji = { moederdag: '💐', vaderdag: '👔', pasen: '🐣', sint: '🎁', kerst: '🎄', ander: '✨' };
    const feestNaam = { moederdag: 'Moederdag', vaderdag: 'Vaderdag', pasen: 'Pasen', sint: 'Sinterklaas', kerst: 'Kerst', ander: 'Ander' };

    grid.innerHTML = filtered.map(k => {
      const ditJaar = k.schooljaar === huidig && huidig !== '';
      const materiaalArr = (k.materiaal || '').split('\n').map(m => m.trim()).filter(m => m);
      return `
        <div class="knutsel-kaart ${ditJaar ? 'dit-jaar' : ''}">
          <div class="knutsel-kop">
            <div>
              <div class="knutsel-titel">${ditJaar ? '⭐ ' : ''}${escape(k.titel)}</div>
            </div>
          </div>
          <div class="knutsel-tags">
            <span class="knutsel-tag feest">${feestEmoji[k.feest] || '✨'} ${feestNaam[k.feest] || 'Ander'}</span>
            ${k.schooljaar ? `<span class="knutsel-tag jaar">📅 ${escape(k.schooljaar)}</span>` : ''}
          </div>
          ${materiaalArr.length > 0 ? `
            <div class="knutsel-materiaal">
              <strong>Materiaal:</strong>
              <ul>${materiaalArr.map(m => '<li>' + escape(m) + '</li>').join('')}</ul>
            </div>
          ` : ''}
          ${k.notitie ? `<div class="knutsel-notitie">${escape(k.notitie)}</div>` : ''}
          <div class="kaart-acties">
            <button class="knop klein grijs" onclick="knutselBewerken('${k.id}')">✏️ Bewerken</button>
            <button class="knop klein rood" onclick="knutselVerwijderen('${k.id}')">🗑️</button>
          </div>
        </div>
      `;
    }).join('');
  }

  // Boodschappenlijstje dit jaar
  const ditJaarKnutsels = teamData.knutsels.filter(k => k.schooljaar === huidig && huidig !== '');
  const alleMateriaal = new Set();
  ditJaarKnutsels.forEach(k => {
    (k.materiaal || '').split('\n').forEach(m => {
      const trim = m.trim();
      if (trim) alleMateriaal.add(trim);
    });
  });

  if (alleMateriaal.size > 0) {
    bestel.style.display = 'block';
    bestelLijst.innerHTML = Array.from(alleMateriaal).sort().map(m => `<li>${escape(m)}</li>`).join('');
  } else {
    bestel.style.display = 'none';
  }
}

window.knutselToevoegen = function () {
  const titel = document.getElementById('kn-titel').value.trim();
  if (!titel) { alert('Geef een titel voor het knutselidee.'); return; }
  const schooljaarVal = document.getElementById('kn-schooljaar').value.trim() ||
                        teamData.instellingen.huidigSchooljaar || '';

  teamData.knutsels.push({
    id: maakId(),
    titel,
    feest: document.getElementById('kn-feest').value,
    schooljaar: schooljaarVal,
    materiaal: document.getElementById('kn-materiaal').value,
    notitie: document.getElementById('kn-notitie').value
  });

  document.getElementById('kn-titel').value = '';
  document.getElementById('kn-feest').value = 'moederdag';
  document.getElementById('kn-schooljaar').value = '';
  document.getElementById('kn-materiaal').value = '';
  document.getElementById('kn-notitie').value = '';

  planBewaren();
  knutselsTonen();
};

window.knutselBewerken = function (id) {
  const k = teamData.knutsels.find(x => x.id === id);
  if (!k) return;

  const nieuweTitel = prompt('Titel:', k.titel);
  if (nieuweTitel === null) return;

  const feesten = ['moederdag', 'vaderdag', 'pasen', 'sint', 'kerst', 'ander'];
  const nieuwFeest = prompt('Feest (moederdag / vaderdag / pasen / sint / kerst / ander):', k.feest);
  if (nieuwFeest === null) return;

  const nieuwSchooljaar = prompt('Schooljaar (bv. 2026-2027, mag leeg):', k.schooljaar || '');
  if (nieuwSchooljaar === null) return;

  const nieuwMateriaal = prompt('Materiaal (één per regel, gebruik \\n voor nieuwe regels niet nodig):', k.materiaal || '');
  if (nieuwMateriaal === null) return;

  const nieuweNotitie = prompt('Notitie:', k.notitie || '');
  if (nieuweNotitie === null) return;

  k.titel = nieuweTitel.trim() || k.titel;
  k.feest = feesten.includes(nieuwFeest.trim()) ? nieuwFeest.trim() : k.feest;
  k.schooljaar = nieuwSchooljaar.trim();
  k.materiaal = nieuwMateriaal;
  k.notitie = nieuweNotitie;

  planBewaren();
  knutselsTonen();
};

window.knutselVerwijderen = function (id) {
  const k = teamData.knutsels.find(x => x.id === id);
  if (!k) return;
  if (!confirm(`Knutselidee "${k.titel}" verwijderen?`)) return;
  teamData.knutsels = teamData.knutsels.filter(x => x.id !== id);
  planBewaren();
  knutselsTonen();
};

// Filter-knoppen knutsels
document.querySelectorAll('.filter-knop').forEach(k => {
  k.addEventListener('click', () => {
    document.querySelectorAll('.filter-knop').forEach(x => x.classList.remove('actief'));
    k.classList.add('actief');
    knutselFilter = k.dataset.filter;
    knutselsTonen();
  });
});

// ==============================================
// PDF: WERKBOEKEN
// ==============================================
window.pdfWerkboeken = function () {
  const methodes = teamData.werkboeken[huidigLeerjaar] || [];
  if (methodes.length === 0) { alert('Geen methodes om te exporteren.'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const sj = teamData.instellingen.schooljaar || '';
  const leerjaar = huidigLeerjaar === 'L1' ? 'Leerjaar 1' : 'Leerjaar 2';

  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('Werkboeken – ' + leerjaar, 14, 18);

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  const regel2 = `${teamData.instellingen.naam || ''}${teamData.instellingen.klasNr ? ' · klas ' + teamData.instellingen.klasNr : ''}${sj ? ' · ' + sj : ''}`;
  doc.text(regel2, 14, 25);
  doc.text(`Standaard: ${teamData.instellingen.kinderen || 0} kinderen + ${teamData.instellingen.reserve || 0} reserve (per deel kan dit afwijken)`, 14, 30);

  let y = 38;

  methodes.forEach(m => {
    if (y > 230) { doc.addPage(); y = 20; }

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`${m.naam}${m.uitgever ? ' — ' + m.uitgever : ''}`, 14, y);
    y += 4;

    const body = m.delen.map(d => {
      const kinderen = (d.kinderen !== undefined && d.kinderen !== null) ? d.kinderen : (teamData.instellingen.kinderen || 0);
      const reserve = (d.reserve !== undefined && d.reserve !== null) ? d.reserve : (teamData.instellingen.reserve || 0);
      const nodig = kinderen + reserve;
      const tekort = Math.max(0, nodig - (d.stock || 0));
      return [
        d.naam,
        String(kinderen),
        String(reserve),
        String(nodig),
        String(d.stock || 0),
        tekort > 0 ? '+' + tekort : '✓'
      ];
    });

    doc.autoTable({
      startY: y,
      head: [['Deel', 'Kinderen', 'Reserve', 'Nodig', 'In stock', 'Bijbestellen']],
      body,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [138, 122, 109], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 62 },
        1: { halign: 'center', cellWidth: 22 },
        2: { halign: 'center', cellWidth: 22 },
        3: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
        4: { halign: 'center', cellWidth: 24 },
        5: { halign: 'center', cellWidth: 30, fillColor: [245, 220, 220] }
      },
      margin: { left: 14, right: 14 }
    });
    y = doc.lastAutoTable.finalY + 8;
  });

  doc.save(`Werkboeken_${huidigLeerjaar}_${sj || 'overzicht'}.pdf`);
};

// ==============================================
// PDF: LYRECO
// ==============================================
window.pdfLyreco = function () {
  if (teamData.lyreco.length === 0 && teamData.actions.length === 0) {
    alert('Geen artikels om te exporteren.');
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const sj = teamData.instellingen.schooljaar || '';

  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('Klasmateriaal – Lyreco & budget', 14, 18);

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  const regel2 = `${teamData.instellingen.naam || ''}${teamData.instellingen.klasNr ? ' · klas ' + teamData.instellingen.klasNr : ''}${sj ? ' · ' + sj : ''}`;
  doc.text(regel2, 14, 25);

  let y = 35;

  // Lyreco
  if (teamData.lyreco.length > 0) {
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('Lyreco-bestelling', 14, y);
    y += 2;

    let totExcl = 0, totIncl = 0;
    const body = teamData.lyreco.map(ly => {
      const excl = (ly.prijs || 0) * (ly.bestel || 0);
      const incl = excl * (1 + (ly.btw || 0) / 100);
      totExcl += excl; totIncl += incl;
      return [ly.artikel, ly.nr || '', String(ly.bestel || 0), '€ ' + (ly.prijs || 0).toFixed(2), (ly.btw || 0) + '%', '€ ' + incl.toFixed(2)];
    });
    body.push(['TOTAAL', '', '', '', '', '€ ' + totIncl.toFixed(2)]);

    doc.autoTable({
      startY: y + 2,
      head: [['Artikel', 'Bestelnr', 'Aantal', 'Prijs/st', 'BTW', 'Totaal incl.']],
      body,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [138, 122, 109], textColor: 255 },
      margin: { left: 14, right: 14 }
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // Action
  if (teamData.actions.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('Action & andere aankopen', 14, y);
    y += 2;

    let tot = 0;
    const body = teamData.actions.map(a => {
      tot += (a.prijs || 0);
      return [a.datum || '', a.naam, a.winkel || '', '€ ' + (a.prijs || 0).toFixed(2)];
    });
    body.push(['', 'TOTAAL', '', '€ ' + tot.toFixed(2)]);

    doc.autoTable({
      startY: y + 2,
      head: [['Datum', 'Wat', 'Winkel', 'Bedrag']],
      body,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [217, 151, 117], textColor: 255 },
      margin: { left: 14, right: 14 }
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // Budget
  let lyrecoIncl = 0;
  teamData.lyreco.forEach(l => { lyrecoIncl += (l.prijs || 0) * (l.bestel || 0) * (1 + (l.btw || 0) / 100); });
  let actionTot = 0;
  teamData.actions.forEach(a => { actionTot += (a.prijs || 0); });
  const totUitgegeven = lyrecoIncl + actionTot;
  const over = (teamData.budget || 0) - totUitgegeven;

  if (y > 240) { doc.addPage(); y = 20; }
  doc.setFontSize(13);
  doc.setFont(undefined, 'bold');
  doc.text('Budgetoverzicht', 14, y);
  y += 2;

  doc.autoTable({
    startY: y + 2,
    body: [
      ['Budget', '€ ' + (teamData.budget || 0).toFixed(2)],
      ['Lyreco (incl. BTW)', '€ ' + lyrecoIncl.toFixed(2)],
      ['Action & andere', '€ ' + actionTot.toFixed(2)],
      ['Totaal uitgegeven', '€ ' + totUitgegeven.toFixed(2)],
      ['OVER', '€ ' + over.toFixed(2)]
    ],
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 3 },
    margin: { left: 14, right: 14 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 }, 1: { halign: 'right', cellWidth: 50 } }
  });

  doc.save(`Lyreco_overzicht_${sj || 'klas'}.pdf`);
};

// ==============================================
// PDF: STOCK - volledig overzicht
// ==============================================
window.pdfStock = function () {
  if (!teamData.stockCats || teamData.stockCats.length === 0) {
    alert('Er zijn nog geen categorieën om te exporteren.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const sj = teamData.instellingen.schooljaar || '';

  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('Stock klasmateriaal', 14, 18);

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  const regel2 = `${teamData.instellingen.naam || ''}${teamData.instellingen.klasNr ? ' · klas ' + teamData.instellingen.klasNr : ''}${sj ? ' · ' + sj : ''}`;
  doc.text(regel2, 14, 25);

  let y = 33;

  teamData.stockCats.forEach(cat => {
    if (cat.producten.length === 0) return;
    if (y > 240) { doc.addPage(); y = 20; }

    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text(`${cat.icoon || ''} ${cat.naam}`.trim(), 14, y);
    y += 4;

    const body = cat.producten.map(p => {
      const totaal = (parseInt(p.l1) || 0) + (parseInt(p.l2) || 0);
      return [
        p.naam,
        String(p.l1 || 0),
        String(p.l2 || 0),
        String(totaal),
        String(p.bestel || 0),
        p.winkel || '—'
      ];
    });

    doc.autoTable({
      startY: y,
      head: [['Product', 'Stock L1', 'Stock L2', 'Totaal', 'Te bestellen', 'Winkel']],
      body,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [138, 122, 109], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { halign: 'center', cellWidth: 22 },
        2: { halign: 'center', cellWidth: 22 },
        3: { halign: 'center', cellWidth: 22, fillColor: [244, 220, 201], fontStyle: 'bold' },
        4: { halign: 'center', cellWidth: 28, fillColor: [245, 220, 220] },
        5: { halign: 'center', cellWidth: 28 }
      },
      margin: { left: 14, right: 14 }
    });
    y = doc.lastAutoTable.finalY + 10;
  });

  doc.save(`Stock_klasmateriaal_${sj || 'overzicht'}.pdf`);
};

// ==============================================
// PDF: BESTELLIJST PER WINKEL
// ==============================================
window.stockBestellijstPdf = function () {
  if (!teamData.stockCats || teamData.stockCats.length === 0) {
    alert('Er zijn nog geen categorieën.');
    return;
  }

  // Groepeer producten met "te bestellen > 0" per winkel
  const perWinkel = {}; // { 'Lyreco': [{cat, naam, aantal}], 'Action': [...], 'Ander': [...], 'Geen winkel': [...] }
  teamData.stockCats.forEach(cat => {
    cat.producten.forEach(p => {
      const bestel = parseInt(p.bestel) || 0;
      if (bestel > 0) {
        const winkel = p.winkel || 'Geen winkel gekozen';
        if (!perWinkel[winkel]) perWinkel[winkel] = [];
        perWinkel[winkel].push({ categorie: cat.naam, naam: p.naam, aantal: bestel });
      }
    });
  });

  if (Object.keys(perWinkel).length === 0) {
    alert('Er staat niets op de bestellijst. Vul bij "te bestellen" een aantal in.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const sj = teamData.instellingen.schooljaar || '';

  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('Bestellijst per winkel', 14, 18);

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  const regel2 = `${teamData.instellingen.naam || ''}${teamData.instellingen.klasNr ? ' · klas ' + teamData.instellingen.klasNr : ''}${sj ? ' · ' + sj : ''}`;
  doc.text(regel2, 14, 25);

  // Volgorde: Lyreco, Action, Ander, Geen winkel
  const volgorde = ['Lyreco', 'Action', 'Ander', 'Geen winkel gekozen'];
  const kleuren = {
    'Lyreco': [164, 207, 152],
    'Action': [244, 172, 114],
    'Ander': [190, 190, 190],
    'Geen winkel gekozen': [220, 220, 220]
  };
  const icons = {
    'Lyreco': '🖍️',
    'Action': '🛍️',
    'Ander': '📍',
    'Geen winkel gekozen': '❓'
  };

  let y = 33;
  let eersteWinkel = true;

  volgorde.forEach(winkel => {
    if (!perWinkel[winkel]) return;
    const items = perWinkel[winkel];

    // Nieuwe pagina per winkel (behalve de eerste)
    if (!eersteWinkel) {
      doc.addPage();
      y = 20;
    }
    eersteWinkel = false;

    doc.setFontSize(15);
    doc.setFont(undefined, 'bold');
    doc.text(`${icons[winkel]} ${winkel}`, 14, y);

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`${items.length} producten`, 14, y + 6);
    y += 12;

    const body = items.map(it => [it.categorie, it.naam, String(it.aantal)]);

    doc.autoTable({
      startY: y,
      head: [['Categorie', 'Product', 'Aantal']],
      body,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: kleuren[winkel], textColor: 40, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 95 },
        2: { halign: 'center', cellWidth: 30, fontStyle: 'bold' }
      },
      margin: { left: 14, right: 14 }
    });
    y = doc.lastAutoTable.finalY + 12;
  });

  doc.save(`Bestellijst_per_winkel_${sj || 'overzicht'}.pdf`);
};

// ==============================================
// PDF: KNUTSELS
// ==============================================
window.pdfKnutsels = function () {
  const huidig = teamData.instellingen.huidigSchooljaar || '';
  const ditJaar = teamData.knutsels.filter(k => k.schooljaar === huidig && huidig !== '');
  if (ditJaar.length === 0) {
    alert('Er zijn geen knutselideeën voor het huidige schooljaar (' + (huidig || 'niet ingesteld') + ').');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('Knutselideeën ' + huidig, 14, 18);

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  const regel2 = `${teamData.instellingen.naam || ''}${teamData.instellingen.klasNr ? ' · klas ' + teamData.instellingen.klasNr : ''}`;
  doc.text(regel2, 14, 25);

  let y = 33;

  // Lijst per knutsel
  const feestNaam = { moederdag: '💐 Moederdag', vaderdag: '👔 Vaderdag', pasen: '🐣 Pasen', sint: '🎁 Sinterklaas', kerst: '🎄 Kerst', ander: '✨ Ander' };

  ditJaar.forEach(k => {
    if (y > 255) { doc.addPage(); y = 20; }

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`${k.titel}`, 14, y);
    y += 5;

    doc.setFontSize(9);
    doc.setFont(undefined, 'italic');
    doc.text(feestNaam[k.feest] || 'Ander', 14, y);
    y += 5;

    const materiaal = (k.materiaal || '').split('\n').map(m => m.trim()).filter(m => m);
    if (materiaal.length > 0) {
      doc.setFont(undefined, 'bold');
      doc.setFontSize(10);
      doc.text('Materiaal:', 14, y);
      y += 4;
      doc.setFont(undefined, 'normal');
      materiaal.forEach(m => {
        if (y > 275) { doc.addPage(); y = 20; }
        doc.text(`  • ${m}`, 16, y);
        y += 4;
      });
    }
    if (k.notitie) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFont(undefined, 'italic');
      doc.setFontSize(9);
      const splitNote = doc.splitTextToSize('Notitie: ' + k.notitie, 180);
      doc.text(splitNote, 14, y);
      y += splitNote.length * 4;
    }
    y += 6;
  });

  // Verzamelde boodschappenlijst
  if (y > 230) { doc.addPage(); y = 20; }
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('🛒 Alle materialen samen', 14, y);
  y += 2;

  const alleMat = new Set();
  ditJaar.forEach(k => {
    (k.materiaal || '').split('\n').forEach(m => {
      const t = m.trim();
      if (t) alleMat.add(t);
    });
  });

  doc.autoTable({
    startY: y + 4,
    head: [['Materiaal']],
    body: Array.from(alleMat).sort().map(m => [m]),
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [217, 151, 117], textColor: 255 },
    margin: { left: 14, right: 14 }
  });

  doc.save(`Knutsels_${huidig || 'overzicht'}.pdf`);
};

// ==============================================
// TEAMLEDEN
// ==============================================
function ledenTonen() {
  if (!teamData) return;
  const lijst = document.getElementById('leden-lijst');
  const toevoegBlok = document.getElementById('lid-toevoegen-blok');
  const isEigenaar = huidigeUser && teamData.eigenaar === huidigeUser.uid;

  // Alleen eigenaar mag toevoegen/verwijderen
  toevoegBlok.style.display = isEigenaar ? 'block' : 'none';

  const emails = teamData.leden_emails || [];
  lijst.innerHTML = emails.map(email => {
    const isEigen = email.toLowerCase() === (huidigeUser?.email || '').toLowerCase();
    // Eigenaar-badge: we weten niet zeker welk e-mail bij de eigenaar-uid hoort,
    // maar de eerste in de lijst is meestal de eigenaar (zo wordt het aangemaakt)
    const eigBadge = email === emails[0] ? '<span class="eigenaar-badge">EIGENAAR</span>' : '';
    const verwijderKnop = isEigenaar && !isEigen && email !== emails[0]
      ? `<button class="knop klein rood" onclick="lidVerwijderen('${escape(email)}')">Verwijderen</button>`
      : '';
    return `
      <li>
        <span><span class="email">${escape(email)}</span>${eigBadge}${isEigen ? ' <span style="color:var(--grijs);font-size:0.85em;">(jij)</span>' : ''}</span>
        ${verwijderKnop}
      </li>
    `;
  }).join('');

  if (emails.length === 0) {
    lijst.innerHTML = '<li style="justify-content:center;color:var(--grijs);font-style:italic;">Nog geen teamleden.</li>';
  }
}

window.lidToevoegen = async function () {
  const email = document.getElementById('nieuw-lid-email').value.trim().toLowerCase();
  if (!email) { alert('Geef een geldig e-mailadres in.'); return; }
  if (!email.includes('@')) { alert('Dit lijkt geen geldig e-mailadres.'); return; }

  if ((teamData.leden_emails || []).includes(email)) {
    alert('Dit e-mailadres zit al in het team.');
    return;
  }

  try {
    const ref = doc(db, "klasbeheer_teams", teamId);
    await updateDoc(ref, {
      leden_emails: arrayUnion(email)
    });
    document.getElementById('nieuw-lid-email').value = '';
    alert(`${email} is toegevoegd! Zij ziet het klasbeheer zodra ze zich volgende keer aanmeldt op de huiswerkapp.`);
  } catch (err) {
    alert('Fout bij toevoegen: ' + err.message);
  }
};

window.lidVerwijderen = async function (email) {
  if (!confirm(`${email} verwijderen uit het team?`)) return;
  try {
    const ref = doc(db, "klasbeheer_teams", teamId);
    await updateDoc(ref, {
      leden_emails: arrayRemove(email)
    });
  } catch (err) {
    alert('Fout bij verwijderen: ' + err.message);
  }
};

// ==============================================
// BACK-UP / IMPORT / RESET
// ==============================================
window.exporteren = function () {
  const exportData = {
    instellingen: teamData.instellingen,
    werkboeken: teamData.werkboeken,
    budget: teamData.budget,
    lyreco: teamData.lyreco,
    actions: teamData.actions,
    knutsels: teamData.knutsels,
    stockCats: teamData.stockCats,
    _exportDatum: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const sj = (teamData.instellingen.schooljaar || 'klasbeheer').replace(/[^a-zA-Z0-9-]/g, '_');
  a.download = `klasbeheer_backup_${sj}_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

window.importeren = function (event) {
  const bestand = event.target.files[0];
  if (!bestand) return;
  if (!confirm('De huidige gegevens worden vervangen door het gekozen bestand. Dit geldt ook voor je teamleden! Doorgaan?')) {
    event.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = async e => {
    try {
      const nieuweData = JSON.parse(e.target.result);
      // Alleen data-velden overnemen, niet team-metadata
      teamData.instellingen = nieuweData.instellingen || teamData.instellingen;
      teamData.werkboeken = nieuweData.werkboeken || { L1: [], L2: [] };
      if (!teamData.werkboeken.L1) teamData.werkboeken.L1 = [];
      if (!teamData.werkboeken.L2) teamData.werkboeken.L2 = [];
      teamData.budget = nieuweData.budget || 0;
      teamData.lyreco = nieuweData.lyreco || [];
      teamData.actions = nieuweData.actions || [];
      teamData.knutsels = nieuweData.knutsels || [];
      teamData.stockCats = nieuweData.stockCats || [];

      await bewaarNu();
      alert('Back-up succesvol hersteld!');
      allesRenderen();
    } catch (err) {
      alert('Dit bestand kon niet gelezen worden: ' + err.message);
    }
    event.target.value = '';
  };
  reader.readAsText(bestand);
};

window.nieuwSchooljaar = function () {
  if (!confirm('Alle stock van werkboeken gaat naar 0, Action-aankopen en budget worden leeggemaakt. Lyreco-artikels, knutsels en stock-klasmateriaal blijven. Doorgaan?')) return;

  ['L1', 'L2'].forEach(lj => {
    (teamData.werkboeken[lj] || []).forEach(m => {
      m.delen.forEach(d => { d.stock = 0; });
    });
  });
  teamData.actions = [];
  teamData.budget = 0;
  planBewaren();
  alert('Stock van werkboeken is gereset. Action-aankopen en budget zijn leeggemaakt.');
};
