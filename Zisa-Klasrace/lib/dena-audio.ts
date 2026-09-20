import type {SpellingEntry} from './spelling';
import manifest from '../public/audio/dena/manifest.json';
export const DENA_VOICE='nl-BE-DenaNeural';
export const normalizeText=(text:string)=>text.normalize('NFC').replace(/\s+/gu,' ').trim();
export function dictationText(entry:SpellingEntry):string|null {
 if(entry.sentence)return null;
 return normalizeText(entry.article?`${entry.article} ${entry.answer}`:entry.spoken);
}
const files=manifest.files as Record<string,{file:string,sha256:string}>;
export function audioFile(text:string):string|null {
 const file=files[normalizeText(text)]?.file;
 return manifest.voice===DENA_VOICE&&file&&/^[a-f0-9]{64}\.mp3$/.test(file)?file:null;
}
export function missingDena(entries:SpellingEntry[]){return [...new Set(entries.map(dictationText).filter((s):s is string=>s!==null&&!audioFile(s)))];}
const audioUrls=new Map<string,string>(),pending=new Map<string,Promise<string>>();
export const denaUrl=(text:string)=>audioUrls.get(normalizeText(text));
export async function loadDena(text:string):Promise<string>{
 text=normalizeText(text);const ready=audioUrls.get(text);if(ready)return ready;
 const file=audioFile(text);if(!file)throw Error(`Voor “${text}” is nog geen Dena-audio gepubliceerd. Vraag de maker dit woord te voorzien van audio of kies een ander woord.`);
 const existing=pending.get(text);if(existing)return existing;
 const work=(async()=>{
  let response:Response;
  try{response=await fetch(new URL(`/opvolging_huistaken/klasrace/audio/dena/${file}`,location.origin),{signal:AbortSignal.timeout(20000)});}catch{throw Error('Dena-audio laden lukt niet. Controleer je internetverbinding en klik op Audio opnieuw laden.');}
  if(!response.ok)throw Error('Dit Dena-audiobestand ontbreekt op de website. Vraag de maker de audio mee te publiceren.');
  const buffer=await response.arrayBuffer();
  if(buffer.byteLength<100||buffer.byteLength>700000)throw Error('Het Dena-audiobestand is leeg of ongeldig. Vraag de maker het opnieuw te genereren.');
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer)),b=>b.toString(16).padStart(2,'0')).join('');
  if(hash!==files[text].sha256)throw Error('Het Dena-audiobestand is beschadigd. Vraag de maker de audio opnieuw te publiceren.');
  const url=URL.createObjectURL(new Blob([buffer],{type:'audio/mpeg'}));audioUrls.set(text,url);return url;
 })();
 pending.set(text,work);try{return await work;}finally{pending.delete(text);}
}
export async function prepareDena(entries:SpellingEntry[],progress?:(message:string)=>void,active=()=>true){
 const words=[...new Set(entries.map(dictationText).filter((s):s is string=>s!==null))];
 const missing=missingDena(entries);
 if(missing.length)throw Error(`Voor ${missing.length} ${missing.length===1?'woord is':'woorden is'} nog geen Dena-audio gepubliceerd. Vraag de maker om audio of pas je selectie aan.`);
 for(let i=0;i<words.length;i++){if(!active())return;progress?.(`Dena-audio laden: ${i+1} van ${words.length}`);await loadDena(words[i]);}
}
