import 'server-only';

import {adminSupabase} from './account-supabase';
import {OperationError} from './operation-error';
import {requireId,requireRole} from './operation-guard';

export type AdminManualAssignmentCandidate={
  technician_id:string;
  name:string|null;
  is_available:boolean;
  active_job_count:number;
};

export async function adminManualAssignmentReady(serviceRequestId:string){
  requireId(serviceRequestId);
  await requireRole('admin');
  const {data,error}=await adminSupabase().rpc('admin_manual_assignment_ready',{
    p_request_id:serviceRequestId,
  });
  if(error)throw new OperationError('manual_assignment_unavailable',409,'Manuel atama durumu doğrulanamadı.');
  return data===true;
}

export async function adminManualAssignmentCandidates(serviceRequestId:string){
  requireId(serviceRequestId);
  const account=await requireRole('admin');

  const {data,error}=await adminSupabase().rpc('admin_manual_assignment_candidates',{
    p_service_request_id:serviceRequestId,
    p_admin_user_id:account.id,
  });

  if(error){
    throw new OperationError(
      'manual_assignment_unavailable',
      409,
      'Manuel atama şu anda kullanılamıyor.'
    );
  }

  return ((data??[]) as Array<{
    technician_id:string;
    name:string|null;
    is_available:boolean;
    active_job_count:number|string;
  }>).map(item=>({
    technician_id:item.technician_id,
    name:item.name,
    is_available:item.is_available===true,
    active_job_count:Number(item.active_job_count)||0,
  })) satisfies AdminManualAssignmentCandidate[];
}

export async function adminManualAssignServiceJob(
  serviceRequestId:string,
  technicianId:string,
  reason:string,
  idempotencyKey:string
){
  requireId(serviceRequestId);
  requireId(technicianId);
  requireId(idempotencyKey);

  const account=await requireRole('admin');
  const normalizedReason=reason.trim();

  if(normalizedReason.length<3||normalizedReason.length>500){
    throw new OperationError(
      'invalid_reason',
      400,
      'Atama gerekçesi 3 ile 500 karakter arasında olmalıdır.'
    );
  }

  const {data,error}=await adminSupabase().rpc('admin_manual_assign_service_job',{
    p_service_request_id:serviceRequestId,
    p_technician_id:technicianId,
    p_admin_user_id:account.id,
    p_reason:normalizedReason,
    p_idempotency_key:idempotencyKey,
  });

  if(error){
    throw new OperationError(
      'manual_assignment_failed',
      409,
      'Manuel atama mevcut durumda gerçekleştirilemedi.'
    );
  }

  if(typeof data!=='string'){
    throw new OperationError(
      'manual_assignment_failed',
      500,
      'Manuel atama sonucu doğrulanamadı.'
    );
  }

  return {jobId:data};
}
