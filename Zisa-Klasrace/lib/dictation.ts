import {type SpellingEntry} from './spelling';
export function shuffled<T>(items:T[],random= Math.random):T[]{const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
// One pick per available group per pass; small groups exhaust naturally.
export function mixedDictation(entries:SpellingEntry[],count:number,random=Math.random){
 const unique=[...new Map(entries.map(e=>[e.label.trim().normalize('NFC').toLocaleLowerCase('nl'),e])).values()];
 const buckets=new Map<string,SpellingEntry[]>();for(const e of unique){const key=e.groupId||'eigen';buckets.set(key,[...(buckets.get(key)||[]),e]);}
 let groups=[...buckets.values()].map(g=>shuffled(g,random));const result:SpellingEntry[]=[];
 while(result.length<Math.min(count,unique.length)&&groups.length){for(const g of shuffled(groups,random)){if(result.length>=count)break;result.push(g.pop()!);}groups=groups.filter(g=>g.length);}
 return shuffled(result,random);
}
