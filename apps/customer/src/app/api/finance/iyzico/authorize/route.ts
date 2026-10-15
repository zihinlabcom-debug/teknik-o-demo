import {authorizeIyzicoSandboxIntent} from '@/lib/finance/iyzico/iyzico-stage12-actions';
import {assertIyzicoRequest,parseIyzicoAuthorizeBody,readIyzicoJson,requestIp} from '@/lib/finance/iyzico/iyzico-stage12-http';
import {iyzicoRouteError,iyzicoRouteResponse,publicOutcome} from '@/lib/finance/iyzico/iyzico-stage12-route';
export async function POST(request:Request){
  try{assertIyzicoRequest(request);const body=parseIyzicoAuthorizeBody(await readIyzicoJson(request));
    const result=await authorizeIyzicoSandboxIntent(body.intentId,body.paymentCard,requestIp(request));
    return iyzicoRouteResponse(publicOutcome(result),result.reconciliationRequired?202:200);
  }catch(error){return iyzicoRouteError(error);}
}
