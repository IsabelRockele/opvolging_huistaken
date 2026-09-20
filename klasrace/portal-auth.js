window.klasraceAuth=(async()=>{
const {initializeApp,getApps}=await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
const {getAuth,onAuthStateChanged}=await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
const app=getApps()[0]||initializeApp({apiKey:'AIzaSyA7KxXMvZ4dzBQDut3CMyWUblLte2tFzoQ',authDomain:'huiswerkapp-a311e.firebaseapp.com',projectId:'huiswerkapp-a311e',storageBucket:'huiswerkapp-a311e.appspot.com',messagingSenderId:'797169941164',appId:'1:797169941164:web:511d9618079f1378d0fd09'});
const auth=getAuth(app);
const firestore=await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
const {signInAnonymously}=await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
return new Promise(resolve=>{const stop=onAuthStateChanged(auth,()=>{stop();resolve({auth,db:firestore.getFirestore(app),f:{...firestore,signInAnonymously}});});});
})();
