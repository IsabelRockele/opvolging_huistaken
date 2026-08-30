/*
 * Leest de actieve centrale Firestore-regels en voegt uitsluitend het
 * geïsoleerde Taalgroei-blok toe vóór de afsluitende deny-all-regel.
 * Geen bestaande regel wordt herschreven of verwijderd.
 */

const fs = require('fs');
const path = require('path');
const FIREBASE_LIB = 'C:/Users/isabe/AppData/Roaming/npm/node_modules/firebase-tools/lib/';
const auth = require(FIREBASE_LIB + 'auth.js');
const requireAuth = require(FIREBASE_LIB + 'requireAuth.js');
const rulesApi = require(FIREBASE_LIB + 'gcp/rules.js');

const PROJECT = 'huiswerkapp-a311e';
const ROOT = path.resolve(__dirname, '..');
const SNIPPET = path.join(ROOT, 'firestore-taalgroei.rules.snippet');
const OUTPUT = path.join(ROOT, 'firestore.rules');
const CONFIG = path.join(ROOT, 'firebase.taalgroei.json');
const MARKER = '    match /{document=**} {';

async function main() {
  const account = auth.getGlobalDefaultAccount();
  if (!account) throw new Error('Geen Firebase CLI-account gevonden.');
  const opties = { project: PROJECT, user: account.user, tokens: account.tokens };
  await requireAuth.requireAuth(opties);

  const releases = await rulesApi.listAllReleases(PROJECT);
  const firestoreRelease = releases.find(item => item.name.endsWith('/cloud.firestore'));
  if (!firestoreRelease) throw new Error('Geen actieve Firestore-release gevonden.');
  const bestanden = await rulesApi.getRulesetContent(firestoreRelease.rulesetName);
  const actiefBestand = bestanden.find(item => item.name === 'firestore.rules') || bestanden[0];
  if (!actiefBestand || !actiefBestand.content) throw new Error('Actieve regels zijn leeg.');

  const actief = actiefBestand.content.replace(/\r\n/g, '\n');
  const snippet = fs.readFileSync(SNIPPET, 'utf8').replace(/\r\n/g, '\n').trimEnd();
  if (actief.includes('match /taalgroei_kinderen/')) {
    fs.writeFileSync(OUTPUT, actief, 'utf8');
    console.log('Taalgroei-regels zijn al actief; lokale kopie is bijgewerkt.');
    return;
  }
  const positie = actief.lastIndexOf(MARKER);
  if (positie < 0) throw new Error('Afsluitende deny-all-regel niet gevonden; samenvoegen afgebroken.');

  const samengevoegd = actief.slice(0, positie) + snippet + '\n\n' + actief.slice(positie);
  const terugZonderSnippet = samengevoegd.replace(snippet + '\n\n', '');
  if (terugZonderSnippet !== actief) {
    throw new Error('Veiligheidscontrole faalde: bestaande regels zouden wijzigen.');
  }

  const test = await rulesApi.testRuleset(PROJECT, [{ name: 'firestore.rules', content: samengevoegd }]);
  if (!test || test.status !== 200) throw new Error('Firebase heeft de samengevoegde regels niet goedgekeurd.');

  fs.writeFileSync(OUTPUT, samengevoegd, 'utf8');
  fs.writeFileSync(CONFIG, JSON.stringify({ firestore: { rules: 'firestore.rules' } }, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({
    project: PROJECT,
    bronRuleset: firestoreRelease.rulesetName,
    bestaandeRegelsOngewijzigd: true,
    firebaseValidatie: 'geslaagd',
    output: OUTPUT,
    config: CONFIG
  }, null, 2));
}

main().catch(fout => {
  console.error(fout.message || fout);
  process.exit(1);
});
