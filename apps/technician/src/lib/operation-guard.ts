import 'server-only';
import {currentAccount} from './account-supabase';
import type {AccountRole} from './account-role';
import {OperationError} from './operation-error';

type DbError={message?:string}|null;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function requireRole(role:AccountRole){
  const account=await currentAccount();
  if(!account)throw new OperationError('unauthenticated',401,'Aktif oturum gerekli.');
  if(account.role!==role)throw new OperationError('forbidden',403,'Bu işlem için yetkiniz yok.');
  return account;
}
export function requireId(value:string){if(!uuid.test(value))throw new OperationError('invalid_id',400,'Geçersiz kayıt kimliği.');}
export function failDb(error:DbError,context:string):never{
  const raw=error?.message??'';
  if(/capacity reached/i.test(raw))throw new OperationError('capacity_reached',409,'Ustanın aktif iş kapasitesi dolu.');
  if(/closed for acceptance|already accepted|another quote|existing quote requires review|existing accepted price mismatch|existing request assessment mismatch/i.test(raw))
    throw new OperationError('conflict',409,'Kayıt artık kabul edilebilir durumda değil.');
  if(/not available|invalid job status|terminal job|not available to/i.test(raw))throw new OperationError('invalid_state',409,'İşlem mevcut durumda yapılamaz.');
  if(/not found/i.test(raw))throw new OperationError('not_found',404,'Kayıt bulunamadı.');
  throw new OperationError('operation_failed',500,`${context} tamamlanamadı.`);
}
