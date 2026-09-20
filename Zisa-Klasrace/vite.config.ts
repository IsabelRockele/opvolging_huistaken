import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
export default defineConfig({base:'/opvolging_huistaken/klasrace/',plugins:[react()],resolve:{alias:{'@':fileURLToPath(new URL('.',import.meta.url))}},build:{outDir:'../klasrace',emptyOutDir:true},server:{proxy:{'/api':'http://localhost:8787'}}});
