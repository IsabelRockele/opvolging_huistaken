// Apply only the difference between the read version and the edited version.
// Arrays of records are merged by ID, never by their position in a stale list.
const copy = value => value === undefined ? undefined : structuredClone(value);
// Firestore maps have no meaningful field order. JSON.stringify would turn a
// reordered server response into a false conflict (and revoke confirmations).
const equal = (a, b) => {
  if (a === b) return true;
  if (a == null || b == null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => equal(v, b[i]));
  }
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && equal(a[key], b[key]));
};
// Missing and explicitly unchecked cells both mean present in the UI.
const zelfdeAfwezigen = (a, b) => equal(
  Object.keys(a || {}).filter(id => !!a[id]).sort(),
  Object.keys(b || {}).filter(id => !!b[id]).sort()
);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const records = value => Array.isArray(value) && value.every(x => object(x) && typeof x.id === 'string' && x.id) && new Set(value.map(x => x.id)).size === value.length;

export function voegWijzigingenSamen(base, local, remote) {
  if (equal(base, local)) return copy(remote);
  if (records(local) && records(base || []) && records(remote || [])) {
    const before = new Map((base || []).map(x => [x.id, x]));
    const edited = new Map(local.map(x => [x.id, x]));
    const result = [];
    for (const item of remote || []) {
      if (before.has(item.id) && !edited.has(item.id)) continue;
      result.push(edited.has(item.id)
        ? voegWijzigingenSamen(before.get(item.id), edited.get(item.id), item) : copy(item));
    }
    for (const item of local) {
      if (!before.has(item.id) && !(remote || []).some(x => x.id === item.id)) result.push(copy(item));
    }
    return result;
  }
  if (object(local) && (base === undefined || object(base)) && (remote === undefined || object(remote))) {
    const result = copy(remote || {});
    for (const key of new Set([...Object.keys(base || {}), ...Object.keys(local)])) {
      if (equal(base?.[key], local[key])) continue;
      if (!Object.hasOwn(local, key)) delete result[key];
      else result[key] = voegWijzigingenSamen(base?.[key], local[key], remote?.[key]);
    }
    // A concurrent confirmation must not silently confirm a different attendance list.
    if (Object.hasOwn(local, 'absent')) {
      if ((!zelfdeAfwezigen(base?.absent, local.absent) && !local.attendanceConfirmed) ||
          (local.attendanceConfirmed && !zelfdeAfwezigen(result.absent, local.absent))) {
        result.attendanceConfirmed = false;
        result.attendanceConfirmedAt = '';
        result.attendanceConfirmedBy = '';
      }
    }
    return result;
  }
  if (Array.isArray(local) && !equal(base, remote) && !equal(local, remote)) {
    throw Error('Deze lijst is intussen door iemand anders gewijzigd. Herlaad en probeer opnieuw.');
  }
  return copy(local);
}

export function controleerKlasVersie(base, remote) {
  if ((base?.klaswisselVersie || 0) !== (remote?.klaswisselVersie || 0)) {
    throw Error('Er is een leerling van klas veranderd. Open de klas opnieuw voordat je bewaart.');
  }
}

// A transaction derives this from the server document, never from a stale page.
// Firestore rejects attendance writes that do not advance this revision.
export function metRegistratieVersie(remote, next) {
  return {...next, registratieVersie: (remote?.registratieVersie || 0) + 1};
}
