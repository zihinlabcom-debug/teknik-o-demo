import { PART_MAPPINGS } from '../src/lib/parts-catalog.ts';
import { getPartPrice } from '../src/lib/part-pricing.ts';

// Read-only live supplier smoke check. No OpenAI call or credentials required.
for (const product of PART_MAPPINGS) {
  const result = await getPartPrice(product.brand, product.model, product.part);
  console.log(product.sku, result.status, result.status === 'available' ? `${result.source.price} TRY` : result.message);
  if (result.status === 'unavailable' || result.status === 'unmapped') process.exitCode = 1;
}
