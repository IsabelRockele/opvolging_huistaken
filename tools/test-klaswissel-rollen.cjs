const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('schoolbeheer.html','utf8');
const begin=html.indexOf('    window.verplaatsDezeLeerling=id=>');
const einde=html.indexOf('    window.bewaarLeerlingBeheer=',begin);
for(const role of ['secretariaat','beheerder','klasleerkracht']) {
  const buttons=[],calls=[];
  const context={window:{},role,isBeheerder:()=>role==='beheerder',isSecretary:()=>['secretariaat','beheerder'].includes(role),sluitLeerlingBeheer:()=>{},
    db:{},schooljaar:'2026-2027',activeClass:'2A',allClasses:['1A','2A'],user:{email:'test@example.test'},data:{leerlingen:[{id:'kind',first:'Test',last:'Kind'}]},
    openKlaswissel:x=>calls.push(x),esc:x=>x,startDate:()=> '2026-09-01',endDate:()=> '2027-06-30',
    document:{createElement:type=>({dataset:{},style:{},querySelector:()=>({prepend:button=>buttons.push(button)}),addEventListener:()=>{}}),body:{appendChild:()=>{}}}};
  vm.createContext(context);vm.runInContext(html.slice(begin,einde),context);
  context.window.openLeerlingBeheer('kind');context.window.verplaatsDezeLeerling('kind');
  const toegestaan=['secretariaat','beheerder'].includes(role);
  assert.equal(buttons.length,toegestaan?1:0,role+' knop');assert.equal(calls.length,toegestaan?1:0,role+' actie');
}
console.log('Klaswissel zichtbaar en uitvoerbaar voor secretariaat en beheerder; niet voor klasleerkracht.');
