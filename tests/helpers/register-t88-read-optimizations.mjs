import {registerHooks} from 'node:module';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

const fixtureUrl=new URL('./t88-read-db-double.mjs',import.meta.url).href;
registerHooks({
  resolve(specifier,context,next){
    if(specifier==='server-only')return {url:'t88-read:server-only',shortCircuit:true};
    if(/(?:^|\/)account-supabase(?:\.ts)?$/.test(specifier))return {url:'t88-read:account',shortCircuit:true};
    if(specifier==='@/lib/finance/iyzico-job-capture')return {url:'t88-read:finance',shortCircuit:true};
    let target;
    if(specifier.startsWith('@/')){
      const parent=fileURLToPath(context.parentURL).replaceAll('\\','/');
      const app=parent.match(/\/apps\/(customer|technician|admin)\/src\//)?.[1];
      target=new URL('../../'+(app?'apps/'+app+'/src/':'src/')+specifier.slice(2),import.meta.url);
    }else if((specifier.startsWith('./')||specifier.startsWith('../'))&&context.parentURL?.endsWith('.ts')){
      target=new URL(specifier,context.parentURL);
    }
    if(target)for(const ext of ['','.ts']){const url=new URL(target.href+ext);if(existsSync(url))return next(url.href,context);}
    return next(specifier,context);
  },
  load(url,context,next){
    if(url==='t88-read:server-only')return {format:'module',shortCircuit:true,source:'export {};'};
    if(url==='t88-read:finance')return {format:'module',shortCircuit:true,source:`
      export function captureCompletedIyzicoJob(){throw Error('Financial mutation forbidden in read tests');}
      export function prepareIyzicoJobCompletion(){throw Error('Financial mutation forbidden in read tests');}
    `};
    if(url==='t88-read:account')return {format:'module',shortCircuit:true,source:`
      import {readFixture} from ${JSON.stringify(fixtureUrl)};
      export async function currentAccount(){const f=readFixture();f.authReads++;return f.account;}
      export function adminSupabase(){const f=readFixture();f.adminClients++;return f.db;}
      export async function serverSupabase(){return {auth:{async getUser(){const f=readFixture();f.extraUserReads++;return {data:{user:{email:'synthetic@example.invalid'}}};}}};}
    `};
    if(url.endsWith('.ts')&&!url.includes('/node_modules/'))return {format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(new URL(url),'utf8'),{
      compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022},
    }).outputText};
    return next(url,context);
  },
});
