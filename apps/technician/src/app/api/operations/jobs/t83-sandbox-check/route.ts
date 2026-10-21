import 'server-only';
import { NextResponse } from 'next/server';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { parseIyzicoSandboxConfig } from '../../../../../../../customer/src/lib/finance/iyzico/iyzico-config-contract';
import { createIyzicoAuthorization } from '../../../../../../../customer/src/lib/finance/iyzico/iyzico-signature';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 20;

function reply(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(request: Request) {
  if (
    process.env.APP_ENV !== 'staging' ||
    process.env.VERCEL_ENV !== 'preview' ||
    process.env.NEXT_PUBLIC_SUPABASE_URL !==
      'https://ygrvtndujbmeatexjdej.supabase.co' ||
    process.env.IYZICO_BASE_URL !==
      'https://sandbox-api.iyzipay.com' ||
    process.env.STAGE12_IYZICO_SANDBOX_ENABLED !== 'true' ||
    process.env.STAGE12_FAKE_FINANCE_ENABLED !== 'false'
  ) {
    return reply({ error: 'not_found' }, 404);
  }

  const token = process.env.HIZMETPEY_T83_VERIFY_TOKEN;

  if (!token || token.length < 32 || token.length > 256) {
    return reply({ error: 'not_found' }, 404);
  }

  const supplied = request.headers.get('authorization') ?? '';
  const actualHash = createHash('sha256').update(supplied).digest();
  const expectedHash = createHash('sha256')
    .update('Bearer ' + token)
    .digest();

  if (!timingSafeEqual(actualHash, expectedHash)) {
    return reply({ error: 'unauthorized' }, 401);
  }

  let config;

  try {
    config = parseIyzicoSandboxConfig(process.env);
  } catch {
    return reply({ verified: false, reason: 'invalid_config' }, 503);
  }

  const endpoint = '/payment/bin/check';
  const body = JSON.stringify({
    locale: 'tr',
    binNumber: '552608',
  });

  const nonce = Date.now().toString() +
    randomBytes(12).toString('hex');

  const signed = createIyzicoAuthorization(
    config, nonce, endpoint, body
  );

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Math.min(config.timeoutMs, 10000)
  );

  try {
    const response = await fetch(config.baseUrl + endpoint, {
      method: 'POST',
      cache: 'no-store',
      redirect: 'error',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        authorization: signed.authorization,
        'x-iyzi-rnd': signed.randomKey,
      },
      body,
    });

    const raw = await response.text();

    if (raw.length > 8192) {
      return reply({ verified: false, reason: 'response_too_large' }, 502);
    }

    let result: unknown;

    try {
      result = JSON.parse(raw);
    } catch {
      return reply({ verified: false, reason: 'invalid_response' }, 502);
    }

    if (!result || typeof result !== 'object' || Array.isArray(result)) {
      return reply({ verified: false, reason: 'invalid_response' }, 502);
    }

    const verified =
      response.ok &&
      (result as Record<string, unknown>).status === 'success';

    return reply({
      verified,
      environment: 'staging-preview',
      provider: 'iyzico-sandbox',
      operation: 'bin-check-only',
      checkedAt: new Date().toISOString(),
    }, verified ? 200 : 502);
  } catch {
    return reply({ verified: false, reason: 'sandbox_unreachable' }, 502);
  } finally {
    clearTimeout(timeout);
  }
}