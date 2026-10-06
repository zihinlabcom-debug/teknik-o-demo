import 'server-only';
import {currentAccount} from './account-supabase';
import {OperationError} from './operation-error';

export async function requireTechnicianManagementAccount(role:'admin'|'technician'){
  const account=await currentAccount();
  if(!account)throw new OperationError('unauthenticated',401,'Aktif oturum gerekli.');
  if(account.role!==role)throw new OperationError('forbidden',403,'Bu işlem için yetkiniz yok.');
  return account;
}

export function checkTechnicianManagement(error:{message?:string}|null,context:string){
  if(error)throw new OperationError('operation_failed',500,`${context} yüklenemedi.`);
}
