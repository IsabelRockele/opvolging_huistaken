export type Pupil={id:string,firstName:string,classNumber:number,name:string};
export function schoolYear(){const d=new Date(),y=d.getMonth()>=7?d.getFullYear():d.getFullYear()-1;return `${y}-${y+1}`;}
export function schoolYearEnd(year=schoolYear()){return new Date(Number(year.split('-')[1]),7,1).getTime();}
export async function teacherClasses(f:any,auth:any,db:any){
 const user=auth.currentUser;if(!user||user.isAnonymous)throw Error('Meld je aan als leerkracht in de huiswerkapp om je klaslijst te laden.');
 const {getDoc,doc,getDocs,collection,query,where}=f,year=schoolYear(),role=(await getDoc(doc(db,'schoolrollen',user.uid))).data()?.rol;
 const wide=['beheerder','directie','zorgcoordinator','zorgleerkracht'].includes(role),email=String(user.email||'').toLowerCase();
 const snaps=wide?[await getDocs(collection(db,'klasleerkrachten'))]:await Promise.all([getDocs(query(collection(db,'klasleerkrachten'),where('leerkracht_uids','array-contains',user.uid))),email?getDocs(query(collection(db,'klasleerkrachten'),where('leerkracht_emails','array-contains',email))):{docs:[]}]);
 const classes=new Set<string>();for(const snap of snaps)for(const d of snap.docs){const x=d.data();if(x.actief!==false&&String(x.schooljaar||year)===year){const name=String(x.klas||x.klasId||'').trim();if(name)classes.add(name);}}
 return {schoolyear:year,classes:[...classes].sort((a,b)=>a.localeCompare(b,'nl',{numeric:true}))};
}
export async function classRoster(f:any,auth:any,db:any,className:string){
 const access=await teacherClasses(f,auth,db);if(!access.classes.includes(className))throw Error('Deze klas is niet aan jouw account gekoppeld.');
 const {getDoc,doc}=f,year=access.schoolyear,legacy=await getDoc(doc(db,'schoolbeheer',year,'klassen',className));let data=legacy.data()||{};
 if(!Array.isArray(data.leerlingen)||!data.leerlingen.length){const group=({ '1A':'graad1','2A':'graad1','3A':'graad2','4A':'graad2','5A':'graad3','6A':'graad3'} as Record<string,string>)[className.toUpperCase()];if(group){const g=await getDoc(doc(db,'schoolbeheer_groepen',year+'_'+group));data=g.data()?.klassen?.[className]||{};}}
 const currentDate=new Date().toLocaleDateString('sv-SE'),begin=year.slice(0,4)+'-09-01',end=year.slice(5)+'-06-30',today=currentDate<begin?begin:currentDate>end?end:currentDate,parts=(s:any)=>{const full=String(s.naam||s.name||'').trim(),first=String(s.roepnaam||s.roepNaam||s.callingName||s.first||s.firstName||s.voornaam||(full.includes(',')?full.split(',').slice(1).join(' ').trim():full.split(/\s+/)[0])||'').trim(),last=String(s.last||s.lastName||s.achternaam||(full.includes(',')?full.split(',')[0]:full.split(/\s+/).slice(1).join(' '))||'').trim();return {first,last};};
 const sortKey=(s:any)=>(s.last+s.first).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/gi,'').toLocaleLowerCase('nl');
 const students=(data.leerlingen||[]).filter((s:any)=>s.actief!==false&&(!(s.startDatum||s.start)||(s.startDatum||s.start)<=today)&&(!(s.eindDatum||s.end)||(s.eindDatum||s.end)>=today)).map((s:any)=>({...s,...parts(s)})).filter((s:any)=>s.first).sort((a:any,b:any)=>sortKey(a).localeCompare(sortKey(b),'nl',{sensitivity:'base'}));
 const pupils:Pupil[]=await Promise.all(students.map(async(s:any,i:number)=>{const key=`${year}|${className}|${s.id||s.first+' '+s.last}`,hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key));return {id:Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join(''),firstName:s.first,classNumber:i+1,name:(s.first+' ('+(i+1)+')').slice(0,18)};}));
 if(!pupils.length)throw Error('Deze klaslijst bevat nog geen actieve leerlingen. Controleer de klaslijst in de huiswerkapp.');
 return {className,schoolyear:year,pupils};
}
