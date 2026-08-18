import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signOut, updatePassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA7KxXMvZ4dzBQDut3CMyWUblLte2tFzoQ",
  authDomain: "huiswerkapp-a311e.firebaseapp.com",
  projectId: "huiswerkapp-a311e",
  storageBucket: "huiswerkapp-a311e.appspot.com",
  messagingSenderId: "797169941164",
  appId: "1:797169941164:web:511d9618079f1378d0fd09"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
export { db };

function toonPortaalLaden(isLaden, fout=false) {
  const keuzes = document.querySelector('#ingelogd-kaart .portaal-keuzes');
  const melding = document.getElementById('portaalLaadmelding');
  if (keuzes) keuzes.style.display = isLaden ? 'none' : '';
  if (melding) {
    melding.style.display = isLaden || fout ? '' : 'none';
    if (fout) melding.innerHTML = '<strong style="display:block;color:#8a3b35;font-size:18px;margin-bottom:6px">De persoonlijke tools konden niet volledig worden geladen.</strong>Vernieuw de pagina. Blijft dit terugkomen, controleer dan de internetverbinding en klasmailkoppeling.';
  }
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    const authBox = document.getElementById('auth');
    if (authBox) authBox.style.display = '';
    return;
  }

  const isIndex =
    location.pathname.endsWith('index.html') ||
    location.pathname === '/' ||
    location.pathname.endsWith('/opvolging_huistaken/');

  if (isIndex) {
    const kaart = document.getElementById('ingelogd-kaart');
    const emailSpan = document.getElementById('ingelogd-email');
    const puntenboekKnop = document.getElementById('puntenboekKeuzeKnop');
    if (puntenboekKnop) {
      const simuleerSleutel = 'lindeSimuleerRol_' + user.uid;
      const gesimuleerdRol = localStorage.getItem(simuleerSleutel) || 'beheerder';
      puntenboekKnop.style.display =
        magKlasafsprakenTesten(user) && gesimuleerdRol === 'beheerder' ? '' : 'none';
    }
    if (kaart) {
      if (emailSpan) emailSpan.textContent = user.email || '';
      toonPortaalLaden(true);
      const publiekeAgendaLinks = document.getElementById('publiekeAgendaLinks');
      if (publiekeAgendaLinks) publiekeAgendaLinks.style.display = 'none';
      kaart.style.display = '';
      document.body.classList.add('start-ingelogd');
      const authBox = document.getElementById('auth');
      if (authBox) authBox.style.display = 'none';
      toonSchooloverzichtKnopAlsNodig(user);
    } else {
      const authBox = document.getElementById('auth');
      if (authBox && !document.getElementById('naarDashboardLink')) {
        const p = document.createElement('p');
        p.id = 'naarDashboardLink';
        p.style.marginTop = '8px';
        p.innerHTML = 'U bent ingelogd. <a href="dashboard.html">Ga naar de huiswerkapp</a>.';
        authBox.insertAdjacentElement('afterend', p);
      }
    }
  }
});

// Past knoppen toe op basis van rol-data (gebruikt door cache én verse data)
function magKlasafsprakenTesten(user) {
  return String(user?.email || '').toLowerCase() === 'isabel.rockele@bsdelinde.net';
}

function pasRustigePortaalrubriekenToe(rolNaam, isSecretariaat, heeftKlasbeheer, isSchoolBreed) {
  const secties = [...document.querySelectorAll('#ingelogd-kaart .portaal-sectie')];
  const sleutelVan = sectie => sectie.classList.contains('zorgblok') ? 'zorg' : sectie.classList.contains('organisatieblok') ? 'organisatie' : 'administratie';
  const zichtbareTegels = sectie => [...sectie.querySelectorAll('.portaal-tegel')].some(tegel => tegel.style.display !== 'none');
  const rolSleutel = rolNaam || (isSecretariaat ? 'secretariaat' : heeftKlasbeheer ? 'klasleerkracht' : isSchoolBreed ? 'schoolbreed' : 'gebruiker');
  const opslagSleutel = 'lindeOpenRubriek_' + rolSleutel;
  const standaard = isSecretariaat ? 'administratie' : heeftKlasbeheer ? 'organisatie' : isSchoolBreed ? 'zorg' : 'organisatie';
  let gekozen = localStorage.getItem(opslagSleutel) || standaard;
  const zichtbareSecties = secties.filter(zichtbareTegels);
  if (!zichtbareSecties.some(s => sleutelVan(s) === gekozen)) gekozen = sleutelVan(zichtbareSecties[0] || secties[0]);

  secties.forEach(sectie => {
    const kop = sectie.querySelector('.portaal-sectie-kop');
    if (!kop) return;
    const sleutel = sleutelVan(sectie);
    sectie.classList.toggle('is-collapsed', sleutel !== gekozen);
    kop.setAttribute('role', 'button');
    kop.setAttribute('tabindex', '0');
    kop.setAttribute('aria-expanded', String(sleutel === gekozen));
    const open = () => {
      secties.forEach(andere => {
        const actief = andere === sectie;
        andere.classList.toggle('is-collapsed', !actief);
        andere.querySelector('.portaal-sectie-kop')?.setAttribute('aria-expanded', String(actief));
      });
      localStorage.setItem(opslagSleutel, sleutel);
    };
    kop.onclick = open;
    kop.onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } };
  });
}

function pasKnoppenToe(huistakenKnop, overgangKnop, schoolbeheerKnop, bestellingenKnop, oudercontactKnop, schoolKnop, groeigroepenKnop, zorgoverlegKnop, huiswerkklasKnop, klasafsprakenKnop, isSchoolBreed, isSecretariaat, heeftKlasbeheer, rolNaam = '') {
  function vulTegel(tegel, href, icoon, titel, tekst) {
    if (!tegel) return;
    tegel.href = href;
    tegel.target = '_blank';
    tegel.rel = 'noopener';
    tegel.innerHTML =
      '<span class="portaal-tegel-icoon">' + icoon + '</span>' +
      '<span class="portaal-title">' + titel + '</span>' +
      '<span class="portaal-desc">' + tekst + '</span>' +
      '<span class="portaal-open">Openen</span>';
  }

  if (schoolKnop) schoolKnop.style.display = 'none';
  if (groeigroepenKnop) groeigroepenKnop.style.display = (isSchoolBreed || heeftKlasbeheer) ? '' : 'none';
  if (oudercontactKnop) oudercontactKnop.style.display = (isSchoolBreed || heeftKlasbeheer) ? '' : 'none';
  if (zorgoverlegKnop) zorgoverlegKnop.style.display = (isSchoolBreed || heeftKlasbeheer) ? '' : 'none';
  if (huiswerkklasKnop) huiswerkklasKnop.style.display = (isSchoolBreed || isSecretariaat || heeftKlasbeheer) ? '' : 'none';
  if (klasafsprakenKnop) klasafsprakenKnop.style.display = 'none';
  const naametikettenKnop = document.getElementById('naametikettenKeuzeKnop');
  if (naametikettenKnop) naametikettenKnop.style.display = (isSchoolBreed || isSecretariaat || heeftKlasbeheer) ? '' : 'none';
  const afwezigheidsattestenKnop = document.getElementById('afwezigheidsattestenKeuzeKnop');
  if (afwezigheidsattestenKnop) afwezigheidsattestenKnop.style.display = (isSchoolBreed || isSecretariaat || heeftKlasbeheer) ? '' : 'none';
  const voorbladenKnop = document.getElementById('voorbladenKeuzeKnop');
  if (voorbladenKnop) voorbladenKnop.style.display = (heeftKlasbeheer || rolNaam === 'zorgleerkracht') ? '' : 'none';
  if (schoolbeheerKnop) schoolbeheerKnop.style.display = (isSecretariaat || isSchoolBreed || heeftKlasbeheer) ? '' : 'none';
  if (bestellingenKnop) bestellingenKnop.style.display = (isSecretariaat || heeftKlasbeheer) ? '' : 'none';
  const publiekeAgendaLinks = document.getElementById('publiekeAgendaLinks');
  if (publiekeAgendaLinks) publiekeAgendaLinks.style.display = 'none';
  const hulpbalk = document.getElementById('portaalHulpbalk');
  const checklist = document.getElementById('eersteKeerChecklist');
  const magGebruikershulp = isSchoolBreed || isSecretariaat || heeftKlasbeheer;
  let toonChecklist = false;
  if (checklist) {
    const sleutel = 'lindeEersteChecklist_' + (auth.currentUser?.uid || 'onbekend');
    toonChecklist = heeftKlasbeheer && !isSchoolBreed && !isSecretariaat && localStorage.getItem(sleutel) !== 'klaar';
    checklist.style.display = toonChecklist ? 'flex' : 'none';
  }
  if (hulpbalk) hulpbalk.style.display = magGebruikershulp && !toonChecklist ? 'flex' : 'none';

  // Secretariaat ziet geen aparte rubriek Klasorganisatie; Afwezigheidsattesten verhuist naar School en administratie.
  const organisatieGrid = document.getElementById('organisatiePortaalGrid');
  const administratieGrid = document.getElementById('administratiePortaalGrid');
  if (afwezigheidsattestenKnop) {
    if (isSecretariaat && administratieGrid) administratieGrid.appendChild(afwezigheidsattestenKnop);
    else if (!isSecretariaat && organisatieGrid) organisatieGrid.appendChild(afwezigheidsattestenKnop);
  }
  const organisatieTegels = document.querySelectorAll('.organisatieblok .portaal-tegel');
  if (isSecretariaat) {
    organisatieTegels.forEach(tegel => { tegel.style.display = 'none'; });
    if (afwezigheidsattestenKnop) afwezigheidsattestenKnop.style.display = '';
  } else {
    // Tegels zonder rolgestuurde id (zoals klasagenda) opnieuw zichtbaar maken bij een rolwissel.
    organisatieTegels.forEach(tegel => { if (!tegel.id) tegel.style.display = ''; });
  }

  pasRustigePortaalrubriekenToe(rolNaam, isSecretariaat, heeftKlasbeheer, isSchoolBreed);

  if (isSecretariaat) {
    if (huistakenKnop) huistakenKnop.style.display = 'none';
    if (overgangKnop) overgangKnop.style.display = 'none';
    return;
  }

  if (isSchoolBreed) {
    vulTegel(huistakenKnop, 'schooloverzicht.html?mode=huistaken', '&#128218;', 'Huistaken per klas', 'Kies eerst een klas en open daarna de huistakenopvolging van die klas.');
    vulTegel(overgangKnop, 'schooloverzicht.html?mode=overgang', '&#128196;', 'Overgang per klas', 'Kies eerst een klas en bekijk of vul de overgangsbespreking aan.');
    vulTegel(oudercontactKnop, 'schooloverzicht.html?mode=oudercontact', '&#128172;', 'Oudercontact per klas', 'Kies eerst een klas en open daarna de oudercontactvoorbereidingen.');
  } else {
    vulTegel(huistakenKnop, 'dashboard.html', '&#128230;', 'Huistaken opvolgen', 'Open de opvolging van je klas voor het afgeven van huistaken per leerling.');
    vulTegel(overgangKnop, 'overgangsbespreking.html', '&#128196;', 'Overgangsbespreking', 'Werk leerlingenfiches bij en bereid de overdracht naar de volgende klas voor.');
    vulTegel(oudercontactKnop, 'oudercontact.html', '&#128172;', 'Oudercontact', 'Bereid gesprekken per leerling voor en maak een nette PDF voor ouders.');
  }
}

// Toont rolwissel-paneel voor beheerder (alleen zichtbaar voor jou)
function toonBeheerderRolwissel(user) {
  // Verwijder eerder paneel als het er al is (bij herlaad)
  const bestaand = document.getElementById('beheerder-rolwissel');
  if (bestaand) bestaand.remove();

  const simuleerSleutel = 'lindeSimuleerRol_' + user.uid;
  const huidigeSimulatie = localStorage.getItem(simuleerSleutel) || 'beheerder';

  const rollen = [
    { id: 'beheerder',     label: '🛠 Beheerder' },
    { id: 'klasleerkracht', label: '👩‍🏫 Klasleerkracht' },
    { id: 'zorgleerkracht', label: '💛 Zorgleerkracht' },
    { id: 'secretariaat',   label: '📋 Secretariaat' },
  ];

  const paneel = document.createElement('div');
  paneel.id = 'beheerder-rolwissel';
  paneel.style.cssText = [
    'position:fixed', 'bottom:16px', 'right:16px', 'z-index:9999',
    'background:#1e293b', 'color:#f1f5f9', 'border-radius:12px',
    'padding:12px 16px', 'font-family:sans-serif', 'font-size:13px',
    'box-shadow:0 4px 20px rgba(0,0,0,0.4)', 'display:flex',
    'flex-direction:column', 'gap:8px', 'min-width:200px'
  ].join(';');

  const titel = document.createElement('div');
  titel.textContent = 'Rol simuleren';
  titel.style.cssText = 'font-weight:600; font-size:11px; text-transform:uppercase; letter-spacing:0.05em; color:#94a3b8;';
  paneel.appendChild(titel);

  rollen.forEach(({ id, label }) => {
    const knop = document.createElement('button');
    knop.textContent = label;
    const actief = id === huidigeSimulatie;
    knop.style.cssText = [
      'border:none', 'border-radius:8px', 'padding:7px 12px',
      'font-size:13px', 'cursor:pointer', 'text-align:left',
      actief
        ? 'background:#3b82f6; color:#fff; font-weight:600;'
        : 'background:#334155; color:#cbd5e1;'
    ].join(';');
    knop.onclick = () => {
      localStorage.setItem(simuleerSleutel, id);
      location.reload();
    };
    paneel.appendChild(knop);
  });

  const hulpKnop = document.createElement('button');
  hulpKnop.textContent = '❓ Beheerdershulp';
  hulpKnop.style.cssText = 'border:1px solid #64748b;border-radius:8px;padding:8px 12px;font-size:13px;cursor:pointer;text-align:left;background:#f8fafc;color:#1e293b;font-weight:700;margin-top:3px;';
  hulpKnop.onclick = () => window.openBeheerderHulp();
  paneel.appendChild(hulpKnop);

  document.body.appendChild(paneel);
}

window.openBeheerderHulp = function () {
  const laag = document.getElementById('beheerderHulp');
  if (laag) laag.classList.add('open');
};
window.sluitBeheerderHulp = function () {
  const laag = document.getElementById('beheerderHulp');
  if (laag) laag.classList.remove('open');
};
window.openGebruikersHulp = function () { document.getElementById('gebruikersHulp')?.classList.add('open'); };
window.sluitGebruikersHulp = function () { document.getElementById('gebruikersHulp')?.classList.remove('open'); };
window.openHulpbericht = function () {
  const onderdeel = document.getElementById('hulpberichtDetails');
  if (onderdeel) { onderdeel.open = true; }
  setTimeout(() => onderdeel?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
};
window.sluitEersteKeerChecklist = function () {
  const sleutel = 'lindeEersteChecklist_' + (auth.currentUser?.uid || 'onbekend');
  localStorage.setItem(sleutel, 'klaar');
  const box = document.getElementById('eersteKeerChecklist');
  if (box) box.style.display = 'none';
  const hulpbalk = document.getElementById('portaalHulpbalk');
  if (hulpbalk) hulpbalk.style.display = 'flex';
};
window.maakProbleemtekst = function () {
  const watDoen = document.getElementById('hulpWatDoen')?.value.trim() || '(niet ingevuld)';
  const watMis = document.getElementById('hulpWatMis')?.value.trim() || '(niet ingevuld)';
  const verwacht = document.getElementById('hulpVerwacht')?.value.trim() || '(niet ingevuld)';
  const tekst = [
    'Hulpbericht schooltool',
    '',
    'Wat wilde ik doen?',
    watDoen,
    '',
    'Wat ging er mis?',
    watMis,
    '',
    'Wat had ik verwacht?',
    verwacht,
    '',
    'Automatische gegevens:',
    `E-mailadres: ${auth.currentUser?.email || 'onbekend'}`,
    `Pagina: ${location.href}`,
    `Tijdstip: ${new Date().toLocaleString('nl-BE')}`,
    `Browser: ${navigator.userAgent}`
  ].join('\n');
  const veld = document.getElementById('probleemtekst');
  if (veld) veld.value = tekst;
  return tekst;
};
window.kopieerHulpbericht = async function () {
  const tekst = window.maakProbleemtekst();
  try { await navigator.clipboard.writeText(tekst); alert('Het hulpbericht is gekopieerd.'); }
  catch { alert('Automatisch kopiëren is geblokkeerd. Gebruik dan de knop om het hulpbericht via e-mail te openen.'); }
};
window.mailHulpbericht = function () {
  const watDoen = document.getElementById('hulpWatDoen')?.value.trim();
  const watMis = document.getElementById('hulpWatMis')?.value.trim();
  if (!watDoen || !watMis) {
    alert('Vul eerst in wat je wilde doen en wat er misging.');
    (!watDoen ? document.getElementById('hulpWatDoen') : document.getElementById('hulpWatMis'))?.focus();
    return;
  }
  const tekst = window.maakProbleemtekst();
  const onderwerp = 'Hulpvraag schooltool - ' + (auth.currentUser?.email || 'onbekende gebruiker');
  window.location.href = `mailto:isabel.rockele@bsdelinde.net?subject=${encodeURIComponent(onderwerp)}&body=${encodeURIComponent(tekst)}`;
};

// Zet gesimuleerde rol om naar isSchoolBreed / isSecretariaat / heeftKlasbeheer
function gesimuleerdePaspoorten(gesimuleerdRol) {
  return {
    isSchoolBreed:  ['beheerder', 'zorgleerkracht'].includes(gesimuleerdRol),
    isSecretariaat: ['beheerder', 'secretariaat'].includes(gesimuleerdRol),
    heeftKlasbeheer: gesimuleerdRol === 'klasleerkracht',
  };
}

async function toonSchooloverzichtKnopAlsNodig(user) {
  const huistakenKnop = document.getElementById('huistakenKeuzeKnop');
  const overgangKnop = document.getElementById('overgangKeuzeKnop');
  const schoolKnop = document.getElementById('schooloverzichtKnop');
  const schoolbeheerKnop = document.getElementById('schoolbeheerKeuzeKnop');
  const bestellingenKnop = document.getElementById('bestellingenKeuzeKnop');
  const oudercontactKnop = document.getElementById('oudercontactKeuzeKnop');
  const groeigroepenKnop = document.getElementById('groeigroepenKeuzeKnop');
  const zorgoverlegKnop = document.getElementById('zorgoverlegKeuzeKnop');
  const huiswerkklasKnop = document.getElementById('huiswerkklasKeuzeKnop');
  const klasafsprakenKnop = document.getElementById('klasafsprakenKeuzeKnop');
  const naametikettenKnop = document.getElementById('naametikettenKeuzeKnop');
  const afwezigheidsattestenKnop = document.getElementById('afwezigheidsattestenKeuzeKnop');
  const voorbladenKnop = document.getElementById('voorbladenKeuzeKnop');
  if (schoolKnop) schoolKnop.style.display = 'none';
  if (schoolbeheerKnop) schoolbeheerKnop.style.display = 'none';
  if (bestellingenKnop) bestellingenKnop.style.display = 'none';
  if (oudercontactKnop) oudercontactKnop.style.display = 'none';
  if (groeigroepenKnop) groeigroepenKnop.style.display = 'none';
  if (zorgoverlegKnop) zorgoverlegKnop.style.display = 'none';
  if (huiswerkklasKnop) huiswerkklasKnop.style.display = 'none';
  if (klasafsprakenKnop) klasafsprakenKnop.style.display = magKlasafsprakenTesten(user) ? '' : 'none';
  if (naametikettenKnop) naametikettenKnop.style.display = 'none';
  if (afwezigheidsattestenKnop) afwezigheidsattestenKnop.style.display = 'none';
  if (voorbladenKnop) voorbladenKnop.style.display = 'none';
  if (!user) return;

  // Toon meteen op basis van gecachte rol (vorige sessie) — geen wachttijd
  const cacheKey = 'lindeRolCache_' + user.uid;
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
    if (cached) {
      pasKnoppenToe(huistakenKnop, overgangKnop, schoolbeheerKnop, bestellingenKnop, oudercontactKnop, schoolKnop, groeigroepenKnop, zorgoverlegKnop, huiswerkklasKnop,
        klasafsprakenKnop,
        cached.isSchoolBreed, cached.isSecretariaat, cached.heeftKlasbeheer, cached.rol || '');
      toonPortaalLaden(false);
      if (klasafsprakenKnop) klasafsprakenKnop.style.display = magKlasafsprakenTesten(user) ? '' : 'none';
    }
  } catch (e) { /* cache onleesbaar, gewoon doorgaan */ }

  // Haal verse rol op van Firestore op de achtergrond en update + sla op in cache
  try {
    const rolRef = doc(db, "schoolrollen", user.uid);
    const email = (user.email || '').toLowerCase();
    const uidQuery = query(collection(db, "klasleerkrachten"), where("leerkracht_uids", "array-contains", user.uid));
    const emailQuery = query(collection(db, "klasleerkrachten"), where("leerkracht_emails", "array-contains", email));
    const [rolResult, uidResult, emailResult] = await Promise.allSettled([getDoc(rolRef), getDocs(uidQuery), getDocs(emailQuery)]);
    if (rolResult.status !== 'fulfilled') throw rolResult.reason;
    const rolSnap = rolResult.value;
    const rol = rolSnap.exists() ? String(rolSnap.data().rol || '').toLowerCase() : '';
    const isBeheerder = rol === 'beheerder';

    // ── Beheerder: toon rolwissel-paneel en pas gesimuleerde rol toe ──
    if (isBeheerder) {
      toonBeheerderRolwissel(user);
      const simuleerSleutel = 'lindeSimuleerRol_' + user.uid;
      const gesimuleerdRol = localStorage.getItem(simuleerSleutel) || 'beheerder';
      const puntenboekKnop = document.getElementById('puntenboekKeuzeKnop');
      if (puntenboekKnop) {
        puntenboekKnop.style.display = gesimuleerdRol === 'beheerder' ? '' : 'none';
      }
      const { isSchoolBreed, isSecretariaat, heeftKlasbeheer } = gesimuleerdePaspoorten(gesimuleerdRol);
      pasKnoppenToe(huistakenKnop, overgangKnop, schoolbeheerKnop, bestellingenKnop, oudercontactKnop, schoolKnop, groeigroepenKnop, zorgoverlegKnop, huiswerkklasKnop,
        klasafsprakenKnop,
        isSchoolBreed, isSecretariaat, heeftKlasbeheer, gesimuleerdRol);
      if (klasafsprakenKnop) klasafsprakenKnop.style.display = magKlasafsprakenTesten(user) ? '' : 'none';
      toonPortaalLaden(false);
      return;
    }

    const isSchoolBreed = ['directie', 'zorgcoordinator', 'zorgleerkracht'].includes(rol);
    const isSecretariaat = rol === 'secretariaat';

    let heeftKlasbeheer = false;
    if (!isSecretariaat) {
      const snaps = [uidResult, emailResult].filter(result => result.status === 'fulfilled').map(result => result.value);
      heeftKlasbeheer = snaps.some(snap => !snap.empty);
    }

    // Sla op in cache voor volgende keer
    localStorage.setItem(cacheKey, JSON.stringify({ isSchoolBreed, isSecretariaat, heeftKlasbeheer, rol }));

    // Update knoppen met verse data (corrigeert cache indien nodig)
    pasKnoppenToe(huistakenKnop, overgangKnop, schoolbeheerKnop, bestellingenKnop, oudercontactKnop, schoolKnop, groeigroepenKnop, zorgoverlegKnop, huiswerkklasKnop,
      klasafsprakenKnop,
      isSchoolBreed, isSecretariaat, heeftKlasbeheer, rol);
    if (klasafsprakenKnop) klasafsprakenKnop.style.display = magKlasafsprakenTesten(user) ? '' : 'none';
    toonPortaalLaden(false);

  } catch (err) {
    console.error('Rol controleren mislukt:', err);
    if (schoolbeheerKnop) schoolbeheerKnop.style.display = 'none';
    if (bestellingenKnop) bestellingenKnop.style.display = 'none';
    toonPortaalLaden(false, true);
  }
}

window.register = function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      alert("Account aangemaakt! Je bent nu ingelogd.");
    })
    .catch((error) => {
      if (error.code === 'auth/email-already-in-use') {
        alert("Dit e-mailadres heeft al een account. Probeer alstublieft in te loggen.");
      } else {
        alert("Fout bij registreren: " + error.message);
      }
    });
};

window.login = function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  signInWithEmailAndPassword(auth, email, password)
    .catch((error) => {
      alert("Fout bij inloggen: " + error.message);
    });
};

window.wachtwoordVergeten = function () {
  const email = document.getElementById("email").value;
  if (!email) {
    alert("Vul alstublieft uw e-mailadres in het e-mailveld in en klik dan op 'Wachtwoord vergeten?'.");
    return;
  }
  sendPasswordResetEmail(auth, email)
    .then(() => {
      alert("Er is een e-mail naar u verzonden om uw wachtwoord opnieuw in te stellen. Controleer uw inbox.");
    })
    .catch((error) => {
      alert("Fout: " + error.message);
    });
};

window.wijzigWachtwoordVanStart = function () {
  const user = auth.currentUser;
  if (!user) {
    alert("Log eerst in om uw wachtwoord te wijzigen.");
    return;
  }
  const nieuwWachtwoord = prompt("Voer uw nieuwe wachtwoord in (minstens 6 tekens).");
  if (!nieuwWachtwoord) return;
  if (nieuwWachtwoord.length < 6) {
    alert("Het wachtwoord is te kort. Gebruik minstens 6 tekens.");
    return;
  }
  updatePassword(user, nieuwWachtwoord)
    .then(() => {
      alert("Wachtwoord is gewijzigd.");
    })
    .catch((err) => {
      if (err.code === "auth/requires-recent-login") {
        alert("Voor de veiligheid moet u opnieuw inloggen. Log uit, log opnieuw in met het tijdelijke wachtwoord en probeer daarna opnieuw.");
      } else {
        alert("Wachtwoord wijzigen lukte niet: " + err.message);
      }
    });
};

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(registration => {
        console.log('ServiceWorker registratie succesvol!');
      })
      .catch(err => {
        console.log('ServiceWorker registratie mislukt: ', err);
      });
  });
}

window.uitloggenVanIndex = function () {
  signOut(auth)
    .then(() => {
      const kaart = document.getElementById('ingelogd-kaart');
      if (kaart) kaart.style.display = 'none';
      const schoolKnop = document.getElementById('schooloverzichtKnop');
      const schoolbeheerKnop = document.getElementById('schoolbeheerKeuzeKnop');
      const bestellingenKnop = document.getElementById('bestellingenKeuzeKnop');
      const oudercontactKnop = document.getElementById('oudercontactKeuzeKnop');
      const groeigroepenKnop = document.getElementById('groeigroepenKeuzeKnop');
      const zorgoverlegKnop = document.getElementById('zorgoverlegKeuzeKnop');
      const huiswerkklasKnop = document.getElementById('huiswerkklasKeuzeKnop');
      const publiekeAgendaLinks = document.getElementById('publiekeAgendaLinks');
      if (schoolKnop) schoolKnop.style.display = 'none';
      if (schoolbeheerKnop) schoolbeheerKnop.style.display = 'none';
      if (bestellingenKnop) bestellingenKnop.style.display = 'none';
      if (oudercontactKnop) oudercontactKnop.style.display = 'none';
      if (groeigroepenKnop) groeigroepenKnop.style.display = 'none';
      if (zorgoverlegKnop) zorgoverlegKnop.style.display = 'none';
      if (huiswerkklasKnop) huiswerkklasKnop.style.display = 'none';
      if (publiekeAgendaLinks) publiekeAgendaLinks.style.display = '';
      document.body.classList.remove('start-ingelogd');
      const authBox = document.getElementById('auth');
      if (authBox) {
        authBox.style.display = '';
        authBox.classList.remove('reeds-ingelogd');
      }
    })
    .catch((err) => {
      alert('Uitloggen lukte niet: ' + err.message);
    });
};
