export interface OMFInput { basePartPrice: number; fixedLabor: number }
export function calculateOMF(input: OMFInput) {
  if (![input.basePartPrice, input.fixedLabor].every(value => Number.isFinite(value) && value >= 0)) throw new Error('Invalid cost');
  const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
  const OMF = round(input.basePartPrice + input.fixedLabor);
  const risk = round(OMF * 0.20);
  const service = round(Math.max((OMF + risk) * 0.15, 300));
  return { breakdown: { OMF, risk, service, total: round(OMF + risk + service) }, warrantyDays: 90 };
}
