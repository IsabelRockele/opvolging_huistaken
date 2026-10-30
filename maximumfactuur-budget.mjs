// Planning is separate from the parent invoice: future activities reserve budget.
export function berekenJaarbudget(klasData, jaar, vandaag, limiet) {
  const cent=p=>Math.round(Number(p.prijs??p.price??0)*100)||0;
  const begin=`${jaar.slice(0,4)}-09-01`,eind=`${jaar.slice(5,9)}-08-31`;
  const activiteiten=(klasData.activiteiten||[]).filter(a=>{
    const d=a.datum||a.date||'';
    return a.categorie!=="gwp"&&!a.cancelled&&(!d||(d>=begin&&d<=eind));
  });
  const gepland=activiteiten.filter(a=>!(a.datum||a.date)||(a.datum||a.date)>vandaag);
  const onbekend=activiteiten.filter(a=>a.priceUnknown).length;
  const prijs=a=>a.priceUnknown?0:cent(a);
  const besteedCent=(klasData.vastePosten||[]).reduce((s,p)=>s+cent(p),0)+activiteiten.filter(a=>!gepland.includes(a)).reduce((s,p)=>s+prijs(p),0);
  const geplandCent=gepland.reduce((s,p)=>s+prijs(p),0);
  return {besteedCent,geplandCent,restCent:Math.round(limiet*100)-besteedCent-geplandCent,onbekend,gepland,afgelopen:activiteiten.filter(a=>!gepland.includes(a)),vastePosten:klasData.vastePosten||[]};
}
