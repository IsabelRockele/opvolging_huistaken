const esc = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

export function maakAfvinklijst({klas,jaar,leerlingen,orders,naam,datum=new Date()}) {
  let totaal=0,ontbreekt=0;
  const rijen=leerlingen.map((s,i)=>{
    const r=orders.get(`${klas}/${s.id}`);
    totaal+=r?.aantal||0;if(!r)ontbreekt++;
    return `<tr><td class="nr">${i+1}</td><td class="naam">${esc(naam(s))}</td><td class="aantal">${r?r.aantal:'—'}${!r?'<small>Nog niet ingevuld</small>':r.aantal===0?'<small>Geen brieven gewenst</small>':''}</td><td class="gemaakt">${r?.aantal>0?'<span class="vakje"></span>':'—'}</td><td></td></tr>`;
  }).join('');
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Nieuwjaarsbrieven — ${esc(klas)} — afvinklijst</title><style>
    @page{size:A4 portrait;margin:14mm}
    *{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#203d39;margin:0;font-size:11pt}
    header{border-bottom:2px solid #376d60;padding-bottom:12px;margin-bottom:12px}
    .boven{font-size:9pt;letter-spacing:1.5px;text-transform:uppercase;color:#516c66}
    h1{font-size:23pt;margin:8px 0}header p{margin:5px 0}.info{display:flex;justify-content:space-between;gap:12px;font-size:10pt}
    .uitleg{font-size:10pt;line-height:1.4;margin:12px 0}
    table{border-collapse:collapse;width:100%;table-layout:fixed;color:#172d29}
    th{background:#eaf1ed;text-align:left;font-size:9pt;text-transform:uppercase;letter-spacing:.3px}
    th,td{border:1px solid #aabbb4;padding:5px 7px;height:8mm}thead{display:table-header-group}tr{break-inside:avoid}
    .nr{width:9%;text-align:center;color:#5e7069}.naam{width:40%}.aantal{width:18%;text-align:center}.gemaakt{width:14%;text-align:center}.notitie{width:19%}
    small{display:block;font-size:7.5pt;color:#5a6862;margin-top:2px}.vakje{display:inline-block;width:5mm;height:5mm;border:1.5px solid #344e43;border-radius:1mm;vertical-align:middle}
    footer{font-size:9pt;margin-top:12px;padding-top:9px;border-top:1px solid #aabbb4;break-inside:avoid}
    .printknop{margin-bottom:15px;padding:10px 18px;font-size:12pt;cursor:pointer}
    @media print{.printknop{display:none}th{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
  </style></head><body><button class="printknop" onclick="window.print()">Afdrukken</button>
  <header><div class="boven">Klasorganisatie · afvinklijst</div><h1>Nieuwjaarsbrieven</h1><div class="info"><strong>Klas ${esc(klas)} · ${esc(jaar)}</strong><span>Afgedrukt op ${esc(datum.toLocaleDateString('nl-BE',{timeZone:'Europe/Brussels'}))}</span></div></header>
  <p class="uitleg">Vink bij <strong>Gemaakt</strong> af zodra alle gevraagde brieven van het kind klaar zijn. Gebruik de laatste kolom voor een korte notitie.</p>
  <table><thead><tr><th class="nr">Nr.</th><th class="naam">Leerling</th><th class="aantal">Aantal brieven</th><th class="gemaakt">Gemaakt</th><th class="notitie">Notitie</th></tr></thead><tbody>${rijen||'<tr><td colspan="5">Geen leerlingen op de actieve klaslijst.</td></tr>'}</tbody></table>
  <footer><strong>Totaal: ${totaal} brieven</strong> · ${leerlingen.length} kinderen${ontbreekt?` · Bij ${ontbreekt} kind(eren) is nog niets ingevuld`:''}<br>Een streepje bij het aantal betekent: nog geen antwoord. Nul betekent: geen brieven gewenst.</footer></body></html>`;
}
