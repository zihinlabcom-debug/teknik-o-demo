import {readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
const lines=readFileSync('.local-email-auth/start.log','utf8').split(/\r?\n/);
const info=lines.map(line=>{try{return JSON.parse(line)}catch{return null}}).find(item=>item?.API_URL&&item?.ANON_KEY);
if(!info||new URL(info.API_URL).hostname!=='127.0.0.1'||new URL(info.API_URL).port!=='61321')throw new Error('Local runtime not verified');
const [mode,role]=process.argv.slice(2);
if(!['build','start','dev'].includes(mode)||!['customer','technician'].includes(role))throw new Error('Invalid command');
const port=role==='customer'?'3130':'3131';
const env={...process.env,NEXT_PUBLIC_SUPABASE_URL:info.API_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY:info.ANON_KEY,
 SUPABASE_SERVICE_ROLE_KEY:info.SERVICE_ROLE_KEY,EMAIL_AUTH_ORIGIN:'http://127.0.0.1:'+port,
 APP_ENV:'local',APP_SURFACE:role,NEXT_PUBLIC_APP_SURFACE:role,TEST_OTP_ENABLED:'false',
 STAGE12_FAKE_FINANCE_ENABLED:'false',NEXT_TELEMETRY_DISABLED:'1',CIRCLE_NODE_TOTAL:'2'};
const args=['node_modules/next/dist/bin/next',mode,'apps/'+role,...(mode==='build'?['--webpack']:['-p',port,'-H','127.0.0.1',...(mode==='dev'?['--webpack']:[])])];
const child=spawn(process.execPath,args,{env,stdio:'inherit',windowsHide:true});
child.on('exit',code=>{process.exitCode=code??1;});
