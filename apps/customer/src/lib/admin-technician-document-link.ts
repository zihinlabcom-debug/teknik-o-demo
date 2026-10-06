import 'server-only';
import {adminSupabase,currentAccount} from './account-supabase';
import {OperationError} from './operation-error';

const bucket='technician-documents';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function technicianDocumentLink(documentId:string){
  const account=await currentAccount();
  if(!account)throw new OperationError('unauthenticated',401,'Aktif oturum gerekli.');
  if(!uuid.test(documentId))throw new OperationError('invalid_document',400,'Geçersiz belge.');
  const db=adminSupabase();
  const {data,error}=await db.from('technician_documents')
    .select('technician_id,storage_path').eq('id',documentId).maybeSingle();
  if(error||!data?.storage_path)throw new OperationError('not_found',404,'Belge bulunamadı.');
  if(account.role!=='admin'&&(account.role!=='technician'||account.id!==data.technician_id))
    throw new OperationError('forbidden',403,'Belgeye erişim izniniz yok.');
  const {data:link,error:linkError}=await db.storage.from(bucket).createSignedUrl(data.storage_path,60);
  if(linkError||!link?.signedUrl)throw new OperationError('unavailable',503,'Belge şu anda açılamıyor.');
  return link.signedUrl;
}
