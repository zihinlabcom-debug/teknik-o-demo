/** Pure Stage12 sandbox contract. No client payment values are trusted. */
export const sandboxUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class FinanceInputError extends Error {
  readonly code: string;
  readonly statusCode: number;
  constructor(code: string, statusCode: number, message: string) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function assertSandboxEnabled(env: Record<string,string|undefined>): void {
  // Preview is mandatory on Vercel. Without Vercel metadata only an explicit
  // local development runtime may use the sandbox; production cannot fall back.
  const previewOrLocalDev = env.VERCEL_ENV === 'preview' ||
    (env.VERCEL_ENV === undefined && env.NODE_ENV === 'development');
  if (env.STAGE12_FAKE_FINANCE_ENABLED !== 'true' || env.APP_ENV !== 'staging' ||
      !previewOrLocalDev) {
    throw new FinanceInputError('sandbox_disabled', 404, 'Finans test ortamı kapalı.');
  }
  let project: URL;
  try {project = new URL(env.NEXT_PUBLIC_SUPABASE_URL || '');}
  catch {throw new FinanceInputError('sandbox_project_mismatch', 503, 'Test ortamı doğrulanamadı.');}
  const isolated = project.href === 'https://ysbaycbflopdmzwfhhnc.supabase.co/';
  const simulationOnly = env.T100_SIMULATION_ONLY === 'true';
  // The new TEST target is opt-in and mutually exclusive with provider execution.
  if (simulationOnly && (!isolated || env.STAGE12_IYZICO_SANDBOX_ENABLED !== 'false' ||
      env.T100_IYZICO_EXECUTION_ENABLED !== 'false'))
    throw new FinanceInputError('sandbox_provider_conflict', 503, 'Simülasyon sağlayıcısı doğrulanamadı.');
  if (!(isolated && simulationOnly) && project.hostname !== 'ygrvtndujbmeatexjdej.supabase.co')
    throw new FinanceInputError('sandbox_project_mismatch', 503, 'Test ortamı doğrulanamadı.');
}

/** An explicit true flag must never silently downgrade to legacy operations. */
export function isSandboxPendingRequestMode(env: Record<string,string|undefined>): boolean {
  const flag = env.STAGE12_FAKE_FINANCE_ENABLED;
  if (flag === undefined || flag === 'false') return false;
  assertSandboxEnabled(env);
  return true;
}

export type FakeAuthInput = Readonly<{intentId:string; idempotencyKey:string; approve:boolean}>;
export function parseFakeAuthorization(body: unknown): FakeAuthInput {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new FinanceInputError('invalid_body', 400, 'Geçersiz ödeme test isteği.');
  const o = body as Record<string,unknown>;
  const keys=Object.keys(o);
  if(keys.length!==3||keys.some(key=>!['intentId','idempotencyKey','approve'].includes(key)))
    throw new FinanceInputError('invalid_body',400,'Geçersiz ödeme test parametreleri.');
  if (typeof o.intentId !== 'string' || !sandboxUUID.test(o.intentId) ||
      typeof o.idempotencyKey !== 'string' || !/^[a-zA-Z0-9:_-]{8,128}$/.test(o.idempotencyKey) ||
      typeof o.approve !== 'boolean')
    throw new FinanceInputError('invalid_body', 400, 'Geçersiz ödeme test parametreleri.');
  return {intentId:o.intentId, idempotencyKey:o.idempotencyKey, approve:o.approve};
}

export function assertSameOrigin(requestUrl: string, origin: string | null): void {
  let sameOrigin = false;
  try {sameOrigin = origin !== null && new URL(origin).origin === new URL(requestUrl).origin;} catch {}
  if (!sameOrigin) throw new FinanceInputError('origin_denied',403,'İstek kaynağı doğrulanamadı.');
}

/** Treat only the CURRENT state as authoritative; a replay can return old success. */
export function effectiveAuthorizationState(value: unknown): 'authorized'|'authorization_failed'|'other' {
  if (!value || typeof value !== 'object') return 'other';
  const state = value as Record<string,unknown>;
  const current = typeof state.currentIntentStatus === 'string' ? state.currentIntentStatus : state.status;
  return current === 'authorized' ? 'authorized' : current === 'authorization_failed' ? 'authorization_failed' : 'other';
}
