import type { TechnicalKnowledge } from './technical-research';
import { normalizePartText } from './parts-catalog';

const source = {
  title: 'DemirDöküm Nitromix montaj ve bakım kılavuzu',
  url: 'https://www.demirdokum.com.tr/downloads/products-1/nitromix-mk-0020309469-02-2557204.pdf',
  revision: '0020309469_02 / 31.05.2021', reviewedAt: '2026-09-21',
};
// Manufacturer-reviewed scope; never reuse for another brand or Nitromix Ioni.
const records = {
  F22: { meaning: 'Tesisat basıncı düşük', causes: ['Su eksikliği', 'Basınç sensörü', 'Kablo veya bağlantı'], page: 31,
    questions: ['Ekranda görünen basınç değeri', 'Dışarıdan görülebilen su sızıntısı', 'Basıncın zamanla düşüp düşmediği'], parts: ['basınç sensörü', 'kablo/soket bağlantısı'] },
  F73: { meaning: 'Basınç sensörü sinyali düşük', causes: ['Sensör', 'Kabloda kısa devre veya kesinti'], page: 33,
    questions: ['Ekrandaki basınç değeri', 'Hatanın sürekli mi aralıklı mı olduğu'], parts: ['basınç sensörü', 'kablo/soket bağlantısı'] },
  F74: { meaning: 'Basınç sensörü sinyali yüksek', causes: ['Sensör', 'Kabloda kısa devre veya kesinti'], page: 33,
    questions: ['Ekrandaki basınç değeri', 'Hatanın sürekli mi aralıklı mı olduğu'], parts: ['basınç sensörü', 'kablo/soket bağlantısı'] },
  F76: { meaning: 'Termik kapatma düzeneği arızası', causes: ['Kablo kesintisi', 'Termik kapatma düzeneği'], page: 33,
    questions: ['Arızadan önce aşırı ısınma veya olağandışı ses gözlemi', 'Hatanın ilk görülme zamanı'], parts: ['kablo/soket bağlantısı', 'termik kapatma düzeneği', 'eşanjör'] },
};
export function lookupDiagnosticKnowledge(brand: string, model: string, code: string): TechnicalKnowledge | null {
  if (normalizePartText(brand) !== 'demirdokum' ||
      !/^nitromix(?: p ?(?:24|28|35)(?: ng(?: hep)?)?)?$/.test(normalizePartText(model))) return null;
  const key = code.toUpperCase().replace(/[.\s]/g, '');
  if (!Object.hasOwn(records, key)) return null;
  return { code: key, ...records[key as keyof typeof records], source, questionIds: key === 'F76' ? ['noise','overheating','onset','recurrence','trigger','affected'] : ['pressure','leak','recurrence','onset','affected'] };
}
