import 'server-only';
import {adminSupabase} from '@/lib/account-supabase';
import {requireRole} from '@/lib/operation-guard';
import {FinanceInputError} from '../sandbox-contract';
import {createIyzicoStage12Server} from './iyzico-stage12-factory';
import {canonicalTryAmount} from './iyzico-money';
import type {IyzicoPaymentCard} from './iyzico-types';

function required(value:unknown,code:string):string{
  if(typeof value!=='string'||value.trim().length===0)throw new FinanceInputError(code,409,'Sandbox ödeme profili eksik.');
  return value.trim();
}
function iyzicoDate(value:string):string{
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))throw new FinanceInputError('invalid_profile_date',409,'Sandbox ödeme profili geçersiz.');
  return date.toISOString().slice(0,19).replace('T',' ');
}
function phone(value:string):string{
  const digits=value.replace(/\D/g,'');
  if(digits.length===10)return `+90${digits}`;
  if(digits.length===12&&digits.startsWith('90'))return `+${digits}`;
  throw new FinanceInputError('invalid_profile_phone',409,'Sandbox ödeme profili için geçerli telefon gerekli.');
}
function validEmail(value:string):string{
  if(value.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    throw new FinanceInputError('invalid_profile_email',409,'Sandbox ödeme profili için geçerli e-posta gerekli.');
  return value;
}
function names(value:string):Readonly<{name:string;surname:string}>{
  const parts=value.trim().split(/\s+/).filter(Boolean);
  if(!parts.length)throw new FinanceInputError('invalid_profile_name',409,'Sandbox ödeme profili için ad gerekli.');
  return {name:parts[0],surname:parts.slice(1).join(' ')||'Test'};
}

export async function authorizeIyzicoSandboxIntent(
  intentId:string,paymentCard:IyzicoPaymentCard,ip:string,
){
  const account=await requireRole('customer');
  if(account.is_test!==true)throw new FinanceInputError('finance_lab_test_only',403,'Bu ödeme testi yalnızca test hesabında kullanılabilir.');
  const db=adminSupabase();
  const {data:intent,error:intentError}=await db.from('finance_payment_intents')
    .select('id,service_request_id,customer_id,provider,environment')
    .eq('id',intentId).eq('customer_id',account.id).maybeSingle();
  if(intentError||!intent||intent.provider!=='iyzico'||intent.environment!=='sandbox')
    throw new FinanceInputError('intent_not_found',404,'Sandbox ödeme niyeti bulunamadı.');
  const [{data:user,error:userError},{data:request,error:requestError}]=await Promise.all([
    db.from('users').select('id,name,phone,email,created_at').eq('id',account.id).maybeSingle(),
    db.from('service_requests').select('id,address_id').eq('id',intent.service_request_id).eq('customer_id',account.id).maybeSingle(),
  ]);
  if(userError||requestError||!user||!request)
    throw new FinanceInputError('checkout_context_missing',409,'Sandbox ödeme bağlamı bulunamadı.');
  const {data:address,error:addressError}=await db.from('customer_addresses')
    .select('address_line,city_id,district_id').eq('id',request.address_id).eq('customer_id',account.id).maybeSingle();
  if(addressError||!address)throw new FinanceInputError('checkout_address_missing',409,'Sandbox ödeme adresi bulunamadı.');
  const [{data:city},{data:district}]=await Promise.all([
    db.from('cities').select('name').eq('id',address.city_id).maybeSingle(),
    db.from('districts').select('name').eq('id',address.district_id).maybeSingle(),
  ]);
  const fullName=required(user.name,'invalid_profile_name'),split=names(fullName);
  const cityName=required(city?.name,'checkout_address_missing');
  const addressLine=[required(address.address_line,'checkout_address_missing'),district?.name]
    .filter(Boolean).join(', ').slice(0,500);
  const commonAddress={contactName:fullName,city:cityName,country:'Turkey',address:addressLine};
  const server=createIyzicoStage12Server();
  const scope=await server.intentScope(intentId,account.id);
  return server.authorize(intentId,account.id,{
    paymentCard,
    buyer:{id:account.id,name:split.name,surname:split.surname,gsmNumber:phone(required(user.phone,'invalid_profile_phone')),
      email:validEmail(required(user.email,'invalid_profile_email')),identityNumber:'11111111111',
      lastLoginDate:iyzicoDate(user.created_at),registrationDate:iyzicoDate(user.created_at),
      registrationAddress:addressLine,ip,city:cityName,country:'Turkey'},
    shippingAddress:commonAddress,billingAddress:commonAddress,
    basketItems:[{id:request.id,price:scope.amount,
      name:'HizmetPey test hizmeti',category1:'Hizmet',itemType:'VIRTUAL'}],
  });
}

export async function reconcileIyzicoSandboxAuthorization(intentId:string){
  const account=await requireRole('customer');
  if(account.is_test!==true)throw new FinanceInputError('finance_lab_test_only',403,'Bu ödeme testi yalnızca test hesabında kullanılabilir.');
  return createIyzicoStage12Server().reconcileAuthorization(intentId,account.id);
}
export async function cancelIyzicoSandboxAuthorization(intentId:string,ip:string){
  const account=await requireRole('customer');
  if(account.is_test!==true)throw new FinanceInputError('finance_lab_test_only',403,'Bu ödeme testi yalnızca test hesabında kullanılabilir.');
  return createIyzicoStage12Server().cancel(intentId,account.id,{ip,reason:'BUYER_REQUEST',description:'Sandbox lifecycle test'});
}
export async function refundIyzicoSandboxPayment(intentId:string,ip:string){
  const account=await requireRole('customer');
  if(account.is_test!==true)throw new FinanceInputError('finance_lab_test_only',403,'Bu ödeme testi yalnızca test hesabında kullanılabilir.');
  const {data,error}=await adminSupabase().rpc('finance_iyzico_refund_context',{
    p_intent_id:intentId,p_customer_id:account.id,
  });
  const context=data as {remainingAmount?:unknown;paymentTransactionId?:unknown}|null;
  if(error||!context||typeof context.remainingAmount!=='string'||typeof context.paymentTransactionId!=='string')
    throw new FinanceInputError('refund_context_missing',409,'İade bağlamı doğrulanamadı.');
  return createIyzicoStage12Server().refund(intentId,account.id,{refundKey:'full-balance',
    amount:canonicalTryAmount(context.remainingAmount),paymentTransactionId:context.paymentTransactionId,
    ip,reason:'BUYER_REQUEST',description:'Sandbox lifecycle test'});
}
