import 'server-only';
import {adminSupabase} from '@/lib/account-supabase';
import {requireRole, failDb} from '@/lib/operation-guard';
import {OperationError} from '@/lib/operation-error';
import {assertSandboxEnabled,effectiveAuthorizationState,type FakeAuthInput} from './sandbox-contract';

/** Stage12 fake sandbox ONLY; never a real payment or customer charge. */
export async function authorizeAndReleaseFakePayment(input: FakeAuthInput) {
  assertSandboxEnabled(process.env);
  const account = await requireRole('customer');
  if (account.is_test !== true) throw new OperationError('test_customer_required', 403, 'Yalnızca test müşterisi kullanılabilir.');
  const db = adminSupabase();
  const {data:intent,error:intentError} = await db.from('finance_payment_intents')
    .select('id,service_request_id,provider,environment,purpose').eq('id',input.intentId).maybeSingle();
  if (intentError) failDb(intentError,'Finans kaydı');
  if (!intent || intent.provider !== 'fake' || intent.environment !== 'sandbox' || intent.purpose !== 'initial')
    throw new OperationError('intent_not_found',404,'Test ödeme kaydı bulunamadı.');
  const {data:request,error:requestError} = await db.from('service_requests')
    .select('id,customer_id,finance_gate_required').eq('id',intent.service_request_id).maybeSingle();
  if (requestError) failDb(requestError,'Talep kontrolü');
  if (!request || request.customer_id !== account.id || request.finance_gate_required !== true)
    throw new OperationError('intent_not_found',404,'Test ödeme kaydı bulunamadı.');

  // Only the SQL RPC can write payment state. A browser cannot set PAID/AUTHORIZED directly.
  const {data:auth,error:authError} = await db.rpc('finance_fake_authorize',{
    p_intent_id:intent.id,p_idempotency_key:input.idempotencyKey,p_approved:input.approve,
  });
  if (authError) {
    if(authError.message==='Authorization idempotency payload mismatch')
      throw new OperationError('authorization_conflict',409,'Aynı ödeme işlemi farklı bir sonuçla tekrar gönderilemez.');
    failDb(authError,'Sahte provizyon');
  }
  const currentState = effectiveAuthorizationState(auth);
  // A replayed declined request can observe a later authorized intent.
  // Decline is never permission to distribute, even in that case.
  if (!input.approve) {
    return {intentId:intent.id,
      paymentStatus:currentState==='authorized'?'authorized':currentState==='authorization_failed'?'authorization_failed':'requires_review',
      distributionStarted:false,
      reconciliationRequired:currentState!=='authorization_failed'};
  }
  if (currentState !== 'authorized') {
    // A replayed authorization might have been voided: never trust original outcome.
    return {intentId:intent.id,paymentStatus:currentState==='authorization_failed'?'authorization_failed':'requires_review',
      distributionStarted:false,reconciliationRequired:currentState!=='authorization_failed'};
  }
  const {data:release,error:releaseError} = await db.rpc('finance_release_fake_sandbox_request',{
    p_request_id:request.id,
  });
  if (releaseError) {
    // Authorization already succeeded. No second authorization/charge, require reconciliation.
    const {error:issueError}=await db.rpc('finance_record_reconciliation_issue',{
      p_request_id:request.id,p_intent_id:intent.id,p_code:'distribution_release_failed',
      p_detail:{source:'customer_api'},
    });
    if(issueError)failDb(issueError,'Finans mutabakat kaydı');
    return {intentId:intent.id,paymentStatus:'authorized',distributionStarted:false,
      reconciliationRequired:true};
  }
  if (!release || release.distributionStarted !== true || release.requestId !== request.id) {
    const {error:issueError}=await db.rpc('finance_record_reconciliation_issue',{
      p_request_id:request.id,p_intent_id:intent.id,p_code:'distribution_release_unconfirmed',
      p_detail:{source:'customer_api'},
    });
    if(issueError)failDb(issueError,'Finans mutabakat kaydı');
    return {intentId:intent.id,paymentStatus:'authorized',distributionStarted:false,
      reconciliationRequired:true};
  }
  return {intentId:intent.id,paymentStatus:'authorized',distributionStarted:true,
    reconciliationRequired:false,distributionCycleId:release.distributionCycleId};
}
