export const STANDAARD_PRIJS = 60;
export function bedrag(aantal, prijsCent = STANDAARD_PRIJS) { return aantal * prijsCent; }
export function verschilBrief(record, prijsCent = STANDAARD_PRIJS) {
  if(!record?.verwerkt||record.aantal===null)return null;
  return {aantal:record.aantal-record.verwerkt.aantal,bedragCent:bedrag(record.aantal,prijsCent)-record.verwerkt.bedragCent};
}
export function statusBrief(record, prijsCent = STANDAARD_PRIJS) {
  if (!record || record.aantal === null) return 'Nog niet ingevuld';
  if (!record.verwerkt) return record.aantal ? 'Nieuw — te verwerken' : 'Geen brieven gewenst';
  return record.aantal === record.verwerkt.aantal && bedrag(record.aantal, prijsCent) === record.verwerkt.bedragCent
    ? 'Verwerkt' : 'Gewijzigd — opnieuw te verwerken';
}
export function deadlineVoorbij(deadline, now = new Date()) {
  const dag = new Intl.DateTimeFormat('sv-SE', {timeZone:'Europe/Brussels',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  return !!deadline && dag > deadline;
}
export function geldigAantal(value) { return Number.isInteger(value) && value >= 0 && value <= 999; }
export function pastInFilter(record, filter, prijsCent = STANDAARD_PRIJS) {
  if (record?.aantal === null) record = undefined;
  if (filter === 'ingevuld') return !!record;
  if (filter === 'open') return statusBrief(record, prijsCent).includes('te verwerken');
  if (filter === 'leeg') return !record;
  return true;
}
export function briefMaandStatus(records, prijsCent = STANDAARD_PRIJS) {
  const maanden = new Map();
  for (const r of records) {
    if (r.aantal === null) continue;
    const datum = r.gewijzigdOp?.toDate?.();
    if (!datum || Number.isNaN(datum.getTime())) continue;
    const maand = new Intl.DateTimeFormat('sv-SE', {timeZone:'Europe/Brussels',year:'numeric',month:'2-digit'}).format(datum);
    const status = maanden.get(maand) || {aantal:0,open:0,brieven:0};
    status.aantal++;status.brieven+=r.aantal||0;
    if (statusBrief(r,prijsCent).includes('te verwerken')) status.open++;
    maanden.set(maand,status);
  }
  return maanden;
}
