import { mkdir, writeFile } from 'node:fs/promises';

const scenarios = [
  {
    name: 'Nitromix basınç sondası', route: 'diagnose', expected: 'available',
    messages: [
      'Kombimde basınç göstergesi yanlış değer gösteriyor.',
      'Marka Demirdöküm, model etikette sadece Nitromix yazıyor.',
      'Yetkili servis harici manometreyle 1,5 bar ölçtü; cihaz ekranı 0 bar gösteriyor. Su kaçağı yok.',
      'Servis kablo ve soketi sağlam buldu, su basınç sondasının arızalı olduğunu ölçümle doğruladı. Basınç sondası değişimi için fiyat istiyorum.',
    ],
  },
  {
    name: 'Katalog dışı Vaillant', route: 'chat', expected: 'unmapped',
    messages: [
      'Vaillant ecoTEC plus kombim için elektronik kart değişim fiyatı istiyorum.',
      'Cihazın tam modeli ecoTEC plus VUW 246/5-5. Yetkili servis kart arızası tespit etti.',
      'Servis besleme ve bağlantıları kontrol etti; ana kartın arızalı olduğunu ölçümle doğruladı. Sadece bu kart için teklif istiyorum.',
    ],
  },
  {
    name: 'Stokta olmayan Arçelik fan', route: 'diagnose', expected: 'out_of_stock',
    messages: [
      'Arçelik DGK 26 H LCD kombimin fan motoru çalışmıyor.',
      'Yetkili servis fan motorunu kontrol etti. Besleme ve kablo sağlam, fan motoru arızalı.',
      'Servis motorun arızalı olduğunu ölçümle kesinleştirdi, değişim gerekiyor. Fan motoru değişimi için fiyat verir misiniz?',
    ],
  },
];

const results = [];
for (const scenario of scenarios) {
  const history = [];
  const turns = [];
  for (const [index, message] of scenario.messages.entries()) {
    const body = scenario.route === 'chat' ? { userMessage: message, history }
      : { message, chatHistory: history.map(item => ({ sender: item.role === 'assistant' ? 'ai' : 'user', text: item.content })) };
    const response = await fetch(`http://localhost:3000/api/${scenario.route}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });
    const data = await response.json();
    const reply = data.aiText ?? data.replyMessage ?? data.error;
    const ready = data.isReadyForPrice ?? data.isDiagnosisComplete ?? false;
    turns.push({ message, httpStatus: response.status, response: data });
    console.log(JSON.stringify({ scenario: scenario.name, turn: index + 1, httpStatus: response.status,
      reply, status: data.pricingStatus, ready, price: data.estimatedPrice ?? data.diagnosisDetails?.estimatedCost ?? null }));
    if (!response.ok) break;
    if (index < 2 && ready) process.exitCode = 1;
    history.push({ role: 'user', content: message }, { role: 'assistant', content: reply });
  }
  const last = turns.at(-1)?.response;
  const passed = last?.pricingStatus === scenario.expected;
  if (!passed) process.exitCode = 1;
  results.push({ name: scenario.name, route: scenario.route, expected: scenario.expected, passed, turns });
}
await mkdir('test-results', { recursive: true });
await writeFile('test-results/chat-live.json', JSON.stringify({ testedAt: new Date().toISOString(), results }, null, 2));
console.log(JSON.stringify({ passed: results.filter(result => result.passed).length, total: results.length }));
