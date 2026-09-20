// Keep play() synchronous with the tap: iPad/Safari must not wait for a fetch first.
export function createDenaPlayer(makeAudio:()=>HTMLAudioElement=()=>new Audio()){
 let audio:HTMLAudioElement|null=null,serial=0,timer:ReturnType<typeof setTimeout>|undefined;
 function stop(){serial++;clearTimeout(timer);if(audio){audio.onplaying=null;audio.onended=null;audio.onerror=null;audio.onpause=null;audio.pause();audio.removeAttribute('src');audio.load();audio=null;}}
 function play(url:string,callbacks:{started?:()=>void,done:()=>void,error:(message:string)=>void}){
  stop();const ticket=serial;const player=makeAudio();audio=player;let started=false,finished=false;
  const finish=()=>{if(serial!==ticket||finished)return;finished=true;clearTimeout(timer);callbacks.done();};
  const fail=(blocked=false)=>{if(serial!==ticket||finished)return;finish();player.pause();callbacks.error(blocked?'Tik opnieuw op de luidspreker om Dena te starten. Controleer ook het volume van je iPad.':'Dena-audio kon niet worden afgespeeld. Controleer het volume en probeer opnieuw.');};
  timer=setTimeout(()=>fail(),15000);
  player.preload='auto';player.src=url;
  player.onplaying=()=>{if(serial!==ticket||started||finished)return;started=true;clearTimeout(timer);callbacks.started?.();};
  player.onended=finish;player.onerror=()=>fail();player.onpause=()=>{if(!player.ended)fail();};
  try{const promise=player.play();promise?.catch((e:any)=>fail(e?.name==='NotAllowedError'));}catch(e:any){fail(e?.name==='NotAllowedError');}
 }
 return {play,stop};
}
