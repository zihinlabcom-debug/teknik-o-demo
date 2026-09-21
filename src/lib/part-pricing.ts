import { matchPart, normalizePartText, type PartMapping } from './parts-catalog';

export interface PriceSource {
  sku: string;
  title: string;
  url: string;
  price: number;
  currency: 'TRY';
  vatIncluded: true;
  checkedAt: string;
  expiresAt: string;
}

export type PriceResult =
  | { status: 'available'; source: PriceSource; risk: number }
  | { status: 'unmapped' | 'out_of_stock' | 'unavailable'; message: string };

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined;
}

function productNodes(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.flatMap(productNodes);
  const node = record(value);
  if (!node) return [];
  const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
  return [...(types.includes('Product') ? [node] : []), ...productNodes(node['@graph'])];
}

// Read only the matched Product offer. Never scan the page for the first TL
// amount (cart totals, related products and bank-transfer discounts coexist).
export function parseProductPrice(html: string, mapping: PartMapping) {
  const products: Record<string, unknown>[] = [];
  for (const script of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { products.push(...productNodes(JSON.parse(script[1]))); } catch { /* Ignore unrelated malformed metadata. */ }
  }
  const matches = products.filter(product =>
    String(product.sku ?? product['sku '] ?? product.mpn).trim() === mapping.sku &&
    typeof product.name === 'string' && normalizePartText(product.name) === normalizePartText(mapping.title));
  if (matches.length !== 1) throw new Error('Product identity could not be verified');
  const offer = record(matches[0].offers);
  if (!offer || offer['@type'] !== 'Offer' || offer.priceCurrency !== 'TRY' || offer.url !== mapping.url) {
    throw new Error('Unverified product offer');
  }
  if (/\/OutOfStock$/.test(String(offer.availability))) return null;
  if (!/^https?:\/\/schema\.org\/InStock$/.test(String(offer.availability))) throw new Error('Unknown stock status');
  const rawPrice = String(offer.price).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(rawPrice)) throw new Error('Invalid price');
  const price = Number(rawPrice);
  if (!Number.isFinite(price) || price <= 0) throw new Error('Invalid price');

  // Cross-check against the displayed VAT-inclusive price, not a discounted offer.
  const taxBlock = html.match(/<li\b[^>]*class=["'][^"']*\bprice-tax\b[^"']*["'][^>]*>([\s\S]*?)<\/li>/i)?.[1];
  const taxText = taxBlock?.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ');
  const taxMatch = taxText?.match(/Kdv\s+Dahil\s+((?:\d{1,3}(?:\.\d{3})+|\d+),\d{2})\s+TL/i);
  if (!taxMatch || Math.abs(Number(taxMatch[1].replace(/\./g, '').replace(',', '.')) - price) > 0.001) {
    throw new Error('VAT-inclusive price could not be verified');
  }
  return price;
}

export function createPartPriceService(options: {
  fetcher?: typeof fetch; now?: () => number; ttlMs?: number;
} = {}) {
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? Date.now;
  const ttl = options.ttlMs ?? 15 * 60 * 1000;
  const cache = new Map<string, { expires: number; result: PriceResult }>();
  const pending = new Map<string, Promise<PriceResult>>();

  return async function getPrice(brand: string, model: string, part: string): Promise<PriceResult> {
    const mapping = matchPart(brand, model, part);
    if (!mapping) return { status: 'unmapped', message: 'Bu marka, model ve parça için doğrulanmış ürün eşleşmesi bulunamadı. Fiyat teklifi oluşturulmadı.' };
    const key = mapping.url;
    const cached = cache.get(key);
    if (cached && cached.expires > now()) return cached.result;
    cache.delete(key); // Expired quotes must never be served when refresh fails.
    const inFlight = pending.get(key);
    if (inFlight) return inFlight;
    const request = (async (): Promise<PriceResult> => {
      try {
        const response = await fetcher(mapping.url, {
          cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000),
          headers: { Accept: 'text/html' },
        });
        if (!response.ok) throw new Error('Supplier request failed');
        const price = parseProductPrice(await response.text(), mapping);
        if (price === null) return { status: 'out_of_stock', message: 'Eşleşen parça kaynak sitede stokta yok. Fiyat teklifi oluşturulmadı.' };
        const checked = now();
        const result: PriceResult = {
          status: 'available', risk: mapping.risk,
          source: { sku: mapping.sku, title: mapping.title, url: mapping.url, price,
            currency: 'TRY', vatIncluded: true, checkedAt: new Date(checked).toISOString(),
            expiresAt: new Date(checked + ttl).toISOString() },
        };
        cache.set(key, { expires: checked + ttl, result });
        return result;
      } catch {
        return { status: 'unavailable', message: 'Parçanın güncel fiyatı doğrulanamadı. Lütfen daha sonra yeniden deneyin; fiyat teklifi oluşturulmadı.' };
      }
    })();
    pending.set(key, request);
    try { return await request; } finally { pending.delete(key); }
  };
}

// Process-local cache: restarts/other server instances start with an empty cache.
// Only imported by server-side diagnosis code.
export const getPartPrice = createPartPriceService();
