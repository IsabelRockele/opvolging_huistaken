export const DOELRESULTAAT={ 'niet-beoordeeld':'Nog niet beoordeeld', 'nog-niet':'Nog niet bereikt', bereikt:'Bereikt' };
export function planDoelen(plan){ return plan?.doelen?.length ? plan.doelen : plan?.doel ? [plan.doel] : []; }
export function evaluatieDoelen(doel){
  if(Array.isArray(doel))return doel.flatMap(evaluatieDoelen);
  if(!doel)return [];
  const id=doel.id||doel.nummer;
  return [{id:`doel:${id}`,vakgebied:doel.vakgebied,titel:doel.nummer,tekst:doel.tekst},...(doel.items||[]).map((item,i)=>({id:`item:${id}:${i}`,vakgebied:doel.vakgebied,titel:item.groep,tekst:item.tekst}))];
}
