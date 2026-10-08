const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync('schoolbeheer.html', 'utf8');
const code = html.slice(html.indexOf('    function leerkrachtLijstGesloten'), html.indexOf('    function renderMessageAdmin()'));
const content = {innerHTML:''};
let writes = 0;
const c = vm.createContext({window:{}, console, Date, Map, Number,
  data:{activiteiten:[],aankopen:[],leerlingen:[{id:'s',first:'Test',last:'Leerling'}]},
  activeClass:'1A', activityMonth:'',purchaseMonth:'',allClasses:['1A'],
  secretariaatOpvolgModus:false,secretariaatArchiefModus:'',secretariaatAankoopCategorie:'',
  isSecretary:()=>false,huidigeSchoolMaand:()=> '2026-10',schoolMonths:()=>['2026-09','2026-10','2026-11'],
  esc:s=>String(s),maandNaam:m=>m,formatDate:d=>d,name:s=>s.first,
  maandGrenzen:()=>({van:'2026-09-01',tot:'2026-09-30'}),
  activeStudents:()=>c.data.leerlingen,leerlingenInPeriode:()=>c.data.leerlingen,leerlingActiefOp:()=>true,
  activiteitDatumBereikt:()=>true,screenTools:()=>'',maandOnderdeelNavigatie:()=>'',helpPanel:()=>'',
  $:()=>content,markDirty:()=>writes++,alert:()=>{},confirm:()=>true,prompt:()=> 'Fout',user:{email:'secretariaat@test'},
});
vm.runInContext(code,c);
const a={id:'a',name:'Uitstap',date:'2026-09-15',price:5,absent:{s:true},attendanceConfirmed:true,processed:true};
const p={id:'p',studentId:'s',type:'badmuts',price:1,date:'2026-09-15',processed:true};
c.data.activiteiten=[a];c.data.aankopen=[p];
const before=JSON.stringify(c.data);
c.window.bekijkLijstenMaand('activiteiten','2026-09');
assert.equal(c.activityMonth,'2026-09');
assert.match(content.innerHTML,/Uitstap/);
assert.match(content.innerHTML,/checked.*disabled/);
assert.ok(!content.innerHTML.includes('id="actName"'));
c.window.bekijkLijstenMaand('aankopen','2026-09');
assert.equal(c.purchaseMonth,'2026-09');assert.match(content.innerHTML,/Badmuts/);
assert.ok(!content.innerHTML.includes('deletePurchase('));
assert.ok(!content.innerHTML.includes('id="buyStudent"'));
c.window.toggleActAbsent('a','s',false);
c.window.iedereenAfwezigActiviteit('a');c.window.confirmActivityAttendance('a');
c.window.cancelActivity('a');c.window.deletePurchase('p');
c.window.corrigeerAankoop('p');c.window.bewaarAankoopCorrectie();
assert.equal(JSON.stringify(c.data),before);assert.equal(writes,0);
// An unprocessed past month is also closed; confirmed current activities stay closed.
for(const date of ['2026-09-15','2026-10-15']){
  a.date=date;a.processed=false;
  assert.equal(c.leerkrachtLijstGesloten(a,'activiteiten'),true);
}
p.processed=false;assert.equal(c.leerkrachtLijstGesloten(p,'aankopen'),true);
p.date='2026-10-15';assert.equal(c.leerkrachtLijstGesloten(p,'aankopen'),false);
a.attendanceConfirmed=false;assert.equal(c.leerkrachtLijstGesloten(a,'activiteiten'),false);
c.window.bekijkLijstenMaand('aankopen','2026-10');assert.match(content.innerHTML,/id="buyStudent"/);
c.window.bekijkLijstenMaand('aankopen','2099-01');assert.equal(c.purchaseMonth,'2026-10');
c.isSecretary=()=>true;p.processed=true;
assert.match(c.purchaseTable(),/corrigeerAankoop/);
const fields={purchaseCorrectionDialog:{dataset:{purchaseId:'p'},close(){}},correctBuyStudent:{value:'s'},correctBuyType:{value:'turnshirt'},correctBuyPrice:{value:'8'},correctBuyDate:{value:'2026-09-18'}};
c.$=id=>fields[id]||content;c.renderPurchases=()=>{};
c.window.bewaarAankoopCorrectie();
assert.equal(p.price,8);assert.equal(p.type,'turnshirt');assert.equal(p.processed,true);assert.equal(writes,1);
console.log('Maandkeuze, alleen-lezen, wijzigingsblokkades en secretariaatcorrectie gecontroleerd.');
