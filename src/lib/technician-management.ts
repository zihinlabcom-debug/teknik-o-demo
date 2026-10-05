import 'server-only';
import {adminSupabase,currentAccount} from '@/lib/account-supabase';
import {OperationError} from '@/lib/operation-server';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const actions=new Set(['approve','reject','suspend','pending','activate','deactivate',
  'category_add','category_remove','area_add','area_remove','document_verify','document_reject']);

async function requireAccount(role:'admin'|'technician'){
  const account=await currentAccount();
  if(!account)throw new OperationError('unauthenticated',401,'Aktif oturum gerekli.');
  if(account.role!==role)throw new OperationError('forbidden',403,'Bu işlem için yetkiniz yok.');
  return account;
}
function check(error:{message?:string}|null,context:string){
  if(error)throw new OperationError('operation_failed',500,`${context} yüklenemedi.`);
}

export async function adminTechnicianOverview(){
  await requireAccount('admin');
  const db=adminSupabase();
  const [{data:users,error:usersError},{data:categories,error:categoriesError},
    {data:cities,error:citiesError},{data:districts,error:districtsError}]=await Promise.all([
    db.from('users').select('id,name,is_active,is_test,created_at').eq('role','technician').order('created_at',{ascending:false}).limit(200),
    db.from('service_categories').select('id,code,name,is_active').order('name'),
    db.from('cities').select('id,name,is_active').order('name'),
    db.from('districts').select('id,city_id,name,is_active').order('name'),
  ]);
  check(usersError,'Usta listesi');check(categoriesError,'Kategoriler');
  check(citiesError,'Şehirler');check(districtsError,'İlçeler');
  const ids=(users??[]).map(u=>u.id);
  if(!ids.length)return {technicians:[],categories:categories??[],cities:cities??[],districts:districts??[]};
  const [{data:profiles,error:profilesError},{data:assignedCategories,error:assignedCategoriesError},
    {data:areas,error:areasError},{data:documents,error:documentsError}]=await Promise.all([
    db.from('technician_profiles').select('user_id,approval_status,is_available').in('user_id',ids),
    db.from('technician_service_categories').select('technician_id,category_id').in('technician_id',ids),
    db.from('technician_service_areas').select('technician_id,city_id,district_id').in('technician_id',ids),
    db.from('technician_documents').select('id,technician_id,document_type,status').in('technician_id',ids),
  ]);
  check(profilesError,'Usta profilleri');check(assignedCategoriesError,'Usta kategorileri');
  check(areasError,'Hizmet alanları');check(documentsError,'Usta belgeleri');
  return {technicians:(users??[]).map(user=>({
    ...user,profile:(profiles??[]).find(p=>p.user_id===user.id)??null,
    categories:(assignedCategories??[]).filter(c=>c.technician_id===user.id),
    areas:(areas??[]).filter(a=>a.technician_id===user.id),
    documents:(documents??[]).filter(d=>d.technician_id===user.id),
  })),categories:categories??[],cities:cities??[],districts:districts??[]};
}

export async function ownTechnicianProfile(){
  const account=await requireAccount('technician');
  const db=adminSupabase();
  const [{data:profile,error:profileError},{data:assignments,error:categoryError},
    {data:areas,error:areaError},{data:categories,error:catalogError},
    {data:cities,error:cityError},{data:districts,error:districtError}]=await Promise.all([
    db.from('technician_profiles').select('approval_status,is_available').eq('user_id',account.id).maybeSingle(),
    db.from('technician_service_categories').select('category_id').eq('technician_id',account.id),
    db.from('technician_service_areas').select('city_id,district_id').eq('technician_id',account.id),
    db.from('service_categories').select('id,name'),
    db.from('cities').select('id,name'),
    db.from('districts').select('id,name'),
  ]);
  check(profileError,'Usta profili');check(categoryError,'Usta kategorileri');
  check(areaError,'Hizmet alanları');check(catalogError,'Kategoriler');
  check(cityError,'Şehirler');check(districtError,'İlçeler');
  return {isActive:account.is_active,profile,
    categories:(assignments??[]).map(a=>(categories??[]).find(c=>c.id===a.category_id)?.name??'Kategori'),
    areas:(areas??[]).map(a=>{
      const city=(cities??[]).find(c=>c.id===a.city_id)?.name??'Şehir';
      const district=a.district_id?(districts??[]).find(d=>d.id===a.district_id)?.name:null;
      return district?`${city} / ${district}`:city;
    })};
}

export async function adminChangeTechnician(technicianId:string,input:{
  action:string;categoryId?:string;cityId?:number;districtId?:number;documentId?:string;
}){
  const account=await requireAccount('admin');
  if(!uuid.test(technicianId)||!actions.has(input.action) ||
    (input.categoryId!==undefined&&!uuid.test(input.categoryId)) ||
    (input.documentId!==undefined&&!uuid.test(input.documentId)) ||
    (input.cityId!==undefined&&(!Number.isSafeInteger(input.cityId)||input.cityId<=0)) ||
    (input.districtId!==undefined&&(!Number.isSafeInteger(input.districtId)||input.districtId<=0)))
    throw new OperationError('invalid_input',400,'Geçersiz usta işlemi.');
  const {data,error}=await adminSupabase().rpc('admin_change_technician',{
    p_actor_id:account.id,p_technician_id:technicianId,p_action:input.action,
    p_category_id:input.categoryId??null,p_city_id:input.cityId??null,
    p_district_id:input.districtId??null,p_document_id:input.documentId??null,
  });
  if(error)throw new OperationError('invalid_transition',409,'Usta işlemi mevcut kayıtlarla doğrulanamadı.');
  return {changed:data===true};
}

export async function setOwnTechnicianAvailability(isAvailable:boolean){
  const account=await requireAccount('technician');
  if(typeof isAvailable!=='boolean')throw new OperationError('invalid_input',400,'Geçersiz müsaitlik değeri.');
  const {data,error}=await adminSupabase().rpc('set_technician_availability',{
    p_actor_id:account.id,p_is_available:isAvailable,
  });
  if(error)throw new OperationError('availability_unavailable',409,'Müsaitlik yalnız onaylı ve aktif usta için değiştirilebilir.');
  return {changed:data===true};
}
