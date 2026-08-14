import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Hoogstens één automatische momentopname per document per browservenster en
// per halfuur. Zo blijft versieherstel bruikbaar zonder bij elke toetsaanslag
// honderden kopieën te maken.
const LAATSTE_KOPIE = new Map();
const KOPIE_INTERVAL_MS = 30 * 60 * 1000;

function veiligDocumentId(pad) {
  return String(pad || 'onbekend')
    .replace(/[^a-z0-9_-]+/gi, '__')
    .slice(0, 900);
}

function kopieId() {
  const tijd = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const uniek = Math.random().toString(36).slice(2, 8);
  return `${tijd}_${uniek}`;
}

/**
 * Bewaart de huidige inhoud van een Firestore-document vóór een wijziging.
 * Er wordt nooit iets aan het brondocument gewijzigd.
 */
export async function maakVeiligheidskopie(ref, context = {}) {
  if (!ref?.path || !ref?.firestore) throw new Error('Ongeldige Firebase-verwijzing voor veiligheidskopie.');
  const nu = Date.now();
  const laatste = LAATSTE_KOPIE.get(ref.path) || 0;
  if (!context.forceer && nu - laatste < KOPIE_INTERVAL_MS) {
    return { gemaakt: false, reden: 'recent-gemaakt' };
  }

  const bestaand = await getDoc(ref);
  if (!bestaand.exists()) return { gemaakt: false, reden: 'nieuw-document' };

  const doel = doc(
    ref.firestore,
    'veiligheidskopieen',
    veiligDocumentId(ref.path),
    'versies',
    kopieId()
  );
  await setDoc(doel, {
    bronPad: ref.path,
    bronData: bestaand.data(),
    reden: String(context.reden || 'voor wijziging'),
    schooljaar: String(context.schooljaar || ''),
    klas: String(context.klas || ''),
    gebruiker: String(context.gebruiker || ''),
    gemaaktOp: serverTimestamp(),
    gemaaktOpIso: new Date().toISOString(),
    herstelStatus: 'beschikbaar'
  });
  LAATSTE_KOPIE.set(ref.path, nu);
  return { gemaakt: true, pad: doel.path };
}

/**
 * Standaardbeleid: een gewone opslag mag doorgaan als de aparte kopie door
 * ontbrekende Firebase-rechten niet lukt, maar de fout blijft expliciet
 * zichtbaar in status/console. Destructieve acties gebruiken forceer=true en
 * mogen door de aanroeper worden afgebroken wanneer deze functie faalt.
 */
export async function probeerVeiligheidskopie(ref, context = {}, meld = console.warn) {
  try {
    return await maakVeiligheidskopie(ref, context);
  } catch (err) {
    meld('Veiligheidskopie kon niet worden gemaakt.', err);
    return { gemaakt: false, reden: 'fout', fout: err };
  }
}
