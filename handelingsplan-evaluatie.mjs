export const DOELRESULTAAT={ 'niet-beoordeeld':'Nog niet beoordeeld', 'nog-niet':'Nog niet bereikt', bereikt:'Bereikt' };
export function evaluatieDoelen(doel){
  if(!doel)return [];
  const id=doel.id||doel.nummer;
  return [{id:`doel:${id}`,titel:doel.nummer,tekst:doel.tekst},...(doel.items||[]).map((item,i)=>({id:`item:${id}:${i}`,titel:item.groep,tekst:item.tekst}))];
}
