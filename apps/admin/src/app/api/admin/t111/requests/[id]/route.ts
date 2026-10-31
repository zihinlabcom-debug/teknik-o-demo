import {adminFinancialDetail} from '@/lib/t111-admin-read';
import {operationErrorResponse} from '@/lib/operation-server';
import {t100PublicError} from '../../../../../../../../../src/lib/t100-rpc';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){try{const {id}=await params;return Response.json(await adminFinancialDetail(id),{headers:{'Cache-Control':'no-store'}});}catch(e){const safe=t100PublicError(e);if(safe)return safe;const r=operationErrorResponse(e);return Response.json(r.body,{status:r.status,headers:{'Cache-Control':'no-store'}});}}
