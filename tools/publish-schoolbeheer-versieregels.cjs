// Publish only the tested security-rule change. No Firestore document writes.
const fs=require('node:fs'),crypto=require('node:crypto');
const {patch}=require('./schoolbeheer-versieregels.cjs');
const auth=require('C:/Users/isabe/AppData/Roaming/npm/node_modules/firebase-tools/lib/auth.js');
async function main(){
 if(!process.argv.includes('--publish'))throw Error('Gebruik --publish uitsluitend voor een toegestane publicatie.');
 const candidate=fs.readFileSync('tmp/versiebeveiliging/kandidaat.rules','utf8');
 const original=fs.readFileSync('tmp/versiebeveiliging/actief.rules','utf8');
 if(candidate!==patch(original)||candidate!==fs.readFileSync('firestore.rules','utf8'))throw Error('Regels wijken af van de gecontroleerde wijziging.');
 if(crypto.createHash('sha256').update(candidate).digest('hex')!==fs.readFileSync('tmp/versiebeveiliging/validated.sha256','utf8'))throw Error('Deze regels zijn niet getest.');
 const page=await fetch('https://isabelrockele.github.io/opvolging_huistaken/schoolbeheer.html?controle='+Date.now());
 if(!page.ok||!(await page.text()).includes('startVersieControle({versie:2026111602'))throw Error('Nieuwe websiteversie nog niet live.');
 const a=auth.getGlobalDefaultAccount(),t=await auth.getAccessToken(a.tokens.refresh_token,a.tokens.scopes);
 async function api(path,method='GET',body){const r=await fetch('https://firebaserules.googleapis.com/v1/'+path,{method,headers:{Authorization:'Bearer '+t.access_token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const d=await r.json();if(!r.ok)throw Error(d.error?.message||r.status);return d;}
 const project='projects/huiswerkapp-a311e',release=project+'/releases/cloud.firestore';
 const before=await api(release),source=await api(before.rulesetName);
 if(source.source.files.length!==1||source.source.files[0].content!==original)throw Error('Live regels zijn intussen gewijzigd; opnieuw controleren.');
 const created=await api(project+'/rulesets','POST',{source:{files:[{name:'firestore.rules',content:candidate}]}});
 await api(release,'PATCH',{release:{name:release,rulesetName:created.name}});
 const after=await api(release),verified=await api(after.rulesetName);
 if(verified.source.files[0].content!==candidate)throw Error('Live verificatie mislukt');
 fs.writeFileSync('tmp/versiebeveiliging/gepubliceerd.json',JSON.stringify({before:before.rulesetName,after:after.rulesetName,time:new Date().toISOString(),noDocumentWrites:true},null,2));
 console.log(JSON.stringify({published:true,ruleset:after.rulesetName,noDocumentWrites:true}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
