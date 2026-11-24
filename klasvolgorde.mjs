// Kleuterklassen eerst, vervolgens leerjaren en eventuele overige klasnamen.
export function vergelijkKlassen(a,b) {
  const sleutel=v=>{
    const s=String(v||'').trim().toUpperCase(),k=s.match(/^K(\d+)(.*)$/),l=s.match(/^(\d+)(.*)$/);
    return k?[0,Number(k[1]),k[2]]:l?[1,Number(l[1]),l[2]]:[2,0,s];
  };
  const x=sleutel(a),y=sleutel(b);
  return x[0]-y[0]||x[1]-y[1]||x[2].localeCompare(y[2],'nl',{numeric:true});
}
