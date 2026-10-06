import 'server-only';
import {randomUUID} from 'node:crypto';
import {adminSupabase,currentAccount} from './account-supabase';
import {OperationError} from './operation-error';
export {technicianDocumentLink} from './admin-technician-document-link';

const bucket='technician-documents';
const maxBytes=5*1024*1024;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function documentFormat(bytes:Uint8Array,mime:string):'pdf'|'jpg'|'png'|null{
  if(bytes.length===0||bytes.length>maxBytes)return null;
  if(mime==='application/pdf'&&bytes.length>=5&&String.fromCharCode(...bytes.slice(0,5))==='%PDF-')return 'pdf';
  if(mime==='image/jpeg'&&bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return 'jpg';
  if(mime==='image/png'&&bytes.length>=8&&[137,80,78,71,13,10,26,10].every((value,index)=>bytes[index]===value))return 'png';
  return null;
}

export async function uploadTechnicianDocument(file:File,categoryId:string){
  const account=await currentAccount();
  if(!account)throw new OperationError('unauthenticated',401,'Aktif oturum gerekli.');
  if(account.role!=='technician')throw new OperationError('forbidden',403,'Bu işlem yalnız ustalara açıktır.');
  if(!uuid.test(categoryId)||file.size>maxBytes||file.size===0||file.name.length>200)
    throw new OperationError('invalid_document',400,'Belge biçimini veya boyutunu kontrol edin.');
  const bytes=new Uint8Array(await file.arrayBuffer());
  const extension=documentFormat(bytes,file.type);
  if(!extension)throw new OperationError('invalid_document',400,'PDF, JPG veya PNG dosyası (en fazla 5 MB) yükleyin.');
  const db=adminSupabase();
  const {data:assignment,error:assignmentError}=await db.from('technician_service_categories')
    .select('category_id').eq('technician_id',account.id).eq('category_id',categoryId).maybeSingle();
  if(assignmentError||!assignment)throw new OperationError('invalid_category',403,'Bu kategori hesabınızda bulunmuyor.');
  const path=`technician/${account.id}/${randomUUID()}.${extension}`;
  const {error:uploadError}=await db.storage.from(bucket).upload(path,bytes,{
    contentType:file.type,upsert:false,cacheControl:'0',
  });
  if(uploadError)throw new OperationError('upload_failed',503,'Belge yüklenemedi. Yeniden deneyin.');
  const {data,error}=await db.from('technician_documents').insert({
    technician_id:account.id,category_id:categoryId,document_type:'qualification',
    storage_path:path,original_file_name:file.name,mime_type:file.type,status:'pending',
  }).select('id').single();
  if(error||!data){
    // Compensate the non-transactional Storage API before returning failure.
    const {error:cleanupError}=await db.storage.from(bucket).remove([path]);
    if(cleanupError)throw new OperationError('cleanup_failed',503,
      'Belge kaydı oluşturulamadı. Destek ile iletişime geçin.');
    throw new OperationError('metadata_failed',503,'Belge kaydı oluşturulamadı. Yeniden deneyin.');
  }
  return {id:data.id,status:'pending'};
}
