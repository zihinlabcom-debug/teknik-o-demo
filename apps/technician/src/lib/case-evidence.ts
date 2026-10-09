import 'server-only';
import {randomUUID} from 'node:crypto';
import {adminSupabase} from './account-supabase';
import {OperationError} from './operation-error';
import {failDb,requireId} from './operation-guard';

export type EvidencePurpose='complaint'|'warranty'|'additional_cost';
export type UploadedEvidence={kind:'photo'|'video'|'document';path:string;name:string;mime:string;size:number};

const MIME:Record<string,UploadedEvidence['kind']>={
  'image/jpeg':'photo','image/png':'photo','image/webp':'photo',
  'video/mp4':'video','video/quicktime':'video','video/webm':'video',
  'application/pdf':'document',
};
const EXT:Record<string,string>={
  'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4',
  'video/quicktime':'mov','video/webm':'webm','application/pdf':'pdf',
};

function validMagic(bytes:Uint8Array,mime:string){
  if(mime==='image/jpeg')return bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff;
  if(mime==='image/png')return bytes.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
  if(mime==='image/webp')return bytes.length>=12&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
  if(mime==='application/pdf')return bytes.length>=5&&String.fromCharCode(...bytes.slice(0,5))==='%PDF-';
  if(mime==='video/mp4'||mime==='video/quicktime')return bytes.length>=12&&String.fromCharCode(...bytes.slice(4,8))==='ftyp';
  if(mime==='video/webm')return bytes.length>=4&&[0x1a,0x45,0xdf,0xa3].every((v,i)=>bytes[i]===v);
  return false;
}

export async function uploadCaseEvidence(files:File[],userId:string,purpose:EvidencePurpose){
  const limit=purpose==='complaint'?5:10;
  if(files.length>limit)throw new OperationError('evidence_limit',400,`En fazla ${limit} dosya yüklenebilir.`);
  if(purpose==='warranty'&&!files.length)throw new OperationError('evidence_required',400,'Garanti talebi için en az bir fotoğraf veya video gerekli.');
  const db=adminSupabase();
  const uploaded:UploadedEvidence[]=[];
  try{
    for(const file of files){
      const kind=MIME[file.type];
      const max=kind==='video'?50*1024*1024:10*1024*1024;
      if(!kind||file.size<1||file.size>max||file.name.length<1||file.name.length>200)
        throw new OperationError('invalid_evidence',400,'Dosya türü veya boyutu geçerli değil.');
      if(purpose==='warranty'&&kind==='document')throw new OperationError('invalid_evidence',400,'Garanti kanıtı fotoğraf veya video olmalıdır.');
      const bytes=new Uint8Array(await file.arrayBuffer());
      if(!validMagic(bytes,file.type))throw new OperationError('invalid_evidence',400,'Dosya içeriği beyan edilen türle eşleşmiyor.');
      const path=`stage10/${userId}/${purpose}/${randomUUID()}.${EXT[file.type]}`;
      const {error}=await db.storage.from('service-case-evidence').upload(path,bytes,{contentType:file.type,upsert:false,cacheControl:'0'});
      if(error)throw new OperationError('evidence_upload_failed',503,'Kanıt dosyası yüklenemedi.');
      uploaded.push({kind,path,name:file.name,mime:file.type,size:file.size});
    }
    return uploaded;
  }catch(error){
    if(uploaded.length)await removeUploadedEvidence(uploaded);
    throw error;
  }
}

export async function removeUploadedEvidence(items:UploadedEvidence[]){
  if(!items.length)return;
  const paths=items.map(item=>item.path);let lastError:unknown;
  for(let attempt=0;attempt<2;attempt++){const {error}=await adminSupabase().storage.from('service-case-evidence').remove(paths);if(!error)return;lastError=error;}
  void lastError;throw new OperationError('evidence_cleanup_failed',503,'Kanıt dosyası güvenli biçimde temizlenemedi.');
}

export async function removeUnlinkedEvidence(items:UploadedEvidence[],parentId:string,purpose:EvidencePurpose){
  if(!items.length)return;
  const column=purpose==='complaint'?'complaint_id':purpose==='warranty'?'warranty_claim_id':'additional_cost_request_id';
  const db=adminSupabase();
  const {data,error}=await db.from('service_case_evidence').select('storage_path').eq(column,parentId);
  if(error)throw new OperationError('evidence_cleanup_check_failed',503,'Kanıt bağlantısı doğrulanamadı.');
  const linked=new Set((data??[]).map(item=>item.storage_path));
  const unused=items.filter(item=>!linked.has(item.path));
  if(unused.length)await removeUploadedEvidence(unused);
}

export async function caseEvidenceDownload(evidenceId:string,allowedRoles:readonly ('customer'|'technician'|'admin')[]){
  requireId(evidenceId);
  const {currentAccount}=await import('./account-supabase');
  const account=await currentAccount();
  if(!account||!allowedRoles.includes(account.role as 'customer'|'technician'|'admin'))throw new OperationError('forbidden',403,'Bu dosyaya erişemezsiniz.');
  const db=adminSupabase();
  const {data:evidence,error}=await db.from('service_case_evidence').select('id,complaint_id,warranty_claim_id,additional_cost_request_id,uploader_user_id,storage_path,original_file_name,mime_type').eq('id',evidenceId).maybeSingle();
  if(error)failDb(error,'Kanıt kaydı');if(!evidence)throw new OperationError('not_found',404,'Kanıt bulunamadı.');
  const purpose=evidence.complaint_id?'complaint':evidence.warranty_claim_id?'warranty':evidence.additional_cost_request_id?'additional_cost':null;
  const extension=EXT[evidence.mime_type];
  if(!purpose||!extension||!evidence.storage_path.startsWith(`stage10/${evidence.uploader_user_id}/${purpose}/`)||!evidence.storage_path.endsWith(`.${extension}`))
    throw new OperationError('not_found',404,'Kanıt bulunamadı.');
  let allowed=account.role==='admin';
  if(!allowed&&evidence.complaint_id===null&&evidence.uploader_user_id===account.id)allowed=true;
  if(!allowed&&account.role==='customer'&&evidence.warranty_claim_id){
    const {data,error:ownerError}=await db.from('service_warranty_claims').select('id').eq('id',evidence.warranty_claim_id).eq('customer_id',account.id).maybeSingle();if(ownerError)failDb(ownerError,'Kanıt sahipliği');allowed=Boolean(data);
  }
  if(!allowed&&account.role==='technician'&&evidence.additional_cost_request_id){
    const {data,error:ownerError}=await db.from('service_additional_cost_requests').select('id').eq('id',evidence.additional_cost_request_id).eq('technician_id',account.id).maybeSingle();if(ownerError)failDb(ownerError,'Kanıt sahipliği');allowed=Boolean(data);
  }
  if(!allowed)throw new OperationError('forbidden',403,'Bu dosyaya erişemezsiniz.');
  const {data,error:downloadError}=await db.storage.from('service-case-evidence').download(evidence.storage_path);
  if(downloadError||!data)throw new OperationError('download_failed',503,'Dosya indirilemedi.');
  return {blob:data,name:evidence.original_file_name,mime:evidence.mime_type};
}

export function caseEvidenceResponse(file:{blob:Blob;name:string;mime:string}){
  const name=file.name.replace(/[\r\n]/g,' ').slice(0,200)||'kanit';
  return new Response(file.blob.stream(),{headers:{
    'Content-Type':file.mime,'Content-Length':String(file.blob.size),
    'Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
    'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'",
  }});
}
