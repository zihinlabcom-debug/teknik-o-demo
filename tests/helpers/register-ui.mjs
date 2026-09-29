import {registerHooks} from 'node:module';
import {readFileSync,existsSync} from 'node:fs';
import ts from 'typescript';

registerHooks({
 resolve(specifier,context,next){
  if(['next/image','next/link'].includes(specifier))return {url:'test:'+specifier,shortCircuit:true};
  if(specifier==='next/navigation')return next(specifier+'.js',context);
  let target;
  if(specifier.startsWith('@/'))target=new URL('../../src/'+specifier.slice(2),import.meta.url);
  else if((specifier.startsWith('./')||specifier.startsWith('../'))&&context.parentURL?.endsWith('.tsx'))target=new URL(specifier,context.parentURL);
  if(target)for(const extension of ['','.tsx','.ts']){
   const url=new URL(target.href+extension);if(existsSync(url))return next(url.href,context);
  }
  return next(specifier,context);
 },
 load(url,context,next){
  if(url==='test:next/image'||url==='test:next/link')return {format:'module',shortCircuit:true,source:
   `import {createRequire} from 'node:module';const require=createRequire(${JSON.stringify(new URL('../../package.json',import.meta.url).href)});const mod=require(${JSON.stringify(url.slice(5)+'.js')});export default mod.default??mod;`};
  if(!url.endsWith('.tsx')||url.includes('/node_modules/'))return next(url,context);
  return {format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(new URL(url),'utf8'),{
   compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},
  }).outputText};
 },
});
