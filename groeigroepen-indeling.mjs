export const GROEP_INDELINGEN = [
  {id:'kleuters',naam:'Kleuters',hint:'KLS · K1 · K2 · K3'},
  {id:'graad1',naam:'Eerste graad',hint:'L1 · L2'},
  {id:'graad2',naam:'Tweede graad',hint:'L3 · L4'},
  {id:'graad3',naam:'Derde graad',hint:'L5 · L6'},
  {id:'overige',naam:'Graadoverschrijdend / overige',hint:''}
];
function herkenGraden(tekst){
  const t=String(tekst||'').toLowerCase(),gevonden=new Set();
  if(/\b(?:kls|kleuters?|kleutergroep|k\s*[123])\b/.test(t))gevonden.add('kleuters');
  for(const m of t.matchAll(/\b(?:l\s*|leerjaar\s*)([1-6])\b/g))gevonden.add('graad'+Math.ceil(Number(m[1])/2));
  for(const m of t.matchAll(/\b([1-6])\s*(?:ste|de|e)?\s*leerjaar\b/g))gevonden.add('graad'+Math.ceil(Number(m[1])/2));
  for(const m of t.matchAll(/\b([123])\s*(?:ste|de|e)?\s*graad\b/g))gevonden.add('graad'+m[1]);
  return gevonden;
}
export function groepIndeling(g){
  if(GROEP_INDELINGEN.some(x=>x.id===g.indeling))return g.indeling;
  const naam=herkenGraden(g.naam);
  if(naam.size)return naam.size===1?[...naam][0]:'overige';
  const klassen=herkenGraden((g.leerlingen||[]).map(s=>s.klas||'').join(' '));
  return klassen.size===1?[...klassen][0]:'overige';
}
