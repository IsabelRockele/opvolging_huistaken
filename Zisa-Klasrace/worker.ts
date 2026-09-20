import * as race from './app/api/race/route';
import * as practice from './app/api/practice/route';
export default {
 async fetch(request:Request,env:{ASSETS:Fetcher}){
  const path=new URL(request.url).pathname;
  const api=path==='/api/race'?race:path==='/api/practice'?practice:null;
  if(api){if(request.method==='GET')return api.GET(request);if(request.method==='POST')return api.POST(request);return new Response('Method not allowed',{status:405});}
  if(path.startsWith('/api/'))return new Response('Not found',{status:404});
  return env.ASSETS.fetch(request);
 }
};
