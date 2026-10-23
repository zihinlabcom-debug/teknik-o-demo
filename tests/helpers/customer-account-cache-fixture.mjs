import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHash,createHmac} from 'node:crypto';
import {createServer} from 'node:net';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const accountSource='apps/customer/src/lib/account-supabase.ts';
const fixtureAdminSecret='local-fixture-only-admin-session-key'.repeat(2);
const panels={customer:{source:accountSource,lib:'apps/customer/src/lib'},technician:{source:'apps/technician/src/lib/account-supabase.ts',lib:'apps/technician/src/lib'},admin:{source:'src/lib/account-supabase.ts',lib:'src/lib'}};
const actorId=actor=>actor==='B'?'20000000-0000-4000-8000-000000000002':'10000000-0000-4000-8000-000000000001';
function fixtureToken(session){return 'x.'+Buffer.from(JSON.stringify({session_id:session==='B'?'40000000-0000-4000-8000-000000000004':'30000000-0000-4000-8000-000000000003'})).toString('base64url')+'.x';}
export function fixtureHeaders({role,tag,scenario='ok',actor='A',mode='current',session='A'}){
  const headers={cookie:`fixture-run=${tag}; fixture-mode=${mode}; fixture-case=${scenario}; fixture-user=${actor}; fixture-session=${session}`};
  if(role==='admin'){
    const uid=actorId(scenario==='wrong-uid-marker'?(actor==='A'?'B':'A'):actor);
    const markerSession=scenario==='wrong-session-marker'?(session==='A'?'B':'A'):session;
    const sessionId=JSON.parse(Buffer.from(fixtureToken(markerSession).split('.')[1],'base64url')).session_id;
    const expiresAt=Date.now()+(scenario==='expired-marker'?-1:scenario==='future-marker'?10:8)*60*60*1000;
    const payload=Buffer.from(JSON.stringify({userId:uid,sessionId,expiresAt})).toString('base64url');
    let marker=payload+'.'+createHmac('sha256',fixtureAdminSecret).update('hizmetpey-admin-email.v1.'+payload).digest('base64url');
    if(scenario==='tampered-marker')marker=marker.slice(0,-1)+(marker.at(-1)==='a'?'b':'a');
    if(scenario==='inbound-marker-only')headers['x-hizmetpey-admin-session']=marker;
    else if(scenario!=='missing-marker')headers.cookie+='; hizmetpey-admin-email-session='+marker;
  }
  return headers;
}

// The fixture bundles the actual old/new account modules. Only external I/O is
// replaced; React cache, Next cookies, RSC rendering and requireRole are real.
const mockSource=String.raw`
const records=globalThis.__customerAccountFixture??=new Map();
const revoked=globalThis.__customerAccountRevoked??=new Set();
export function counts(tag){return {...(records.get(tag)||{})};}
export function revoke(tag){revoked.add(tag);}
export function createClient(){throw Error('Privileged database I/O forbidden in fixture');}
export function createServerClient(url,key,options){
  if(url!=='http://127.0.0.1:9'||key!=='fixture-public-placeholder')throw Error('Unexpected fixture configuration');
  const all=options.cookies.getAll(),get=name=>all.find(x=>x.name===name)?.value;
  const tag=get('fixture-run')||'missing',scenario=get('fixture-case')||'ok',actor=get('fixture-user')||'A';
  const id=actor==='B'?'20000000-0000-4000-8000-000000000002':'10000000-0000-4000-8000-000000000001';
  const panel=process.env.FIXTURE_PANEL_ROLE||'customer';
  const role=scenario==='wrong-role'?(panel==='customer'?'technician':'customer'):scenario==='invalid-role'?'invented':scenario==='admin'?'admin':panel;
  const marker=get('hizmetpey-admin-email-session'),forwarded=options.global?.headers?.['x-hizmetpey-admin-session'];
  const log=records.get(tag)||{getUser:0,users:0,ready:0,getSession:0,isAppAdmin:0,filters:[],markerForwarded:Boolean(marker&&forwarded===marker),markerHeaderConsistent:forwarded===marker,cookieHttpOnly:options.cookieOptions?.httpOnly===true};records.set(tag,log);
  const tick=async key=>{log[key]++;await new Promise(r=>setTimeout(r,8));};
  return {
    auth:{
      async getUser(){await tick('getUser');if(scenario==='throw-auth')throw Error('fixture auth unavailable');
        const user=scenario==='anonymous'||revoked.has(tag)?null:{id,email:scenario==='missing-email'?null:'fixture@example.invalid',email_confirmed_at:scenario==='unconfirmed'?null:'2026-01-01T00:00:00Z'};
        return {data:{user},error:scenario==='auth-error'?{message:'fixture'}:null};},
      async getSession(){await tick('getSession');if(scenario==='session-error')throw Error('fixture session unavailable');
        const token='x.'+Buffer.from(JSON.stringify({session_id:get('fixture-session')==='B'?'40000000-0000-4000-8000-000000000004':'30000000-0000-4000-8000-000000000003'})).toString('base64url')+'.x';
        return {data:{session:panel!=='admin'||scenario==='missing-session'?null:{access_token:token}}};}
    },
    from(table){if(table!=='users')throw Error('Unexpected fixture table');let owner;
      return {select(columns){if(columns!=='id,role,is_test,is_active')throw Error('Unexpected columns');return this;},
        eq(column,value){if(column!=='id'||value!==id)throw Error('Unscoped account query');owner=value;log.filters.push({column,value});return this;},
        async maybeSingle(){if(owner!==id)throw Error('Missing owner predicate');await tick('users');
          return {data:scenario==='missing-row'?null:{id,role,is_active:scenario!=='inactive',is_test:scenario==='invalid-test-flag'?'true':true},error:scenario==='db-error'?{message:'fixture'}:null};}}
    },
    async rpc(name){if(name==='is_app_admin'){await tick('isAppAdmin');if(scenario==='admin-rpc-throw')throw Error('fixture admin unavailable');return {data:scenario==='not-app-admin'||!marker||forwarded!==marker?false:scenario==='nonboolean-admin'?'true':true,error:scenario==='admin-rpc-error'?{message:'fixture'}:null};}
      if(name!=='email_account_ready')throw Error('Unexpected fixture RPC');await tick('ready');
      if(scenario==='throw-ready')throw Error('fixture ready unavailable');
      return {data:scenario==='not-ready'?false:scenario==='nonboolean-ready'?'true':true,error:scenario==='ready-error'?{message:'fixture'}:null};}
  };
}
`;

export function createFixture(output,role='customer'){
  const panel=panels[role];if(!panel)throw Error('Unknown fixture panel');
  const dir=path.join(output,'ssr-fixture');
  const put=(file,text)=>{const dest=path.join(dir,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,text);};
  const current=fs.readFileSync(path.join(root,panel.source),'utf8');
  const assets=path.join(root,'tests/fixtures/auth-cache'),entry=JSON.parse(fs.readFileSync(path.join(assets,'manifest.json'),'utf8')).panels[role];
  // Git checkouts may use LF or CRLF; hash the same canonical source on both.
  const baseline=fs.readFileSync(path.join(assets,entry.file),'utf8').replace(/\r\n/g,'\n');
  if(entry.source!==panel.source||createHash('sha256').update(baseline).digest('hex')!==entry.sha256)throw Error('Baseline fixture integrity mismatch');
  put(`lib/current/${panel.source}`,current);put(`lib/baseline/${panel.source}`,baseline);
  for(const variant of ['current','baseline'])for(const file of ['account-role.ts','admin-session.ts','account-cookie-options.ts','operation-guard.ts','operation-error.ts'])
    if(fs.existsSync(path.join(root,panel.lib,file)))put(`lib/${variant}/${panel.lib}/${file}`,fs.readFileSync(path.join(root,panel.lib,file),'utf8'));
  if(role==='admin')for(const variant of ['current','baseline'])put(`lib/${variant}/apps/admin/src/lib/account-supabase.ts`,fs.readFileSync(path.join(root,'apps/admin/src/lib/account-supabase.ts'),'utf8'));
  const surface=(role==='admin'?'apps/admin/src/lib/account-supabase.ts':panel.source).replace(/\.ts$/,'');
  put('lib/supabase-fixture.js',mockSource);
  put('lib/select.ts',`import {cookies} from 'next/headers';
import * as current from './current/${surface}';import * as baseline from './baseline/${surface}';
import * as currentGuard from './current/${panel.lib}/operation-guard';import * as baselineGuard from './baseline/${panel.lib}/operation-guard';
export async function select(){const jar=await cookies();const old=jar.get('fixture-mode')?.value==='baseline';return {account:old?baseline:current,guard:old?baselineGuard:currentGuard,tag:jar.get('fixture-run')?.value||'missing'};}`);
  put('app/layout.tsx',`import {select} from '../lib/select';
export const dynamic='force-dynamic';
export default async function Layout({children}:{children:React.ReactNode}){const {account}=await select();const actor=await account.currentAccount();return <html><body><div id="layout-account">{actor?.id||'denied'}</div>{children}</body></html>;}`);
  put('app/page.tsx',`import {select} from '../lib/select';import {counts} from '../lib/supabase-fixture';
export default async function Page(){const {account,guard,tag}=await select();
const parallel=await Promise.all([account.currentAccount(),account.currentAccount()]);const sequential=await account.currentAccount();
let code=200;try{await guard.requireRole('${role}');}catch(e){code=(e as {status:number}).status;}
return <pre id="result">{JSON.stringify({accounts:[...parallel,sequential],guardStatus:code,counts:counts(tag)})}</pre>;}`);
  put('app/api/check/route.ts',`import {select} from '../../../lib/select';import {counts,revoke} from '../../../lib/supabase-fixture';
export async function GET(){const {account,tag}=await select();const first=await account.currentAccount();revoke(tag);const second=await account.currentAccount();return Response.json({first,second,counts:counts(tag)});}`);
  put('package.json',JSON.stringify({name:role+'-account-cache-local-fixture',private:true}));
  put('tsconfig.json',JSON.stringify({compilerOptions:{target:'ES2020',lib:['dom','esnext'],allowJs:true,skipLibCheck:true,strict:false,noEmit:true,esModuleInterop:true,module:'esnext',moduleResolution:'bundler',jsx:'react-jsx',plugins:[{name:'next'}]},include:['**/*.ts','**/*.tsx','.next/types/**/*.ts'],exclude:['node_modules']}));
  put('next.config.mjs',`import path from 'node:path';
export default {webpack(config){config.resolve.alias['@supabase/ssr$']=path.resolve('lib/supabase-fixture.js');config.resolve.alias['@supabase/supabase-js$']=path.resolve('lib/supabase-fixture.js');return config;}};`);
  return {dir,current,baseline};
}

export async function startFixture(output,role='customer'){
  const fixture=createFixture(output,role);
  const port=await new Promise((resolve,reject)=>{const s=createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port));});});
  const log=fs.openSync(path.join(output,'ssr-server.log'),'w');
  // Inherit OS essentials only, never the developer's live Supabase/Auth keys.
  const env={};for(const name of ['PATH','Path','SystemRoot','SYSTEMROOT','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC'])if(process.env[name])env[name]=process.env[name];
  Object.assign(env,{NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:9',NEXT_PUBLIC_SUPABASE_ANON_KEY:'fixture-public-placeholder',FIXTURE_PANEL_ROLE:role});
  if(role==='admin')env.ADMIN_SESSION_SECRET=fixtureAdminSecret;
  const child=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'dev','--webpack','--hostname','127.0.0.1','--port',String(port)],{cwd:fixture.dir,env,stdio:['ignore',log,log],windowsHide:true});
  let exit=null;child.once('exit',code=>exit=code??-1);
  const origin=`http://127.0.0.1:${port}`;
  async function stop(){if(child.exitCode===null){child.kill('SIGTERM');await Promise.race([new Promise(r=>child.once('exit',r)),new Promise(r=>setTimeout(r,5000))]);}fs.closeSync(log);}
  try{const deadline=Date.now()+90000;while(Date.now()<deadline){if(exit!==null)throw Error(`Fixture exited ${exit}; inspect ssr-server.log`);
      try{const response=await fetch(origin+'/api/check',{headers:fixtureHeaders({role,tag:'warmup'}),signal:AbortSignal.timeout(2000)});if(response.ok)return {...fixture,origin,stop};}catch{}
      await new Promise(r=>setTimeout(r,250));}
    throw Error('Fixture startup timeout; inspect ssr-server.log');
  }catch(e){await stop();throw e;}
}
