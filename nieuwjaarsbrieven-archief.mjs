import {statusBrief} from './nieuwjaarsbrieven-model.mjs?v=20261024';
import {vergelijkKlassen} from './klasvolgorde.mjs';

export function maakBriefOverzichten({klassen,prijsCent=60}) {
  const naam=s=>[s.last||s.lastName,s.first||s.firstName].filter(Boolean).join(' ')||s.naam||s.name||'Onbekende leerling';
  return [...klassen].sort((a,b)=>vergelijkKlassen(a.klas,b.klas)).map(k=>{
    const leerlingen=new Map((k.leerlingen||[]).map(s=>[s.id,s]));
    const orders=new Map((k.brieven||[]).map(r=>[r.id,r]));
    const ids=new Set([...leerlingen.keys(),...orders.keys()]);
    let totaal=0,ingevuld=0;
    const rijen=[...ids].map(id=>{
      const r=orders.get(id),a=r?.aantal;
      if(a!=null){totaal+=a;ingevuld++;}
      return [leerlingen.has(id)?naam(leerlingen.get(id)):r?.naam||id,a==null?'-':String(a),a==null?'-':(a*prijsCent/100).toFixed(2),a==null?'Nog niet ingevuld':statusBrief(r,prijsCent)];
    }).sort((a,b)=>a[0].localeCompare(b[0],'nl',{numeric:true}));
    return {klas:k.klas,notities:[`Volledig schooljaar. Prijs per brief: EUR ${(prijsCent/100).toFixed(2)}.`,`${ingevuld} van ${ids.size} ingevuld | ${totaal} brieven | Totaal: EUR ${(totaal*prijsCent/100).toFixed(2)}.`],tabellen:[{kop:['Leerling','Aantal brieven','EUR','Status'],breedtes:[110,32,30,105],rijen}]};
  });
}
