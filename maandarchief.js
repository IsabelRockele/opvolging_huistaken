// Gedeelde, alleen-lezen maandexports voor secretariaat en huiswerkklas.
const naam = s => [s.last || s.lastName, s.first || s.firstName].filter(Boolean).join(' ') || s.naam || s.name || 'Onbekende leerling';
const sorteer = (a,b) => a.localeCompare(b,'nl',{numeric:true});
const actief = (s,d) => (!s.start || s.start<=d) && (!s.end || s.end>=d);
const geld = n => Number(n||0).toFixed(2);
const datum = d => String(d||'').slice(8,10)+'/'+String(d||'').slice(5,7);
const plus = (d,n) => {const x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10);};
const maandag = d => plus(d,-((new Date(d+'T12:00:00Z').getUTCDay()+6)%7));
function dagen(maand){const result=[];for(let d=maand+'-01';d.startsWith(maand);d=plus(d,1))result.push(d);return result;}
function vrij(d,k){return [0,3,6].includes(new Date(d+'T12:00:00Z').getUTCDay())||(k.vrijeDagen||[]).some(v=>v.start<=d&&v.end>=d)||(k.refterVrijeDagen||[]).some(v=>{const start=v.date||v.datum||v.start;return start<=d&&(v.end||start)>=d;});}
function verwerkt(d,k,jaar){
  const week=maandag(d);
  if(k.processed?.refterWeken)return !!k.processed.refterWeken[week];
  const laatste=[4,3,2,1,0].map(n=>plus(week,n)).find(x=>x>=jaar.slice(0,4)+'-09-01'&&x<=jaar.slice(5)+'-06-30'&&!vrij(x,k));
  return !!laatste&&!!k.processed?.refter&&k.processed.refter>=laatste;
}
function planning(r,d){const h=(r.history||[]).filter(x=>x.from&&x.from<=d).sort((a,b)=>sorteer(a.from,b.from)).at(-1);return h?{active:h.action!=='stop',days:h.days||{},free:!!r.colleague||!!h.free}:{active:actief(r,d),days:r.days||{},free:!!r.colleague||!!r.free};}

export function maakMaandOverzichten({soort,maand,schooljaar,klassen,huiswerk={},vandaag=new Date().toISOString().slice(0,10)}){
  if(!['refter','aankopen','activiteiten','huiswerkklas'].includes(soort))throw Error('Onbekende lijstsoort.');
  if(!/^\d{4}-\d{2}$/.test(maand)||maand<schooljaar.slice(0,4)+'-09'||maand>schooljaar.slice(5)+'-06')throw Error('Kies een maand binnen het schooljaar.');
  const ds=dagen(maand),result=[];
  const entries=new Map(klassen.map(k=>[k.klas,k]));
  if(soort==='huiswerkklas')Object.values(huiswerk.enrolled||{}).forEach(r=>{if(r.klas&&!entries.has(r.klas))entries.set(r.klas,{klas:r.klas,leerlingen:[]});});
  for(const [klas,k] of [...entries].sort(([a],[b])=>sorteer(a,b))){
    const leerlingen=(k.leerlingen||[]).filter(s=>ds.some(d=>actief(s,d))).sort((a,b)=>sorteer(naam(a),naam(b)));
    const sectie={klas,notities:[],tabellen:[]};
    if(soort==='refter'){
      const stat=d=>vrij(d,k)?'-':d>vandaag?'Toekomst':verwerkt(d,k,schooljaar)?'Verwerkt':k.refterBevestigingen?.[maandag(d)]?'Bevestigd':'Niet bevestigd';
      sectie.notities.push('A = aanwezig (bevestigd); X = afwezig; ? = nog niet bevestigd; - = geen refter / niet van toepassing. Totaal telt alleen bevestigde aanwezigheden.');
      sectie.tabellen.push({kop:['Leerling',...ds.map(d=>d.slice(8)),'Totaal'],breedtes:[59,...ds.map(()=>6.5),16],rijen:leerlingen.map(s=>{const cells=ds.map(d=>vrij(d,k)||!actief(s,d)||s.colleague?'-':d>vandaag?'?':k.refter?.[maand]?.[s.id]?.[d]?'X':['Verwerkt','Bevestigd'].includes(stat(d))?'A':'?');return [naam(s)+(s.colleague?' (collega)':''),...cells,String(cells.filter(x=>x==='A').length)];})});
      sectie.tabellen.push({kop:['Datums','Status / controle'],breedtes:[45,232],rijen:[...new Set(ds.filter(d=>!vrij(d,k)).map(maandag))].map(w=>{const dates=ds.filter(d=>maandag(d)===w&&!vrij(d,k));const b=k.refterBevestigingen?.[w];return [dates.map(datum).join(', '),[...new Set(dates.map(stat))].join(', ')+(b?` | Bevestigd: ${b.bevestigdOp||''} ${b.door||''}`:'')];})});
      const vrijRedenen=(k.refterVrijeDagen||[]).filter(v=>{const start=v.date||v.datum||v.start;return start<=ds.at(-1)&&(v.end||start)>=ds[0];});
      vrijRedenen.forEach(v=>sectie.notities.push(`Geen refter ${datum(v.date||v.datum||v.start)}: ${v.reason||v.reden||'hele klas'}`));
    }else if(soort==='aankopen'){
      const items=(k.aankopen||[]).filter(a=>a.date?.startsWith(maand)).sort((a,b)=>sorteer(a.date,b.date));
      sectie.tabellen.push({kop:['Datum','Leerling','Aankoop','EUR','Status'],breedtes:[23,80,100,24,50],rijen:items.map(a=>[datum(a.date),naam((k.leerlingen||[]).find(s=>s.id===a.studentId)||{name:a.studentName||`Onbekend (${a.studentId})`}),({badmuts:'Badmuts',turnshirt:'Turn-T-shirt'})[a.type]||a.name||a.type||'Andere',geld(a.price),a.processed?'Verwerkt':'Niet verwerkt'])});
      sectie.notities.push(`Totaal geregistreerd: EUR ${geld(items.reduce((n,a)=>n+Number(a.price||0),0))}. Waarvan verwerkt: EUR ${geld(items.filter(a=>a.processed).reduce((n,a)=>n+Number(a.price||0),0))}.`);
    }else if(soort==='activiteiten'){
      const items=(k.activiteiten||[]).filter(a=>a.date?.startsWith(maand)).sort((a,b)=>sorteer(a.date,b.date));
      sectie.notities.push('A = aanwezig (bevestigd); X = afwezig; ? = niet bevestigd; - = niet actief / geannuleerd. Bedragen tellen alleen bevestigde, niet-geannuleerde deelname.');
      // Kleine kolomgroepen houden ook drukke maanden leesbaar; de volledige maand blijft bij de klas.
      for(let i=0;i<items.length;i+=12){const groep=items.slice(i,i+12);
        sectie.tabellen.push({kop:['Activiteit','Datum','Omschrijving','EUR','Status'],breedtes:[23,23,125,21,85],rijen:groep.map((a,j)=>[String(i+j+1),datum(a.date),a.name||'',geld(a.price),a.cancelled?'Geannuleerd: '+(a.cancelReason||''):a.processed?'Verwerkt':a.attendanceConfirmed?'Bevestigd':'Niet bevestigd'])});
        sectie.tabellen.push({kop:['Leerling',...groep.map((a,j)=>String(i+j+1)),'EUR'],breedtes:[77,...groep.map(()=>Math.min(20,176/groep.length)),24],rijen:leerlingen.map(s=>{let totaal=0;const cells=groep.map(a=>{if(a.cancelled||!actief(s,a.date))return '-';if(a.absent?.[s.id])return 'X';if(!a.attendanceConfirmed&&!a.processed)return '?';totaal+=Number(a.price||0);return 'A';});return [naam(s),...cells,geld(totaal)];})});
      }
      items.filter(a=>a.attendanceConfirmed).forEach(a=>sectie.notities.push(`${datum(a.date)} ${a.name}: bevestigd ${a.attendanceConfirmedAt||''} ${a.attendanceConfirmedBy||''}`));
    }else{
      const dates=[...new Set([...(huiswerk.dates||[]),...Object.keys(huiswerk.attendance||{}),...Object.keys(huiswerk.cancelledDates||{}),...Object.keys(huiswerk.processedDates||{})])].filter(d=>d.startsWith(maand)).sort();
      const rows=new Map(Object.entries(huiswerk.enrolled||{}).filter(([,r])=>r.klas===klas));
      for(const s of k.leerlingen||[]){const key=`${klas}_${String(s.id||[s.last||s.lastName,s.first||s.firstName].filter(Boolean).join(', ')).replace(/[^a-z0-9_-]+/gi,'_')}`;if(!rows.has(key)&&(s.homeworkClass||s.homeworkClassHistory?.length||dates.some(d=>Object.hasOwn(huiswerk.attendance?.[d]||{},key))))rows.set(key,{name:naam(s),days:s.homeworkClassDays,start:s.homeworkClassStart,end:s.homeworkClassEnd,free:s.homeworkClassFree,colleague:s.colleague,history:s.homeworkClassHistory});}
      // Aanwezigheden zonder bewaarde leerlingfiche nooit stilzwijgend laten verdwijnen.
      dates.forEach(d=>Object.keys(huiswerk.attendance?.[d]||{}).filter(key=>key.startsWith(klas+'_')&&!rows.has(key)).forEach(key=>rows.set(key,{name:`Onbekende leerling (${key})`,days:{}})));
      sectie.notities.push('A = geregistreerd aanwezig; X = geregistreerd afwezig; ? = niet geregistreerd; - = niet gepland / geannuleerd. Gratis aanwezigheid staat als A*.');
      sectie.tabellen.push({kop:['Leerling',...dates.map(datum),'Aanw.','Betalend'],breedtes:[75,...dates.map(()=>Math.min(17,170/Math.max(1,dates.length))),16,16],rijen:[...rows].sort(([,a],[,b])=>sorteer(a.name||'',b.name||'')).map(([key,r])=>{let count=0,paid=0;const cells=dates.map(d=>{if(huiswerk.cancelledDates?.[d])return '-';const p=planning(r,d),present=huiswerk.attendance?.[d]?.[key];if(present===true){count++;if(!p.free)paid++;return p.free?'A*':'A';}if(present===false)return 'X';const day=new Date(d+'T12:00:00Z').getUTCDay();return p.active&&p.days?.[day===2?'dinsdag':day===4?'donderdag':'']?'?':'-';});return [r.name||key,...cells,String(count),String(paid)];})});
      sectie.tabellen.push({kop:['Datum','Status','Begeleiders'],breedtes:[28,69,180],rijen:dates.map(d=>[datum(d),huiswerk.cancelledDates?.[d]?'Geannuleerd':huiswerk.processedDates?.[d]?'Verwerkt':'Niet verwerkt',(huiswerk.supervisors?.[d]||[]).map(x=>typeof x==='string'?x:x.name||x.email||'').join(', ')])});
    }
    result.push(sectie);
  }
  return result;
}

export function maakMaandPdf(jsPDF,{soort,maand,schooljaar,overzichten,aangemaakt=new Date()}){
  const pdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'}),W=297,H=210,M=10;
  const titel={refter:'Refterlijsten',aankopen:'Aankooplijsten',activiteiten:'Activiteitenlijsten',huiswerkklas:'Huiswerkklas'}[soort];
  const maandNaam=new Date(maand+'-01T12:00:00').toLocaleDateString('nl-BE',{month:'long',year:'numeric'});
  let y=0,eerste=true,huidigeKlas='';
  const tekst=x=>String(x??'').replace(/[–—]/g,'-').replace(/\u00a0/g,' ');
  function pagina(){if(!eerste)pdf.addPage();eerste=false;pdf.setFillColor(37,75,93);pdf.rect(0,0,W,28,'F');pdf.setTextColor(255,255,255);pdf.setFont('helvetica','bold');pdf.setFontSize(16);pdf.text(`${titel} | Klas ${huidigeKlas}`,M,12);pdf.setFont('helvetica','normal');pdf.setFontSize(10);pdf.text(`${maandNaam} | Schooljaar ${schooljaar}`,M,21);pdf.setTextColor(30,40,50);y=35;}
  for(const sectie of overzichten){huidigeKlas=sectie.klas;pagina();
    pdf.setFontSize(9);for(const note of sectie.notities){const lines=pdf.splitTextToSize(tekst(note),W-M*2);for(const line of lines){if(y>H-20)pagina();pdf.text(line,M,y);y+=4.5;}y+=2;}
    if(!sectie.tabellen.some(t=>t.rijen.length)){pdf.text('Geen registraties voor deze maand.',M,y);continue;}
    for(const tabel of sectie.tabellen){if(!tabel.rijen.length)continue;
      const widths=tabel.breedtes,scale=Math.min(1,(W-2*M)/widths.reduce((a,b)=>a+b,0)),ws=widths.map(x=>x*scale);
      function rij(cells,kop=false){pdf.setFont('helvetica',kop?'bold':'normal');pdf.setFontSize(kop?8:8.5);const lines=cells.map((c,i)=>pdf.splitTextToSize(tekst(c),ws[i]-2));const height=Math.max(6.5,...lines.map(l=>l.length*3.8+2));if(y+height>H-16){pagina();if(!kop)rij(tabel.kop,true);}pdf.setFont('helvetica',kop?'bold':'normal');pdf.setFontSize(kop?8:8.5);let x=M;cells.forEach((c,i)=>{pdf.setFillColor(...(kop?[224,234,238]:c==='-'?[240,240,240]:[255,255,255]));pdf.setDrawColor(185,197,205);pdf.rect(x,y,ws[i],height,'FD');pdf.setTextColor(30,40,50);pdf.text(lines[i],x+1,y+4.5);x+=ws[i];});y+=height;}
      // Houd de tabelkop bij minstens de eerste rij.
      pdf.setFontSize(8.5);
      const eersteHoogte=Math.max(7,...tabel.rijen[0].map((c,i)=>pdf.splitTextToSize(tekst(c),ws[i]-2).length*3.8+2));
      if(y+8+eersteHoogte>H-16)pagina();
      rij(tabel.kop,true);tabel.rijen.forEach(r=>rij(r));y+=6;
    }
  }
  if(eerste){huidigeKlas='-';pagina();pdf.text('Geen klasgegevens gevonden.',M,y);}
  const count=pdf.getNumberOfPages();for(let i=1;i<=count;i++){pdf.setPage(i);pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.setTextColor(90,100,110);pdf.text(`Bewaarde gegevens | Export ${aangemaakt.toLocaleString('nl-BE')} | ${i} / ${count}`,M,H-6);}
  return pdf;
}
