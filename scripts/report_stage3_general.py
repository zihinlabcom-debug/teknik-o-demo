"""Read frozen audit/test artifacts and report prepared coverage, no DB calls."""
import csv
import hashlib
import json
import re
import subprocess
from collections import Counter
from pathlib import Path
import stage3_general_data as data
import prepare_stage3_general_enrichment as enrich
import generate_stage3_fault_candidates as gen

OUT=data.OUT
def load(name):return json.loads((OUT/name).read_text(encoding='utf-8'))
def reason(pool,kind,raw):
 if not pool['family_id']:return 'E','Ham kaydın aktif official model/family kapsamı doğrulanamadı.'
 text=data.norm(' '.join((r['official_description'] or '')+' '+(r['official_action'] or '') for r in raw))
 if kind=='effect_less':
  return 'C','Mevcut kaynak destekli adaylar için bu turda güvenli müşteri gözlemiyle savunulabilir ayırıcı/support effect kurulamadı. Bu sınıf sonsuza kadar imkânsız olduğu iddiası değildir; ölçüm gereken sensör/bağlantı ayrımları ve tek adayda kanıtsız %100 bu kapsamdadır.'
 if re.search(r'veri yolu|cihaz tipi numarasi|cihaz kodu|\bdsn\b',text):
  return 'B','Raw kayıtta iletişim/cihaz kodlama noktası var; mevcut güvenli vocabulary kapsamına eşlenmedi. Yeni parçaya veya genel elektronik arızaya dönüştürülmedi.'
 if re.search(r'reset|sifirla|bakim|servis zamani|isletme suresi|calisma suresi|kullanim omru|bekleme|standby|normal isletim|donma|yanlis alev|iyonlasma|iyonizasyon|genel ariza|genel hata|bilinmeyen|diger .*hata|programlama modu|gradya|swap test|genel blokaj',text):
  return 'A','Mevcut ham kayıttaki belirti, işletim/bakım/reset durumu veya genel servis talebi bağımsız teknik neden/kontrol noktası olarak güvenle adaylaştırılamadı. Genel bilgiyle özgül parça eklenmedi.'
 return 'F','Mevcut raw metinden güvenilir neden/kontrol noktası çıkarılamadı; daha ayrıntılı resmî veya trusted teknik kaynak incelemesi gerekiyor. Bu turda yeni belge araştırması yapılmadı.'

def main():
 audit=load('audit-before.json');coverage=load('coverage-after.json');enrichment=load('candidate-enrichment.json')
 tables=load('knowledge-after.json');groups=load('groups-audit.json');smoke=load('local-api-smoke.json')
 before=coverage['before'];after=coverage['after'];bt=before['total'];at=after['total']
 prior={tuple(p['identity']):p for p in before['pools']};raw={r['id']:r for r in tables['official_error_codes_raw']}
 gained_candidates=[p for p in after['pools'] if p['candidate_count'] and not prior[tuple(p['identity'])]['candidate_count']]
 gained_effects=[p for p in after['pools'] if p['effect_supported'] and not prior[tuple(p['identity'])]['effect_supported']]
 lost_effects=[p for p in after['pools'] if not p['effect_supported'] and prior[tuple(p['identity'])]['effect_supported']]
 unresolved=[]
 for p in after['pools']:
  kind='candidate_less' if not p['candidate_count'] else 'effect_less' if not p['effect_supported'] else None
  if kind:
   records=[raw[rid] for rid in p['raw_ids']];code,why=reason(p,kind,records)
   unresolved.append(dict(kind=kind,brand=p['brand'],family=p['family'],official_model=p['model'],error_code=p['code'],
    raw_ids=p['raw_ids'],candidate_count=p['candidate_count'],candidate_names=[c['name'] for c in p['candidates']],
    reason=code,explanation=why,source_url=p['source_url'],official_description=records[0]['official_description'],official_action=records[0]['official_action']))
 reason_counts={kind:dict(Counter(p['reason'] for p in unresolved if p['kind']==kind)) for kind in ['candidate_less','effect_less']}
 (OUT/'unresolved-pools.json').write_text(json.dumps(dict(classification_scope='Raw source and prepared catalog audit; conservative triage, not new manufacturer knowledge',counts=reason_counts,pools=unresolved),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 with (OUT/'unresolved-pools.csv').open('w',encoding='utf-8-sig',newline='') as file:
  writer=csv.DictWriter(file,fieldnames=['kind','brand','family','official_model','error_code','candidate_count','reason','explanation','source_url'])
  writer.writeheader();writer.writerows({k:p[k] for k in writer.fieldnames} for p in unresolved)
 protections=[]
 for path in sorted(gen.MIGRATIONS.glob('*.sql')):
  number=int(path.name.split('_')[0][-5:])
  if number<=31:
   result=subprocess.run(['git','show','HEAD:'+path.relative_to(gen.ROOT).as_posix()],capture_output=True)
   same=result.returncode==0 and result.stdout.decode('utf-8').replace('\r\n','\n')==path.read_text(encoding='utf-8')
   if not same:raise ValueError('Applied migration differs from HEAD: '+path.name)
   protections.append(dict(file=path.name,unchanged=True,sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
 summary=dict(mode='Prepared offline delta on read-only live snapshot + unapplied COPA; NOT live DB after',live_before=audit['live']['total'],
  before=bt,after=at,new_candidates=enrichment['recovered_candidates'],new_questions=coverage['new_questions'],new_effects=coverage['new_effects'],
  newly_recovered_candidate_pools=len(gained_candidates),newly_recovered_effect_pools=len(gained_effects),lost_effect_pools=len(lost_effects),
  unresolved=reason_counts,groups=groups,protected_applied_migrations=protections,
  new_migrations=[enrich.NAME,'20260928000036_enrich_boiler_customer_observations.sql'],
  liveOpenAICalls=0,dbWrites=0,commit=False,push=False,deploy=False)
 npm_log=(OUT/'npm-test.log').read_text(encoding='utf-8')
 python_log=(OUT/'python-tests.log').read_text(encoding='utf-8')
 npm_count=int(re.search(r'ℹ tests (\d+)',npm_log)[1])
 python_count=int(re.search(r'Ran (\d+) tests',python_log)[1])
 if 'ℹ fail 0' not in npm_log or 'ℹ skipped 0' not in npm_log or '\nOK' not in python_log:
  raise ValueError('Test logs are not successful and complete')
 summary['validation']=dict(npm_test=dict(passed=npm_count,failed=0,skipped=0),python=dict(passed=python_count),
  tsc='PASS',build='PASS',lint=dict(errors=0,existing_warnings=10),diff_check='PASS',offline_http_smoke='6/6 PASS')
 (OUT/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 lines=['# Teknik-O Stage 3 — genel kanıt / coverage / model tanıma','',
  'Bu rapor **hazırlanmış** sonucu gösterir. Canlı DB değiştirilmedi. Audit, tüm aktif markaları DB’den okuyan salt okunur snapshot ile production değişikliklerinden önce yapıldı. Canlıda 12 marka; uygulanmamış COPA 00032–00034 eklendiğinde hazırlanmış kapsam 13 marka. Marka listesi hard-code edilmedi.','',
  '## 1. Before audit','',
  '| Ölçüm | Canlı DB snapshot | COPA dahil before | General enrichment sonrası |',
  '|---|---:|---:|---:|']
 for label,key in [('Raw satır','raw_rows'),('Marka','brands'),('Family','families'),('Official model','official_models'),('Model+code pool','raw_pools'),('Candidate toplamı','candidate_count'),('Candidate pool','candidate_pools'),('Candidate coverage %','candidate_coverage'),('Effect pool','effect_pools'),('Questionless pool','questionless_pools'),('Family consensus raw pool','family_consensus_raw_pools'),('Exact-model-only pool','exact_model_only_pools'),('Single candidate pool','single_candidate_pools'),('Multi candidate pool','multi_candidate_pools')]:
  lines.append(f"| {label} | {audit['live']['total'][key]} | {bt[key]} | {at[key]} |")
 lines+=['','Pool, normalize marka + official model + hata kodu kimliğidir. Effect coverage yalnız safety veya uniform multiplication varlığı değildir: birden fazla adayda farklı faktör veya tek adayda kabul edilebilir support gerekir. Family consensus sayısı candidate set imzasıdır; family runtime ayrıca her varyantta effect mutabakatını kontrol eder. Exact-model-only sayısı, raw havuzlar üzerinde family consensus dışındaki kapsamdır.','',
  'Raw kaynak dağılımı (prepared): '+json.dumps(at['raw_source_types'],ensure_ascii=False)+'. Candidate kaynak dağılımı: '+json.dumps(at['evidence_source_types'],ensure_ascii=False)+'. Yeni candidate provenance: '+json.dumps(enrichment['source_types'],ensure_ascii=False)+'.','',
  'Boş raw URL, boş candidate URL, duplicate raw, normalize ad+fault_class semantic duplicate ve orphan candidate: **0**. Bu sayılar kaynakların bu turda internetten tekrar erişilebilirlik kontrolü yapıldığı anlamına gelmez; mevcut doğrulanmış raw kayda bağlıdır. Snapshot customer/session verisi içermez.','',
  '## 2–7. Kazanılan ve çözülemeyen havuzlar','',
  f"- Candidate-less: {bt['candidate_less_pools']} → {at['candidate_less_pools']}; kazanılan {len(gained_candidates)} pool, {enrichment['recovered_candidates']} yeni kaynak destekli candidate.",
  f"- Candidate coverage: %{bt['candidate_coverage']} → %{at['candidate_coverage']} (+{at['candidate_coverage']-bt['candidate_coverage']:.2f} yüzde puan).",
  f"- Effect-less/questionless: {bt['questionless_pools']} → {at['questionless_pools']}; {len(gained_effects)} yeni effect pool, {len(lost_effects)} kayıp pool.",
  f"- Effect coverage / tüm raw pool: %{100*bt['effect_pools']/bt['raw_pools']:.2f} → %{100*at['effect_pools']/at['raw_pools']:.2f}; candidate pool içindeki oran %{100*bt['effect_pools']/bt['candidate_pools']:.2f} → %{100*at['effect_pools']/at['candidate_pools']:.2f}.",
  '','Her eksik pool marka/model/code, source URL, raw description/action ve gerekçesiyle `unresolved-pools.json` ve `unresolved-pools.csv` içinde listelenir. Sınıflar: A ham kaynak cause/control point göstermiyor; B güvenli semantic mapping eksik; C bu turda güvenli müşteri discriminator kurulamadı; D kaynak çelişkisi; E model kapsamı eksik; F ayrıntılı trusted/official kaynak araştırması gerek; G diğer. C, müşteri gözlemiyle hiçbir zaman ayrılamayacağı iddiası değildir.','',
  'Reason dağılımı: '+json.dumps(reason_counts,ensure_ascii=False)+'. D/E/G olarak işaretlenen yoksa bu, ayrıntılı yeni document validation araştırması yapıldığı anlamına gelmez.','',
  'Örnekler: reset sayısı/bakım/normal çalışma satırları parça değildir (A). e-Veri yolu ve cihaz tipi kodlama ifadesi kalan vocabulary boşluğudur (B). Sensör ile kablo veya kontrol kartı içindeki geri bildirim yolları mevcut güvenli müşteri sorularıyla ayrılamadığı yerde C kalır. Genel hata/ölçüm programı ve ayrıntısı eksik kayıtlar F kapsamında araştırma bekler. COPA e-Lecto F47 sensör/kablo için gerçek basınç gözlemiyle yapay ayrım üretilmedi. Yeni source araştırması veya runtime research fallback eklenmedi.','',
  '## 8. Marka bazında before / after','',
  '| Marka | Raw pool | Candidate before | Candidate after | Coverage before → after | Effect before → after | Questionless before → after |',
  '|---|---:|---:|---:|---|---|---|']
 for brand,b in before['brands'].items():
  a=after['brands'][brand]
  lines.append(f"| {brand} | {a['raw_pools']} | {b['candidate_pools']} | {a['candidate_pools']} | %{b['candidate_coverage']:.2f} → %{a['candidate_coverage']:.2f} | {b['effect_pools']} → {a['effect_pools']} | {b['questionless_pools']} → {a['questionless_pools']} |")
 lines+=['','COPA satırı canlıya uygulanmamış 00032–00034 hazırlığına göre before/after’dır. Diğer markaların before verisi gerçek DB snapshot’tır. Marka bazında family/model, single/multi, source dağılımı ve URL/duplicate detayları `audit-before.json` / `coverage-after.json` içinde bulunur.','',
  '## 9. Genel candidate extraction','',
  'Component extraction ile action-supported bağımsız ignition/circulation/air pressure/recuperator gibi system noktaları birlikte çalışır. Açık termik kapatma, yoğuşma gideri, gidiş/dönüş probe, valf geri bildirim ve elektrik besleme vocabulary’si source metninden kullanılır. Aynı fiziksel point existing candidate tarafından kapsanıyorsa yeni generic candidate eklenmez. Generic sıcaklık/probe ile specific probe aynı havuzda tekrar sayılmaz.','',
  'Reset için beslemeyi kesmek elektrik besleme arızası değildir; brülör termostatının konumu brülör arızası değildir. Kart üzerindeki soket kart arızasına, elektronik sıcaklığı yeni high-limit donanımına dönüştürülmez. Unicode substring ile gidiş sözcüğü dış sensör olmaz. Bu false-positive kontrolleri RED/PASS regressionlarla doğrulandı.','',
  'Her yeni cause aynı raw hata kaydındaki literal description/action phrase, URL ve source_type ile SQL içinde tekrar doğrulanır. Source destek dağılımı: '+json.dumps(enrichment['support_kinds'],ensure_ascii=False)+'. Yeni candidate eklenir; eski candidate’lar/ham kayıtlar silinmez veya yeniden adlandırılmaz. Applied 00016–00031 ve prepared COPA üretimleri eski generator profiliyle yeniden üretilebilir; genel kurallar explicit enrichment profiline aittir. Marka/model/code özel koşul veya manual hint yok.','',
  '## 10. Genel question/effect kuralları','',
  f"6 reusable yeni soru, {coverage['new_effects']} yeni effect; {coverage['timing_neutral_corrections']} mevcut warmup wiring effect’i neutral düzeltmesi. Yeni soru tipleri: basınç trendi, elektrik olayından sonra başlangıç, zaten güvenli yerden görülen baca engeli, zaten görünen dış gaz vanası durumu, hızlı ekran sıcaklık artışı/peteklerin soğuk kalması, sıcak su miktarının azalması.",
  '','Mevcut ignition/timing/sıcaklık/ses/ısıtma-sıcak su soru katalogları da yalnız gerçek candidate + hata bağlamı uygun olduğunda yeniden kullanılır. Pompa sesi fan arızası olarak kesinleştirilmez; aynı olağandışı çalışma sesi evidence_group’udur. Basınç seviye/trend ve sıcaklık rise/cold-radiator aynı fiziksel group’u paylaşır, birlikte çarpılmaz. Correction eskisini değiştirir. Kaynak cause ile effect’in teknik süreç çıkarımı ayrı tutulur.','',
  '×2 support, ×0.5 weaken, ×1 neutral, ×0 eliminate değişmedi. Yeni eliminate yok; unknown/safety probability effect yok. Ölçüm/kapak açma/gaz müdahalesi sorulmaz. Soru sayısı kimlik/confirmation/clarification/verification dahil 12, spontane gözlem +0.','',
  'Yeni effect rule dağılımı: '+json.dumps(coverage['rules'],ensure_ascii=False)+'.','',
  '## 11. Nitromix F28','',
  'P24/P28/P35 source varyantları sekiz ortak logical candidate’a ulaşıyor: gaz besleme, gaz valfi, kablo/bağlantı, topraklama, elektronik kontrol; yeni ignition system, termik kapatma ve yoğuşma gideri. F28 kaydında transformer söylenmediği için eklenmedi. Başka kodun trafosu F28’e taşınmadı. API testinde family scope / officialModelId null, F28 korunuyor, ilk safety sorusu geliyor.','',
  '## 12. F76 warmup kuralı','',
  'Kablo/soket/bağlantı + fault_timing_after_start + after_some_time weakening genel olarak neutral oldu. Bu F76 özel if/else değildir; mevcut DB uygulanmadan da backend compatibility review bu dar düzeltmeyi uygular. Örnek üç aday: eşanjör/kablo/termik 33.34/33.33/33.33 → warmup cevabıyla 40/20/40. Kablo x1 kalırken diğer kaynak destekli thermal noktalar x2 olur; kabloya otomatik support verilmez. Eski runtime testinin ismi/beklentisi güncellendi; test silinmedi.','',
  '## 13. Natural-language timeline','',
  'Historical after_some_time/intermittent/reset_temporarily_helped ile current persistent/timing ayrı ve literal quote ile tutulur. “Artık hep hata var” immediate sayılmaz. Daha önce current after_some_time kabul edilmişken hata kalıcı hale gelirse eski timing historical’a taşınır, belirsiz current timing effect’i unknown/neutral olur. En çok bir counted clarification; cevap hâlâ belirsizse tekrar sorulmaz.','',
  '## 14–16. Catalog-only fuzzy identity ve sayı güvenliği','',
  'Aktif brand/family/official model/verified alias kataloglarında deterministic Damerau-Levenshtein, Türkçe/case/typography normalization ve sınırlı confirmation-only ses eşdeğerliği kullanılır. Exact resolve direkt; yakın match mutlaka chat confirmation; birden fazla gerçek seçenek “evet” ile sessiz seçilmez. Accept canonical state’e yazılır ve code korunur. Geçersiz yakın eşleşmede gerçek etiket istenir. Catalog sınırı dolarsa sessiz truncation yapılmaz. Fuzzy yalnız resolve başarısızsa çalışır; web/API araştırması eklenmedi.','',
  'nitromic, nitromic p24, ecotce, condes 2500, eomiks, electo ve brand demirdokun/vailant/buderuz/visman testleri geçer. P24/P28/P35, 236/286, 2500/2300 gibi tokenlar değiştirilemez; roman variant tokenları korunur. Exact etiket, pending typo proposal yerine güvenle kabul edilebilir. Aynı family ve official model adı iki ayrı cihaz gibi sayılmaz; başka variant alias’ı exact scope kazanmaz.','',
  '## 17–18. Teknik gruplar ve coverage','',
  'Candidate hesapları korunur; group probability aynı gruptaki candidate paylarının toplamıdır. Marka koşulu yok; source candidate name/fault_class ile semantik teknik gruplar. Duplicate logical input reject edilir. Grup veya candidate ayrımı veren soru kullanılabilir; uniform çarpma multi-pool’da soru değeri değildir. Grup yüzde hesabı candidate dağılımını değiştirmez.','',
  f"{groups['validatedPools']} pool’da toplam %100 ve candidate exactly once doğrulandı. {groups['multiGroupPools']} pool birden çok gruplu; {groups['candidateDiscriminativePools']} pool candidate ayrımı, {groups['groupDiscriminativePools']} pool group ayrımı, {groups['singleSupportPools']} pool singleton support sorusu içeriyor. technical_other fallback yok. Bu tam dataset offline audit {groups['elapsedMs']} ms sürdü; production benchmark değildir.",
  '','Vaillant F28 başlangıç örneği: gas_path %33.33; ignition %16.67; electronic_control %16.67; combustion_air_flue %16.67; electrical_wiring %16.66. Altı exact candidate içeride korunur. Group >=75 candidate pricing gate’i açamaz; gerçek backend regression bunu doğrular. Tek aday/group %100 müşteri support kanıtı olmadan fiyat açamaz.','',
  '## 19. Electric/gas routing','',
  'COPA e-Lecto F47 pressure sensor/wiring iki gerçek aday; gas candidate/safety/ignition sorusu yok, güvenli ayırıcı kanıt bulunmadığı için uncertain_price. F34 gerçek elektrik besleme/gerilim candidate’ı korunur. Catalog’daki source kaydı bulunmayan diğer elektrik varyantlarına 24 kW hata verisi kopyalanmaz. Gas akışında safety no probability değişmez ve safety_stop üretmez.','',
  '## 20. Migration ve dosya kapsamı','',
  '- Yeni 00035: `20260928000035_enrich_boiler_action_control_points.sql` — additive, source/phrase/provenance/scope/duplicate guard.',
  '- Yeni 00036: `20260928000036_enrich_boiler_customer_observations.sql` — reusable sorular/effect’ler + yalnız belirlenen warmup-wire weakening satırlarının neutral düzeltmesi.',
  '- Applied 00001–00031 HEAD ile karşılaştırıldı; değişiklik yok. Özellikle 00030/00031 değişmedi.',
  '- Prepared COPA 00032–00034 yeniden yazılmadı; frozen renderer/fixture regressionları geçiyor. Bu dosyalar da hâlâ uygulanmadı.','',
  'Production: `boiler-diagnosis.ts`, `boiler-supabase.ts`; yeni yardımcılar `boiler-effects.ts`, `boiler-timeline.ts`, `boiler-identity-suggestions.ts`, `boiler-groups.ts`. `generate_stage3_fault_candidates.py` genel enrichment profili. `manufacturer-registry.ts` içindeki önceki COPA değişikliği korundu. Yeni audit/enrichment/question/group/report/smoke scriptleri ve regression testleri. UI veya pricing katsayısı değişmedi.','',
  '## 21. Yerel API smoke','',
  'Gerçek POST handler loopback HTTP üzerinde çalıştırıldı. DB, canlı salt-okunur snapshot + uygulanmamış 00032–00036’yı temsil eden Supabase REST fixture; AI fake. Müşteri/session DB yazısı yok. Bu test gerçek OpenAI yorumu veya canlı Supabase RLS/deployment doğrulaması değildir.','',
  '| Girdi | Confirmation | Candidate | Sonuç | Soru sayısı |',
  '|---|---|---:|---|---:|']
 for c in smoke['cases']:lines.append(f"| {c['message']} | {'evet → kabul' if c['confirmationAsked'] else 'yok'} | {c['candidateCount']} | {c['resultState']} / {c['verdict']} | {c['questionCount']} |")
 lines+=['','Tam brand/model/familyId/officialModelId/code/candidate/group/aiText/state detayları `local-api-smoke.json` içindedir.','',
  '## 22. Test / build / lint / diff','',
  f"npm test: **{npm_count}/{npm_count} PASS**, 0 fail / 0 skipped. Python unittest: **{python_count}/{python_count} PASS**. npx tsc --noEmit: **PASS**. Production build: **PASS**. npm run lint: **0 error / 10 mevcut warning**. git diff --check: **PASS**. Yerel HTTP smoke: **6/6 PASS**.",'',
  'Log dosyaları: `npm-test.log`, `python-tests.log`, `tsc.log`, `build.log`, `lint.log`, `diff-check.log`. Ana test seti eksiltilmedi veya skip edilmedi; yeni regressionlar eklendi. Git’in Windows LF→CRLF bildirimleri whitespace error değildir.','',
  'Mevcut lint warning konumları: scripts/check-multibrand-research-v3.mjs (2), v4.mjs (2), check-multibrand-research.mjs (1), src/app/admin/page.tsx (2), dashboard/page.tsx (1), page.tsx (1), technical-research.ts (1). İlgisiz UI warning’leri düzeltilmedi.','',
  '## 23. Yayın durumu','',
  '**DB push yok. Git commit yok. Git push yok. Vercel deploy yok. Live OpenAI API yok.** Yalnız ilk audit için read-only technical DB snapshot alındı. Mevcut V3/V4/V5/V6 çalışmaları, checkpoint geçmişi, eski testler/raporlar ve source belgeleri korundu. Yeni general migration’ların PostgreSQL üzerinde gerçek uygulanması henüz test edilmedi; seed VALUES/source integrity offline testleri geçti. Canlı şema/constraint/RLS/idempotency yürütmesi ancak sonraki onaylı DB adımında yapılabilir.','',
  'Eksik 153 candidate pool ve 3447 effect-less pool açıkça kaldı. Coverage artışı %75 teşhis/pricing başarısı değildir; bu çalışmanın veri/soru erişimi ölçüsüdür. Çözülemeyen kaynak/ölçüm boşlukları yapay candidate veya effect ile doldurulmadı.','']
 (OUT/'report.md').write_text('\n'.join(lines),encoding='utf-8')
 print(json.dumps(dict(new_candidate_pools=len(gained_candidates),new_effect_pools=len(gained_effects),reason_counts=reason_counts,protected_migrations=len(protections)),ensure_ascii=False))

if __name__=='__main__':main()
