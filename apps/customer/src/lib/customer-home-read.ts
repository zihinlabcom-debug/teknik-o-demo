import 'server-only';
import {adminSupabase,currentAccount} from './account-supabase';
import {OperationError} from './operation-error';

export async function getCustomerHomeSummary(){
  const account=await currentAccount();
  if(!account)throw new OperationError('unauthenticated',401,'Aktif oturum gerekli.');
  if(account.role!=='customer')throw new OperationError('forbidden',403,'Bu işlem yalnız müşterilere açıktır.');
  const db=adminSupabase();
  const [{data:user,error:userError},{data:profile,error:profileError},{data:addresses,error:addressError}]=await Promise.all([
    db.from('users').select('id,name').eq('id',account.id).single(),
    db.from('customer_profiles').select('avatar_path').eq('user_id',account.id).maybeSingle(),
    db.from('customer_addresses').select('city_id,district_id')
      .eq('customer_id',account.id).not('profile_slot','is',null)
      .is('profile_archived_at',null).order('profile_slot').limit(1),
  ]);
  if(userError||profileError||addressError||!user)
    throw new OperationError('profile_unavailable',503,'Profil bilgileri yüklenemedi.');
  const address=addresses?.[0];
  // Match the profile projection's Number conversion, including legacy null IDs.
  const cityId=address?Number(address.city_id):null;
  const districtId=address?Number(address.district_id):null;
  const [{data:cities,error:cityError},{data:districts,error:districtError},avatar]=await Promise.all([
    cityId!==null?db.from('cities').select('id,name').eq('id',cityId).eq('is_active',true):Promise.resolve({data:[],error:null}),
    districtId!==null?db.from('districts').select('id,name').eq('id',districtId).eq('is_active',true):Promise.resolve({data:[],error:null}),
    profile?.avatar_path?db.storage.from('profile-avatars').createSignedUrl(profile.avatar_path,600):Promise.resolve({data:null}),
  ]);
  if(cityError||districtError)
    throw new OperationError('profile_unavailable',503,'Profil bilgileri yüklenemedi.');
  return {name:user.name,avatarUrl:avatar.data?.signedUrl??null,
    location:[cities?.[0]?.name,districts?.[0]?.name].filter(Boolean).join(', ')||'Konum bilgisi eklenmemiş'};
}
