import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {writeFileSync,mkdirSync} from 'node:fs';
import {admin,api,mail,otp,password} from './email-auth-local-utils.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/ibetu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/ibetu/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe'});
const results=[];mkdirSync('.local-email-auth/screenshots',{recursive:true});
const cities=(await admin.from('cities').select('id').eq('plate_code',34)).data;
const district=(await admin.from('districts').select('id').eq('city_id',cities[0].id)).data[0];
async function test(name,fn){try{await fn();results.push({name,status:'PASS'});console.log('PASS',name)}catch(e){results.push({name,status:'FAIL',reason:e.message.split('\n')[0]});console.log('FAIL',name,e.message.split('\n')[0]);}}
for(const role of ['customer','technician']){
 const context=await browser.newContext({viewport:{width:1280,height:900}});
 // Enforce local-only browser traffic, including Supabase.
 await context.route('**/*',route=>['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
 const page=await context.newPage();page.setDefaultTimeout(20000);
 const base=api(role),loginPath=role==='customer'?'/giris':'/giris-usta';
 const email='browser-'+randomUUID().slice(0,8)+'@example.test';let secret=password();
 await test(role+' UI: email/password, show-hide, inactive SMS makes no API call',async()=>{
  await page.goto(base+loginPath);
  await page.getByLabel('E-posta adresi',{exact:true}).fill(email);
  await page.getByLabel('Şifre',{exact:true}).fill(secret);
  await page.getByRole('button',{name:'Şifreyi göster',exact:true}).click();
  assert.equal(await page.getByLabel('Şifre',{exact:true}).getAttribute('type'),'text');
  await page.getByRole('button',{name:'Şifreyi gizle',exact:true}).click();
  const requests=[];const listener=request=>{if(request.url().includes('/api/')||request.url().includes('/auth/v1/'))requests.push(request.method());};
  page.on('request',listener);
  await page.getByRole('button',{name:'SMS ile giriş',exact:true}).click();
  await page.getByRole('status').filter({hasText:'SMS ile giriş şu anda aktif değil.'}).waitFor();
  await page.waitForTimeout(300);page.off('request',listener);assert.equal(requests.length,0);
  await page.screenshot({path:'.local-email-auth/screenshots/'+role+'-login-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
  await page.screenshot({path:'.local-email-auth/screenshots/'+role+'-login-mobile.png',fullPage:true});
  await page.setViewportSize({width:1280,height:900});
 });
 let registered=false;
 await test(role+' UI + API + DB: registration and real captured email OTP',async()=>{
  await page.goto(base+(role==='customer'?'/kayit':'/kayit-usta'));
  const phone='5'+String(Date.now()).slice(-9);
  if(role==='customer'){
   for(const [name,value] of Object.entries({fullName:'Yerel Tarayıcı Testi',phone,email,password:secret,passwordConfirmation:secret,address:'Yerel test adresi, bina numarası 12'}))
    await page.locator('[name="'+name+'"]').fill(value);
   await page.locator('select[name="city"]').selectOption(String(cities[0].id));
   await page.locator('select[name="district"]').selectOption(String(district.id));
  }else{
   await page.getByLabel('Ad Soyad',{exact:true}).fill('Yerel Tarayıcı Testi');
   await page.getByLabel('Telefon',{exact:true}).fill(phone);
   await page.getByLabel('E-posta',{exact:true}).fill(email);
   await page.locator('input[type="password"]').first().fill(secret);
   await page.getByLabel('Şifre tekrar',{exact:true}).fill(secret);
   await page.getByLabel('Boya',{exact:true}).check();
   await page.getByLabel('Adres ili').selectOption(String(cities[0].id));
   await page.getByLabel('Adres ilçesi').selectOption(String(district.id));
   await page.getByLabel('Açık adres',{exact:true}).fill('Yerel test adresi, bina numarası 12');
   await page.getByLabel('Hizmet verdiğiniz şehir').selectOption(String(cities[0].id));
   await page.getByRole('button',{name:'İlçeleri seçin',exact:true}).click();
   await page.getByLabel('Yerel İlçe',{exact:true}).check();
   await page.getByRole('button',{name:'Seçimi tamamla',exact:true}).click();
  }
  const started=page.waitForResponse(r=>r.url().endsWith('/api/auth/email/signup'));
  await page.getByRole('button',{name:'Hesap Oluştur',exact:true}).click();
  assert.equal((await started).status(),200);
  const code=otp(await mail(email));
  if(role==='customer'){
   for(let i=0;i<6;i++)await page.locator('#otp-'+i).fill(code[i]);
   await page.getByRole('button',{name:'Kayıt Oluştur ve Giriş Yap',exact:true}).click();
   await page.waitForURL(base+'/hizmetler');
  }else{
   await page.getByLabel('E-posta Doğrulama Kodu',{exact:true}).fill(code);
   await page.getByRole('button',{name:'Kayıt Oluştur',exact:true}).click();
   await page.getByText('Başvurunuz alındı. Admin onayı bekleniyor.',{exact:true}).waitFor();
   await page.getByRole('link',{name:'Usta paneline git',exact:true}).click();
   await page.waitForURL(base+'/usta');
  }
  const row=await admin.from('users').select('id,role').eq('email',email).single();assert.ifError(row.error);assert.equal(row.data.role,role);
  const profile=await admin.from(role==='customer'?'customer_profiles':'technician_profiles').select('user_id').eq('user_id',row.data.id).single();
  assert.ifError(profile.error);assert.equal(profile.data.user_id,row.data.id);registered=true;
 });
 if(registered){
  await test(role+' UI: normal email/password login without OTP',async()=>{
   await context.clearCookies();await page.goto(base+loginPath);
   await page.getByLabel('E-posta adresi',{exact:true}).fill(email);await page.getByLabel('Şifre',{exact:true}).fill(secret);
   await page.getByRole('button',{name:'Giriş Yap',exact:true}).click();
   await page.waitForURL(base+(role==='customer'?'/hizmetler':'/usta'));
  });
  await test(role+' UI + API + DB: recovery link fragment, password reset and return to login',async()=>{
   await context.clearCookies();await page.goto(base+'/sifremi-unuttum');
   await page.getByLabel('E-posta adresi',{exact:true}).fill(email);
   await page.getByRole('button',{name:'Sıfırlama iletisi gönder',exact:true}).click();
   await page.getByRole('status').filter({hasText:'Hesabınız uygunsa'}).waitFor();
   const message=await mail(email,'parola');const href=message.html.replaceAll('&amp;','&').match(/href="([^"]+)"/)?.[1];assert.ok(href);
   const callback=page.waitForResponse(r=>r.url().endsWith('/api/auth/email/callback')&&r.request().method()==='POST');
   await page.goto(href);assert.equal((await callback).status(),200);
   assert.equal(new URL(page.url()).hash,'');
   secret=password();await page.getByLabel('Yeni şifre',{exact:true}).fill(secret);
   await page.getByLabel('Şifre tekrar',{exact:true}).fill(secret);
   await page.getByRole('button',{name:'Şifreyi güncelle',exact:true}).click();
   await page.waitForURL(base+loginPath);
   await page.getByLabel('E-posta adresi',{exact:true}).fill(email);await page.getByLabel('Şifre',{exact:true}).fill(secret);
   await page.getByRole('button',{name:'Giriş Yap',exact:true}).click();
   await page.waitForURL(base+(role==='customer'?'/hizmetler':'/usta'));
  });
 }else results.push({name:role+' UI login/recovery',status:'BLOCKED',reason:'Registration prerequisite failed'});
 await context.close();
}
await browser.close();
writeFileSync('.local-email-auth/browser-results.json',JSON.stringify(results,null,2));
console.log('TOTAL',results.length,'PASS',results.filter(r=>r.status==='PASS').length,'FAIL',results.filter(r=>r.status==='FAIL').length);
if(results.some(r=>r.status!=='PASS'))process.exitCode=1;
