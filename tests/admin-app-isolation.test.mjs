import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join,relative,resolve} from 'node:path';
import {adminRouteAccess} from '../apps/admin/src/lib/admin-route-access.ts';

const app=resolve('apps/admin/src/app');
const files=(directory)=>readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
  const path=join(directory,entry.name);
  return entry.isDirectory()?files(path):[relative(app,path).replaceAll('\\','/')];
});

test('admin application owns only admin routes and no customer or technician OTP routes',()=>{
  const routes=files(app).filter(file=>file.endsWith('/page.tsx')||file.endsWith('/route.ts')||file==='page.tsx');
  assert.ok(routes.includes('giris-admin/page.tsx'));
  assert.ok(routes.includes('admin/page.tsx'));
  assert.ok(routes.includes('api/auth/admin/password/route.ts'));
  assert.ok(routes.includes('api/auth/logout/route.ts'));
  assert.ok(routes.includes('api/admin/documents/[id]/route.ts'));
  assert.ok(routes.every(file=>file==='page.tsx'||file.startsWith('admin/')||
    file.startsWith('giris-admin/')||file.startsWith('api/admin/')||
    file==='api/auth/admin/password/route.ts'||file==='api/auth/logout/route.ts'));
  assert.ok(!routes.some(file=>/(^|\/)(giris|giris-usta|musteri|usta)(\/|$)/.test(file)));
  assert.ok(!routes.some(file=>/otp|diagnos|operations\/requests|upload/i.test(file)));
  assert.match(readFileSync(join(app,'admin/layout.tsx'),'utf8'),/await connection\(\);[\s\S]*currentAccount\(\)/);
});

test('admin route decision requires active admin role and valid password session',()=>{
  for(const [role,active,marker,status] of [
    [null,false,false,401],['customer',true,true,403],['technician',true,true,403],
    ['admin',false,true,403],['admin',true,false,403],
  ])assert.deepEqual(adminRouteAccess(role,active,marker),{allowed:false,status});
  assert.deepEqual(adminRouteAccess('admin',true,true),{allowed:true,status:200});
  const proxy=readFileSync(resolve('apps/admin/src/proxy.ts'),'utf8');
  assert.match(proxy,/path\.startsWith\('\/api\/admin\/'\)/);
  assert.match(proxy,/path==='\/admin'/);
  assert.match(proxy,/validAdminSession/);
});

test('admin app is independent of APP_SURFACE and reuses server-only auth and operations',()=>{
  const packageJson=JSON.parse(readFileSync(resolve('apps/admin/package.json'),'utf8'));
  assert.equal(packageJson.name,'teknik-o-admin');
  assert.ok(!('openai' in packageJson.dependencies));
  assert.ok(!('pdf-parse' in packageJson.dependencies));
  const sources=[...files(resolve('apps/admin/src'))].map(file=>readFileSync(resolve('apps/admin/src/app',file),'utf8'));
  assert.ok(!sources.some(source=>source.includes('APP_SURFACE')));
  for(const sharedModule of ['account-supabase','admin-password-auth','admin-session','operation-server',
    'technician-management','technician-documents']){
    const source=readFileSync(resolve(`apps/admin/src/lib/${sharedModule}.ts`),'utf8');
    assert.match(source,/import 'server-only'/);
    assert.match(source,/\.\.\/\.\.\/\.\.\/\.\.\/src\/lib\//);
  }
});
