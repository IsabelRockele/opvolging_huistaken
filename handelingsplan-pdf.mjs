import {FIELDS,STATUS,EFFECT,PROGRESS} from './handelingsplan-model.mjs';
import {DOELRESULTAAT} from './handelingsplan-evaluatie.mjs';

// Tekst wordt per regel gepagineerd; lange notities blijven volledig leesbaar.
export function buildPlanPdf(jsPDF,{naam,klas,schooljaar,plan,events=[],priorDrafts=[],evaluation=null,concept=false}) {
  const pdf=new jsPDF({unit:'mm',format:'a4'}),margin=18,width=174,bottom=277;
  let y=22;
  const clean=v=>String(v??'').replace(/\r/g,'').replace(/[\u2010-\u2015]/g,'-').replace(/\u202f|\u00a0/g,' ');
  function lines(text,size=10,bold=false){
    pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(size);
    for(const line of pdf.splitTextToSize(clean(text)||'-',width)){
      if(y+size*.48>bottom){pdf.addPage();y=22;}
      pdf.text(line,margin,y);y+=size*.48;
    }
  }
  function heading(text){if(y>bottom-22){pdf.addPage();y=22;}y+=5;lines(text,13,true);y+=3;}
  function field(label,value){if(y>bottom-15){pdf.addPage();y=22;}lines(label,10,true);lines(value);y+=3;}
  function snapshot(p){for(const [k,label] of Object.entries(FIELDS))field(label,k==='status'?STATUS[p[k]]:p[k]);}
  function prior(p){heading(`${p.schooljaar} - ${p.klas}`);for(const [key,label] of Object.entries({doel:'Toenmalig doel',periode:'Periode',aanpak:'Geprobeerd',effect:'Effect',resultaat:'Resultaat en wat we meenemen',ouders:'Ouderafspraken toen',bron:'Informatiebron / betrokken leerkracht'}))field(label,key==='effect'?EFFECT[p[key]]:p[key]);}
  function evalFields(e){for(const [k,label] of Object.entries({datum:'Evaluatiedatum',uitgevoerd:'Uitgevoerd',observatie:'Observatie',effect:'Effect',doelbereik:'Doelbereik',besluit:'Besluit',ouders:'Besproken met ouders'}))field(label,k==='effect'?EFFECT[e[k]]:k==='doelbereik'?PROGRESS[e[k]]:e[k]);for(const d of e.doelen||[]){field(`${d.titel} - ${d.tekst}`,DOELRESULTAAT[d.resultaat]||'Nog niet beoordeeld');field('Vervolgactie bij dit doel',d.actie);}}
  lines('Individueel handelingsplan',20,true);y+=4;
  lines(`${naam} - ${klas} - ${schooljaar}`,12,true);y+=3;
  if(concept)lines('CONCEPT - bevat nog niet bewaarde invoer',10,true);
  heading('Leerplandoel');lines(`${plan.doel.vakgebied} - ${plan.doel.nummer}`,11,true);lines(plan.doel.tekst);
  for(const item of plan.doel.items||[])field(item.groep,item.tekst);
  heading('Huidig plan en afspraken');snapshot(plan);
  if(evaluation){heading('Nieuwe evaluatie - nog niet bewaard');evalFields(evaluation);}
  const earlier=events.flatMap(e=>(e.eerdereAanpak||[]).map(p=>({...p,ingevoerdOp:e.datum,auteur:e.auteur}))).sort((a,b)=>b.schooljaar.localeCompare(a.schooljaar));
  if(earlier.length||priorDrafts.length){heading('Eerdere aanpak per schooljaar en klas');for(const p of earlier){prior(p);field('Achteraf ingevoerd',`${p.ingevoerdOp.slice(0,10)} - ${p.auteur}`);}for(const p of priorDrafts){prior(p);lines('Nog niet bewaard',10,true);}}
  if(events.length){heading('Bewaarde versies en evaluaties');for(const e of events){heading(`${e.datum.slice(0,10)} - ${e.context.schooljaar} - ${e.context.klas} - versie ${e.versie}`);field('Ingevoerd door',e.auteur);if(e.evaluatie)evalFields(e.evaluatie);snapshot(e.plan);}}
  const pages=pdf.getNumberOfPages();
  for(let i=1;i<=pages;i++){pdf.setPage(i);pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.setTextColor(90);pdf.text(`Handelingsplan - ${i} / ${pages}`,margin,289);pdf.setTextColor(0);}
  return pdf;
}
