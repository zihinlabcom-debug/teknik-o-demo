import 'server-only';
import {adminSupabase,currentAccount} from './account-supabase';
import {OperationError} from './operation-server';

export async function adminCustomerOverview(){
  const account=await currentAccount();
  if(!account||account.role!=='admin')throw new OperationError('forbidden',403,'Admin oturumu gerekli.');
  const db=adminSupabase();
  const {data:users,error}=await db.from('users').select('id,name,phone,email,is_active,is_test,created_at')
    .eq('role','customer').order('created_at',{ascending:false}).limit(500);
  if(error)throw new OperationError('customers_unavailable',503,'Müşteri listesi yüklenemedi.');
  const ids=(users??[]).map(item=>item.id);
  if(!ids.length)return [];
  const [{data:profiles,error:profileError},{data:addresses,error:addressError},{data:requests,error:requestError}]=await Promise.all([
    db.from('customer_profiles').select('user_id,avatar_path').in('user_id',ids),
    db.from('customer_addresses').select('customer_id,profile_slot,label,city,district,address_line,is_default').in('customer_id',ids).order('profile_slot'),
    db.from('service_requests').select('customer_id,status').in('customer_id',ids),
  ]);
  if(profileError||addressError||requestError)throw new OperationError('customers_unavailable',503,'Müşteri ayrıntıları yüklenemedi.');
  return Promise.all((users??[]).map(async user=>{
    const profile=(profiles??[]).find(item=>item.user_id===user.id);
    const avatarPath=profile?.avatar_path??null;
    const avatar=avatarPath?await db.storage.from('profile-avatars').createSignedUrl(avatarPath,600):null;
    const userRequests=(requests??[]).filter(item=>item.customer_id===user.id);
    return {...user,avatarUrl:avatar?.data?.signedUrl??null,
      addresses:(addresses??[]).filter(item=>item.customer_id===user.id),
      totalRequests:userRequests.length,
      completedRequests:userRequests.filter(item=>['completed','closed','warranty_closed'].includes(item.status)).length};
  }));
}
