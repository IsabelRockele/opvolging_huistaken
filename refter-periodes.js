// Refterweken worden op iedere maandgrens gesplitst. Datums blijven ISO-sleutels.
export const plusDag=(d,n)=>{const x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10);};
const maandag=d=>plusDag(d,-((new Date(d+'T12:00:00Z').getUTCDay()+6)%7));
export const periodeStart=d=>{const dag=new Date(d+'T12:00:00Z').getUTCDay();if(dag===0||dag===6)d=plusDag(d,dag===0?-2:-1);return [maandag(d),d.slice(0,7)+'-01'].sort().at(-1);};
export function periodeDagen(d){const start=periodeStart(d),eind=plusDag(maandag(start),4),result=[];for(let x=start;x<=eind&&x.slice(0,7)===start.slice(0,7);x=plusDag(x,1))result.push(x);return result;}
export const periodeEind=d=>periodeDagen(d).at(-1)||d;
export function periodes(van,tot){const result=[];for(let d=van;d<=tot;d=plusDag(d,1)){if([0,6].includes(new Date(d+'T12:00:00Z').getUTCDay()))continue;const k=periodeStart(d);if(result.at(-1)!==k)result.push(k);}return result;}
export function periodeRecord(map,d){const key=periodeStart(d);if(Object.hasOwn(map||{},key))return map[key]||null;const oud=map?.[maandag(d)];return oud&&!oud.periodeTot?oud:null;}
// Oude bevestigingen/verwerkingen betroffen de volledige week. Bewaar beide
// maanddelen voordat een van de twee wordt gewijzigd of opnieuw verwerkt.
export function splitsOudeRecords(map){if(!map)return;for(const [key,value] of Object.entries({...map})){if(!value||value.periodeTot)continue;const maandagKey=maandag(key);if(key!==maandagKey)continue;const keys=periodes(key,plusDag(key,4));if(keys.length===1&&keys[0]===key)continue;for(const k of keys){if(k===key||!Object.hasOwn(map,k))map[k]={...value,periodeTot:periodeEind(k)};}if(!keys.includes(key))delete map[key];}}
export function maandLaatsteDag(key,isVrij){let d=key.slice(0,7)+'-01',laatste='';while(d.slice(0,7)===key.slice(0,7)){if(!isVrij(d))laatste=d;d=plusDag(d,1);}return laatste;}
export function magBevestigen(key,vandaag,isVrij,voorVakantie=false){const laatste=periodeDagen(key).filter(d=>!isVrij(d)).at(-1);if(!laatste)return false;return periodeEind(key)<vandaag||(laatste===maandLaatsteDag(key,isVrij)&&laatste<vandaag)||(voorVakantie&&periodeEind(key)<=vandaag);}
