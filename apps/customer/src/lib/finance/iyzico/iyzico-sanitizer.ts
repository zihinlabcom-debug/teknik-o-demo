const SAFE_KEYS=new Set([
  'provider','operation','operationId','endpoint','httpStatus','durationMs','errorCode','errorGroup',
  'retryable','paymentId','paymentTransactionId','conversationId','currency','amount','outcome',
  'signatureVerified','requestFingerprint',
]);
const SENSITIVE_KEY=/api.?key|secret|authorization|x-iyzi-rnd|card|pan|cvv|cvc|identity|email|phone|address|token/i;

function scrub(value:string,secrets:readonly string[]):string{
  let result=value;
  for(const secret of secrets)if(secret)result=result.split(secret).join('[REDACTED]');
  result=result.replace(/\b\d{12,19}\b/g,'[REDACTED]');
  return result.length>240?`${result.slice(0,240)}…`:result;
}

export function sanitizeIyzicoLog(
  value:Record<string,unknown>,secrets:readonly string[]=[]
):Record<string,unknown>{
  const safe:Record<string,unknown>={};
  for(const [key,raw] of Object.entries(value)){
    if(SENSITIVE_KEY.test(key)||!SAFE_KEYS.has(key))continue;
    if(typeof raw==='string')safe[key]=scrub(raw,secrets);
    else if(typeof raw==='number'||typeof raw==='boolean'||raw===null)safe[key]=raw;
  }
  return safe;
}
