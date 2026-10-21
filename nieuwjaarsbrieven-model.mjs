export const STANDAARD_PRIJS = 60;
export function bedrag(aantal, prijsCent = STANDAARD_PRIJS) { return aantal * prijsCent; }
export function statusBrief(record, prijsCent = STANDAARD_PRIJS) {
  if (!record) return 'Nog niet ingevuld';
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
  if (filter === 'ingevuld') return !!record;
  if (filter === 'open') return statusBrief(record, prijsCent).includes('te verwerken');
  if (filter === 'leeg') return !record;
  return true;
}
