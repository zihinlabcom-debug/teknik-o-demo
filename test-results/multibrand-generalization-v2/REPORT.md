# Üretici araştırması: mimari düzeltme ve tek tur karşılaştırma

**Sonuç: önceki 1/6 yerine 2/6 doğrulanmış aday havuzu.** Başarılı sonuçlar Demirdöküm ve açıkça sınırlanmış Warmhaus model ailesidir. Baymak'ın önceki yanlış pozitif havuzu engellendi; bunu ayrıca başarı sayıp oranı şişirmedim. Dört marka hâlâ kullanılabilir doğrulanmış havuz oluşturamadı.

Ölçüm: 22 Eylül 2026, 20:16:33–20:20:52 (Türkiye). Model: gpt-4.1.

## Yapılan genel değişiklikler

- Canlı akıştan MANUAL_HINTS kullanımını kaldırdım. Marka/model/kod için özel kayıt, koşul, referans URL veya test cevabı eklemedim. Onaylı üretici domain listesi değişmedi.
- Kaynak keşfi artık servis/montaj/kullanıcı kılavuzları ve resmî hata destek sayfaları için birden fazla URL döndürüyor. Bir keşifte en fazla 6 URL; sonuç alınamazsa kullanılmayan alternatifler için ikinci keşif. Aynı nihai URL tekrar analiz edilmiyor. Araştırmada 120 saniyelik ortak süre bütçesi var.
- Structured Outputs şemaları ve mevcut güvenli JSON extraction korunuyor. Bozuk, eksik veya şema dışı cevap verified yapılmıyor.
- Model kapsamı exact/family olarak saklanıyor; coveredModels ve modelEvidence birlikte tutuluyor. Üç karakter sınırı kaldırıldı. Yalnızca substring bulmak kapsam onayı sayılmıyor.
- Belge alıntısı seçiminde arıza/neden bağlamları önce sıralanıyor; sayısal sayfa/şekil eşleşmeleri gerçek arıza tablosunu kırpma sınırı dışına itemiyor.
- Her raporda errorRecord, codeEvidence ve descriptionEvidence; her adayda ayrı basis zorunlu. Kaydın gerçekten indirilmiş metinde, adayın da aynı hata kaydında bulunması kontrol ediliyor. Genel açıklamanın birden fazla özgül adaya dayanak yapılması, tekrarlanan dayanak ve başka satırdan alınan kanıt reddediliyor.
- İkinci, bağımsız yapılandırılmış model çağrısı kapsamı, gerçek arıza bağlamını ve aday–kanıt anlam ilişkisini denetliyor. Tek bir adayın desteklenmemesi bu raporun verified olmasını engelliyor. HTTP 200 ve alıntının bulunması tek başına yeterli değil.
- Yalnızca açıklama doğrulanırsa description_only sonucu ve boş havuz mümkün. Kaynağın belirtmediği gaz valfi, elektrot veya kart gibi nedenler eklenmiyor.
- Kabul edilen bilgiye evidence.version=2, model kapsamı ve aday bazlı kaynak alıntıları ekleniyor. Eski canlı araştırma kanıtını taşımayan imzalı sohbet belleği tekrar kullanılarak eski havuzun sürdürülmesi engellendi. Closed candidate pool ve müşteri kanıtı kuralları korundu.

## Test yöntemi

Altı kombinasyon önceki raporla aynıdır. Her biri için tek önbelleksiz researchManufacturer çağrısı yapıldı. İçerideki ikinci kaynak keşfi yeni mimarinin normal davranışıdır; başarısız marka başarılı olana kadar tekrar çağrılmadı. Önceki turdaki URL ve yanıtlar motora ipucu olarak verilmedi. Sonuçlardan sonra üretim kodu değiştirilmedi; ölçüm öncesi/sonrası üretim dosyalarının SHA-256 değerleri aynı (true). Kaynakların erişimi ayrıca HTTPS GET ile ölçüldü.

İlk korumalı ortam denemesi altı çağrıda da web araştırması başlamadan Connection error verdi. Ürün performansına katılmadı; sandbox-network-blocked.json içinde saklandı. Yukarıdaki sayım, ağ izniyle tamamlanan tek gerçek ölçüm turudur.

## Marka bazında karşılaştırma

| Marka/model/kod | Önceki sonuç | Yeni status | Aday | Yeni sonuç |
|---|---|---|---:|---|
| Baymak DUOTEC — E01 | Başarısız: 5 adaylı yanlış pozitif | not_found | 0 | Başarısız; yanlış pozitif engellendi |
| Ariston CLAS ONE — 501 | Başarısız: erişilemeyen URL | not_found | 0 | Başarısız |
| Immergas VICTRIX TERA — 27 | Başarısız: sayısal kod/şekil bağlamı | not_found | 0 | Başarısız |
| Demirdöküm Atromix — F.28 | Başarılı: 13 aday | verified | 13 | Başarılı |
| Buderus Logamax plus GB072 — 6A | Başarısız: belgede 6A yok | not_found | 0 | Başarısız |
| Warmhaus Ewa — E02 | Başarısız: üç karakterli model reddi | verified | 1 | Başarılı — sınırlı aile kapsamı |

## Baymak — DUOTEC — E01

Dört kaynak denendi. İlk URL 404. DUOTEC Premix PDF indirildi, fakat metin çıkarımı büyük ölçüde boş sayfa işaretlerinden oluştu; E01 okunamadı. DUOTEC DHW belgesinde E01 açıklaması bulundu ve model bu kez candidates=[] döndürdü. Ancak modelEvidence alanına birebir alıntı yerine “Model DUOTEC, hata kodları tablosunda açıkça yer almaktadır.” cümlesini yazdığı için doğrulama reddetti. Dolcevita belgesi farklı model olduğu için kabul edilmedi. Önceki gaz valfi/elektrot/kart gibi beş belgesiz aday artık verified havuza girmedi. Bunu aday havuzu üretme başarısı olarak saymadım.

- Research status: **not_found**.
- Nihai model/kod doğrulaması: **hayır / hayır**. Metinde bulunması ile nihai onay ayrı tutuldu.
- Model kapsamı: onaylanmadı; onaylı model listesi yok.
- Açıklama: E01: Başarısız ateşleme (belgede görüldü; nihai havuz onayı yok).
- Candidate pool: **0**. Yalnızca doğrulanmış üretici hata kaydından mı: **havuz üretilmedi**.
- Süre: 50 saniye; indirilmeye çalışılan belge: 4.

Bulunan resmî URL’ler ve bağımsız erişim kontrolü:

- [Üretici kaynağı](https://www.baymak.com.tr/media/4994/baymak-duotec-premix-tam-yogusmali-kombi-kullanma-kılavuzu.pdf): 404; erişilebilir: hayır.
- [Üretici kaynağı](https://www.baymak.com.tr/media/4608/baymak-duotec-premix-tam-yogusmali-kombi-kullanma-kılavuzu.pdf): 200; erişilebilir: evet.
- [Üretici kaynağı](https://www.baymak.com.tr/media/5477/baymak-duotec-dhw-tam-yogusmali-kombi-kullanma-kilavuzu.pdf): 200; erişilebilir: evet.
- [Üretici kaynağı](https://www.baymak.com.tr/media/2895/300032130-kullanma-kilavuzu-dolcevita-felice_tr_r2.pdf): 200; erişilebilir: evet.

## Ariston — CLAS ONE — 501

Dokuz kaynak denendi. CLAS One / CLAS One L kullanıcı kılavuzu HTTP 200 ve gerçek model/kod içeriyor; yalnızca açıklama var. Belge satırı “Mancanza fiamma 5 01” biçiminde, yani açıklama koddan önce. Yeni doğrulayıcı kaydın kodla başlamasını istediği için bu gerçek satırı reddetti: kalan genel bir yanlış-negatif sınırlaması. CLAS ONE L WIFI belgesi de 200 döndü, fakat bağımsız kapsam denetimi bunun CLAS ONE girdisi için yeterli aile kapsamı oluşturmadığını belirtti. Diğer alternatifler 403/404 döndü. Ulaşılamayan veya varyant kapsamı belirsiz kaynaklar verified olmadı.

- Research status: **not_found**.
- Nihai model/kod doğrulaması: **hayır / hayır**. Metinde bulunması ile nihai onay ayrı tutuldu.
- Model kapsamı: family; CLAS ONE L WIFI.
- Açıklama: 501 / 5 01: Mancanza fiamma — alev yok (kaynakta görüldü; nihai doğrulama yok).
- Candidate pool: **0**. Yalnızca doğrulanmış üretici hata kaydından mı: **havuz üretilmedi**.
- Süre: 48 saniye; indirilmeye çalışılan belge: 9.

Bulunan resmî URL’ler ve bağımsız erişim kontrolü:

- [Üretici kaynağı](https://www.ariston.com/it/products/boilers/condensation/clas-one/manuale-installazione-e-manutenzione-clas-one.pdf): 403; erişilebilir: hayır.
- [Üretici kaynağı](https://www.ariston.com/content/dam/ariston/it/products/boilers/condensation/clas-one/manuale-uso-clas-one.pdf): 200; erişilebilir: evet.
- [Üretici kaynağı](https://www.ariston.com/content/dam/ariston/it/products/boilers/condensation/clas-one-30l-wifi/libretto-installazione-clas-one-l-wifi-30.pdf): 200; erişilebilir: evet.
- [Üretici kaynağı](https://www.ariston.com/it-it/prodotti/caldaie/condensazione/clas-one-system/manuale-installazione-e-manutenzione-clas-one-system.pdf): 404; erişilebilir: hayır.
- [Üretici kaynağı](https://www.ariston.com/pt-pt/produtos/boilers/condensing-boilers/clas-one-system/22-manual-de-instalação-clas-one-system.pdf): 404; erişilebilir: hayır.
- [Üretici kaynağı](https://www.ariston.com/fr-fr/produits/chauffage/chaudiere-a-gaz-a-condensation/clas-one/manuel-installation-1.pdf): 403; erişilebilir: hayır.
- [Üretici kaynağı](https://www.ariston.com/es-ar/productos/caldera/caldera-de-condensacion/clas-one/manual_de_instalacion_clas_one.pdf): 403; erişilebilir: hayır.
- [Üretici kaynağı](https://www.ariston.com/it-it/prodotti/caldaie/condensazione/clas-one-in/manuale-installazione-e-manutenzione-clas-one-in.pdf): 404; erişilebilir: hayır.
- [Üretici kaynağı](https://www.ariston.com/en-uk/products/gas-boilers-uk/clas-one-&-clas-system-one-installation-instructions.pdf): 403; erişilebilir: hayır.

## Immergas — VICTRIX TERA — 27

Dört kaynak denendi. Önceki turda kırpılan gerçek 27 arıza satırı bu kez bağlam seçimine girdi. Üretici satırında ısıtma devresinde kapalı vana, hava ve bloke sirkülasyon pompası destekleri görüldü. Ancak model codeEvidence alanını yalnızca kod+açıklama yerine tüm neden kaydıyla doldurdu; böylece aday dayanaklarının genel açıklamadan ayrılması kuralını geçemedi. Ayrıca 24 PLUS belgesine exact model demeye çalıştı; nihai verified sonucu verilmedi. Resmî destek sayfasında üretilen errorRecord alıntısı birebir bulunamadı. Başka PDF 15 MB sınırını aştı; sınır gevşetilmedi. Aksesuar belgesindeki Fig.27/E27 bağlamı da reddedildi. Yanlış baca/şekil bağlamı havuza girmedi, fakat gerçek nedenler de henüz kullanılabilir havuza dönüştürülemedi.

- Research status: **not_found**.
- Nihai model/kod doğrulaması: **hayır / hayır**. Metinde bulunması ile nihai onay ayrı tutuldu.
- Model kapsamı: onaylanmadı; onaylı model listesi yok.
- Açıklama: 27: Circolazione insufficiente — yetersiz sirkülasyon (gerçek hata tablosunda bulundu; nihai havuz onayı yok).
- Candidate pool: **0**. Yalnızca doğrulanmış üretici hata kaydından mı: **havuz üretilmedi**.
- Süre: 68 saniye; indirilmeye çalışılan belge: 4.

Bulunan resmî URL’ler ve bağımsız erişim kontrolü:

- [Üretici kaynağı](https://webdav.immergas.com/webdav.usr/ro-guest/service.ba1811242196b1998c8d6ce2196f2a12/PdfImmergas/Libretti%20Istruzioni/LI_3.027373.pdf): 200; erişilebilir: evet.
- [Üretici kaynağı](https://www.immergas.com.tr/urun-ariza-kodlari/): 200; erişilebilir: evet.
- [Üretici kaynağı](https://www.immergas.com/media/Prodotto/698c45e55257efadc7f2dac8/VICTRIX%20TERA%20V3%2028%20E%201.051305?ef=_ENG.pdf): 200; erişilebilir: evet.
- [Üretici kaynağı](https://www.immergas.com/media/Accessorio/63cc1ddd3fdcb6a15d9d0cc9/1_033477.pdf): 200; erişilebilir: evet.

## Demirdöküm — Atromix — F.28

İki 404 kaynaktan sonra üçüncü resmî PDF indirildi. Atromix P20/P24/P28 aile kapsamı açıkça kaydedildi. F.28 satırındaki 13 ayrı nedenin alıntıları, aynı hata kaydı içinde doğrulandı ve bağımsız anlam denetiminden geçti. Önceki başarısı korundu.

- Research status: **verified**.
- Nihai model/kod doğrulaması: **evet / evet**. Metinde bulunması ile nihai onay ayrı tutuldu.
- Model kapsamı: family; Atromix P20, Atromix P24, Atromix P28.
- Açıklama: F.28: Çalıştırma sırasındaki ateşleme başarısız.
- Candidate pool: **13**. Yalnızca doğrulanmış üretici hata kaydından mı: **evet**.
- Süre: 35 saniye; indirilmeye çalışılan belge: 3.

Bulunan resmî URL’ler ve bağımsız erişim kontrolü:

- [Üretici kaynağı](https://www.demirdokum.com.tr/products-2/atromix/atromix-0020242181-01-1499356.pdf): 404; erişilebilir: hayır.
- [Üretici kaynağı](https://www.demirdokum.com.tr/downloads/products-1/atromix-mk-0020242182-09-2556869.pdf): 404; erişilebilir: hayır.
- [Üretici kaynağı](https://www.demirdokum.com.tr/products-2/atromix/atromix-montaj-klavuzu-1201423.pdf): 200; erişilebilir: evet.
- [Üretici kaynağı](https://www.demirdokum.com.tr/tuketici-destek/s-kca-sorulan-sorular/kombiler/): 200; erişilebilir: evet.

Kabul edilen adaylar ve aynı hata kaydındaki dayanakları:

| Aday | Üretici kanıtı |
|---|---|
| Gaz sayacı arızalı veya gaz basıncı sensörü devrede | Gaz sayacı arızalı veya gaz basıncı sensörü devrede |
| Gazda hava var | gazda hava var |
| Gaz giriş basıncı çok düşük | gaz giriş basıncı çok düşük |
| Termik kapatma düzeneği (TAE) devrede | termik kapatma düzeneği (TAE) devrede |
| Yanlış gaz memesi | yanlış gaz memesi |
| Yanlış yedek parça gaz armatürü | yanlış yedek parça gaz armatürü |
| Gaz armatüründe arıza | gaz armatüründe arıza |
| Elektronik kart üzerindeki çoklu soket doğru olarak takılmamış | elektronik kart üzerindeki çoklu soket doğru olarak takılmamış |
| Kablo demetinde kesinti | kablo demetinde kesinti |
| Ateşleme sistemi (ateşleme trafosu, ateşleme kablosu, ateşleme soketi, ateşleme elektrodu) arızalı | ateşleme sistemi (ateşleme trafosu, ateşleme kablosu, ateşleme soketi, ateşleme elektrodu) arızalı |
| İyonizasyon akımında (kablo, elektrot) kesinti | iyonizasyon akımında (kablo, elektrot) kesinti |
| Üründe hatalı topraklama | üründe hatalı topraklama |
| Elektronik arızalı | elektronik arızalı |

## Buderus — Logamax plus GB072 — 6A

İlk PDF HTTP 200 ve Logamax plus GB072 modelini içeriyor, fakat çıkarılan metinde 6A yok. Motor bu noktada durmadı: resmî destek sayfasını da denedi; bu URL 404 döndü. İkinci keşif turu boş kaynak listesi döndürdü. Kod içermeyen kılavuzdan veya erişilemeyen sayfadan neden türetilmedi.

- Research status: **not_found**.
- Nihai model/kod doğrulaması: **hayır / hayır**. Metinde bulunması ile nihai onay ayrı tutuldu.
- Model kapsamı: onaylanmadı; onaylı model listesi yok.
- Açıklama: Bu turda doğru modelle birlikte doğrulanmış hata açıklaması yok.
- Candidate pool: **0**. Yalnızca doğrulanmış üretici hata kaydından mı: **havuz üretilmedi**.
- Süre: 13 saniye; indirilmeye çalışılan belge: 2.

Bulunan resmî URL’ler ve bağımsız erişim kontrolü:

- [Üretici kaynağı](https://www.buderus.com/ocsmedia/optimized/full/o517753v272_Logamax_plus_GB072_-_Montaj_Klavuzu.pdf): 200; erişilebilir: evet.
- [Üretici kaynağı](https://www.buderus.com/tr/tr/hizmetler/ariza-kodlari-ve-cozumleri/6a-ariza-kodu/): 404; erişilebilir: hayır.

## Warmhaus — Ewa — E02

Ewa artık üç karakter olduğu için reddedilmiyor. Türkçe EWA 20/24 PDF indirildi ve kod bulundu; fakat model descriptionEvidence alanına hata açıklaması yerine çalışma belirtisini koyduğu için ilk rapor reddedildi. Genel blog sayfası model kapsamını doğrulamadığından kabul edilmedi. İkinci keşifte İngilizce EWA SMART 20/24 kılavuzu bulundu; E02 kaydındaki ayrı probable cause alanı düşük su basıncını açıkça destekledi. Yalnızca bu 1 aday kabul edildi. Sonuç exact EWA değildir: açıkça EWA SMART 20 ve EWA SMART 24 aile kapsamıyla sınırlıdır. Bütün EWA varyantlarına uygulanmış gibi yorumlanmamalıdır. Parametre açıklamasından ek parça/parametre arızası türetilmedi.

- Research status: **verified**.
- Nihai model/kod doğrulaması: **evet / evet**. Metinde bulunması ile nihai onay ayrı tutuldu.
- Model kapsamı: family; EWA SMART 20, EWA SMART 24.
- Açıklama: E02: Düşük sistem su basıncı / yanlış sistem parametresi açıklaması. Kabul edilen ayrı neden: su basıncı düşük.
- Candidate pool: **1**. Yalnızca doğrulanmış üretici hata kaydından mı: **evet**.
- Süre: 45 saniye; indirilmeye çalışılan belge: 3.

Bulunan resmî URL’ler ve bağımsız erişim kontrolü:

- [Üretici kaynağı](https://www.warmhaus.com/storage/product/March2026/ewa-montaj-ve-kullanim-kilavuzu-tr-2026.pdf): 200; erişilebilir: evet.
- [Üretici kaynağı](https://www.warmhaus.com/tr/blog/warmhaus-kombi-hata-kodu-e02): 200; erişilebilir: evet.
- [Üretici kaynağı](https://www.warmhaus.com/storage/product/December2023/warmhaus-ewa-condensing-combi-boiler-user-manual.pdf): 200; erişilebilir: evet.
- [Üretici kaynağı](https://www.warmhaus.com/storage/product/July2024/ewa-system-boiler-user-manual.pdf): 200; erişilebilir: evet.

Kabul edilen adaylar ve aynı hata kaydındaki dayanakları:

| Aday | Üretici kanıtı |
|---|---|
| Su basıncı düşük | > Water pressure in the boiler not enough |

## Regression ve uyumluluk kontrolleri

Regressions önce yazıldı; ilk çalıştırma yeni doğrulama modülü henüz olmadığı için kırmızıydı. Ardından genel doğrulama uygulandı. Son durumda **44/44 otomatik test geçti**. Baymak genel açıklamadan özgül aday türetme, Warmhaus üç karakterli model, Immergas sayısal şekil/arıza bağlamı, model ailesi/varyant ayrımı, başka hata kaydından kanıt, ilk belgenin kod içermemesi, description_only, bağımsız anlam denetiminde ret ve JSON parse güvenliği kapsanıyor. Testler canlı API kullanmadan tekrarlanabilir.

Vaillant ecoTEC intro F.28 canlı araştırması **verified / 17 aday**, Bosch Condens 2500 W EA **verified / 13 aday**. Bunlar da URL hint tablosu kullanılmadan bulundu. Gerçek indirilen belgeler ve canlı anlam-denetimi kararları son doğrulayıcıyla tekrar oynatıldı; ikisi de verified kaldı.

- npm test: **44 geçti, 0 başarısız**.
- npx tsc --noEmit: **başarılı, exit 0**.
- Production build: **başarılı**, 13/13 sayfa. Normal 7 işçili denemeler Windows süreç/bellek hatasıyla durdu; derleme ve TypeScript aşamaları geçmişti. Kaynak kodu veya Next config değiştirmeden CIRCLE_NODE_TOTAL=2 ortam ayarıyla 1 işçi kullanılarak npm run build tamamlandı. Ayrı TypeScript kontrolü de kaynak baskısı kalkınca başarılı geçti.
- git diff --check: **başarılı**.

## Kalan sınırlamalar

Bu sonuç 6/6 başarı değildir. Kaynak keşfi hâlâ bazen bulunmayan URL veya yanlış varyant önerebiliyor; gerçek indirme ve kapsam denetimi bunları engelliyor. Açıklamanın koddan önce geldiği tablolar, modelin kanıt alanlarını yanlış doldurması, taranmış PDF’lerde OCR olmaması ve 15 MB belge sınırı gerçek kaynakların reddedilmesine yol açabiliyor. Bunları test sonucunu iyileştirmek için gevşetmedim veya marka bazlı yamayla gizlemedim.

Aday–kanıt anlam ilişkisi ikinci bir modelle denetleniyor; bu deterministik bir teknik doğruluk ispatı değildir. Deterministik alıntı/kapsam sınırlarıyla birlikte çalışır. Bu turdaki iki pozitif sonucun kayıtları ayrıca incelendi. Warmhaus başarısı yalnızca belirtilen SMART 20/24 kapsamındadır. Sayısal hata kodu için salt substring artık tek kabul şartı değildir; kod kaydı ve anlam denetimi de gerekir.

## Dosyalar

- results.json: tüm keşifler, ham raporlar, ret aşamaları, anlam denetimi kararları, HTTP kontrolleri ve üretim parmak izleri.
- *-document.txt: gerçekten indirilen belgelerin çıkarılmış metni; rapor incelemesi içindir, bilgi tabanına eklenmedi.
- ../technical-research-live.json: Vaillant/Bosch canlı kanıtları.
- ../technical-research-final-validation.json: son doğrulayıcıyla çevrimdışı yeniden doğrulama.
- ../multibrand-generalization/REPORT.md: değiştirilmeyen önceki 1/6 raporu.

**Commit, push veya deploy yapılmadı.**
