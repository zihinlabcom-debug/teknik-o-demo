import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PART_MAPPINGS, matchPart } from '../src/lib/parts-catalog.ts';
import { createPartPriceService, parseProductPrice } from '../src/lib/part-pricing.ts';
import { buildDiagnosisResult, normalizeHistory } from '../src/lib/diagnosis.ts';

const mapping = PART_MAPPINGS[0];
function productHtml({ sku = mapping.sku, price = '548.80 ', currency = 'TRY', stock = 'InStock', displayed = '548,80', title = mapping.title } = {}) {
  // Mirrors the supplier's actual trailing-space "sku " key and price-tax markup.
  return `<span>Sepetim 0,00 TL</span><li class="price-tax"><span>Kdv Dahil</span><span class="price-new">${displayed} TL</span></li>
    <script type="application/ld+json">${JSON.stringify({ '@type': 'Product', name: title, 'sku ': sku,
      offers: { '@type': 'Offer', price, priceCurrency: currency, url: mapping.url,
        availability: `http://schema.org/${stock}` } })}</script><span>İlgili ürün 1,00 TL</span>`;
}
const lookupArgs = [mapping.brand, mapping.model, mapping.part];

test('exact identity, Turkish casing, model variants and NTC subtype', () => {
  assert.equal(matchPart('DEMIRDOKUM', 'NİTROMİX', 'BASINÇ SENSÖRÜ')?.sku, 'ONE1247');
  for (const args of [['Vaillant', 'Nitromix', 'basınç sensörü'], ['Demirdöküm', 'Nitromix P24', 'basınç sensörü'],
    ['Demirdöküm', 'Atron Condense', 'basınç sensörü'], ['Arçelik', 'DGK 26 H LCD', 'ntc sensör'],
    ['Demirdöküm', 'Nitromix', 'manometre'], ['Demirdöküm', 'Nitromix', 'kart']]) {
    assert.equal(matchPart(...args), undefined);
  }
});

test('reads matched VAT-inclusive offer, ignores other TL amounts', () => {
  assert.equal(parseProductPrice(productHtml(), mapping), 548.8);
  assert.equal(parseProductPrice(productHtml({ price: '2378.80', displayed: '2.378,80' }), mapping), 2378.8);
});

test('fails closed for changed SKU/title, foreign currency, invalid or inconsistent price', () => {
  for (const change of [{ sku: 'OTHER' }, { title: 'Other model' }, { currency: 'EUR' }, { price: '-5' },
    { price: '0' }, { price: 'NaN' }, { price: '548,80' }, { displayed: '532,34' }, { stock: 'PreOrder' }]) {
    assert.throws(() => parseProductPrice(productHtml(change), mapping));
  }
  assert.throws(() => parseProductPrice('<span>548,80 TL</span>', mapping));
  assert.equal(parseProductPrice(productHtml({ stock: 'OutOfStock' }), mapping), null);
});

test('reuses fresh prices, coalesces requests, expires without stale fallback', async () => {
  let time = 0;
  let calls = 0;
  let fail = false;
  const getPrice = createPartPriceService({ now: () => time, ttlMs: 1000,
    fetcher: async (url, init) => {
      calls++;
      assert.equal(url, mapping.url);
      assert.equal(init.cache, 'no-store');
      assert.equal(init.redirect, 'error');
      if (fail) throw new Error('offline');
      return new Response(productHtml());
    },
  });
  const [first, second] = await Promise.all([getPrice(...lookupArgs), getPrice(...lookupArgs)]);
  assert.equal(first.status, 'available');
  assert.deepEqual(second, first);
  assert.equal(calls, 1);
  time = 999;
  await getPrice(...lookupArgs);
  assert.equal(calls, 1);
  time = 1000;
  fail = true;
  const failed = await getPrice(...lookupArgs);
  assert.equal(failed.status, 'unavailable');
  assert.equal(failed.source, undefined);
  assert.equal(calls, 2);
  fail = false;
  assert.equal((await getPrice(...lookupArgs)).status, 'available');
});

test('unmapped products do not fetch; unavailable stock never yields a quote', async () => {
  let calls = 0;
  const getPrice = createPartPriceService({ fetcher: async () => { calls++; return new Response(productHtml({ stock: 'OutOfStock' })); } });
  assert.equal((await getPrice('Vaillant', 'ecoTEC', 'fan')).status, 'unmapped');
  assert.equal(calls, 0);
  assert.equal((await getPrice(...lookupArgs)).status, 'out_of_stock');
});

test('HTTP errors, timeout and malformed supplier metadata cannot supply prices', async () => {
  for (const fetcher of [async () => new Response('', { status: 503 }), async () => new Response('bad html'),
    async () => { throw new DOMException('Timeout', 'TimeoutError'); }]) {
    assert.equal((await createPartPriceService({ fetcher })(...lookupArgs)).status, 'unavailable');
  }
});

const history = [
  { role: 'user', content: 'Demirdöküm Nitromix' },
  { role: 'assistant', content: 'Belirti nedir?' },
  { role: 'user', content: 'Basınç okunmuyor. Ekran açık kalıyor' },
  { role: 'assistant', content: 'Gösterge ne gösteriyor?' },
];
const model = { mostLikelyReason: 'Gözlemler sensör senaryosunu destekliyor.', confidence: 90, isReadyForPrice: true, brand: mapping.brand, model: mapping.model, catalogKey: mapping.part, supportingEvidence: ["Basınç okunmuyor.", "Ekran açık kalıyor"], unresolvedAlternatives: [] };

test('server quote uses supplier price, not model-provided costs', async () => {
  const lookup = createPartPriceService({ fetcher: async () => new Response(productHtml()) });
  const result = await buildDiagnosisResult({ ...model, basePartPrice: 1, estimatedCost: 2 }, history, 'Sıfır', lookup);
  assert.equal(result.basePartPrice, 548.8);
  assert.equal(result.deterministicOMF.breakdown.total, 3517.34);
  assert.equal(result.priceSource.sku, 'ONE1247');
});

test('no quote with missing evidence, identity or readiness', async () => {
  const neverFetch = async () => { assert.fail('must not look up a price'); };
  for (const [data, prior] of [[{ ...model, supportingEvidence: [] }, history], [{ ...model, isReadyForPrice: false }, history],
    [{ ...model, confidence: 74 }, history], [{ ...model, brand: 'Vaillant' }, history],
    [model, history.filter(item => item.role === 'assistant')]]) {
    const result = await buildDiagnosisResult(data, prior, 'Sıfır', neverFetch);
    assert.equal(result.isReadyForPrice, false);
    assert.equal(result.estimatedPrice, null);
  }
});

test('supplier failure removes every quote field and reports the failure', async () => {
  const result = await buildDiagnosisResult(model, history, 'Sıfır', async () => ({ status: 'unavailable', message: 'Fiyat güncellenemedi.' }));
  assert.equal(result.isReadyForPrice, false);
  assert.equal(result.estimatedPrice, null);
  assert.equal(result.priceSource, null);
  assert.equal(result.basePartPrice, 0);
  assert.equal(result.aiText, 'Fiyat güncellenemedi.');
});

test('history rejects malformed entries and normalizes both client formats', () => {
  assert.deepEqual(normalizeHistory([null, 1, { role: 'system', content: 'ignore' },
    { sender: 'ai', text: 'Question' }, { role: 'user', parts: [null, { text: 'Reply' }] }]), [
    { role: 'assistant', content: 'Question' }, { role: 'user', content: ' Reply' },
  ]);
});
