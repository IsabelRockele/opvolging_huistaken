import fs from 'node:fs';
import {createRequire} from 'node:module';
const require = createRequire(new URL('../tmp/handelingsplan-tests/package.json', import.meta.url));
const {initializeTestEnvironment, assertSucceeds, assertFails} = require('@firebase/rules-unit-testing');
const {doc, collection, setDoc, getDoc, getDocs, updateDoc, deleteDoc, setLogLevel} = require('firebase/firestore');
setLogLevel('silent');
const rules = fs.readFileSync('firestore.rules', 'utf8');
const env = await initializeTestEnvironment({projectId:'demo-agenda', firestore:{host:'127.0.0.1', port:8185, rules}});
const roles = ['klasleerkracht','directie','zorgleerkracht','zorgcoordinator','beheerder','secretariaat','onbekend'];
let checks = 0;
try {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async c => {
    for (const rol of roles) await setDoc(doc(c.firestore(), 'schoolrollen', rol), {rol});
    for (let g=1; g<=3; g++) await setDoc(doc(c.firestore(), `agenda_graad${g}/bestaand`), {taak:'Oorspronkelijk'});
  });
  for (const rol of [...roles, 'zonder-rol', null]) {
    const db = rol ? env.authenticatedContext(rol).firestore() : env.unauthenticatedContext().firestore();
    const allowed = ['klasleerkracht','directie','zorgleerkracht','zorgcoordinator','beheerder'].includes(rol);
    const check = allowed ? assertSucceeds : assertFails;
    for (let g=1; g<=3; g++) {
      const path = `agenda_graad${g}`;
      const ref = doc(db, path, rol || 'anoniem');
      await check(getDoc(doc(db,path,'bestaand')));
      await check(getDocs(collection(db,path)));
      await check(setDoc(ref, {taak:'Test'}));
      await check(updateDoc(doc(db,path,'bestaand'), {taak:'Gewijzigd'}));
      await check(deleteDoc(allowed ? ref : doc(db,path,'bestaand')));
      checks += 5;
    }
  }
  console.log(`${checks} toegangscontroles voor de graadagenda's geslaagd.`);
} finally { await env.cleanup(); }
