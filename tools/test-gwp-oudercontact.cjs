const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
(async()=>{
 const {berekenJaarbudget}=await import('../maximumfactuur-budget.mjs');
 const activities=[{categorie:'gwp',date:'2026-10-01',price:150},{categorie:'gwp',date:'2026-12-01',price:200,priceUnknown:true},{date:'2026-10-01',price:12}];
 const before=JSON.stringify(activities),b=berekenJaarbudget({activiteiten:activities},'2026-2027','2026-10-30',105);
 assert.equal(b.besteedCent,1200);assert.equal(b.geplandCent,0);assert.equal(b.onbekend,0);assert.equal(JSON.stringify(activities),before);
 const html=fs.readFileSync('schoolbeheer.html','utf8');
 const c=vm.createContext({isoDatum:()=> '2026-10-30',Date});vm.runInContext(html.slice(html.indexOf('    function mfActiviteitOpOuderfactuur'),html.indexOf('    function activiteitenBudgetHtml')),c);
 assert.equal(c.mfActiviteitOpOuderfactuur(activities[0]),false);assert.equal(c.mfActiviteitOpOuderfactuur(activities[2]),true);
 const ocHtml=fs.readFileSync('oudercontact.html','utf8');const oc={type:'verplicht',datum:'2026-10-01',gesprekken:{oud:{nl:'Bestaande voorbereiding',tijd:'16:00'}}};
 const state={leerlingen:[{id:'oud',naam:'Andere leerling'},{id:'eray',naam:'Eray',schoolbeheerId:'e'}]};
 const o=vm.createContext({state,ocLeerlingenOpDatum:()=>[state.leerlingen[0]]});
 vm.runInContext(ocHtml.slice(ocHtml.indexOf('function getLeerlingenVoorOc(oc)'),ocHtml.indexOf('function renderLeerlingenSidebar()')),o);
 const gesprekken=JSON.stringify(oc.gesprekken);assert.equal(o.getLeerlingenVoorOc(oc).length,1);oc.extraLeerlingen=['eray'];assert.equal(o.getLeerlingenVoorOc(oc).length,2);assert.equal(JSON.stringify(oc.gesprekken),gesprekken);
 // Parse every inline module, including event handlers defined in it.
 for(const file of ['schoolbeheer.html','oudercontact.html']){const source=fs.readFileSync(file,'utf8');for(const match of source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)){const code=match[1].replace(/^\s*import\s[\s\S]*?;\s*$/gm,'');new vm.Script("(async()=>{"+code+"})",{filename:file});}}
 console.log('GWP uitgesloten van budget en ouderfactuur; extra leerling zichtbaar met behoud van bestaande voorbereidingen; scripts geldig.');
})().catch(e=>{console.error(e);process.exitCode=1});

