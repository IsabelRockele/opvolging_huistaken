import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
// AANGEPAST: sendPasswordResetEmail toegevoegd
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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

// Als gebruiker al is ingelogd, blijf op de startpagina (index) zodat de klasagenda zichtbaar blijft.
// Op andere pagina's doen we niets speciaals.
onAuthStateChanged(auth, (user) => {
  if (!user) return;

  const isIndex =
    location.pathname.endsWith('index.html') ||
    location.pathname === '/' ||
    location.pathname.endsWith('/opvolging_huistaken/');

  if (isIndex) {
    // Optioneel: een kleine hint/link plaatsen onder het loginblok
    const authBox = document.getElementById('auth');
    if (authBox && !document.getElementById('naarDashboardLink')) {
      const p = document.createElement('p');
      p.id = 'naarDashboardLink';
      p.style.marginTop = '8px';
      p.innerHTML = 'U bent ingelogd. <a href="dashboard.html">Ga naar de huiswerkapp</a>.';
      authBox.insertAdjacentElement('afterend', p);
    }
  }
});


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
      window.location.href = 'dashboard.html';
    })
    .catch((error) => {
      alert("Fout bij inloggen: " + error.message);
    });
};

// NIEUW: Functie voor wachtwoord vergeten
window.wachtwoordVergeten = function() {
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
}

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

