const naamKey = value => String(value || '').trim().toLocaleLowerCase('nl').replace(/\s+/g, ' ');

export function zelfdeFotoregistratie(a, b) {
  if (a.leerlingId && b.leerlingId) return String(a.leerlingId) === String(b.leerlingId);
  return a.klas === b.klas && !!naamKey(a.naam) && naamKey(a.naam) === naamKey(b.naam);
}

export function wijzigFotostatus(item, leerling, status, reden = '') {
  const result = {};
  for (const key of ['uitzonderingen', 'ontbrekendeFormulieren', 'gecontroleerdeLeerlingen']) {
    result[key] = (item[key] || []).filter(x => !zelfdeFotoregistratie(x, leerling));
  }
  if (status !== 'controleren') result.gecontroleerdeLeerlingen.push({...leerling});
  if (status === 'nee') result.uitzonderingen.push({...leerling, reden: reden.trim()});
  if (status === 'onbekend') result.ontbrekendeFormulieren.push({...leerling});
  return result;
}

export function wijzigFotoreden(item, leerling, reden) {
  // Een ondertussen toegestane leerling nooit opnieuw aan de lijst toevoegen.
  return (item.uitzonderingen || []).map(x => zelfdeFotoregistratie(x, leerling) ? {...x, reden: reden.trim()} : x);
}

export function maakFotoPdf(jsPDF, {soort, schooljaar, leerlingen}) {
  const pdf = new jsPDF({unit:'mm', format:'a4'});
  const metReden = soort === 'nee';
  const titel = metReden ? 'Mag niet op de foto' : 'Formulier ontbreekt';
  const widths = metReden ? [65, 22, 95] : [150, 32];
  const margin = 14, bottom = 280, lineHeight = 4.6;
  let y;
  const pagina = (nieuw = false) => {
    if (nieuw) pdf.addPage();
    pdf.setFont('helvetica','bold');pdf.setFontSize(20);pdf.setTextColor(170,35,35);
    pdf.text(titel,margin,22);
    pdf.setFont('helvetica','normal');pdf.setFontSize(10);pdf.setTextColor(80,80,80);
    pdf.text(`Schooljaar ${schooljaar}`,margin,30);
    y=39;
    pdf.setFont('helvetica','bold');pdf.setTextColor(30,30,30);
    let x=margin;
    (metReden?['Naam','Klas','Reden']:['Naam','Klas']).forEach((text,i)=>{pdf.text(text,x+2,y);x+=widths[i];});
    y+=3;pdf.setDrawColor(190,190,190);pdf.line(margin,y,196,y);y+=3;
    pdf.setFont('helvetica','normal');
  };
  pagina();
  const lijst=[...leerlingen].sort((a,b)=>String(a.klas).localeCompare(String(b.klas),'nl',{numeric:true})||String(a.naam).localeCompare(String(b.naam),'nl'));
  for (const leerling of lijst) {
    const cells=[leerling.naam,leerling.klas,...(metReden?[leerling.reden||'Geen reden ingevuld']:[])];
    const lines=cells.map((text,i)=>pdf.splitTextToSize(String(text||''),widths[i]-4));
    const count=Math.max(...lines.map(x=>x.length));
    const height=count*lineHeight+4;
    if(y+height>bottom && height<=bottom-48)pagina(true);
    for(let offset=0;offset<count;){
      let room=Math.floor((bottom-y-4)/lineHeight);
      if(room<1){pagina(true);room=Math.floor((bottom-y-4)/lineHeight);}
      const take=Math.min(room,count-offset);let x=margin;
      lines.forEach((cell,i)=>{const part=cell.slice(offset,offset+take);if(part.length)pdf.text(part,x+2,y+4,{lineHeightFactor:1.3});x+=widths[i];});
      y+=take*lineHeight+4;offset+=take;
      if(offset<count)pagina(true);
    }
    pdf.setDrawColor(225,225,225);pdf.line(margin,y,196,y);y+=2;
  }
  if(!lijst.length)pdf.text('Geen leerlingen in dit overzicht.',margin,y+4);
  const count=pdf.getNumberOfPages();
  for(let i=1;i<=count;i++){pdf.setPage(i);pdf.setFontSize(8);pdf.setTextColor(110,110,110);pdf.text(`${i} / ${count}`,196,290,{align:'right'});}
  return pdf;
}
