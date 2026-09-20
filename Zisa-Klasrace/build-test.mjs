import {build} from 'esbuild';
await build({entryPoints:['lib/firebase-game.ts'],bundle:true,platform:'node',format:'esm',target:'node22',outfile:'tests/.generated/firebase-game.mjs'});
