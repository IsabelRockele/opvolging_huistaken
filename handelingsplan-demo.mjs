import {planInput,evaluationInput} from './handelingsplan-validatie.mjs';
// Alleen expliciet via ?demo=1. Fictieve inhoud, uitsluitend in geheugen.
export function createDemoApi(catalog){
  const goal=catalog.doelen.find(g=>g.vakgebied==='Wiskunde' && g.leeftijden.includes('7-8')) || catalog.doelen[0];
  const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Brussels'}).format(new Date());
  const y=Number(day.slice(0,4))-(day.slice(5,7)<'09'?1:0),year=`${y}-${y+1}`;
  const start=`${y}-09-01`;
  const initial={id:'voorbeeld',versie:1,doel:goal,kinddoel:'Noor oefent met een vaste stappenkaart en verwoordt de tussenstappen.',beginsituatie:'Met concreet materiaal lukt de opdracht. Zonder steun slaat Noor soms een stap over.',succescriterium:'Bij vier van de vijf oefenkansen voert Noor de afgesproken stappen zelfstandig uit.',aanpak:'Eerst samen voordoen, daarna samen oefenen en tot slot zelfstandig proberen met de stappenkaart.',materiaal:'Concreet materiaal en een stappenkaart.',frequentie:'Driemaal per week tien minuten, in een rustig groepje.',verantwoordelijke:'Klasleerkracht: dagelijkse toepassing. Zorgleerkracht: extra inoefening.',ouderafspraken:'Ouders ontvangen de stappenkaart en geven aan hoe het oefenen thuis verloopt.',startdatum:start,evaluatiedatum:day,status:'actief',startSchooljaar:year,startKlas:'2A',laatstSchooljaar:year,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),laatsteEvaluatie:null};
  const plans=new Map([[initial.id,initial]]),events=new Map([[initial.id,[{versie:1,datum:start,context:{schooljaar:year,klas:'2A',bron:'zorgoverleg'},auteur:'Voorbeeldleerkracht',plan:structuredClone(initial),evaluatie:null}]]]);
  return async request=>{
    if(request.action==='load')return structuredClone({naam:'Noor — fictief voorbeeld',klas:'2A',schooljaar:year,huidigSchooljaar:year,schrijfbaar:true,vandaag:day,plannen:[...plans.values()]});
    if(request.action==='history')return structuredClone({historiek:events.get(request.planId)||[]});
    if(request.action==='save'){
      const old=plans.get(request.planId),p=request.plan;
      if((old?.versie||0)!==request.expectedVersion)throw Error('Dit plan is ondertussen gewijzigd.');
      const validated=planInput(p,catalog.doelen,old);
      const evaluation=evaluationInput(request.evaluatie,validated,day);
      const plan={...validated,id:request.planId,versie:(old?.versie||0)+1,startSchooljaar:old?.startSchooljaar||year,laatstSchooljaar:year,createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),laatsteEvaluatie:evaluation||old?.laatsteEvaluatie||null};
      plan.startKlas=old?.startKlas||'2A';plan.laatsteKlas='2A';plan.aantalEerdereAanpakken=(old?.aantalEerdereAanpakken||0)+(request.eerdereAanpak||[]).length;
      plans.set(plan.id,plan);
      events.set(plan.id,[{versie:plan.versie,datum:new Date().toISOString(),context:{schooljaar:year,klas:'2A',bron:'zorgoverleg'},auteur:'Voorbeeldleerkracht',plan:structuredClone(plan),evaluatie:evaluation,eerdereAanpak:structuredClone(request.eerdereAanpak||[])},...(events.get(plan.id)||[])]);
      return {bewaard:true,versie:plan.versie};
    }
  };
}
