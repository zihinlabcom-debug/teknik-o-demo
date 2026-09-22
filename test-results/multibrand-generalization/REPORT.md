# Çok markalı canlı genelleme testi

**Sonuç: 6 marka içinde 1 başarılı, 5 başarısız.** Motor ham olarak iki `verified` döndürdü; Baymak sonucu belgesiz adaylar içerdiği için bağımsız değerlendirmede **yanlış pozitif / başarısız** sayıldı.

Ölçüm tarihi: 22 Eylül 2026. Model: mevcut yapılandırmadaki `gpt-4.1`.

## Yöntem ve değişiklik sınırı

- Üretim kodu, promptlar, domain listesi, bilgi tabanı, mevcut düzeltmeler ve fallback davranışı değiştirilmedi.
- Her kombinasyon için mevcut `researchManufacturer` bir kez, sıralı ve önbelleksiz çalıştırıldı. Başarısız markalar başarılı çıkana kadar yeniden denenmedi.
- Altı kombinasyonun hiçbiri mevcut statik teşhis kaydına veya `MANUAL_HINTS` tablosuna eşleşmiyor; test betiği bunu başlangıçta kontrol ediyor.
- Model ve kodların gerçekliği ayrıca kontrol edildi. Referans URL'leri, kod açıklamaları ve beklenen adaylar araştırma motoruna verilmedi. Motor kendi üretici URL'sini buldu.
- Mevcut belge okuyucu yalnızca gözlem için sarıldı; orijinal fonksiyon çağrıldı, dönen belge değiştirilmeden araştırma motoruna iletildi.
- URL erişilebilirliği ayrıca HTTPS GET yanıt koduyla kontrol edildi. HTTP 200 tek başına doğru model/kod veya doğru aday havuzu sayılmadı.
- Sonradan yapılan belge incelemesi yalnızca raporlama içindir; araştırma sonucu değiştirilmedi, yeni kaynakla araştırma yeniden çalıştırılmadı.
- `src/` altındaki tüm dosyalar, `package.json`, `package-lock.json` ve `next.config.ts` için öncesi/sonrası SHA-256 değerleri aynı: **28 üretim dosyası değişmedi**.
- İlk sandbox denemesi ağ izni nedeniyle tüm çağrılarda bağlantı hatası verdi. Bu, ürün performansı olarak puanlanmadı ve `sandbox-network-blocked.json` içinde ayrı saklandı. Yukarıdaki sonuçlar ağ erişimi sağlanan tek ölçüm turuna aittir.
- Commit, push ve deploy yapılmadı. Yalnızca test betikleri ve rapor dosyaları eklendi.

## Koddan çıkarılan onaylı domainler

Domain kaydı bulunması, her model ve hata kodunun desteklendiği anlamına gelmez.

| Marka | Mevcut onaylı domainler |
|---|---|
| Vaillant | vaillant.com.tr, vaillant.com, vaillant.co.uk |
| Bosch | bosch-homecomfort.com, bosch-thermotechnology.com, bosch.com.tr |
| Demirdöküm | demirdokum.com.tr |
| Buderus | buderus.com, buderus.com.tr |
| Baymak | baymak.com.tr |
| ECA | eca.com.tr |
| Ariston | ariston.com |
| Viessmann | viessmann.com.tr, viessmann.com |
| Ferroli | ferroli.com |
| Immergas | immergas.com, immergas.com.tr |
| Airfel | airfel.com.tr |
| Arçelik | arcelik.com.tr |
| Beko | beko.com, beko.com.tr |
| Warmhaus | warmhaus.com.tr, warmhaus.com |

## Marka bazında sonuç

“Model/kod” sütunu nihai belge incelemesidir; salt metin bulunmasıyla teknik doğrulamayı aynı şey saymaz.

| Marka | Model | Kod | Ham research status | URL erişimi | Model/kod kontrolü | Dönen aday | Havuz yalnızca doğrulanmış kod nedenlerinden mi? | Sonuç |
|---|---|---|---|---|---|---:|---|---|
| Baymak | DUOTEC | E01 | `verified` | HTTP 200, PDF | DUOTEC **42 DHW** varyantı; tam kapsam belirsiz. E01 açıklaması mevcut. | 5 | **Hayır:** beş adayın dayanağı aynı genel hata açıklaması | **Başarısız — yanlış pozitif** |
| Ariston | CLAS ONE | 501 | `not_found` | **HTTP 404** | Belge indirilemedi; model ve kod doğrulanmadı | 0 | Havuz üretilmedi | **Başarısız** |
| Immergas | VICTRIX TERA | 27 | `not_found` | HTTP 200, PDF | **24 PLUS** varyantı bulundu; gerçek arıza satırı model girdisinde yok. Yanlış kod açıklaması reddedildi. | 0 | Havuz üretilmedi | **Başarısız** |
| Demirdöküm | Atromix | F.28 | `verified` | HTTP 200, PDF | Model ve hata tablosu doğrulandı | 13 | **Evet:** 13 adayın neden karşılıkları F.28 satırında mevcut | **Başarılı** |
| Buderus | Logamax plus GB072 | 6A | `not_found` | HTTP 200, PDF | Model metinde var; seçilen belgenin çıkarılan metninde 6A bulunamadı | 0 | Havuz üretilmedi | **Başarısız** |
| Warmhaus | Ewa | E02 | `not_found` | HTTP 200, PDF | Gerçekte model ve E02 belgede mevcut; motor model adını reddetti | 0 | Havuz üretilmedi | **Başarısız — yanlış negatif** |

## 1. Baymak — DUOTEC — E01

- Motorun bulduğu resmi URL: https://www.baymak.com.tr/media/5477/baymak-duotec-dhw-tam-yogusmali-kombi-kullanma-kilavuzu.pdf
- Erişim: HTTP 200, `application/pdf`; belge gerçekten indirildi ve okundu.
- Model: belge açıkça **Duotec 42 DHW** için hazırlanmış. Girdi yalnızca DUOTEC. Motorun `modelEvidence` alanı model adı bile değil: `Model 42 kW`. Bu, tam model/varyant kapsamını ispatlamıyor.
- Kod ve açıklama: 18. sayfadaki tablo E01 için **başarısız ateşleme** açıklamasını içeriyor.
- Dönen adaylar: gaz beslemesi yok/yetersiz; ateşleme elektrodu arızalı/kirli; iyonizasyon elektrodu arızalı; gaz valfi arızalı; elektronik kart arızası.
- **Adayların beşinin de `basis` alanı yalnızca `Başarısız ateşleme`.** Bu ifade belgedeki hata tanımı; bu beş özgül nedenin E01 ile ilişkilendirildiği üretici neden tablosu değil.
- Tam hata aşaması: **aday–kanıt anlam ilişkisinin doğrulanması**. Mevcut denetim alıntının metinde bulunmasını kontrol ediyor, alıntının iddia edilen adayı gerçekten desteklemesini kontrol etmiyor. Dolayısıyla ham `verified` sonucu bu testte güvenilir sayılmadı.
- Sonuç: **başarısız / yanlış pozitif**. Aday havuzu kabul edilmedi.

Bağımsız model/kod gerçeklik referansı: [Baymak DUOTEC kullanma kılavuzu](https://www.baymak.com.tr/media/4608/baymak-duotec-premix-tam-yogusmali-kombi-kullanma-k%C4%B1lavuzu.pdf). Bu URL motora verilmedi.

## 2. Ariston — CLAS ONE — 501

- Motorun bulduğu URL: https://www.ariston.com/it-it/prodotti/caldaie/condensazione/clas-one/manuale-installazione-e-manutenzione-clas-one.pdf
- Domain resmi; **bu dosya yolu HTTP 404** döndürüyor. Resmi domain olması dosyanın var olduğunu kanıtlamıyor.
- Model/kod doğrulaması: yapılamadı; belge analizi aşamasına geçilmedi.
- Motorun doğruladığı hata açıklaması: **yok**.
- Bağımsız gerçeklik kontrolü: CLAS ONE'ı da kapsayan [resmi kullanıcı kılavuzunda](https://www.ariston.com/content/dam/ariston/it/products/boilers/condensation/clas-one-system/manuale-uso-clas-one-system.pdf), 9. sayfada 5 01 **alev yokluğu** anlamında listeleniyor. Bu belge test motoruna verilmedi, sonuç için fallback yapılmadı.
- Aday havuzu: 0; üretilmedi.
- Tam hata aşaması: **kaynak keşfi / belge indirme**; bulunmayan dosya yolu üretildi, HTTP hatasıyla reddedildi.
- Sonuç: **başarısız**, hatalı kaynağı reddetme davranışı doğru.

## 3. Immergas — VICTRIX TERA — 27

- Motorun bulduğu resmi URL: https://webdav.immergas.com/webdav.usr/ro-guest/service.ba1811242196b1998c8d6ce2196f2a12/PdfImmergas/Libretti%20Istruzioni/LI_3.027373.pdf
- Erişim: HTTP 200, PDF; 165.724 karakter metin çıkarıldı.
- Model: kapak **VICTRIX TERA 24 PLUS**; girdiyle tam varyant eşleşmesi kurulmadı. Genel VICTRIX TERA metni bulunduğu için ilk metin kontrolü geçti.
- Kod: gerçek 27 hata satırı belgenin yaklaşık **106.310. karakterinde**; anlamı **yetersiz su sirkülasyonu**. Test girdisinin gerçekliği ayrıca [VICTRIX TERA 24/28 üretici kılavuzunda](https://www.immergas.com/media/Prodotto/63cc19883fdcb6a15d98b643/Victrix-Tera-24-28-1044257_004_0117M.pdf) da görülebiliyor.
- Modelin aldığı 45.000 karakterlik alıntı içinde bu gerçek arıza satırı **yok**. Sayfa, bölüm ve şekil numaralarındaki `27` eşleşmeleri önce geliyor.
- Model, baca çiziminin `26 27 28` numaralarını ve baca konfigürasyonu metnini hata açıklaması sanmış; önerdiği tek aday **yanlış baca konfigürasyonu** olmuş.
- Bu öneri nihai havuza alınmadı: `codeEvidence` alıntısı belgedeki metinle eşleşmedi. Ham sonuç `not_found`, dönen aday 0.
- Tam hata aşamaları: **model varyantı seçimi + ilgili hata satırını alıntıya seçme**, ardından **alıntı doğrulamasında ret**.
- Sonuç: **başarısız**. Yanlış anlam üretilmiş olsa da son kontrol bu denemede yayımlanmasını engelledi.

## 4. Demirdöküm — Atromix — F.28

- Motorun bulduğu resmi URL: https://www.demirdokum.com.tr/products-2/atromix/atromix-montaj-klavuzu-1201423.pdf
- Erişim: HTTP 200, PDF.
- Model: kapakta **Atromix P20/P24/P28** mevcut. Nitromix'e özel mevcut statik kayıt kullanılmadı.
- Kod: üretici hata tablosundaki F.28 satırı doğrulandı.
- Açıklama: **çalıştırma sırasında ateşleme başarısızlığı**.
- Aday havuzu: **13**. Gaz sayacı/basınç sensörü, gazda hava, düşük gaz giriş basıncı, termik kapatma, yanlış gaz memesi, yanlış yedek gaz armatürü, gaz armatürü arızası, çoklu soket bağlantısı, kablo kesintisi, ateşleme sistemi, iyonizasyon akımı kesintisi, topraklama ve elektronik arızası ilgili satırda listeleniyor.
- Her adayın alıntısı aynı kodun üretici neden listesine dayanıyor; yalnızca genel hata açıklaması kullanılarak genişletilmemiş.
- Sonuç: **başarılı**, `verified` ve 13 aday kabul edildi.

## 5. Buderus — Logamax plus GB072 — 6A

- Motorun bulduğu resmi URL: https://www.buderus.com/ocsmedia/optimized/full/o517753v272_Logamax_plus_GB072_-_Montaj_Klavuzu.pdf
- Erişim: HTTP 200, PDF; 59.082 karakter metin çıkarıldı.
- Model: kapak ve metin GB072-24 / GB072-24K kapsamını gösteriyor; model metin eşleşmesi geçti.
- Kod: mevcut okuyucunun çıkardığı metinde `containsErrorCode(..., '6A')` **false**. Belgedeki arıza göstergeleri bölümü genel açıklamalar içeriyor; motorun ihtiyacı olan 6A satırı elde edilemedi.
- Motorun doğruladığı hata açıklaması: **yok**. Belgeyi yorumlayan ikinci model çağrısına geçilmedi.
- Kombinasyon gerçek: [üreticinin model bazlı kod listesi](https://www.buderus.com/tr/tr/hizmetler/ariza-kodlari-ve-cozumleri/) GB072 altında 6A'yı gösteriyor. [Üreticinin 6A açıklaması](https://www.buderus.com/tr/tr/hizmetler/ariza-kodlari-ve-coezuemleri/6a-ariza-kodu/) ateşleme sorununu belirtiyor. Bu sayfalar test motoruna verilmedi.
- Aday havuzu: 0; üretilmedi.
- Tam hata aşaması: **indirilen belgenin hata kodunu kapsadığını doğrulama**. Doğru marka/model belgesi, gerekli hata satırını otomatik olarak sağlamıyor.
- Sonuç: **başarısız**, doğrulanamayan kodun reddi doğru.

## 6. Warmhaus — Ewa — E02

- Motorun bulduğu resmi URL: https://www.warmhaus.com/storage/product/March2026/ewa-montaj-ve-kullanim-kilavuzu-tr-2026.pdf
- Erişim: HTTP 200, PDF.
- Model: belgenin ilk satırları **EWA 20 / EWA 24**. Normal büyük/küçük harf duyarsız aramada `ewa` bulunuyor.
- Buna rağmen mevcut `sourceContains(document.text, 'Ewa')` **false**. Nedeni bu ortak yardımcı fonksiyonun **alıntı uzunluğunu en az 4 karakter şart koşması**. `Ewa` 3 karakter olduğu için doğru model adı reddediliyor.
- Kod: E02 / E 02 metinde bulunuyor; ilk kod kontrolü true.
- Bağımsız belge açıklaması: 23. sayfada **düşük sistem su basıncı / yanlış sistem parametresi ayarı**. İlgili nedenler de aynı satırda mevcut.
- Motorun doğruladığı hata açıklaması: **yok**; model adı kontrolünde durduğu için ikinci model çağrısı yapılmadı.
- Aday havuzu: 0; üretilmedi.
- Tam hata aşaması: **model adının metinsel doğrulanması**, minimum uzunluk koşulundan kaynaklanan yanlış ret.
- Sonuç: **başarısız / yanlış negatif**. Düzeltme uygulanmadı.

## Ölçümün anlamı ve kanıt dosyaları

Bu sonuçlar altı kombinasyonun tek denemesidir; tüm modeller veya sonraki çağrılar için bir başarı oranı garantisi değildir. Arama çıktısı değişken olabilir.

En önemli bulgu: kapalı aday havuzu, havuzun başlangıçta doğru kurulduğunu tek başına garanti etmiyor. Baymak örneğinde belge içinde bulunan genel bir ifade, üreticinin belirtmediği beş adayın kanıtı kabul edildi. Bu yüzden ham `verified` sayısı **2/6**, belgeye dayalı nihai başarılı sonuç **1/6**.

- `results.json`: ham araştırma sonuçları, URL HTTP kontrolleri, alıntılar, üretim dosyası hash'leri.
- `document-inspection.json`: model çağrısı yapmadan gerçekleştirilen belge incelemesi.
- `*-document-excerpt.txt`: motorun kullandığı mevcut alıntı seçme fonksiyonunun çıktıları.
- `sandbox-network-blocked.json`: puanlamaya alınmayan ağ izni denemesi.
- `scripts/check-multibrand-research.mjs`: tekrarlanabilir ölçüm betiği.
- `scripts/inspect-multibrand-results.mjs`: yalnızca sonradan belge inceleme betiği.

**Önemli:** Ham `results.json` içindeki `poolOnlyVerifiedDocument` alanı sadece mevcut otomatik metin/alinti kontrollerinin sonucunu yansıtır. Baymak'ta true görünmesi anlamsal kaynak desteği değildir. Nihai kabul/ret değerlendirmesi bu rapordaki tabloda açıkça düzeltilmiştir; ham motor çıktısı delil olarak aynen korunmuştur.
