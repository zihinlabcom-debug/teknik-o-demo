export type T103Funding={approvedMinor:number;securedMinor:number;fullySecured:boolean;parts:Array<{intentId:string;costId:string|null;purpose:'initial'|'additional';attempt:number;status:string;amountMinor:number;approvalVersion:number|null;secured:boolean;uncertain:boolean;canRetry:boolean}>};
export type T100Role='customer'|'technician'|'admin';
export type T100State={
 funding?:T103Funding;
 requestId:string;jobId:string|null;jobStatus:string|null;serverNow:string;
 policy:null|{action:'closed'|'cancel'|'review';version:string;feeMinor:number;points:number;amountMinor:number;startsAt:string|null};
 completion:null|{version:string;response:'pending'|'yes'|'no';resolution:string|null;deadline:string;voided_at:string|null;complaint_id:string|null};
 review:null|{status:string;complaintId:string|null};
 finalization:null|{id:string;action:string;state:string;amount:number;source:string};
 simulation:null|{mode:'simulation';bankTransfer:false;technicianMinor:number;platformMinor:number;totalMinor:number};
 complaint?:null|{id:string;status:string;purpose:string|null};
 preparation?:null|{code:string;blocked:boolean;retryAt:string|null};
 penaltyTotal:number|null;
};