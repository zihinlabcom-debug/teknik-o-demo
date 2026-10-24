import 'server-only';
import {adminSupabase} from './account-supabase';
import {requireRole,failDb} from '../../../../src/lib/operation-guard';

export async function adminRequestTableRows(){
  await requireRole('admin');
  const db=adminSupabase();
  const {data,error}=await db.from('service_requests').select('id,customer_id,category_id,status,created_at')
    .order('created_at',{ascending:false}).limit(200);
  if(error)failDb(error,'Admin talepleri');
  const userIds=[...new Set((data??[]).map(r=>r.customer_id).filter(Boolean))];
  const categoryIds=[...new Set((data??[]).map(r=>r.category_id).filter(Boolean))];
  const requestIds=(data??[]).map(r=>r.id);
  const [{data:users},{data:cats},{data:quotes}]=await Promise.all([
    userIds.length?db.from('users').select('id,name,is_test').in('id',userIds):Promise.resolve({data:[]}),
    categoryIds.length?db.from('service_categories').select('id,name').in('id',categoryIds):Promise.resolve({data:[]}),
    requestIds.length?db.from('service_quotes').select('service_request_id,status,total_amount,currency')
      .in('service_request_id',requestIds).eq('status','accepted'):Promise.resolve({data:[]}),
  ]);
  return (data??[]).map(r=>({...r,
    customer:(users??[]).find(u=>u.id===r.customer_id)??null,
    category:(cats??[]).find(c=>c.id===r.category_id)??null,
    quote:(quotes??[]).find(q=>q.service_request_id===r.id)??null}));
}
