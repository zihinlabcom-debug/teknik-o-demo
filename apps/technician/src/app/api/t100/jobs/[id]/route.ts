import {technicianT100Cancel} from '@/lib/t100-server';
import {parseStage10Json} from '@/lib/stage10-http';
import {operationErrorResponse} from '@/lib/operation-server';
import {assertT100Origin,t100PublicError} from '../../../../../../../../src/lib/t100-rpc';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 try{assertT100Origin(request,process.env.EMAIL_AUTH_ORIGIN);const {id}=await params;const body=await parseStage10Json(request,4096);
 return Response.json(await technicianT100Cancel(id,body),{headers:{'Cache-Control':'no-store'}});
 }catch(error){const safe=t100PublicError(error);if(safe)return safe;const out=operationErrorResponse(error);return Response.json(out.body,{status:out.status,headers:{'Cache-Control':'no-store'}});}
}
