// Firebase Rules test API simulates requests; it does not write documents.
const fs=require('node:fs');
const auth=require('C:/Users/isabe/AppData/Roaming/npm/node_modules/firebase-tools/lib/auth.js');
async function main(){
 const account=auth.getGlobalDefaultAccount(),tokens=await auth.getAccessToken(account.tokens.refresh_token,account.tokens.scopes);
 const source=fs.readFileSync('tmp/versiebeveiliging/kandidaat.rules','utf8');
 const cases=[],labels=[];
 function add(label,before,after,expectation,role='klasleerkracht',method='update'){
  labels.push(label);
  cases.push({expectation,request:{path:'/databases/(default)/documents/schoolbeheer/2026-2027/klassen/2A',method,
    auth:{uid:'test-teacher',token:{email:'teacher@example.test'}},resource:{data:after}},resource:{data:before},
    functionMocks:[{function:'exists',args:[{anyValue:{}}],result:{value:true}},
      {function:'get',args:[{anyValue:{}}],result:{value:{data:{rol:role,leerkracht_uids:['test-teacher'],leerkracht_emails:[]}}}}]});
 }
 const b={refter:{nov:{kind:{ma:true}}},activiteiten:[{id:'gwp',categorie:'gwp',absent:{kind:true}}]};
 for(const role of ['klasleerkracht','secretariaat','beheerder']){
  add(role+': oude refteropslag geweigerd',b,{...b,refter:{}},'DENY',role);
  add(role+': nieuwe refteropslag toegestaan',b,{...b,refter:{},registratieVersie:1},'ALLOW',role);
  add(role+': oude activiteiten/GWP-opslag geweigerd',b,{...b,activiteiten:[]},'DENY',role);
  add(role+': nieuwe activiteiten/GWP-opslag toegestaan',b,{...b,activiteiten:[],registratieVersie:1},'ALLOW',role);
 }
 add('pagina met nieuwe velden maar oude opslagcode geblokkeerd',{...b,registratieVersie:4},{...b,refter:{},registratieVersie:4},'DENY');
 add('verouderde revisie geblokkeerd',{...b,registratieVersie:5},{...b,refter:{},registratieVersie:5},'DENY');
 add('transactie verhoogt actuele revisie',{...b,registratieVersie:5},{...b,refter:{},registratieVersie:6},'ALLOW');
 add('revisie verwijderen verboden',{...b,registratieVersie:5},b,'DENY');
 add('ongeldige revisie verboden',b,{...b,refter:{},registratieVersie:'1'},'DENY');
 add('andere klasgegevens kunnen ongewijzigde afwezigheden behouden',{...b,registratieVersie:5},{...b,registratieVersie:5,leerlingen:[{id:'kind',first:'Test'}]},'ALLOW');
 add('oude pagina mag nog lezen',b,b,'ALLOW','klasleerkracht','get');
 const response=await fetch('https://firebaserules.googleapis.com/v1/projects/huiswerkapp-a311e:test',{method:'POST',headers:{Authorization:'Bearer '+tokens.access_token,'Content-Type':'application/json'},body:JSON.stringify({source:{files:[{name:'firestore.rules',content:source}]},testSuite:{testCases:cases}})});
 const result=await response.json();fs.writeFileSync('tmp/versiebeveiliging/testresultaat.json',JSON.stringify(result,null,2));
 if(!response.ok)throw Error(JSON.stringify(result));
 if((result.issues||[]).some(x=>x.severity==='ERROR'))throw Error(JSON.stringify(result.issues));
 const results=result.testResults||[];
 results.forEach((r,i)=>console.log(JSON.stringify({test:labels[i],state:r.state,errors:r.errors})));
 if(results.length!==cases.length||results.some(r=>r.state!=='SUCCESS'))throw Error('Niet alle regeltests geslaagd');
 fs.writeFileSync('tmp/versiebeveiliging/validated.sha256',require('node:crypto').createHash('sha256').update(source).digest('hex'));
 console.log(`${results.length} Firebase-regeltests geslaagd; geen documentwrites.`);
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
