'use client';
import {useState} from 'react';
import {Trophy,Eye,Gamepad2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {questions,type Settings,type Question} from '@/lib/race';
function round(settings:Settings){
 const q=questions({...settings,count:1})[0];
 const max=settings.kind==='tables'?100:settings.kind==='split'?q.total!:settings.kind==='ten'?10:20;
 const answers=new Set([q.answer]);
 const step=settings.kind==='tables'&&q.text.includes('×')?Number(q.text.split(' × ')[1]):1;
 const candidates=[q.answer-step,q.answer+step,q.answer-1,q.answer+1,q.answer-2,q.answer+2].filter(n=>n>=0&&n<=max);
 for(const n of candidates){if(answers.size===3)break;answers.add(n);}
 while(answers.size<3)answers.add(Math.floor(Math.random()*(max+1)));
 return {q,options:[...answers].sort(()=>Math.random()-.5)};
}
export default function FinishChoice({settings,name,place,total,ended,connected}:{settings:Settings,name:string,place:number,total:number,ended:boolean,connected:boolean}){
 const [mode,setMode]=useState<'choose'|'watch'|'play'>('choose');
 const [exercise,setExercise]=useState<{q:Question,options:number[]}|null>(null);
 const [fruit,setFruit]=useState(0),[feedback,setFeedback]=useState(''),[correct,setCorrect]=useState(false),[wrong,setWrong]=useState<number[]>([]);
 function next(){setExercise(round(settings));setCorrect(false);setWrong([]);setFeedback('');}
 const spelling=settings.kind==='spelling';
 if(ended)return <div className="finish-card"><Trophy size={54}/><h1>Goed gewerkt, {name}!</h1><p>Het spel is afgelopen.</p>{!spelling&&<strong className="finish-place">Je bent {place}e van {total}!</strong>}{fruit>0&&<p>In je bonusspel verzamelde je {fruit} stukjes fruit. 🍎</p>}<p>Kijk naar de juf of meester.</p></div>;
 return <div className="finish-choice">
 <div className="finish-summary"><Trophy size={30}/><div><h1>Hoera, {name}!</h1><p>{spelling?'Jij hebt de schat bereikt!':`Je bent ${place}e van ${total}!`}</p></div></div>
 {mode==='play'&&exercise?<>
 <div className={`bonus-scene bonus-${settings.kind}`}><span className="bonus-counter">🍎 {fruit}</span><span key={fruit} className={`zebra sprite-${settings.kind} bonus-racer ${correct?'bonus-jump gallop':''}`} role="img" aria-label="Jouw racer verzamelt fruit"/><span className="bonus-fruit" aria-hidden="true">{correct?'✨':'🍎'}</span></div>
 <div className="bonus-card"><h2>Verzamel het fruit!</h2><p>Tik het juiste antwoord aan.</p>
 {exercise.q.type==='split'?<div className="split-example"><b>{exercise.q.total}</b><svg viewBox="0 0 160 50" aria-hidden="true"><path d="M80 3L22 46M80 3L138 46" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/></svg><div><b>{exercise.q.part}</b><b className="missing">{correct?exercise.q.answer:'?'}</b></div></div>:<div className="bonus-sum">{exercise.q.text} = ?</div>}
 <div className="bonus-answers">{exercise.options.map(n=><Button key={n} disabled={!connected||correct||wrong.includes(n)} className={correct&&n===exercise.q.answer?'bonus-right':''} onClick={()=>{if(n===exercise.q.answer){setCorrect(true);setFruit(f=>f+1);setFeedback('Goed zo! Een stukje fruit erbij.');}else{setWrong(w=>[...w,n]);setFeedback('Probeer nog eens. Neem rustig je tijd.');}}}>{n}</Button>)}</div>
 <p className="bonus-feedback" role="status">{connected?feedback:'Even wachten op de verbinding…'}</p>
 {correct&&<Button className="primary-button" disabled={!connected} onClick={next}>Volgende sprong</Button>}
 </div></>:<div className="finish-card"><span className={`zebra sprite-${settings.kind} big`} role="img" aria-label="Jouw racer"/><h2>{mode==='watch'?'Kijk mee op het bord':'Wat wil jij nu doen?'}</h2><p>{mode==='watch'?'Moedig de andere kinderen aan.':spelling?'Wacht samen tot de schat opengaat.':'Je bent klaar. Kies zelf hoe je op de klas wacht.'}</p></div>}
 <div className="finish-options">{mode!=='watch'&&<Button className="secondary-button" onClick={()=>setMode('watch')}><Eye size={20}/> Ik kijk mee op het bord</Button>}{!spelling&&mode!=='play'&&<Button className="primary-button" disabled={!connected} onClick={()=>{if(!exercise)next();setMode('play');}}><Gamepad2 size={20}/> Ik speel een bonusspel</Button>}</div>
 {!spelling&&<p className="bonus-note">Je eindplaats blijft behouden. Het bonusspel stopt wanneer de klasrace eindigt.</p>}
 </div>;
}
