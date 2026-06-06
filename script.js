import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signOut, updatePassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// De Firebase-configuratie van uw web-app
const firebaseConfig = {
  apiKey: "AIzaSyA7KxXMvZ4dzBQDut3CMyWUblLte2tFzoQ",
  authDomain: "huiswerkapp-a311e.firebaseapp.com",
  projectId: "huiswerkapp-a311e",
  storageBucket: "huiswerkapp-a311e.appspot.com",
  messagingSenderId: "797169941164",
  appId: "1:797169941164:web:511d9618079f1378d0fd09"
};

// Initialiseer Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
export { db };

// Als gebruiker al is ingelogd, blijf op de startpagina (index) zodat de klasagenda zichtbaar blijft.
onAuthStateChanged(auth, (user) => {
  if (!user) return;

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
      // Fallback voor oudere index.html zonder de nieuwe kaart
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

async function toonSchooloverzichtKnopAlsNodig(user) {
  const huistakenKnop = document.getElementById('huistakenKeuzeKnop');
  const overgangKnop = document.getElementById('overgangKeuzeKnop');
  const schoolKnop = document.getElementById('schooloverzichtKnop');
  const schoolbeheerKnop = document.getElementById('schoolbeheerKeuzeKnop');
  if (schoolKnop) schoolKnop.style.display = 'none';
  if (schoolbeheerKnop) schoolbeheerKnop.style.display = 'none';
  if (!user) return;

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

  try {
    const rolRef = doc(db, "schoolrollen", user.uid);
    const rolSnap = await getDoc(rolRef);
    const rol = rolSnap.exists() ? String(rolSnap.data().rol || '').toLowerCase() : '';
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

    if (schoolbeheerKnop && (isSecretariaat || heeftKlasbeheer)) {
      schoolbeheerKnop.style.display = '';
    }

    // Secretariaat ziet enkel schoolbeheer, geen huistaken of overgang
    if (isSecretariaat) {
      if (huistakenKnop) huistakenKnop.style.display = 'none';
      if (overgangKnop) overgangKnop.style.display = 'none';
      return;
    }

    if (isSchoolBreed) {
      vulTegel(
        huistakenKnop,
        'schooloverzicht.html?mode=huistaken',
        '&#128218;',
        'Huistaken per klas',
        'Kies eerst een klas en open daarna de huistakenopvolging van die klas.'
      );
      vulTegel(
        overgangKnop,
        'schooloverzicht.html?mode=overgang',
        '&#128196;',
        'Overgang per klas',
        'Kies eerst een klas en bekijk of vul de overgangsbespreking aan.'
      );
    } else {
      vulTegel(
        huistakenKnop,
        'dashboard.html',
        '&#128230;',
        'Huistaken opvolgen',
        'Open de opvolging van je klas voor het afgeven van huistaken per leerling.'
      );
      vulTegel(
        overgangKnop,
        'overgangsbespreking.html',
        '&#128196;',
        'Overgangsbespreking',
        'Werk leerlingenfiches bij en bereid de overdracht naar de volgende klas voor.'
      );
    }
  } catch (err) {
    console.error('Rol controleren mislukt:', err);
    if (schoolKnop) schoolKnop.style.display = 'none';
    if (schoolbeheerKnop) schoolbeheerKnop.style.display = 'none';
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
    .then((userCredential) => {
      window.location.href = 'index.html';
    })
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

// Wachtwoord wijzigen vanaf het startscherm
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

// Service Worker Registratie
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

// Uitloggen vanaf de index-pagina (indien reeds ingelogd)
window.uitloggenVanIndex = function () {
  signOut(auth)
    .then(() => {
      // Verberg de ingelogd-kaart
      const kaart = document.getElementById('ingelogd-kaart');
      if (kaart) kaart.style.display = 'none';
      // Verberg schoolknoppen
      const schoolKnop = document.getElementById('schooloverzichtKnop');
      const schoolbeheerKnop = document.getElementById('schoolbeheerKeuzeKnop');
      if (schoolKnop) schoolKnop.style.display = 'none';
      if (schoolbeheerKnop) schoolbeheerKnop.style.display = 'none';
      // Verwijder de body-klasse zodat #auth niet meer verborgen is via CSS
      document.body.classList.remove('start-ingelogd');
      // Toon het loginformulier terug
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