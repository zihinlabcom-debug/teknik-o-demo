import 'server-only';
import {adminSupabase,currentAccount} from './account-supabase';
import {OperationError} from './operation-error';

const avatarBucket='profile-avatars';
const maxAvatarBytes=5*1024*1024;

export type ProfileAddress={slot:number;label:string;cityId:number;districtId:number;addressLine:string};
export type CustomerProfileData={
  id:string;name:string;phone:string;email:string;avatarUrl:string|null;
  addresses:ProfileAddress[];
  cities:{id:number;name:string}[];
  districts:{id:number;cityId:number;name:string}[];
};

function avatarFormat(bytes:Uint8Array,mime:string){
  if(!bytes.length||bytes.length>maxAvatarBytes)return null;
  if(mime==='image/jpeg'&&bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return mime;
  if(mime==='image/png'&&bytes.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))return mime;
  if(mime==='image/webp'&&bytes.length>=12&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return mime;
  return null;
}

async function customerAccount(){
  const account=await currentAccount();
  if(!account)throw new OperationError('unauthenticated',401,'Aktif oturum gerekli.');
  if(account.role!=='customer')throw new OperationError('forbidden',403,'Bu işlem yalnız müşterilere açıktır.');
  return account;
}

export async function getCustomerProfile():Promise<CustomerProfileData>{
  const account=await customerAccount();
  const db=adminSupabase();
  const [{data:user,error:userError},{data:profile,error:profileError},{data:addresses,error:addressError},
    {data:cities,error:cityError},{data:districts,error:districtError}]=await Promise.all([
    db.from('users').select('id,name,phone,email').eq('id',account.id).single(),
    db.from('customer_profiles').select('avatar_path').eq('user_id',account.id).maybeSingle(),
    db.from('customer_addresses').select('profile_slot,label,city_id,district_id,address_line')
      .eq('customer_id',account.id).not('profile_slot','is',null)
      .is('profile_archived_at',null).order('profile_slot'),
    db.from('cities').select('id,name').eq('is_active',true).order('plate_code'),
    db.from('districts').select('id,city_id,name').eq('is_active',true).order('name'),
  ]);
  if(userError||profileError||addressError||cityError||districtError||!user)
    throw new OperationError('profile_unavailable',503,'Profil bilgileri yüklenemedi.');
  let avatarUrl:string|null=null;
  if(profile?.avatar_path){
    const {data}=await db.storage.from(avatarBucket).createSignedUrl(profile.avatar_path,600);
    avatarUrl=data?.signedUrl??null;
  }
  return {id:user.id,name:user.name,phone:user.phone??'',email:user.email??'',avatarUrl,
    addresses:(addresses??[]).map(item=>({slot:Number(item.profile_slot),label:item.label??'',
      cityId:Number(item.city_id),districtId:Number(item.district_id),addressLine:item.address_line??''})),
    cities:(cities??[]).map(item=>({id:Number(item.id),name:item.name})),
    districts:(districts??[]).map(item=>({id:Number(item.id),cityId:Number(item.city_id),name:item.name}))};
}

export async function updateCustomerProfile(input:unknown){
  const account=await customerAccount();
  if(!input||typeof input!=='object')throw new OperationError('invalid_profile',400,'Profil bilgilerini kontrol edin.');
  const data=input as Record<string,unknown>;
  const name=typeof data.name==='string'?data.name.trim():'';
  const email=typeof data.email==='string'?data.email.trim():'';
  const addresses=Array.isArray(data.addresses)?data.addresses:[];
  if(name.length<2||name.length>200||email.length>320||addresses.length>3)
    throw new OperationError('invalid_profile',400,'Profil bilgilerini kontrol edin.');
  const normalized=addresses.map((value,index)=>{
    const address=value&&typeof value==='object'?value as Record<string,unknown>:{};
    return {slot:index+1,label:typeof address.label==='string'?address.label.trim():`Adres ${index+1}`,
      cityId:Number(address.cityId),districtId:Number(address.districtId),
      addressLine:typeof address.addressLine==='string'?address.addressLine.trim():''};
  });
  if(normalized.some(a=>!Number.isSafeInteger(a.cityId)||!Number.isSafeInteger(a.districtId)||
    a.label.length<1||a.label.length>40||a.addressLine.length<10||a.addressLine.length>500))
    throw new OperationError('invalid_address',400,'Adres bilgilerini kontrol edin.');
  const {error}=await adminSupabase().rpc('update_customer_profile',{
    p_actor_id:account.id,p_name:name,p_email:email||null,p_addresses:normalized,
  });
  if(error)throw new OperationError('profile_update_failed',400,'Profil güncellenemedi. Alanları kontrol edin.');
  return {ok:true};
}

export async function uploadCustomerAvatar(file:File){
  const account=await customerAccount();
  const bytes=new Uint8Array(await file.arrayBuffer());
  const contentType=avatarFormat(bytes,file.type);
  if(!contentType)throw new OperationError('invalid_avatar',400,'En fazla 5 MB JPEG, PNG veya WebP görsel yükleyin.');
  const path=`customer/${account.id}/avatar`;
  const db=adminSupabase();
  const {data:existing,error:existingError}=await db.from('customer_profiles')
    .select('avatar_path').eq('user_id',account.id).single();
  if(existingError)throw new OperationError('profile_unavailable',503,'Profil bilgileri yüklenemedi.');
  const {error:uploadError}=await db.storage.from(avatarBucket).upload(path,bytes,{contentType,upsert:true,cacheControl:'3600'});
  if(uploadError)throw new OperationError('avatar_upload_failed',503,'Profil görseli yüklenemedi.');
  const {error:updateError}=await db.from('customer_profiles').update(
    {avatar_path:path,updated_at:new Date().toISOString()}).eq('user_id',account.id);
  if(updateError){
    if(existing.avatar_path!==path)await db.storage.from(avatarBucket).remove([path]);
    throw new OperationError('avatar_update_failed',503,'Profil görseli kaydedilemedi.');
  }
  return {ok:true};
}
