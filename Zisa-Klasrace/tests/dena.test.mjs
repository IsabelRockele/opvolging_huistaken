import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDenaPlayer} from './.generated/dena-player.mjs';
import {dictationText,missingDena,loadDena} from './.generated/dena-audio.mjs';

test('articles are spoken, verb sentences are silent, missing audio never invokes another voice',async()=>{
 const noun={article:'de',answer:'maan',spoken:'maan'};
 assert.equal(dictationText(noun),'de maan');
 assert.equal(dictationText({...noun,sentence:'Ik ___.'}),null);
 assert.deepEqual(missingDena([{spoken:'onbekend-testwoord-12345'}, {spoken:'onbekend-testwoord-12345'}, {sentence:'Ik ___.',spoken:'loop'}]),['onbekend-testwoord-12345']);
 await assert.rejects(loadDena('onbekend-testwoord-12345'),/geen Dena-audio/);
});

function fakeAudio(playImpl=()=>Promise.resolve()){
 return {play:playImpl,pause(){},load(){},removeAttribute(){},onplaying:null,onended:null,onerror:null};
}
test('iPad path calls play synchronously from the gesture and counts only one playing event',()=>{
 let called=false,plays=0,done=0;
 const audio=fakeAudio(()=>{called=true;return Promise.resolve();});
 const player=createDenaPlayer(()=>audio);
 player.play('blob:prepared',{started:()=>plays++,done:()=>done++,error:()=>assert.fail()});
 assert.equal(called,true);
 assert.equal(plays,0);
 audio.onplaying();audio.onplaying();
 assert.equal(plays,1);
 audio.onended();audio.onended();assert.equal(done,1);
 player.stop();
});
test('Safari blocked playback does not consume a listen and provides an explicit retry message',async()=>{
 let plays=0,message='';
 const player=createDenaPlayer(()=>fakeAudio(()=>Promise.reject({name:'NotAllowedError'})));
 player.play('blob:prepared',{started:()=>plays++,done(){},error:text=>message=text});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(plays,0);assert.match(message,/Tik opnieuw/);player.stop();
});
test('cancel or next word ignores stale callbacks from the previous audio',()=>{
 let plays=0,errors=0;const audio=fakeAudio(),player=createDenaPlayer(()=>audio);
 player.play('blob:prepared',{started:()=>plays++,done(){},error:()=>errors++});
 const oldPlaying=audio.onplaying,oldError=audio.onerror;
 player.stop();oldPlaying();oldError();assert.equal(plays,0);assert.equal(errors,0);
});
