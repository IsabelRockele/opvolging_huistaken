// Patches only the existing class-document update rule. No pupil data writes.
const fs=require('node:fs');
const marker='    match /schoolbeheer/{schooljaar}/klassen/{klasId} {';
const helper=`    // BEGIN SCHOOLBEHEER REGISTRATIEVERSIE
    function veiligeKlasRegistratie() {
      let geraakt = request.resource.data.diff(resource.data).affectedKeys()
        .hasAny(['refter', 'activiteiten', 'refterBevestigingen', 'refterVrijeDagen', 'processed', 'registratieVersie']);
      return !geraakt || (request.resource.data.get('registratieVersie', 0) is int
        && request.resource.data.get('registratieVersie', 0) == resource.data.get('registratieVersie', 0) + 1);
    }
    // END SCHOOLBEHEER REGISTRATIEVERSIE

`;
function patch(source){
 if(source.includes('BEGIN SCHOOLBEHEER REGISTRATIEVERSIE'))throw Error('Versiebeveiliging is al aanwezig');
 const start=source.indexOf(marker),end=source.indexOf('    match /schoolbeheer/{schooljaar}/secretariaat/',start);
 if(start<0||end<0)throw Error('Klasregel niet gevonden');
 const block=source.slice(start,end);
 const old='      allow read, update: if ',exprStart=block.indexOf(old)+old.length,exprEnd=block.indexOf(';',exprStart);
 if(!block.includes(old)||exprEnd<0)throw Error('Onbekende klasregel');
 const condition=block.slice(exprStart,exprEnd);
 const changed=block.replace(old+condition+';',`      allow read: if ${condition};\n      allow update: if veiligeKlasRegistratie() && (${condition});`);
 return source.slice(0,start)+helper+changed+source.slice(end);
}
module.exports={patch,helper};
if(require.main===module){const source=fs.readFileSync('tmp/versiebeveiliging/actief.rules','utf8');fs.writeFileSync('tmp/versiebeveiliging/kandidaat.rules',patch(source));console.log('Alleen klas-updatevoorwaarde uitgebreid; overige regels behouden.');}
