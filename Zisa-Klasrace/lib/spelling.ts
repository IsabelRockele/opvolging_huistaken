export type SpellingEntry={label:string;groupId?:string;answer:string;article?:'de'|'het';sentence?:string;infinitive?:string;tense?:string;caseSensitive:boolean;spoken:string};
export function plainEntry(label:string):SpellingEntry{const clean=label.trim();const match=clean.match(/^(de|het)\s+(.+)$/i);const answer=match?match[2]:clean;const article=match?match[1].toLowerCase() as 'de'|'het':undefined;return {label:clean,answer,article,caseSensitive:/[A-ZÀ-Ý]/.test(answer),spoken:clean};}
export function validEntry(e:any):e is SpellingEntry{return !!e&&typeof e.label==='string'&&e.label.length>0&&e.label.length<=200&&typeof e.answer==='string'&&e.answer.trim().length>0&&e.answer.length<=50&&typeof e.caseSensitive==='boolean'&&typeof e.spoken==='string'&&e.spoken.length<=600&&(!e.groupId||(typeof e.groupId==='string'&&e.groupId.length<=100))&&(!e.article||['de','het'].includes(e.article))&&(!e.sentence||(typeof e.sentence==='string'&&e.sentence.length<=200&&e.sentence.split('___').length===2&&typeof e.infinitive==='string'&&e.infinitive.length<=40&&typeof e.tense==='string'&&e.tense.length<=40));}
export function spellingCorrect(input:string,expected:string,caseSensitive=false){const a=input.trim().normalize('NFC'),b=expected.trim().normalize('NFC');return caseSensitive?a===b:a.toLocaleLowerCase('nl')===b.toLocaleLowerCase('nl');}
export function readWordList(data:any):{title:string;entries:SpellingEntry[];count?:number;prepared?:SpellingEntry[]}{
 if(data?.format!=='zisa-dictee'||typeof data.title!=='string')throw Error('Dit is geen geldige Zisa-dicteelijst.');
 let entries:SpellingEntry[];
 if(data.version===2){if(!Array.isArray(data.entries)||!data.entries.every(validEntry))throw Error('De opdrachten in deze woordenlijst zijn ongeldig.');entries=data.entries;}
 else if(data.version===1){if(!Array.isArray(data.words)||data.words.some((w:any)=>typeof w!=='string'||!w.trim()||w.length>50))throw Error('De woorden in deze lijst zijn ongeldig.');entries=data.words.map(plainEntry);}
 else throw Error('Deze versie van de woordenlijst wordt niet ondersteund.');
 if(entries.length<1||entries.length>500)throw Error('Kies 1 tot 500 opdrachten voor je voorraad.');
 return {title:data.title.slice(0,80),entries,prepared:Array.isArray(data.prepared)&&data.prepared.length>0&&data.prepared.length<=40&&data.prepared.every((e:any)=>validEntry(e)&&entries.some(p=>p.label===e.label&&p.answer===e.answer))?data.prepared:undefined,count:Number.isInteger(data.count)&&data.count>=1&&data.count<=40?data.count:undefined};
}
