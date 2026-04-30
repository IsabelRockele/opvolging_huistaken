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
      schooljaar: '2026-2027',
      huidigSchooljaar: '2026-2027',
      // Gedeelde info over hele team (legacy - niet meer getoond, maar blijft bewaard voor oudere teams)
      naam: '',
      klasNr: '',
      kinderen: 23,
      reserve: 5,
      // Per leerjaar aparte instellingen (nieuwe structuur)
      L1: {
        naam: '',
        klasNr: '',
        kinderen: 23,
        reserve: 5
      },
      L2: {
        naam: '',
        klasNr: '',
        kinderen: 23,
        reserve: 5
      }
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
    bestelKinderen: 46, // Totaal aantal kinderen voor bestelling klasmateriaal (beide leerjaren samen)
    lyreco: [],
    actions: [],
    knutsels: [],
    archief: [],

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
  if (!teamData.instellingen) teamData.instellingen = {};
  const i = teamData.instellingen;

  // Basisvelden (gedeeld)
  if (i.schooljaar === undefined) i.schooljaar = '2026-2027';
  if (i.huidigSchooljaar === undefined) i.huidigSchooljaar = '2026-2027';

  // Oude velden (bewaren voor compat)
  if (i.naam === undefined) i.naam = '';
  if (i.klasNr === undefined) i.klasNr = '';
  if (i.kinderen === undefined) i.kinderen = 23;
  if (i.reserve === undefined) i.reserve = 5;

  // Nieuwe per-leerjaar structuur - initialiseer indien afwezig
  // (overneemt de oude top-level waarden zodat er geen data verloren gaat)
  if (!i.L1) {
    i.L1 = { naam: i.naam, klasNr: i.klasNr, kinderen: i.kinderen, reserve: i.reserve };
  }
  if (!i.L2) {
    i.L2 = { naam: i.naam, klasNr: i.klasNr, kinderen: i.kinderen, reserve: i.reserve };
  }
  // Zorg dat elke L1/L2 alle velden heeft
  ['L1', 'L2'].forEach(lj => {
    if (i[lj].naam === undefined) i[lj].naam = '';
    if (i[lj].klasNr === undefined) i[lj].klasNr = '';
    if (i[lj].kinderen === undefined) i[lj].kinderen = 23;
    if (i[lj].reserve === undefined) i[lj].reserve = 5;
  });

  if (!teamData.werkboeken) teamData.werkboeken = { L1: [], L2: [] };
  if (!teamData.werkboeken.L1) teamData.werkboeken.L1 = [];
  if (!teamData.werkboeken.L2) teamData.werkboeken.L2 = [];
  // Migratie: zorg dat elke methode een leerkrachtMateriaal-array heeft (handleiding, wandplaten, ...)
  ['L1','L2'].forEach(lj => {
    (teamData.werkboeken[lj] || []).forEach(m => {
      if (!Array.isArray(m.leerkrachtMateriaal)) m.leerkrachtMateriaal = [];
    });
  });
  if (!Array.isArray(teamData.lyreco)) teamData.lyreco = [];
  if (!Array.isArray(teamData.actions)) teamData.actions = [];
  if (!Array.isArray(teamData.knutsels)) teamData.knutsels = [];
  if (!Array.isArray(teamData.stockCats)) teamData.stockCats = [];
  if (!Array.isArray(teamData.archief)) teamData.archief = [];
  if (!Array.isArray(teamData.leden_emails)) teamData.leden_emails = [];
  if (!Array.isArray(teamData.leden_uids)) teamData.leden_uids = [];
  if (typeof teamData.budget !== 'number') teamData.budget = 0;

  // Aantal kinderen voor bestelling klasmateriaal (totaal van beide leerjaren) — apart aanpasbaar
  if (typeof teamData.bestelKinderen !== 'number') {
    const kinderenL1 = (teamData.klasInstellingen?.L1?.kinderen) || 0;
    const kinderenL2 = (teamData.klasInstellingen?.L2?.kinderen) || 0;
    teamData.bestelKinderen = kinderenL1 + kinderenL2;
  }

  // Normaliseer stock-producten (oude versies missen 'winkel')
  teamData.stockCats.forEach(cat => {
    if (!Array.isArray(cat.producten)) cat.producten = [];
    cat.producten.forEach(p => {
      if (p.winkel === undefined) p.winkel = '';
      if (p.winkelAnder === undefined) p.winkelAnder = ''; // vrije winkelnaam wanneer winkel === 'Ander'
      if (p.l1 === undefined) p.l1 = 0;
      if (p.l2 === undefined) p.l2 = 0;
      if (p.bestel === undefined) p.bestel = 0;
      // bestelManueel = true zodra de leerkracht het bestel-aantal handmatig wijzigt;
      // dan negeert de auto-berekening dit product.
      // Voor bestaande data: als er al een bestel-waarde > 0 staat, beschouwen we dit als manueel
      // (anders zou de auto-berekening eigen ingevulde waarden overschrijven bij eerste keer openen).
      if (p.bestelManueel === undefined) {
        p.bestelManueel = (parseInt(p.bestel) || 0) > 0;
      }
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
      bestelKinderen: teamData.bestelKinderen,
      lyreco: teamData.lyreco,
      actions: teamData.actions,
      knutsels: teamData.knutsels,
      stockCats: teamData.stockCats,
      archief: teamData.archief || [],
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
  const lj = teamData.instellingen[huidigLeerjaar] || {};
  return (lj.kinderen || 0) + (lj.reserve || 0);
}

// Helper: geef een tekstje zoals "L1: Hanne (1A) · L2: Isabel (2A)" voor gedeelde PDF-headers
// Voor Lyreco, Stock, Knutsels en Bestellijst die voor het hele team zijn.
function teamHeaderTekst() {
  if (!teamData) return '';
  const i = teamData.instellingen;
  const stukjes = [];
  ['L1', 'L2'].forEach(lj => {
    const d = i[lj];
    if (!d) return;
    const naam = (d.naam || '').trim();
    const klas = (d.klasNr || '').trim();
    if (naam || klas) {
      let stuk = lj + ': ';
      if (naam) stuk += naam;
      if (klas) stuk += (naam ? ' (' : '') + 'klas ' + klas + (naam ? ')' : '');
      stukjes.push(stuk);
    }
  });
  return stukjes.join(' · ');
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
  // Auto-bestel toepassen vóór stockTonen: zo zijn de cijfers correct bij eerste paint
  if (teamData) autoBestelToepassenStil();
  stockTonen();
  ledenTonen();
}

// Stille variant van autoBestelToepassen: werkt alleen het data-model bij, geen DOM-mutaties.
// Wordt gebruikt vóór een volledige render zodat we niet onnodig naar DOM-elementen zoeken die nog niet bestaan.
function autoBestelToepassenStil() {
  if (!teamData || !Array.isArray(teamData.stockCats)) return;
  teamData.stockCats.forEach(cat => {
    if (!isMateriaalKids(cat)) return;
    cat.producten.forEach(p => {
      if (p.bestelManueel) return;
      p.bestel = autoBestelAantal(p);
    });
  });
}

function klasInstellingenTonen() {
  const i = teamData.instellingen;
  const lj = i[huidigLeerjaar] || {};
  // Werkboeken-balk: waarden voor actieve leerjaar
  const klasBalkLabel = document.getElementById('klas-balk-leerjaar-label');
  if (klasBalkLabel) klasBalkLabel.textContent = huidigLeerjaar === 'L1' ? '📘 Leerjaar 1' : '📗 Leerjaar 2';
  const klasNaamEl = document.getElementById('klas-naam');
  const klasNrEl = document.getElementById('klas-nr');
  const klasKinderenEl = document.getElementById('klas-kinderen');
  const klasReserveEl = document.getElementById('klas-reserve');
  if (klasNaamEl) klasNaamEl.value = lj.naam || '';
  if (klasNrEl) klasNrEl.value = lj.klasNr || '';
  if (klasKinderenEl) klasKinderenEl.value = lj.kinderen ?? 23;
  if (klasReserveEl) klasReserveEl.value = lj.reserve ?? 5;
  const totaalEl = document.getElementById('klas-totaal-nr');
  if (totaalEl) totaalEl.textContent = totaalNodig();
  // Team-balk: gedeelde info
  const sjEl = document.getElementById('klas-schooljaar');
  if (sjEl) sjEl.value = i.schooljaar || '';
  const huidigSjEl = document.getElementById('huidig-schooljaar');
  if (huidigSjEl) huidigSjEl.value = i.huidigSchooljaar || '';
  // Team-label toont alle klassen samen
  const teamLabels = [];
  if (i.L1 && i.L1.klasNr) teamLabels.push(i.L1.klasNr);
  if (i.L2 && i.L2.klasNr) teamLabels.push(i.L2.klasNr);
  const teamNaamEl = document.getElementById('team-naam-label');
  if (teamNaamEl) teamNaamEl.textContent = teamLabels.length ? teamLabels.join(' + ') : 'Mijn team';
  const aantalLedenEl = document.getElementById('aantal-leden');
  if (aantalLedenEl) aantalLedenEl.textContent = (teamData.leden_emails?.length || 0) + ' leden';
}

// Wijzigt de instellingen van het ACTIEVE leerjaar (L1 of L2)
window.klasInstellingenZetten = function () {
  const lj = teamData.instellingen[huidigLeerjaar];
  if (!lj) return;
  lj.naam = document.getElementById('klas-naam').value.trim();
  lj.klasNr = document.getElementById('klas-nr').value.trim();
  lj.kinderen = parseInt(document.getElementById('klas-kinderen').value) || 0;
  lj.reserve = parseInt(document.getElementById('klas-reserve').value) || 0;
  document.getElementById('klas-totaal-nr').textContent = totaalNodig();
  planBewaren();
  // Live update: alleen de getallen in de tabel bijwerken, GEEN hele tabel herteekenen
  werkboekenCijfersLive();
  // Team-label bovenaan updaten (klas-nr kan mee veranderd zijn)
  const i = teamData.instellingen;
  const teamLabels = [];
  if (i.L1 && i.L1.klasNr) teamLabels.push(i.L1.klasNr);
  if (i.L2 && i.L2.klasNr) teamLabels.push(i.L2.klasNr);
  const teamNaamEl = document.getElementById('team-naam-label');
  if (teamNaamEl) teamNaamEl.textContent = teamLabels.length ? teamLabels.join(' + ') : 'Mijn team';
};

// Schooljaar is een gedeelde waarde (team-balk)
window.schooljaarZetten = function () {
  teamData.instellingen.schooljaar = document.getElementById('klas-schooljaar').value.trim();
  planBewaren();
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
  // De klas-balk bijwerken: toont nu de waarden van het actieve leerjaar
  klasInstellingenTonen();
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
    const lkMat = m.leerkrachtMateriaal || [];
    const lkRijen = lkMat.map(item => leerkrachtRijHtml(m.id, item)).join('');

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
                  <th>Deel <span style="font-weight:400;color:var(--tekst-zacht);font-size:0.85em;">(per kind)</span></th>
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

          <!-- LEERKRACHTMATERIAAL: handleiding, wandplaten, ... (1× per klas) -->
          <div class="leerkracht-blok">
            <div class="leerkracht-kop">
              🧑‍🏫 Voor de leerkracht <span class="leerkracht-sub">— handleiding, wandplaten, … (niet per kind)</span>
            </div>
            ${lkMat.length > 0 ? `
              <div class="tabel-wrap">
                <table class="vol">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th class="getal">In stock</th>
                      <th class="getal">Nodig</th>
                      <th class="getal">Bijbestellen</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody id="wb-lk-body-${m.id}">${lkRijen}</tbody>
                </table>
              </div>
            ` : `
              <p class="leerkracht-leeg">Nog geen leerkrachtmateriaal toegevoegd voor deze methode.</p>
            `}
            <div class="deel-toevoegen leerkracht-toevoegen">
              <div>
                <label>Nieuw item</label>
                <input type="text" id="nieuw-lk-naam-${m.id}" placeholder="bv. Handleiding of Wandplatenpakket">
              </div>
              <div>
                <label>Aantal</label>
                <input type="number" min="1" value="1" id="nieuw-lk-aantal-${m.id}" style="width:70px;">
              </div>
              <div>
                <label>Stock</label>
                <input type="number" min="0" value="0" id="nieuw-lk-stock-${m.id}" style="width:70px;">
              </div>
              <button class="knop klein" onclick="leerkrachtToevoegen('${m.id}')">➕ Toevoegen</button>
            </div>
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

// Genereert HTML voor één rij in de "Voor de leerkracht"-tabel (handleiding, wandplaten, ...)
function leerkrachtRijHtml(mId, item) {
  const stock = item.stock || 0;
  const aantal = item.aantal || 1;
  const tekort = Math.max(0, aantal - stock);

  return `
    <tr id="wb-lk-rij-${item.id}">
      <td>${escape(item.naam)}</td>
      <td class="getal">
        <input type="number" min="0" value="${stock}" class="tabel-input"
          onchange="leerkrachtStockUpdaten('${mId}','${item.id}',this.value)">
      </td>
      <td class="getal" id="wb-lk-nodig-${item.id}">
        <input type="number" min="1" value="${aantal}" class="tabel-input" style="width:60px;text-align:center;font-weight:bold;"
          onchange="leerkrachtAantalUpdaten('${mId}','${item.id}',this.value)">
      </td>
      <td class="getal ${tekort > 0 ? 'bestel-getal' : 'ok'}" id="wb-lk-tekort-${item.id}">
        ${tekort > 0 ? '+' + tekort : '✓'}
      </td>
      <td class="getal">
        <button class="knop klein grijs" onclick="leerkrachtHernoemen('${mId}','${item.id}')" title="Hernoemen">✏️</button>
        <button class="knop klein rood" onclick="leerkrachtVerwijderen('${mId}','${item.id}')" title="Verwijderen">🗑️</button>
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
  let totaalLkBijbestellen = 0;
  methodes.forEach(m => {
    m.delen.forEach(d => {
      totaalDelen++;
      const tekort = Math.max(0, nodig - (d.stock || 0));
      totaalBijbestellen += tekort;
    });
    (m.leerkrachtMateriaal || []).forEach(item => {
      const tekort = Math.max(0, (item.aantal || 1) - (item.stock || 0));
      totaalLkBijbestellen += tekort;
    });
  });

  const ljData = teamData.instellingen[huidigLeerjaar] || {};
  const lkRegel = totaalLkBijbestellen > 0
    ? `<div>🧑‍🏫 + <strong>${totaalLkBijbestellen}</strong> stuk(s) leerkrachtmateriaal</div>`
    : '';
  stats.innerHTML = `
    <div>👥 <strong>${nodig}</strong> per deel nodig <span style="color:var(--tekst-zacht);">(${ljData.kinderen || 0} kinderen + ${ljData.reserve || 0} reserve)</span></div>
    <div>📚 <strong>${methodes.length}</strong> methodes, <strong>${totaalDelen}</strong> delen</div>
    <div>🛒 Totaal bij te bestellen: <strong>${totaalBijbestellen}</strong> werkboeken</div>
    ${lkRegel}
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
        bestelRijen.push({ methode: m.naam, uitgever: m.uitgever, deel: d.naam, aantal: tekort, type: 'kind' });
      }
    });
    (m.leerkrachtMateriaal || []).forEach(item => {
      const tekort = Math.max(0, (item.aantal || 1) - (item.stock || 0));
      if (tekort > 0) {
        bestelRijen.push({ methode: m.naam, uitgever: m.uitgever, deel: item.naam, aantal: tekort, type: 'leerkracht' });
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
        <thead><tr><th>Methode</th><th>Uitgever</th><th>Deel / Item</th><th class="getal">Aantal</th></tr></thead>
        <tbody>
          ${bestelRijen.map(r => `
            <tr>
              <td>${escape(r.methode)}</td>
              <td>${escape(r.uitgever || '')}</td>
              <td>${r.type === 'leerkracht' ? '🧑‍🏫 ' : ''}${escape(r.deel)}</td>
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
    delen: [{ id: maakId(), naam: deelNaam, stock: deelStock }],
    leerkrachtMateriaal: []
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

// ==============================================
// LEERKRACHTMATERIAAL (handleiding, wandplaten, ...)
// ==============================================
window.leerkrachtToevoegen = function (mId) {
  const m = teamData.werkboeken[huidigLeerjaar].find(x => x.id === mId);
  if (!m) return;
  const naamInput = document.getElementById('nieuw-lk-naam-' + mId);
  const aantalInput = document.getElementById('nieuw-lk-aantal-' + mId);
  const stockInput = document.getElementById('nieuw-lk-stock-' + mId);
  const naam = naamInput.value.trim();
  if (!naam) { alert('Geef een naam voor het item.'); return; }
  const aantal = Math.max(1, parseInt(aantalInput.value) || 1);
  const stock = Math.max(0, parseInt(stockInput.value) || 0);

  if (!Array.isArray(m.leerkrachtMateriaal)) m.leerkrachtMateriaal = [];
  m.leerkrachtMateriaal.push({ id: maakId(), naam, aantal, stock });
  planBewaren();
  werkboekenTonen();
};

window.leerkrachtVerwijderen = function (mId, itemId) {
  const m = teamData.werkboeken[huidigLeerjaar].find(x => x.id === mId);
  if (!m || !Array.isArray(m.leerkrachtMateriaal)) return;
  const item = m.leerkrachtMateriaal.find(x => x.id === itemId);
  if (!item) return;
  if (!confirm(`"${item.naam}" verwijderen?`)) return;
  m.leerkrachtMateriaal = m.leerkrachtMateriaal.filter(x => x.id !== itemId);
  planBewaren();
  werkboekenTonen();
};

window.leerkrachtHernoemen = function (mId, itemId) {
  const m = teamData.werkboeken[huidigLeerjaar].find(x => x.id === mId);
  if (!m || !Array.isArray(m.leerkrachtMateriaal)) return;
  const item = m.leerkrachtMateriaal.find(x => x.id === itemId);
  if (!item) return;
  const nieuweNaam = prompt('Nieuwe naam:', item.naam);
  if (nieuweNaam === null) return;
  item.naam = nieuweNaam.trim() || item.naam;
  planBewaren();
  werkboekenTonen();
};

// Stock-input bijwerken — geen volledige hertekening, focus blijft staan
window.leerkrachtStockUpdaten = function (mId, itemId, waarde) {
  const m = teamData.werkboeken[huidigLeerjaar].find(x => x.id === mId);
  if (!m || !Array.isArray(m.leerkrachtMateriaal)) return;
  const item = m.leerkrachtMateriaal.find(x => x.id === itemId);
  if (!item) return;
  item.stock = Math.max(0, parseInt(waarde) || 0);
  planBewaren();
  leerkrachtRijBijwerken(item);
  werkboekenStatsTonen();
  werkboekBestellijstTonen();
};

// Aantal-input bijwerken (bv. 1 -> 2 handleidingen)
window.leerkrachtAantalUpdaten = function (mId, itemId, waarde) {
  const m = teamData.werkboeken[huidigLeerjaar].find(x => x.id === mId);
  if (!m || !Array.isArray(m.leerkrachtMateriaal)) return;
  const item = m.leerkrachtMateriaal.find(x => x.id === itemId);
  if (!item) return;
  item.aantal = Math.max(1, parseInt(waarde) || 1);
  planBewaren();
  leerkrachtRijBijwerken(item);
  werkboekenStatsTonen();
  werkboekBestellijstTonen();
};

// Werk één leerkracht-rij bij (zonder hele tabel te hertekenen)
function leerkrachtRijBijwerken(item) {
  const aantal = item.aantal || 1;
  const stock = item.stock || 0;
  const tekort = Math.max(0, aantal - stock);

  const tekortCel = document.getElementById('wb-lk-tekort-' + item.id);
  if (tekortCel) {
    tekortCel.className = 'getal ' + (tekort > 0 ? 'bestel-getal' : 'ok');
    tekortCel.textContent = tekort > 0 ? '+' + tekort : '✓';
  }
}


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
      <tr data-ly-id="${ly.id}">
        <td><input type="text" value="${escape(ly.artikel)}" class="tabel-input" style="width:100%;text-align:left;" oninput="lyrecoVeldUpdaten('${ly.id}','artikel',this.value)"></td>
        <td><input type="text" value="${escape(ly.nr)}" class="tabel-input" style="width:100%;text-align:left;" oninput="lyrecoVeldUpdaten('${ly.id}','nr',this.value)"></td>
        <td><input type="number" min="0" value="${ly.stock}" class="tabel-input klein" oninput="lyrecoVeldUpdaten('${ly.id}','stock',this.value)"></td>
        <td><input type="number" min="0" value="${ly.bestel}" class="tabel-input klein" oninput="lyrecoVeldUpdaten('${ly.id}','bestel',this.value)"></td>
        <td><input type="number" min="0" step="0.01" value="${ly.prijs}" class="tabel-input" oninput="lyrecoVeldUpdaten('${ly.id}','prijs',this.value)"></td>
        <td>
          <select class="tabel-input klein" style="width:70px;text-align:left;" onchange="lyrecoVeldUpdaten('${ly.id}','btw',this.value)">
            <option value="6" ${ly.btw == 6 ? 'selected' : ''}>6%</option>
            <option value="21" ${ly.btw == 21 ? 'selected' : ''}>21%</option>
          </select>
        </td>
        <td class="getal" data-cel="subExcl">€ ${subExcl.toFixed(2)}</td>
        <td class="getal" data-cel="subIncl"><strong>€ ${subIncl.toFixed(2)}</strong></td>
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

// Lichte versie die alleen subtotaal-cel + footer + stats bijwerkt — geen re-render → focus blijft staan
window.lyrecoVeldUpdaten = function (id, veld, waarde) {
  const ly = teamData.lyreco.find(x => x.id === id);
  if (!ly) return;
  if (['stock','bestel','min','btw'].includes(veld)) ly[veld] = parseInt(waarde) || 0;
  else if (veld === 'prijs') ly[veld] = parseFloat(waarde) || 0;
  else ly[veld] = waarde;

  // Update subtotaal-cellen van deze rij
  if (['prijs','bestel','btw'].includes(veld)) {
    const rij = document.querySelector(`tr[data-ly-id="${id}"]`);
    if (rij) {
      const subExcl = (ly.prijs || 0) * (ly.bestel || 0);
      const subIncl = subExcl * (1 + (ly.btw || 0) / 100);
      const celExcl = rij.querySelector('[data-cel="subExcl"]');
      const celIncl = rij.querySelector('[data-cel="subIncl"]');
      if (celExcl) celExcl.textContent = '€ ' + subExcl.toFixed(2);
      if (celIncl) celIncl.innerHTML = '<strong>€ ' + subIncl.toFixed(2) + '</strong>';
    }
    lyrecoFooterEnStatsBijwerken();
    budgetTonen();
  }
  planBewaren();
};

// Herberekent footer-rij + samenvatting boven de tabel zonder de tabel zelf te hertekenen
function lyrecoFooterEnStatsBijwerken() {
  if (!teamData) return;
  const items = teamData.lyreco;
  let totExcl = 0, totIncl = 0, totAantal = 0;
  items.forEach(ly => {
    const subExcl = (ly.prijs || 0) * (ly.bestel || 0);
    totExcl += subExcl;
    totIncl += subExcl * (1 + (ly.btw || 0) / 100);
    totAantal += (ly.bestel || 0);
  });

  const foot = document.getElementById('ly-foot');
  if (foot) {
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
  }

  const stats = document.getElementById('ly-stats');
  if (stats) {
    stats.innerHTML = `
      <div>🖍️ <strong>${items.length}</strong> artikels</div>
      <div>📦 Totaal te bestellen: <strong>${totAantal}</strong> stuks</div>
      <div>💰 Totaal incl. BTW: <strong>€ ${totIncl.toFixed(2)}</strong></div>
    `;
  }
}

window.lyrecoVerwijderen = function (id) {
  const ly = teamData.lyreco.find(x => x.id === id);
  if (!ly) return;
  if (!confirm(`Artikel "${ly.artikel}" verwijderen?`)) return;
  teamData.lyreco = teamData.lyreco.filter(x => x.id !== id);
  planBewaren();
  lyrecoTonen();
};

// ==============================================
// LYRECO PDF-IMPORT
// ==============================================
// Globale plek om voorbereide import-artikels te bewaren tussen preview en bevestiging
let lyrecoImportKandidaten = [];

window.lyrecoPdfImporteren = async function (event) {
  const bestand = event.target.files[0];
  if (!bestand) return;
  event.target.value = ''; // reset zodat hetzelfde bestand opnieuw kan gekozen worden

  if (!window.pdfjsLib) {
    alert('PDF-bibliotheek is niet geladen. Ververs de pagina en probeer opnieuw.');
    return;
  }

  try {
    // PDF inlezen
    const arrayBuffer = await bestand.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    // Alle tekst van alle pagina's verzamelen
    let volledigeTekst = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      // Reconstrueer tekst regel-per-regel op basis van y-coördinaat
      const items = content.items.map(it => ({
        tekst: it.str,
        x: it.transform[4],
        y: it.transform[5]
      }));
      // Sorteer op y (omgekeerd - PDF heeft origin links-onder) dan op x
      items.sort((a, b) => {
        if (Math.abs(a.y - b.y) > 3) return b.y - a.y;
        return a.x - b.x;
      });
      // Groepeer tot regels
      let laatstY = null;
      let regel = '';
      items.forEach(it => {
        if (laatstY !== null && Math.abs(laatstY - it.y) > 3) {
          volledigeTekst += regel.trim() + '\n';
          regel = '';
        }
        regel += ' ' + it.tekst;
        laatstY = it.y;
      });
      volledigeTekst += regel.trim() + '\n\n'; // pagina-einde
    }

    // Parseer de tekst
    const { artikels, btw } = parseerLyrecoTekst(volledigeTekst);

    if (artikels.length === 0) {
      alert('❌ Geen artikels gevonden in deze PDF.\n\n' +
            'Controleer of het de juiste Lyreco-bestelbevestiging is. ' +
            'Als de tekst in de PDF niet te selecteren is (ingescand beeld), kan import niet werken.');
      return;
    }

    // Toon preview
    lyrecoImportKandidaten = artikels;
    toonLyrecoPreview(artikels, bestand.name, btw);

  } catch (err) {
    console.error('PDF-leesfout:', err);
    alert('❌ Kon de PDF niet lezen.\n\nFoutmelding: ' + (err.message || err));
  }
};

// Parseer de platte tekst van een Lyreco-PDF naar artikel-objecten
// Lyreco-PDF structuur per artikel (in tekst-uitvoer van pdf.js):
//   [omschrijving regel 1]
//   [omschrijving regel 2]
//   [aantal] (eventueel gevolgd door totaalprijs op zelfde regel bij split-layout)
//   [eenheidprijs] EUR    (en/of "EUR" of totaalprijs op aparte regels)
//   stuk (1)
//   Referentie: X.XXX.XXX
//   Beschikbaar: ...
//
// Per artikel parseerWe: van na de VORIGE "Referentie:" tot het BEGIN van de huidige.
// Daardoor hoort alles wat vóór de huidige Referentie staat bij dit artikel.
function parseerLyrecoTekst(tekst) {
  const artikels = [];

  // Detecteer BTW-percentage uit totalen onderaan PDF
  // "Totaal exclusief BTW: 568,26 EUR" en "BTW: 119,33 EUR" → 21%
  let btwPercentage = 21; // default
  const exclMatch = tekst.match(/Totaal\s+exclusief\s+BTW[:\s]+(\d+(?:\.\d{3})*(?:,\d{1,2}))\s*EUR/i);
  const btwMatch = tekst.match(/(?:^|\n)\s*BTW[:\s]+(\d+(?:\.\d{3})*(?:,\d{1,2}))\s*EUR/i);
  if (exclMatch && btwMatch) {
    const excl = parseFloat(exclMatch[1].replace(/\./g, '').replace(',', '.'));
    const btw = parseFloat(btwMatch[1].replace(/\./g, '').replace(',', '.'));
    if (excl > 0) {
      const ratio = (btw / excl) * 100;
      // Snap naar dichtstbijzijnde standaard tarief
      if (Math.abs(ratio - 6) < 1.5) btwPercentage = 6;
      else if (Math.abs(ratio - 12) < 1.5) btwPercentage = 12;
      else btwPercentage = 21;
    }
  }

  // Vind alle "Referentie:" posities
  const refRegex = /Referentie:\s*([\d.]+)/g;
  const refs = [];
  let m;
  while ((m = refRegex.exec(tekst)) !== null) {
    refs.push({ ref: m[1].trim(), index: m.index, end: m.index + m[0].length });
  }
  if (refs.length === 0) return { artikels: [], btw: btwPercentage };

  // Header- en footer-regels die geen omschrijving zijn
  const filterPatronen = [
    /^Bedankt/i, /^Dank je/i, /^Jouw bestelling/i, /^Je krijgt/i,
    /^Ordermethode/i, /^Orderdatum/i, /^Ordernummer/i, /^Jouw ordernummer/i,
    /^Nummer/i, /^Rekwisitie/i, /^Klantnummer/i, /^Lindestraat/i, /^\d{4}\s+BORNEM/i,
    /^Leveringsdatum/i, /^Ter attentie/i, /^BS de linde/i,
    /^Isabel\s+Rockele/i, /^Rockele\b/i,
    /^Internet\b/i, /^\d{2}\/\d{2}\/\d{4}/,
    /^Orderoverzicht/i, /^Bestelinformatie/i, /^Facturatiegegevens/i, /^Informatie levering/i,
    /^Omschrijving/i, /^Eenh\b/i, /^Eenheidsprijs/i, /^Eenheidprijs/i, /^Prijs$/i,
    /^EUR$/i, /^[\d.]+,\d{2}\s*EUR$/i, /^\s*\d+\s*$/, /^\d+\s+\d+,\d{2}/,
    /^stuk\s*\(\d+\)/i, /^Beschikbaar:/i,
    /^\(\d+\)$/, /^Referentie:/i, /^Om deze/i, /^no_reply/i, /^Working together/i,
    /^For tomorrow/i, /^Lyreco$/i,
    /^Totaal/i, /^BTW[:\s]/i,
    /^Als je nog/i, /^customer\./i, /^Met vriendelijke/i, /^Lyreco Customer/i
  ];

  for (let i = 0; i < refs.length; i++) {
    // Blok = van na de vorige Referentie (of doc-start) tot net vóór huidige Referentie
    const startBlok = i === 0 ? 0 : refs[i - 1].end;
    const eindBlok = refs[i].index;
    const blok = tekst.substring(startBlok, eindBlok);
    const regels = blok.split('\n').map(r => r.trim()).filter(r => r.length > 0);

    // Stap 1: zoek de aantal-regel.
    // Lyreco gebruikt verschillende layouts:
    //   "4 17,63 EUR"      → aantal=4, eenheidprijs=17.63 (combinatie-regel, geen split)
    //   "4 70,52"          → aantal=4, totaalprijs=70.52 (split-layout, EUR staat verderop)
    //   "2"                → aantal=2 (eenvoudige regel, prijzen volgen erna)
    let aantal = 0;
    let aantalRegelIdx = -1;
    let aantalIsSplitLayout = false;
    let totaalUitSplit = 0;

    for (let j = 0; j < regels.length; j++) {
      const r = regels[j];

      // "X NN,NN EUR" - aantal direct gevolgd door eenheidprijs op zelfde regel
      const combiMetEUR = r.match(/^(\d+)\s+(\d+(?:\.\d{3})*(?:,\d{1,2}))\s*EUR/);
      if (combiMetEUR) {
        aantal = parseInt(combiMetEUR[1]);
        aantalRegelIdx = j;
        aantalIsSplitLayout = false;
        continue;
      }
      // "X NN,NN" zonder EUR → in dit geval is NN,NN de TOTAALPRIJS (kolom-split)
      const splitZonderEUR = r.match(/^(\d+)\s+(\d+(?:\.\d{3})*(?:,\d{1,2}))\s*$/);
      if (splitZonderEUR) {
        aantal = parseInt(splitZonderEUR[1]);
        aantalRegelIdx = j;
        aantalIsSplitLayout = true;
        totaalUitSplit = parseFloat(splitZonderEUR[2].replace(/\./g, '').replace(',', '.'));
        continue;
      }
      // Pure getal-regel (1-4 cijfers), gevolgd door een prijs- of stuk-regel
      if (/^\d{1,4}$/.test(r) && j > 0) {
        const volgende = regels[j + 1] || '';
        if (/\d+,\d{2}\s*EUR/.test(volgende) || /^stuk\s*\(/i.test(volgende)) {
          aantal = parseInt(r);
          aantalRegelIdx = j;
          aantalIsSplitLayout = false;
        }
      }
    }

    // Stap 2: omschrijving = regels VOOR aantal-regel, gefilterd
    let omschrijving = '';
    if (aantalRegelIdx > 0) {
      const omschrijvingRegels = regels.slice(0, aantalRegelIdx)
        .filter(r => !filterPatronen.some(p => p.test(r)));
      omschrijving = omschrijvingRegels.join(' ').replace(/\s+/g, ' ').trim();
    } else {
      // Fallback: pak laatste 1-2 regels die niet gefilterd worden
      const nuttig = regels.filter(r => !filterPatronen.some(p => p.test(r)));
      if (nuttig.length > 0) omschrijving = nuttig.slice(-2).join(' ').replace(/\s+/g, ' ').trim();
      if (aantal === 0) aantal = 1;
    }

    // Stap 3: eenheidprijs bepalen (alleen zoeken NA de aantal-regel)
    let prijsPerStuk = 0;
    const zoekvanaf = aantalRegelIdx >= 0
      ? regels.slice(aantalRegelIdx + 1).join('\n')
      : blok;

    const prijsRegex = /(\d+(?:\.\d{3})*(?:,\d{1,2}))\s*EUR/g;
    const prijzen = [];
    let pm;
    while ((pm = prijsRegex.exec(zoekvanaf)) !== null) {
      const p = parseFloat(pm[1].replace(/\./g, '').replace(',', '.'));
      if (!isNaN(p)) prijzen.push(p);
    }

    if (aantalIsSplitLayout && totaalUitSplit > 0 && aantal > 0) {
      // Split-layout: aantalregel bevatte al de totaalprijs.
      // Eerste prijs hierna is normaal de eenheidprijs.
      if (prijzen.length >= 1) {
        const kandidaat = prijzen[0];
        if (Math.abs(aantal * kandidaat - totaalUitSplit) < 0.05) {
          prijsPerStuk = kandidaat; // klopt
        } else {
          prijsPerStuk = totaalUitSplit / aantal; // bereken uit totaal
        }
      } else {
        prijsPerStuk = totaalUitSplit / aantal;
      }
    } else if (prijzen.length >= 2 && aantal > 0) {
      // Normaal: prijzen[0] = eenheidprijs, prijzen[1] = totaal — verifieer
      const k1 = prijzen[0], k2 = prijzen[1];
      if (Math.abs(aantal * k1 - k2) < 0.05) prijsPerStuk = k1;
      else if (Math.abs(aantal * k2 - k1) < 0.05) prijsPerStuk = k2;
      else prijsPerStuk = k1;
    } else if (prijzen.length === 1) {
      prijsPerStuk = aantal > 0 ? prijzen[0] / aantal : prijzen[0];
    }

    if (omschrijving && refs[i].ref) {
      artikels.push({
        artikel: omschrijving,
        nr: refs[i].ref,
        bestel: aantal || 1,
        prijs: Math.round(prijsPerStuk * 100) / 100,
        btw: btwPercentage,
        stock: 0,
        min: 0
      });
    }
  }

  return { artikels, btw: btwPercentage };
}

function toonLyrecoPreview(artikels, bestandsnaam, gedetecteerdeBtw) {
  const dlg = document.getElementById('lyreco-preview-dialoog');
  const info = document.getElementById('lyreco-preview-info');
  const inhoud = document.getElementById('lyreco-preview-inhoud');

  const btwInfo = gedetecteerdeBtw
    ? ` (BTW automatisch ingesteld op ${gedetecteerdeBtw}% — pas aan per artikel waar nodig, bv. 6% voor papier/boeken)`
    : '';
  info.textContent = `Uit "${bestandsnaam}" werden ${artikels.length} artikel${artikels.length === 1 ? '' : 's'} herkend${btwInfo}. Controleer hieronder en pas aan indien nodig.`;

  let totaalIncl = 0;
  let totaalExcl = 0;
  const rijen = artikels.map((a, idx) => {
    const subExcl = a.prijs * a.bestel;
    const subIncl = subExcl * (1 + (a.btw || 21) / 100);
    totaalExcl += subExcl;
    totaalIncl += subIncl;
    return `
      <tr>
        <td style="padding:6px; vertical-align:middle;">
          <input type="checkbox" id="ly-imp-${idx}" checked style="transform:scale(1.2); cursor:pointer;">
        </td>
        <td style="padding:6px;">
          <input type="text" value="${escape(a.artikel)}" class="tabel-input" style="width:100%; text-align:left;"
            onchange="lyrecoImportKandidaten[${idx}].artikel=this.value">
        </td>
        <td style="padding:6px;">
          <input type="text" value="${escape(a.nr)}" class="tabel-input" style="width:100%; text-align:left;"
            onchange="lyrecoImportKandidaten[${idx}].nr=this.value">
        </td>
        <td style="padding:6px;">
          <input type="number" min="0" value="${a.bestel}" class="tabel-input klein"
            onchange="lyrecoImportKandidaten[${idx}].bestel=parseInt(this.value)||0">
        </td>
        <td style="padding:6px;">
          <input type="number" min="0" step="0.01" value="${a.prijs.toFixed(2)}" class="tabel-input"
            onchange="lyrecoImportKandidaten[${idx}].prijs=parseFloat(this.value)||0">
        </td>
        <td style="padding:6px;">
          <select class="tabel-input klein" style="width:70px; text-align:left;"
            onchange="lyrecoImportKandidaten[${idx}].btw=parseInt(this.value)||21">
            <option value="6" ${a.btw == 6 ? 'selected' : ''}>6%</option>
            <option value="21" ${a.btw == 21 ? 'selected' : ''}>21%</option>
          </select>
        </td>
      </tr>
    `;
  }).join('');

  inhoud.innerHTML = `
    <table class="vol" style="width:100%;">
      <thead>
        <tr>
          <th style="width:40px;">✓</th>
          <th>Artikel</th>
          <th>Bestelnr</th>
          <th>Aantal</th>
          <th>Prijs/st (excl.)</th>
          <th>BTW</th>
        </tr>
      </thead>
      <tbody>${rijen}</tbody>
      <tfoot>
        <tr style="background:var(--creme-warm);">
          <td colspan="5" style="text-align:right;">Totaal exclusief BTW</td>
          <td style="text-align:right;">€ ${totaalExcl.toFixed(2)}</td>
        </tr>
        <tr style="background:var(--creme-warm); font-weight:800;">
          <td colspan="5" style="text-align:right;">GESCHAT TOTAAL inclusief BTW</td>
          <td style="text-align:right;">€ ${totaalIncl.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>
  `;

  dlg.style.display = 'block';
}

window.lyrecoImportAnnuleren = function () {
  document.getElementById('lyreco-preview-dialoog').style.display = 'none';
  lyrecoImportKandidaten = [];
};

window.lyrecoImportBevestigen = function () {
  const geselecteerd = lyrecoImportKandidaten.filter((_, idx) => {
    const cb = document.getElementById('ly-imp-' + idx);
    return cb && cb.checked;
  });

  if (geselecteerd.length === 0) {
    alert('Geen artikels aangevinkt om toe te voegen.');
    return;
  }

  // Voeg toe aan bestaande lijst (geen vervanging)
  geselecteerd.forEach(a => {
    teamData.lyreco.push({
      id: maakId(),
      artikel: a.artikel,
      nr: a.nr,
      prijs: a.prijs,
      btw: a.btw || 21,
      bestel: a.bestel,
      stock: 0,
      min: 0
    });
  });

  planBewaren();
  lyrecoTonen();
  document.getElementById('lyreco-preview-dialoog').style.display = 'none';
  lyrecoImportKandidaten = [];

  alert(`✅ ${geselecteerd.length} artikel${geselecteerd.length === 1 ? '' : 's'} toegevoegd aan je Lyreco-lijst.\n\nControleer nog even de BTW-tarieven: papier en boeken hebben meestal 6%, de rest 21%.`);
};

// ==============================================
// ACTION-AANKOPEN
// ==============================================
function actionTonen() {
  if (!teamData) return;
  const body = document.getElementById('ac-body');
  const foot = document.getElementById('ac-foot');
  const items = teamData.actions;

  // Datalist altijd updaten zodat reeds gebruikte winkelnamen als suggestie verschijnen
  acWinkelsDatalistVullen();

  if (items.length === 0) {
    body.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--grijs);padding:20px;font-style:italic;">Nog geen aankopen.</td></tr>';
    foot.innerHTML = '';
    acPerWinkelTonen();
    return;
  }

  let tot = 0;
  body.innerHTML = items.map(a => {
    tot += (a.prijs || 0);
    return `
      <tr data-ac-id="${a.id}">
        <td><input type="date" value="${a.datum || ''}" class="tabel-input" style="width:130px;text-align:left;" oninput="actionVeldUpdaten('${a.id}','datum',this.value)"></td>
        <td><input type="text" value="${escape(a.naam)}" class="tabel-input" style="width:100%;text-align:left;" oninput="actionVeldUpdaten('${a.id}','naam',this.value)"></td>
        <td><input type="text" value="${escape(a.winkel)}" class="tabel-input" style="width:120px;text-align:left;" list="ac-winkels-lijst" oninput="actionVeldUpdaten('${a.id}','winkel',this.value)"></td>
        <td><input type="number" min="0" step="0.01" value="${a.prijs}" class="tabel-input" oninput="actionVeldUpdaten('${a.id}','prijs',this.value)"></td>
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

  acPerWinkelTonen();
  budgetTonen();
}

// Toon totaal per winkel onder de aankopentabel — handig om snel te zien
// hoeveel je in elke winkel uitgaf en welk budget er nog over is.
function acPerWinkelTonen() {
  const wrap = document.getElementById('ac-per-winkel');
  if (!wrap || !teamData) return;
  const items = teamData.actions || [];
  if (items.length === 0) {
    wrap.innerHTML = '';
    return;
  }

  // Optellen per winkelnaam (lege/onbekende → "Geen winkel")
  const perWinkel = {};
  items.forEach(a => {
    const w = (a.winkel || '').trim() || 'Geen winkel';
    if (!perWinkel[w]) perWinkel[w] = { totaal: 0, aantal: 0 };
    perWinkel[w].totaal += (parseFloat(a.prijs) || 0);
    perWinkel[w].aantal += 1;
  });

  // Sorteer: hoogste bedrag eerst
  const winkels = Object.keys(perWinkel).sort((a, b) => perWinkel[b].totaal - perWinkel[a].totaal);

  wrap.innerHTML = `
    <span style="font-weight:700;color:var(--tekst-zacht);font-size:0.88em;align-self:center;">📊 Per winkel:</span>
    ${winkels.map(w => `
      <div class="winkel-pil">
        <span class="naam">${escape(w)}</span>
        <span class="bedrag">€ ${perWinkel[w].totaal.toFixed(2)}</span>
        <span class="aantal">(${perWinkel[w].aantal} aankoop${perWinkel[w].aantal === 1 ? '' : 'en'})</span>
      </div>
    `).join('')}
  `;
}

// Vul de datalist met alle reeds gebruikte winkelnamen (uniek, alfabetisch),
// aangevuld met enkele standaardvoorstellen. Zo krijgt Isabel ze als suggestie
// zodra ze begint te typen in het Winkel-veld.
function acWinkelsDatalistVullen() {
  const datalist = document.getElementById('ac-winkels-lijst');
  if (!datalist || !teamData) return;
  const standaard = ['Action', 'Lyreco', 'HEMA', 'Schleiper', 'Carrefour', 'Colruyt', 'Ava'];
  const gebruikt = (teamData.actions || [])
    .map(a => (a.winkel || '').trim())
    .filter(w => w);
  const alle = Array.from(new Set([...standaard, ...gebruikt])).sort((a, b) => a.localeCompare(b, 'nl'));
  datalist.innerHTML = alle.map(w => `<option value="${escape(w)}"></option>`).join('');
}

window.actionToevoegen = function () {
  const naam = document.getElementById('ac-naam').value.trim();
  if (!naam) { alert('Geef een naam voor de aankoop.'); return; }

  const winkelInvoer = document.getElementById('ac-winkel').value.trim();
  if (!winkelInvoer) { alert('Geef een winkel op (bv. Action, HEMA, Schleiper...).'); return; }

  teamData.actions.push({
    id: maakId(),
    naam,
    winkel: winkelInvoer,
    prijs: parseFloat(document.getElementById('ac-prijs').value) || 0,
    datum: document.getElementById('ac-datum').value || new Date().toISOString().split('T')[0]
  });

  document.getElementById('ac-naam').value = '';
  document.getElementById('ac-winkel').value = '';
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

// Lichte versie zonder volledige re-render → focus blijft staan tijdens typen
window.actionVeldUpdaten = function (id, veld, waarde) {
  const a = teamData.actions.find(x => x.id === id);
  if (!a) return;
  if (veld === 'prijs') a[veld] = parseFloat(waarde) || 0;
  else a[veld] = waarde;

  if (veld === 'prijs') {
    actionFooterBijwerken();
    acPerWinkelTonen();
    budgetTonen();
  } else if (veld === 'winkel') {
    // Winkelnaam wijzigt → overzicht per winkel én datalist herrekenen
    acPerWinkelTonen();
    acWinkelsDatalistVullen();
  }
  planBewaren();
};

function actionFooterBijwerken() {
  if (!teamData) return;
  let tot = 0;
  teamData.actions.forEach(a => { tot += (a.prijs || 0); });
  const foot = document.getElementById('ac-foot');
  if (foot) {
    foot.innerHTML = `
      <tr style="background:var(--creme-warm);font-weight:800;">
        <td colspan="3">TOTAAL</td>
        <td class="getal">€ ${tot.toFixed(2)}</td>
        <td></td>
      </tr>
    `;
  }
}

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

  // Sync bestel-kinderen input bovenaan (alleen wanneer veld niet de focus heeft, anders verstoor je het typen)
  const bk = document.getElementById('bestel-kinderen');
  if (bk && document.activeElement !== bk) {
    bk.value = teamData.bestelKinderen || 0;
  }

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

  const isKidsCat = isMateriaalKids(cat);

  const rijen = cat.producten.length === 0
    ? '<tr><td colspan="7" style="text-align:center;color:var(--grijs);padding:20px;font-style:italic;">Nog geen producten in deze categorie.</td></tr>'
    : cat.producten.map(p => {
        const winkelClass = p.winkel === 'Lyreco' ? 'lyreco' :
                            p.winkel === 'Action' ? 'action' :
                            p.winkel ? 'ander' : '';
        const totaal = (parseInt(p.l1) || 0) + (parseInt(p.l2) || 0);
        // Auto-indicator alleen tonen in Materiaal kids
        let autoHint = '';
        if (isKidsCat) {
          if (p.bestelManueel) {
            autoHint = `<button class="auto-toggle manueel" title="Handmatig ingesteld — klik om terug naar auto te schakelen" onclick="stockBestelTerugNaarAuto('${cat.id}','${p.id}')">✏️</button>`;
          } else {
            autoHint = `<span class="auto-toggle auto" title="Automatisch berekend (kinderen − stock)">⚙️</span>`;
          }
        }
        return `
          <tr>
            <td>
              <input type="text" value="${escape(p.naam)}" class="stock-naam-input"
                oninput="stockProductUpdaten('${cat.id}','${p.id}','naam',this.value)">
            </td>
            <td class="nummer">
              <input type="number" min="0" value="${p.l1}" class="stock-input-num"
                oninput="stockProductUpdaten('${cat.id}','${p.id}','l1',this.value)">
            </td>
            <td class="nummer">
              <input type="number" min="0" value="${p.l2}" class="stock-input-num"
                oninput="stockProductUpdaten('${cat.id}','${p.id}','l2',this.value)">
            </td>
            <td class="totaal-kol">
              <span class="stock-totaal" id="totaal-${p.id}">${totaal}</span>
            </td>
            <td class="nummer">
              <span class="bestel-cel">
                <input type="number" min="0" value="${p.bestel}" class="stock-input-num te-bestellen"
                  data-product-id="${p.id}"
                  oninput="stockProductUpdaten('${cat.id}','${p.id}','bestel',this.value)">
                ${autoHint}
              </span>
            </td>
            <td class="winkel-kol">
              <select class="stock-winkel-select ${winkelClass}"
                onchange="stockProductUpdaten('${cat.id}','${p.id}','winkel',this.value)">
                <option value="" ${!p.winkel ? 'selected' : ''}>—</option>
                <option value="Lyreco" ${p.winkel === 'Lyreco' ? 'selected' : ''}>🖍️ Lyreco</option>
                <option value="Action" ${p.winkel === 'Action' ? 'selected' : ''}>🛍️ Action</option>
                <option value="Ander" ${p.winkel === 'Ander' ? 'selected' : ''}>📍 Ander</option>
              </select>
              ${p.winkel === 'Ander' ? `
                <input type="text" class="stock-winkel-ander" placeholder="Naam winkel..."
                  value="${escape(p.winkelAnder || '')}"
                  oninput="stockProductUpdaten('${cat.id}','${p.id}','winkelAnder',this.value)">
              ` : ''}
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

  const ingevuldBestel = parseInt(document.getElementById('nieuw-stock-bestel-' + catId).value) || 0;
  const nieuwProduct = {
    id: maakId(),
    naam,
    l1: parseInt(document.getElementById('nieuw-stock-l1-' + catId).value) || 0,
    l2: parseInt(document.getElementById('nieuw-stock-l2-' + catId).value) || 0,
    bestel: ingevuldBestel,
    winkel: document.getElementById('nieuw-stock-winkel-' + catId).value || '',
    // Als de leerkracht zelf een bestel-aantal opgaf bij toevoegen → manueel; anders auto
    bestelManueel: ingevuldBestel > 0
  };
  cat.producten.push(nieuwProduct);

  // Voor Materiaal kids zonder ingevuld bestel-aantal: meteen auto-berekenen
  if (isMateriaalKids(cat) && !nieuwProduct.bestelManueel) {
    nieuwProduct.bestel = autoBestelAantal(nieuwProduct);
  }

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

  // Als de leerkracht het bestel-veld zelf invult → markeren als manueel
  if (veld === 'bestel') {
    p.bestelManueel = true;
  }

  // Als L1/L2 wijzigt in "Materiaal kids" en bestel-veld nog niet manueel is → auto-bestel updaten
  if ((veld === 'l1' || veld === 'l2') && isMateriaalKids(cat) && !p.bestelManueel) {
    const nieuw = autoBestelAantal(p);
    if (p.bestel !== nieuw) {
      p.bestel = nieuw;
      const inp = document.querySelector(`input.stock-input-num.te-bestellen[data-product-id="${productId}"]`);
      if (inp && document.activeElement !== inp) {
        inp.value = nieuw;
      }
    }
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
// AANTAL KINDEREN VOOR BESTELLING + AUTO BEREKENING "Materiaal kids"
// ==============================================

// Een categorie geldt als 'Materiaal kids' als de naam (case-insensitief, zonder spaties) overeenkomt.
function isMateriaalKids(cat) {
  if (!cat || !cat.naam) return false;
  return cat.naam.trim().toLowerCase() === 'materiaal kids';
}

// Berekent het auto-suggestie aantal voor een product: kinderen − stock L1 − stock L2 (nooit negatief)
function autoBestelAantal(p) {
  const kinderen = parseInt(teamData.bestelKinderen) || 0;
  const l1 = parseInt(p.l1) || 0;
  const l2 = parseInt(p.l2) || 0;
  const tekort = kinderen - l1 - l2;
  return tekort > 0 ? tekort : 0;
}

// Schrijft auto-bestel terug in alle "Materiaal kids" producten die NOG NIET handmatig zijn aangepast,
// werkt enkel het bestel-veld in de DOM bij (geen volledige re-render → focus blijft staan).
function autoBestelToepassen() {
  if (!teamData) return;
  teamData.stockCats.forEach(cat => {
    if (!isMateriaalKids(cat)) return;
    cat.producten.forEach(p => {
      if (p.bestelManueel) return; // niet overschrijven als gebruiker zelf gewijzigd heeft
      const nieuw = autoBestelAantal(p);
      if (p.bestel !== nieuw) {
        p.bestel = nieuw;
        // DOM-veld bijwerken (zonder focus te stelen)
        const inp = document.querySelector(`input.stock-input-num.te-bestellen[data-product-id="${p.id}"]`);
        if (inp && document.activeElement !== inp) {
          inp.value = nieuw;
        }
      }
    });
  });
  stockStatsBijwerken();
  stockCatKnopBadgesBijwerken();
}

// Wordt aangeroepen wanneer leerkracht het aantal kinderen bovenaan wijzigt
window.bestelKinderenZetten = function (waarde) {
  if (!teamData) return;
  teamData.bestelKinderen = parseInt(waarde) || 0;
  autoBestelToepassen();
  planBewaren();
};

// "↻ Auto opnieuw" knop: zet bestelManueel terug op false voor alle Materiaal kids producten,
// zodat de auto-berekening alle vakjes weer overschrijft. Vraagt om bevestiging.
window.autoBestelHerstellen = function () {
  if (!teamData) return;
  if (!confirm('Wil je alle bestel-aantallen in "Materiaal kids" terugzetten naar de automatische berekening (kinderen − stock)?\n\nJe handmatige aanpassingen voor deze categorie gaan dan verloren.')) return;
  teamData.stockCats.forEach(cat => {
    if (!isMateriaalKids(cat)) return;
    cat.producten.forEach(p => { p.bestelManueel = false; });
  });
  autoBestelToepassen();
  // Volledige hertekening zodat de bestel-vakjes allemaal de nieuwe waarde tonen
  stockTonen();
  planBewaren();
};

// Per-product terug naar auto schakelen (klik op het ✏️ icoon)
window.stockBestelTerugNaarAuto = function (catId, productId) {
  const cat = teamData.stockCats.find(c => c.id === catId);
  if (!cat) return;
  const p = cat.producten.find(x => x.id === productId);
  if (!p) return;
  p.bestelManueel = false;
  p.bestel = autoBestelAantal(p);
  planBewaren();
  stockCatInhoudTonen(); // hertekenen om icoon én cijfer mee te updaten
  stockStatsBijwerken();
  stockCatKnopBadgesBijwerken();
};

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
  // Gegevens van het ACTIEVE leerjaar (L1 of L2) - elke leerkracht krijgt zo zijn/haar eigen PDF
  const ljData = teamData.instellingen[huidigLeerjaar] || {};

  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('Werkboeken – ' + leerjaar, 14, 18);

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  const regel2 = `${ljData.naam || ''}${ljData.klasNr ? ' · klas ' + ljData.klasNr : ''}${sj ? ' · ' + sj : ''}`;
  doc.text(regel2, 14, 25);
  doc.text(`${ljData.kinderen || 0} kinderen + ${ljData.reserve || 0} reserve = ${totaalNodig()} per werkboek nodig`, 14, 30);

  let y = 38;

  methodes.forEach(m => {
    if (y > 230) { doc.addPage(); y = 20; }

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`${m.naam}${m.uitgever ? ' — ' + m.uitgever : ''}`, 14, y);
    y += 4;

    const body = m.delen.map(d => {
      const nodig = totaalNodig();
      const tekort = Math.max(0, nodig - (d.stock || 0));
      return [
        d.naam,
        String(d.stock || 0),
        String(nodig),
        tekort > 0 ? '+' + tekort : 'OK'
      ];
    });

    doc.autoTable({
      startY: y,
      head: [['Deel (per kind)', 'In stock', 'Nodig', 'Bijbestellen']],
      body,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [138, 122, 109], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { halign: 'center', cellWidth: 30 },
        2: { halign: 'center', cellWidth: 30, fontStyle: 'bold' },
        3: { halign: 'center', cellWidth: 40, fillColor: [245, 220, 220] }
      },
      margin: { left: 14, right: 14 }
    });
    y = doc.lastAutoTable.finalY + 4;

    // Voor de leerkracht (indien aanwezig)
    const lkMat = m.leerkrachtMateriaal || [];
    if (lkMat.length > 0) {
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFontSize(10);
      doc.setFont(undefined, 'italic');
      doc.text('Voor de leerkracht', 14, y);
      y += 2;

      const lkBody = lkMat.map(item => {
        const aantal = item.aantal || 1;
        const tekort = Math.max(0, aantal - (item.stock || 0));
        return [
          item.naam,
          String(item.stock || 0),
          String(aantal),
          tekort > 0 ? '+' + tekort : 'OK'
        ];
      });

      doc.autoTable({
        startY: y,
        head: [['Item', 'In stock', 'Nodig', 'Bijbestellen']],
        body: lkBody,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2.5 },
        headStyles: { fillColor: [180, 170, 155], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { halign: 'center', cellWidth: 30 },
          2: { halign: 'center', cellWidth: 30, fontStyle: 'bold' },
          3: { halign: 'center', cellWidth: 40, fillColor: [245, 230, 215] }
        },
        margin: { left: 14, right: 14 }
      });
      y = doc.lastAutoTable.finalY + 14;
    } else {
      y += 12;
    }
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
  const teamRegel = teamHeaderTekst();
  const regel2 = teamRegel + (teamRegel && sj ? ' · ' : '') + (sj || '');
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
  const teamRegel = teamHeaderTekst();
  const regel2 = teamRegel + (teamRegel && sj ? ' · ' : '') + (sj || '');
  doc.text(regel2, 14, 25);

  let y = 33;

  teamData.stockCats.forEach(cat => {
    if (cat.producten.length === 0) return;
    if (y > 240) { doc.addPage(); y = 20; }

    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    // Geen emoji in PDF - standaard font ondersteunt geen emoji's
    doc.text(cat.naam, 14, y);
    y += 4;

    const body = cat.producten.map(p => {
      const totaal = (parseInt(p.l1) || 0) + (parseInt(p.l2) || 0);
      // Voor 'Ander' tonen we de zelf ingetypte naam (bv. "HEMA"), zo niet de standaard winkel
      let winkelTekst = '—';
      if (p.winkel === 'Ander') {
        const eigen = (p.winkelAnder || '').trim();
        winkelTekst = eigen ? eigen : 'Ander';
      } else if (p.winkel) {
        winkelTekst = p.winkel;
      }
      return [
        p.naam,
        String(p.l1 || 0),
        String(p.l2 || 0),
        String(totaal),
        String(p.bestel || 0),
        winkelTekst
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

  // Groepeer producten met "te bestellen > 0" per winkel.
  // Voor winkel === 'Ander' gebruiken we de zelf ingetypte naam (winkelAnder) zodat
  // bv. alle HEMA-items en alle Schleiper-items elk een eigen sectie krijgen.
  const perWinkel = {};
  teamData.stockCats.forEach(cat => {
    cat.producten.forEach(p => {
      const bestel = parseInt(p.bestel) || 0;
      if (bestel === 0) return;
      let winkel;
      if (p.winkel === 'Ander') {
        const eigen = (p.winkelAnder || '').trim();
        winkel = eigen ? eigen : 'Ander (geen naam ingevuld)';
      } else if (!p.winkel) {
        winkel = 'Geen winkel gekozen';
      } else {
        winkel = p.winkel;
      }
      if (!perWinkel[winkel]) perWinkel[winkel] = [];
      perWinkel[winkel].push({ categorie: cat.naam, naam: p.naam, aantal: bestel });
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
  const teamRegel = teamHeaderTekst();
  const regel2 = teamRegel + (teamRegel && sj ? ' · ' : '') + (sj || '');
  doc.text(regel2, 14, 25);

  // Volgorde: Lyreco, Action, dan alle eigen Ander-winkels (alfabetisch),
  // dan "Ander (zonder naam)" en "Geen winkel" als laatste.
  const vasteVolgorde = ['Lyreco', 'Action'];
  const eindVolgorde = ['Ander (geen naam ingevuld)', 'Geen winkel gekozen'];
  const eigenWinkels = Object.keys(perWinkel)
    .filter(w => !vasteVolgorde.includes(w) && !eindVolgorde.includes(w))
    .sort((a, b) => a.localeCompare(b, 'nl'));
  const volgorde = [...vasteVolgorde, ...eigenWinkels, ...eindVolgorde];

  // Vaste kleuren voor bekende winkels; eigen winkels krijgen een neutrale paarsblauwe tint
  const kleuren = {
    'Lyreco': [164, 207, 152],
    'Action': [244, 172, 114],
    'Ander (geen naam ingevuld)': [190, 190, 190],
    'Geen winkel gekozen': [220, 220, 220]
  };
  const eigenKleur = [197, 184, 222]; // zacht paars voor zelf toegevoegde winkels

  let eersteWinkel = true;
  let y = 33;

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
    // Geen emoji - standaard PDF font ondersteunt die niet
    doc.text(winkel, 14, y);

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`${items.length} producten`, 14, y + 6);
    y += 12;

    const body = items.map(it => [it.categorie, it.naam, String(it.aantal)]);
    const headKleur = kleuren[winkel] || eigenKleur;

    doc.autoTable({
      startY: y,
      head: [['Categorie', 'Product', 'Aantal']],
      body,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: headKleur, textColor: 40, fontStyle: 'bold' },
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
  const regel2 = teamHeaderTekst();
  doc.text(regel2, 14, 25);

  let y = 33;

  // Lijst per knutsel
  // Geen emoji's in PDF - standaard PDF font ondersteunt die niet
  const feestNaam = { moederdag: 'Moederdag', vaderdag: 'Vaderdag', pasen: 'Pasen', sint: 'Sinterklaas', kerst: 'Kerst', ander: 'Ander' };

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
  doc.text('Alle materialen samen', 14, y);
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

// ==============================================
// NIEUW SCHOOLJAAR + ARCHIEF
// ==============================================

// Max 3 schooljaren in archief bewaren (FIFO: oudste verdwijnt)
const MAX_ARCHIEF = 3;

window.nieuwSchooljaar = function () {
  const huidigJaar = teamData.instellingen.schooljaar || '';
  const lyrecoAantal = teamData.lyreco.length;
  const actionAantal = teamData.actions.length;

  // Bereken totalen voor de dialoog
  let lyrecoTotaal = 0;
  teamData.lyreco.forEach(l => {
    lyrecoTotaal += (l.prijs || 0) * (l.bestel || 0) * (1 + (l.btw || 0) / 100);
  });
  let actionTotaal = 0;
  teamData.actions.forEach(a => { actionTotaal += (a.prijs || 0); });

  // Bereken wat er uit archief verdwijnt als we 3 al hebben
  const archief = teamData.archief || [];
  let verdwijntBericht = '';
  if (archief.length >= MAX_ARCHIEF) {
    const oudste = archief[0]; // eerste element = oudste
    verdwijntBericht = `\n\n⚠️ LET OP: schooljaar "${oudste.schooljaar}" wordt uit archief verwijderd (maximaal ${MAX_ARCHIEF} jaren bewaren).\n   → Maak eerst een back-up in Instellingen als je deze data wil bewaren!`;
  }

  const bericht = `🔄 Nieuw schooljaar starten\n\n` +
    `Huidig schooljaar: ${huidigJaar || '(niet ingesteld)'}\n\n` +
    `Wat gebeurt er?\n\n` +
    `📦 Lyreco (${lyrecoAantal} artikels, €${lyrecoTotaal.toFixed(2)}) → naar archief\n` +
    `🛍️ Action (${actionAantal} aankopen, €${actionTotaal.toFixed(2)}) → naar archief\n` +
    `💰 Budget → terug op 0\n` +
    `📦 Stock klasmateriaal → alles op 0\n` +
    `📚 Werkboeken → BLIJVEN zoals ze zijn\n` +
    `   (elke leerkracht reset zelf via "Stock van dit leerjaar op 0")\n` +
    `✂️ Knutselideetjes → blijven (filter per jaar werkt)` +
    verdwijntBericht +
    `\n\nDoorgaan?`;

  if (!confirm(bericht)) return;

  // Vraag nieuw schooljaar
  const nieuwJaar = prompt('Wat is het nieuwe schooljaar?', vorigschooljaarPlusEen(huidigJaar));
  if (nieuwJaar === null || !nieuwJaar.trim()) {
    alert('Geannuleerd. Er is niets gewijzigd.');
    return;
  }

  // 1. Archiveer huidige Lyreco en Action
  if (lyrecoAantal > 0 || actionAantal > 0) {
    archief.push({
      schooljaar: huidigJaar || 'onbekend',
      gearchiveerd_op: new Date().toISOString(),
      lyreco: JSON.parse(JSON.stringify(teamData.lyreco)),
      actions: JSON.parse(JSON.stringify(teamData.actions)),
      lyreco_totaal_incl: lyrecoTotaal,
      action_totaal: actionTotaal
    });
  }

  // 2. Houd alleen de laatste MAX_ARCHIEF bij (FIFO)
  while (archief.length > MAX_ARCHIEF) {
    archief.shift();
  }
  teamData.archief = archief;

  // 3. Reset huidige data
  teamData.lyreco = [];
  teamData.actions = [];
  teamData.budget = 0;

  // BELANGRIJK: werkboeken-stock wordt NIET meer automatisch gereset.
  // Elke leerkracht moet dit zelf doen via "Stock van dit leerjaar op 0" knop,
  // zodat de collega's stock niet per ongeluk wordt gewist.

  // Stock klasmateriaal: alle L1/L2/bestel op 0
  (teamData.stockCats || []).forEach(cat => {
    (cat.producten || []).forEach(p => {
      p.l1 = 0;
      p.l2 = 0;
      p.bestel = 0;
    });
  });

  // 4. Schooljaar updaten
  teamData.instellingen.schooljaar = nieuwJaar.trim();

  bewaarNu();
  allesRenderen();
  alert(`✅ Nieuw schooljaar "${nieuwJaar.trim()}" gestart!\n\n` +
    `📦 Lyreco en Action zijn gearchiveerd.\n` +
    `📦 Stock klasmateriaal staat op 0.\n` +
    `💰 Budget staat op 0.\n\n` +
    `📚 De werkboeken-stock is NIET gereset.\n` +
    `   Jij en je collega kunnen elk apart de stock van jullie leerjaar\n` +
    `   resetten via de knop "Stock van dit leerjaar op 0" in de werkboeken-tab.`);
};

// Helper: probeer volgend schooljaar te berekenen (bv. "2026-2027" → "2027-2028")
function vorigschooljaarPlusEen(jaar) {
  if (!jaar) return '';
  const match = jaar.match(/^(\d{4})-(\d{4})$/);
  if (match) {
    const j1 = parseInt(match[1]) + 1;
    const j2 = parseInt(match[2]) + 1;
    return j1 + '-' + j2;
  }
  return jaar;
}

// ==============================================
// STOCK KLASMATERIAAL: reset-knop
// ==============================================
window.stockResetten = function () {
  if (!confirm('Alle tellingen van stock klasmateriaal (L1, L2 en te bestellen) worden op 0 gezet.\n\nDe productlijst en categorieën blijven bewaard.\n\nDoorgaan?')) return;

  (teamData.stockCats || []).forEach(cat => {
    (cat.producten || []).forEach(p => {
      p.l1 = 0;
      p.l2 = 0;
      p.bestel = 0;
      p.bestelManueel = false;
    });
  });
  // Auto-bestel meteen opnieuw toepassen voor Materiaal kids (alle bestel-vakjes worden = aantal kinderen)
  autoBestelToepassenStil();
  planBewaren();
  stockTonen();
  alert('✅ Alle stock-tellingen zijn op 0 gezet.');
};

// ==============================================
// WERKBOEKEN: reset stock knop (los van nieuw schooljaar)
// ==============================================
window.werkboekenResetten = function () {
  const lj = huidigLeerjaar === 'L1' ? 'Leerjaar 1' : 'Leerjaar 2';
  const anderLj = huidigLeerjaar === 'L1' ? 'Leerjaar 2' : 'Leerjaar 1';
  const aantalMethodes = (teamData.werkboeken[huidigLeerjaar] || []).length;

  const bericht = `🔄 Stock resetten voor ${lj}\n\n` +
    `✓ Alle stock-cijfers van ${lj} → terug op 0\n` +
    `✓ ${aantalMethodes} methode(s) en alle delen → blijven behouden\n` +
    `✓ ${anderLj} → wordt NIET aangeraakt\n\n` +
    `Doorgaan?`;

  if (!confirm(bericht)) return;

  (teamData.werkboeken[huidigLeerjaar] || []).forEach(m => {
    m.delen.forEach(d => { d.stock = 0; });
    (m.leerkrachtMateriaal || []).forEach(item => { item.stock = 0; });
  });
  planBewaren();
  werkboekenTonen();
  alert(`✅ Stock van ${lj} is op 0 gezet.\n\nDe werkboeken-lijst bleef ongewijzigd.`);
};

// ==============================================
// ARCHIEF BEKIJKEN
// ==============================================
window.archiefBekijken = function (index) {
  const item = (teamData.archief || [])[index];
  if (!item) return;

  // Open een dialoog (of scroll naar een div) met de archief-data
  document.getElementById('archief-detail-schooljaar').textContent = item.schooljaar;
  const lyDiv = document.getElementById('archief-detail-lyreco');
  const acDiv = document.getElementById('archief-detail-action');

  // Lyreco tabel
  if (item.lyreco && item.lyreco.length > 0) {
    let html = '<h4 style="margin-bottom:10px;">🖍️ Lyreco-bestelling (' + item.lyreco.length + ' artikels)</h4>';
    html += '<table class="vol"><thead><tr><th>Artikel</th><th>Bestelnr</th><th class="getal">Aantal</th><th class="getal">Prijs/st</th><th class="getal">BTW</th><th class="getal">Totaal incl.</th></tr></thead><tbody>';
    let tot = 0;
    item.lyreco.forEach(ly => {
      const incl = (ly.prijs || 0) * (ly.bestel || 0) * (1 + (ly.btw || 0) / 100);
      tot += incl;
      html += `<tr><td>${escape(ly.artikel || '')}</td><td>${escape(ly.nr || '')}</td><td class="getal">${ly.bestel || 0}</td><td class="getal">€ ${(ly.prijs || 0).toFixed(2)}</td><td class="getal">${ly.btw || 0}%</td><td class="getal">€ ${incl.toFixed(2)}</td></tr>`;
    });
    html += `<tr style="background:var(--creme-warm);font-weight:800;"><td colspan="5">TOTAAL</td><td class="getal">€ ${tot.toFixed(2)}</td></tr>`;
    html += '</tbody></table>';
    html += `<div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;">
      <button class="knop klein blauw" onclick="archiefKopieerLyreco(${index})">📋 Kopieer deze Lyreco-bestelling naar huidig jaar</button>
    </div>`;
    lyDiv.innerHTML = html;
  } else {
    lyDiv.innerHTML = '<p style="color:var(--grijs);font-style:italic;">Geen Lyreco-bestelling in dit schooljaar.</p>';
  }

  // Action tabel
  if (item.actions && item.actions.length > 0) {
    let html = '<h4 style="margin-top:20px; margin-bottom:10px;">🛍️ Action &amp; andere aankopen (' + item.actions.length + ')</h4>';
    html += '<table class="vol"><thead><tr><th>Datum</th><th>Wat</th><th>Winkel</th><th class="getal">Bedrag</th></tr></thead><tbody>';
    let tot = 0;
    item.actions.forEach(a => {
      tot += (a.prijs || 0);
      html += `<tr><td>${escape(a.datum || '')}</td><td>${escape(a.naam || '')}</td><td>${escape(a.winkel || '')}</td><td class="getal">€ ${(a.prijs || 0).toFixed(2)}</td></tr>`;
    });
    html += `<tr style="background:var(--creme-warm);font-weight:800;"><td colspan="3">TOTAAL</td><td class="getal">€ ${tot.toFixed(2)}</td></tr>`;
    html += '</tbody></table>';
    acDiv.innerHTML = html;
  } else {
    acDiv.innerHTML = '<p style="color:var(--grijs);font-style:italic;">Geen Action-aankopen in dit schooljaar.</p>';
  }

  document.getElementById('archief-detail').style.display = 'block';
  // Scroll naar detail
  document.getElementById('archief-detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.archiefVerbergen = function () {
  document.getElementById('archief-detail').style.display = 'none';
};

window.archiefKopieerLyreco = function (index) {
  const item = (teamData.archief || [])[index];
  if (!item || !item.lyreco || item.lyreco.length === 0) return;
  if (!confirm(`${item.lyreco.length} artikels uit schooljaar ${item.schooljaar} toevoegen aan huidige Lyreco-bestelling?\n\nLet op: de huidige Lyreco-lijst wordt NIET leeggemaakt. De gekopieerde artikels worden eraan toegevoegd.`)) return;

  item.lyreco.forEach(ly => {
    teamData.lyreco.push({
      id: maakId(),
      artikel: ly.artikel || '',
      nr: ly.nr || '',
      prijs: ly.prijs || 0,
      btw: ly.btw || 21,
      bestel: ly.bestel || 0,
      stock: 0, // reset stock (is tenslotte nieuwe bestelling)
      min: ly.min || 0
    });
  });

  planBewaren();
  lyrecoTonen();
  alert(`✅ ${item.lyreco.length} artikels toegevoegd aan Lyreco-bestelling.\n\nJe vindt ze nu onder de Lyreco-tab.`);
  // Schakel naar Lyreco-tab
  const lyrecoTab = document.querySelector('.tab[data-tab="lyreco"]');
  if (lyrecoTab) lyrecoTab.click();
};

function archiefTonen() {
  if (!teamData) return;
  const container = document.getElementById('archief-lijst');
  if (!container) return;

  const archief = teamData.archief || [];

  if (archief.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:40px 20px;color:var(--grijs);font-style:italic;">
        <div style="font-size:3em;margin-bottom:14px;opacity:0.4;">📁</div>
        Nog geen gearchiveerde schooljaren. Zodra je een "Nieuw schooljaar" start via Instellingen, komen de oude Lyreco en Action-gegevens hier terecht (max ${MAX_ARCHIEF} schooljaren).
      </div>
    `;
    return;
  }

  // Toon nieuwste bovenaan (reverse)
  const lijst = [...archief].map((item, origIdx) => ({ ...item, origIdx })).reverse();

  container.innerHTML = lijst.map(item => {
    const ly = item.lyreco || [];
    const ac = item.actions || [];
    const datum = item.gearchiveerd_op ? new Date(item.gearchiveerd_op).toLocaleDateString('nl-BE') : '';
    return `
      <div style="background:var(--creme-warm); border:1.5px solid var(--rand-donker); border-radius:12px; padding:16px 20px; margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;">
          <div>
            <h3 style="margin:0;font-size:1.15em;">📅 Schooljaar ${escape(item.schooljaar || 'onbekend')}</h3>
            <div style="font-size:0.85em;color:var(--tekst-zacht);margin-top:4px;">
              🖍️ ${ly.length} Lyreco-artikels · 🛍️ ${ac.length} Action-aankopen
              ${datum ? ' · gearchiveerd op ' + datum : ''}
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="knop klein" onclick="archiefBekijken(${item.origIdx})">👁️ Bekijken</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}