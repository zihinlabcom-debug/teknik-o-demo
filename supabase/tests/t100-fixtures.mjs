import {randomUUID} from 'node:crypto';
import {sql} from './t100-local-db.mjs';
export function fixture(amount=5000,category='painting',provider='fake',serviceType=null){
 const snapshotCategory=category==='upholstery_carpet'?(serviceType==='carpet_cleaning'?'carpet_cleaning':'sofa_cleaning'):category;
 const snapshot=JSON.stringify({schemaVersion:'1',category:snapshotCategory,...(serviceType?{serviceType}: {})});
 const [c,t,a,admin]=Array.from({length:4},()=>randomUUID());
 sql(`insert into auth.users(id) values ('${c}'),('${t}'),('${admin}');
 insert into public.users(id,name,role,is_active,is_test) values ('${c}','T100 customer','customer',true,true),('${t}','T100 technician','technician',true,true),('${admin}','T100 admin','admin',true,true);
 insert into public.customer_profiles(user_id) values ('${c}');
 insert into public.technician_profiles(user_id,approval_status,is_available) values ('${t}','approved',true) on conflict(user_id) do update set approval_status='approved',is_available=true;
 insert into public.customer_addresses(id,customer_id,label,address_line,city_id,district_id,is_default,profile_slot) select '${a}','${c}','Adres 1','T100 isolated',c.id,d.id,true,1 from public.cities c join public.districts d on d.city_id=c.id order by c.id,d.id limit 1;
 insert into public.technician_service_categories(technician_id,category_id,approval_status) select '${t}',id,'approved' from public.service_categories where code='${category}';
 update public.technician_service_categories set approval_status='approved' where technician_id='${t}';
 insert into public.technician_service_areas(technician_id,city_id) select '${t}',id from public.cities order by id limit 1;
 update public.finance_runtime_config set gate_mode='test_only',provider='${provider}',environment='sandbox',iyzico_sandbox_enabled=${provider==='iyzico'} where id=1;`);
 const created=JSON.parse(sql(`select public.${provider==='iyzico'?'create_iyzico_payment_pending_service_request_v3':'create_payment_pending_service_request_v2'}('${c}','${category}','${a}','T100 test','T100 local test','t100:local','${randomUUID()}','${snapshot}','immediate',null,'TRY',${amount},0,${amount},'{}','${randomUUID()}');`));
 if(provider==='fake'){
 sql(`select public.finance_fake_authorize('${created.paymentIntentId}','t100-authorize-${randomUUID()}',true);`);
 sql(`select public.finance_release_fake_sandbox_request('${created.id}');`);
 }else{
  const op='t100-authorize-'+randomUUID();
  sql(`insert into public.finance_iyzico_operations(intent_id,service_request_id,customer_id,operation,operation_id,business_operation_key,conversation_id,fingerprint,state,amount,currency,basket_id,payment_id,payment_transaction_id,provider_phase,signature_verified,lease_expires_at)
   values('${created.paymentIntentId}','${created.id}','${c}','authorize','${op}','${op}','${op}',repeat('a',64),'succeeded',${amount},'TRY','${created.id}','t100-local-payment-${created.id}','t100-local-item-${created.id}','PRE_AUTH',true,now());
   select public.finance_apply_iyzico_operation('${created.paymentIntentId}','${op}');select public.finance_release_iyzico_sandbox_request('${created.id}','${op}');`);
 }
 const dispatch=sql(`select id from public.service_dispatches where service_request_id='${created.id}' and status='broadcasting' limit 1`);
 const job=sql(`select public.accept_service_dispatch('${dispatch}','${t}','t100-accept-${randomUUID()}')`);
 return {c,t,a,admin,job,request:created.id,intent:created.paymentIntentId,quote:created.quoteId};
}
