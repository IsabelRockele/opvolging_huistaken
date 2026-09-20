'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {denaUrl,prepareDena} from '@/lib/dena-audio';
import {createDenaPlayer} from '@/lib/dena-player';
import type {SpellingEntry} from '@/lib/spelling';
export function useDictationVoice(){
 const [speaking,setSpeaking]=useState(false),[voiceError,setVoiceError]=useState(''),[preparing,setPreparing]=useState(false),[progress,setProgress]=useState('');
 const player=useRef<ReturnType<typeof createDenaPlayer>|null>(null),locked=useRef(false),mounted=useRef(true),job=useRef(0);
 const cancel=useCallback(()=>{player.current?.stop();locked.current=false;setSpeaking(false);},[]);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;job.current++;player.current?.stop();locked.current=false;};},[]);
 const prepare=useCallback(async(entries:SpellingEntry[])=>{
  const id=++job.current;setPreparing(true);setVoiceError('');
  try{await prepareDena(entries,message=>{if(mounted.current&&job.current===id)setProgress(message);},()=>mounted.current&&job.current===id);}
  catch(e){if(mounted.current&&job.current===id)setVoiceError((e as Error).message);throw e;}
  finally{if(mounted.current&&job.current===id){setPreparing(false);setProgress('');}}
 },[]);
 function speak(text:string,onStarted?:()=>void){
  if(locked.current)return;
  const url=denaUrl(text);if(!url){setVoiceError('De Dena-audio is nog niet klaar. Klik op Audio opnieuw laden en daarna op de luidspreker.');return;}
  player.current??=createDenaPlayer();locked.current=true;setSpeaking(true);setVoiceError('');
  player.current.play(url,{started:onStarted,done:()=>{locked.current=false;if(mounted.current)setSpeaking(false);},error:message=>{if(mounted.current)setVoiceError(message);}});
 }
 return {speaking,voiceError,preparing,progress,prepare,speak,cancel};
}
