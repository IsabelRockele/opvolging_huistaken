// Gebruik dezelfde gevalideerde GO!-doelensets als het handelingsplan.
// De bestaande Nederlands- en Wiskundebestanden blijven ongewijzigd.
import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const catalog=JSON.parse(fs.readFileSync(new URL('handelingsplan-doelen.json',root),'utf8'));
const aanvullend={};
for(const {items,...doel} of catalog.doelen){
  if(['Nederlands','Wiskunde'].includes(doel.vakgebied))continue;
  (aanvullend[doel.vakgebied]??=[]).push({...doel,aanklikbareItems:items});
}
fs.writeFileSync(new URL('leerplandoelen-aanvullend.js',root),`// Afgeleid uit handelingsplan-doelen.json (${catalog.versie}).\n// Opnieuw genereren: node tools/genereer-groeiplan-aanvulling.mjs\nexport const LEERPLANDOELEN_AANVULLEND = ${JSON.stringify(aanvullend)};\n`);
console.log(`${Object.keys(aanvullend).length} vakgebieden, ${Object.values(aanvullend).flat().length} aanvullende doelen.`);
