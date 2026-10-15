import {IyzicoError} from './iyzico-errors';

export const IYZICO_SANDBOX_ORIGIN = 'https://sandbox-api.iyzipay.com';

export type IyzicoSandboxConfig = Readonly<{
  apiKey: string;
  secretKey: string;
  baseUrl: typeof IYZICO_SANDBOX_ORIGIN;
  timeoutMs: number;
  maxResponseBytes: number;
}>;

function requireSandboxCredential(value: string|undefined, name: string): string {
  if (!value || !/^sandbox-[!-~]{8,240}$/.test(value)) {
    throw new IyzicoError('invalid_sandbox_credentials','configuration',false,
      `${name} için geçerli Sandbox kimlik bilgisi gerekli.`);
  }
  return value;
}

function positiveInteger(value: string|undefined, fallback: number, min: number, max: number): number {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(value))
    throw new IyzicoError('invalid_iyzico_limits','configuration',false,'iyzico güvenlik sınırı geçersiz.');
  const parsed=Number(value);
  if (!Number.isSafeInteger(parsed) || parsed<min || parsed>max)
    throw new IyzicoError('invalid_iyzico_limits','configuration',false,'iyzico güvenlik sınırı geçersiz.');
  return parsed;
}

export function parseIyzicoSandboxConfig(env: Record<string,string|undefined>): IyzicoSandboxConfig {
  let configured: URL;
  try { configured=new URL(env.IYZICO_BASE_URL || IYZICO_SANDBOX_ORIGIN); }
  catch { throw new IyzicoError('invalid_sandbox_origin','configuration',false,'iyzico Sandbox adresi geçersiz.'); }
  if (configured.origin !== IYZICO_SANDBOX_ORIGIN || configured.href !== `${IYZICO_SANDBOX_ORIGIN}/` ||
      configured.username || configured.password) {
    throw new IyzicoError('invalid_sandbox_origin','configuration',false,'Yalnız iyzico Sandbox adresine izin verilir.');
  }
  return Object.freeze({
    apiKey:requireSandboxCredential(env.IYZICO_SANDBOX_API_KEY,'API key'),
    secretKey:requireSandboxCredential(env.IYZICO_SANDBOX_SECRET_KEY,'Secret key'),
    baseUrl:IYZICO_SANDBOX_ORIGIN,
    timeoutMs:positiveInteger(env.IYZICO_TIMEOUT_MS,10_000,100,30_000),
    maxResponseBytes:positiveInteger(env.IYZICO_MAX_RESPONSE_BYTES,256_000,1_024,1_000_000),
  });
}
