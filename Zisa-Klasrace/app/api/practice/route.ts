import {database} from '@/lib/database';
import {validEntry} from '@/lib/spelling';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(req:Request){try{
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return json({error:'Ongeldige aanvraag.'},403);
 const raw=await req.text();if(raw.length>50000)return json({error:'Deze oefenreeks is te groot.'},400);
 const b=JSON.parse(raw);if(typeof b.title!=='string'||b.title.length>80||!Array.isArray(b.entries)||b.entries.length<1||b.entries.length>40||!b.entries.every(validEntry))return json({error:'Kies 1 tot 40 geldige opdrachten.'},400);
 const id=crypto.randomUUID(),expires=Date.now()+30*86400000,db=database();
 await db.batch([db.prepare('DELETE FROM practice_lists WHERE expires<?').bind(Date.now()),db.prepare('INSERT INTO practice_lists(id,title,entries,expires) VALUES(?,?,?,?)').bind(id,b.title,JSON.stringify(b.entries),expires)]);
 return json({id,expires});
 }catch(e){console.error(e);return json({error:'De oefenlink maken lukt even niet. Probeer opnieuw.'},503);}}
export async function GET(req:Request){try{
 const id=new URL(req.url).searchParams.get('id')||'';if(!/^[a-f0-9-]{36}$/.test(id))return json({error:'Deze oefenlink klopt niet.'},400);
 const row=await database().prepare('SELECT title,entries FROM practice_lists WHERE id=? AND expires>?').bind(id,Date.now()).first<{title:string,entries:string}>();
 if(!row)return json({error:'Deze oefenlink is verlopen. Vraag de leerkracht een nieuwe QR-code.'},404);
 return json({title:row.title,entries:JSON.parse(row.entries)});
 }catch(e){console.error(e);return json({error:'Oefeningen laden lukt even niet. Open de link opnieuw.'},503);}}
