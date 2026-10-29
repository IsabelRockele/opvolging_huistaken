const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync('schoolbeheer.html', 'utf8');
const code = html.slice(html.indexOf('    window.confirmActivityAttendance ='), html.indexOf('    window.cancelActivity ='));
const activiteit = id => ({id, name:id, date:'2026-10-20', absent:{s1:true}, attendanceConfirmed:false});
let vakjes=[], meldingen=[], saves=0, renders=0;
const c = vm.createContext({window:{}, data:{activiteiten:[activiteit('a'),activiteit('b')]},
  isSecretary:()=>false, leerkrachtLijstGesloten:()=>false, activiteitDatumBereikt:()=>true,
  activeStudents:()=>[{id:'s1'},{id:'s2'}], activityMonth:'2026-10',
  document:{querySelectorAll:()=>vakjes}, user:{email:'test'},
  confirm:()=>true, alert:s=>meldingen.push(s), markDirty:()=>saves++, renderActivities:()=>renders++
});
vm.runInContext(code,c);
const vak = (activityId,studentId,checked) => ({dataset:{activityId,studentId},checked});
// Achtergrondgegevens bevatten een afwezigheid, maar de leerkracht ziet een lege lijst.
vakjes=[vak('a','s1',false),vak('a','s2',false),vak('b','s1',true),vak('b','s2',true)];
c.window.confirmActivityAttendance('a');
assert.equal(JSON.stringify(c.data.activiteiten[0].absent),'{}');
assert.equal(c.data.activiteiten[0].attendanceConfirmed,true);
assert.equal(JSON.stringify(c.data.activiteiten[1].absent),'{"s1":true}');
assert.equal(c.data.activiteiten[1].attendanceConfirmed,false);
// Alleen aangevinkte kinderen in de gekozen kolom worden opgeslagen.
c.data.activiteiten[0]=activiteit('a');
vakjes=[vak('a','s1',false),vak('a','s2',true),vak('b','s1',true)];
c.window.confirmActivityAttendance('a');
assert.equal(JSON.stringify(c.data.activiteiten[0].absent),'{"s2":true}');
// Een gewijzigde klaslijst vereist eerst een nieuwe controle.
c.data.activiteiten[0]=activiteit('a');
vakjes=[vak('a','s1',false)];
c.window.confirmActivityAttendance('a');
assert.equal(c.data.activiteiten[0].attendanceConfirmed,false);
assert.equal(saves,2);assert.equal(meldingen.length,1);assert.equal(renders,3);
// Annuleren van de bevestiging verandert ook de afwezigheden niet.
c.confirm=()=>false;vakjes=[vak('a','s1',false),vak('a','s2',false)];
c.window.confirmActivityAttendance('a');
assert.equal(JSON.stringify(c.data.activiteiten[0].absent),'{"s1":true}');
assert.equal(saves,2);
assert.match(html,/data-activity-id="\$\{esc\(a.id\)\}" data-student-id=/);
console.log('Aanwezigheden per activiteit, verouderde achtergrondgegevens, gewijzigde klaslijst en annuleren gecontroleerd.');
