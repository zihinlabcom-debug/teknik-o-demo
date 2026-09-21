# Teknik-O

## Parça fiyatı entegrasyonu

`/api/diagnose` ve `/api/chat`, `src/lib/diagnosis.ts` üzerinden aynı teşhis ve fiyat servisini kullanır.
Sunucuda `OPENAI_API_KEY` gereklidir. Fiyat kaynağı için API anahtarı gerekmez.

- Marka + tam model + parça sınıfı `src/lib/parts-catalog.ts` içindeki doğrulanmış ürünle tam eşleşmelidir. NTC kullanım suyu ve kalorifer parçaları ayrıdır.
- İlk katalog: Demirdöküm Nitromix basınç sondası ONE1247, Atron basınç sondası ONE1244; Arçelik DGK 26 H LCD kalorifer NTC ONE1874 ve fan ONE1883.
- Bunlar tedarikçinin ürün kodlarıdır; üretici OEM kodu veya orijinal parça garantisi değildir. Ürün bağlantıları eşleme tablosundadır. Vaillant, kart ve vana için doğrulanmış eşleme henüz yoktur; fiyat üretilmez.
- Ürün sayfasının JSON-LD verisindeki ürün adı, SKU, teklif URL'si, TRY para birimi, stok ve pozitif fiyat doğrulanır. Fiyat ayrıca sayfanın KDV dahil alanıyla karşılaştırılır. Kategori fiyatı, ilgili ürün veya havale indirimi kullanılmaz.
- Sunucu işlemi başına 15 dakika bellek önbelleği ve 8 saniye istek zaman aşımı vardır. Aynı ürünün eşzamanlı istekleri birleştirilir. Süresi dolan fiyatlar kaynak hatasında geri kullanılmaz. Yeniden başlatma önbelleği boşaltır; sunucu örnekleri arasında paylaşılmaz.
- Eşleşme yoksa, stok bittiyse veya fiyat doğrulanamıyorsa teklif alanları boş döner ve kullanıcıya neden bildirilir. İstemci sabit veya tahmini bir fiyat üretmez. Kartta kaynak ve kontrol zamanı gösterilir; süre dolunca teklif kaldırılır.
- OMF = KDV dahil parça + 2000 TL işçilik. Toplam = OMF + yüzde 20 risk + max(risk dahil tutarın yüzde 15 hizmet bedeli, 300 TL). Garanti 90 gündür.

Yeni eşleme eklerken ürün sayfasındaki tam cihaz/model uyumunu, alt parça türünü, SKU ve URL'yi doğrulayın. Benzer model adına göre eşleme yapmayın. Satıcı HTML/JSON-LD yapısı değişirse okuyucu fiyat vermeyi durdurur.

Kontroller (Node.js 24):

```bash
npm test
npx tsc --noEmit
npm run lint
node --import ./tests/register-typescript.mjs scripts/check-prices.mjs
```

Son komut canlı tedarikçi sayfalarını salt okunur kontrol eder. Diğer testler sahte ağ yanıtları kullanır; ücretli model çağrısı yapmaz. Kayıt/randevu akışı halen demo düzeyindedir; bu entegrasyon sipariş veya fiyat sabitleme işlemi yapmaz.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Uyarlanabilir ön teşhis (21 Eylül 2026)

Sohbet önce müşteri beyanlarından cihaz kimliğini ve cevaplanan gözlemleri çıkarır. Sonraki değerlendirme bu kayıtla çalışır; model örnekleri müşteri kimliği sayılmaz. F kodları model adından ayrılır. Ekran kapalı / evde elektrik ve doğrulanmış Nitromix kodları için temel sorular sunucuda seçilir. Diğer belirtilerde model tek bir gözlem sorusu seçer. Yeterli gözlem ve gerekçeyle en olası arıza belirlendiğinde, kalan alternatifler olsa da OMF teklifi hesaplanır. Kesin parça teşhisi veya tüm alternatiflerin elenmesi şart değildir. Dayanak yetersizse yerinde kontrol gerekir; fiyat kaynağı yoksa bu durum teşhis yetersizliğinden ayrı bildirilir. F76 otomatik durdurulmaz; güvenli gözlemlerle değerlendirilir.

İlk doğrulanmış kaynak kapsamı: DemirDöküm Nitromix F22, F73, F74, F76; üretici montaj kılavuzu 0020309469_02, sayfa 31/33. Nitromix Ioni ve başka markalara bu kayıt uygulanmaz. Kaynak bilgisi sunucu değerlendirmesinde tutulur; müşteri sohbetinde teknik kılavuz açıklaması gösterilmez. Bu sürüm otomatik web araması yapmaz; bilinmeyen kodun anlamını tahmin etmek yerine kapsam eksikliğini belirtir. Yeni üretici/model kaynaklarının incelenerek eklenmesi gerekir. Güven skoru müşteri ekranında gösterilmez. Sonuçtaki aday yüzdeleri ayrı bir göreli dağılımdır; kalibre edilmiş doğruluk oranı değildir.

Normal fiyat: OMF = doğrulanmış parça + sabit işçilik (mevcut 2.000 TL). Risk = OMF × %20. Hizmet = max((OMF + risk) × %15, 300 TL). Toplam = OMF + risk + hizmet. Kalemler kuruşa yuvarlanır; garanti 90 gündür. Eski katalog risk sabitleri bu hesaba eklenmez.

Yerinde kontrol sonucu henüz kalıcı servis talebi/randevu oluşturmaz; randevu sistemi demo durumundadır. Belirsiz fiyat talebinin kayıt/atama ve yerinde fiyat onay süreci bu değişikliğin dışında kalır.

`node scripts/test-adaptive-chat.mjs`, çalışan localhost:3000 sunucusunda beş gerçek model senaryosunu test eder (ücretli model çağrıları). Sonuç: `test-results/adaptive-chat-live.json`. Birim testleri `npm test` ile çalışır.


## Kanıta dayalı aday dağılımı ve soru ilerlemesi

Her cevapta model, son müşteri mesajından alıntıları ve adaylar üzerindeki destek/çelişki etkisini önerir. Sunucu alıntıların mesajda bulunmasını kontrol eder, geçersiz güncellemeleri kabul etmez, aday ağırlıklarını toplamı tam 100 olan tam sayılara normalleştirir. Bilgi taşımayan cevapta dağılım ve bilgi sayacı sabit kalır. Geçerli yeni bilgi sayacı 10 artırır; 80 olduğunda yeni soru gönderilmez. Bir kod ilk bilindiğinde üretici kaynağındaki adaylar eşit başlangıç ağırlığıyla açılır; bu başlangıç ağırlıkları saha istatistiği değildir. Kanıtın anlamını ve adaylar arasındaki etkisini model değerlendirir; alıntı doğrulaması tek başına tıbbi/teknik doğruluk garantisi değildir.

Önceki dağılım, kanıtlar ve sorulmuş soru anahtarları 24 saat geçerli, sunucunun imzaladığı stateToken içinde korunur. Her iki chat istemcisi sonraki istekte bu alanı geri gönderir. İmza değiştirilen durum reddedilir. Sohbet sıfırlama durumu da sıfırlar. Anahtar değişirse mevcut sohbetler yeniden başlatılmalıdır. Sunucu, aynı anahtarlı soruyu tekrar göndermez; model, ilgili soru bankasından güçlü adayları ayıracak soruları önceliklendirir.

Sohbet sırasında teknik kod açıklamaları ve aday yüzdeleri gösterilmez; kısa gözlem soruları gönderilir. Sonuçta değerlendirilen bütün adaylar göreli yüzdeleriyle gösterilir (kesin teşhis oranı değildir). Bilgi ilerlemesi, teşhis güveninden ayrıdır. İlerleme çubuğu kırmızıdan yeşile 0–80 bilgi puanını gösterir. OMF fiyat uygunluğu göreli en yüksek yüzdeyle tek başına belirlenmez; yeterli dayanak ve doğrulanmış fiyat koşulları korunur.
