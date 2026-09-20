import {build} from 'esbuild';
await build({entryPoints:['lib/firebase-game.ts'],bundle:true,platform:'node',format:'esm',target:'node22',outfile:'tests/.generated/firebase-game.mjs'});

await build({entryPoints:['lib/class-roster.ts'],bundle:true,platform:'node',format:'esm',target:'node22',outfile:'tests/.generated/class-roster.mjs'});
