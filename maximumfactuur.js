// ============================================================
//  MAXIMUMFACTUUR MODULE
//  GO! Basisschool De Linde – schoolbeheer.html
//
//  Dit bestand is de referentieversie van de maximumfactuur-code.
//  De code zelf staat inline in schoolbeheer.html (type="module")
//  omdat alle variabelen (data, schooljaar, classRef, esc, ...)
//  lokaal zijn in het hoofdscript.
//
//  Bij wijzigingen: pas aan in schoolbeheer.html én hier.
//  Zoek in schoolbeheer.html naar: "MAXIMUMFACTUUR"
// ============================================================

const MF_LIMIET = 105; // max factuur lagere school in euro

async function renderMaximumfactuur() {
  const el = $("content");
  if (!data) return;
  el.innerHTML = `<div class="panel"><h2>&#128179; Maximumfactuur</h2><p class="muted">Laden...</p></div>`;

  const teladenKlassen = canOpenAllClasses() ? [...allClasses] : [activeClass];

  const klassenData = {};
  await Promise.all(teladenKlassen.map(async klas => {
    try {
      const snap = await getDoc(classRef(klas));
      klassenData[klas] = snap.exists() ? snap.data() : null;
    } catch(e) {
      klassenData[klas] = null;
    }
  }));

  const sj = schooljaar || "";
  const [sj1, sj2] = (sj || "-").split("-");
  const periodeLabel = sj1 && sj2 ? `september ${sj1} tot en met juni ${sj2}` : "dit schooljaar";

  const klasHtml = teladenKlassen.map(klas => {
    const kd = klassenData[klas];
    if (!kd) return `<div class="mf-klas"><h3>Klas ${esc(klas)}</h3><p class="muted">Geen data beschikbaar.</p></div>`;

    const activiteiten = [...(kd.activiteiten || [])]
      .filter(a => a.naam && Number(a.prijs || 0) > 0)
      .sort((a, b) => (a.datum || "").localeCompare(b.datum || ""));
    const vastePosten = kd.vastePosten || [];
    const totaal = [...vastePosten, ...activiteiten].reduce((s, p) => s + Number(p.prijs || 0), 0);
    const resterend = MF_LIMIET - totaal;
    const over = totaal > MF_LIMIET;

    return `
      <div class="mf-klas" id="mf-klas-${esc(klas)}">
        <div class="mf-klas-header">
          <h3>Klas ${esc(klas)}</h3>
          <button class="secondary small no-print" onclick="mfAfdrukken('${esc(klas)}')">&#128424; Afdrukken</button>
        </div>
        <p class="muted" style="margin-bottom:8px;font-size:13px">Overzicht activiteiten van ${esc(periodeLabel)}</p>
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th style="width:55%">Omschrijving</th>
              <th style="width:18%">Kostprijs</th>
              <th style="width:20%">Datum</th>
              <th style="width:7%" class="no-print"></th>
            </tr></thead>
            <tbody>
              ${vastePosten.map((p, i) => `
                <tr class="mf-vaste-rij">
                  <td><em>${esc(p.naam)}</em></td>
                  <td>&euro;&nbsp;${Number(p.prijs).toFixed(2)}</td>
                  <td>${esc(p.datum || "Schooljaar " + sj)}</td>
                  <td class="no-print">
                    <button class="ghost small" style="color:#c0392b" onclick="mfVasteVerwijderen('${esc(klas)}',${i})" title="Verwijderen">&#10005;</button>
                  </td>
                </tr>`).join("")}
              ${activiteiten.map(a => `
                <tr>
                  <td>${esc(a.naam)}</td>
                  <td>&euro;&nbsp;${Number(a.prijs).toFixed(2)}</td>
                  <td>${esc(a.datum || "")}</td>
                  <td class="no-print"></td>
                </tr>`).join("")}
              ${vastePosten.length === 0 && activiteiten.length === 0
                ? `<tr><td colspan="4" style="color:#9ca3af;text-align:center;padding:16px">Nog geen posten voor deze klas.</td></tr>`
                : ""}
            </tbody>
            <tfoot>
              <tr style="background:${over ? "#fde8e8" : "#edfbea"}">
                <td><strong>Totaal aan uitgaven</strong></td>
                <td><strong>&euro;&nbsp;${totaal.toFixed(2)}</strong></td>
                <td colspan="2">
                  ${over
                    ? `<span class="tag" style="background:#c0392b;color:#fff">&#9888; Limiet overschreden met &euro;${Math.abs(resterend).toFixed(2)}</span>`
                    : `<span class="tag" style="background:#27ae60;color:#fff">Nog &euro;${resterend.toFixed(2)} beschikbaar</span>`}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div class="no-print" style="background:#f8f9fa;border:1px solid #e5e7eb;border-radius:10px;padding:14px;margin-top:10px">
          <p style="font-weight:700;margin:0 0 8px">Vaste post toevoegen</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">
            <input type="text" id="mfNaam-${esc(klas)}" placeholder="Omschrijving (bv. Digitale tools)" style="flex:2;min-width:160px">
            <input type="number" id="mfPrijs-${esc(klas)}" placeholder="Prijs (€)" step="0.01" min="0" style="flex:0.8;min-width:90px">
            <input type="text" id="mfDatum-${esc(klas)}" placeholder="Datum / periode" style="flex:1.2;min-width:120px">
            <button class="primary small" onclick="mfVasteToevoegen('${esc(klas)}')">+ Toevoegen</button>
          </div>
        </div>
      </div>`;
  }).join("<hr style='border:none;border-top:2px solid #e5e7eb;margin:24px 0'>");

  el.innerHTML = `
    <div class="panel">
      <div class="bar">
        <div>
          <h2>&#128179; Maximumfactuur</h2>
          <p class="muted">Activiteiten worden automatisch ingeladen vanuit het activiteitentabblad. Voeg hieronder vaste posten toe (bv. digitale tools). Limiet: <strong>&euro;${MF_LIMIET}</strong> per kind.</p>
        </div>
        ${canOpenAllClasses() ? `<button class="secondary no-print" onclick="mfAllesAfdrukken(${JSON.stringify(teladenKlassen)},${JSON.stringify(klassenData)})">&#128424; Alle klassen afdrukken</button>` : ""}
      </div>
      ${klasHtml}
    </div>`;

  window._mfKlassenData = klassenData;
  window._mfKlassen = teladenKlassen;
}

window.mfVasteToevoegen = async function(klas) {
  const naam = document.getElementById(`mfNaam-${klas}`)?.value?.trim();
  const prijs = Number(document.getElementById(`mfPrijs-${klas}`)?.value || 0);
  const datum = document.getElementById(`mfDatum-${klas}`)?.value?.trim();
  if (!naam) return alert("Vul een omschrijving in.");
  const snap = await getDoc(classRef(klas));
  const kd = snap.exists() ? snap.data() : {};
  if (!Array.isArray(kd.vastePosten)) kd.vastePosten = [];
  kd.vastePosten.push({ naam, prijs, datum: datum || "" });
  kd.bijgewerktOp = new Date().toISOString();
  await setDoc(classRef(klas), kd);
  renderMaximumfactuur();
};

window.mfVasteVerwijderen = async function(klas, index) {
  if (!confirm("Vaste post verwijderen?")) return;
  const snap = await getDoc(classRef(klas));
  if (!snap.exists()) return;
  const kd = snap.data();
  if (!Array.isArray(kd.vastePosten)) return;
  kd.vastePosten.splice(index, 1);
  kd.bijgewerktOp = new Date().toISOString();
  await setDoc(classRef(klas), kd);
  renderMaximumfactuur();
};

window.mfAfdrukken = function(klas) {
  const kd = window._mfKlassenData?.[klas];
  if (kd) mfGenereerDocx([klas], { [klas]: kd });
  else alert("Data niet geladen. Probeer opnieuw.");
};

window.mfAllesAfdrukken = function(klassen, klassenData) {
  mfGenereerDocx(klassen, klassenData);
};

async function mfGenereerDocx(klassen, klassenData) {
  let lib;
  try {
    lib = await import("https://cdn.jsdelivr.net/npm/docx@9.3.0/build/index.js");
  } catch(e) {
    alert("Word-export niet beschikbaar. De pagina wordt afgedrukt.");
    window.print();
    return;
  }
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
          BorderStyle, WidthType, ShadingType, VerticalAlign } = lib;

  const sj = schooljaar || "";
  const [sj1, sj2] = (sj || "-").split("-");
  const periodeLabel = sj1 && sj2 ? `september ${sj1} tot en met juni ${sj2}` : "dit schooljaar";

  const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const PAGE_W = 11906, MARGIN = 1134, CW = PAGE_W - 2 * MARGIN;
  const colW = [Math.round(CW * 0.55), Math.round(CW * 0.25), Math.round(CW * 0.20)];

  function tc(tekst, w, opts = {}) {
    return new TableCell({
      borders,
      width: { size: w, type: WidthType.DXA },
      shading: opts.bg ? { fill: opts.bg, type: ShadingType.CLEAR } : undefined,
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      verticalAlign: VerticalAlign.CENTER,
      children: [new Paragraph({
        children: [new TextRun({
          text: String(tekst), bold: !!opts.bold,
          size: opts.small ? 18 : 20, font: "Arial",
          color: opts.color || "000000"
        })]
      })]
    });
  }

  const secties = klassen.map(klas => {
    const kd = klassenData[klas] || {};
    const activiteiten = [...(kd.activiteiten || [])]
      .filter(a => a.naam && Number(a.prijs || 0) > 0)
      .sort((a, b) => (a.datum || "").localeCompare(b.datum || ""));
    const vastePosten = kd.vastePosten || [];
    const totaal = [...vastePosten, ...activiteiten].reduce((s, p) => s + Number(p.prijs || 0), 0);

    const rijen = [
      new TableRow({ tableHeader: true, children: [
        tc("OMSCHRIJVING", colW[0], { bold: true, bg: "D5E8F0" }),
        tc("KOSTPRIJS",    colW[1], { bold: true, bg: "D5E8F0" }),
        tc("DATUM",        colW[2], { bold: true, bg: "D5E8F0" }),
      ]}),
      ...vastePosten.map(p => new TableRow({ children: [
        tc(p.naam,                              colW[0]),
        tc(`€ ${Number(p.prijs).toFixed(2)}`,   colW[1]),
        tc(p.datum || `Schooljaar ${sj}`,       colW[2]),
      ]})),
      ...activiteiten.map(a => new TableRow({ children: [
        tc(a.naam,                              colW[0]),
        tc(`€ ${Number(a.prijs).toFixed(2)}`,   colW[1]),
        tc(a.datum || "",                       colW[2]),
      ]})),
      // 2 lege rijen onderaan
      new TableRow({ children: [tc("", colW[0]), tc("", colW[1]), tc("", colW[2])] }),
      new TableRow({ children: [tc("", colW[0]), tc("", colW[1]), tc("", colW[2])] }),
    ];

    return {
      properties: { page: {
        size: { width: 11906, height: 16838 },
        margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN }
      }},
      children: [
        new Paragraph({ children: [new TextRun({ text: "GO! Basisschool De Linde", bold: true, size: 24, font: "Arial" })] }),
        new Paragraph({ children: [new TextRun({ text: "Lindestraat 123A  |  2880 Bornem  |  03 897 98 16  |  info@bsdelinde.net", size: 18, color: "666666", font: "Arial" })] }),
        new Paragraph({ children: [new TextRun({ text: "" })] }),
        new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: [CW], rows: [
          new TableRow({ children: [new TableCell({
            borders,
            width: { size: CW, type: WidthType.DXA },
            shading: { fill: "1A5276", type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 180, right: 180 },
            children: [new Paragraph({ children: [
              new TextRun({ text: `Klas: ${klas}`, bold: true, size: 28, color: "FFFFFF", font: "Arial" })
            ]})]
          })]})
        ]}),
        new Paragraph({ children: [new TextRun({ text: "" })] }),
        new Paragraph({ children: [new TextRun({ text: `Overzicht activiteiten van ${periodeLabel}`, bold: true, size: 22, font: "Arial" })] }),
        new Paragraph({ children: [new TextRun({ text: `De maximumfactuur bedraagt €${MF_LIMIET} voor de lagere school.`, size: 20, color: "444444", font: "Arial" })] }),
        new Paragraph({ children: [new TextRun({ text: "" })] }),
        new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: colW, rows: rijen }),
        new Paragraph({ children: [new TextRun({ text: "" })] }),
        new Paragraph({ children: [
          new TextRun({ text: "Totaal aan uitgaven:  ", bold: true, size: 22, font: "Arial" }),
          new TextRun({ text: `€ ${totaal.toFixed(2)}`, bold: true, size: 22, font: "Arial" }),
        ]}),
        new Paragraph({ children: [new TextRun({ text: "" })] }),
        new Paragraph({ children: [new TextRun({
          text: "(dit bedrag is reeds gefactureerd geweest en dient dus niet opnieuw betaald te worden. Bij afwezigheid werd het bedrag van de activiteit niet aangerekend)",
          size: 18, color: "555555", font: "Arial", italics: true
        })] }),
      ]
    };
  });

  const doc = new Document({ sections: secties });
  const buffer = await Packer.toBuffer(doc);
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = klassen.length === 1
    ? `maximumfactuur_${klassen[0]}_${sj}.docx`
    : `maximumfactuur_alle_klassen_${sj}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}