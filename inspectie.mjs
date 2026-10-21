import {auth,db,readyUser,toegang,geldigBezoek,blokkeer,zorgTools} from './inspectie-toegang.mjs';
import {collection,doc,getDocsFromServer,onSnapshot} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import {signOut} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
const $=id=>document.getElementById(id), params=new URLSearchParams(location.search);
const tool=zorgTools.some(([id])=>id===params.get('tool'))?params.get('tool'):'overgang';
async function start(simulation,access){
  let revoked=false;
  $('viewer').hidden=false;
  $('toegang').textContent=simulation?'TESTWEERGAVE als beheerder. Dit scherm leest alleen. Je account behoudt op de achtergrond beheerdersrechten. Test de echte toegangsbeveiliging ook met een apart inspectieaccount.':`Persoonlijke leesrechten tot ${access.bezoek.tot.toDate().toLocaleString('nl-BE')}. Er worden vanuit dit scherm geen gegevens gewijzigd.`;
  if(simulation){const back=document.createElement('button');back.textContent='Terug als beheerder';back.onclick=()=>{localStorage.setItem('lindeSimuleerRol_'+user.uid,'beheerder');location.href='index.html';};document.querySelector('header .actions').prepend(back);}
  $('logout').onclick=()=>signOut(auth).then(()=>location.replace('index.html'));
  if(!simulation){
    let grant=access.bezoek;
    const check=()=>{if(!geldigBezoek(grant)){revoked=true;clearInterval(timer);blokkeer('De tijdelijke inspectietoegang is afgelopen of ingetrokken.');}};
    const timer=setInterval(check,1000);
    onSnapshot(doc(db,'inspectiebezoeken',user.email.toLowerCase()),s=>{grant=s.data();check();},()=>{grant=null;check();});
  }
  zorgTools.forEach(([id,label])=>{const a=document.createElement('a');a.className='button';a.href='inspectie.html?tool='+id;a.textContent=label;if(id===tool)a.setAttribute('aria-current','page');$('tools').append(a);});
  $('titel').textContent=zorgTools.find(([id])=>id===tool)[1];
  const today=new Date(),y=today.getMonth()>=8?today.getFullYear():today.getFullYear()-1;
  for(let n=y+1;n>=2025;n--){const option=new Option(`${n}-${n+1}`,`${n}-${n+1}`);$('jaar').add(option);}
  $('jaar').value=`${y}-${y+1}`;
  let sequence=0;
  const load=async()=>{
    const current=++sequence;$('laden').disabled=true;$('inhoud').replaceChildren();$('status').textContent='Bezig met laden…';
    try{
      const year=$('jaar').value,cls=$('klas').value;
      const classes=await docs(['schoolbeheer',year,'klassen']);
      if(revoked||current!==sequence)return;
      const names=new Map(), classNames=new Map();
      classes.forEach(c=>(c.data.leerlingen||[]).forEach(s=>{const n=studentName(s);names.set(String(s.id),n);classNames.set(String(s.id),c.id);}));
      $('klas').replaceChildren(new Option('Alle klassen',''));
      classes.sort((a,b)=>a.id.localeCompare(b.id,'nl',{numeric:true})).forEach(c=>$('klas').add(new Option(c.id,c.id)));
      $('klas').value=classes.some(c=>c.id===cls)?cls:'';
      const chosen=classes.filter(c=>!cls||c.id===cls);
      let records=[];
      if(tool==='overgang'||tool==='oudercontact'){
        const base=tool==='overgang'?'overgangsbesprekingen':'oudercontacten';
        const projects=await docs([base,year,'projecten']);
        // A project may belong to a teacher and have no class label. Resolve its owner through class links.
        const links=await docs(['klasleerkrachten']);
        const linkedClass=p=>links.filter(l=>l.id.startsWith(year+'_')&&((l.data.leerkracht_uids||[]).includes(p.id)||(l.data.leerkracht_uids||[]).includes(p.data.eigenaar_uid))).map(l=>l.data.klas||l.data.klasId||l.id.slice(year.length+1));
        records=projects.filter(p=>!cls||String(p.data.klas||p.data.className||'')===cls||p.id==='klas_'+cls||linkedClass(p).includes(cls)).map(p=>({title:p.data.klas||p.data.className||linkedClass(p).join(', ')||'Leerkrachtproject',data:p.data}));
        if(tool==='overgang')records.push(...(await docs([base,year,'dossiers'])).filter(p=>!cls||[p.data.klas,p.data.bron_klas,p.data.doel_klas,p.data.vorige_klas,p.data.volgende_klas].includes(cls)).map(p=>({title:'Overdrachtsdossier',data:p.data})));
      }else if(tool==='zorgoverleg'){
        const lists=await Promise.all(chosen.map(async c=>(await docs(['zorgoverleggen',year,'klassen',c.id,'maanden'])).map(m=>({title:`${c.id} — ${m.id}`,data:m.data}))));
        records=lists.flat();
      }else if(tool==='groeigroepen'){
        records=(await docs(['zorggroepen'])).filter(g=>g.data.schooljaar===year&&(!cls||(g.data.leerlingen||[]).some(s=>s.klas===cls))).map(g=>({title:g.data.naam||'Groeigroep',data:g.data}));
      }else if(tool==='gok'){
        records=chosen.map(c=>({title:c.id,data:{leerlingen:(c.data.leerlingen||[]).map(s=>({naam:studentName(s),gok:s.gok||'nee',gokKenmerken:s.gokKenmerken||[],gokNote:s.gokNote||''}))}}));
      }else{
        const codes=await docs(['handelingsplanCodes']);
        const roots=new Map();
        codes.forEach(c=>{if(c.data.dossierId&&(!cls||classNames.get(c.id)===cls))roots.set(c.data.dossierId,names.get(c.id)||c.data.leerlingNaam||'Leerlingdossier');});
        chosen.forEach(c=>(c.data.leerlingen||[]).forEach(s=>{for(const id of [s.handelingsplanId,s.previousStudentId,s.sourceStudentId,s.id].filter(Boolean))if(!roots.has(String(id)))roots.set(String(id),studentName(s));}));
        const heads=await docs(['handelingsplannen']);
        heads.forEach(h=>{if(!cls&&!roots.has(h.id))roots.set(h.id,'Leerlingdossier');});
        records=(await Promise.all([...roots].map(async([root,name])=>{
          const plans=await docs(['handelingsplannen',root,'plannen']);
          const complete=await Promise.all(plans.map(async p=>({title:`${name} — ${p.data.kinddoel||'Handelingsplan'}`,data:{...p.data,historiek:(await docs(['handelingsplannen',root,'plannen',p.id,'historiek'])).map(h=>h.data)}})));
          return complete.filter(p=>p.data.startSchooljaar===year||p.data.laatstSchooljaar===year||p.data.historiek.some(h=>h.context?.schooljaar===year));
        }))).flat();
      }
      if(revoked||current!==sequence)return;
      for(const r of records){const d=document.createElement('details');d.className='record';const s=document.createElement('summary');s.textContent=r.title;d.append(s,render(r.data,names));$('inhoud').append(d);}
      $('status').textContent=records.length?`${records.length} onderdeel${records.length===1?'':'en'} geladen. Open een onderdeel om de bewaarde informatie te lezen.`:'Geen bewaarde gegevens gevonden voor deze keuze.';
    }catch(e){if(!revoked&&current===sequence){$('inhoud').replaceChildren();$('status').textContent='Gegevens konden niet volledig geladen worden. '+e.message;}}
    finally{if(!revoked&&current===sequence)$('laden').disabled=false;}
  };
  $('laden').onclick=load;$('jaar').onchange=()=>{$('klas').value='';load();};$('klas').onchange=load;
  await load();
}
async function docs(path){return (await getDocsFromServer(collection(db,...path))).docs.map(d=>({id:d.id,data:d.data()}));}
function studentName(s){return s.naam||s.name||[s.first||s.firstName,s.last||s.lastName].filter(Boolean).join(' ')||'Leerling';}
const labels={students:'Leerlingenfiches',leerlingen:'Leerlingen',firstName:'Voornaam',first:'Voornaam',lastName:'Achternaam',last:'Achternaam',gok:'GOK-aanduiding',gokKenmerken:'GOK-kenmerken',gokNote:'GOK-toelichting',diploma_moeder:'Moeder zonder diploma secundair onderwijs',thuistaal:'Thuistaal',schooltoelage:'Schooltoelage',entries:'Leerlingbesprekingen',groupActions:'Gezamenlijke acties',kinddoel:'Doel voor de leerling',aanpak:'Aanpak',historiek:'Wijzigingsgeschiedenis',oudercontacten:'Oudercontacten',eigenaar_email:'Leerkracht',medicalNote:'Medische aandachtspunten',friends:'Vrienden',avoid:'Liever niet samen',naam:'Naam',createdAt:'Aangemaakt op',updatedAt:'Bijgewerkt op',gokUpdatedAt:'GOK bijgewerkt op',gokUpdatedBy:'GOK bijgewerkt door',startSchooljaar:'Gestart in schooljaar',laatstSchooljaar:'Laatste schooljaar',datum:'Datum',evaluatie:'Evaluatie',clbToestemming:'CLB-toestemming'};
const hidden=new Set(['id','uid','eigenaar_uid','auteurUid','fingerprint','bewaaractie','schoolbeheerId','klaswisselVersie','klaswissel','bewaartermijnJaren','bewaarTot','bewaardoor','dossierId','leerlingId']);
const label=k=>labels[k]||String(k).replace(/_/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,v=>v.toUpperCase());
function render(value,names){
  const box=document.createElement('dl');box.className='fields';
  const entries=Array.isArray(value)?value.map((v,i)=>[String(i+1),v]):Object.entries(value||{});
  for(const [key,v]of entries){
    if(hidden.has(key)||v===null||v===undefined||v===''||Array.isArray(v)&&!v.length)continue;
    const title=names.get(key)||label(key);
    if(v&&typeof v==='object'&&!v.toDate){
      const details=document.createElement('details'),summary=document.createElement('summary');
      summary.textContent=Array.isArray(value)?(studentName(v)!=='Leerling'?studentName(v):v.titel||v.kinddoel||v.naam||`Onderdeel ${key}`):title;
      details.append(summary,render(v,names));box.append(details);
    }else{
      const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=title;
      dd.textContent=v?.toDate?v.toDate().toLocaleString('nl-BE'):typeof v==='boolean'?(v?'Ja':'Nee'):labels[v]||String(v);box.append(dt,dd);
    }
  }
  return box;
}
const user=await readyUser();
if(!user){location.replace('index.html');}else{
  let access;
  try{access=await toegang(user);}catch(e){blokkeer('De inspectietoegang kon niet gecontroleerd worden.');}
  if(access){
    const simulation=access.rol==='beheerder';
    if(!simulation&&(access.rol!=='inspectie'||!access.geldig)){blokkeer('Je inspectietoegang is niet actief. Vraag de beheerder om je toegangsperiode na te kijken.');}
    else await start(simulation,access);
  }
}
