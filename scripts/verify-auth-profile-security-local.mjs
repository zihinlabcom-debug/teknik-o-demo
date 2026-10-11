import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(url&&anonKey&&serviceKey,'Disposable local Supabase environment is required');
const endpoint=new URL(url);
assert.ok(['127.0.0.1','localhost'].includes(endpoint.hostname),
  'Refusing to run security integration against a non-loopback Supabase URL');

const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const admin=createClient(url,serviceKey,options);
const anonymous=createClient(url,anonKey,options);
const client=()=>createClient(url,anonKey,options);

async function signup(phone,password,name,token){
  const db=client();
  const existing=await db.auth.signInWithPassword({phone,password});
  if(!existing.error&&existing.data.user)
    return {db,id:existing.data.user.id,phone,password};
  const started=await db.auth.signUp({phone,password,options:{channel:'sms',data:{full_name:name}}});
  assert.ifError(started.error);
  assert.ok(started.data.user);
  const verified=started.data.session?started:await db.auth.verifyOtp({phone,token,type:'sms'});
  assert.ifError(verified.error);
  assert.ok(verified.data.user&&verified.data.session);
  return {db,id:verified.data.user.id,phone,password};
}

const [{data:categories,error:categoryError},{data:cities,error:cityError}]=await Promise.all([
  admin.from('service_categories').select('id,requires_document').eq('is_active',true).order('name'),
  admin.from('cities').select('id').eq('is_active',true).order('plate_code').limit(1),
]);
assert.ifError(categoryError);assert.ifError(cityError);
assert.ok((categories?.length??0)>=2&&cities?.[0]);
const categoryA=categories[0].id;
const categoryB=categories[1].id;
const cityId=cities[0].id;
const {data:districts,error:districtError}=await admin.from('districts').select('id')
  .eq('city_id',cityId).eq('is_active',true).order('name').limit(2);
assert.ifError(districtError);assert.ok((districts?.length??0)>=2);
const districtA=districts[0].id;
const districtB=districts[1].id;

const customerA=await signup('+905551000001','CustomerA1!','Müşteri Bir','123456');
const customerB=await signup('+905551000002','CustomerB1!','Müşteri İki','654321');
const technicianA=await signup('+905551000003','TechnicianA1!','Usta Bir','234567');
const technicianB=await signup('+905551000004','TechnicianB1!','Usta İki','345678');
const appAdmin=await signup('+905551000005','AdministratorA1!','Yerel Admin','456789');

// F-04: emulate a network break after Auth confirmation. A later password
// sign-in resumes completion without deleting or recreating the Auth account.
await customerB.db.auth.signOut();
const resumed=await customerB.db.auth.signInWithPassword({phone:customerB.phone,password:customerB.password});
assert.ifError(resumed.error);assert.equal(resumed.data.user?.id,customerB.id);

for(const [account,name,district] of [
  [customerA,'Müşteri Bir',districtA],
  [customerB,'Müşteri İki',districtB],
]){
  const done=await admin.rpc('complete_customer_password_registration',{
    p_user_id:account.id,p_phone:account.phone,p_name:name,p_email:null,
    p_city_id:cityId,p_district_id:district,p_address_line:`${name} güvenli test adresi`,
  });
  assert.ifError(done.error);assert.ok(done.data===true||done.data===false);
  const retry=await admin.rpc('complete_customer_password_registration',{
    p_user_id:account.id,p_phone:account.phone,p_name:name,p_email:null,
    p_city_id:cityId,p_district_id:district,p_address_line:`${name} güvenli test adresi`,
  });
  assert.ifError(retry.error);assert.equal(retry.data,false);
}

for(const [account,name,category,district] of [
  [technicianA,'Usta Bir',categoryA,districtA],
  [technicianB,'Usta İki',categoryB,districtB],
]){
  const done=await admin.rpc('complete_technician_registration',{
    p_user_id:account.id,p_phone:account.phone,p_name:name,p_email:null,
    p_category_ids:[category],p_city_id:cityId,p_district_ids:[district],
    p_address_city_id:cityId,p_address_district_id:district,
    p_address_line:`${name} güvenli kayıt adresi`,
  });
  assert.ifError(done.error);assert.ok(done.data===true||done.data===false);
  const retry=await admin.rpc('complete_technician_registration',{
    p_user_id:account.id,p_phone:account.phone,p_name:name,p_email:null,
    p_category_ids:[category],p_city_id:cityId,p_district_ids:[district],
    p_address_city_id:cityId,p_address_district_id:district,
    p_address_line:`${name} güvenli kayıt adresi`,
  });
  assert.ifError(retry.error);assert.equal(retry.data,false);
}
assert.ifError((await admin.from('users').update({role:'admin'}).eq('id',appAdmin.id)).error);

// anonymous / authenticated / service_role isolation
const anonymousUsers=await anonymous.from('users').select('id');
assert.ok(anonymousUsers.error||anonymousUsers.data?.length===0,
  'Anonymous users unexpectedly received account rows');
const ownUser=await customerA.db.from('users').select('id,phone').eq('id',customerA.id).single();
assert.ifError(ownUser.error);assert.equal(ownUser.data.id,customerA.id);
const otherUser=await customerA.db.from('users').select('id').eq('id',customerB.id);
assert.ifError(otherUser.error);assert.deepEqual(otherUser.data,[]);
const adminUsers=await appAdmin.db.from('users').select('id');
assert.ifError(adminUsers.error);assert.ok(adminUsers.data.length>=5);
const serviceUsers=await admin.from('users').select('id');
assert.ifError(serviceUsers.error);assert.equal(serviceUsers.data.length,adminUsers.data.length);
for(const id of [customerA.id,customerB.id,technicianA.id,technicianB.id,appAdmin.id])
  assert.ok(serviceUsers.data.some(row=>row.id===id));

// F-01: direct PostgREST update cannot bypass password + Auth phone OTP.
const directPhone=await customerA.db.from('users').update({phone:'+905551000099'})
  .eq('id',customerA.id).select('phone');
assert.ok(directPhone.error,'Direct phone update unexpectedly succeeded');
const mirroredBefore=await admin.from('users').select('phone').eq('id',customerA.id).single();
assert.ifError(mirroredBefore.error);assert.equal(mirroredBefore.data.phone,customerA.phone);

// F-02: direct inserts, cross-account reads and writes are blocked.
const ownAddresses=await customerA.db.from('customer_addresses').select('id,profile_slot')
  .eq('customer_id',customerA.id);
assert.ifError(ownAddresses.error);assert.equal(ownAddresses.data.length,1);
const otherAddresses=await customerA.db.from('customer_addresses').select('id')
  .eq('customer_id',customerB.id);
assert.ifError(otherAddresses.error);assert.deepEqual(otherAddresses.data,[]);
const directAddress=await customerA.db.from('customer_addresses').insert({
  customer_id:customerA.id,label:'Baypas',city_id:cityId,district_id:districtA,
  address_line:'Yetkisiz dördüncü adres denemesi',profile_slot:3,
});
assert.ok(directAddress.error,'Direct address insert unexpectedly succeeded');
const crossAddress=await customerA.db.from('customer_addresses').update({label:'Saldırı'})
  .eq('customer_id',customerB.id);
assert.ok(crossAddress.error,'Cross-customer address update unexpectedly succeeded');

const profileUpdate=await admin.rpc('update_customer_profile',{
  p_actor_id:customerA.id,p_name:'Müşteri Bir',p_email:null,p_addresses:[
    {slot:1,label:'Ev',cityId,districtId:districtA,addressLine:'Müşteri bir güncel ev adresi'},
    {slot:2,label:'İş',cityId,districtId:districtB,addressLine:'Müşteri bir güncel iş adresi'},
    {slot:3,label:'Aile',cityId,districtId:districtA,addressLine:'Müşteri bir aile adresi'},
  ],
});
assert.ifError(profileUpdate.error);
const fourthAddress=await admin.rpc('update_customer_profile',{
  p_actor_id:customerA.id,p_name:'Müşteri Bir',p_email:null,p_addresses:[
    {slot:1,label:'1',cityId,districtId:districtA,addressLine:'Geçerli birinci adres satırı'},
    {slot:2,label:'2',cityId,districtId:districtA,addressLine:'Geçerli ikinci adres satırı'},
    {slot:3,label:'3',cityId,districtId:districtA,addressLine:'Geçerli üçüncü adres satırı'},
    {slot:4,label:'4',cityId,districtId:districtA,addressLine:'Geçersiz dördüncü adres satırı'},
  ],
});
assert.ok(fourthAddress.error,'Four-address RPC bypass unexpectedly succeeded');
const archiveUpdate=await admin.rpc('update_customer_profile',{
  p_actor_id:customerA.id,p_name:'Müşteri Bir',p_email:null,p_addresses:[
    {slot:1,label:'Ev',cityId,districtId:districtA,addressLine:'Müşteri bir son ev adresi'},
  ],
});
assert.ifError(archiveUpdate.error);
const addressState=await admin.from('customer_addresses').select('profile_slot,profile_archived_at')
  .eq('customer_id',customerA.id);
assert.ifError(addressState.error);
assert.equal(addressState.data.filter(row=>row.profile_slot!==null&&row.profile_archived_at===null).length,1);
assert.equal(addressState.data.filter(row=>row.profile_slot===null&&row.profile_archived_at!==null).length,2);

// Unapproved technicians cannot self-grant categories.
const directCategory=await technicianA.db.from('technician_service_categories').insert({
  technician_id:technicianA.id,category_id:categoryB,
});
assert.ok(directCategory.error,'Technician directly granted a category');
const queuedCategory=await admin.rpc('add_technician_profile_category',{
  p_actor_id:technicianA.id,p_category_id:categoryB,
});
assert.ifError(queuedCategory.error);
assert.ok(['pending','pending_document'].includes(queuedCategory.data));
const crossCategories=await technicianA.db.from('technician_service_categories')
  .select('category_id').eq('technician_id',technicianB.id);
assert.ifError(crossCategories.error);assert.deepEqual(crossCategories.data,[]);

// Verified phone synchronization is retry-safe and uses Auth as source.
const newPhone='+905551000012';
const change=await customerA.db.auth.updateUser({phone:newPhone,current_password:customerA.password});
assert.ifError(change.error);
const phoneOtp=await customerA.db.auth.verifyOtp({phone:newPhone,token:'223344',type:'phone_change'});
assert.ifError(phoneOtp.error);assert.equal(phoneOtp.data.user?.id,customerA.id);
const syncPhone=await admin.rpc('sync_verified_account_phone',{p_actor_id:customerA.id,p_phone:newPhone});
assert.ifError(syncPhone.error);assert.equal(syncPhone.data,true);
assert.ifError((await admin.rpc('sync_verified_account_phone',{p_actor_id:customerA.id,p_phone:newPhone})).error);
const mirroredAfter=await admin.from('users').select('phone').eq('id',customerA.id).single();
assert.ifError(mirroredAfter.error);assert.equal(mirroredAfter.data.phone,newPhone);

// Password change requires reauthentication nonce.
const reauth=await customerA.db.auth.reauthenticate();
assert.ifError(reauth.error);
const passwordChange=await customerA.db.auth.updateUser({password:'CustomerA2!',nonce:'223344'});
assert.ifError(passwordChange.error);
await customerA.db.auth.signOut();
const oldLogin=await customerA.db.auth.signInWithPassword({phone:newPhone,password:customerA.password});
assert.ok(oldLogin.error,'Old password unexpectedly remained valid');
const newLogin=await customerA.db.auth.signInWithPassword({phone:newPhone,password:'CustomerA2!'});
assert.ifError(newLogin.error);assert.equal(newLogin.data.user?.id,customerA.id);

// Storage: only owner/admin/service_role can read private avatar/document objects.
const png=Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0]);
const avatarPath=`customer/${customerA.id}/avatar`;
assert.ifError((await admin.storage.from('profile-avatars').upload(avatarPath,png,{
  contentType:'image/png',upsert:true,
})).error);
assert.ifError((await admin.from('customer_profiles').update({avatar_path:avatarPath})
  .eq('user_id',customerA.id)).error);
assert.ifError((await customerA.db.storage.from('profile-avatars').download(avatarPath)).error);
assert.ok((await customerB.db.storage.from('profile-avatars').download(avatarPath)).error);
assert.ok((await anonymous.storage.from('profile-avatars').download(avatarPath)).error);
assert.ifError((await appAdmin.db.storage.from('profile-avatars').download(avatarPath)).error);
assert.ifError((await admin.storage.from('profile-avatars').download(avatarPath)).error);

const documentPath=`technician/${technicianA.id}/${categoryA}/security-test.pdf`;
assert.ifError((await admin.storage.from('technician-documents').upload(
  documentPath,Uint8Array.from([37,80,68,70,45,49,46,52]),{contentType:'application/pdf',upsert:true}
)).error);
assert.ifError((await admin.from('technician_documents').insert({
  technician_id:technicianA.id,category_id:categoryA,document_type:'certificate',
  status:'pending',storage_path:documentPath,original_file_name:'security-test.pdf',
  mime_type:'application/pdf',
})).error);
assert.ifError((await technicianA.db.storage.from('technician-documents').download(documentPath)).error);
assert.ok((await technicianB.db.storage.from('technician-documents').download(documentPath)).error);
assert.ok((await customerB.db.storage.from('technician-documents').download(documentPath)).error);
assert.ifError((await appAdmin.db.storage.from('technician-documents').download(documentPath)).error);
assert.ifError((await admin.storage.from('technician-documents').download(documentPath)).error);

console.log('PASS: 2 customers, 2 technicians and 1 admin; anon/authenticated/service_role isolation');
console.log('PASS: phone, password, resumable registration, profile, avatar, document and category controls');
console.log('LOCAL FIXED OTP ONLY: real SMS delivery was not tested');
