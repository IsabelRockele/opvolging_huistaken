import {questions,validSettings,publicQuestion} from './race';
import {spellingCorrect,validEntry} from './spelling';

export function firebaseGame(f:any,auth:any,db:any){
 const {doc,collection,getDoc,getDocs,setDoc,runTransaction,onSnapshot,query,orderBy}=f;
 const room=(code:string)=>doc(db,'zisa_klasrace',code);
 const player=(code:string,id:string)=>doc(db,'zisa_klasrace',code,'players',id);
 const quiz=(code:string)=>doc(db,'zisa_klasrace',code,'private','quiz');
 const clean=(v:any)=>JSON.parse(JSON.stringify(v));
 const watches=new Map<string,any>();
 const required=(snap:any)=>{if(!snap.exists())throw Error('Deze race bestaat niet meer. Scan de QR-code van je klas.');const r=snap.data();if(r.expires<Date.now())throw Error('Deze race is verlopen. Scan de nieuwe QR-code.');return r;};
 async function teacher(){if(!auth.currentUser||auth.currentUser.isAnonymous)throw Error('Meld je eerst als leerkracht aan in de huiswerkapp.');const s=await getDoc(doc(db,'schoolrollen',auth.currentUser.uid));if(!['klasleerkracht','beheerder','directie','zorgleerkracht','zorgcoordinator'].includes(s.data()?.rol))throw Error('Alleen leerkrachten kunnen een race klaarzetten.');return auth.currentUser.uid;}
 async function signedIn(){if(!auth.currentUser)await f.signInAnonymously(auth);return auth.currentUser.uid;}
 async function snapshot(code:string,host:boolean){
  // Reuse realtime listeners: polling the screen does not reread the whole class.
  const key=code+':'+auth.currentUser.uid+':'+host;let w=watches.get(key);
  if(!w){
   for(const old of watches.values())old.stops.forEach((stop:any)=>stop());watches.clear();
   w={room:null,players:[],me:null,quiz:null,stops:[],listening:false,error:null,ready:false};watches.set(key,w);
   const error=(e:any)=>{w.error=e;};
   const roster=()=>{if(w.listening)return;w.listening=true;w.stops.push(onSnapshot(query(collection(db,'zisa_klasrace',code,'players'),orderBy('id')), (s:any)=>{w.players=s.docs.map((d:any)=>d.data());w.ready=true;},error));w.stops.push(onSnapshot(quiz(code),(s:any)=>{w.quiz=s.data();},error));};
   w.stops.push(onSnapshot(room(code),(s:any)=>{try{w.room=required(s);}catch(e){error(e);}},error));
   if(host)roster();else w.stops.push(onSnapshot(player(code,auth.currentUser.uid),{includeMetadataChanges:true},(s:any)=>{if(s.metadata.hasPendingWrites)return;w.me=s.data();if(!s.exists()){error(Error('Je aanmelding is verwijderd. Scan de QR-code van je eigen klas.'));return;}if(w.me.approved)roster();else w.ready=true;},error));
  }
  if(w.error)throw w.error;
  if(!w.room||!w.ready||((host||w.me?.approved)&&!w.quiz))return null;
  return w;
 }
 return async function api(b:any){
  if(b.action==='disconnect'){for(const w of watches.values())w.stops.forEach((stop:any)=>stop());watches.clear();return {ok:true};}
  if(b.action==='create'){
   const uid=await teacher();if(!validSettings(b.settings))throw Error('Controleer de gekozen oefeningen.');
   const className=String(b.className||'').trim();if(!className||className.length>60)throw Error('Vul je klasnaam in.');
   const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
   for(let i=0;i<8;i++){
    const code=Array.from(crypto.getRandomValues(new Uint8Array(6)),v=>alphabet[v%alphabet.length]).join('');
    const made=await runTransaction(db,async(t:any)=>{const ref=room(code);if((await t.get(ref)).exists())return false;
     t.set(ref,{owner:uid,className,settings:clean({...b.settings,words:[],entries:[]}),status:'waiting',approvedCount:0,pendingCount:0,round:0,started:0,created:Date.now(),expires:Date.now()+86400000});
     t.set(quiz(code),clean({questions:questions(b.settings),entries:b.settings.entries||[]}));return true;});
    if(made)return {code,host:uid};
   }throw Error('Een eigen spelcode maken lukt even niet. Probeer opnieuw.');
  }
  if(b.action==='practice-create'){
   const owner=await teacher();if(!Array.isArray(b.entries)||!b.entries.length||b.entries.length>40||!b.entries.every(validEntry))throw Error('Kies 1 tot 40 geldige opdrachten.');
   const id=crypto.randomUUID(),expires=Date.now()+30*86400000;await setDoc(doc(db,'zisa_klasrace_oefenen',id),clean({owner,title:String(b.title).slice(0,80),entries:b.entries,expires}));return {id,expires};
  }
  if(b.action==='practice-read'){
   if(!/^[a-f0-9-]{36}$/.test(b.id))throw Error('Deze oefenlink klopt niet.');const s=await getDoc(doc(db,'zisa_klasrace_oefenen',b.id));if(!s.exists()||s.data().expires<Date.now())throw Error('Deze oefenlink is verlopen.');return s.data();
  }
  const uid=await signedIn(),code=String(b.code||'').toUpperCase();if(!/^[A-Z2-9]{6}$/.test(code))throw Error('Deze racecode klopt niet.');
  if(b.action==='read'){
   const host=b.host===uid,w=await snapshot(code,host);if(!w)return {loading:true};const r=w.room;
   if(host&&r.owner!==uid)throw Error('Dit is de race van een andere leerkracht.');
   const p=host?null:w.me,ps=w.players.filter((p:any)=>p.approved),qs=w.quiz?.questions||[],index=r.settings.kind==='spelling'?r.round:p?.score;
   if(host&&r.status==='running'&&r.settings.kind!=='spelling'&&ps.length===r.approvedCount&&ps.every((p:any)=>p.finished)){
    await runTransaction(db,async(t:any)=>{const current=required(await t.get(room(code)));if(current.status==='running')t.update(room(code),{status:'ended'});});
   }
   const show=(p:any)=>({id:p.id,uid:p.uid,name:p.name,score:p.score,finished:p.finished,round:p.round,corrected:p.corrected});
   const me=p?{...show(p),approved:p.approved,mistakes:p.mistakes,correction:p.approved&&r.settings.kind==='spelling'&&p.round===r.round&&!p.corrected?qs[r.round]?.word:null,question:p.approved&&r.status==='running'&&Date.now()>=r.started&&p.score<qs.length?publicQuestion(qs[index],index):null}:null;
   return {code,className:r.className,status:r.status,settings:r.settings,started:r.started,round:r.round,serverNow:Date.now(),hostPrompt:host&&r.settings.kind==='spelling'?w.quiz?.entries?.[r.round]||null:null,players:ps.map(show),pending:host?w.players.filter((p:any)=>!p.approved).map(show):[],me};
  }
  if(b.action==='join'){
   const name=String(b.name||'').trim().slice(0,18).replace(/\//g,'-');if(!name)throw Error('Vul je voornaam in.');
   return runTransaction(db,async(t:any)=>{
    const r=required(await t.get(room(code))),ref=player(code,uid),existing=await t.get(ref);if(existing.exists())return {id:existing.data().id,token:uid};
    if(r.status!=='waiting')throw Error('De race is al gestart. Wacht op de volgende ronde.');
    const nameRef=doc(db,'zisa_klasrace',code,'names',name.toLowerCase());if((await t.get(nameRef)).exists())throw Error('Deze naam is al aangemeld. Gebruik ook je klasnummer.');
    if(r.pendingCount>=64)throw Error('De wachtlijst is vol.');const id=uid;t.update(room(code),{pendingCount:r.pendingCount+1});t.set(nameRef,{uid});t.set(ref,{uid,id,name,approved:false,score:0,mistakes:0,finished:0,round:-1,corrected:0});return {token:uid,id};
   });
  }
  if(['approve','remove','start','end','next'].includes(b.action)){
   const r=required(await getDoc(room(code)));if(r.owner!==uid||b.host!==uid)throw Error('Alleen de leerkracht van deze race kan dit doen.');
   const all=(await getDocs(collection(db,'zisa_klasrace',code,'players'))).docs.map((d:any)=>d.data());
   if(b.action==='approve'||b.action==='remove'){
    const p=all.find((p:any)=>p.id===b.playerId);if(!p)throw Error('Deze aanmelding bestaat niet meer.');
    await runTransaction(db,async(t:any)=>{
     const current=required(await t.get(room(code)));const ref=player(code,p.uid),ps=await t.get(ref);if(!ps.exists())throw Error('Deze aanmelding bestaat niet meer.');
     if(b.action==='approve'){if(current.status!=='waiting')throw Error('Toelaten kan alleen vóór de start.');if(!ps.data().approved&&(current.approvedCount||0)>=32)throw Error('Er kunnen maximaal 32 kinderen meespelen.');t.update(ref,{approved:true});if(!ps.data().approved)t.update(room(code),{approvedCount:current.approvedCount+1,pendingCount:current.pendingCount-1});}
     else {t.delete(ref);t.delete(doc(db,'zisa_klasrace',code,'names',p.name.toLowerCase()));t.update(room(code),ps.data().approved?{approvedCount:current.approvedCount-1}:{pendingCount:current.pendingCount-1});}
    });return {ok:true};
   }
   await runTransaction(db,async(t:any)=>{
    const current=required(await t.get(room(code)));
    if(b.action==='start'){if(current.status!=='waiting')throw Error('Deze race is al gestart.');if(!current.approvedCount)throw Error('Laat eerst een kind toe.');if(current.pendingCount)throw Error('Behandel eerst alle wachtende aanmeldingen.');t.update(room(code),{status:'running',started:Date.now()+4000});}
    else if(b.action==='next'){if(current.status!=='running'||r.settings.kind!=='spelling')throw Error('Deze ronde kan niet verder.');if(all.some((p:any)=>p.approved&&(p.round<current.round||!p.corrected)))throw Error('Wacht tot iedereen klaar is.');t.update(room(code),current.round+1>=r.settings.count?{status:'ended'}:{round:current.round+1});}
    else t.update(room(code),{status:'ended'});
   });return {ok:true};
  }
  if(b.action==='answer')return runTransaction(db,async(t:any)=>{
   const r=required(await t.get(room(code))),ref=player(code,uid),s=await t.get(ref);if(!s.exists()||!s.data().approved)throw Error('Je bent niet toegelaten tot deze race.');
   if(r.status!=='running'||Date.now()<r.started)throw Error('De race is nog niet gestart of is afgelopen.');
   const p=s.data(),qs=(await t.get(quiz(code))).data().questions,spelling=r.settings.kind==='spelling',index=spelling?r.round:p.score;
   if(p.finished)return {correct:true,finished:true};if(b.index!==index)return {stale:true};if(spelling&&p.round===r.round&&p.corrected)return {correct:true,done:true};
   if(spelling?(typeof b.answer!=='string'||!b.answer.trim()||b.answer.length>70):(!Number.isInteger(b.answer)||b.answer<0||b.answer>100))throw Error('Vul een geldig antwoord in.');
   const correct=spelling?spellingCorrect(b.answer,qs[index].word,qs[index].caseSensitive):b.answer===qs[index].answer;
   const patch:any=correct?{score:p.score+1,finished:p.score+1===qs.length?Date.now():0}:{mistakes:p.mistakes+(!spelling||p.round!==r.round?1:0)};
   if(spelling){patch.round=r.round;patch.corrected=correct?1:0;}t.update(ref,patch);return {correct};
  });
  throw Error('Onbekende actie.');
 };
}
