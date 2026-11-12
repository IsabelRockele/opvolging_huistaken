function sleutel(naam) {
  return String(naam).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, '').toLocaleLowerCase('nl');
}

export function alfabetischeVolgorde(ids, naam) {
  return [...ids].sort((a, b) => sleutel(naam(a)).localeCompare(sleutel(naam(b)), 'nl', { sensitivity: 'base' }));
}

// Oude lijsten bewaarden alleen de volgorde, niet de keuze 'onderaan'.
// Behoud de staart vanaf de eerste afwijking van de toenmalige sortering.
export function herstelAfwezigheidsvolgorde(ids, naam, onderaan) {
  if (!Array.isArray(onderaan)) {
    const grens = ids.findIndex((id, i) => i > 0 && naam(ids[i - 1]).localeCompare(naam(id), 'nl') > 0);
    onderaan = grens < 0 ? [] : ids.slice(grens);
  }
  const vast = new Set(onderaan);
  const staart = ids.filter(id => vast.has(id));
  return {
    volgorde: [...alfabetischeVolgorde(ids.filter(id => !vast.has(id)), naam), ...staart],
    onderaan: staart,
  };
}
