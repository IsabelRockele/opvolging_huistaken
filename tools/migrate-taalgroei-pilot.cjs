/*
 * Niet-destructieve eenmalige kopie voor de Taalgroei-pilot.
 * Raakt uitsluitend de hieronder benoemde broncollecties en centrale
 * taalgroei_* doelcollecties. Bestaande afwijkende doeldocumenten blokkeren
 * de migratie; brongegevens worden nooit gewijzigd of verwijderd.
 */
const FIREBASE_LIB = 'C:/Users/isabe/AppData/Roaming/npm/node_modules/firebase-tools/lib/';
const auth = require(FIREBASE_LIB + 'auth.js');
const requireAuth = require(FIREBASE_LIB + 'requireAuth.js');

const BRONPROJECT = 'anders-leren-jufzisa';
const DOELPROJECT = 'huiswerkapp-a311e';
const COLLECTIES = ['kinderen', 'instellingen', 'rapportperiodes', 'rapporten', 'schooljaren', 'klastaken'];
const UITVOEREN = process.argv.includes('--execute');

function basis(project) {
  return `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
}
function gelijk(a, b) {
  return JSON.stringify(a || {}) === JSON.stringify(b || {});
}
async function aanvraag(url, token, opties = {}) {
  const response = await fetch(url, {
    ...opties,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opties.headers || {}) }
  });
  if (response.status === 404) return null;
  const tekst = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${tekst}`);
  return tekst ? JSON.parse(tekst) : {};
}
async function lijst(project, collectie, token) {
  const docs = [];
  let pageToken = '';
  do {
    const url = `${basis(project)}/${collectie}?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const data = await aanvraag(url, token);
    docs.push(...(data.documents || []));
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return docs;
}
function idVan(doc) { return doc.name.split('/').pop(); }
async function maakDoc(collectie, doc, token) {
  const id = idVan(doc);
  const url = `${basis(DOELPROJECT)}/taalgroei_${collectie}?documentId=${encodeURIComponent(id)}`;
  return aanvraag(url, token, { method: 'POST', body: JSON.stringify({ fields: doc.fields || {} }) });
}
async function zetMarker(token, tellingen) {
  const url = `${basis(DOELPROJECT)}/taalgroei_config/pilot`;
  const body = { fields: {
    actief: { booleanValue: true },
    bronProject: { stringValue: BRONPROJECT },
    doelProject: { stringValue: DOELPROJECT },
    geactiveerdOp: { timestampValue: new Date().toISOString() },
    aantallen: { mapValue: { fields: Object.fromEntries(Object.entries(tellingen).map(([k,v]) => [k, { integerValue: String(v) }])) } }
  }};
  return aanvraag(url, token, { method: 'PATCH', body: JSON.stringify(body) });
}

async function main() {
  const account = auth.getGlobalDefaultAccount();
  if (!account) throw new Error('Geen Firebase CLI-account gevonden.');
  const opties = { project: DOELPROJECT, user: account.user, tokens: account.tokens };
  await requireAuth.requireAuth(opties);
  const token = opties.tokens.access_token;
  if (!token) throw new Error('Geen geldige Firebase-toegangstoken gevonden.');

  const controle = [];
  for (const collectie of COLLECTIES) {
    const [bron, doel] = await Promise.all([
      lijst(BRONPROJECT, collectie, token),
      lijst(DOELPROJECT, `taalgroei_${collectie}`, token)
    ]);
    const doelMap = new Map(doel.map(d => [idVan(d), d]));
    const botsingen = bron.filter(d => doelMap.has(idVan(d)) && !gelijk(d.fields, doelMap.get(idVan(d)).fields));
    if (botsingen.length) throw new Error(`Afgebroken: ${botsingen.length} afwijkende bestaande documenten in taalgroei_${collectie}.`);
    controle.push({ collectie, bron, doelMap, nieuw: bron.filter(d => !doelMap.has(idVan(d))) });
  }

  console.log(JSON.stringify({ modus: UITVOEREN ? 'uitvoeren' : 'droge-controle', collecties: controle.map(c => ({ naam:c.collectie, bron:c.bron.length, reedsIdentiek:c.bron.length-c.nieuw.length, nieuw:c.nieuw.length })) }, null, 2));
  if (!UITVOEREN) return;

  for (const c of controle) for (const doc of c.nieuw) await maakDoc(c.collectie, doc, token);
  const tellingen = {};
  for (const c of controle) {
    const na = await lijst(DOELPROJECT, `taalgroei_${c.collectie}`, token);
    if (na.length < c.bron.length) throw new Error(`Controle mislukt voor taalgroei_${c.collectie}: ${na.length}/${c.bron.length}.`);
    tellingen[c.collectie] = c.bron.length;
  }
  await zetMarker(token, tellingen);
  console.log(JSON.stringify({ resultaat:'pilot-actief', bronOnaangeroerd:true, andereCollectiesAangeraakt:false, tellingen }, null, 2));
}

main().catch(fout => { console.error(fout.message || fout); process.exit(1); });
