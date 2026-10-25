import {customerT100Action,customerT100State} from '@/lib/t100-server';
import {parseStage10Json} from '@/lib/stage10-http';
import {operationErrorResponse} from '@/lib/operation-server';
import {assertT100Origin,t100PublicError} from '../../../../../../../../src/lib/t100-rpc';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 try{assertT100Origin(request,process.env.EMAIL_AUTH_ORIGIN);const {id}=await params;const body=await parseStage10Json(request,4096);
 return Response.json(await customerT100Action(id,body),{headers:{'Cache-Control':'no-store'}});
 }catch(error){const safe=t100PublicError(error);if(safe)return safe;const out=operationErrorResponse(error);return Response.json(out.body,{status:out.status,headers:{'Cache-Control':'no-store'}});}
}
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 try{const {id}=await params;return Response.json(await customerT100State(id),{headers:{'Cache-Control':'no-store'}});
 }catch(error){const safe=t100PublicError(error);if(safe)return safe;const out=operationErrorResponse(error);return Response.json(out.body,{status:out.status,headers:{'Cache-Control':'no-store'}});}
}
