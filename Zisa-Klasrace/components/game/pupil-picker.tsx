import type {Pupil} from '@/lib/class-roster';
export default function PupilPicker({pupils,value,onChange}:{pupils:Pupil[],value:string,onChange:(id:string)=>void}){
 const sorted=[...pupils].sort((a,b)=>a.classNumber-b.classNumber),rows=Math.ceil(sorted.length/3);
 return <div className="pupil-picker" role="group" aria-label="Kies je naam, alfabetisch op achternaam">{[0,1,2].map(column=><div className="pupil-column" key={column}>{sorted.slice(column*rows,(column+1)*rows).map(p=><button type="button" key={p.id} aria-pressed={value===p.id} className={value===p.id?'pupil-choice selected':'pupil-choice'} onClick={()=>onChange(p.id)}><span className="pupil-number">{p.classNumber}</span><span>{p.firstName}</span></button>)}</div>)}</div>;
}
