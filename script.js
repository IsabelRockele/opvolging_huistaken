import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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

// Als gebruiker al is ingelogd, stuur direct door naar dashboard
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Controleer of we niet al op de dashboard pagina zijn om een oneindige laadcyclus te voorkomen
    if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) {
        window.location.href = 'dashboard.html';
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
      alert("Fout bij registreren: " + error.message);
    });
};

window.login = function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      // Gebruiker succesvol ingelogd, stuur door naar dashboard
      window.location.href = 'dashboard.html';
    })
    .catch((error) => {
      alert("Fout bij inloggen: " + error.message);
    });
};

