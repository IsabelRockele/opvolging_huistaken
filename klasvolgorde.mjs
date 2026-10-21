// Kleuterklassen eerst, daarna lagere klassen; ook 2A vóór 10A.
export function vergelijkKlassen(a,b) {
  const key=v=>{const s=String(v||'').trim().toUpperCase(),k=s.match(/^K(\d+)(.*)$/),l=s.match(/^(\d+)(.*)$/);return k?[0,+k[1],k[2]]:l?[1,+l[1],l[2]]:[2,999,s]};
  const x=key(a),y=key(b);
  return x[0]-y[0]||x[1]-y[1]||x[2].localeCompare(y[2],'nl',{numeric:true});
}
