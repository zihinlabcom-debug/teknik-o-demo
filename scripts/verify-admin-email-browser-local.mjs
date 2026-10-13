import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {admin,password,mail} from './email-auth-local-utils.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/ibetu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const results=[];
const recoveryOnly=process.argv.includes('--recovery-only');
async function test(name,fn){if(recoveryOnly&&!/recovery|invalid reset/.test(name))return;try{await fn();results.push({name,status:'PASS'});console.log('PASS',name);}catch(e){results.push({name,status:'FAIL',reason:e.message.split('\n')[0]});console.log('FAIL',name,e.message.split('\n')[0]);}}
const base='http://127.0.0.1:3132',email='admin-ui-'+randomUUID()+'@example.test';let secret=password();
const created=await admin.auth.admin.createUser({email,password:secret,email_confirm:true});assert.ifError(created.error);
const id=created.data.user.id;const row=await admin.from('users').select('id').eq('id',id).maybeSingle();assert.ifError(row.error);
const fields={role:'admin',is_active:true,is_test:true,email,name:'Yerel Admin Tarayıcı Testi'};
assert.ifError((row.data?await admin.from('users').update(fields).eq('id',id):await admin.from('users').insert({id,...fields})).error);
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/ibetu/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe'});
const context=await browser.newContext();await context.route('**/*',route=>['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
const page=await context.newPage();page.setDefaultTimeout(20000);
async function login(){await page.goto(base+'/giris-admin');await page.getByLabel('E-posta adresi',{exact:true}).fill(email);await page.getByLabel('Şifre',{exact:true}).fill(secret);await page.getByRole('button',{name:'Giriş Yap',exact:true}).click();await page.waitForURL(base+'/admin');}
await test('Admin UI + API + DB: password login and protected customer/technician lists',async()=>{
 await login();await page.goto(base+'/admin/musteriler');await page.getByRole('heading',{name:'Müşteriler',exact:true}).waitFor();
 await page.goto(base+'/admin/ustalar');assert.equal(new URL(page.url()).pathname,'/admin/ustalar');
 const cookies=await context.cookies();assert.ok(cookies.find(c=>c.name==='hizmetpey-admin-email-session')?.httpOnly);
});
await test('Admin UI: logout returns to correct login and protected page is denied',async()=>{
 await page.locator('form[action="/api/auth/logout"] button').click();await page.waitForURL(base+'/giris-admin');
 await page.goto(base+'/admin/musteriler');await page.waitForURL(base+'/giris-admin');
});
await test('Admin UI + API + DB: captured recovery, reset and new password login',async()=>{
 await page.goto(base+'/sifremi-unuttum-admin');await page.getByLabel('E-posta adresi',{exact:true}).fill(email);
 await page.getByRole('button',{name:'Sıfırlama iletisi gönder',exact:true}).click();await page.getByRole('status').filter({hasText:'Hesabınız uygunsa'}).waitFor();
 const message=await mail(email,'parola');const href=message.html.replaceAll('&amp;','&').match(/href="([^"]+)"/)[1];
 const callback=page.waitForResponse(r=>r.url().endsWith('/api/auth/admin/recovery/callback')&&r.request().method()==='POST');
 await page.goto(href);assert.equal((await callback).status(),200);assert.equal(new URL(page.url()).hash,'');
 secret=password();await page.getByLabel('Yeni şifre',{exact:true}).fill(secret);await page.getByLabel('Şifre tekrar',{exact:true}).fill(secret);
 await page.getByRole('button',{name:'Şifreyi güncelle',exact:true}).click();await page.waitForURL(base+'/giris-admin');await login();
});
if(recoveryOnly)await test('Admin UI: invalid reset link keeps submission disabled and makes no callback request',async()=>{
 const calls=[];const listener=r=>{if(r.url().includes('/api/auth/admin/recovery/callback'))calls.push(r.url());};
 page.on('request',listener);await page.goto(base+'/sifre-yenile-admin');
 await page.getByRole('status').filter({hasText:'Bağlantı geçersiz.'}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Şifreyi güncelle',exact:true}).isDisabled(),true);
 assert.equal(calls.length,0);page.off('request',listener);
});
await browser.close();writeFileSync('.local-email-auth/admin-hardening-20261013/'+(recoveryOnly?'admin-recovery-ui-retry.json':'admin-browser-final.json'),JSON.stringify(results,null,2));
console.log('TOTAL',results.length,'PASS',results.filter(x=>x.status==='PASS').length,'FAIL',results.filter(x=>x.status==='FAIL').length);
if(results.some(x=>x.status!=='PASS'))process.exitCode=1;
