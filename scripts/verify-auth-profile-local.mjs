import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(url&&anonKey&&serviceKey,'Local Supabase environment is required');

const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
const customer=createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
const technician=createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false}});

async function verifiedPhoneSignup(client,phone,password,fullName,token){
  const signup=await client.auth.signUp({phone,password,options:{channel:'sms',data:{full_name:fullName}}});
  assert.ifError(signup.error);
  assert.ok(signup.data.user);
  const verified=signup.data.session?signup:await client.auth.verifyOtp({phone,token,type:'sms'});
  assert.ifError(verified.error);
  assert.ok(verified.data.user);
  return verified.data.user.id;
}

const catalog=await Promise.all([
  admin.from('service_categories').select('id').eq('is_active',true).order('name').limit(2),
  admin.from('cities').select('id').eq('is_active',true).order('plate_code').limit(1),
]);
assert.ifError(catalog[0].error);assert.ifError(catalog[1].error);
assert.ok((catalog[0].data?.length??0)>=1&&catalog[1].data?.[0]);
const categoryId=catalog[0].data[0].id;
const cityId=catalog[1].data[0].id;
const districtResult=await admin.from('districts').select('id').eq('city_id',cityId).eq('is_active',true).order('name').limit(2);
assert.ifError(districtResult.error);assert.ok((districtResult.data?.length??0)>=1);
const firstDistrict=districtResult.data[0].id;
const secondDistrict=districtResult.data[1]?.id??firstDistrict;

const customerPhone='+905551000001';
const customerPassword='CustomerA1!';
const customerId=await verifiedPhoneSignup(customer,customerPhone,customerPassword,'Yerel Müşteri','123456');
const customerComplete=await admin.rpc('complete_customer_password_registration',{
  p_user_id:customerId,p_phone:customerPhone,p_name:'Yerel Müşteri',p_email:'customer@local.test',
  p_city_id:cityId,p_district_id:firstDistrict,p_address_line:'Yerel müşteri test adresi 1',
});
assert.ifError(customerComplete.error);assert.equal(customerComplete.data,true);
const customerUpdate=await admin.rpc('update_customer_profile',{
  p_actor_id:customerId,p_name:'Yerel Müşteri Güncel',p_email:'updated-customer@local.test',
  p_addresses:[
    {slot:1,label:'Ev',cityId,districtId:firstDistrict,addressLine:'Yerel müşteri güncel ev adresi'},
    {slot:2,label:'İş',cityId,districtId:secondDistrict,addressLine:'Yerel müşteri güncel iş adresi'},
  ],
});
assert.ifError(customerUpdate.error);
await customer.auth.signOut();
const customerLogin=await customer.auth.signInWithPassword({phone:customerPhone,password:customerPassword});
assert.ifError(customerLogin.error);assert.equal(customerLogin.data.user?.id,customerId);
const customerRows=await Promise.all([
  admin.from('users').select('name,email,role').eq('id',customerId).single(),
  admin.from('customer_addresses').select('profile_slot').eq('customer_id',customerId).order('profile_slot'),
]);
assert.ifError(customerRows[0].error);assert.ifError(customerRows[1].error);
assert.deepEqual(customerRows[0].data,{name:'Yerel Müşteri Güncel',email:'updated-customer@local.test',role:'customer'});
assert.deepEqual(customerRows[1].data?.map(item=>item.profile_slot),[1,2]);

const technicianPhone='+905551000002';
const technicianPassword='TechnicianA1!';
const technicianId=await verifiedPhoneSignup(technician,technicianPhone,technicianPassword,'Yerel Usta','654321');
const technicianComplete=await admin.rpc('complete_technician_registration',{
  p_user_id:technicianId,p_phone:technicianPhone,p_name:'Yerel Usta',p_email:'technician@local.test',
  p_category_ids:[categoryId],p_city_id:cityId,p_district_ids:[firstDistrict],
  p_address_city_id:cityId,p_address_district_id:firstDistrict,p_address_line:'Yerel usta kayıt adresi',
});
assert.ifError(technicianComplete.error);assert.equal(technicianComplete.data,true);
const technicianUpdate=await admin.rpc('update_technician_profile',{
  p_actor_id:technicianId,p_name:'Yerel Usta Güncel',p_email:'updated-technician@local.test',
  p_address_city_id:cityId,p_address_district_id:secondDistrict,p_address_line:'Yerel usta güncel adresi',
  p_service_city_id:cityId,p_service_district_ids:[firstDistrict,secondDistrict],
});
assert.ifError(technicianUpdate.error);
await technician.auth.signOut();
const technicianLogin=await technician.auth.signInWithPassword({phone:technicianPhone,password:technicianPassword});
assert.ifError(technicianLogin.error);assert.equal(technicianLogin.data.user?.id,technicianId);
const technicianRows=await Promise.all([
  admin.from('users').select('name,email,role').eq('id',technicianId).single(),
  admin.from('technician_service_categories').select('category_id,approval_status').eq('technician_id',technicianId),
  admin.from('technician_service_areas').select('district_id').eq('technician_id',technicianId).order('district_id'),
  admin.from('technician_profiles').select('address_line').eq('user_id',technicianId).single(),
]);
for(const result of technicianRows)assert.ifError(result.error);
assert.equal(technicianRows[0].data?.role,'technician');
assert.equal(technicianRows[0].data?.name,'Yerel Usta Güncel');
assert.equal(technicianRows[1].data?.length,1);
assert.equal(technicianRows[2].data?.length,new Set([firstDistrict,secondDistrict]).size);
assert.equal(technicianRows[3].data?.address_line,'Yerel usta güncel adresi');

const bucket=await admin.storage.getBucket('profile-avatars');
assert.ifError(bucket.error);assert.equal(bucket.data?.public,false);
console.log('PASS local customer and technician password auth/profile integration');
