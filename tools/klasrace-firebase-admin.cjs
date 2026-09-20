const fs=require('node:fs');
const auth=require('C:/Users/isabe/AppData/Roaming/npm/node_modules/firebase-tools/lib/auth.js');
async function main(){
 const account=auth.getGlobalDefaultAccount(),tokens=await auth.getAccessToken(account.tokens.refresh_token,account.tokens.scopes);
 async function api(url){const r=await fetch(url,{headers:{Authorization:'Bearer '+tokens.access_token}});const data=await r.json();if(!r.ok)throw Error(data.error?.message||r.status);return data;}
 const config=await api('https://identitytoolkit.googleapis.com/admin/v2/projects/huiswerkapp-a311e/config');
 console.log('Anonymous login enabled:',config.signIn?.anonymous?.enabled===true);
 const release=await api('https://firebaserules.googleapis.com/v1/projects/huiswerkapp-a311e/releases/cloud.firestore');
 const rules=await api('https://firebaserules.googleapis.com/v1/'+release.rulesetName);
 fs.writeFileSync('tmp/klasrace-live-firestore.rules',rules.source.files[0].content);
 const snippet=fs.readFileSync('firestore-klasrace.rules.snippet','utf8');const current=rules.source.files[0].content;const start=current.indexOf('    // Zisa-klasrace:');const marker='    match /{document=**} {';const base=start>=0?current.slice(0,start)+current.slice(current.indexOf(marker,start)):current;const merged=base.replace(marker,()=>snippet+'\n'+marker);fs.writeFileSync('firestore.rules',merged);console.log('Current rules preserved; Klasrace section updated.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
