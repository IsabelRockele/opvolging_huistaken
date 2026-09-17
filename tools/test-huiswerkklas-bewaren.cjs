const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'huiswerkklas.html'), 'utf8');
const source = html.slice(html.indexOf('function gebruiktMobielFormulier()'), html.indexOf('async function openMonth('));
const day = '2026-09-17';
const otherDay = '2026-09-15';
const checkbox = (dataset, checked) => ({ dataset, checked });

function fixture({ mobile = false, qr = false, checked = true, emptyMobile = false } = {}) {
  const mobileActive = mobile || qr;
  const selectors = {
    '[data-present]': [checkbox({ date: day, present: 'leerling' }, mobileActive ? !checked : checked)],
    '[data-mobile-present]': [checkbox({ mobilePresent: 'leerling' }, mobileActive ? checked : !checked)],
    '[data-supervisor-date]': [checkbox({ supervisorDate: day, supervisorName: 'Begeleider' }, mobileActive ? !checked : checked)],
    '[data-mobile-supervisor]': emptyMobile ? [] : [checkbox({ mobileSupervisor: 'Begeleider' }, mobileActive ? checked : !checked)],
    '[data-lock-date]': [checkbox({ lockDate: otherDay }, false)],
  };
  const element = { textContent: '', classList: { toggle() {} } };
  let saved;
  const context = vm.createContext({
    qrMobileMode: qr,
    window: { matchMedia: () => ({ matches: mobile }) },
    document: { querySelectorAll: selector => selectors[selector] || [] },
    hw: { enrolled: {}, attendance: { [day]: { leerling: !checked }, [otherDay]: { ander: true } }, supervisors: { [day]: ['Begeleider'] }, processedDates: { [otherDay]: true } },
    mobileSelectedDate: day, mobileHasUnsavedChanges: mobileActive,
    localRows: () => [], zichtbareBegeleiderNamen: names => names || [],
    $: () => element, monthRef: () => 'maand', schooljaar: '2026-2027', month: '2026-09',
    bewaarTotVoorSchooljaar: () => '2028-08-31', BEWAAR_JAREN_HUISWERKKLAS: 2,
    serverTimestamp: () => 'timestamp', user: { uid: 'test' }, demoMode: false,
    setDoc: async (_, payload) => { saved = JSON.parse(JSON.stringify(payload)); },
    render() {}, toonBewaarmelding() {}, updateMobileSaveButton() {}, formatSupervisorDate: value => value,
    clearTimeout() {}, setTimeout: () => 1,
  });
  vm.runInContext(source, context);
  return { context, selectors, saved: () => saved };
}

for (const mode of [{ name: 'laptop' }, { name: 'gsm', mobile: true }, { name: 'QR-modus op laptop', qr: true }]) {
  for (const checked of [true, false]) {
    for (const saveFunction of ['save', 'saveNoRender']) {
      test(`${mode.name}: ${checked ? 'aanvinken' : 'uitvinken'} via ${saveFunction} blijft opgeslagen`, async () => {
        const f = fixture({ ...mode, checked });
        await vm.runInContext(`${saveFunction}()`, f.context);
        // De opgeslagen inhoud is wat een nieuwe sessie opnieuw zou laden.
        const reloaded = f.saved();
        assert.equal(reloaded.attendance[day].leerling, checked);
        assert.deepEqual(reloaded.supervisors[day], checked ? ['Begeleider'] : []);
        assert.equal(reloaded.attendance[otherDay].ander, true);
        if (mode.mobile || mode.qr) assert.equal(reloaded.processedDates[otherDay], true);
      });
    }
  }
}

test('ontbrekend mobiel begeleidersformulier wist geen bestaande registratie', () => {
  const f = fixture({ mobile: true, emptyMobile: true });
  vm.runInContext('collect()', f.context);
  assert.equal(f.context.hw.supervisors[day][0], 'Begeleider');
});

test('laptop legt vinkjes meteen vast vóór de automatische bewaarpauze', () => {
  const f = fixture();
  vm.runInContext('autoSave()', f.context);
  assert.equal(f.context.hw.attendance[day].leerling, true);
  assert.equal(f.context.hw.supervisors[day][0], 'Begeleider');
});
