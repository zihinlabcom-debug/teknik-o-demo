import 'server-only';
import {adminSupabase} from '@/lib/account-supabase';
import {assertIyzicoStage12Environment} from '../../../../customer/src/lib/finance/iyzico/iyzico-stage12-contract';
import {createIyzicoStage12Server} from '../../../../customer/src/lib/finance/iyzico/iyzico-stage12-factory';

type Db=ReturnType<typeof adminSupabase>;
export type IyzicoCompletionContext=Readonly<{
  intentId:string;requestId:string;customerId:string;
}>;
export type IyzicoCaptureStatus=Readonly<{
  outcome:string;coreApplied:boolean;reconciliationRequired:boolean;errorCode?:string;
}>;

export async function prepareIyzicoJobCompletion(
  db:Db,jobId:string,technicianId:string,
):Promise<IyzicoCompletionContext|null>{
  const {data:job,error:jobError}=await db.from('service_jobs')
    .select('id,service_request_id,technician_id').eq('id',jobId).eq('technician_id',technicianId).maybeSingle();
  if(jobError||!job)throw new Error('iyzico_completion_job_scope_failed');
  const {data:intent,error:intentError}=await db.from('finance_payment_intents')
    .select('id,service_request_id,customer_id,provider,environment')
    .eq('service_request_id',job.service_request_id).eq('purpose','initial').maybeSingle();
  if(intentError)throw new Error('iyzico_completion_intent_scope_failed');
  if(!intent||intent.provider==='fake')return null;
  if(intent.provider!=='iyzico'||intent.environment!=='sandbox')
    throw new Error('iyzico_completion_provider_mismatch');
  assertIyzicoStage12Environment(process.env);
  return {intentId:intent.id,requestId:intent.service_request_id,customerId:intent.customer_id};
}

export async function captureCompletedIyzicoJob(
  db:Db,context:IyzicoCompletionContext,jobId:string,ip:string,
):Promise<IyzicoCaptureStatus>{
  try{
    const server=createIyzicoStage12Server();
    let outcome=await server.capture(context.intentId,context.customerId,{jobId,ip});
    if(outcome.result.outcome==='unknown'&&outcome.reconciliationRequired){
      try{outcome=await server.reconcile(context.intentId,context.customerId,outcome.result.operationId);}
      catch{/* Provider mutation is never replayed; unresolved state remains manual review. */}
    }
    return {outcome:outcome.result.outcome,coreApplied:outcome.coreApplied,
      reconciliationRequired:outcome.reconciliationRequired,errorCode:outcome.result.errorCode};
  }catch{
    try{await db.rpc('finance_iyzico_mark_manual_review',{
      p_intent_id:context.intentId,p_code:'iyzico_capture_orchestration_failed',
      p_detail:{source:'technician_completion'}});}catch{}
    return {outcome:'unknown',coreApplied:false,reconciliationRequired:true,
      errorCode:'capture_orchestration_failed'};
  }
}

export function requestIp(request:Request):string{
  const candidate=(request.headers.get('x-forwarded-for')?.split(',')[0]??
    request.headers.get('x-real-ip')??'127.0.0.1').trim();
  return /^[0-9a-fA-F:.]{2,64}$/.test(candidate)?candidate:'127.0.0.1';
}
