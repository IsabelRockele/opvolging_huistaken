import {evaluatieDoelen,DOELRESULTAAT} from './handelingsplan-evaluatie.mjs';
function fail(message, code = 'failed-precondition') { const e = new Error(message); e.code = code; throw e; }
function text(value, max = 6000) {
  if (typeof value !== 'string' || value.length > max) fail('Een veld ontbreekt of is te lang.', 'invalid-argument');
  return value.trim();
}
function id(value) {
  const v = text(value, 200);
  if (!v || v.includes('/') || /[\x00-\x1f]/.test(v)) fail('Ongeldige verwijzing.', 'invalid-argument');
  return v;
}
function year(value) {
  if (!/^\d{4}-\d{4}$/.test(value) || Number(value.slice(5)) !== Number(value.slice(0,4)) + 1) fail('Ongeldig schooljaar.', 'invalid-argument');
  return value;
}
function today(now = new Date()) { return new Intl.DateTimeFormat('sv-SE', { timeZone:'Europe/Brussels' }).format(now); }
function schoolYear(date = today()) { const y = Number(date.slice(0,4)) - (date.slice(5,7) < '09' ? 1 : 0); return `${y}-${y+1}`; }
function date(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0,10) !== value) fail('Kies een geldige datum.', 'invalid-argument');
  return value;
}
function active(s, day) {
  return s.actief !== false && !s.inactief && !s.startNiet &&
    (!s.start && !s.startDatum || String(s.startDatum || s.start).slice(0,10) <= day) &&
    (!s.end && !s.eindDatum || String(s.eindDatum || s.end).slice(0,10) >= day);
}
const fields = ['kinddoel','beginsituatie','succescriterium','aanpak','materiaal','frequentie','verantwoordelijke','ouderafspraken'];
function planInput(raw, goals, old) {
  if (!raw || typeof raw !== 'object') fail('Het plan ontbreekt.', 'invalid-argument');
  const p = Object.fromEntries(fields.map(f => [f,text(raw[f] ?? '')]));
  for (const f of ['kinddoel','beginsituatie','succescriterium','aanpak','frequentie','verantwoordelijke']) if (!p[f]) fail('Vul beginsituatie, kinddoel, succescriterium, aanpak, frequentie en verantwoordelijke in.', 'invalid-argument');
  p.startdatum = date(raw.startdatum); p.evaluatiedatum = date(raw.evaluatiedatum);
  if (p.evaluatiedatum < p.startdatum) fail('De evaluatiedatum ligt vóór de startdatum.', 'invalid-argument');
  if (old) {
    p.doel = old.doel; p.startdatum = old.startdatum;
    if (p.evaluatiedatum < p.startdatum) fail('De evaluatiedatum ligt vóór de startdatum.', 'invalid-argument');
  } else {
    const goal = goals.find(g => g.id === raw.doelId);
    if (!goal) fail('Selecteer een leerplandoel uit de doelenkiezer.', 'invalid-argument');
    const chosen = raw.doelItems || [];
    if (!Array.isArray(chosen) || chosen.some(i=>!Number.isInteger(i) || !goal.items[i])) fail('Ongeldige doelverfijning.', 'invalid-argument');
    p.doel = {...goal, items:[...new Set(chosen)].map(i=>goal.items[i])};
  }
  p.status = raw.status || 'actief';
  if (!['actief','bereikt','gepauzeerd','afgerond'].includes(p.status)) fail('Ongeldige planstatus.', 'invalid-argument');
  return p;
}
function evaluationInput(raw, plan, day) {
  if (!raw) return null;
  const e = {datum:date(raw.datum), uitgevoerd:text(raw.uitgevoerd), observatie:text(raw.observatie), effect:text(raw.effect,60), doelbereik:text(raw.doelbereik,60), besluit:text(raw.besluit), ouders:text(raw.ouders || '')};
  if (!e.uitgevoerd || !e.observatie || !e.besluit) fail('Vul uitvoering, observatie en besluit in.', 'invalid-argument');
  if (!['werkt','gedeeltelijk','onvoldoende','nog-niet-te-beoordelen'].includes(e.effect) || !['bereikt','vooruitgang','nog-niet','niet-beoordeeld'].includes(e.doelbereik)) fail('Kies effect en doelbereik.', 'invalid-argument');
  if (e.datum > day || e.datum < plan.startdatum || schoolYear(e.datum) !== schoolYear(day)) fail('Kies een evaluatiedatum in het lopende schooljaar, vanaf de start van het plan en niet in de toekomst.', 'invalid-argument');
  if(raw.doelen!==undefined){
    const targets=evaluatieDoelen(plan.doel);
    if(!Array.isArray(raw.doelen)||raw.doelen.length!==targets.length||new Set(raw.doelen.map(d=>d?.id)).size!==targets.length)fail('Controleer de evaluatie van de gekozen doelen.','invalid-argument');
    e.doelen=targets.map(target=>{
      const value=raw.doelen.find(d=>d?.id===target.id);
      if(!value||!Object.hasOwn(DOELRESULTAAT,value.resultaat))fail('Kies een geldig resultaat per doel.','invalid-argument');
      return {...target,resultaat:value.resultaat,actie:text(value.actie||'')};
    });
  }
  return e;
}
function priorInput(raw, day) {
  if (raw == null) return [];
  if (!Array.isArray(raw) || raw.length > 20) fail('Voeg maximaal twintig eerdere aanpakken tegelijk toe.', 'invalid-argument');
  return raw.map(item => {
    if (!item || typeof item !== 'object') fail('Ongeldige eerdere aanpak.', 'invalid-argument');
    const p = {schooljaar:year(item.schooljaar)};
    if (Number(p.schooljaar.slice(0,4)) < 1900 || p.schooljaar > schoolYear(day)) fail('Kies voor eerdere aanpak een huidig of vorig schooljaar.', 'invalid-argument');
    for (const key of ['klas','periode','doel','aanpak','effect','resultaat','ouders','bron']) p[key] = text(item[key] ?? '', ['klas','periode','effect'].includes(key)?200:6000);
    if (['klas','doel','aanpak','resultaat','bron'].some(key=>!p[key])) fail('Vul klas, toenmalig doel, aanpak, resultaat en informatiebron in.', 'invalid-argument');
    if (!['werkt','gedeeltelijk','onvoldoende','nog-niet-te-beoordelen'].includes(p.effect)) fail('Kies het effect van de eerdere aanpak.', 'invalid-argument');
    return p;
  });
}
export {fail,text,id,year,today,schoolYear,active,planInput,evaluationInput,priorInput};
