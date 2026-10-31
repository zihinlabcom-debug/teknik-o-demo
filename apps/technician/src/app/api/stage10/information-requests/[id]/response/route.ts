import {ownCaseAnswer} from '@/lib/t111-case-server';
import {parseStage10Json} from '@/lib/stage10-http';
import {operationErrorResponse} from '@/lib/operation-server';
import {assertT100Origin,t100PublicError} from '../../../../../../../../../src/lib/t100-rpc';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{assertT100Origin(request,process.env.EMAIL_AUTH_ORIGIN);const {id}=await params;return Response.json(await ownCaseAnswer(id,await parseStage10Json(request,12000)),{headers:{'Cache-Control':'no-store'}});}catch(e){const safe=t100PublicError(e);if(safe)return safe;const r=operationErrorResponse(e);return Response.json(r.body,{status:r.status,headers:{'Cache-Control':'no-store'}});}}
