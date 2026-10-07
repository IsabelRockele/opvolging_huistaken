export const LEVELS = ['onderwerp','subthema','rubriek','subrubriek'];
export const STATUS = {actief:'Actief',bereikt:'Doel bereikt',gepauzeerd:'Gepauzeerd',afgerond:'Afgerond'};
export const EFFECT = {werkt:'Werkt',gedeeltelijk:'Werkt gedeeltelijk',onvoldoende:'Werkt onvoldoende','nog-niet-te-beoordelen':'Nog niet te beoordelen'};
export const PROGRESS = {bereikt:'Doel bereikt',vooruitgang:'Vooruitgang, doel nog niet bereikt','nog-niet':'Nog geen vooruitgang','niet-beoordeeld':'Nog niet beoordeeld'};
export const FIELDS = {beginsituatie:'Beginsituatie',kinddoel:'Concreet kinddoel',succescriterium:'Wanneer is het doel bereikt?',startdatum:'Startdatum',evaluatiedatum:'Volgende evaluatie',aanpak:'Aanpak',materiaal:'Materiaal en hulpmiddelen',frequentie:'Hoe vaak en in welke situatie?',verantwoordelijke:'Wie doet wat?',ouderafspraken:'Afspraken met ouders',status:'Status'};
export const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export function filterGoals(goals, filters, stopBefore = null) {
  const search = String(filters.zoek || '').trim().toLocaleLowerCase('nl');
  return goals.filter(g => {
    if (filters.vakgebied && g.vakgebied !== filters.vakgebied) return false;
    if (filters.leeftijd && !g.leeftijden.includes(filters.leeftijd)) return false;
    for (const level of LEVELS) {
      if (level === stopBefore) break;
      if (filters[level] && g[level] !== filters[level]) return false;
    }
    return stopBefore || !search || [g.nummer,g.tekst,...LEVELS.map(l=>g[l]),...g.items.map(i=>i.tekst)].join(' ').toLocaleLowerCase('nl').includes(search);
  });
}
export function contextFromUrl(search) {
  const p = new URLSearchParams(search);
  return Object.fromEntries(['bron','schooljaar','klas','leerlingId','projectId','ficheId'].filter(k=>p.has(k)).map(k=>[k,p.get(k)]));
}
