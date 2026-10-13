import 'server-only';
import {adminSupabase,currentAccount,serverSupabase} from './account-supabase';
import {verifyCurrentPassword} from './account-password';
import {OperationError} from './operation-error';

const avatarBucket='profile-avatars';
const maxAvatarBytes=5*1024*1024;

async function technicianAccount(){
  const account=await currentAccount();
  if(!account)throw new OperationError('unauthenticated',401,'Aktif oturum gerekli.');
  if(account.role!=='technician')throw new OperationError('forbidden',403,'Bu işlem yalnız ustalara açıktır.');
  return account;
}

function avatarFormat(bytes:Uint8Array,mime:string){
  if(!bytes.length||bytes.length>maxAvatarBytes)return null;
  if(mime==='image/jpeg'&&bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return mime;
  if(mime==='image/png'&&bytes.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))return mime;
  if(mime==='image/webp'&&bytes.length>=12&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return mime;
  return null;
}

export async function getTechnicianProfile(){
  const account=await technicianAccount();
  const db=adminSupabase();
  const [{data:user,error:userError},{data:profile,error:profileError},{data:areas,error:areaError},
    {data:assigned,error:categoryError},{data:documents,error:documentError},
    {data:categories,error:catalogError},{data:cities,error:cityError},{data:districts,error:districtError}]=await Promise.all([
    db.from('users').select('id,name,phone,email').eq('id',account.id).single(),
    db.from('technician_profiles').select('approval_status,is_available,address_city_id,address_district_id,address_line,avatar_path').eq('user_id',account.id).single(),
    db.from('technician_service_areas').select('city_id,district_id').eq('technician_id',account.id),
    db.from('technician_service_categories').select('category_id,approval_status,service_categories(name)').eq('technician_id',account.id),
    db.from('technician_documents').select('id,category_id,original_file_name,status,rejection_reason,created_at').eq('technician_id',account.id).order('created_at',{ascending:false}),
    db.from('service_categories').select('id,name').eq('is_active',true).order('name'),
    db.from('cities').select('id,name').eq('is_active',true).order('plate_code'),
    db.from('districts').select('id,city_id,name').eq('is_active',true).order('name'),
  ]);
  if(userError||profileError||areaError||categoryError||documentError||catalogError||cityError||districtError||!user||!profile)
    throw new OperationError('profile_unavailable',503,'Profil bilgileri yüklenemedi.');
  const {data:{user:authUser}}=await (await serverSupabase()).auth.getUser();
  user.email=authUser?.email??null;
  let avatarUrl:string|null=null;
  if(profile.avatar_path){
    const {data}=await db.storage.from(avatarBucket).createSignedUrl(profile.avatar_path,600);
    avatarUrl=data?.signedUrl??null;
  }
  return {user,profile:{...profile,avatarUrl},areas:areas??[],assigned:assigned??[],documents:documents??[],
    categories:categories??[],cities:cities??[],districts:districts??[]};
}

export async function updateTechnicianProfile(input:unknown){
  const account=await technicianAccount();
  if(!input||typeof input!=='object')throw new OperationError('invalid_profile',400,'Profil bilgilerini kontrol edin.');
  const data=input as Record<string,unknown>;
  if(!await verifyCurrentPassword(account.id,data.currentPassword))
    throw new OperationError('invalid_password',403,'Mevcut şifre hatalı.');
  const name=typeof data.name==='string'?data.name.trim():'';
  const {data:{user:authUser}}=await (await serverSupabase()).auth.getUser();
  const email=authUser?.email??'';
  if(!authUser?.email_confirmed_at||(typeof data.email==='string'&&data.email.trim().toLowerCase()!==email.toLowerCase()))
    throw new OperationError('email_change_disabled',400,'E-posta değişikliği bu ekrandan yapılamaz.');
  const addressLine=typeof data.addressLine==='string'?data.addressLine.trim():'';
  const serviceDistrictIds=Array.isArray(data.serviceDistrictIds)?data.serviceDistrictIds.map(Number):[];
  if(name.length<2||name.length>200||email.length>320||addressLine.length<10||addressLine.length>500||
    !Number.isSafeInteger(Number(data.addressCityId))||!Number.isSafeInteger(Number(data.addressDistrictId))||
    !Number.isSafeInteger(Number(data.serviceCityId))||!serviceDistrictIds.length||
    serviceDistrictIds.some(id=>!Number.isSafeInteger(id)))
    throw new OperationError('invalid_profile',400,'Profil bilgilerini kontrol edin.');
  const {error}=await adminSupabase().rpc('update_technician_profile',{
    p_actor_id:account.id,p_name:name,p_email:email||null,
    p_address_city_id:Number(data.addressCityId),p_address_district_id:Number(data.addressDistrictId),
    p_address_line:addressLine,p_service_city_id:Number(data.serviceCityId),
    p_service_district_ids:[...new Set(serviceDistrictIds)],
  });
  if(error)throw new OperationError('profile_update_failed',400,'Profil güncellenemedi. Alanları kontrol edin.');
  return {ok:true};
}

export async function addTechnicianCategory(categoryId:unknown,currentPassword:unknown){
  const account=await technicianAccount();
  if(typeof categoryId!=='string'||!await verifyCurrentPassword(account.id,currentPassword))
    throw new OperationError('invalid_request',403,'Kategori ve mevcut şifreyi kontrol edin.');
  const {data,error}=await adminSupabase().rpc('add_technician_profile_category',{p_actor_id:account.id,p_category_id:categoryId});
  if(error)throw new OperationError('category_add_failed',400,'Kategori eklenemedi.');
  return {ok:true,status:data};
}

export async function uploadTechnicianAvatar(file:File,currentPassword:unknown){
  const account=await technicianAccount();
  if(!await verifyCurrentPassword(account.id,currentPassword))
    throw new OperationError('invalid_password',403,'Mevcut şifre hatalı.');
  const bytes=new Uint8Array(await file.arrayBuffer());
  const contentType=avatarFormat(bytes,file.type);
  if(!contentType)throw new OperationError('invalid_avatar',400,'En fazla 5 MB JPEG, PNG veya WebP görsel yükleyin.');
  const path=`technician/${account.id}/avatar`;
  const db=adminSupabase();
  const {data:existing,error:existingError}=await db.from('technician_profiles')
    .select('avatar_path').eq('user_id',account.id).single();
  if(existingError)throw new OperationError('profile_unavailable',503,'Profil bilgileri yüklenemedi.');
  const {error:uploadError}=await db.storage.from(avatarBucket).upload(path,bytes,{contentType,upsert:true,cacheControl:'3600'});
  if(uploadError)throw new OperationError('avatar_upload_failed',503,'Profil görseli yüklenemedi.');
  const {error:updateError}=await db.from('technician_profiles').update({avatar_path:path,updated_at:new Date().toISOString()}).eq('user_id',account.id);
  if(updateError){
    if(existing.avatar_path!==path)await db.storage.from(avatarBucket).remove([path]);
    throw new OperationError('avatar_update_failed',503,'Profil görseli kaydedilemedi.');
  }
  return {ok:true};
}
