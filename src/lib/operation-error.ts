export class OperationError extends Error{
  constructor(public code:string,public status:number,message:string){super(message);}
}

export function operationErrorResponse(error:unknown){
  if(error instanceof OperationError)return {status:error.status,body:{error:error.message,code:error.code}};
  return {status:500,body:{error:'İşlem tamamlanamadı.',code:'operation_failed'}};
}
