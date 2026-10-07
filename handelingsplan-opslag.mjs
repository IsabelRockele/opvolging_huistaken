import * as M from './handelingsplan-validatie.mjs';

export function basisCode(s,parentCode){return s.handelingsplanId || parentCode?.dossierId || s.previousStudentId || s.sourceStudentId || String(s.id);}
export function normaliseer(value){
  if(value?.toDate instanceof Function)return value.toDate().toISOString();
  if(Array.isArray(value))return value.map(normaliseer);
  return value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,normaliseer(v)])):value;
}
export function createFirestoreApi({sdk,db,user,catalog,now=()=>new Date()}){
  const {doc,collection,getDocFromServer:getDoc,getDocsFromServer:getDocs,query,where,runTransaction,serverTimestamp}=sdk;
  const ref=path=>doc(db,...path.split('/'));
  async function leerlingen(){
    const schooljaar=M.schoolYear(M.today(now())),day=M.today(now());
    const role=(await getDoc(ref(`schoolrollen/${user.uid}`))).data()?.rol;
    if(!['directie','beheerder','zorgcoordinator','zorgleerkracht','klasleerkracht'].includes(role))throw Error('Je hebt geen toegang tot handelingsplannen.');
    let snaps;
    if(role!=='klasleerkracht')snaps=(await getDocs(collection(db,'schoolbeheer',schooljaar,'klassen'))).docs;
    else{
      const links=await Promise.all([getDocs(query(collection(db,'klasleerkrachten'),where('leerkracht_uids','array-contains',user.uid))),getDocs(query(collection(db,'klasleerkrachten'),where('leerkracht_emails','array-contains',user.email||'')))]);
      const classes=[...new Set(links.flatMap(s=>s.docs).filter(d=>d.id.startsWith(schooljaar+'_')).map(d=>d.id.slice(schooljaar.length+1)))];
      snaps=await Promise.all(classes.map(k=>getDoc(ref(`schoolbeheer/${schooljaar}/klassen/${k}`))));
    }
    return {schooljaar,klassen:snaps.map(d=>({klas:d.id,leerlingen:(d.data()?.leerlingen||[]).filter(s=>s.id&&M.active(s,day)&&!s.verhuisdNaar).map(s=>({id:String(s.id),naam:[s.first||s.firstName,s.last||s.lastName].filter(Boolean).join(' ')||s.naam||'Leerling'})).sort((a,b)=>a.naam.localeCompare(b.naam,'nl'))})).sort((a,b)=>a.klas.localeCompare(b.klas,'nl',{numeric:true}))};
  }
  async function prepare(c){
    const jaar=M.year(c.schooljaar),day=M.today(now()),currentYear=M.schoolYear(day);
    const role=(await getDoc(ref(`schoolrollen/${user.uid}`))).data()?.rol;
    if(!['directie','beheerder','zorgcoordinator','zorgleerkracht','klasleerkracht'].includes(role))throw Error('Je hebt geen toegang tot handelingsplannen.');
    const broad=role!=='klasleerkracht';let classes=[],linkedId;
    if(c.bron==='zorgoverleg'||c.bron==='handelingsplan'){classes=[M.id(c.klas)];linkedId=M.id(c.leerlingId);}
    else if(c.bron==='overgangsbespreking'){
      const project=(await getDoc(ref(`overgangsbesprekingen/${jaar}/projecten/${M.id(c.projectId)}`))).data();
      const fiches=(project?.students||[]).filter(s=>s.id===c.ficheId);
      if(fiches.length!==1||!fiches[0].schoolbeheerId)throw Error('Bewaar eerst de leerlingfiche met een geldige centrale leerlingkoppeling.');
      linkedId=String(fiches[0].schoolbeheerId);
      if(broad)classes=(await getDocs(collection(db,'schoolbeheer',jaar,'klassen'))).docs.map(d=>d.id);
      else{
        const links=await Promise.all([getDocs(query(collection(db,'klasleerkrachten'),where('leerkracht_uids','array-contains',user.uid))),getDocs(query(collection(db,'klasleerkrachten'),where('leerkracht_emails','array-contains',(user.email||'').toLowerCase())))]);
        classes=[...new Set(links.flatMap(s=>s.docs.map(d=>d.data())).filter(x=>String(x.schooljaar||jaar)===jaar).map(x=>String(x.klas||x.klasId||'')).filter(Boolean))];
      }
    }else throw Error('Open het plan vanuit zorgoverleg of een leerlingfiche.');
    const snaps=await Promise.all(classes.map(k=>getDoc(ref(`schoolbeheer/${jaar}/klassen/${k}`))));
    let matches=snaps.flatMap((snap,i)=>(snap.data()?.leerlingen||[]).map((student,index)=>({student,index,klas:classes[i]}))).filter(r=>String(r.student.id)===linkedId||(c.bron==='overgangsbespreking'&&[r.student.previousStudentId,r.student.sourceStudentId,r.student.handelingsplanId].filter(Boolean).map(String).includes(linkedId)));
    if(matches.length>1){const live=matches.filter(r=>M.active(r.student,day)&&!r.student.verhuisdNaar);if(live.length===1)matches=live;}
    if(matches.length!==1)throw Error('De leerling is niet eenduidig gekoppeld aan de centrale klaslijst van dit schooljaar. Laat de koppeling controleren; er is niets gewijzigd.');
    const chosen=matches[0],s=chosen.student,id=M.id(String(s.id));
    const parent=s.previousStudentId||s.sourceStudentId;
    const codeRef=ref(`handelingsplanCodes/${id}`),codeSnap=await getDoc(codeRef);
    const parentCode=parent?(await getDoc(ref(`handelingsplanCodes/${M.id(String(parent))}`))).data():null;
    const root=M.id(codeSnap.data()?.dossierId||basisCode(s,parentCode));
    const writable=jaar===currentYear&&M.active(s,day)&&!s.verhuisdNaar;
    if(writable){
      await runTransaction(db,async tx=>{
        const classSnap=await tx.get(ref(`schoolbeheer/${jaar}/klassen/${chosen.klas}`));
        const rows=classSnap.data()?.leerlingen||[],indices=rows.flatMap((r,i)=>String(r.id)===id?[i]:[]);
        const code=await tx.get(codeRef);
        if(indices.length!==1||!M.active(rows[indices[0]],day)||rows[indices[0]].verhuisdNaar)throw Error('De klaslijst is gewijzigd. Heropen het plan vanuit de huidige klas.');
        if(code.exists()&&code.data().dossierId!==root)throw Error('De dossierkoppeling is gewijzigd. Herlaad eerst.');
        const grant={leerlingId:id,dossierId:root,schooljaar:jaar,klas:chosen.klas,index:indices[0]};
        if(!code.exists())tx.set(codeRef,grant);
        tx.set(ref(`handelingsplanToegang/${user.uid}/leerlingen/${root}`),grant);
      });
    }
    return {root,day,currentYear,writable,chosen,context:{schooljaar:jaar,klas:chosen.klas,bron:c.bron},naam:[s.first||s.firstName,s.last||s.lastName].filter(Boolean).join(' ')||s.naam||'Leerling'};
  }
  return async input=>{
    try{
      if(input.action==='leerlingen')return await leerlingen();
      const state=await prepare(input.context),{root,day,currentYear,writable,chosen,context,naam}=state;
      const plansPath=`handelingsplannen/${root}/plannen`;
      if(input.action==='load'){
        const plans=await getDocs(collection(db,...plansPath.split('/')));
        return {naam,klas:chosen.klas,schooljaar:context.schooljaar,huidigSchooljaar:currentYear,vandaag:day,schrijfbaar:writable,plannen:plans.docs.map(d=>({id:d.id,...normaliseer(d.data())})).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))};
      }
      const planId=M.id(input.planId),planRef=ref(`${plansPath}/${planId}`);
      if(input.action==='history'){
        const history=await getDocs(collection(db,...`${plansPath}/${planId}/historiek`.split('/')));
        return {historiek:history.docs.map(d=>normaliseer(d.data())).sort((a,b)=>b.versie-a.versie)};
      }
      if(input.action!=='save'||!writable)throw Error('In dit schooljaar of bij deze inschrijving kun je alleen raadplegen.');
      const eventRef=ref(`${plansPath}/${planId}/historiek/${M.id(input.operationId)}`);
      const bytes=new TextEncoder().encode(JSON.stringify({plan:input.plan,evaluatie:input.evaluatie||null,eerdereAanpak:input.eerdereAanpak||[],expectedVersion:input.expectedVersion,context}));
      const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
      return await runTransaction(db,async tx=>{
        const [snap,event]=await Promise.all([tx.get(planRef),tx.get(eventRef)]);
        if(event.exists()){
          if(event.data().fingerprint!==fingerprint||event.data().auteurUid!==user.uid)throw Error('Deze bewaaractie is al anders gebruikt. Herlaad het plan.');
          return {bewaard:true,versie:event.data().versie};
        }
        const old=snap.exists()?snap.data():null;
        if(input.expectedVersion!==(old?.versie||0))throw Error('Een collega heeft het plan gewijzigd. Je invoer blijft staan. Open het plan opnieuw in een ander tabblad om te vergelijken.');
        const plan=M.planInput(input.plan,catalog.doelen,old),prior=M.priorInput(input.eerdereAanpak,day),evaluation=M.evaluationInput(input.evaluatie,plan,day);
        if(!old&&(M.schoolYear(plan.startdatum)!==currentYear||plan.startdatum>day))throw Error('Kies een startdatum in het lopende schooljaar, niet in de toekomst.');
        const head={...plan,versie:(old?.versie||0)+1,doelensetVersie:old?.doelensetVersie||catalog.versie,createdAt:old?.createdAt||serverTimestamp(),updatedAt:serverTimestamp(),startSchooljaar:old?.startSchooljaar||context.schooljaar,startKlas:old?.startKlas||chosen.klas,laatstSchooljaar:context.schooljaar,laatsteKlas:chosen.klas,auteurUid:user.uid,bewaaractie:input.operationId,aantalEerdereAanpakken:(old?.aantalEerdereAanpakken||0)+prior.length,laatsteEvaluatie:evaluation?{...evaluation,auteur:user.email||user.uid,schooljaar:context.schooljaar,klas:chosen.klas}:old?.laatsteEvaluatie||null};
        tx.set(planRef,head);
        tx.set(eventRef,{versie:head.versie,datum:serverTimestamp(),context,auteur:user.email||user.uid,auteurUid:user.uid,plan:head,evaluatie:evaluation,eerdereAanpak:prior,fingerprint});
        return {bewaard:true,versie:head.versie};
      });
    }catch(e){if(e.code==='permission-denied')throw Error('Geen toegang tot dit handelingsplan. Controleer de klaskoppeling en de nieuwe handelingsplanregels. Je invoer blijft staan.');throw e;}
  };
}
