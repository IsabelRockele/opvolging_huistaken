import {plainEntry,type SpellingEntry} from './spelling';
import library from './word-library.json';
export type WordGroup={id:string;title:string;description:string;words:string[]};
export const WORD_ENTRIES:Record<string,SpellingEntry>=Object.fromEntries(library.groups.flatMap(g=>g.entries.map(e=>[e.label,e as SpellingEntry])));
export const WORD_GROUPS:WordGroup[]=library.groups.map(g=>({id:g.id,title:g.title,description:g.description,words:g.entries.map(e=>e.label)}));
export function resolveWords(value:string,imported:Record<string,SpellingEntry>={}){return value.split('\n').map(w=>w.trim()).filter(Boolean).map(label=>{const entry=imported[label]||WORD_ENTRIES[label]||plainEntry(label);return {...entry,groupId:entry.groupId||WORD_GROUPS.find(g=>g.words.includes(label))?.id||'eigen'};});}
export const wordKey=(word:string)=>word.trim().normalize('NFC').toLocaleLowerCase('nl');
export function changeSelection(current:string,words:string[],select:boolean){const existing=current.split('\n').map(w=>w.trim()).filter(Boolean);const keys=new Set(words.map(wordKey));if(!select)return {value:existing.filter(w=>!keys.has(wordKey(w))).join('\n'),error:''};const seen=new Set(existing.map(wordKey)),next=[...existing];for(const word of words)if(!seen.has(wordKey(word))){next.push(word);seen.add(wordKey(word));}if(next.length>500)return {value:current,error:`Deze keuze maakt je lijst ${next.length} opdrachten lang. Kies maximaal 500 opdrachten; vink losse woorden aan of verwijder eerst woorden.`};return {value:next.join('\n'),error:''};}
