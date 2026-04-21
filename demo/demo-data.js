// ==============================================
// DEMO DATA - BS DE LINDE (verzonnen)
// ==============================================

const KLASSEN = [
  { id: 'K',   leerjaar: 'Kleuters',     klas: 'K1',  leerkracht: 'Griet Peeters'     },
  { id: '1A',  leerjaar: 'Leerjaar 1',   klas: '1A',  leerkracht: 'Hanne De Keersmaecker' },
  { id: '1B',  leerjaar: 'Leerjaar 1',   klas: '1B',  leerkracht: 'Katrien Wauters'   },
  { id: '2A',  leerjaar: 'Leerjaar 2',   klas: '2A',  leerkracht: 'Isabel Rockelé'    },
  { id: '2B',  leerjaar: 'Leerjaar 2',   klas: '2B',  leerkracht: 'Sofie Janssens'    },
  { id: '3A',  leerjaar: 'Leerjaar 3',   klas: '3A',  leerkracht: 'Marleen Vermeulen' },
  { id: '3B',  leerjaar: 'Leerjaar 3',   klas: '3B',  leerkracht: 'Annelies Torfs'    },
  { id: '4A',  leerjaar: 'Leerjaar 4',   klas: '4A',  leerkracht: 'Veerle Claes'      },
  { id: '4B',  leerjaar: 'Leerjaar 4',   klas: '4B',  leerkracht: 'Els Bogaerts'      },
  { id: '5A',  leerjaar: 'Leerjaar 5',   klas: '5A',  leerkracht: 'Dirk Maes'         },
  { id: '5B',  leerjaar: 'Leerjaar 5',   klas: '5B',  leerkracht: 'Lieve Hermans'     },
  { id: '6A',  leerjaar: 'Leerjaar 6',   klas: '6A',  leerkracht: 'Pieter Vermeiren'  }
];

// Verzonnen Vlaamse voor- en achternamen
const VOORNAMEN_JONGENS = ['Lars', 'Noah', 'Finn', 'Milan', 'Lucas', 'Robbe', 'Vince', 'Arne', 'Stan', 'Tuur', 'Jules', 'Mats'];
const VOORNAMEN_MEISJES = ['Lotte', 'Nore', 'Emma', 'Lina', 'Fien', 'Hanne', 'Zoë', 'Luna', 'Jade', 'Lien', 'Nina', 'Eva'];
const ACHTERNAMEN = ['Peeters', 'Janssens', 'Maes', 'Willems', 'Claes', 'Wouters', 'De Smet', 'Hermans', 'Mertens', 'Goossens',
                     'Van Damme', 'Bogaerts', 'De Clerck', 'Lemmens', 'Verhoeven', 'Aerts', 'Vermeiren', 'Dewinter', 'Torfs', 'Van Loo'];

function maakLeerlingen(klasId, aantal) {
  const leerlingen = [];
  // Gebruik klasId als "seed" voor consistente fictieve data
  const seed = klasId.charCodeAt(0) + (klasId.charCodeAt(1) || 0);
  for (let i = 0; i < aantal; i++) {
    const isJongen = (seed + i) % 2 === 0;
    const voornaam = isJongen
      ? VOORNAMEN_JONGENS[(seed + i * 3) % VOORNAMEN_JONGENS.length]
      : VOORNAMEN_MEISJES[(seed + i * 3) % VOORNAMEN_MEISJES.length];
    const achternaam = ACHTERNAMEN[(seed + i * 7) % ACHTERNAMEN.length];
    leerlingen.push({
      id: klasId + '-l' + i,
      voornaam: voornaam,
      achternaam: achternaam,
      startdatum: '2026-09-01',   // standaard = begin schooljaar
      einddatum: null,             // null = nog steeds op school
      personeelskind: false        // standaard false
    });
  }
  // Maak 1 kind in sommige klassen een personeelskind (voor demo)
  if (leerlingen.length > 2 && (seed % 3 === 0)) {
    leerlingen[1].personeelskind = true;
  }
  // Maak 1 kind met latere startdatum in sommige klassen (nieuwkomer)
  if (klasId === '2A' && leerlingen.length > 5) {
    leerlingen[4].startdatum = '2026-10-15';
  }
  // Sorteer alfabetisch op achternaam (dan voornaam)
  leerlingen.sort((a, b) => {
    if (a.achternaam !== b.achternaam) return a.achternaam.localeCompare(b.achternaam);
    return a.voornaam.localeCompare(b.voornaam);
  });
  // Update naam-veld voor weergave
  leerlingen.forEach(l => { l.naam = l.achternaam + ' ' + l.voornaam; });
  return leerlingen;
}

// Elke klas krijgt een realistisch aantal leerlingen (18-24)
KLASSEN.forEach(k => {
  const seed = k.id.charCodeAt(0);
  const aantal = 18 + (seed % 7);
  k.leerlingen = maakLeerlingen(k.id, aantal);
});

// ==============================================
// DEMO-STATE (bewaard in localStorage)
// ==============================================

const STORAGE_KEY = 'bsdelinde_demo_v1';

function getState() {
  const opgeslagen = localStorage.getItem(STORAGE_KEY);
  if (opgeslagen) {
    try {
      return JSON.parse(opgeslagen);
    } catch (e) {
      console.warn('Kon opgeslagen demo-data niet lezen, nieuwe state gebruiken.');
    }
  }
  return maakStartState();
}

function bewaarState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function maakStartState() {
  // Basisstructuur: per klas houden we status bij van elke module
  const state = {
    huidigeRol: 'leerkracht',
    huidigeKlasId: '2A', // Begin bij Isabel's klas als default
    klassen: {},
    deadlines: {
      refter: { dag: 'woensdag', uur: 12, herinnering_dagen_voor: 1 },
      werkboeken: { datum: '2026-06-01', herinnering_dagen_voor: 5 },
      uitstappen: { herinnering_dagen_voor: 3 }
    },
    // Refterlijsten per klas: key = 'klasId|YYYY-MM', value = { 'leerlingId|YYYY-MM-DD': status }
    // status: 'aan' (at mee) | 'uit' (afwezig) | 'leeg' (nog niet ingevuld)
    refter_invullingen: {},
    // Extra vrije dagen (bovenop Vlaamse vakanties) - ingesteld door secretariaat
    schooleigen_vrije_dagen: [
      // Voorbeeld: { datum: '2026-11-20', titel: 'Pedagogische studiedag' }
    ],
    // Uitstappen per klas
    uitstappen: {},
    // Werkboeken-klaar status per klas
    werkboeken_klaar: {},
    // Secretariaat afvink-status per werkboek
    werkboeken_besteld: {},
    // Weken die secretariaat geblokkeerd heeft (refter): key = 'klasId|YYYY-MM'
    // Blokkering refter per klas: key = klasId, value = laatste datum YYYY-MM-DD die nog geblokkeerd is
    // Leerkracht kan datums TOT EN MET deze datum niet meer wijzigen, secretariaat wel.
    refter_geblokkeerd_tot: {}
  };

  // Voor elke klas basisgegevens
  KLASSEN.forEach(k => {
    state.klassen[k.id] = {
      werkboeken: maakVoorbeeldWerkboeken(k.leerjaar),
      // Leerlingen worden beheerd via state (niet meer via KLASSEN constant)
      leerlingen: JSON.parse(JSON.stringify(k.leerlingen))
    };
  });

  // Voeg voorbeeld-uitstappen toe (realistisch verspreid over schooljaar voor rapport-testen)
  // 2A = lagere school, max €105 - meerdere uitstappen elk rapport
  state.uitstappen['2A'] = [
    // September
    { id: 'u1-1', titel: 'Digitale ondersteuning', datum: '2026-09-02', prijs: 5.00, type: 'activiteit', deelnemers: {} },
    { id: 'u1-b1', titel: 'Turn-t-shirt', datum: '2026-09-15', prijs: 8.50, type: 'bestelling', deelnemers: {} },
    // Rapport 1 (sept-dec)
    { id: 'u1-2', titel: 'Film in CC Ter Dilft', datum: '2026-10-10', prijs: 4.00, type: 'activiteit', deelnemers: {} },
    { id: 'u1-3', titel: 'Zwemmen', datum: '2026-11-06', prijs: 3.50, type: 'activiteit', deelnemers: {} },
    { id: 'u1-b2', titel: 'Badmuts', datum: '2026-11-06', prijs: 4.00, type: 'bestelling', deelnemers: {} },
    { id: 'u1-4', titel: 'Bezoek Technopolis', datum: '2026-11-13', prijs: 12.50, type: 'activiteit', deelnemers: {} },
    { id: 'u1-5', titel: 'Museum Plantin-Moretus', datum: '2026-11-27', prijs: 8.00, type: 'activiteit', deelnemers: {} },
    { id: 'u1-6', titel: 'Toneel Sinterklaas', datum: '2026-12-03', prijs: 6.50, type: 'activiteit', deelnemers: {} },
    // Rapport 2 (jan-maart)
    { id: 'u1-7', titel: 'Luikse wafel carnaval', datum: '2027-02-12', prijs: 3.00, type: 'activiteit', deelnemers: {} },
    { id: 'u1-8', titel: 'Zwemmen', datum: '2027-03-05', prijs: 3.50, type: 'activiteit', deelnemers: {} },
    // Rapport 3 (april-juni)
    { id: 'u1-9', titel: 'Creadag Pasen', datum: '2027-04-16', prijs: 1.00, type: 'activiteit', deelnemers: {} },
    { id: 'u1-10', titel: 'Haar en Snaar', datum: '2027-05-14', prijs: 7.00, type: 'activiteit', deelnemers: {} },
    { id: 'u1-11', titel: 'Sportdag: Captain Sport', datum: '2027-05-26', prijs: 12.00, type: 'activiteit', deelnemers: {} },
    { id: 'u1-12', titel: 'Schoolreis Harry Malter + bus', datum: '2027-06-19', prijs: 32.00, type: 'activiteit', deelnemers: {} },
    { id: 'u1-13', titel: 'Festival De Linde', datum: '2027-06-23', prijs: 4.60, type: 'activiteit', deelnemers: {} },
    { id: 'u1-14', titel: 'IJsje einde schooljaar', datum: '2027-06-27', prijs: 1.90, type: 'activiteit', deelnemers: {} }
  ];
  state.uitstappen['3A'] = [
    { id: 'u3a', titel: 'Zwemmen', datum: '2026-11-06', prijs: 3.50, deelnemers: {} },
    { id: 'u2', titel: 'Bosklassen', datum: '2027-04-20', prijs: 85.00, deelnemers: {} }
  ];
  state.uitstappen['1A'] = [
    { id: 'u1aa', titel: 'Bezoek bibliotheek', datum: '2026-11-12', prijs: 0, deelnemers: {} }
  ];
  // Kleuters (K) - minder en goedkoper, max €55
  state.uitstappen['K'] = [
    { id: 'uk1', titel: 'Theater in de klas', datum: '2026-10-15', prijs: 3.00, deelnemers: {} },
    { id: 'uk2', titel: 'Sinterklaas geschenk', datum: '2026-12-05', prijs: 2.50, deelnemers: {} },
    { id: 'uk3', titel: 'Zwemmen', datum: '2027-03-10', prijs: 3.50, deelnemers: {} },
    { id: 'uk4', titel: 'Schoolreis dierenpark', datum: '2027-05-20', prijs: 18.00, deelnemers: {} }
  ];

  // Voeg één demo-vrije dag toe zodat men kan zien hoe het eruitziet
  state.schooleigen_vrije_dagen.push({
    datum: '2026-11-20',
    titel: 'Pedagogische studiedag'
  });

  return state;
}

// ==============================================
// VLAAMSE SCHOOLVAKANTIES & FEESTDAGEN
// ==============================================
// Officiële data voor schooljaar 2026-2027 (vaste algemene regel)
// Datums inclusief beide einddata

const VAKANTIES_2026_2027 = [
  { start: '2026-10-26', eind: '2026-11-01', titel: 'Herfstvakantie' },
  { start: '2026-12-21', eind: '2027-01-03', titel: 'Kerstvakantie' },
  { start: '2027-02-15', eind: '2027-02-21', titel: 'Krokusvakantie' },
  { start: '2027-03-29', eind: '2027-04-11', titel: 'Paasvakantie' },
  { start: '2027-07-01', eind: '2027-08-31', titel: 'Zomervakantie' }
];

const WETTELIJKE_FEESTDAGEN_2026_2027 = [
  { datum: '2026-11-11', titel: 'Wapenstilstand' }, // tijdens schooljaar
  { datum: '2027-05-01', titel: 'Feest van de Arbeid' }, // zaterdag, dus geen effect
  { datum: '2027-05-06', titel: 'O.L.H. Hemelvaart' }, // donderdag
  { datum: '2027-05-17', titel: 'Pinkstermaandag' } // maandag
];

// Helper: is deze datum een vakantie?
function isVakantie(datumISO) {
  for (const v of VAKANTIES_2026_2027) {
    if (datumISO >= v.start && datumISO <= v.eind) {
      return v.titel;
    }
  }
  return null;
}

// Helper: is deze datum een wettelijke feestdag?
function isWettelijkeFeestdag(datumISO) {
  const f = WETTELIJKE_FEESTDAGEN_2026_2027.find(x => x.datum === datumISO);
  return f ? f.titel : null;
}

// Helper: is deze datum een school-eigen vrije dag?
function isSchoolVrijeDag(datumISO) {
  const vrij = (state.schooleigen_vrije_dagen || []).find(x => x.datum === datumISO);
  return vrij ? vrij.titel : null;
}

// Helper: dagsoort (voor cel-kleuring)
// Returns: 'weekend' | 'woensdag' | 'vakantie' | 'feestdag' | 'schoolvrij' | 'schooldag'
function dagSoort(datumISO) {
  const d = new Date(datumISO + 'T00:00:00');
  const wd = d.getDay(); // 0 = zondag, 6 = zaterdag
  if (wd === 0 || wd === 6) return 'weekend';
  if (wd === 3) return 'woensdag';
  if (isVakantie(datumISO)) return 'vakantie';
  if (isWettelijkeFeestdag(datumISO)) return 'feestdag';
  if (isSchoolVrijeDag(datumISO)) return 'schoolvrij';
  return 'schooldag';
}

// Helper: alle dagen van een maand (YYYY-MM) → lijst van YYYY-MM-DD
function dagenVanMaand(jaarMaand) {
  const [jaar, maand] = jaarMaand.split('-').map(Number);
  const aantalDagen = new Date(jaar, maand, 0).getDate();
  const dagen = [];
  for (let d = 1; d <= aantalDagen; d++) {
    const dd = String(d).padStart(2, '0');
    const mm = String(maand).padStart(2, '0');
    dagen.push(`${jaar}-${mm}-${dd}`);
  }
  return dagen;
}

// Helper: Nederlandse weekdag-afkorting
function weekdagKort(datumISO) {
  const d = new Date(datumISO + 'T00:00:00');
  return ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'][d.getDay()];
}

function maakVoorbeeldWerkboeken(leerjaar) {
  // Elke klas begint met wat werkboeken voorgevuld (realistisch maar fictief)
  if (leerjaar === 'Kleuters') {
    return [
      { id: 'w1', methode: 'Kleuterstappen', deel: 'Werkblad A', aantal: 22 },
      { id: 'w2', methode: 'Kleuterstappen', deel: 'Werkblad B', aantal: 22 }
    ];
  }
  if (leerjaar === 'Leerjaar 1' || leerjaar === 'Leerjaar 2') {
    return [
      { id: 'w1', methode: 'Karakter', deel: 'Werkschrift a', aantal: 24 },
      { id: 'w2', methode: 'Karakter', deel: 'Werkschrift b', aantal: 24 },
      { id: 'w3', methode: 'Taalkanjers - werkboek', deel: 'Werkboek', aantal: 24 },
      { id: 'w4', methode: 'Taalkanjers - werkboek', deel: 'Spelling', aantal: 24 },
      { id: 'w5', methode: 'Wiskanjers ijsbergversie 2de leerjaar', deel: 'Werkschrift Blok 1', aantal: 24 },
      { id: 'w6', methode: 'Wiskanjers ijsbergversie 2de leerjaar', deel: 'Werkschrift Blok 2', aantal: 24 },
      { id: 'w7', methode: 'Wiskanjers ijsbergversie 2de leerjaar', deel: 'Werkschrift Blok 3', aantal: 24 },
      { id: 'w8', methode: 'Wiskanjers ijsbergversie 2de leerjaar', deel: 'Werkschrift Blok 4', aantal: 24 }
    ];
  }
  // Leerjaar 3-6
  return [
    { id: 'w1', methode: 'Talent', deel: 'Taal A', aantal: 23 },
    { id: 'w2', methode: 'Talent', deel: 'Taal B', aantal: 23 },
    { id: 'w3', methode: 'Talent', deel: 'Spelling', aantal: 23 },
    { id: 'w4', methode: 'Kompas wiskunde', deel: 'Deel 1', aantal: 23 },
    { id: 'w5', methode: 'Kompas wiskunde', deel: 'Deel 2', aantal: 23 },
    { id: 'w6', methode: 'Kompas wiskunde', deel: 'Deel 3', aantal: 23 },
    { id: 'w7', methode: 'Mundo wereldoriëntatie', deel: 'Werkboek', aantal: 23 }
  ];
}

// ==============================================
// HELPER: reset alles
// ==============================================
function demoResetten() {
  if (!confirm('Alle demo-data wissen en opnieuw beginnen?\n\nNiet reversibel.')) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}
