import {vereisZorgToegang,zorgTools,zorgToolUrl} from './inspectie-toegang.mjs?v=20261022-1';
import {signOut} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {auth} from './inspectie-toegang.mjs?v=20261022-1';
const toegang=await vereisZorgToegang('inspectie');
if(!toegang.alleenLezen){location.replace('index.html');await new Promise(()=>{});}
const tool=new URLSearchParams(location.search).get('tool');
if(zorgTools.some(([id])=>id===tool))location.replace(zorgToolUrl(tool));
else{
  document.getElementById('viewer').hidden=false;
  document.getElementById('toegang').textContent='Open een tool. Je krijgt dezelfde schermen als het schoolteam, in leesstand.';
  document.getElementById('titel').textContent='Kies een tool';
  document.querySelector('.controls').hidden=true;
  for(const [id,label] of zorgTools){const a=document.createElement('a');a.href=zorgToolUrl(id);a.className='button';a.textContent=label;document.getElementById('tools').append(a);}
  document.getElementById('status').textContent='Gegevens bekijken, wisselen van klas en leerling en door de rubrieken bladeren blijft mogelijk. Bewerken en opslaan zijn uitgeschakeld.';
  document.getElementById('logout').onclick=()=>signOut(auth).then(()=>location.href='index.html');
}
