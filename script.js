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
    if (kaart) {
      if (emailSpan) emailSpan.textContent = user.email || '';
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

function pasKnoppenToe(huistakenKnop, overgangKnop, schoolbeheerKnop, bestellingenKnop, oudercontactKnop, schoolKnop, groeigroepenKnop, zorgoverlegKnop, huiswerkklasKnop, klasafsprakenKnop, isSchoolBreed, isSecretariaat, heeftKlasbeheer) {
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
  if (groeigroepenKnop) groeigroepenKnop.style.display = isSchoolBreed ? '' : 'none';
  if (oudercontactKnop) oudercontactKnop.style.display = (isSchoolBreed || heeftKlasbeheer) ? '' : 'none';
  if (zorgoverlegKnop) zorgoverlegKnop.style.display = (isSchoolBreed || heeftKlasbeheer) ? '' : 'none';
  if (huiswerkklasKnop) huiswerkklasKnop.style.display = (isSchoolBreed || isSecretariaat || heeftKlasbeheer) ? '' : 'none';
  if (klasafsprakenKnop) klasafsprakenKnop.style.display = 'none';
  if (schoolbeheerKnop) schoolbeheerKnop.style.display = (isSecretariaat || isSchoolBreed || heeftKlasbeheer) ? '' : 'none';
  if (bestellingenKnop) bestellingenKnop.style.display = (isSecretariaat || heeftKlasbeheer) ? '' : 'none';
  const publiekeAgendaLinks = document.getElementById('publiekeAgendaLinks');
  if (publiekeAgendaLinks) publiekeAgendaLinks.style.display = isSecretariaat ? 'none' : '';

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

  document.body.appendChild(paneel);
}

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
  if (schoolKnop) schoolKnop.style.display = 'none';
  if (schoolbeheerKnop) schoolbeheerKnop.style.display = 'none';
  if (bestellingenKnop) bestellingenKnop.style.display = 'none';
  if (oudercontactKnop) oudercontactKnop.style.display = 'none';
  if (groeigroepenKnop) groeigroepenKnop.style.display = 'none';
  if (zorgoverlegKnop) zorgoverlegKnop.style.display = 'none';
  if (huiswerkklasKnop) huiswerkklasKnop.style.display = 'none';
  if (klasafsprakenKnop) klasafsprakenKnop.style.display = magKlasafsprakenTesten(user) ? '' : 'none';
  if (!user) return;

  // Toon meteen op basis van gecachte rol (vorige sessie) — geen wachttijd
  const cacheKey = 'lindeRolCache_' + user.uid;
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
    if (cached) {
      pasKnoppenToe(huistakenKnop, overgangKnop, schoolbeheerKnop, bestellingenKnop, oudercontactKnop, schoolKnop, groeigroepenKnop, zorgoverlegKnop, huiswerkklasKnop,
        klasafsprakenKnop,
        cached.isSchoolBreed, cached.isSecretariaat, cached.heeftKlasbeheer);
      if (klasafsprakenKnop) klasafsprakenKnop.style.display = magKlasafsprakenTesten(user) ? '' : 'none';
    }
  } catch (e) { /* cache onleesbaar, gewoon doorgaan */ }

  // Haal verse rol op van Firestore op de achtergrond en update + sla op in cache
  try {
    const rolRef = doc(db, "schoolrollen", user.uid);
    const rolSnap = await getDoc(rolRef);
    const rol = rolSnap.exists() ? String(rolSnap.data().rol || '').toLowerCase() : '';
    const isBeheerder = rol === 'beheerder';

    // ── Beheerder: toon rolwissel-paneel en pas gesimuleerde rol toe ──
    if (isBeheerder) {
      toonBeheerderRolwissel(user);
      const simuleerSleutel = 'lindeSimuleerRol_' + user.uid;
      const gesimuleerdRol = localStorage.getItem(simuleerSleutel) || 'beheerder';
      const { isSchoolBreed, isSecretariaat, heeftKlasbeheer } = gesimuleerdePaspoorten(gesimuleerdRol);
      pasKnoppenToe(huistakenKnop, overgangKnop, schoolbeheerKnop, bestellingenKnop, oudercontactKnop, schoolKnop, groeigroepenKnop, zorgoverlegKnop, huiswerkklasKnop,
        klasafsprakenKnop,
        isSchoolBreed, isSecretariaat, heeftKlasbeheer);
      if (klasafsprakenKnop) klasafsprakenKnop.style.display = magKlasafsprakenTesten(user) ? '' : 'none';
      return;
    }

    const isSchoolBreed = ['directie', 'zorgcoordinator', 'zorgleerkracht'].includes(rol);
    const isSecretariaat = rol === 'secretariaat';

    let heeftKlasbeheer = false;
    if (!isSecretariaat) {
      const email = (user.email || '').toLowerCase();
      const uidQuery = query(collection(db, "klasleerkrachten"), where("leerkracht_uids", "array-contains", user.uid));
      const emailQuery = query(collection(db, "klasleerkrachten"), where("leerkracht_emails", "array-contains", email));
      const snaps = await Promise.all([getDocs(uidQuery), getDocs(emailQuery)]);
      heeftKlasbeheer = snaps.some(snap => !snap.empty);
    }

    // Sla op in cache voor volgende keer
    localStorage.setItem(cacheKey, JSON.stringify({ isSchoolBreed, isSecretariaat, heeftKlasbeheer }));

    // Update knoppen met verse data (corrigeert cache indien nodig)
    pasKnoppenToe(huistakenKnop, overgangKnop, schoolbeheerKnop, bestellingenKnop, oudercontactKnop, schoolKnop, groeigroepenKnop, zorgoverlegKnop, huiswerkklasKnop,
      klasafsprakenKnop,
      isSchoolBreed, isSecretariaat, heeftKlasbeheer);
    if (klasafsprakenKnop) klasafsprakenKnop.style.display = magKlasafsprakenTesten(user) ? '' : 'none';

  } catch (err) {
    console.error('Rol controleren mislukt:', err);
    if (schoolbeheerKnop) schoolbeheerKnop.style.display = 'none';
    if (bestellingenKnop) bestellingenKnop.style.display = 'none';
  }
}

window.register = function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      alert("Account aangemaakt! U kunt nu inloggen.");
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
