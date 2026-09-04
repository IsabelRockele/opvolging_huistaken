export const key=s=>[s.lastName||s.last||'',s.firstName||s.first||''].map(v=>String(v).normalize('NFC').trim().replace(/\s+/g,' ').toLowerCase()).join('|');
export const label=s=>`${s.lastName||s.last||''}, ${s.firstName||s.first||''}`;
export function buildPreview(backup){
  if(backup.format!=='overdracht-controle-v1'||!backup.completeScan||backup.projectId!=='huiswerkapp-a311e')throw Error('Gebruik de volledige controleback-up van deze school.');
  const get=path=>{const d=backup.documents.find(d=>d.path===path);if(!d)throw Error('Bron ontbreekt: '+path);return d;};
  const result=['2A','3A'].map(klas=>{
    const rosterDoc=get(`schoolbeheer/2026-2027/klassen/${klas}`);
    const roster=rosterDoc.data.leerlingen.filter(s=>!s.startNiet&&(!s.start||s.start<='2026-09-04')&&(!s.end||s.end>='2026-09-04'));
    const targets=backup.documents.filter(d=>d.classes.includes(klas)&&d.path.includes('/2026-2027/projecten/'));
    if(targets.length!==1)throw Error('Doelproject niet eenduidig voor '+klas);
    const target=targets[0],source=get(target.path.replace('/2026-2027/','/2025-2026/'));
    if(new Set(roster.map(s=>s.id)).size!==roster.length||new Set(roster.map(key)).size!==roster.length)throw Error('Dubbele actieve leerlingen in '+klas);
    const changes=[],idMap=new Map();
    const students=roster.map(r=>{
      const now=target.data.students.filter(s=>s.schoolbeheerId===r.id||key(s)===key(r));
      if(now.length>1)throw Error('Meerdere huidige fiches voor '+label(r));
      const aliases=new Set([key(r),...now.map(key)]);
      if(key(r)==='perexempel|godts noah')aliases.add('perexempel godts|noah');
      const old=source.data.students.filter(s=>aliases.has(key(s)));
      if(old.length>1)throw Error('Meerdere oude fiches voor '+label(r));
      const isNew=['knowland|lucien','halawa|maher'].includes(key(r));
      if(!old.length&&!isNew)throw Error('Oude fiche niet gevonden: '+label(r));
      const current=now[0]||{},previous=old[0]||{};
      // Oude volledige fiche als basis; afwijkende huidige waarden blijven zichtbaar
      // in het voorstel en in de originele back-up. GOK komt uitsluitend centraal.
      const merged={...current,...previous,id:current.id||`herstel_${r.id}`,schoolbeheerId:r.id,
        firstName:r.first,lastName:r.last,name:`${r.first} ${r.last}`.trim(),
        gok:r.gok==='ja'?'ja':'nee',gokKenmerken:[...(r.gokKenmerken||[])],gokNote:r.gokNote||''};
      if(previous.id)idMap.set(previous.id,merged.id);
      const differences=Object.keys(previous).filter(f=>!['id','name','firstName','lastName','schoolbeheerId','gok','gokKenmerken','gokNote'].includes(f)&&JSON.stringify(current[f])!==JSON.stringify(previous[f]));
      changes.push({name:label(merged),isNew,differences,current,previous});
      return merged;
    });
    for(const s of students)for(const field of ['friends','avoid'])if(Array.isArray(s[field]))s[field]=s[field].map(id=>idMap.get(id)||id);
    if(klas==='2A'&&!students.some(s=>key(s)==='de bondt|storm'))throw Error('Storm ontbreekt in 2A');
    if(klas==='3A'&&students.some(s=>key(s)==='de bondt|storm'))throw Error('Storm mag niet in 3A');
    if(students.length!==(klas==='2A'?22:17))throw Error('Afwijkend klasaantal; opnieuw controleren.');
    return {klas,target,source,rosterDoc,students,changes,gokCount:students.filter(s=>s.gok==='ja').length};
  });
  if(new Set(result.flatMap(c=>c.students.map(key))).size!==39)throw Error('Een leerling staat in beide klassen');
  return result;
}
export function stable(v){if(Array.isArray(v))return '['+v.map(stable).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';return JSON.stringify(v);}
