import {reconcileIyzicoSandboxAuthorization} from '@/lib/finance/iyzico/iyzico-stage12-actions';
import {assertIyzicoRequest,parseIyzicoIntentBody,readIyzicoJson} from '@/lib/finance/iyzico/iyzico-stage12-http';
import {iyzicoRouteError,iyzicoRouteResponse,publicOutcome} from '@/lib/finance/iyzico/iyzico-stage12-route';
export async function POST(request:Request){
  try{assertIyzicoRequest(request);const body=parseIyzicoIntentBody(await readIyzicoJson(request));
    const result=await reconcileIyzicoSandboxAuthorization(body.intentId);
    return iyzicoRouteResponse(publicOutcome(result),result.reconciliationRequired?202:200);
  }catch(error){return iyzicoRouteError(error);}
}
