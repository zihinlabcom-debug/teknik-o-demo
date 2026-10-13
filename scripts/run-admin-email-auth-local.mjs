// Local-only runner. Never reads or copies staging/production .env files.
import {readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';

function localRuntime(){
  const lines=readFileSync('.local-email-auth/start.log','utf8').split(/\r?\n/);
  const info=lines.map(line=>{try{return JSON.parse(line);}catch{return null;}})
    .find(value=>value?.API_URL&&value?.ANON_KEY&&value?.SERVICE_ROLE_KEY);
  if(!info||typeof info.API_URL!=='string')throw new Error('Missing local Auth runtime');
  const url=new URL(info.API_URL);
  if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||url.port!=='61321'||url.pathname!=='/'||
    !info.ANON_KEY||!info.SERVICE_ROLE_KEY)throw new Error('Remote or unverified Auth runtime refused');
  return info;
}
const mode=process.argv[2];
if(mode!=='dev'&&mode!=='build')throw new Error('Expected dev or build');
const info=localRuntime();
const env={...process.env,
  NEXT_PUBLIC_SUPABASE_URL:info.API_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY:info.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY:info.SERVICE_ROLE_KEY,
  ADMIN_AUTH_ORIGIN:'http://127.0.0.1:3132',
  ADMIN_SESSION_SECRET:randomBytes(48).toString('base64url'),
  APP_ENV:'local',TEST_OTP_ENABLED:'false',NEXT_TELEMETRY_DISABLED:'1',
};
// Do not let a prior environment variable override the verified localhost values.
const args=['node_modules/next/dist/bin/next',mode,'apps/admin',
  ...(mode==='dev'?['-p','3132','-H','127.0.0.1']:['--webpack'])];
const child=spawn(process.execPath,args,{stdio:'inherit',env,windowsHide:true});
child.on('exit',code=>{process.exitCode=code??1;});
