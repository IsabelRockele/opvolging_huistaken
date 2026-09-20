import {firebaseGame} from './firebase-game';
export const gameBase=()=>new URL('/opvolging_huistaken/klasrace/',location.origin).href;
let run:ReturnType<typeof firebaseGame>;
export async function api(data:any):Promise<any>{
 try{
  if(!run){const {f,auth,db}=await (window as any).klasraceAuth;run=firebaseGame(f,auth,db);}
  return await run(data);
 }catch(e:any){
  if(e.code==='permission-denied'&&data.action==='practice-read')throw Error('Deze oefen-QR is niet meer beschikbaar. Vraag je leerkracht een nieuwe QR-code voor dit schooljaar.');
  if(e.code==='permission-denied')throw Error('Je hebt geen toegang tot deze race, of de spelregels zijn nog niet geactiveerd. Open de QR-code van je eigen klas.');
  throw e;
 }
}
