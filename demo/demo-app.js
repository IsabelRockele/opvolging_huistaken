// ==============================================
// DEMO APP - hoofdlogica
// ==============================================

let state = getState();

// ==============================================
// INITIALISATIE
// ==============================================
document.addEventListener('DOMContentLoaded', () => {
  vulKlasKiezer();
  rolToepassen();
});

function vulKlasKiezer() {
  const sel = document.getElementById('klas-select');
  sel.innerHTML = KLASSEN.map(k =>
    `<option value="${k.id}">${k.klas} — ${k.leerkracht}</option>`
  ).join('');
  sel.value = state.huidigeKlasId;
}

// ==============================================
// ROL-BEHEER
// ==============================================
window.rolKiezen = function (rol) {
  state.huidigeRol = rol;
  bewaarState(state);
  rolToepassen();
};

function rolToepassen() {
  // Container terug op standaardbreedte (wordt breed gemaakt door refter/uitstap-module)
  document.querySelector('.container').classList.remove('breed');

  // Knoppen-styling
  document.getElementById('rol-leerkracht-knop').classList.toggle('actief', state.huidigeRol === 'leerkracht');
  document.getElementById('rol-secretariaat-knop').classList.toggle('actief', state.huidigeRol === 'secretariaat');

  // Klas-kiezer alleen tonen bij leerkracht-rol
  document.getElementById('leerkracht-kiezer').style.display =
    state.huidigeRol === 'leerkracht' ? 'flex' : 'none';

  // Header aanpassen
  const huidigeKlas = KLASSEN.find(k => k.id === state.huidigeKlasId);
  if (state.huidigeRol === 'leerkracht') {
    document.getElementById('header-ondertitel').textContent = 'Dashboard leerkracht';
    document.getElementById('gebruiker-info').innerHTML =
      `👩‍🏫 ${huidigeKlas.leerkracht}<br>🏫 Klas ${huidigeKlas.klas}`;
    toonLeerkrachtDashboard();
  } else {
    document.getElementById('header-ondertitel').textContent = 'Dashboard secretariaat';
    document.getElementById('gebruiker-info').innerHTML =
      `📋 Secretariaat<br>12 klassen overzicht`;
    toonSecretariaatDashboard();
  }
}

window.klasWisselen = function () {
  state.huidigeKlasId = document.getElementById('klas-select').value;
  bewaarState(state);
  rolToepassen();
};

// ==============================================
// LEERKRACHT DASHBOARD
// ==============================================
function toonLeerkrachtDashboard() {
  toonMeldingen();

  const hoofdpaneel = document.getElementById('hoofdpaneel');
  hoofdpaneel.innerHTML = `
    <div class="tegel-grid">

      <button class="tegel" onclick="moduleOpenen('klasbeheer')">
        <div class="icoon">📚</div>
        <h3>Klasbeheer</h3>
        <p>Werkboeken, Lyreco, stock klasmateriaal, knutselideetjes</p>
        <span class="badge groen">6 werkboeken ingesteld</span>
      </button>

      <button class="tegel" onclick="moduleOpenen('huistaken')">
        <div class="icoon">📝</div>
        <h3>Huistaken-opvolging</h3>
        <p>Registreer wie huistaken maakt op tijd, te laat, ziek…</p>
        <span class="badge groen">Up-to-date</span>
      </button>

      <button class="tegel" onclick="moduleOpenen('gedragsopvolging')">
        <div class="icoon">📊</div>
        <h3>Gedragsopvolging</h3>
        <p>Volg gedrag en afspraken op per leerling</p>
        <span class="badge groen">Up-to-date</span>
      </button>

      <button class="tegel" onclick="moduleOpenen('refter')">
        <div class="icoon">🍽️</div>
        <h3>Refterlijst</h3>
        <p>Duid dagelijks aan wie in de refter at</p>
        ${badgeRefter()}
      </button>

      <button class="tegel" onclick="moduleOpenen('uitstappen')">
        <div class="icoon">🚌</div>
        <h3>Uitstappen</h3>
        <p>Beheer uitstappen en wie deelneemt</p>
        ${badgeUitstappen()}
      </button>

    </div>
  `;
}

function badgeRefter() {
  // Placeholder — later echte logica
  const dagNaam = new Date().toLocaleDateString('nl-BE', { weekday: 'long' });
  return `<span class="badge geel">Vandaag nog niet ingevuld</span>`;
}

function badgeUitstappen() {
  const uitstappen = state.uitstappen[state.huidigeKlasId] || [];
  if (uitstappen.length === 0) return `<span class="badge groen">Geen geplande uitstappen</span>`;
  return `<span class="badge groen">${uitstappen.length} geplande uitstap(pen)</span>`;
}

// ==============================================
// MELDINGEN
// ==============================================
function toonMeldingen() {
  const zone = document.getElementById('meldingen-zone');
  const meldingen = berekenMeldingen();

  if (meldingen.length === 0) {
    zone.innerHTML = '';
    return;
  }

  zone.innerHTML = `
    <div class="meldingen">
      <h3>⚠️ ${meldingen.length} aandachtspunt${meldingen.length === 1 ? '' : 'en'}</h3>
      ${meldingen.map(m => `
        <div class="melding ${m.kleur}">
          <div class="melding-tekst">
            <strong>${m.titel}</strong><br>
            <span style="color:var(--tekst-zacht); font-size:0.88em;">${m.detail}</span>
          </div>
          <button class="melding-knop" onclick="moduleOpenen('${m.actie}')">${m.knopTekst}</button>
        </div>
      `).join('')}
    </div>
  `;
}

function berekenMeldingen() {
  // Voor de demo: een paar verzonnen meldingen
  const meldingen = [];

  // Refter-deadline melding (fictief: altijd tonen voor demo)
  meldingen.push({
    kleur: 'geel',
    titel: '🍽️ Refterlijst deze week — deadline morgen (woensdag 12:00)',
    detail: 'Deze week zijn nog 3 dagen niet aangevuld',
    actie: 'refter',
    knopTekst: 'Openen'
  });

  // Voor klas 2A: fictieve uitstap-melding
  if (state.huidigeKlasId === '2A') {
    meldingen.push({
      kleur: 'rood',
      titel: '🚌 Uitstap Technopolis — lijst nog niet doorgegeven',
      detail: 'Uitstap is over 10 dagen (15/03/2027) — secretariaat wacht op deelnamelijst',
      actie: 'uitstappen',
      knopTekst: 'Openen'
    });
  }

  return meldingen;
}

// ==============================================
// MODULES OPENEN
// ==============================================
window.moduleOpenen = function (modulenaam) {
  if (modulenaam === 'refter') { toonRefterModule(); return; }
  if (modulenaam === 'uitstappen') { toonUitstapModule(); return; }
  if (modulenaam === 'klasbeheer') { toonKlasbeheerModule(); return; }

  const hoofdpaneel = document.getElementById('hoofdpaneel');
  const titels = {
    huistaken: '📝 Huistaken-opvolging',
    gedragsopvolging: '📊 Gedragsopvolging'
  };
  const beschrijvingen = {
    huistaken: 'Dit is jouw bestaande huistaken-opvolging tool (PDF-rapporten per leerling, statussen op tijd/te laat/ziek…).<br><br><em>Wordt straks uitgebreid met toegang voor zorgjuf, zorgcoördinator, directie.</em>',
    gedragsopvolging: 'Dit is jouw bestaande gedragsopvolging-tool.<br><br><em>Wordt straks uitgebreid met toegang voor zorgjuf, zorgcoördinator, directie.</em>'
  };

  hoofdpaneel.innerHTML = `
    <button class="terug-knop" onclick="rolToepassen()">← Terug naar dashboard</button>
    <div class="placeholder">
      <h3>${titels[modulenaam] || modulenaam}</h3>
      <p>${beschrijvingen[modulenaam] || 'Module komt in volgende build.'}</p>
      <div class="mini">Deze module wordt ingevuld in een volgende stap van de demo-build.</div>
    </div>
  `;
};

// ==============================================
// REFTER MODULE (LEERKRACHT)
// ==============================================
let refterHuidigeMaand = '2026-11'; // standaard november 2026

function totaalNodig() { return 0; } // niet gebruikt in demo

// Helper: is deze datum geblokkeerd voor de leerkracht?
function isDatumGeblokkeerd(klasId, datumISO) {
  const tot = state.refter_geblokkeerd_tot[klasId];
  if (!tot) return false;
  return datumISO <= tot;
}

function toonRefterModule() {
  const klas = KLASSEN.find(k => k.id === state.huidigeKlasId);
  const hoofdpaneel = document.getElementById('hoofdpaneel');
  document.getElementById('meldingen-zone').innerHTML = '';
  document.querySelector('.container').classList.add('breed');
  const klasId = state.huidigeKlasId;
  const geblokkeerd_tot = state.refter_geblokkeerd_tot[klasId];

  hoofdpaneel.innerHTML = `
    <button class="terug-knop" onclick="rolToepassen()">← Terug naar dashboard</button>

    <div class="refter-wrapper">
      <h2 style="margin:0 0 6px 0; color:var(--accent-donker);">🍽️ Refterlijst — Klas ${klas.klas}</h2>
      <p style="margin:0 0 14px 0; color:var(--tekst-zacht); font-size:0.92em;">
        Standaard at iedereen mee op elke schooldag. <strong>Klik op een cel</strong> om iemand afwezig te zetten (kruisje verschijnt). Klik nogmaals om terug op aanwezig te zetten.
      </p>

      ${geblokkeerd_tot ? `
        <div class="geblokkeerd-melding">
          🔒 <strong>Vergrendeld tot en met ${formatDag(geblokkeerd_tot)}</strong> door secretariaat — verwerkt voor facturatie.
          Datums tot die dag kan je niet meer wijzigen. Bij een correctie: meld het aan het secretariaat.
        </div>
      ` : ''}

      <div class="refter-toolbar">
        <div class="maand-nav">
          <button onclick="refterMaandWisselen(-1)">◀</button>
          <span class="maand-titel" id="refter-maand-titel"></span>
          <button onclick="refterMaandWisselen(1)">▶</button>
        </div>
        <button onclick="refterAllesAan()" class="groen">✓ Alles op 'at mee'</button>
        <button onclick="openLeerlingBeheer()">👥 Leerlingen beheren</button>
      </div>

      <div class="refter-scroller">
        <table class="refter-kalender" id="refter-tabel">
          <!-- Wordt gevuld door JS -->
        </table>
      </div>

      <div class="refter-legende">
        <span><span class="vb aan"></span> At in refter</span>
        <span><span class="vb uit"></span> Afwezig / niet gegeten</span>
        <span><span class="vb grijs"></span> Weekend / woensdag / vakantie</span>
        <span><span class="vb donker-grijs"></span> Niet ingeschreven / personeelskind</span>
      </div>

      <div class="refter-samenvatting" id="refter-samenvatting"></div>
    </div>

    <!-- Leerling-beheer dialoog -->
    <div class="dialoog-achtergrond" id="ll-dialoog">
      <div class="dialoog">
        <h3>👥 Leerlingen van ${klas.klas}</h3>

        <div style="background:var(--creme); padding:12px; border-radius:8px; margin-bottom:16px;">
          <h4 style="margin:0 0 8px 0; font-size:1em;">➕ Nieuw kind inschrijven</h4>
          <label>Voornaam</label>
          <input type="text" id="nw-voornaam" placeholder="bv. Lotte">
          <label>Achternaam</label>
          <input type="text" id="nw-achternaam" placeholder="bv. Peeters">
          <label>Startdatum</label>
          <input type="date" id="nw-startdatum" value="${vandaagISO()}">
          <div class="hint">Refterdagen voor deze datum worden automatisch grijs gemaakt.</div>
          <div class="dialoog-knoppen" style="margin-top:0;">
            <button class="accent" onclick="leerlingToevoegen()">Toevoegen</button>
          </div>
        </div>

        <h4 style="margin:0 0 8px 0; font-size:1em;">📋 Huidige leerlingen</h4>
        <div id="ll-lijst" style="max-height:300px; overflow-y:auto; border:1px solid var(--rand); border-radius:8px;"></div>

        <div class="dialoog-knoppen">
          <button onclick="sluitDialoog('ll-dialoog')">Sluiten</button>
        </div>
      </div>
    </div>

    <!-- Leerling-detail/bewerken dialoog -->
    <div class="dialoog-achtergrond" id="ll-bewerk-dialoog">
      <div class="dialoog">
        <h3 id="ll-bewerk-titel">Leerling bewerken</h3>
        <input type="hidden" id="bw-leerling-id">
        <label>Voornaam</label>
        <input type="text" id="bw-voornaam">
        <label>Achternaam</label>
        <input type="text" id="bw-achternaam">
        <label>Startdatum</label>
        <input type="date" id="bw-startdatum">
        <label>Uitschrijven vanaf (optioneel)</label>
        <input type="date" id="bw-einddatum">
        <div class="hint">Laat leeg als het kind nog steeds op school zit. Eens ingevuld: vanaf deze datum verdwijnt het kind uit nieuwe maanden, maar historische ingevulde data blijft bewaard.</div>
        <label>
          <input type="checkbox" id="bw-personeelskind" style="width:auto; margin-right:6px;">
          Personeelskind (hele rij grijs, geen refterkosten)
        </label>
        <div class="dialoog-knoppen">
          <button onclick="sluitDialoog('ll-bewerk-dialoog')">Annuleren</button>
          <button class="gevaar" onclick="leerlingVerwijderen()">🗑️ Volledig wissen</button>
          <button class="accent" onclick="leerlingOpslaan()">Opslaan</button>
        </div>
      </div>
    </div>
  `;

  refterTabelVullen();
}

function vandaagISO() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

window.refterMaandWisselen = function (delta) {
  const [j, m] = refterHuidigeMaand.split('-').map(Number);
  const d = new Date(j, m - 1 + delta, 1);
  const nJ = d.getFullYear();
  const nM = String(d.getMonth() + 1).padStart(2, '0');
  refterHuidigeMaand = `${nJ}-${nM}`;
  refterTabelVullen();
};

function refterTabelVullen() {
  const tabel = document.getElementById('refter-tabel');
  if (!tabel) return;

  const [jaar, maand] = refterHuidigeMaand.split('-').map(Number);
  const maandNamen = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December'];
  document.getElementById('refter-maand-titel').textContent = `${maandNamen[maand - 1]} ${jaar}`;

  const dagen = dagenVanMaand(refterHuidigeMaand);
  const klas = state.klassen[state.huidigeKlasId];
  const actieveLeerlingen = klas.leerlingen.filter(l => {
    // Toon leerling in deze maand als: nog niet uitgeschreven VÓÓR deze maand
    if (!l.einddatum) return true;
    const maandEind = dagen[dagen.length - 1];
    return l.einddatum >= dagen[0];
  });

  const invKey = state.huidigeKlasId + '|' + refterHuidigeMaand;
  if (!state.refter_invullingen[invKey]) state.refter_invullingen[invKey] = {};
  const invullingen = state.refter_invullingen[invKey];

  // HEAD
  let html = '<thead><tr>';
  html += '<th class="naam-kop">Leerling</th>';
  dagen.forEach(d => {
    const soort = dagSoort(d);
    const nr = parseInt(d.split('-')[2]);
    const titel = geefDagTitel(d);
    const isVergrendeld = soort === 'schooldag' && isDatumGeblokkeerd(state.huidigeKlasId, d);
    const extraClass = isVergrendeld ? ' kop-vergrendeld' : '';
    const titelTekst = isVergrendeld ? '🔒 Vergrendeld door secretariaat' : titel;
    html += `<th class="${soort}${extraClass}"${titelTekst ? ' title="' + titelTekst + '"' : ''}>
      <div class="dag-nr">${nr}${isVergrendeld ? ' 🔒' : ''}</div>
      <div class="dag-weekdag">${weekdagKort(d)}</div>
    </th>`;
  });
  html += '</tr></thead>';

  // BODY
  html += '<tbody>';
  if (actieveLeerlingen.length === 0) {
    html += `<tr><td colspan="${dagen.length + 1}" style="padding:30px; text-align:center; color:var(--tekst-zacht);">
      Geen leerlingen in deze klas. Klik op "Leerlingen beheren" om er toe te voegen.
    </td></tr>`;
  } else {
    actieveLeerlingen.forEach(l => {
      html += '<tr>';
      const info = [];
      if (l.personeelskind) info.push('⚹ personeelskind');
      if (l.startdatum && l.startdatum > dagen[0]) {
        info.push('sinds ' + formatDag(l.startdatum));
      }
      if (l.einddatum && l.einddatum <= dagen[dagen.length - 1]) {
        info.push('tot ' + formatDag(l.einddatum));
      }
      html += `<td class="naam-cel">
        <div style="display:flex; justify-content:space-between; align-items:start; gap:8px;">
          <div style="flex:1;">
            <div style="font-weight:600;">${escapeHtml(l.naam)}</div>
            ${info.length ? `<div class="leerling-info">${info.join(' · ')}</div>` : ''}
          </div>
          <button class="verwijder-knop" onclick="openLeerlingBewerken('${l.id}')" title="Bewerken">✏️</button>
        </div>
      </td>`;

      dagen.forEach(d => {
        const soort = dagSoort(d);
        // Check of leerling in deze periode zit
        let buitenPeriode = false;
        if (l.startdatum && d < l.startdatum) buitenPeriode = true;
        if (l.einddatum && d >= l.einddatum) buitenPeriode = true;

        if (l.personeelskind) {
          html += `<td class="personeelskind" title="Personeelskind"></td>`;
        } else if (buitenPeriode) {
          html += `<td class="niet-ingeschreven" title="Buiten inschrijvingsperiode"></td>`;
        } else if (soort !== 'schooldag') {
          html += `<td class="${soort}"></td>`;
        } else {
          // Standaard = 'aan' (at mee), tenzij expliciet 'uit' of 'leeg' gezet
          const status = invullingen[l.id + '|' + d] || 'aan';
          const symbool = status === 'uit' ? '✗' : '';
          // Vergrendeld door secretariaat? In secretariaat-modus mag het wel.
          const vergrendeld = isDatumGeblokkeerd(state.huidigeKlasId, d) && state.huidigeRol !== 'secretariaat';
          const extraClass = vergrendeld ? ' vergrendeld' : '';
          const titel = vergrendeld ? `🔒 Vergrendeld door secretariaat (verwerkt voor facturatie)` : '';
          html += `<td class="${status === 'leeg' ? 'schooldag' : status}${extraClass}" onclick="refterCelKlik('${l.id}', '${d}')"${titel ? ` title="${titel}"` : ''}>${symbool}</td>`;
        }
      });
      html += '</tr>';
    });
  }
  html += '</tbody>';

  tabel.innerHTML = html;

  refterSamenvattingTonen();
}

function geefDagTitel(datumISO) {
  const s = dagSoort(datumISO);
  if (s === 'vakantie') return isVakantie(datumISO);
  if (s === 'feestdag') return isWettelijkeFeestdag(datumISO);
  if (s === 'schoolvrij') return isSchoolVrijeDag(datumISO);
  if (s === 'woensdag') return 'Woensdagnamiddag — geen refter';
  if (s === 'weekend') return 'Weekend';
  return '';
}

function formatDag(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

window.refterCelKlik = function (leerlingId, datumISO) {
  const klasId = state.huidigeKlasId;
  // Vergrendeld door secretariaat? Leerkracht mag niet wijzigen, secretariaat wel.
  if (isDatumGeblokkeerd(klasId, datumISO) && state.huidigeRol !== 'secretariaat') {
    alert(`🔒 Deze datum is vergrendeld door secretariaat (verwerkt voor facturatie tot ${formatDag(state.refter_geblokkeerd_tot[klasId])}).\n\nMeld correcties aan het secretariaat — zij kunnen het wel nog wijzigen.`);
    return;
  }
  const invKey = klasId + '|' + refterHuidigeMaand;
  const k = leerlingId + '|' + datumISO;
  if (!state.refter_invullingen[invKey]) state.refter_invullingen[invKey] = {};
  const huidig = state.refter_invullingen[invKey][k] || 'aan';
  // Simpele toggle: aan ↔ afwezig
  if (huidig === 'uit') {
    delete state.refter_invullingen[invKey][k]; // default is 'aan', dus niet opslaan
  } else {
    state.refter_invullingen[invKey][k] = 'uit';
  }
  bewaarState(state);
  refterTabelVullen();
};

window.refterAllesAan = function () {
  const invKey = state.huidigeKlasId + '|' + refterHuidigeMaand;
  if (!confirm('Alle cellen op "at in refter" zetten voor deze maand? Eventuele afwezigheden worden gewist.')) return;
  state.refter_invullingen[invKey] = {};
  bewaarState(state);
  refterTabelVullen();
};

function refterSamenvattingTonen() {
  const samenvatting = document.getElementById('refter-samenvatting');
  if (!samenvatting) return;

  const dagen = dagenVanMaand(refterHuidigeMaand);
  const klas = state.klassen[state.huidigeKlasId];
  const invKey = state.huidigeKlasId + '|' + refterHuidigeMaand;
  const invullingen = state.refter_invullingen[invKey] || {};

  let totaalMaaltijden = 0;
  let totaalAfwezig = 0;
  const schooldagen = dagen.filter(d => dagSoort(d) === 'schooldag');

  klas.leerlingen.forEach(l => {
    if (l.personeelskind) return;
    schooldagen.forEach(d => {
      if (l.startdatum && d < l.startdatum) return;
      if (l.einddatum && d >= l.einddatum) return;
      const s = invullingen[l.id + '|' + d] || 'aan';
      if (s === 'aan') totaalMaaltijden++;
      else if (s === 'uit') totaalAfwezig++;
    });
  });

  samenvatting.innerHTML = `
    <span>📅 <strong>${schooldagen.length}</strong> refterdagen deze maand</span>
    <span>🍽️ <strong>${totaalMaaltijden}</strong> maaltijden</span>
    <span>❌ <strong>${totaalAfwezig}</strong> afwezigheden</span>
    <span style="margin-left:auto; color:var(--tekst-zacht); font-style:italic;">
      💡 Voor facturatie verwerkt secretariaat dit
    </span>
  `;
}

// ==============================================
// LEERLING BEHEER
// ==============================================
window.openLeerlingBeheer = function () {
  vulLeerlingenLijst();
  document.getElementById('ll-dialoog').classList.add('open');
};

window.sluitDialoog = function (id) {
  document.getElementById(id).classList.remove('open');
};

function vulLeerlingenLijst() {
  const lijst = document.getElementById('ll-lijst');
  const klas = state.klassen[state.huidigeKlasId];
  const actief = klas.leerlingen.filter(l => !l.einddatum);
  const uitgeschreven = klas.leerlingen.filter(l => l.einddatum);

  let html = '';
  actief.forEach(l => {
    const icoontjes = [];
    if (l.personeelskind) icoontjes.push('⚹');
    if (l.startdatum && l.startdatum > '2026-09-01') icoontjes.push('🆕');
    html += `
      <div style="padding:8px 12px; border-bottom:1px solid var(--rand); display:flex; justify-content:space-between; align-items:center;">
        <div>
          <strong>${escapeHtml(l.naam)}</strong> ${icoontjes.join(' ')}
          ${l.startdatum && l.startdatum > '2026-09-01' ? `<span style="font-size:0.82em; color:var(--tekst-zacht);"> · sinds ${formatDag(l.startdatum)}</span>` : ''}
        </div>
        <button onclick="openLeerlingBewerken('${l.id}')" style="padding:4px 10px; font-size:0.85em; border:1.5px solid var(--rand-donker); background:var(--wit); border-radius:6px; cursor:pointer;">Wijzigen</button>
      </div>
    `;
  });

  if (uitgeschreven.length > 0) {
    html += `<div style="padding:8px 12px; background:var(--creme); font-weight:600; font-size:0.9em; color:var(--tekst-zacht);">🗂️ Uitgeschreven</div>`;
    uitgeschreven.forEach(l => {
      html += `
        <div style="padding:8px 12px; border-bottom:1px solid var(--rand); opacity:0.7; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <span style="text-decoration:line-through;">${escapeHtml(l.naam)}</span>
            <span style="font-size:0.82em; color:var(--tekst-zacht);"> · tot ${formatDag(l.einddatum)}</span>
          </div>
          <button onclick="openLeerlingBewerken('${l.id}')" style="padding:4px 10px; font-size:0.85em; border:1.5px solid var(--rand-donker); background:var(--wit); border-radius:6px; cursor:pointer;">Bekijken</button>
        </div>
      `;
    });
  }

  lijst.innerHTML = html || '<div style="padding:20px; text-align:center; color:var(--tekst-zacht);">Nog geen leerlingen.</div>';
}

window.leerlingToevoegen = function () {
  const voornaam = document.getElementById('nw-voornaam').value.trim();
  const achternaam = document.getElementById('nw-achternaam').value.trim();
  const startdatum = document.getElementById('nw-startdatum').value;
  if (!voornaam || !achternaam) {
    alert('Vul zowel voor- als achternaam in.');
    return;
  }
  if (!startdatum) {
    alert('Kies een startdatum.');
    return;
  }
  const klas = state.klassen[state.huidigeKlasId];
  const nieuw = {
    id: state.huidigeKlasId + '-l' + Date.now(),
    voornaam: voornaam,
    achternaam: achternaam,
    naam: achternaam + ' ' + voornaam,
    startdatum: startdatum,
    einddatum: null,
    personeelskind: false
  };
  klas.leerlingen.push(nieuw);
  // Alfabetisch sorteren
  klas.leerlingen.sort((a, b) => {
    if (a.achternaam !== b.achternaam) return a.achternaam.localeCompare(b.achternaam);
    return a.voornaam.localeCompare(b.voornaam);
  });
  bewaarState(state);

  // Reset formulier
  document.getElementById('nw-voornaam').value = '';
  document.getElementById('nw-achternaam').value = '';
  document.getElementById('nw-startdatum').value = vandaagISO();

  vulLeerlingenLijst();
  refterTabelVullen();
};

window.openLeerlingBewerken = function (leerlingId) {
  const klas = state.klassen[state.huidigeKlasId];
  const l = klas.leerlingen.find(x => x.id === leerlingId);
  if (!l) return;

  document.getElementById('ll-bewerk-titel').textContent = `Bewerken: ${l.naam}`;
  document.getElementById('bw-leerling-id').value = leerlingId;
  document.getElementById('bw-voornaam').value = l.voornaam;
  document.getElementById('bw-achternaam').value = l.achternaam;
  document.getElementById('bw-startdatum').value = l.startdatum || '';
  document.getElementById('bw-einddatum').value = l.einddatum || '';
  document.getElementById('bw-personeelskind').checked = !!l.personeelskind;

  document.getElementById('ll-bewerk-dialoog').classList.add('open');
};

window.leerlingOpslaan = function () {
  const id = document.getElementById('bw-leerling-id').value;
  const klas = state.klassen[state.huidigeKlasId];
  const l = klas.leerlingen.find(x => x.id === id);
  if (!l) return;
  l.voornaam = document.getElementById('bw-voornaam').value.trim();
  l.achternaam = document.getElementById('bw-achternaam').value.trim();
  l.naam = l.achternaam + ' ' + l.voornaam;
  l.startdatum = document.getElementById('bw-startdatum').value || null;
  l.einddatum = document.getElementById('bw-einddatum').value || null;
  l.personeelskind = document.getElementById('bw-personeelskind').checked;

  // Alfabetisch sorteren
  klas.leerlingen.sort((a, b) => {
    if (a.achternaam !== b.achternaam) return a.achternaam.localeCompare(b.achternaam);
    return a.voornaam.localeCompare(b.voornaam);
  });
  bewaarState(state);
  sluitDialoog('ll-bewerk-dialoog');
  vulLeerlingenLijst();
  refterTabelVullen();
};

window.leerlingVerwijderen = function () {
  const id = document.getElementById('bw-leerling-id').value;
  const klas = state.klassen[state.huidigeKlasId];
  const l = klas.leerlingen.find(x => x.id === id);
  if (!l) return;
  if (!confirm(`${l.naam} VOLLEDIG wissen?\n\nDit wist ook alle ingevulde refterdagen. Kan niet ongedaan gemaakt worden.\n\nVoor kinderen die de school verlaten: gebruik liever "Uitschrijven vanaf" (einddatum).`)) return;
  klas.leerlingen = klas.leerlingen.filter(x => x.id !== id);
  // Verwijder ook alle ingevulde refterdagen
  Object.keys(state.refter_invullingen).forEach(maandKey => {
    if (maandKey.startsWith(state.huidigeKlasId + '|')) {
      const inv = state.refter_invullingen[maandKey];
      Object.keys(inv).forEach(k => {
        if (k.startsWith(id + '|')) delete inv[k];
      });
    }
  });
  bewaarState(state);
  sluitDialoog('ll-bewerk-dialoog');
  vulLeerlingenLijst();
  refterTabelVullen();
};

// ==============================================
// SECRETARIAAT DASHBOARD (basis)
// ==============================================
function toonSecretariaatDashboard() {
  // Meldingen-zone leegmaken (secretariaat heeft eigen overzicht)
  document.getElementById('meldingen-zone').innerHTML = '';

  // Bereken echte tellingen voor de tegels
  let aantalNietKlaar = 0;
  let aantalKlaarNogTeBestellen = 0;
  let aantalUitstappen = 0;
  KLASSEN.forEach(k => {
    const klasData = state.klassen[k.id];
    const totaal = klasData.werkboeken.length;
    const besteld = klasData.werkboeken.filter(w => state.werkboeken_besteld[k.id + '|' + w.id]).length;
    const isKlaar = !!state.werkboeken_klaar[k.id];
    if (!isKlaar) aantalNietKlaar++;
    else if (besteld < totaal) aantalKlaarNogTeBestellen++;
    aantalUitstappen += (state.uitstappen[k.id] || []).length;
  });

  const wbBadge = aantalNietKlaar > 0
    ? `<span class="badge rood">${aantalNietKlaar} klas(sen) nog niet klaar</span>`
    : aantalKlaarNogTeBestellen > 0
      ? `<span class="badge geel">${aantalKlaarNogTeBestellen} klas(sen) te bestellen</span>`
      : `<span class="badge groen">Alles besteld</span>`;

  const hoofdpaneel = document.getElementById('hoofdpaneel');
  hoofdpaneel.innerHTML = `
    <div class="tegel-grid">

      <button class="tegel" onclick="secModuleOpenen('werkboeken')">
        <div class="icoon">📚</div>
        <h3>Werkboeken-bestelling</h3>
        <p>Per klas zien welke werkboeken besteld moeten worden. Afvinken wat besteld is.</p>
        ${wbBadge}
      </button>

      <button class="tegel" onclick="secModuleOpenen('refter')">
        <div class="icoon">🍽️</div>
        <h3>Refterlijsten</h3>
        <p>Overzicht alle klassen. Exporteer naar facturatiesysteem. Blokkeer verwerkte weken.</p>
        <span class="badge geel">In opbouw</span>
      </button>

      <button class="tegel" onclick="secModuleOpenen('uitstappen')">
        <div class="icoon">🚌</div>
        <h3>Uitstappen</h3>
        <p>Overzicht uitstappen, deelnemers, totalen per kind voor facturatie.</p>
        <span class="badge groen">${aantalUitstappen} geplande uitstap(pen)</span>
      </button>

      <button class="tegel" onclick="secModuleOpenen('deadlines')">
        <div class="icoon">⏰</div>
        <h3>Deadlines instellen</h3>
        <p>Bepaal wanneer leerkrachten bepaalde taken klaar moeten hebben.</p>
        <span class="badge geel">In opbouw</span>
      </button>

    </div>

    <div class="sec-paneel">
      <h2>📊 Status-overzicht vandaag</h2>
      ${maakStatusOverzicht()}
    </div>
  `;
}

function maakStatusOverzicht() {
  const labelKleur = (k) => {
    if (k === '—') return '<span style="color:var(--tekst-zacht);">—</span>';
    const label = { groen: 'In orde', geel: 'Bezig', rood: 'Te laat' }[k];
    return `<span class="status-bolletje ${k}"></span>${label}`;
  };

  // Bereken echte werkboeken-status per klas
  function werkboekenStatus(klasId) {
    const klasData = state.klassen[klasId];
    const totaalWb = klasData.werkboeken.length;
    const besteldAantal = klasData.werkboeken.filter(w =>
      state.werkboeken_besteld[klasId + '|' + w.id]
    ).length;
    const isKlaar = !!state.werkboeken_klaar[klasId];
    if (besteldAantal === totaalWb && totaalWb > 0) return 'groen';
    if (isKlaar) return 'geel';
    return 'rood';
  }

  // Refter-status: heeft secretariaat al maand verwerkt (= blokkering)?
  function refterStatus(klasId) {
    const dagen = dagenVanMaand('2026-11');
    if (dagen.length === 0) return '—';
    const blok = state.refter_geblokkeerd_tot[klasId];
    if (!blok) return 'rood'; // niets verwerkt
    if (blok >= dagen[dagen.length - 1]) return 'groen'; // hele maand verwerkt
    if (blok >= dagen[0]) return 'geel'; // deels verwerkt
    return 'rood';
  }

  // Uitstap-status: zijn er ongeplande/ongevulde uitstappen deze maand?
  function uitstapStatus(klasId) {
    const u = state.uitstappen[klasId] || [];
    const dezeMaand = u.filter(x => x.datum.startsWith('2026-11'));
    if (dezeMaand.length === 0) return '—';
    return 'groen'; // demo: altijd ok als er data is
  }

  return `
    <table class="sec-tabel">
      <thead>
        <tr>
          <th>Klas</th>
          <th>Leerkracht</th>
          <th>🍽️ Refter deze maand</th>
          <th>📚 Werkboeken</th>
          <th>🚌 Uitstap deze maand</th>
        </tr>
      </thead>
      <tbody>
        ${KLASSEN.map(k => {
          return `
            <tr>
              <td><strong>${k.klas}</strong></td>
              <td>${k.leerkracht}</td>
              <td>${labelKleur(refterStatus(k.id))}</td>
              <td>${labelKleur(werkboekenStatus(k.id))}</td>
              <td>${labelKleur(uitstapStatus(k.id))}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
    <p style="margin-top:14px; font-size:0.85em; color:var(--tekst-zacht);">
      💡 Klik op een tegel hierboven om naar de detail-modules te gaan.
    </p>
  `;
}

window.secModuleOpenen = function (modulenaam) {
  if (modulenaam === 'werkboeken') { toonSecWerkboeken(); return; }
  if (modulenaam === 'refter') { toonSecRefter(); return; }

  const hoofdpaneel = document.getElementById('hoofdpaneel');
  const titels = {
    uitstappen: '🚌 Uitstappen (alle klassen)',
    deadlines: '⏰ Deadlines instellen'
  };
  const beschrijvingen = {
    uitstappen: '<strong>Zal bevatten:</strong><br>• Overzicht alle geplande uitstappen<br>• Per uitstap: deelnemerslijst<br>• Totalen per kind voor facturatie<br>• Excel-export',
    deadlines: '<strong>Zal bevatten:</strong><br>• Refter: elke [woensdag] om [12:00]<br>• Werkboeken: deadline [datum]<br>• Uitstappen: [aantal] dagen voor datum<br>• Hoeveel dagen vooraf waarschuwen'
  };

  hoofdpaneel.innerHTML = `
    <button class="terug-knop" onclick="rolToepassen()">← Terug naar dashboard</button>
    <div class="placeholder">
      <h3>${titels[modulenaam] || modulenaam}</h3>
      <p>${beschrijvingen[modulenaam] || 'Module komt in volgende build.'}</p>
      <div class="mini">Deze module wordt ingevuld in een volgende stap van de demo-build.</div>
    </div>
  `;
};

// ==============================================
// KLASBEHEER MODULE (LEERKRACHT) - vereenvoudigd met "klaar"-knop
// ==============================================
function toonKlasbeheerModule() {
  const klas = KLASSEN.find(k => k.id === state.huidigeKlasId);
  const klasData = state.klassen[state.huidigeKlasId];
  const isKlaar = !!state.werkboeken_klaar[state.huidigeKlasId];
  const hoofdpaneel = document.getElementById('hoofdpaneel');
  document.getElementById('meldingen-zone').innerHTML = '';

  hoofdpaneel.innerHTML = `
    <button class="terug-knop" onclick="rolToepassen()">← Terug naar dashboard</button>

    <div class="werkboeken-klaar-paneel">
      <h2 style="margin:0; color:var(--accent-donker);">📚 Klasbeheer — Klas ${klas.klas}</h2>
      <p style="margin:4px 0 0 0; color:var(--tekst-zacht); font-size:0.92em;">
        ${klas.leerkracht} · ${klas.leerjaar}
      </p>

      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:18px;">
        <button class="rol-knop" onclick="alert('In de echte versie opent dit jouw bestaande Werkboeken-tab.')">📚 Werkboeken</button>
        <button class="rol-knop" onclick="alert('In de echte versie opent dit jouw bestaande Lyreco-tab.')">🖍️ Lyreco</button>
        <button class="rol-knop" onclick="alert('In de echte versie opent dit jouw bestaande Stock-tab.')">📦 Stock klasmateriaal</button>
        <button class="rol-knop" onclick="alert('In de echte versie opent dit jouw bestaande Knutsel-tab.')">✂️ Knutselideetjes</button>
      </div>

      <div class="status-box ${isKlaar ? 'klaar' : ''}">
        <div style="font-size:2em;">${isKlaar ? '✅' : '📋'}</div>
        <div class="status-tekst">
          <strong style="font-size:1.05em;">
            ${isKlaar ? 'Werkboeken doorgegeven aan secretariaat' : 'Werkboeken nog niet doorgegeven aan secretariaat'}
          </strong><br>
          <span style="color:var(--tekst-zacht); font-size:0.92em;">
            ${isKlaar
              ? 'Secretariaat kan nu de PDF downloaden en de bestelling plaatsen. Je kan deze status terugdraaien als je nog wil wijzigen.'
              : 'Zodra je werkboeken-lijst volledig is, klik je op de knop om te laten weten dat ze klaar is voor bestelling.'}
          </span>
        </div>
        ${isKlaar
          ? `<button class="rol-knop" onclick="werkboekenKlaarToggle()">↩️ Terug naar bewerken</button>`
          : `<button class="rol-knop actief" onclick="werkboekenKlaarToggle()">✓ Klaar voor secretariaat</button>`}
      </div>

      <h3 style="margin:20px 0 10px 0; color:var(--accent-donker); font-size:1em;">📋 Jouw werkboeken (overzicht)</h3>
      <div class="werkboeken-lijst">
        <div class="wb-regel kop">
          <div>Methode / Werkschrift</div>
          <div class="uitg-col"></div>
          <div class="aantal-col">Aantal</div>
          <div style="text-align:center;">Besteld?</div>
        </div>
        ${(() => {
          // Groepeer werkboeken per methode
          const groepen = {};
          klasData.werkboeken.forEach(w => {
            if (!groepen[w.methode]) groepen[w.methode] = [];
            groepen[w.methode].push(w);
          });
          let html = '';
          Object.keys(groepen).forEach(methodeNaam => {
            const delen = groepen[methodeNaam];
            const aantalBesteld = delen.filter(w => state.werkboeken_besteld[state.huidigeKlasId + '|' + w.id]).length;
            const totaal = delen.length;
            const allesBesteld = aantalBesteld === totaal;
            const deelsBesteld = aantalBesteld > 0 && aantalBesteld < totaal;

            // Methode-hoofdrij
            html += `
              <div class="wb-regel" style="background: var(--creme-warm); border-top: 2px solid var(--rand);">
                <div style="color: var(--accent-donker); font-weight: 700;">${escapeHtml(methodeNaam)}</div>
                <div class="uitg-col" style="font-size:0.88em; color:var(--tekst-zacht); font-style:italic;">${aantalBesteld}/${totaal} besteld</div>
                <div class="aantal-col" style="text-align:center; font-weight: 600;">${delen.reduce((s, w) => s + w.aantal, 0)}</div>
                <div class="besteld-vak">
                  ${allesBesteld
                    ? '<span style="color:var(--groen); font-weight:700;">✓ alles</span>'
                    : deelsBesteld
                      ? '<span style="color:var(--geel);" title="Deel besteld">◐</span>'
                      : '<span style="color:var(--tekst-zacht);">—</span>'}
                </div>
              </div>
            `;
            // Sub-rijen
            delen.forEach(w => {
              const besteldKey = state.huidigeKlasId + '|' + w.id;
              const besteld = !!state.werkboeken_besteld[besteldKey];
              html += `
                <div class="wb-regel" style="padding-left: 28px;">
                  <div style="color: var(--tekst-zacht);">↳ ${escapeHtml(w.deel)}</div>
                  <div class="uitg-col"></div>
                  <div class="aantal-col" style="text-align:center;">${w.aantal}</div>
                  <div class="besteld-vak">
                    ${besteld
                      ? '<span style="color:var(--groen);" title="Secretariaat heeft deze besteld">✓ Besteld</span>'
                      : '<span style="color:var(--tekst-zacht);">—</span>'}
                  </div>
                </div>
              `;
            });
          });
          return html;
        })()}
      </div>

      <p style="margin-top:14px; font-size:0.85em; color:var(--tekst-zacht);">
        💡 In de echte versie zie je hier jouw volledige werkboeken-tab zoals je die nu al gebruikt.
        Het enige nieuwe is de "Klaar voor secretariaat"-knop én de status of iets al besteld is.
      </p>
    </div>
  `;
}

window.werkboekenKlaarToggle = function () {
  const klasId = state.huidigeKlasId;
  if (state.werkboeken_klaar[klasId]) {
    if (!confirm('Status terugdraaien?\n\nSecretariaat ziet dan opnieuw "nog niet klaar".')) return;
    delete state.werkboeken_klaar[klasId];
  } else {
    state.werkboeken_klaar[klasId] = {
      tijdstip: new Date().toISOString(),
      leerkracht: KLASSEN.find(k => k.id === klasId).leerkracht
    };
  }
  bewaarState(state);
  toonKlasbeheerModule();
};

// ==============================================
// UITSTAP MODULE (LEERKRACHT)
// ==============================================
let uitstapHuidigeMaand = '2026-11';

function toonUitstapModule() {
  const klas = KLASSEN.find(k => k.id === state.huidigeKlasId);
  const hoofdpaneel = document.getElementById('hoofdpaneel');
  document.getElementById('meldingen-zone').innerHTML = '';
  // Container breder maken voor de grote tabel
  document.querySelector('.container').classList.add('breed');

  hoofdpaneel.innerHTML = `
    <button class="terug-knop" onclick="rolToepassen()">← Terug naar dashboard</button>

    <div class="refter-wrapper">
      <h2 style="margin:0 0 6px 0; color:var(--accent-donker);">🚌 Uitstappen — Klas ${klas.klas}</h2>
      <p style="margin:0 0 14px 0; color:var(--tekst-zacht); font-size:0.92em;">
        Per maand zie je alle uitstappen. Standaard gaat iedereen mee (✓). Klik op een cel om iemand op afwezig te zetten (✗). Secretariaat ziet welke uitstappen elk kind deed, met bijhorende prijs voor de factuur.
      </p>

      <div class="refter-toolbar">
        <div class="maand-nav">
          <button onclick="uitstapMaandWisselen(-1)">◀</button>
          <span class="maand-titel" id="uitstap-maand-titel"></span>
          <button onclick="uitstapMaandWisselen(1)">▶</button>
        </div>
        <button class="accent" onclick="openUitstapToevoegen()">➕ Uitstap toevoegen</button>
        <button onclick="toonUitstapSamenvatting()">📊 Samenvatting per uitstap</button>
        <button onclick="openRapportGenerator()" title="Genereer overzicht voor ouders (max. factuur)">📄 Overzicht max. factuur</button>
      </div>

      <div id="uitstap-inhoud"></div>
    </div>

    <!-- Samenvatting per uitstap dialoog -->
    <div class="dialoog-achtergrond" id="uitstap-samenvatting-dialoog">
      <div class="dialoog" style="max-width:720px;">
        <h3 id="uitstap-samenvatting-titel">📊 Samenvatting per uitstap</h3>
        <p style="font-size:0.9em; color:var(--tekst-zacht); margin:-4px 0 16px 0;">
          Aantal deelnemers en totale opbrengst per uitstap in deze maand.
        </p>
        <div id="uitstap-samenvatting-inhoud"></div>
        <div class="dialoog-knoppen">
          <button onclick="sluitDialoog('uitstap-samenvatting-dialoog')">Sluiten</button>
        </div>
      </div>
    </div>

    <!-- Rapport generator dialoog -->
    <div class="dialoog-achtergrond" id="rp-dialoog">
      <div class="dialoog" style="max-width:640px;">
        <h3>📄 Overzicht maximumfactuur voor ouders</h3>
        <p style="font-size:0.92em; color:var(--tekst-zacht); margin:0 0 16px 0;">
          Genereer een overzicht per leerling met alle uitstappen van dit schooljaar die aangerekend werden.
          <strong>Cumulatief opgebouwd</strong>: rapport 1 toont sept-dec, rapport 2 toont sept t.e.m. maart, rapport 3 het volledige schooljaar.
        </p>

        <label>Rapportperiode</label>
        <select id="rp-periode">
          <option value="r1">Rapport 1 — september tot en met december</option>
          <option value="r2">Rapport 2 — september tot en met maart (cumulatief)</option>
          <option value="r3" selected>Rapport 3 — volledig schooljaar (cumulatief)</option>
          <option value="custom">Aangepaste einddatum…</option>
        </select>
        <div class="hint">Het overzicht begint altijd op 1 september en loopt tot de gekozen einddatum.</div>

        <div id="rp-custom-blok" style="display:none;">
          <label>Einddatum (custom)</label>
          <input type="date" id="rp-tot-custom" value="2027-06-30" onchange="document.getElementById('rp-tot').value = this.value;">
        </div>
        <input type="hidden" id="rp-tot" value="2027-06-30">

        <label>Wat genereren?</label>
        <select id="rp-formaat">
          <option value="per-leerling">Voor alle leerlingen van de klas</option>
          <option value="voorbeeld">Voorbeeld voor 1 leerling (om te testen)</option>
        </select>

        <div id="rp-voorbeeld-leerling" style="display:none;">
          <label>Welke leerling?</label>
          <select id="rp-leerling-select"></select>
        </div>

        <div style="background:var(--geel-licht); border-left:4px solid var(--geel); padding:10px 14px; border-radius:6px; font-size:0.88em; margin-top:12px;">
          <strong>💡 In deze demo:</strong> het overzicht opent in een nieuw venster als print-voorbeeld.
          In de echte versie kan je dit als PDF/Word opslaan of afdrukken.
        </div>

        <div class="dialoog-knoppen">
          <button onclick="sluitDialoog('rp-dialoog')">Annuleren</button>
          <button class="accent" onclick="genereerRapport()">📄 Genereren</button>
        </div>
      </div>
    </div>

    <!-- Uitstap toevoegen dialoog -->
    <div class="dialoog-achtergrond" id="us-dialoog">
      <div class="dialoog">
        <h3 id="us-dialoog-titel">➕ Nieuwe activiteit of bestelling</h3>
        <input type="hidden" id="us-id">

        <label>Type</label>
        <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:12px;">
          <label style="display:flex; align-items:flex-start; gap:10px; padding:10px 12px; border:1.5px solid var(--rand); border-radius:8px; cursor:pointer; font-weight:400;">
            <input type="radio" name="us-type" value="activiteit" checked style="margin-top:3px; flex-shrink:0;">
            <div>
              <div style="font-weight:600;">🎓 Activiteit — telt mee op maximumfactuur</div>
              <div style="font-size:0.85em; color:var(--tekst-zacht);">Iedereen doet mee, enkel afwezigen aanvinken. Bv. zwemmen, uitstap, film.</div>
            </div>
          </label>
          <label style="display:flex; align-items:flex-start; gap:10px; padding:10px 12px; border:1.5px solid var(--rand); border-radius:8px; cursor:pointer; font-weight:400;">
            <input type="radio" name="us-type" value="bestelling" style="margin-top:3px; flex-shrink:0;">
            <div>
              <div style="font-weight:600;">🛒 Bestelling — buiten maximumfactuur</div>
              <div style="font-size:0.85em; color:var(--tekst-zacht);">Niemand bestelt tenzij aangevinkt. Bv. turn-t-shirt, badmuts, schoolfoto.</div>
            </div>
          </label>
        </div>

        <label>Naam</label>
        <input type="text" id="us-titel" placeholder="bv. Bezoek Technopolis of Turn-t-shirt">

        <label>Datum</label>
        <input type="date" id="us-datum">
        <div class="hint">De maand van deze datum bepaalt in welke maandlijst het verschijnt (voor secretariaat/facturatie).</div>

        <label>Kostprijs per kind (€)</label>
        <input type="text" id="us-prijs" placeholder="bv. 12,50">
        <div class="hint">Gebruik komma of punt voor decimalen (bv. 12,50 of 12.50).</div>

        <div class="dialoog-knoppen">
          <button onclick="sluitDialoog('us-dialoog')">Annuleren</button>
          <button id="us-verwijder-knop" class="gevaar" onclick="uitstapVerwijderen()" style="display:none;">🗑️ Verwijderen</button>
          <button class="accent" onclick="uitstapOpslaan()">Opslaan</button>
        </div>
      </div>
    </div>
  `;

  uitstapInhoudVullen();
}

window.uitstapMaandWisselen = function (delta) {
  const [j, m] = uitstapHuidigeMaand.split('-').map(Number);
  const d = new Date(j, m - 1 + delta, 1);
  uitstapHuidigeMaand = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  uitstapInhoudVullen();
};

function uitstapInhoudVullen() {
  const inhoud = document.getElementById('uitstap-inhoud');
  if (!inhoud) return;

  const [jaar, maand] = uitstapHuidigeMaand.split('-').map(Number);
  const maandNamen = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December'];
  document.getElementById('uitstap-maand-titel').textContent = `${maandNamen[maand - 1]} ${jaar}`;

  const klasId = state.huidigeKlasId;
  const alleUitstappen = state.uitstappen[klasId] || [];
  // Filter op deze maand
  const uitstappenMaand = alleUitstappen.filter(u => u.datum.startsWith(uitstapHuidigeMaand));
  // Sorteer op datum
  uitstappenMaand.sort((a, b) => a.datum.localeCompare(b.datum));

  if (uitstappenMaand.length === 0) {
    inhoud.innerHTML = `
      <div class="placeholder">
        <h3>Geen uitstappen in ${maandNamen[maand - 1]} ${jaar}</h3>
        <p>Klik op <strong>➕ Uitstap toevoegen</strong> om er een toe te voegen.</p>
      </div>
    `;
    return;
  }

  // Bouw de tabel: links namen, bovenaan uitstappen, cellen = deelname
  const klas = state.klassen[klasId];
  const actieveLL = klas.leerlingen.filter(l => {
    // Tonen alle leerlingen die tijdens deze maand op school waren
    const maandStart = uitstapHuidigeMaand + '-01';
    const maandEind = uitstapHuidigeMaand + '-31';
    if (l.einddatum && l.einddatum < maandStart) return false;
    if (l.startdatum && l.startdatum > maandEind) return false;
    return true;
  });

  let html = `
    <div class="uitstap-tabel-wrap">
      <table class="uitstap-tabel">
        <thead>
          <tr>
            <th class="naam-kop">Leerling</th>
  `;
  uitstappenMaand.forEach(u => {
    const type = u.type || 'activiteit';
    const icoon = type === 'bestelling' ? '🛒' : '🎓';
    const typeLabel = type === 'bestelling' ? 'Bestelling (buiten max. factuur)' : 'Activiteit';
    html += `<th class="kop-${type}" title="${typeLabel}">
      <div class="uitstap-titel">${icoon} ${escapeHtml(u.titel)}</div>
      <div class="uitstap-meta">${formatDag(u.datum)} · € ${u.prijs.toFixed(2).replace('.', ',')}</div>
      <div style="margin-top:4px;">
        <button onclick="openUitstapBewerken('${u.id}')" style="padding:2px 8px; font-size:0.75em; border:1px solid var(--rand-donker); background:var(--wit); border-radius:5px; cursor:pointer;">✏️</button>
      </div>
    </th>`;
  });
  html += `</tr></thead><tbody>`;

  actieveLL.forEach(l => {
    html += `<tr>`;
    html += `<td class="naam-cel">
      <div style="font-weight:600;">${escapeHtml(l.naam)}</div>
      ${l.personeelskind ? '<div class="leerling-info">⚹ personeelskind</div>' : ''}
    </td>`;
    uitstappenMaand.forEach(u => {
      const type = u.type || 'activiteit';
      if (type === 'bestelling') {
        // Bestelling: default = niet besteld, klik om aan te vinken
        const besteld = (u.deelnemers || {})[l.id] === 'besteld';
        const klasNaam = besteld ? 'deelname-cel besteld' : 'deelname-cel';
        const tekst = besteld ? '✓' : '';
        html += `<td class="${klasNaam}" onclick="toggleUitstapDeelname('${u.id}', '${l.id}')" title="${besteld ? 'Besteld — klik om terug te zetten' : 'Nog niet besteld — klik om aan te vinken'}">${tekst}</td>`;
      } else {
        // Activiteit: default = mee, klik om afwezig te markeren
        const status = (u.deelnemers || {})[l.id] || 'mee';
        const klasNaam = status === 'afwezig' ? 'deelname-cel afwezig' : 'deelname-cel';
        const tekst = status === 'afwezig' ? '✗' : '';
        html += `<td class="${klasNaam}" onclick="toggleUitstapDeelname('${u.id}', '${l.id}')" title="${status === 'afwezig' ? 'Afwezig — klik om aanwezig te maken' : 'Gaat mee — klik om afwezig te maken'}">${tekst}</td>`;
      }
    });
    html += `</tr>`;
  });
  html += '</tbody></table></div>';

  inhoud.innerHTML = html;
}

// Samenvatting per uitstap - opent als aparte dialoog
window.toonUitstapSamenvatting = function () {
  const klasId = state.huidigeKlasId;
  const alleUitstappen = state.uitstappen[klasId] || [];
  const uitstappenMaand = alleUitstappen
    .filter(u => u.datum.startsWith(uitstapHuidigeMaand))
    .sort((a, b) => a.datum.localeCompare(b.datum));
  const klas = state.klassen[klasId];
  const actieveLL = klas.leerlingen.filter(l => {
    const maandStart = uitstapHuidigeMaand + '-01';
    const maandEind = uitstapHuidigeMaand + '-31';
    if (l.einddatum && l.einddatum < maandStart) return false;
    if (l.startdatum && l.startdatum > maandEind) return false;
    return true;
  });

  const [jaar, maand] = uitstapHuidigeMaand.split('-').map(Number);
  const maandNamen = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December'];
  const maandLabel = `${maandNamen[maand - 1]} ${jaar}`;

  const inhoud = document.getElementById('uitstap-samenvatting-inhoud');
  document.getElementById('uitstap-samenvatting-titel').textContent = `📊 Samenvatting — ${maandLabel}`;

  if (uitstappenMaand.length === 0) {
    inhoud.innerHTML = `<p style="color:var(--tekst-zacht); text-align:center; padding:20px;">Geen activiteiten of bestellingen in ${maandLabel}.</p>`;
  } else {
    let h = '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:12px;">';
    uitstappenMaand.forEach(u => {
      const type = u.type || 'activiteit';
      const icoon = type === 'bestelling' ? '🛒' : '🎓';
      const typeKleur = type === 'bestelling' ? '#e8f1fb' : 'var(--creme-warm)';

      if (type === 'bestelling') {
        // Voor bestellingen: tel wie besteld heeft
        let aantalBesteld = 0;
        actieveLL.forEach(l => {
          if ((u.deelnemers || {})[l.id] === 'besteld') aantalBesteld++;
        });
        const totaal = aantalBesteld * u.prijs;
        h += `
          <div style="background:${typeKleur}; border-radius:10px; padding:12px 14px;">
            <strong style="color:var(--accent-donker);">${icoon} ${escapeHtml(u.titel)}</strong><br>
            <span style="font-size:0.82em; color:var(--tekst-zacht);">Bestelling · buiten max. factuur</span><br>
            <span style="font-size:0.88em; color:var(--tekst-zacht);">${formatDag(u.datum)} · € ${u.prijs.toFixed(2).replace('.', ',')} p.s.</span>
            <div style="margin-top:8px; font-size:0.92em;">
              🛒 ${aantalBesteld} besteld · ${actieveLL.length - aantalBesteld} niet<br>
              <strong>💰 Totaal: € ${totaal.toFixed(2).replace('.', ',')}</strong>
            </div>
          </div>
        `;
      } else {
        // Activiteit
        let aantalMee = 0;
        let aantalAfw = 0;
        actieveLL.forEach(l => {
          const s = (u.deelnemers || {})[l.id] || 'mee';
          if (s === 'mee') aantalMee++;
          else aantalAfw++;
        });
        const totaalOpbrengst = aantalMee * u.prijs;
        h += `
          <div style="background:${typeKleur}; border-radius:10px; padding:12px 14px;">
            <strong style="color:var(--accent-donker);">${icoon} ${escapeHtml(u.titel)}</strong><br>
            <span style="font-size:0.82em; color:var(--tekst-zacht);">Activiteit · op max. factuur</span><br>
            <span style="font-size:0.88em; color:var(--tekst-zacht);">${formatDag(u.datum)} · € ${u.prijs.toFixed(2).replace('.', ',')} p.p.</span>
            <div style="margin-top:8px; font-size:0.92em;">
              ✅ ${aantalMee} mee · ❌ ${aantalAfw} afwezig<br>
              <strong>💰 Totaal: € ${totaalOpbrengst.toFixed(2).replace('.', ',')}</strong>
            </div>
          </div>
        `;
      }
    });
    h += '</div>';
    inhoud.innerHTML = h;
  }

  document.getElementById('uitstap-samenvatting-dialoog').classList.add('open');
};

window.toggleUitstapDeelname = function (uitstapId, leerlingId) {
  const klasId = state.huidigeKlasId;
  const u = (state.uitstappen[klasId] || []).find(x => x.id === uitstapId);
  if (!u) return;
  if (!u.deelnemers) u.deelnemers = {};
  const type = u.type || 'activiteit';

  if (type === 'bestelling') {
    // Bestelling: default = niet besteld. Toggle tussen 'besteld' en niets.
    const isBesteld = u.deelnemers[leerlingId] === 'besteld';
    if (isBesteld) {
      delete u.deelnemers[leerlingId];
    } else {
      u.deelnemers[leerlingId] = 'besteld';
    }
  } else {
    // Activiteit: default = mee. Toggle tussen 'afwezig' en niets (niets = mee).
    const huidig = u.deelnemers[leerlingId] || 'mee';
    if (huidig === 'mee') {
      u.deelnemers[leerlingId] = 'afwezig';
    } else {
      delete u.deelnemers[leerlingId];
    }
  }

  bewaarState(state);
  uitstapInhoudVullen();
};

window.openUitstapToevoegen = function () {
  document.getElementById('us-dialoog-titel').textContent = '➕ Nieuwe activiteit of bestelling';
  document.getElementById('us-id').value = '';
  document.getElementById('us-titel').value = '';
  document.getElementById('us-datum').value = uitstapHuidigeMaand + '-01';
  document.getElementById('us-prijs').value = '';
  // Type default op 'activiteit'
  document.querySelector('input[name="us-type"][value="activiteit"]').checked = true;
  document.getElementById('us-verwijder-knop').style.display = 'none';
  document.getElementById('us-dialoog').classList.add('open');
};

window.openUitstapBewerken = function (uitstapId) {
  const klasId = state.huidigeKlasId;
  const u = (state.uitstappen[klasId] || []).find(x => x.id === uitstapId);
  if (!u) return;
  document.getElementById('us-dialoog-titel').textContent = '✏️ Bewerken';
  document.getElementById('us-id').value = u.id;
  document.getElementById('us-titel').value = u.titel;
  document.getElementById('us-datum').value = u.datum;
  document.getElementById('us-prijs').value = u.prijs.toFixed(2).replace('.', ',');
  // Type invullen (bestaande uitstappen zonder type = 'activiteit')
  const type = u.type || 'activiteit';
  document.querySelector(`input[name="us-type"][value="${type}"]`).checked = true;
  document.getElementById('us-verwijder-knop').style.display = 'inline-block';
  document.getElementById('us-dialoog').classList.add('open');
};

window.uitstapOpslaan = function () {
  const id = document.getElementById('us-id').value;
  const titel = document.getElementById('us-titel').value.trim();
  const datum = document.getElementById('us-datum').value;
  const prijsStr = document.getElementById('us-prijs').value.trim().replace(',', '.');
  const prijs = parseFloat(prijsStr);
  const type = document.querySelector('input[name="us-type"]:checked').value;

  if (!titel) { alert('Vul een naam in.'); return; }
  if (!datum) { alert('Kies een datum.'); return; }
  if (isNaN(prijs) || prijs < 0) { alert('Vul een geldige prijs in (bv. 12,50).'); return; }

  const klasId = state.huidigeKlasId;
  if (!state.uitstappen[klasId]) state.uitstappen[klasId] = [];

  if (id) {
    // Bewerken
    const u = state.uitstappen[klasId].find(x => x.id === id);
    if (u) {
      const typeVeranderd = u.type !== type;
      u.titel = titel;
      u.datum = datum;
      u.prijs = prijs;
      u.type = type;
      // Als type veranderd is: reset deelnemers (de default-betekenis is anders)
      if (typeVeranderd) u.deelnemers = {};
    }
  } else {
    // Nieuw
    state.uitstappen[klasId].push({
      id: 'u' + Date.now(),
      titel: titel,
      datum: datum,
      prijs: prijs,
      type: type,
      deelnemers: {}
    });
  }

  bewaarState(state);
  // Zet maand op de maand van de uitstap als die buiten huidige weergave valt
  uitstapHuidigeMaand = datum.substring(0, 7);
  sluitDialoog('us-dialoog');
  uitstapInhoudVullen();
};

window.uitstapVerwijderen = function () {
  const id = document.getElementById('us-id').value;
  if (!id) return;
  const klasId = state.huidigeKlasId;
  const u = (state.uitstappen[klasId] || []).find(x => x.id === id);
  if (!u) return;
  if (!confirm(`Uitstap "${u.titel}" verwijderen?\n\nAlle aanwezigheids-data van deze uitstap wordt ook gewist.`)) return;
  state.uitstappen[klasId] = state.uitstappen[klasId].filter(x => x.id !== id);
  bewaarState(state);
  sluitDialoog('us-dialoog');
  uitstapInhoudVullen();
};

// ==============================================
// RAPPORT GENERATOR: overzicht maximumfactuur voor ouders
// ==============================================
// Cumulatief opgebouwd:
//   Rapport 1 = sept → einde R1
//   Rapport 2 = sept → einde R2 (incl. R1)
//   Rapport 3 = sept → einde schooljaar (volledig jaar)

window.openRapportGenerator = function () {
  // Vul leerling-dropdown
  const klas = state.klassen[state.huidigeKlasId];
  const actief = klas.leerlingen.filter(l => !l.einddatum && !l.personeelskind);
  const sel = document.getElementById('rp-leerling-select');
  sel.innerHTML = actief.map(l => `<option value="${l.id}">${escapeHtml(l.naam)}</option>`).join('');

  // Reset periode naar R3 als default, dat zet ook einddatum
  const periodeSel = document.getElementById('rp-periode');
  periodeSel.value = 'r3';
  document.getElementById('rp-tot').value = '2027-06-30';
  document.getElementById('rp-custom-blok').style.display = 'none';

  // Rapportperiode-dropdown werkt: toon altijd van 1 september tot geselecteerde einddatum
  periodeSel.onchange = function () {
    const v = this.value;
    const einddatums = {
      'r1': '2026-12-20',   // einde voor kerstvakantie
      'r2': '2027-03-28',   // einde voor paasvakantie
      'r3': '2027-06-30',   // einde schooljaar
      'custom': null
    };
    const customBlok = document.getElementById('rp-custom-blok');
    if (v === 'custom') {
      customBlok.style.display = 'block';
      document.getElementById('rp-tot').value = document.getElementById('rp-tot-custom').value;
    } else {
      customBlok.style.display = 'none';
      document.getElementById('rp-tot').value = einddatums[v];
    }
  };

  // Toon/verberg leerling-select op basis van formaat
  document.getElementById('rp-formaat').onchange = function () {
    document.getElementById('rp-voorbeeld-leerling').style.display =
      this.value === 'voorbeeld' ? 'block' : 'none';
  };

  document.getElementById('rp-dialoog').classList.add('open');
};

window.genereerRapport = function () {
  const tot = document.getElementById('rp-tot').value;
  const formaat = document.getElementById('rp-formaat').value;
  const periode = document.getElementById('rp-periode').value;

  // START = altijd 1 september van dat schooljaar (= cumulatief!)
  const van = '2026-09-01';

  if (!tot) { alert('Vul een einddatum in.'); return; }
  if (van > tot) { alert('De einddatum moet na 1 september liggen.'); return; }

  const klasInfo = KLASSEN.find(k => k.id === state.huidigeKlasId);
  const klas = state.klassen[state.huidigeKlasId];
  const isKleuters = klasInfo.leerjaar === 'Kleuters';
  const maxFactuur = isKleuters ? 55 : 105;
  const actief = klas.leerlingen.filter(l => !l.einddatum && !l.personeelskind);

  // Bepaal welke leerlingen we verwerken
  let doelgroep;
  if (formaat === 'voorbeeld') {
    const id = document.getElementById('rp-leerling-select').value;
    const l = klas.leerlingen.find(x => x.id === id);
    if (!l) return;
    doelgroep = [l];
  } else {
    doelgroep = actief;
  }

  // Verzamel alle ACTIVITEITEN in de periode (CUMULATIEF vanaf 1 sept)
  // BESTELLINGEN (turn-t-shirts, badmutsen...) tellen NIET mee voor max. factuur
  const alleUitstappen = (state.uitstappen[state.huidigeKlasId] || [])
    .filter(u => u.datum >= van && u.datum <= tot)
    .filter(u => (u.type || 'activiteit') === 'activiteit')
    .sort((a, b) => a.datum.localeCompare(b.datum));

  // Periode-label voor in het document
  const periodeLabels = {
    'r1':     'Rapport 1 — september 2026 tot en met december 2026',
    'r2':     'Rapport 2 — september 2026 tot en met maart 2027 (cumulatief)',
    'r3':     'Rapport 3 — volledig schooljaar 2026-2027 (cumulatief)',
    'custom': `Periode: ${formatDag(van)} — ${formatDag(tot)}`
  };
  const periodeLabel = periodeLabels[periode] || periodeLabels.custom;

  // Bouw één HTML-document met alle leerling-overzichten
  let html = `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<title>Overzicht maximumfactuur — ${escapeHtml(klasInfo.klas)}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 780px; margin: 0 auto; padding: 30px; color: #222; background: #fafafa; }
  .pagina { background: white; padding: 40px 50px; margin-bottom: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border-radius: 6px; page-break-after: always; }
  .pagina:last-child { page-break-after: auto; }
  .kop { display: flex; align-items: center; gap: 18px; margin-bottom: 24px; padding-bottom: 18px; border-bottom: 3px solid #d99775; }
  .logo { width: 70px; height: 70px; background: #faf6ef; border: 2px solid #d99775; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 2.2em; flex-shrink: 0; }
  .kop-tekst h1 { margin: 0; font-size: 17pt; color: #3d3a36; }
  .kop-tekst .sub { margin: 4px 0 0 0; color: #777; font-size: 10.5pt; }
  .klas-balk { background: #f5ead6; padding: 10px 14px; border-radius: 8px; margin-bottom: 8px; font-weight: 600; font-size: 11pt; }
  .leerling-balk { background: #d99775; color: white; padding: 10px 14px; border-radius: 8px; margin-bottom: 18px; font-weight: 700; font-size: 12pt; }
  .titel-activiteiten { font-size: 13pt; font-weight: 700; text-align: center; margin: 24px 0 16px 0; color: #3d3a36; }
  .max-info { background: #fff4e0; border-left: 4px solid #e8b87a; padding: 12px 14px; margin-bottom: 18px; font-size: 10.5pt; border-radius: 4px; }
  .max-info strong { color: #8a5a28; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th, td { border: 1px solid #bbb; padding: 8px 10px; font-size: 10.5pt; }
  th { background: #e8e2d6; font-weight: 700; text-align: left; }
  td.bedrag { text-align: right; white-space: nowrap; }
  td.datum { text-align: center; white-space: nowrap; }
  tr.totaal td { background: #d99775; color: white; font-weight: 700; font-size: 11.5pt; }
  .opmerking { font-size: 10pt; font-style: italic; color: #555; margin-top: 14px; padding: 10px 14px; background: #f5f5f5; border-radius: 6px; line-height: 1.5; }
  .voettekst { margin-top: 26px; padding-top: 14px; border-top: 1px solid #ccc; text-align: center; font-size: 9pt; color: #777; }
  .print-balk { background: #6b5d52; color: white; padding: 12px 18px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
  .print-balk button { background: white; color: #6b5d52; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 10pt; }
  @media print { .print-balk { display: none; } body { background: white; padding: 0; } .pagina { box-shadow: none; margin-bottom: 0; } }
</style>
</head>
<body>

<div class="print-balk">
  <div>📄 Overzicht gegenereerd — ${doelgroep.length} leerling${doelgroep.length === 1 ? '' : 'en'}</div>
  <div>
    <button onclick="window.print()">🖨️ Afdrukken / opslaan als PDF</button>
    <button onclick="window.close()">✕ Sluiten</button>
  </div>
</div>
`;

  // Per leerling een pagina
  doelgroep.forEach(leerling => {
    // Bereken voor deze leerling welke uitstappen hij/zij bijwoonde
    const bijgewoond = alleUitstappen.filter(u => {
      // Let op: als leerling later is gestart, tel geen uitstappen vóór startdatum
      if (leerling.startdatum && u.datum < leerling.startdatum) return false;
      // Kind was afwezig op die uitstap?
      const status = (u.deelnemers || {})[leerling.id] || 'mee';
      return status === 'mee';
    });

    let totaal = 0;
    bijgewoond.forEach(u => { totaal += u.prijs; });

    // Overzicht of ze al boven max zitten
    const boven = totaal > maxFactuur;

    html += `
<div class="pagina">
  <div class="kop">
    <div class="logo">🏫</div>
    <div class="kop-tekst">
      <h1>GO! Basisschool De Linde</h1>
      <div class="sub">${periodeLabel}</div>
    </div>
  </div>

  <div class="klas-balk">Klas: ${escapeHtml(klasInfo.klas)} — Leerkracht: ${escapeHtml(klasInfo.leerkracht)}</div>
  <div class="leerling-balk">👤 ${escapeHtml(leerling.naam)}</div>

  <div class="titel-activiteiten">Overzicht activiteiten</div>

  <div class="max-info">
    De <strong>maximumfactuur</strong> bedraagt <strong>€${maxFactuur}</strong> voor ${isKleuters ? 'kleuters' : 'de lagere school'}
    per schooljaar (wettelijk vastgelegd).
  </div>

  ${bijgewoond.length === 0 ? `
    <p style="text-align:center; color:#777; font-style:italic; padding:20px;">
      In deze periode waren er nog geen aangerekende activiteiten.
    </p>
  ` : `
    <table>
      <thead>
        <tr>
          <th style="width:60%;">Activiteit</th>
          <th style="width:15%; text-align:right;">Kostprijs</th>
          <th style="width:25%; text-align:center;">Datum</th>
        </tr>
      </thead>
      <tbody>
        ${bijgewoond.map(u => `
          <tr>
            <td>${escapeHtml(u.titel)}</td>
            <td class="bedrag">€ ${u.prijs.toFixed(2).replace('.', ',')}</td>
            <td class="datum">${formatDag(u.datum)}</td>
          </tr>
        `).join('')}
        <tr class="totaal">
          <td>TOTAAL</td>
          <td class="bedrag">€ ${totaal.toFixed(2).replace('.', ',')}</td>
          <td class="datum">—</td>
        </tr>
      </tbody>
    </table>

    <div class="opmerking">
      Dit bedrag is <strong>reeds gefactureerd geweest</strong> en dient dus niet opnieuw betaald te worden.
      Bij afwezigheid werd het bedrag van de activiteit niet aangerekend.
      ${boven ? `<br><br><strong style="color:#a54848;">⚠️ Let op: het totaal overschrijdt de maximumfactuur van €${maxFactuur}. Gelieve contact op te nemen met het secretariaat.</strong>` : ''}
    </div>
  `}

  <div class="voettekst">
    Lindestraat 123A · 2880 Bornem · tel. 03 897 98 16 · info@bsdelinde.net · www.bsdelinde.net
  </div>
</div>
`;
  });

  html += '</body></html>';

  // Open in nieuw venster/tab
  const w = window.open('', '_blank');
  if (!w) {
    alert('Je browser blokkeerde het pop-up venster. Sta pop-ups toe voor deze pagina en probeer opnieuw.');
    return;
  }
  w.document.write(html);
  w.document.close();

  sluitDialoog('rp-dialoog');
};

// ==============================================
// SECRETARIAAT: WERKBOEKEN
// ==============================================
// Twee weergaven:
//   1. Overzicht alle klassen (klaar-status + acties)
//   2. Detail per klas (werkboeken-lijst + afvinken besteld + PDF)

let secWb_geselecteerdeKlas = null; // null = overzicht, anders = klasId

function toonSecWerkboeken() {
  document.getElementById('meldingen-zone').innerHTML = '';
  const hoofdpaneel = document.getElementById('hoofdpaneel');

  if (secWb_geselecteerdeKlas) {
    // DETAIL voor één klas
    toonSecWerkboekenDetail(hoofdpaneel, secWb_geselecteerdeKlas);
  } else {
    // OVERZICHT van alle klassen
    toonSecWerkboekenOverzicht(hoofdpaneel);
  }
}

function toonSecWerkboekenOverzicht(hoofdpaneel) {
  // Bereken voor elke klas: totaal werkboeken, hoeveel besteld, klaar-status
  const rijen = KLASSEN.map(k => {
    const klasData = state.klassen[k.id];
    const totaalWb = klasData.werkboeken.length;
    const besteldAantal = klasData.werkboeken.filter(w =>
      state.werkboeken_besteld[k.id + '|' + w.id]
    ).length;
    const klaarInfo = state.werkboeken_klaar[k.id];
    const isKlaar = !!klaarInfo;
    const allesBesteld = besteldAantal === totaalWb && totaalWb > 0;

    let statusKleur, statusTekst;
    if (allesBesteld) {
      statusKleur = 'groen';
      statusTekst = '✅ Volledig besteld';
    } else if (isKlaar) {
      statusKleur = 'geel';
      statusTekst = besteldAantal > 0
        ? `🛒 ${besteldAantal}/${totaalWb} besteld`
        : '📥 Klaar voor bestelling';
    } else {
      statusKleur = 'rood';
      statusTekst = '⏳ Leerkracht nog niet klaar';
    }

    return { klas: k, klasData, totaalWb, besteldAantal, isKlaar, allesBesteld, statusKleur, statusTekst, klaarInfo };
  });

  // Tellingen voor de header
  const aantalKlaar = rijen.filter(r => r.isKlaar && !r.allesBesteld).length;
  const aantalNietKlaar = rijen.filter(r => !r.isKlaar).length;
  const aantalKlaarVolledig = rijen.filter(r => r.allesBesteld).length;

  hoofdpaneel.innerHTML = `
    <button class="terug-knop" onclick="rolToepassen()">← Terug naar dashboard</button>

    <div class="sec-paneel">
      <h2>📚 Werkboeken-bestelling — overzicht alle klassen</h2>
      <p style="color:var(--tekst-zacht); font-size:0.92em; margin:-8px 0 16px 0;">
        Hier zie je per klas of de leerkracht haar werkboekenlijst heeft afgewerkt.
        Klik op een klas om de details te zien, de PDF te downloaden, en af te vinken wat besteld is.
      </p>

      <div style="display:flex; gap:14px; flex-wrap:wrap; margin-bottom:18px;">
        <div style="background:var(--rood-licht); border-left:4px solid var(--rood); padding:8px 14px; border-radius:6px; font-size:0.92em;">
          <strong>${aantalNietKlaar}</strong> klas(sen) nog niet klaar
        </div>
        <div style="background:var(--geel-licht); border-left:4px solid var(--geel); padding:8px 14px; border-radius:6px; font-size:0.92em;">
          <strong>${aantalKlaar}</strong> wachten op bestelling
        </div>
        <div style="background:var(--groen-licht); border-left:4px solid var(--groen); padding:8px 14px; border-radius:6px; font-size:0.92em;">
          <strong>${aantalKlaarVolledig}</strong> volledig besteld
        </div>
      </div>

      <table class="sec-tabel">
        <thead>
          <tr>
            <th>Klas</th>
            <th>Leerkracht</th>
            <th>Status</th>
            <th>Klaar op</th>
            <th>Acties</th>
          </tr>
        </thead>
        <tbody>
          ${rijen.map(r => `
            <tr>
              <td><strong>${r.klas.klas}</strong></td>
              <td>${r.klas.leerkracht}</td>
              <td><span class="status-bolletje ${r.statusKleur}"></span>${r.statusTekst}</td>
              <td>${r.klaarInfo ? new Date(r.klaarInfo.tijdstip).toLocaleDateString('nl-BE') : '—'}</td>
              <td>
                ${r.isKlaar
                  ? `<button onclick="secWb_openKlas('${r.klas.id}')">Openen</button>`
                  : `<span style="color:var(--tekst-zacht); font-style:italic; font-size:0.85em;">Wacht op leerkracht</span>`}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <p style="margin-top:14px; font-size:0.85em; color:var(--tekst-zacht);">
        💡 <strong>Tip voor de demo:</strong> wissel naar leerkracht-rol, ga naar Klasbeheer voor verschillende klassen,
        en klik op "✓ Klaar voor secretariaat". Dan zie je hier de status veranderen.
      </p>
    </div>
  `;
}

window.secWb_openKlas = function (klasId) {
  secWb_geselecteerdeKlas = klasId;
  toonSecWerkboeken();
};

window.secWb_terug = function () {
  secWb_geselecteerdeKlas = null;
  toonSecWerkboeken();
};

function toonSecWerkboekenDetail(hoofdpaneel, klasId) {
  const klas = KLASSEN.find(k => k.id === klasId);
  const klasData = state.klassen[klasId];
  const klaarInfo = state.werkboeken_klaar[klasId];

  // Groepeer werkboeken per methode
  const groepen = {};
  klasData.werkboeken.forEach(w => {
    if (!groepen[w.methode]) groepen[w.methode] = [];
    groepen[w.methode].push(w);
  });

  // Tellingen
  const totaalAantal = klasData.werkboeken.length;
  const besteldAantal = klasData.werkboeken.filter(w =>
    state.werkboeken_besteld[klasId + '|' + w.id]
  ).length;

  // Bouw rijen per methode met parent-child logica
  let rijenHtml = '';
  Object.keys(groepen).forEach((methodeNaam, mIdx) => {
    const delen = groepen[methodeNaam];
    const besteldeDelen = delen.filter(w => state.werkboeken_besteld[klasId + '|' + w.id]);
    const aantalBesteld = besteldeDelen.length;
    const totaal = delen.length;

    // Parent-state: 'alles' / 'niks' / 'gedeeltelijk'
    let parentState = 'niks';
    if (aantalBesteld === totaal) parentState = 'alles';
    else if (aantalBesteld > 0) parentState = 'gedeeltelijk';

    const parentChecked = parentState === 'alles';
    const parentIndeterminate = parentState === 'gedeeltelijk';

    // Methode-hoofdrij (parent)
    rijenHtml += `
      <tr class="methode-kop-rij" style="background: var(--creme-warm);">
        <td colspan="2" style="padding: 10px 12px;">
          <label style="display:inline-flex; align-items:center; gap:10px; cursor:pointer; font-weight:700; color:var(--accent-donker); width:100%;">
            <input type="checkbox"
              id="wb-methode-${mIdx}"
              ${parentChecked ? 'checked' : ''}
              onchange="secWb_methodeToggle('${klasId}', '${escapeQuotes(methodeNaam)}', this.checked)"
              style="width:20px; height:20px; cursor:pointer; accent-color: var(--accent-donker);">
            <span>${escapeHtml(methodeNaam)}</span>
            <span style="color:var(--tekst-zacht); font-weight:400; font-size:0.88em; margin-left:auto;">
              ${aantalBesteld}/${totaal} besteld
            </span>
          </label>
        </td>
        <td style="text-align:center; font-size:0.9em; color:var(--tekst-zacht); font-style:italic;">
          ${parentState === 'alles' ? '✓ alles' : parentState === 'gedeeltelijk' ? '◐ deel' : '—'}
        </td>
        <td style="text-align:center;">
          ${parentChecked
            ? '<span style="color:var(--groen); font-weight:700;">✓</span>'
            : parentIndeterminate
              ? '<span style="color:var(--geel); font-weight:700;">◐</span>'
              : '<span style="color:var(--tekst-zacht);">☐</span>'}
        </td>
      </tr>
    `;

    // Sub-rijen per deel
    delen.forEach(w => {
      const besteldKey = klasId + '|' + w.id;
      const besteld = !!state.werkboeken_besteld[besteldKey];
      rijenHtml += `
        <tr>
          <td style="padding-left: 36px; color: var(--tekst-zacht);">↳</td>
          <td>${escapeHtml(w.deel)}</td>
          <td style="text-align:center;">${w.aantal}</td>
          <td style="text-align:center;">
            <label style="display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
              <input type="checkbox" ${besteld ? 'checked' : ''}
                onchange="secWb_besteldToggle('${klasId}', '${w.id}', this.checked)"
                style="width:18px; height:18px; cursor:pointer;">
              <span style="font-weight:${besteld ? '700' : '400'}; color:${besteld ? 'var(--groen)' : 'var(--tekst-zacht)'}; font-size:0.9em;">
                ${besteld ? 'Besteld' : 'Nog niet'}
              </span>
            </label>
          </td>
        </tr>
      `;
    });
  });

  hoofdpaneel.innerHTML = `
    <button class="terug-knop" onclick="secWb_terug()">← Terug naar overzicht</button>

    <div class="sec-paneel">
      <h2>📚 Werkboeken — Klas ${klas.klas}</h2>
      <p style="color:var(--tekst-zacht); margin:-8px 0 16px 0;">
        Leerkracht: <strong>${klas.leerkracht}</strong>
        ${klaarInfo ? ` · Doorgegeven op ${new Date(klaarInfo.tijdstip).toLocaleString('nl-BE')}` : ''}
      </p>

      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:16px;">
        <button class="rol-knop actief" onclick="secWb_downloadPdf('${klasId}')">📄 PDF downloaden</button>
        <button class="rol-knop" onclick="secWb_allesBesteld('${klasId}', true)">✓ Alles als besteld markeren</button>
        <button class="rol-knop" onclick="secWb_allesBesteld('${klasId}', false)">↺ Alles terugzetten</button>
      </div>

      <div style="background:var(--creme-warm); padding:10px 14px; border-radius:8px; margin-bottom:16px; font-size:0.92em;">
        🛒 <strong>${besteldAantal}</strong> van ${totaalAantal} werkboeken zijn besteld
      </div>

      <div style="background:var(--blauw-licht); border-left:4px solid var(--blauw); padding:10px 14px; border-radius:6px; font-size:0.88em; margin-bottom:14px;">
        💡 <strong>Tip:</strong> klik op het vinkje bij de methode-titel om alle delen tegelijk aan of uit te vinken.
        Of vink individueel per deel.
      </div>

      <table class="sec-tabel" style="table-layout: fixed;">
        <colgroup>
          <col style="width:40px;">
          <col>
          <col style="width:80px;">
          <col style="width:160px;">
        </colgroup>
        <thead>
          <tr>
            <th colspan="2">Methode / Werkschrift</th>
            <th style="text-align:center;">Aantal</th>
            <th style="text-align:center;">Besteld?</th>
          </tr>
        </thead>
        <tbody>
          ${rijenHtml}
        </tbody>
      </table>

      <p style="margin-top:14px; font-size:0.85em; color:var(--tekst-zacht);">
        💡 De leerkracht ziet ook welke werkboeken al besteld zijn. Wissel naar leerkracht-rol om dat te checken.
      </p>
    </div>
  `;

  // Zet indeterminate state op parent-checkboxen (kan niet via HTML-attribuut)
  Object.keys(groepen).forEach((methodeNaam, mIdx) => {
    const delen = groepen[methodeNaam];
    const besteldeDelen = delen.filter(w => state.werkboeken_besteld[klasId + '|' + w.id]);
    const cb = document.getElementById('wb-methode-' + mIdx);
    if (cb && besteldeDelen.length > 0 && besteldeDelen.length < delen.length) {
      cb.indeterminate = true;
    }
  });
}

// Helper: escape quotes voor onclick-attributen
function escapeQuotes(s) {
  return String(s).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

window.secWb_methodeToggle = function (klasId, methodeNaam, aanvinken) {
  const klasData = state.klassen[klasId];
  const delen = klasData.werkboeken.filter(w => w.methode === methodeNaam);
  delen.forEach(w => {
    const k = klasId + '|' + w.id;
    if (aanvinken) {
      state.werkboeken_besteld[k] = { tijdstip: new Date().toISOString() };
    } else {
      delete state.werkboeken_besteld[k];
    }
  });
  bewaarState(state);
  toonSecWerkboeken();
};

window.secWb_besteldToggle = function (klasId, wId, besteld) {
  const k = klasId + '|' + wId;
  if (besteld) {
    state.werkboeken_besteld[k] = { tijdstip: new Date().toISOString() };
  } else {
    delete state.werkboeken_besteld[k];
  }
  bewaarState(state);
  toonSecWerkboeken();
};

window.secWb_allesBesteld = function (klasId, aanvinken) {
  const klasData = state.klassen[klasId];
  const actie = aanvinken ? 'als besteld markeren' : 'terugzetten naar niet-besteld';
  if (!confirm(`Alle ${klasData.werkboeken.length} werkboeken ${actie}?`)) return;
  klasData.werkboeken.forEach(w => {
    const k = klasId + '|' + w.id;
    if (aanvinken) {
      state.werkboeken_besteld[k] = { tijdstip: new Date().toISOString() };
    } else {
      delete state.werkboeken_besteld[k];
    }
  });
  bewaarState(state);
  toonSecWerkboeken();
};

window.secWb_downloadPdf = function (klasId) {
  const klas = KLASSEN.find(k => k.id === klasId);
  const klasData = state.klassen[klasId];
  const klaarInfo = state.werkboeken_klaar[klasId];

  // Genereer een nette HTML-pagina als preview (in de echte versie = echte PDF)
  // Groepeer werkboeken per methode voor PDF
  const groepenPdf = {};
  klasData.werkboeken.forEach(w => {
    if (!groepenPdf[w.methode]) groepenPdf[w.methode] = [];
    groepenPdf[w.methode].push(w);
  });

  let rijenHtml = '';
  Object.keys(groepenPdf).forEach(methodeNaam => {
    const delen = groepenPdf[methodeNaam];
    const aantalBesteld = delen.filter(w => state.werkboeken_besteld[klasId + '|' + w.id]).length;
    const totaal = delen.length;
    rijenHtml += `
      <tr style="background: #f5ead6;">
        <td colspan="2" style="font-weight:700; color:#b87858; padding: 8px 10px;">${escapeHtml(methodeNaam)}</td>
        <td class="aantal">${delen.reduce((s, w) => s + w.aantal, 0)}</td>
        <td class="status">${aantalBesteld === totaal ? '✓' : aantalBesteld > 0 ? '◐' : '☐'}</td>
      </tr>
    `;
    delen.forEach(w => {
      const besteld = !!state.werkboeken_besteld[klasId + '|' + w.id];
      rijenHtml += `
        <tr>
          <td style="padding-left: 24px; color: #777;">↳</td>
          <td>${escapeHtml(w.deel)}</td>
          <td class="aantal">${w.aantal}</td>
          <td class="status">${besteld ? '✓' : '☐'}</td>
        </tr>
      `;
    });
  });

  let html = `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<title>Werkboeken-bestelling — Klas ${klas.klas}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 780px; margin: 0 auto; padding: 30px; color: #222; background: #fafafa; }
  .pagina { background: white; padding: 40px 50px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border-radius: 6px; }
  .kop { display: flex; align-items: center; gap: 18px; margin-bottom: 24px; padding-bottom: 18px; border-bottom: 3px solid #d99775; }
  .logo { width: 70px; height: 70px; background: #faf6ef; border: 2px solid #d99775; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 2.2em; flex-shrink: 0; }
  .kop-tekst h1 { margin: 0; font-size: 17pt; color: #3d3a36; }
  .kop-tekst .sub { margin: 4px 0 0 0; color: #777; font-size: 10.5pt; }
  .info-balk { background: #f5ead6; padding: 12px 16px; border-radius: 8px; margin-bottom: 18px; font-size: 11pt; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; table-layout: fixed; }
  th, td { border: 1px solid #bbb; padding: 10px 12px; font-size: 10.5pt; text-align: left; }
  th { background: #e8e2d6; font-weight: 700; }
  td.aantal { text-align: center; font-weight: 600; width: 70px; }
  td.status { text-align: center; width: 70px; font-size: 13pt; }
  .voettekst { margin-top: 26px; padding-top: 14px; border-top: 1px solid #ccc; text-align: center; font-size: 9pt; color: #777; }
  .print-balk { background: #6b5d52; color: white; padding: 12px 18px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
  .print-balk button { background: white; color: #6b5d52; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 10pt; }
  @media print { .print-balk { display: none; } body { background: white; padding: 0; } .pagina { box-shadow: none; } }
</style>
</head>
<body>

<div class="print-balk">
  <div>📄 Werkboeken-bestelling — Klas ${klas.klas}</div>
  <div>
    <button onclick="window.print()">🖨️ Afdrukken / opslaan als PDF</button>
    <button onclick="window.close()">✕ Sluiten</button>
  </div>
</div>

<div class="pagina">
  <div class="kop">
    <div class="logo">🏫</div>
    <div class="kop-tekst">
      <h1>GO! Basisschool De Linde</h1>
      <div class="sub">Werkboeken-bestelling — schooljaar 2026-2027</div>
    </div>
  </div>

  <div class="info-balk">
    <strong>Klas:</strong> ${klas.klas} (${klas.leerjaar}) — <strong>Leerkracht:</strong> ${klas.leerkracht}<br>
    ${klaarInfo ? `<strong>Doorgegeven aan secretariaat op:</strong> ${new Date(klaarInfo.tijdstip).toLocaleString('nl-BE')}` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:40px;"></th>
        <th>Methode / Werkschrift</th>
        <th style="text-align:center;">Aantal</th>
        <th style="text-align:center;">Besteld</th>
      </tr>
    </thead>
    <tbody>
      ${rijenHtml}
    </tbody>
  </table>

  <p style="font-size:10pt; color:#666; margin-top:20px;">
    Totaal: <strong>${klasData.werkboeken.length}</strong> werkboeken (gegroepeerd in ${Object.keys(groepenPdf).length} methode${Object.keys(groepenPdf).length === 1 ? '' : 's'})
    voor <strong>${klasData.leerlingen.filter(l => !l.einddatum).length}</strong> leerlingen.
  </p>

  <div class="voettekst">
    Lindestraat 123A · 2880 Bornem · tel. 03 897 98 16 · info@bsdelinde.net · www.bsdelinde.net
  </div>
</div>

</body>
</html>`;

  const w = window.open('', '_blank');
  if (!w) {
    alert('Je browser blokkeerde het pop-up venster. Sta pop-ups toe en probeer opnieuw.');
    return;
  }
  w.document.write(html);
  w.document.close();
};

// ==============================================
// SECRETARIAAT: REFTERLIJSTEN
// ==============================================

let secRefter_huidigeMaand = '2026-11';
let secRefter_geselecteerdeKlas = null;

function toonSecRefter() {
  document.getElementById('meldingen-zone').innerHTML = '';
  document.querySelector('.container').classList.add('breed');

  if (secRefter_geselecteerdeKlas) {
    toonSecRefterDetail();
  } else {
    toonSecRefterOverzicht();
  }
}

function toonSecRefterOverzicht() {
  const hoofdpaneel = document.getElementById('hoofdpaneel');
  const [jaar, maand] = secRefter_huidigeMaand.split('-').map(Number);
  const maandNamen = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December'];
  const maandLabel = `${maandNamen[maand - 1]} ${jaar}`;

  const dagen = dagenVanMaand(secRefter_huidigeMaand);
  const schooldagen = dagen.filter(d => dagSoort(d) === 'schooldag');

  // Bereken statussen per klas
  const rijen = KLASSEN.map(k => {
    const klas = state.klassen[k.id];
    const invKey = k.id + '|' + secRefter_huidigeMaand;
    const inv = state.refter_invullingen[invKey] || {};
    const geblokkeerd_tot = state.refter_geblokkeerd_tot[k.id];

    let aantalMaaltijden = 0;
    let aantalAfwezig = 0;
    let aantalLeerlingen = 0;
    let aantalPersoneelskinderen = 0;

    klas.leerlingen.forEach(l => {
      if (l.einddatum && l.einddatum < dagen[0]) return;
      aantalLeerlingen++;
      if (l.personeelskind) { aantalPersoneelskinderen++; return; }
      schooldagen.forEach(d => {
        if (l.startdatum && d < l.startdatum) return;
        const s = inv[l.id + '|' + d] || 'aan';
        if (s === 'aan') aantalMaaltijden++;
        else if (s === 'uit') aantalAfwezig++;
      });
    });

    // Geblokkeerd in deze maand: laatste vergrendelde dag valt binnen deze maand
    const isGeblokkeerdInMaand = geblokkeerd_tot &&
      geblokkeerd_tot >= dagen[0] && geblokkeerd_tot <= dagen[dagen.length - 1];
    const heeftBlokkering = !!geblokkeerd_tot;

    return { klas: k, aantalLeerlingen, aantalPersoneelskinderen, aantalMaaltijden, aantalAfwezig, geblokkeerd_tot, isGeblokkeerdInMaand, heeftBlokkering };
  });

  const totaalMaaltijden = rijen.reduce((s, r) => s + r.aantalMaaltijden, 0);
  const totaalGeblokkeerd = rijen.filter(r => r.heeftBlokkering).length;

  hoofdpaneel.innerHTML = `
    <button class="terug-knop" onclick="rolToepassen()">← Terug naar dashboard</button>

    <div class="sec-paneel">
      <h2>🍽️ Refterlijsten — overzicht alle klassen</h2>
      <p style="color:var(--tekst-zacht); font-size:0.92em; margin:-8px 0 16px 0;">
        Bekijk per klas hoeveel maaltijden er deze maand werden geserveerd.
        Klik op een klas om datums te vergrendelen na facturatie (per dag of per week).
      </p>

      <div class="refter-toolbar">
        <div class="maand-nav">
          <button onclick="secRefter_maandWisselen(-1)">◀</button>
          <span class="maand-titel">${maandLabel}</span>
          <button onclick="secRefter_maandWisselen(1)">▶</button>
        </div>
        <button onclick="openSecRefterBeheer()" title="Personeelskinderen en school-eigen vrije dagen">⚙️ Beheren</button>
        <button class="accent" onclick="secRefter_exporteerAlleKlassen()" title="CSV per klas voor facturatie">📥 Export alle klassen</button>
      </div>

      <div style="display:flex; gap:14px; flex-wrap:wrap; margin-bottom:18px;">
        <div style="background:var(--creme-warm); padding:8px 14px; border-radius:6px; font-size:0.92em;">
          📅 <strong>${schooldagen.length}</strong> refterdagen
        </div>
        <div style="background:#e8f5e8; padding:8px 14px; border-radius:6px; font-size:0.92em;">
          🍽️ <strong>${totaalMaaltijden}</strong> maaltijden totaal
        </div>
        <div style="background:#e0ecf6; padding:8px 14px; border-radius:6px; font-size:0.92em;">
          🔒 <strong>${totaalGeblokkeerd}</strong> klas(sen) met blokkering
        </div>
      </div>

      <table class="sec-tabel">
        <thead>
          <tr>
            <th>Klas</th>
            <th>Leerkracht</th>
            <th style="text-align:right;">Leerlingen</th>
            <th style="text-align:right;">Personeel</th>
            <th style="text-align:right;">Maaltijden</th>
            <th style="text-align:right;">Afwezig</th>
            <th>Vergrendeld tot</th>
            <th style="width:120px;">Acties</th>
          </tr>
        </thead>
        <tbody>
          ${rijen.map(r => `
            <tr>
              <td><strong>${r.klas.klas}</strong></td>
              <td>${r.klas.leerkracht}</td>
              <td style="text-align:right;">${r.aantalLeerlingen}</td>
              <td style="text-align:right; color:var(--tekst-zacht);">${r.aantalPersoneelskinderen > 0 ? '⚹ ' + r.aantalPersoneelskinderen : '—'}</td>
              <td style="text-align:right;"><strong>${r.aantalMaaltijden}</strong></td>
              <td style="text-align:right;">${r.aantalAfwezig}</td>
              <td>
                ${r.geblokkeerd_tot
                  ? `<span style="color:#3a72b8;">🔒 ${formatDag(r.geblokkeerd_tot)}</span>`
                  : '<span style="color:var(--tekst-zacht);">geen</span>'}
              </td>
              <td>
                <button onclick="secRefter_openKlas('${r.klas.id}')">Openen</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <p style="margin-top:14px; font-size:0.85em; color:var(--tekst-zacht);">
        💡 In de detail-weergave klik je op een <strong>datumkop</strong> (bv. vrijdag week 47) om alles tot en met die dag te vergrendelen.
      </p>
    </div>

    <!-- Beheer-dialoog: personeelskinderen + vrije dagen -->
    <div class="dialoog-achtergrond" id="sec-refter-beheer-dialoog">
      <div class="dialoog" style="max-width:760px;">
        <h3>⚙️ Beheer refter</h3>

        <div style="background:var(--creme); border-radius:8px; padding:14px; margin-bottom:18px;">
          <h4 style="margin:0 0 10px 0; font-size:1em;">📅 School-eigen vrije dagen</h4>
          <p style="font-size:0.88em; color:var(--tekst-zacht); margin:0 0 10px 0;">
            Naast de Vlaamse vakanties: voeg pedagogische studiedagen, brugdagen, of andere vrije dagen toe. Die worden grijs in alle refterlijsten.
          </p>
          <div id="sec-vrije-dagen-lijst" style="margin-bottom:12px;"></div>
          <div style="display:flex; gap:8px; align-items:flex-end; flex-wrap:wrap;">
            <div style="flex:1; min-width:140px;">
              <label style="font-size:0.85em;">Datum</label>
              <input type="date" id="nw-vrije-dag-datum" style="width:100%;">
            </div>
            <div style="flex:2; min-width:200px;">
              <label style="font-size:0.85em;">Naam</label>
              <input type="text" id="nw-vrije-dag-titel" placeholder="bv. Brugdag, Pedagogische studiedag" style="width:100%;">
            </div>
            <button class="accent" onclick="vrijeDagToevoegen()" style="padding:8px 16px; border-radius:8px;">➕ Toevoegen</button>
          </div>
        </div>

        <div style="background:var(--creme); border-radius:8px; padding:14px;">
          <h4 style="margin:0 0 10px 0; font-size:1em;">⚹ Personeelskinderen</h4>
          <p style="font-size:0.88em; color:var(--tekst-zacht); margin:0 0 10px 0;">
            Kinderen van personeel betalen geen refter. Hun naam blijft zichtbaar in de lijst, maar hun rij is grijs en niet aanvinkbaar door de leerkracht.
          </p>
          <div id="sec-personeel-lijst"></div>
        </div>

        <div class="dialoog-knoppen">
          <button onclick="sluitDialoog('sec-refter-beheer-dialoog')">Sluiten</button>
        </div>
      </div>
    </div>
  `;
}

window.secRefter_maandWisselen = function (delta) {
  const [j, m] = secRefter_huidigeMaand.split('-').map(Number);
  const d = new Date(j, m - 1 + delta, 1);
  secRefter_huidigeMaand = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  toonSecRefter();
};

window.secRefter_openKlas = function (klasId) {
  secRefter_geselecteerdeKlas = klasId;
  toonSecRefter();
};

window.secRefter_terug = function () {
  secRefter_geselecteerdeKlas = null;
  toonSecRefter();
};

// Detail-weergave: zelfde tabel als leerkracht maar met klikbare datum-koppen
function toonSecRefterDetail() {
  const klasId = secRefter_geselecteerdeKlas;
  const klas = KLASSEN.find(k => k.id === klasId);
  const klasData = state.klassen[klasId];
  const hoofdpaneel = document.getElementById('hoofdpaneel');
  const geblokkeerd_tot = state.refter_geblokkeerd_tot[klasId];

  const dagen = dagenVanMaand(secRefter_huidigeMaand);
  const schooldagen = dagen.filter(d => dagSoort(d) === 'schooldag');
  const inv = state.refter_invullingen[klasId + '|' + secRefter_huidigeMaand] || {};

  const [jaar, maand] = secRefter_huidigeMaand.split('-').map(Number);
  const maandNamen = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December'];
  const maandLabel = `${maandNamen[maand - 1]} ${jaar}`;

  // Telling
  let totaalMaaltijden = 0;
  let totaalAfwezig = 0;
  klasData.leerlingen.forEach(l => {
    if (l.personeelskind || l.einddatum) return;
    schooldagen.forEach(d => {
      if (l.startdatum && d < l.startdatum) return;
      const s = inv[l.id + '|' + d] || 'aan';
      if (s === 'aan') totaalMaaltijden++;
      else if (s === 'uit') totaalAfwezig++;
    });
  });

  // Bouw HEAD met klikbare schooldag-koppen
  let tabelHtml = '<thead><tr>';
  tabelHtml += '<th class="naam-kop">Leerling</th>';
  dagen.forEach(d => {
    const soort = dagSoort(d);
    const nr = parseInt(d.split('-')[2]);
    const titel = geefDagTitel(d);
    const isVergrendeld = soort === 'schooldag' && geblokkeerd_tot && d <= geblokkeerd_tot;

    if (soort === 'schooldag') {
      // Klikbaar: vergrendel tot deze dag (of ontgrendel)
      const klikActie = `secRefter_blokkerTotDatum('${d}')`;
      const titelTekst = isVergrendeld
        ? `🔒 Vergrendeld. Klik om TOT HIER te vergrendelen (of klik op latere dag om uit te breiden).`
        : `Klik om alles tot en met ${formatDag(d)} te vergrendelen.`;
      const extraClass = isVergrendeld ? ' kop-vergrendeld' : '';
      tabelHtml += `<th class="${soort}${extraClass} klikbaar-datum"
        onclick="${klikActie}"
        title="${titelTekst}"
        style="cursor:pointer;">
        <div class="dag-nr">${nr}${isVergrendeld ? ' 🔒' : ''}</div>
        <div class="dag-weekdag">${weekdagKort(d)}</div>
      </th>`;
    } else {
      tabelHtml += `<th class="${soort}"${titel ? ' title="' + titel + '"' : ''}>
        <div class="dag-nr">${nr}</div>
        <div class="dag-weekdag">${weekdagKort(d)}</div>
      </th>`;
    }
  });
  tabelHtml += '</tr></thead>';

  // BODY
  tabelHtml += '<tbody>';
  klasData.leerlingen.forEach(l => {
    if (l.einddatum && l.einddatum < dagen[0]) return;
    if (l.startdatum && l.startdatum > dagen[dagen.length - 1]) return;

    tabelHtml += '<tr>';
    const info = [];
    if (l.personeelskind) info.push('⚹ personeelskind');
    if (l.startdatum && l.startdatum > dagen[0]) info.push('sinds ' + formatDag(l.startdatum));
    if (l.einddatum && l.einddatum <= dagen[dagen.length - 1]) info.push('tot ' + formatDag(l.einddatum));
    tabelHtml += `<td class="naam-cel">
      <div style="font-weight:600;">${escapeHtml(l.naam)}</div>
      ${info.length > 0 ? `<div class="leerling-info">${info.join(' · ')}</div>` : ''}
    </td>`;

    if (l.personeelskind) {
      // Hele rij grijs
      dagen.forEach(d => tabelHtml += `<td class="personeelskind"></td>`);
    } else {
      dagen.forEach(d => {
        const soort = dagSoort(d);
        if (l.startdatum && d < l.startdatum) {
          tabelHtml += `<td class="niet-ingeschreven" title="Buiten inschrijvingsperiode"></td>`;
        } else if (l.einddatum && d > l.einddatum) {
          tabelHtml += `<td class="niet-ingeschreven" title="Uitgeschreven"></td>`;
        } else if (soort !== 'schooldag') {
          tabelHtml += `<td class="${soort}"></td>`;
        } else {
          const status = inv[l.id + '|' + d] || 'aan';
          const symbool = status === 'uit' ? '✗' : '';
          // Secretariaat ziet welke dagen vergrendeld zijn maar kan ze wel wijzigen
          const isVergrendeld = geblokkeerd_tot && d <= geblokkeerd_tot;
          const extraClass = isVergrendeld ? ' vergrendeld' : '';
          tabelHtml += `<td class="${status === 'leeg' ? 'schooldag' : status}${extraClass}"
            onclick="secRefter_celKlik('${l.id}', '${d}')"
            title="Secretariaat-modus: je kan deze cel wijzigen ook als ze vergrendeld is voor de leerkracht.">${symbool}</td>`;
        }
      });
    }
    tabelHtml += '</tr>';
  });
  tabelHtml += '</tbody>';

  hoofdpaneel.innerHTML = `
    <button class="terug-knop" onclick="secRefter_terug()">← Terug naar overzicht</button>

    <div class="refter-wrapper">
      <h2 style="margin:0 0 6px 0; color:var(--accent-donker);">🍽️ Refterlijst — Klas ${klas.klas} <span style="font-size:0.7em; color:var(--tekst-zacht); font-weight:400;">(secretariaat)</span></h2>
      <p style="margin:0 0 14px 0; color:var(--tekst-zacht); font-size:0.92em;">
        Leerkracht: <strong>${klas.leerkracht}</strong>
        ${geblokkeerd_tot ? ` · 🔒 Vergrendeld tot en met <strong>${formatDag(geblokkeerd_tot)}</strong>` : ''}
      </p>

      <div style="background:#e0ecf6; border-left:4px solid #3a72b8; padding:10px 14px; border-radius:8px; margin-bottom:14px; font-size:0.9em;">
        💡 <strong>Klik op een datum-kop</strong> (cijfer + dag bovenaan) om alles tot en met die dag te vergrendelen voor de leerkracht (per week of per dag).
        Jij kan nog steeds wijzigen indien correctie nodig.
      </div>

      <div class="refter-toolbar">
        <div class="maand-nav">
          <button onclick="secRefter_maandWisselen(-1)">◀</button>
          <span class="maand-titel">${maandLabel}</span>
          <button onclick="secRefter_maandWisselen(1)">▶</button>
        </div>
        <button class="accent" onclick="secRefter_exporteerKlas('${klasId}')" title="CSV download voor facturatie">📥 Exporteren (CSV)</button>
        ${geblokkeerd_tot ? `<button onclick="secRefter_blokkeringWissen('${klasId}')">🔓 Alle blokkering wissen</button>` : ''}
      </div>

      <div class="refter-scroller">
        <table class="refter-kalender">${tabelHtml}</table>
      </div>

      <div class="refter-legende">
        <span><span class="vb aan"></span> At in refter</span>
        <span><span class="vb uit"></span> Afwezig</span>
        <span><span class="vb grijs"></span> Weekend / woensdag / vakantie</span>
        <span><span class="vb donker-grijs"></span> Personeelskind</span>
        <span><span class="vb" style="background:#e0ecf6;"></span> 🔒 Vergrendeld</span>
      </div>

      <div class="refter-samenvatting">
        <span>📅 <strong>${schooldagen.length}</strong> refterdagen</span>
        <span>🍽️ <strong>${totaalMaaltijden}</strong> maaltijden</span>
        <span>❌ <strong>${totaalAfwezig}</strong> afwezigheden</span>
      </div>
    </div>
  `;
}

// Cel-klik in secretariaat-modus: kan altijd wijzigen
window.secRefter_celKlik = function (leerlingId, datumISO) {
  const klasId = secRefter_geselecteerdeKlas;
  const invKey = klasId + '|' + secRefter_huidigeMaand;
  const k = leerlingId + '|' + datumISO;
  if (!state.refter_invullingen[invKey]) state.refter_invullingen[invKey] = {};
  const huidig = state.refter_invullingen[invKey][k] || 'aan';
  if (huidig === 'uit') {
    delete state.refter_invullingen[invKey][k];
  } else {
    state.refter_invullingen[invKey][k] = 'uit';
  }
  bewaarState(state);
  toonSecRefter();
};

// Klik op datum-kop: vergrendel tot deze dag
window.secRefter_blokkerTotDatum = function (datumISO) {
  const klasId = secRefter_geselecteerdeKlas;
  const klas = KLASSEN.find(k => k.id === klasId);
  const huidig = state.refter_geblokkeerd_tot[klasId];

  let bericht;
  if (huidig === datumISO) {
    if (!confirm(`Vergrendeling op ${formatDag(datumISO)} WISSEN?\n\nDe leerkracht kan dan terug alle dagen wijzigen.`)) return;
    delete state.refter_geblokkeerd_tot[klasId];
  } else if (huidig && datumISO < huidig) {
    bericht = `Vergrendeling VERKLEINEN naar ${formatDag(datumISO)}?\n\nWas tot ${formatDag(huidig)}.\nLeerkracht kan vanaf ${formatDag(volgendeDag(datumISO))} weer wijzigen.`;
    if (!confirm(bericht)) return;
    state.refter_geblokkeerd_tot[klasId] = datumISO;
  } else {
    bericht = huidig
      ? `Vergrendeling UITBREIDEN tot en met ${formatDag(datumISO)}?\n\nWas tot ${formatDag(huidig)}.\nLeerkracht kan deze dagen niet meer wijzigen.`
      : `Klas ${klas.klas} VERGRENDELEN tot en met ${formatDag(datumISO)}?\n\nLeerkracht kan dagen tot die datum niet meer wijzigen.\nDoe dit na verwerking voor facturatie.`;
    if (!confirm(bericht)) return;
    state.refter_geblokkeerd_tot[klasId] = datumISO;
  }
  bewaarState(state);
  toonSecRefter();
};

window.secRefter_blokkeringWissen = function (klasId) {
  const klas = KLASSEN.find(k => k.id === klasId);
  if (!confirm(`Alle vergrendeling voor klas ${klas.klas} WISSEN?\n\nDe leerkracht kan dan terug alle dagen wijzigen.`)) return;
  delete state.refter_geblokkeerd_tot[klasId];
  bewaarState(state);
  toonSecRefter();
};

// Helper
function volgendeDag(datumISO) {
  const d = new Date(datumISO);
  d.setDate(d.getDate() + 1);
  return d.toISOString().substring(0, 10);
}

// ==============================================
// BEHEER: personeelskinderen + vrije dagen
// ==============================================
window.openSecRefterBeheer = function () {
  vulVrijeDagenLijst();
  vulPersoneelLijst();
  document.getElementById('sec-refter-beheer-dialoog').classList.add('open');
};

function vulVrijeDagenLijst() {
  const div = document.getElementById('sec-vrije-dagen-lijst');
  if (!state.schooleigen_vrije_dagen) state.schooleigen_vrije_dagen = [];
  const dagen = state.schooleigen_vrije_dagen.slice().sort((a, b) => a.datum.localeCompare(b.datum));
  if (dagen.length === 0) {
    div.innerHTML = '<p style="color:var(--tekst-zacht); font-style:italic; font-size:0.88em; margin:0;">Nog geen extra vrije dagen toegevoegd.</p>';
    return;
  }
  div.innerHTML = dagen.map(d => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 10px; background:var(--wit); border-radius:6px; margin-bottom:4px;">
      <span><strong>${formatDag(d.datum)}</strong> — ${escapeHtml(d.titel)}</span>
      <button onclick="vrijeDagVerwijderen('${d.datum}')" style="background:none; border:none; color:var(--rood); cursor:pointer; font-size:1em; padding:0 6px;" title="Verwijderen">✕</button>
    </div>
  `).join('');
}

window.vrijeDagToevoegen = function () {
  const datum = document.getElementById('nw-vrije-dag-datum').value;
  const titel = document.getElementById('nw-vrije-dag-titel').value.trim();
  if (!datum) { alert('Kies een datum.'); return; }
  if (!titel) { alert('Geef een naam (bv. Pedagogische studiedag).'); return; }
  if (!state.schooleigen_vrije_dagen) state.schooleigen_vrije_dagen = [];
  if (state.schooleigen_vrije_dagen.find(d => d.datum === datum)) {
    alert('Er staat al een vrije dag op die datum.');
    return;
  }
  state.schooleigen_vrije_dagen.push({ datum, titel });
  bewaarState(state);
  document.getElementById('nw-vrije-dag-datum').value = '';
  document.getElementById('nw-vrije-dag-titel').value = '';
  vulVrijeDagenLijst();
};

window.vrijeDagVerwijderen = function (datum) {
  const d = (state.schooleigen_vrije_dagen || []).find(x => x.datum === datum);
  if (!d) return;
  if (!confirm(`Vrije dag "${d.titel}" (${formatDag(datum)}) verwijderen?`)) return;
  state.schooleigen_vrije_dagen = state.schooleigen_vrije_dagen.filter(x => x.datum !== datum);
  bewaarState(state);
  vulVrijeDagenLijst();
};

function vulPersoneelLijst() {
  const div = document.getElementById('sec-personeel-lijst');
  let html = '';
  KLASSEN.forEach(k => {
    const klasData = state.klassen[k.id];
    const personeelskinderen = klasData.leerlingen.filter(l => l.personeelskind);
    const overige = klasData.leerlingen.filter(l => !l.personeelskind && !l.einddatum);

    html += `
      <details style="background:var(--wit); border-radius:6px; margin-bottom:6px; padding:6px 10px;" ${personeelskinderen.length > 0 ? 'open' : ''}>
        <summary style="cursor:pointer; font-weight:600;">
          ${k.klas} — ${k.leerkracht}
          ${personeelskinderen.length > 0 ? `<span style="color:var(--accent-donker); font-weight:400;"> · ⚹ ${personeelskinderen.length}</span>` : ''}
        </summary>
        <div style="margin-top:8px; padding-left:8px; columns:2; column-gap:16px;">
          ${[...personeelskinderen, ...overige].map(l => `
            <div style="display:flex; align-items:center; gap:8px; padding:3px 0; break-inside:avoid;">
              <input type="checkbox" id="pk-${l.id}" ${l.personeelskind ? 'checked' : ''}
                onchange="togglePersoneelskind('${k.id}', '${l.id}', this.checked)"
                style="width:16px; height:16px; cursor:pointer;">
              <label for="pk-${l.id}" style="cursor:pointer; font-size:0.9em; ${l.personeelskind ? 'color:var(--accent-donker); font-weight:600;' : ''}">${l.personeelskind ? '⚹ ' : ''}${escapeHtml(l.naam)}</label>
            </div>
          `).join('')}
        </div>
      </details>
    `;
  });
  div.innerHTML = html;
}

window.togglePersoneelskind = function (klasId, leerlingId, isPersoneel) {
  const klas = state.klassen[klasId];
  const l = klas.leerlingen.find(x => x.id === leerlingId);
  if (!l) return;
  l.personeelskind = isPersoneel;
  bewaarState(state);
  vulPersoneelLijst();
};

// ==============================================
// CSV EXPORT
// ==============================================
window.secRefter_exporteerKlas = function (klasId) {
  const klas = KLASSEN.find(k => k.id === klasId);
  const klasData = state.klassen[klasId];
  const dagen = dagenVanMaand(secRefter_huidigeMaand);
  const schooldagen = dagen.filter(d => dagSoort(d) === 'schooldag');
  const inv = state.refter_invullingen[klasId + '|' + secRefter_huidigeMaand] || {};

  const [jaar, maand] = secRefter_huidigeMaand.split('-').map(Number);
  const maandNamen = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];

  // CSV opbouwen (puntkomma als scheidingsteken voor Excel-NL)
  let csv = 'Naam;Personeelskind;';
  schooldagen.forEach(d => {
    const dag = parseInt(d.split('-')[2]);
    csv += dag + ';';
  });
  csv += 'Aantal maaltijden\n';

  klasData.leerlingen.forEach(l => {
    if (l.einddatum && l.einddatum < dagen[0]) return;
    csv += `"${l.naam.replace(/"/g, '""')}";${l.personeelskind ? 'JA' : 'NEE'};`;
    let aantal = 0;
    schooldagen.forEach(d => {
      if (l.personeelskind || (l.startdatum && d < l.startdatum)) {
        csv += '-;';
      } else {
        const s = inv[l.id + '|' + d] || 'aan';
        if (s === 'aan') { csv += '1;'; aantal++; }
        else csv += '0;';
      }
    });
    csv += aantal + '\n';
  });

  // Totaalrij
  csv += 'TOTAAL;;';
  let totaalSchool = 0;
  schooldagen.forEach(d => {
    let dagTotaal = 0;
    klasData.leerlingen.forEach(l => {
      if (l.personeelskind || l.einddatum || (l.startdatum && d < l.startdatum)) return;
      const s = inv[l.id + '|' + d] || 'aan';
      if (s === 'aan') dagTotaal++;
    });
    csv += dagTotaal + ';';
    totaalSchool += dagTotaal;
  });
  csv += totaalSchool + '\n';

  // Download als bestand
  const filename = `refter_${klas.klas.replace(/\s+/g, '')}_${maandNamen[maand - 1]}_${jaar}.csv`;
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM voor Excel
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

window.secRefter_exporteerAlleKlassen = function () {
  if (!confirm(`CSV-bestand downloaden voor alle ${KLASSEN.length} klassen voor ${secRefter_huidigeMaand}?\n\nElke klas krijgt een apart bestand.`)) return;
  KLASSEN.forEach((k, idx) => {
    setTimeout(() => secRefter_exporteerKlas(k.id), idx * 200);
  });
};
