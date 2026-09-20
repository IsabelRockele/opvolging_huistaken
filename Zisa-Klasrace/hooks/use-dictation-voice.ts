'use client';
import {useEffect,useRef,useState} from 'react';
export function useDictationVoice(){
 const [voices,setVoices]=useState<SpeechSynthesisVoice[]>([]),[voiceName,setVoiceName]=useState(''),[speaking,setSpeaking]=useState(false),[voiceError,setVoiceError]=useState('');
 const active=useRef<SpeechSynthesisUtterance|null>(null),locked=useRef(false);
 useEffect(()=>{if(!('speechSynthesis' in window))return;const load=()=>{const list=speechSynthesis.getVoices().filter(v=>/^nl([_-]|$)/i.test(v.lang));setVoices(list);setVoiceName(old=>list.some(v=>v.name===old)?old:list.find(v=>/BE/i.test(v.lang))?.name||list[0]?.name||'');};load();speechSynthesis.addEventListener('voiceschanged',load);return()=>{speechSynthesis.removeEventListener('voiceschanged',load);active.current=null;locked.current=false;speechSynthesis.cancel();};},[]);
 function cancel(){active.current=null;locked.current=false;setSpeaking(false);if('speechSynthesis' in window)speechSynthesis.cancel();}
 function speak(text:string,onStarted?:()=>void){
  if(locked.current)return;
  if(!('speechSynthesis' in window)){setVoiceError('Voorlezen is niet beschikbaar. Probeer Safari op de iPad of een browser met Nederlandse spraak.');return;}
  const available=speechSynthesis.getVoices().filter(v=>/^nl([_-]|$)/i.test(v.lang));
  const voice=available.find(v=>v.name===voiceName)||available.find(v=>/BE/i.test(v.lang))||available[0];
  speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang=voice?.lang||'nl-BE';utterance.voice=voice||null;utterance.rate=.8;
  active.current=utterance;locked.current=true;setSpeaking(true);setVoiceError('');
  let started=false;const watchdog=setTimeout(()=>{if(active.current===utterance&&!started){active.current=null;locked.current=false;setSpeaking(false);speechSynthesis.cancel();setVoiceError('Er kon geen stem starten. Kies een Nederlandse stem en tik opnieuw op de luidspreker.');}},6000);
  const done=()=>{clearTimeout(watchdog);if(active.current!==utterance)return;active.current=null;locked.current=false;setSpeaking(false);};
  utterance.onstart=()=>{if(active.current!==utterance||started)return;started=true;clearTimeout(watchdog);onStarted?.();};
  utterance.onend=done;
  utterance.onerror=e=>{if(active.current!==utterance)return;done();if(e.error!=='interrupted'&&e.error!=='canceled')setVoiceError('Geen stem gehoord? Controleer het volume en kies een Nederlandse stem. Tik daarna opnieuw op de luidspreker.');};
  speechSynthesis.speak(utterance);
 }
 return {voices,voiceName,setVoiceName,speaking,voiceError,speak,cancel};
}
