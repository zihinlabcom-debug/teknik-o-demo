/** T100 pure policy. Server/RPC must supply verified scope, current appointment and DB time. */
export type Role='customer'|'technician'|'admin';
export type JobStatus='assigned'|'in_progress'|'completed'|'cancelled';
export type Appointment={id:string;jobId:string;status:string;startsAt:string};
export type Scope={requestId:string;customerId:string;jobId:string|null;technicianId:string|null;
 jobStatus:JobStatus|null;requestStatus:string;amountMinor:number;appointments:readonly Appointment[]};
export class LifecycleError extends Error { constructor(public code:string){super(code);} }
function requireValue(ok:boolean,code:string):asserts ok {if(!ok)throw new LifecycleError(code);}
export function minorAmount(value:unknown):number{
 requireValue(typeof value==='string'&&/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/.test(value),'invalid_amount');
 const [whole,fraction='']=value.split('.');
 const result=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 requireValue(Number.isSafeInteger(result),'invalid_amount');return result;
}
export function splitApprovedPrice(amountMinor:number){
 requireValue(Number.isSafeInteger(amountMinor)&&amountMinor>0&&amountMinor<=999999999999,'invalid_amount');
 // BigInt prevents binary floating-point errors. Positive half-cent ties round up.
 const technicianMinor=Number((BigInt(amountMinor)*BigInt(70)+BigInt(50))/BigInt(100));
 return {amountMinor,technicianMinor,platformMinor:amountMinor-technicianMinor,
   mode:'simulation' as const,bankTransfer:false as const};
}
export function cancellationPolicy(scope:Scope,actor:{id:string;role:Role},now:string){
 requireValue(actor.role==='customer'&&actor.id===scope.customerId||
   actor.role==='technician'&&actor.id===scope.technicianId,'forbidden');
 requireValue(Number.isSafeInteger(scope.amountMinor)&&scope.amountMinor>=0,'invalid_amount');
 const time=Date.parse(now);requireValue(Number.isFinite(time),'invalid_server_time');
 if(scope.jobStatus==='completed'||scope.jobStatus==='cancelled'&&actor.role==='technician'||
   ['completed','cancelled','technician_unavailable'].includes(scope.requestStatus))
   return {action:'closed' as const,feeMinor:0,points:0,appointmentId:null};
 const active=(scope.jobStatus==='cancelled'?[]:scope.appointments).filter(a=>a.jobId===scope.jobId&&['scheduled','confirmed'].includes(a.status));
 requireValue(active.length<=1,'ambiguous_appointment');
 const appointment=active[0];
 const starts=appointment?Date.parse(appointment.startsAt):null;
 requireValue(starts===null||Number.isFinite(starts),'invalid_appointment');
 const reached=starts!==null&&time>=starts;
 // in_progress intentionally has NO effect on the locked appointment-time boundary.
 if(actor.role==='customer')return {action:reached?'review' as const:'cancel' as const,
   feeMinor:reached||!appointment?0:Math.min(10000,scope.amountMinor),points:0,appointmentId:appointment?.id??null};
 return {action:'cancel' as const,feeMinor:0,points:reached?10:5,appointmentId:appointment?.id??null};
}
export type Completion={jobId:string;technicianId:string;reportedAt:string;deadline:string;
 response:'pending'|'yes'|'no';source:null|'customer_yes'|'timeout'|'admin_distribute'|'admin_refund'};
export function reportCompletion(previous:Completion|null,jobId:string,technicianId:string,now:string):Completion{
 if(previous){requireValue(previous.jobId===jobId&&previous.technicianId===technicianId,'scope_conflict');return previous;}
 const stamp=Date.parse(now);requireValue(Number.isFinite(stamp),'invalid_server_time');
 return {jobId,technicianId,reportedAt:new Date(stamp).toISOString(),deadline:new Date(stamp+3600000).toISOString(),response:'pending',source:null};
}
export function completionDecision(current:Completion,action:'yes'|'no'|'timeout'|'admin_distribute'|'admin_refund',now:string):Completion{
 const time=Date.parse(now);requireValue(Number.isFinite(time),'invalid_server_time');
 const deadline=Date.parse(current.deadline);requireValue(Number.isFinite(deadline),'invalid_deadline');
 // Match the authoritative DB rule: a late response is a timeout, never an explicit customer Yes.
 if(current.source===null&&current.response==='pending'&&(action==='yes'||action==='no')&&time>=deadline)
  return {...current,source:'timeout' as const};
 const source=action==='yes'?'customer_yes':action==='no'?null:action;
 if(current.source!==null){requireValue(current.source===source,'resolution_conflict');return current;}
 if(action==='no'){requireValue(current.response!=='yes','resolution_conflict');return {...current,response:'no'};}
 if(action==='yes')requireValue(current.response!=='no','review_required');
 if(action==='timeout')requireValue(current.response==='pending'&&time>=Date.parse(current.deadline),'timeout_not_eligible');
 if(action.startsWith('admin_'))requireValue(current.response==='no','review_required');
 return {...current,response:action==='yes'?'yes':current.response,source};
}
export function simulateDistribution(input:{amountMinor:number;purpose:'service'|'cancellation_fee'|'refund';providerOutcome:'succeeded'|'declined'|'unknown';coreApplied:boolean}){
 requireValue(input.providerOutcome==='succeeded'&&input.coreApplied,'provider_not_verified');
 if(input.purpose==='refund')return {mode:'simulation' as const,technicianMinor:0,platformMinor:0,bankTransfer:false as const};
 if(input.purpose==='cancellation_fee'){
  requireValue(Number.isSafeInteger(input.amountMinor)&&input.amountMinor>0&&input.amountMinor<=10000,'invalid_cancellation_fee');
  return {mode:'simulation' as const,technicianMinor:0,platformMinor:input.amountMinor,bankTransfer:false as const};
 }
 return splitApprovedPrice(input.amountMinor);
}
