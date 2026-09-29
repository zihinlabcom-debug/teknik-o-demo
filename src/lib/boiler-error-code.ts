// Explicit letter-number alternatives differ from numeric main/subcode records.
export const normalizeBoilerErrorCode = (value: string) => value.toUpperCase().replace(/[.\s-]/g, '');
const atomic = '(?:[A-Za-z]{1,3}[.\\s-]?\\d{1,3}|\\d{1,3}[A-Za-z]{1,2}(?:\\d{1,2})?|\\d(?:[. -]?\\d){0,3}|[A-Za-z]{2})';
const pattern = `${atomic}(?:\\s*/\\s*${atomic})*`;
export function isBoilerErrorCode(value: string) {
  return new RegExp(`^(?:${pattern})$`).test(value.trim()) && !/^(?:su|ve|bu|da|de|mi|mu|ya|yok)$/i.test(value.trim());
}
export function boilerCodeTokens(message: string) {
  return [...message.matchAll(new RegExp(`(?<![\\p{L}\\p{N}])${pattern}(?![\\p{L}\\p{N}])`, 'gu'))];
}
export function containsBoilerErrorCode(text: string, code: string) {
  if (!isBoilerErrorCode(code)) return false;
  const pattern = normalizeBoilerErrorCode(code).split('').map(char => char === '/' ? '(?:/|\\s+)' : char).join('[.\\s-]*');
  return new RegExp(`(?<![\\p{L}\\p{N}])${pattern}(?![\\p{L}\\p{N}])`, 'iu').test(text);
}
export function matchesBoilerErrorCode(recordCode: string | null, requestedCode: string) {
  if (!recordCode) return false;
  const record = normalizeBoilerErrorCode(recordCode), requested = normalizeBoilerErrorCode(requestedCode);
  if (record === requested) return true;
  const alternatives = record.split('/');
  return alternatives.length > 1 && alternatives.every(code => /^[A-Z]{1,3}\d{1,3}$/.test(code)) && alternatives.includes(requested);
}
