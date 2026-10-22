import {auth,db,readyUser,blokkeer} from './inspectie-toegang.mjs?v=20261022-1';
import {doc,getDocFromServer,getDocsFromServer,collection,setDoc,updateDoc,Timestamp,serverTimestamp} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import {sendSignInLinkToEmail} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
const $=id=>document.getElementById(id), user=await readyUser();
if(!user||(await getDocFromServer(doc(db,'schoolrollen',user.uid))).data()?.rol!=='beheerder'){
  blokkeer('Alleen de beheerder kan inspectietoegang instellen.');
}else{
  $('beheer').hidden=false;
  const local=d=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
  $('vanaf').value=local(new Date());$('tot').value=local(new Date(Date.now()+7*86400000));
  const email=()=>$('email').value.trim().toLowerCase();
  const status=s=>$('status').textContent=s;
  $('test').onclick=()=>localStorage.setItem('lindeSimuleerRol_'+user.uid,'inspectie');
  async function refresh(){
    const rows=await getDocsFromServer(collection(db,'inspectiebezoeken'));$('lijst').replaceChildren();
    if(rows.empty){$('lijst').textContent='Nog geen inspecteurs ingesteld.';return;}
    rows.forEach(s=>{
      const g=s.data(),row=document.createElement('div');row.className='entry';
      const state=!g.actief?'Ingetrokken':g.tot.toMillis()<=Date.now()?'Afgelopen':g.vanaf.toMillis()>Date.now()?'Nog niet begonnen':'Actief';
      const p=document.createElement('p');p.textContent=`${s.id} — ${state} — ${g.vanaf.toDate().toLocaleString('nl-BE')} tot ${g.tot.toDate().toLocaleString('nl-BE')}`;
      const edit=document.createElement('button');edit.textContent='Selecteren';edit.onclick=()=>{$('email').value=s.id;$('vanaf').value=local(g.vanaf.toDate());$('tot').value=local(g.tot.toDate());};
      const revoke=document.createElement('button');revoke.textContent='Toegang intrekken';revoke.disabled=!g.actief;
      revoke.onclick=async()=>{try{await updateDoc(s.ref,{actief:false,gewijzigdDoor:user.uid,gewijzigdOp:serverTimestamp()});status('Toegang ingetrokken.');await refresh();}catch(e){status('Intrekken mislukt: '+e.message);}};
      row.append(p,edit,revoke);$('lijst').append(row);
    });
  }
  $('form').onsubmit=async e=>{
    e.preventDefault();const vanaf=new Date($('vanaf').value),tot=new Date($('tot').value);
    if(email()===user.email?.toLowerCase()){status('Gebruik het persoonlijke e-mailadres van de inspecteur, niet je eigen beheerdersaccount.');return;}
    if(!Number.isFinite(+vanaf)||!Number.isFinite(+tot)||tot<=vanaf||tot<=new Date()){status('Kies een geldige periode met een einddatum in de toekomst.');return;}
    try{await setDoc(doc(db,'inspectiebezoeken',email()),{actief:true,vanaf:Timestamp.fromDate(vanaf),tot:Timestamp.fromDate(tot),gewijzigdDoor:user.uid,gewijzigdOp:serverTimestamp()});status('Toegang bewaard. Er is nog geen e-mail verstuurd.');await refresh();}catch(e){status('Bewaren mislukt: '+e.message);}
  };
  $('verstuur').onclick=async()=>{
    if(!$('email').reportValidity())return;
    $('verstuur').disabled=true;
    try{
      const g=(await getDocFromServer(doc(db,'inspectiebezoeken',email()))).data();
      if(!g?.actief||g.tot.toMillis()<=Date.now())throw Error('Bewaar eerst een actieve toegangsperiode voor dit e-mailadres.');
      await sendSignInLinkToEmail(auth,email(),{url:new URL('inspectie-aanmelden.html',location.href).href,handleCodeInApp:true});
      status('Aanmeldlink verstuurd. De inspecteur opent deze in de eigen mailbox. Bij een ander apparaat wordt het e-mailadres nogmaals gevraagd.');
    }catch(e){status('Versturen mislukt: '+e.message+' Controleer ook of aanmelden via e-maillink in Firebase is ingeschakeld.');}
    finally{$('verstuur').disabled=false;}
  };
  $('refresh').onclick=()=>refresh().catch(e=>status(e.message));
  await refresh().catch(e=>status('Bezoeken konden niet geladen worden: '+e.message));
}
