import {ownCaseInbox} from '@/lib/t111-case-server';
import {operationErrorResponse} from '@/lib/operation-server';
import {t100PublicError} from '../../../../../../../src/lib/t100-rpc';
export async function GET(){try{return Response.json(await ownCaseInbox(),{headers:{'Cache-Control':'no-store'}});}catch(e){const safe=t100PublicError(e);if(safe)return safe;const r=operationErrorResponse(e);return Response.json(r.body,{status:r.status,headers:{'Cache-Control':'no-store'}});}}
