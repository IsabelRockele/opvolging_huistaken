import assert from 'node:assert/strict';
import { alfabetischeVolgorde, herstelAfwezigheidsvolgorde } from '../afwezigheidsvolgorde.mjs';

const namen = ['Abuamra, Obada', 'Ahmed, Taman', 'Fezollari, Majkl', 'Haralanova, Ikra', 'Kosar, Asiye', 'Salimi, Zeynab', 'Sarpong, Raphaël', 'Skhiri, Rania', 'Stalmierska, Hanna', 'Van Doorslaer, Polly', 'Van Praet, Sky', 'Vandendriessche, Emiel', 'Yildiz, Ilyas', 'Orhan, Eray'];
const ids = namen.map((_, i) => String(i));
const naam = id => namen[Number(id)];
const hersteld = herstelAfwezigheidsvolgorde(ids, naam);
assert.deepEqual(hersteld.volgorde.map(naam), [...namen.slice(0, 9), namen[11], namen[9], namen[10], namen[12], namen[13]]);
assert.deepEqual(hersteld.onderaan, ['13']);
assert.deepEqual(herstelAfwezigheidsvolgorde(hersteld.volgorde, naam, hersteld.onderaan), hersteld);

// Een volgende alfabetische invoeging laat de latere instromer onderaan.
namen.push('Bakker, Anna');
const aangevuld = herstelAfwezigheidsvolgorde([...hersteld.volgorde, '14'], naam, hersteld.onderaan);
assert.equal(aangevuld.volgorde[2], '14');
assert.equal(aangevuld.volgorde.at(-1), '13');
assert.equal(alfabetischeVolgorde(ids, naam).indexOf('13'), 5);
assert.deepEqual(herstelAfwezigheidsvolgorde([], naam), { volgorde: [], onderaan: [] });
console.log('Afwezigheidsvolgorde: alle controles geslaagd.');
