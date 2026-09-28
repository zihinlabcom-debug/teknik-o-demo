-- COPA: reviewed, source-grounded 185 raw rows; workbook is never modified.
-- Adds fuel metadata to the existing family catalog. Existing families are gas.
-- Additional e-Lecto capacities are catalog only, with no copied fault rows.
BEGIN;
ALTER TABLE public.boiler_model_families ADD COLUMN IF NOT EXISTS fuel_type text NOT NULL DEFAULT 'gas';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.boiler_model_families'::regclass
                 AND conname='boiler_model_families_fuel_type_check') THEN
    ALTER TABLE public.boiler_model_families ADD CONSTRAINT boiler_model_families_fuel_type_check
      CHECK (fuel_type IN ('gas','electric'));
  END IF;
END $$;
CREATE TEMP TABLE copa_raw_seed (
 brand text NOT NULL, official_model text NOT NULL, error_code text NOT NULL,
 official_description text NOT NULL, official_action text NOT NULL, source_url text NOT NULL,
 PRIMARY KEY(brand,official_model,error_code)
) ON COMMIT DROP;
INSERT INTO copa_raw_seed VALUES
  ('COPA', 'Eomix 20', 'E01', 'İyonizasyon Arızası', 'Reset düğmesine basarak tekrar çalıştırın. Sorun devam ediyorsa gaz akışında sorun olabilir; öncelikle gazın açık olduğunu kontrol edin.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 20', 'E03', 'Tesisat Sensör Arızası', 'Tesisat suyu sıcaklığını duyan sensörlerden biri arızalıdır. Sensör değişikliği gerekir; arıza giderilene kadar ürün çalışmaz. COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 20', 'E04', 'Kullanım Suyu Sensörü Arızası', 'Kullanım suyu sıcaklığını hisseden sensör arızalıdır. Arıza ekranda görünür; özel yazılım sayesinde cihaz iki devrede de çalışabilir. COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 20', 'E06', 'Tesisat Devresinde Aşırı Sıcaklık', 'Tesisat sıcaklığı 95 °C''yi geçtiğinde ürün arızaya geçer; sıcaklık düşünce yeniden çalışır. Bu durum fan veya eşanjör sisteminde arızaya işaret edebilir. COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 20', 'E08', 'Su Basınç Problemi', 'Tesisat su basıncı 0,4 barın altındaysa ürün arızaya geçer. Basıncı 1,5–2,0 bara çıkarın. Sorun sürerse basınç sensörü arızalı olabilir; hata sık tekrarlıyorsa tesisat devresinde su kaçağı olabilir.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 20', 'E09', 'Aşırı Isınma Termostat Arızası', 'Su sıcaklığı 95 °C''nin üzerine çıktığında güvenlik termostatı açar ve ürün arızaya geçer; yaklaşık 80 °C''nin altında termostat yeniden kapanır. Arıza tekrarlıyorsa fan veya eşanjör kontrolü gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 20', 'E10', 'Yüksek Su Basıncı Arızası', 'Tesisat su basıncı 3,5 barın üzerine çıktığında ürün arızaya geçer; 3,0 barın altına düşünce hata giderilir. Sık tekrarlıyorsa genleşme tankında sorun olabilir; servis kontrolü gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 20', 'E17', 'Baca Sensörü Arızası', 'Baca sıcaklığı yükseldiğinde güvenlik sensörü cihazı arızaya geçirir; sıcaklık düşünceye kadar hata sürer. Sık tekrarlıyorsa fan ve eşanjör grubunun kontrolü gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 20', 'E45', 'Baca Sensörü Arızası', 'Baca sıcaklığı yükseldiğinde güvenlik sensörü cihazı arızaya geçirir; sıcaklık düşünceye kadar hata sürer. Sık tekrarlıyorsa fan ve eşanjör grubunun kontrolü gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 20', 'E24', 'Tesisat Dönüş Sensörü Arızası', 'Tesisattan dönen suyun sıcaklığını ölçen sensör arızalıdır. Arıza sorun giderilene kadar devam eder; COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 20', 'E25', 'Donma Güvenliği', 'Tesisat suyu sıcaklığı 10 saniye boyunca 1 °C''nin altına düşerse ürün arızaya geçer. Sıcaklık yükseldiğinde arıza otomatik olarak düzelir.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 20', 'E30', 'Fan Sinyal Arızası', 'Fan sinyalinde kesinti olursa ürün otomatik olarak kilitlenir. Reset ile yeniden deneyin; hata sürerse fanın kontrolü için COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 20', 'E40', 'Anormal Fan Hızı Tespiti', 'Fan hız sinyali ayar değerinden uzun süre saparsa arıza oluşur. Reset ile yeniden deneyin; hata sürerse COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 20', 'E41', 'Brülör Yanma Hatası', 'Gaz valfi kapalı ve brülör devre dışıyken alev algılanırsa cihaz arızaya geçer. Olası gaz valfi arızası için COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 20', 'E42', 'İyonizasyon Arızası', 'Alev güvenliği için kullanılan iyonizasyon elektrodundan 15 saniye boyunca akım alınamazsa cihaz arızaya geçer. Hata tekrarlıyorsa iyonizasyon elektrodu kontrol edilmelidir.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 20', 'E44', 'Gaz Valfi Arızası', 'Gaz akışını kontrol eden valf arızasını bildirir. Gaz valfinin kontrolü için COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 24', 'E01', 'İyonizasyon Arızası', 'Reset düğmesine basarak tekrar çalıştırın. Sorun devam ediyorsa gaz akışında sorun olabilir; öncelikle gazın açık olduğunu kontrol edin.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 24', 'E03', 'Tesisat Sensör Arızası', 'Tesisat suyu sıcaklığını duyan sensörlerden biri arızalıdır. Sensör değişikliği gerekir; arıza giderilene kadar ürün çalışmaz. COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 24', 'E04', 'Kullanım Suyu Sensörü Arızası', 'Kullanım suyu sıcaklığını hisseden sensör arızalıdır. Arıza ekranda görünür; özel yazılım sayesinde cihaz iki devrede de çalışabilir. COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 24', 'E06', 'Tesisat Devresinde Aşırı Sıcaklık', 'Tesisat sıcaklığı 95 °C''yi geçtiğinde ürün arızaya geçer; sıcaklık düşünce yeniden çalışır. Bu durum fan veya eşanjör sisteminde arızaya işaret edebilir. COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 24', 'E08', 'Su Basınç Problemi', 'Tesisat su basıncı 0,4 barın altındaysa ürün arızaya geçer. Basıncı 1,5–2,0 bara çıkarın. Sorun sürerse basınç sensörü arızalı olabilir; hata sık tekrarlıyorsa tesisat devresinde su kaçağı olabilir.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 24', 'E09', 'Aşırı Isınma Termostat Arızası', 'Su sıcaklığı 95 °C''nin üzerine çıktığında güvenlik termostatı açar ve ürün arızaya geçer; yaklaşık 80 °C''nin altında termostat yeniden kapanır. Arıza tekrarlıyorsa fan veya eşanjör kontrolü gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 24', 'E10', 'Yüksek Su Basıncı Arızası', 'Tesisat su basıncı 3,5 barın üzerine çıktığında ürün arızaya geçer; 3,0 barın altına düşünce hata giderilir. Sık tekrarlıyorsa genleşme tankında sorun olabilir; servis kontrolü gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 24', 'E17', 'Baca Sensörü Arızası', 'Baca sıcaklığı yükseldiğinde güvenlik sensörü cihazı arızaya geçirir; sıcaklık düşünceye kadar hata sürer. Sık tekrarlıyorsa fan ve eşanjör grubunun kontrolü gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 24', 'E45', 'Baca Sensörü Arızası', 'Baca sıcaklığı yükseldiğinde güvenlik sensörü cihazı arızaya geçirir; sıcaklık düşünceye kadar hata sürer. Sık tekrarlıyorsa fan ve eşanjör grubunun kontrolü gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 24', 'E24', 'Tesisat Dönüş Sensörü Arızası', 'Tesisattan dönen suyun sıcaklığını ölçen sensör arızalıdır. Arıza sorun giderilene kadar devam eder; COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 24', 'E25', 'Donma Güvenliği', 'Tesisat suyu sıcaklığı 10 saniye boyunca 1 °C''nin altına düşerse ürün arızaya geçer. Sıcaklık yükseldiğinde arıza otomatik olarak düzelir.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 24', 'E30', 'Fan Sinyal Arızası', 'Fan sinyalinde kesinti olursa ürün otomatik olarak kilitlenir. Reset ile yeniden deneyin; hata sürerse fanın kontrolü için COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 24', 'E40', 'Anormal Fan Hızı Tespiti', 'Fan hız sinyali ayar değerinden uzun süre saparsa arıza oluşur. Reset ile yeniden deneyin; hata sürerse COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 24', 'E41', 'Brülör Yanma Hatası', 'Gaz valfi kapalı ve brülör devre dışıyken alev algılanırsa cihaz arızaya geçer. Olası gaz valfi arızası için COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 24', 'E42', 'İyonizasyon Arızası', 'Alev güvenliği için kullanılan iyonizasyon elektrodundan 15 saniye boyunca akım alınamazsa cihaz arızaya geçer. Hata tekrarlıyorsa iyonizasyon elektrodu kontrol edilmelidir.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 24', 'E44', 'Gaz Valfi Arızası', 'Gaz akışını kontrol eden valf arızasını bildirir. Gaz valfinin kontrolü için COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 35', 'E01', 'İyonizasyon Arızası', 'Reset düğmesine basarak tekrar çalıştırın. Sorun devam ediyorsa gaz akışında sorun olabilir; öncelikle gazın açık olduğunu kontrol edin.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 35', 'E03', 'Tesisat Sensör Arızası', 'Tesisat suyu sıcaklığını duyan sensörlerden biri arızalıdır. Sensör değişikliği gerekir; arıza giderilene kadar ürün çalışmaz. COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 35', 'E04', 'Kullanım Suyu Sensörü Arızası', 'Kullanım suyu sıcaklığını hisseden sensör arızalıdır. Arıza ekranda görünür; özel yazılım sayesinde cihaz iki devrede de çalışabilir. COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 35', 'E06', 'Tesisat Devresinde Aşırı Sıcaklık', 'Tesisat sıcaklığı 95 °C''yi geçtiğinde ürün arızaya geçer; sıcaklık düşünce yeniden çalışır. Bu durum fan veya eşanjör sisteminde arızaya işaret edebilir. COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 35', 'E08', 'Su Basınç Problemi', 'Tesisat su basıncı 0,4 barın altındaysa ürün arızaya geçer. Basıncı 1,5–2,0 bara çıkarın. Sorun sürerse basınç sensörü arızalı olabilir; hata sık tekrarlıyorsa tesisat devresinde su kaçağı olabilir.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 35', 'E09', 'Aşırı Isınma Termostat Arızası', 'Su sıcaklığı 95 °C''nin üzerine çıktığında güvenlik termostatı açar ve ürün arızaya geçer; yaklaşık 80 °C''nin altında termostat yeniden kapanır. Arıza tekrarlıyorsa fan veya eşanjör kontrolü gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 35', 'E10', 'Yüksek Su Basıncı Arızası', 'Tesisat su basıncı 3,5 barın üzerine çıktığında ürün arızaya geçer; 3,0 barın altına düşünce hata giderilir. Sık tekrarlıyorsa genleşme tankında sorun olabilir; servis kontrolü gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 35', 'E17', 'Baca Sensörü Arızası', 'Baca sıcaklığı yükseldiğinde güvenlik sensörü cihazı arızaya geçirir; sıcaklık düşünceye kadar hata sürer. Sık tekrarlıyorsa fan ve eşanjör grubunun kontrolü gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 35', 'E45', 'Baca Sensörü Arızası', 'Baca sıcaklığı yükseldiğinde güvenlik sensörü cihazı arızaya geçirir; sıcaklık düşünceye kadar hata sürer. Sık tekrarlıyorsa fan ve eşanjör grubunun kontrolü gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 35', 'E24', 'Tesisat Dönüş Sensörü Arızası', 'Tesisattan dönen suyun sıcaklığını ölçen sensör arızalıdır. Arıza sorun giderilene kadar devam eder; COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 35', 'E25', 'Donma Güvenliği', 'Tesisat suyu sıcaklığı 10 saniye boyunca 1 °C''nin altına düşerse ürün arızaya geçer. Sıcaklık yükseldiğinde arıza otomatik olarak düzelir.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 35', 'E30', 'Fan Sinyal Arızası', 'Fan sinyalinde kesinti olursa ürün otomatik olarak kilitlenir. Reset ile yeniden deneyin; hata sürerse fanın kontrolü için COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 35', 'E40', 'Anormal Fan Hızı Tespiti', 'Fan hız sinyali ayar değerinden uzun süre saparsa arıza oluşur. Reset ile yeniden deneyin; hata sürerse COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 35', 'E41', 'Brülör Yanma Hatası', 'Gaz valfi kapalı ve brülör devre dışıyken alev algılanırsa cihaz arızaya geçer. Olası gaz valfi arızası için COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 35', 'E42', 'İyonizasyon Arızası', 'Alev güvenliği için kullanılan iyonizasyon elektrodundan 15 saniye boyunca akım alınamazsa cihaz arızaya geçer. Hata tekrarlıyorsa iyonizasyon elektrodu kontrol edilmelidir.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix 35', 'E44', 'Gaz Valfi Arızası', 'Gaz akışını kontrol eden valf arızasını bildirir. Gaz valfinin kontrolü için COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('COPA', 'Eomix Plus 24 kW', 'E01', 'İyonlaşma hatası', 'NG seçiminde art arda üç, LPG seçiminde bir alev hatası kilitlenme oluşturur. Arızayı sıfırlamak için RESET gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 24 kW', 'E03', 'CH gidiş NTC prob hatası', 'CH gidiş NTC probunda açık devre, kısa devre veya hasar varsa hata oluşur. DHW ve CH talepleri durur; sorun kaybolunca çalışma yeniden başlar.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 24 kW', 'E04', 'DHW NTC prob hatası', 'DHW NTC probunda açık devre, kısa devre veya hasar varsa uyarı oluşur. DHW kullanımında cihaz CH NTC probunun sıcaklığıyla çalışır; sorun kaybolunca normal çalışma başlar.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 24 kW', 'E06', 'CH gidiş NTC aşırı sıcaklığı', 'CH gidiş NTC sıcaklığı 95 °C''den yüksekse hata oluşur. Sıcaklık 85 °C''ye düşünce normal çalışma otomatik başlar.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 24 kW', 'E08', 'Su basıncı problemi', 'Su basınç sensörü yapılandırmasında su basıncı 0,4 bar veya altındaysa hata oluşur; 1,0 bar veya üstündeyken silinir. Su basınç düğmesi yapılandırmasında kontakların üç saniye açık kalması hata oluşturur; kontaklar kapanınca giderilir.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 24 kW', 'E09', 'Emniyet termostatı açık', 'Emniyet termostatı üç saniye açık kalırsa kilitlenme oluşur. Termostat kapatılmalı ve RESET uygulanmalıdır.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 24 kW', 'E10', 'Yüksek su basıncı', 'Yalnız su basınç sensörü yapılandırmasında geçerlidir. Su basıncı 3,5 bar veya üstündeyken hata oluşur; 3,0 bar veya altına indiğinde otomatik silinir.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 24 kW', 'E17', 'Baca gazı NTC prob hatası', 'Baca gazı NTC probunda açık veya kısa devre sorunu varsa hata oluşur. DHW ve CH talepleri durur; sorun kaybolunca çalışma yeniden başlar. Baca gazı sıcaklık sensörü mevcut seçimi gereklidir.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 24 kW', 'E24', 'CH dönüş NTC prob hatası', 'CH dönüş NTC probunda açık veya kısa devre sorunu varsa hata oluşur. Sorun kaybolunca normal çalışma başlar.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 24 kW', 'E25', 'Donma arızası', 'CH sıcaklık probu on saniye boyunca 1 °C''nin altında ölçerse hata oluşur. Yakıcı durdurulur; pompa çalışabilir. Sıcaklık 3 °C''ye yükselince çalışma otomatik başlar.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 24 kW', 'E30', 'Fan sensöründe sinyal kaybı nedeniyle kilitlenme', 'Fan açıkken beş saniye fan sensöründen sinyal alınmazsa kilitlenme oluşur. RESET gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 24 kW', 'E40', 'Fan sensöründe sinyalin kapsam dışı olması nedeniyle kilitlenme', 'Fan RPM ölçümü altmış saniye boyunca hedef devir aralığından saparsa kilitlenme oluşur. Fan PWM görevinin yirmi saniye boyunca hesaplanan değerin altında kalması da kilitlenme nedenidir. RESET gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 24 kW', 'E41', 'Yanlış alev hatası', 'Yakıcı kapalıyken en az on saniye yanlış alev algılanırsa hata oluşur. Sistem alev sinyalinin kapanmasını bekler; sinyal en az bir saniye kapalı kalınca çalışma başlar.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 24 kW', 'E42', 'İyonlaşma bileşeni hatası', 'Alev tespiti sinyali on beş saniye ilgili aralığın dışındaysa hata oluşur. Alev sinyali en az iki saniye normal aralıkta kaldığında çalışma başlar.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 24 kW', 'E43', 'Isı eşanjörü hatası', 'Isı eşanjörü mevcut seçildiğinde geçerlidir. Isı eşanjöründe dört saniye su tespit edilirse hata oluşur; su boşaltılınca normal çalışma başlar.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 24 kW', 'E44', 'Gaz vanası geri bildirimi', 'Gaz vanası tahrik ve geri bildirim kontrol devresi hatası bu kaydı oluşturur. RESET gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 24 kW', 'E45', 'Baca gazı NTC aşırı sıcaklığı', 'Baca gazı sensörü mevcut seçildiğinde geçerlidir. Resmî tabloda baca gazı NTC probunun üç saniye boyunca 95 °C''nin altında ölçülmesi kilitlenme koşulu olarak yazılmıştır. RESET gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 24 kW', 'E46', 'Baca termostatı açık hatası', 'Baca termostatı beş saniye açık kalınca hata oluşur. Termostat kapandıktan on dakika sonra normal çalışma otomatik başlar.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 35 kW', 'E01', 'İyonlaşma hatası', 'NG seçiminde art arda üç, LPG seçiminde bir alev hatası kilitlenme oluşturur. Arızayı sıfırlamak için RESET gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 35 kW', 'E03', 'CH gidiş NTC prob hatası', 'CH gidiş NTC probunda açık devre, kısa devre veya hasar varsa hata oluşur. DHW ve CH talepleri durur; sorun kaybolunca çalışma yeniden başlar.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 35 kW', 'E04', 'DHW NTC prob hatası', 'DHW NTC probunda açık devre, kısa devre veya hasar varsa uyarı oluşur. DHW kullanımında cihaz CH NTC probunun sıcaklığıyla çalışır; sorun kaybolunca normal çalışma başlar.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 35 kW', 'E06', 'CH gidiş NTC aşırı sıcaklığı', 'CH gidiş NTC sıcaklığı 95 °C''den yüksekse hata oluşur. Sıcaklık 85 °C''ye düşünce normal çalışma otomatik başlar.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 35 kW', 'E08', 'Su basıncı problemi', 'Su basınç sensörü yapılandırmasında su basıncı 0,4 bar veya altındaysa hata oluşur; 1,0 bar veya üstündeyken silinir. Su basınç düğmesi yapılandırmasında kontakların üç saniye açık kalması hata oluşturur; kontaklar kapanınca giderilir.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 35 kW', 'E09', 'Emniyet termostatı açık', 'Emniyet termostatı üç saniye açık kalırsa kilitlenme oluşur. Termostat kapatılmalı ve RESET uygulanmalıdır.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 35 kW', 'E10', 'Yüksek su basıncı', 'Yalnız su basınç sensörü yapılandırmasında geçerlidir. Su basıncı 3,5 bar veya üstündeyken hata oluşur; 3,0 bar veya altına indiğinde otomatik silinir.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 35 kW', 'E17', 'Baca gazı NTC prob hatası', 'Baca gazı NTC probunda açık veya kısa devre sorunu varsa hata oluşur. DHW ve CH talepleri durur; sorun kaybolunca çalışma yeniden başlar. Baca gazı sıcaklık sensörü mevcut seçimi gereklidir.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 35 kW', 'E24', 'CH dönüş NTC prob hatası', 'CH dönüş NTC probunda açık veya kısa devre sorunu varsa hata oluşur. Sorun kaybolunca normal çalışma başlar.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 35 kW', 'E25', 'Donma arızası', 'CH sıcaklık probu on saniye boyunca 1 °C''nin altında ölçerse hata oluşur. Yakıcı durdurulur; pompa çalışabilir. Sıcaklık 3 °C''ye yükselince çalışma otomatik başlar.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 35 kW', 'E30', 'Fan sensöründe sinyal kaybı nedeniyle kilitlenme', 'Fan açıkken beş saniye fan sensöründen sinyal alınmazsa kilitlenme oluşur. RESET gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 35 kW', 'E40', 'Fan sensöründe sinyalin kapsam dışı olması nedeniyle kilitlenme', 'Fan RPM ölçümü altmış saniye boyunca hedef devir aralığından saparsa kilitlenme oluşur. Fan PWM görevinin yirmi saniye boyunca hesaplanan değerin altında kalması da kilitlenme nedenidir. RESET gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 35 kW', 'E41', 'Yanlış alev hatası', 'Yakıcı kapalıyken en az on saniye yanlış alev algılanırsa hata oluşur. Sistem alev sinyalinin kapanmasını bekler; sinyal en az bir saniye kapalı kalınca çalışma başlar.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 35 kW', 'E42', 'İyonlaşma bileşeni hatası', 'Alev tespiti sinyali on beş saniye ilgili aralığın dışındaysa hata oluşur. Alev sinyali en az iki saniye normal aralıkta kaldığında çalışma başlar.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 35 kW', 'E43', 'Isı eşanjörü hatası', 'Isı eşanjörü mevcut seçildiğinde geçerlidir. Isı eşanjöründe dört saniye su tespit edilirse hata oluşur; su boşaltılınca normal çalışma başlar.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 35 kW', 'E44', 'Gaz vanası geri bildirimi', 'Gaz vanası tahrik ve geri bildirim kontrol devresi hatası bu kaydı oluşturur. RESET gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 35 kW', 'E45', 'Baca gazı NTC aşırı sıcaklığı', 'Baca gazı sensörü mevcut seçildiğinde geçerlidir. Resmî tabloda baca gazı NTC probunun üç saniye boyunca 95 °C''nin altında ölçülmesi kilitlenme koşulu olarak yazılmıştır. RESET gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 35 kW', 'E46', 'Baca termostatı açık hatası', 'Baca termostatı beş saniye açık kalınca hata oluşur. Termostat kapandıktan on dakika sonra normal çalışma otomatik başlar.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 42 kW', 'E01', 'İyonlaşma hatası', 'NG seçiminde art arda üç, LPG seçiminde bir alev hatası kilitlenme oluşturur. Arızayı sıfırlamak için RESET gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 42 kW', 'E03', 'CH gidiş NTC prob hatası', 'CH gidiş NTC probunda açık devre, kısa devre veya hasar varsa hata oluşur. DHW ve CH talepleri durur; sorun kaybolunca çalışma yeniden başlar.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 42 kW', 'E04', 'DHW NTC prob hatası', 'DHW NTC probunda açık devre, kısa devre veya hasar varsa uyarı oluşur. DHW kullanımında cihaz CH NTC probunun sıcaklığıyla çalışır; sorun kaybolunca normal çalışma başlar.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 42 kW', 'E06', 'CH gidiş NTC aşırı sıcaklığı', 'CH gidiş NTC sıcaklığı 95 °C''den yüksekse hata oluşur. Sıcaklık 85 °C''ye düşünce normal çalışma otomatik başlar.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 42 kW', 'E08', 'Su basıncı problemi', 'Su basınç sensörü yapılandırmasında su basıncı 0,4 bar veya altındaysa hata oluşur; 1,0 bar veya üstündeyken silinir. Su basınç düğmesi yapılandırmasında kontakların üç saniye açık kalması hata oluşturur; kontaklar kapanınca giderilir.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 42 kW', 'E09', 'Emniyet termostatı açık', 'Emniyet termostatı üç saniye açık kalırsa kilitlenme oluşur. Termostat kapatılmalı ve RESET uygulanmalıdır.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 42 kW', 'E10', 'Yüksek su basıncı', 'Yalnız su basınç sensörü yapılandırmasında geçerlidir. Su basıncı 3,5 bar veya üstündeyken hata oluşur; 3,0 bar veya altına indiğinde otomatik silinir.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 42 kW', 'E17', 'Baca gazı NTC prob hatası', 'Baca gazı NTC probunda açık veya kısa devre sorunu varsa hata oluşur. DHW ve CH talepleri durur; sorun kaybolunca çalışma yeniden başlar. Baca gazı sıcaklık sensörü mevcut seçimi gereklidir.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 42 kW', 'E24', 'CH dönüş NTC prob hatası', 'CH dönüş NTC probunda açık veya kısa devre sorunu varsa hata oluşur. Sorun kaybolunca normal çalışma başlar.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 42 kW', 'E25', 'Donma arızası', 'CH sıcaklık probu on saniye boyunca 1 °C''nin altında ölçerse hata oluşur. Yakıcı durdurulur; pompa çalışabilir. Sıcaklık 3 °C''ye yükselince çalışma otomatik başlar.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 42 kW', 'E30', 'Fan sensöründe sinyal kaybı nedeniyle kilitlenme', 'Fan açıkken beş saniye fan sensöründen sinyal alınmazsa kilitlenme oluşur. RESET gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 42 kW', 'E40', 'Fan sensöründe sinyalin kapsam dışı olması nedeniyle kilitlenme', 'Fan RPM ölçümü altmış saniye boyunca hedef devir aralığından saparsa kilitlenme oluşur. Fan PWM görevinin yirmi saniye boyunca hesaplanan değerin altında kalması da kilitlenme nedenidir. RESET gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 42 kW', 'E41', 'Yanlış alev hatası', 'Yakıcı kapalıyken en az on saniye yanlış alev algılanırsa hata oluşur. Sistem alev sinyalinin kapanmasını bekler; sinyal en az bir saniye kapalı kalınca çalışma başlar.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 42 kW', 'E42', 'İyonlaşma bileşeni hatası', 'Alev tespiti sinyali on beş saniye ilgili aralığın dışındaysa hata oluşur. Alev sinyali en az iki saniye normal aralıkta kaldığında çalışma başlar.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 42 kW', 'E43', 'Isı eşanjörü hatası', 'Isı eşanjörü mevcut seçildiğinde geçerlidir. Isı eşanjöründe dört saniye su tespit edilirse hata oluşur; su boşaltılınca normal çalışma başlar.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 42 kW', 'E44', 'Gaz vanası geri bildirimi', 'Gaz vanası tahrik ve geri bildirim kontrol devresi hatası bu kaydı oluşturur. RESET gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 42 kW', 'E45', 'Baca gazı NTC aşırı sıcaklığı', 'Baca gazı sensörü mevcut seçildiğinde geçerlidir. Resmî tabloda baca gazı NTC probunun üç saniye boyunca 95 °C''nin altında ölçülmesi kilitlenme koşulu olarak yazılmıştır. RESET gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Eomix Plus 42 kW', 'E46', 'Baca termostatı açık hatası', 'Baca termostatı beş saniye açık kalınca hata oluşur. Termostat kapandıktan on dakika sonra normal çalışma otomatik başlar.', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('COPA', 'Ultimix 18', 'E01', 'İyonlaşma Arızası', 'Reset düğmesine basarak tekrar çalıştırın. Sorun devam ediyorsa gaz akışında sorun olabilir; öncelikle gazın açık olduğunu kontrol edin.', 'https://www.copa.com.tr/tr/images/dokumanlar/106/dokuman.pdf'),
  ('COPA', 'Ultimix 18', 'E03', 'Tesisat Sensör Arızası', 'Tesisat suyu sıcaklığını duyan sensörlerden biri arızalıdır. Sensör değişikliği gerekir; arıza giderilene kadar ürün çalışmaz. COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/106/dokuman.pdf'),
  ('COPA', 'Ultimix 18', 'E04', 'Kullanım Suyu Sensörü Arızası', 'Kullanım suyu sıcaklığını hisseden sensör arızalıdır. LCD ekranda hata görünür; COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/106/dokuman.pdf'),
  ('COPA', 'Ultimix 18', 'E06', 'Tesisat Devresinde Aşırı Sıcaklık', 'Tesisat sıcaklığı 95 °C''yi geçtiğinde ürün arızaya geçer; sıcaklık düşünce yeniden çalışır. Bu durum fan veya eşanjör sisteminde arızaya işaret edebilir.', 'https://www.copa.com.tr/tr/images/dokumanlar/106/dokuman.pdf'),
  ('COPA', 'Ultimix 18', 'E08', 'Su Basınç Problemi', 'Tesisat su basıncı 0,4 barın altındaysa ürün arızaya geçer. Basıncı 1,5–2,0 bara çıkarın. Sorun sürerse basınç sensörü arızalı olabilir; sık tekrarlıyorsa tesisat kaçağı kontrol edilmelidir.', 'https://www.copa.com.tr/tr/images/dokumanlar/106/dokuman.pdf'),
  ('COPA', 'Ultimix 18', 'E09', 'Aşırı Isınma Termostat Arızası', 'Su sıcaklığı 95 °C''nin üzerine çıktığında güvenlik termostatı açar. Yaklaşık 80 °C''nin altında kapanır. Arıza tekrarlıyorsa fan veya eşanjör kontrolü gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/106/dokuman.pdf'),
  ('COPA', 'Ultimix 18', 'E10', 'Yüksek Su Basıncı Arızası', 'Tesisat su basıncı 3,5 barın üzerine çıkarsa hata oluşur; 3,0 barın altına düşünce giderilir. Sık tekrarlıyorsa genleşme tankı kontrol edilmelidir.', 'https://www.copa.com.tr/tr/images/dokumanlar/106/dokuman.pdf'),
  ('COPA', 'Ultimix 18', 'E17', 'Baca Sensörü Arızası', 'Baca sıcaklığı yükseldiğinde güvenlik sensörü cihazı arızaya geçirir. Sık tekrarlıyorsa fan ve eşanjör grubunun kontrolü gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/106/dokuman.pdf'),
  ('COPA', 'Ultimix 18', 'E24', 'Tesisat Dönüş Sensörü Arızası', 'Tesisattan dönen suyun sıcaklığını ölçen sensör arızalıdır. Sorun giderilene kadar hata devam eder; COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/106/dokuman.pdf'),
  ('COPA', 'Ultimix 18', 'E25', 'Donma Güvenliği', 'Tesisat suyu sıcaklığı 10 saniye boyunca 1 °C''nin altına düşerse hata oluşur; sıcaklık yükseldiğinde otomatik düzelir.', 'https://www.copa.com.tr/tr/images/dokumanlar/106/dokuman.pdf'),
  ('COPA', 'Ultimix 18', 'E30', 'Fan Sinyal Arızası', 'Fan sinyalinde kesinti olursa cihaz kilitlenir. Reset ile yeniden deneyin; hata sürerse fan kontrol edilmelidir.', 'https://www.copa.com.tr/tr/images/dokumanlar/106/dokuman.pdf'),
  ('COPA', 'Ultimix 18', 'E40', 'Anormal Fan Hızı Tespiti', 'Fan hız sinyali ayar değerinden uzun süre saparsa hata oluşur. Reset ile yeniden deneyin; hata sürerse servis kontrolü gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/106/dokuman.pdf'),
  ('COPA', 'Ultimix 18', 'E41', 'Brülör Yanma Hatası', 'Gaz valfi kapalı ve brülör devre dışıyken alev algılanırsa cihaz arızaya geçer. Olası gaz valfi arızası için servis kontrolü gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/106/dokuman.pdf'),
  ('COPA', 'Ultimix 18', 'E42', 'İyonizasyon Arızası', 'İyonizasyon elektrodundan 15 saniye boyunca akım alınamazsa cihaz arızaya geçer. Hata tekrarlıyorsa iyonizasyon elektrodu kontrol edilmelidir.', 'https://www.copa.com.tr/tr/images/dokumanlar/106/dokuman.pdf'),
  ('COPA', 'Ultimix 18', 'E44', 'Gaz Valfi Arızası', 'Gaz akışını kontrol eden valf arızasını bildirir. Gaz valfinin kontrolü için COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/106/dokuman.pdf'),
  ('COPA', 'Ultimix 18', 'E45', 'Baca Gazı NTC Yüksek Sıcaklık', 'Yalnız baca gazı sensörü mevcut seçildiğinde geçerlidir. Baca gazı NTC probu 3 saniye boyunca 95 °C''nin üzerinde kalırsa kilitlenme oluşur. RESET gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/106/dokuman.pdf'),
  ('COPA', 'Ultimix 18', 'E46', 'Pompa Sinyali Yok veya Aralık Dışında', 'Yalnız PWM pompası seçildiğinde geçerlidir. Enkoder sinyali 10 saniye eksik veya aralık dışında kalırsa hata oluşur; sinyal 5 saniye aralıkta kalınca normal çalışma otomatik başlar.', 'https://www.copa.com.tr/tr/images/dokumanlar/106/dokuman.pdf'),
  ('COPA', 'Ultimix 24', 'E01', 'İyonlaşma Arızası', 'Reset düğmesine basarak tekrar çalıştırın. Sorun devam ediyorsa gaz akışında sorun olabilir; öncelikle gazın açık olduğunu kontrol edin.', 'https://www.copa.com.tr/tr/images/dokumanlar/106/dokuman.pdf'),
  ('COPA', 'Ultimix 24', 'E03', 'Tesisat Sensör Arızası', 'Tesisat suyu sıcaklığını duyan sensörlerden biri arızalıdır. Sensör değişikliği gerekir; arıza giderilene kadar ürün çalışmaz. COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/106/dokuman.pdf'),
  ('COPA', 'Ultimix 24', 'E04', 'Kullanım Suyu Sensörü Arızası', 'Kullanım suyu sıcaklığını hisseden sensör arızalıdır. LCD ekranda hata görünür; COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/106/dokuman.pdf'),
  ('COPA', 'Ultimix 24', 'E06', 'Tesisat Devresinde Aşırı Sıcaklık', 'Tesisat sıcaklığı 95 °C''yi geçtiğinde ürün arızaya geçer; sıcaklık düşünce yeniden çalışır. Bu durum fan veya eşanjör sisteminde arızaya işaret edebilir.', 'https://www.copa.com.tr/tr/images/dokumanlar/106/dokuman.pdf'),
  ('COPA', 'Ultimix 24', 'E08', 'Su Basınç Problemi', 'Tesisat su basıncı 0,4 barın altındaysa ürün arızaya geçer. Basıncı 1,5–2,0 bara çıkarın. Sorun sürerse basınç sensörü arızalı olabilir; sık tekrarlıyorsa tesisat kaçağı kontrol edilmelidir.', 'https://www.copa.com.tr/tr/images/dokumanlar/106/dokuman.pdf'),
  ('COPA', 'Ultimix 24', 'E09', 'Aşırı Isınma Termostat Arızası', 'Su sıcaklığı 95 °C''nin üzerine çıktığında güvenlik termostatı açar. Yaklaşık 80 °C''nin altında kapanır. Arıza tekrarlıyorsa fan veya eşanjör kontrolü gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/106/dokuman.pdf'),
  ('COPA', 'Ultimix 24', 'E10', 'Yüksek Su Basıncı Arızası', 'Tesisat su basıncı 3,5 barın üzerine çıkarsa hata oluşur; 3,0 barın altına düşünce giderilir. Sık tekrarlıyorsa genleşme tankı kontrol edilmelidir.', 'https://www.copa.com.tr/tr/images/dokumanlar/106/dokuman.pdf'),
  ('COPA', 'Ultimix 24', 'E17', 'Baca Sensörü Arızası', 'Baca sıcaklığı yükseldiğinde güvenlik sensörü cihazı arızaya geçirir. Sık tekrarlıyorsa fan ve eşanjör grubunun kontrolü gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/106/dokuman.pdf'),
  ('COPA', 'Ultimix 24', 'E24', 'Tesisat Dönüş Sensörü Arızası', 'Tesisattan dönen suyun sıcaklığını ölçen sensör arızalıdır. Sorun giderilene kadar hata devam eder; COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/106/dokuman.pdf'),
  ('COPA', 'Ultimix 24', 'E25', 'Donma Güvenliği', 'Tesisat suyu sıcaklığı 10 saniye boyunca 1 °C''nin altına düşerse hata oluşur; sıcaklık yükseldiğinde otomatik düzelir.', 'https://www.copa.com.tr/tr/images/dokumanlar/106/dokuman.pdf'),
  ('COPA', 'Ultimix 24', 'E30', 'Fan Sinyal Arızası', 'Fan sinyalinde kesinti olursa cihaz kilitlenir. Reset ile yeniden deneyin; hata sürerse fan kontrol edilmelidir.', 'https://www.copa.com.tr/tr/images/dokumanlar/106/dokuman.pdf'),
  ('COPA', 'Ultimix 24', 'E40', 'Anormal Fan Hızı Tespiti', 'Fan hız sinyali ayar değerinden uzun süre saparsa hata oluşur. Reset ile yeniden deneyin; hata sürerse servis kontrolü gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/106/dokuman.pdf'),
  ('COPA', 'Ultimix 24', 'E41', 'Brülör Yanma Hatası', 'Gaz valfi kapalı ve brülör devre dışıyken alev algılanırsa cihaz arızaya geçer. Olası gaz valfi arızası için servis kontrolü gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/106/dokuman.pdf'),
  ('COPA', 'Ultimix 24', 'E42', 'İyonizasyon Arızası', 'İyonizasyon elektrodundan 15 saniye boyunca akım alınamazsa cihaz arızaya geçer. Hata tekrarlıyorsa iyonizasyon elektrodu kontrol edilmelidir.', 'https://www.copa.com.tr/tr/images/dokumanlar/106/dokuman.pdf'),
  ('COPA', 'Ultimix 24', 'E44', 'Gaz Valfi Arızası', 'Gaz akışını kontrol eden valf arızasını bildirir. Gaz valfinin kontrolü için COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/106/dokuman.pdf'),
  ('COPA', 'Ultimix 24', 'E45', 'Baca Gazı NTC Yüksek Sıcaklık', 'Yalnız baca gazı sensörü mevcut seçildiğinde geçerlidir. Baca gazı NTC probu 3 saniye boyunca 95 °C''nin üzerinde kalırsa kilitlenme oluşur. RESET gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/106/dokuman.pdf'),
  ('COPA', 'Ultimix 24', 'E46', 'Pompa Sinyali Yok veya Aralık Dışında', 'Yalnız PWM pompası seçildiğinde geçerlidir. Enkoder sinyali 10 saniye eksik veya aralık dışında kalırsa hata oluşur; sinyal 5 saniye aralıkta kalınca normal çalışma otomatik başlar.', 'https://www.copa.com.tr/tr/images/dokumanlar/106/dokuman.pdf'),
  ('COPA', 'Nexa 20 kW', 'E01', 'İyonizasyon Arızası', 'Reset düğmesine basarak tekrar çalıştırın. Sorun devam ediyorsa gaz akışında sorun olabilir; öncelikle gazın açık olduğunu kontrol edin.', 'https://www.copa.com.tr/tr/images/dokumanlar/140/dokuman.pdf'),
  ('COPA', 'Nexa 20 kW', 'E03', 'Tesisat Sensör Arızası', 'Tesisat suyu sıcaklığını duyan sensörlerden biri arızalıdır. Sensör değişikliği gerekir; arıza giderilene kadar ürün çalışmaz. COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/140/dokuman.pdf'),
  ('COPA', 'Nexa 20 kW', 'E04', 'Kullanım Suyu Sensörü Arızası', 'Kullanım suyu sıcaklığını hisseden sensör arızalıdır. LCD ekranda hata görünür; COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/140/dokuman.pdf'),
  ('COPA', 'Nexa 20 kW', 'E06', 'Tesisat Devresinde Aşırı Sıcaklık', 'Tesisat sıcaklığı 95 °C''yi geçtiğinde ürün arızaya geçer; sıcaklık düşünce yeniden çalışır. Bu durum fan veya eşanjör sisteminde arızaya işaret edebilir.', 'https://www.copa.com.tr/tr/images/dokumanlar/140/dokuman.pdf'),
  ('COPA', 'Nexa 20 kW', 'E08', 'Su Basınç Problemi', 'Tesisat su basıncı 0,4 barın altındaysa ürün arızaya geçer. Basıncı 1,5–2,0 bara çıkarın. Sorun sürerse basınç sensörü arızalı olabilir; sık tekrarlıyorsa tesisat kaçağı kontrol edilmelidir.', 'https://www.copa.com.tr/tr/images/dokumanlar/140/dokuman.pdf'),
  ('COPA', 'Nexa 20 kW', 'E09', 'Aşırı Isınma Termostat Arızası', 'Su sıcaklığı 95 °C''nin üzerine çıktığında güvenlik termostatı açar. Yaklaşık 80 °C''nin altında kapanır. Arıza tekrarlıyorsa fan veya eşanjör kontrolü gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/140/dokuman.pdf'),
  ('COPA', 'Nexa 20 kW', 'E10', 'Yüksek Su Basıncı Arızası', 'Tesisat su basıncı 3,5 barın üzerine çıkarsa hata oluşur; 3,0 barın altına düşünce giderilir. Sık tekrarlıyorsa genleşme tankı kontrol edilmelidir.', 'https://www.copa.com.tr/tr/images/dokumanlar/140/dokuman.pdf'),
  ('COPA', 'Nexa 20 kW', 'E17', 'Baca Sensörü Arızası', 'Baca sıcaklığı yükseldiğinde güvenlik sensörü cihazı arızaya geçirir. Sık tekrarlıyorsa fan ve eşanjör grubunun kontrolü gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/140/dokuman.pdf'),
  ('COPA', 'Nexa 20 kW', 'E24', 'Tesisat Dönüş Sensörü Arızası', 'Tesisattan dönen suyun sıcaklığını ölçen sensör arızalıdır. Sorun giderilene kadar hata devam eder; COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/140/dokuman.pdf'),
  ('COPA', 'Nexa 20 kW', 'E25', 'Donma Güvenliği', 'Tesisat suyu sıcaklığı 10 saniye boyunca 1 °C''nin altına düşerse hata oluşur; sıcaklık yükseldiğinde otomatik düzelir.', 'https://www.copa.com.tr/tr/images/dokumanlar/140/dokuman.pdf'),
  ('COPA', 'Nexa 20 kW', 'E30', 'Fan Sinyal Arızası', 'Fan sinyalinde kesinti olursa cihaz kilitlenir. Reset ile yeniden deneyin; hata sürerse fan kontrol edilmelidir.', 'https://www.copa.com.tr/tr/images/dokumanlar/140/dokuman.pdf'),
  ('COPA', 'Nexa 20 kW', 'E40', 'Anormal Fan Hızı Tespiti', 'Fan hız sinyali ayar değerinden uzun süre saparsa hata oluşur. Reset ile yeniden deneyin; hata sürerse servis kontrolü gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/140/dokuman.pdf'),
  ('COPA', 'Nexa 20 kW', 'E41', 'Brülör Yanma Hatası', 'Gaz valfi kapalı ve brülör devre dışıyken alev algılanırsa cihaz arızaya geçer. Olası gaz valfi arızası için servis kontrolü gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/140/dokuman.pdf'),
  ('COPA', 'Nexa 20 kW', 'E42', 'İyonizasyon Arızası', 'İyonizasyon elektrodundan 15 saniye boyunca akım alınamazsa cihaz arızaya geçer. Hata tekrarlıyorsa iyonizasyon elektrodu kontrol edilmelidir.', 'https://www.copa.com.tr/tr/images/dokumanlar/140/dokuman.pdf'),
  ('COPA', 'Nexa 20 kW', 'E44', 'Gaz Valfi Arızası', 'Gaz akışını kontrol eden valf arızasını bildirir. Gaz valfinin kontrolü için COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/140/dokuman.pdf'),
  ('COPA', 'Nexa 20 kW', 'E45', 'Baca Gazı NTC Yüksek Sıcaklık', 'Yalnız baca gazı sensörü mevcut seçildiğinde geçerlidir. Baca gazı NTC probu 3 saniye boyunca 95 °C''nin üzerinde kalırsa kilitlenme oluşur. RESET gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/140/dokuman.pdf'),
  ('COPA', 'Nexa 20 kW', 'E46', 'Pompa Sinyali Yok veya Aralık Dışında', 'Yalnız PWM pompası seçildiğinde geçerlidir. Enkoder sinyali 10 saniye eksik veya aralık dışında kalırsa hata oluşur; sinyal 5 saniye aralıkta kalınca normal çalışma otomatik başlar.', 'https://www.copa.com.tr/tr/images/dokumanlar/140/dokuman.pdf'),
  ('COPA', 'Nexa 20 kW', 'E51', 'Fan Rotoru Kilitlenme Arızası', 'Fan açıkken fan kodlayıcısından 1 saniye sinyal alınmazsa hata oluşur. Sistem 20 saniye boyunca hatayı gidermeye çalışır; giderilemezse E30 kilitleme hatasına geçer.', 'https://www.copa.com.tr/tr/images/dokumanlar/140/dokuman.pdf'),
  ('COPA', 'Nexa 24 kW', 'E01', 'İyonizasyon Arızası', 'Reset düğmesine basarak tekrar çalıştırın. Sorun devam ediyorsa gaz akışında sorun olabilir; öncelikle gazın açık olduğunu kontrol edin.', 'https://www.copa.com.tr/tr/images/dokumanlar/140/dokuman.pdf'),
  ('COPA', 'Nexa 24 kW', 'E03', 'Tesisat Sensör Arızası', 'Tesisat suyu sıcaklığını duyan sensörlerden biri arızalıdır. Sensör değişikliği gerekir; arıza giderilene kadar ürün çalışmaz. COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/140/dokuman.pdf'),
  ('COPA', 'Nexa 24 kW', 'E04', 'Kullanım Suyu Sensörü Arızası', 'Kullanım suyu sıcaklığını hisseden sensör arızalıdır. LCD ekranda hata görünür; COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/140/dokuman.pdf'),
  ('COPA', 'Nexa 24 kW', 'E06', 'Tesisat Devresinde Aşırı Sıcaklık', 'Tesisat sıcaklığı 95 °C''yi geçtiğinde ürün arızaya geçer; sıcaklık düşünce yeniden çalışır. Bu durum fan veya eşanjör sisteminde arızaya işaret edebilir.', 'https://www.copa.com.tr/tr/images/dokumanlar/140/dokuman.pdf'),
  ('COPA', 'Nexa 24 kW', 'E08', 'Su Basınç Problemi', 'Tesisat su basıncı 0,4 barın altındaysa ürün arızaya geçer. Basıncı 1,5–2,0 bara çıkarın. Sorun sürerse basınç sensörü arızalı olabilir; sık tekrarlıyorsa tesisat kaçağı kontrol edilmelidir.', 'https://www.copa.com.tr/tr/images/dokumanlar/140/dokuman.pdf'),
  ('COPA', 'Nexa 24 kW', 'E09', 'Aşırı Isınma Termostat Arızası', 'Su sıcaklığı 95 °C''nin üzerine çıktığında güvenlik termostatı açar. Yaklaşık 80 °C''nin altında kapanır. Arıza tekrarlıyorsa fan veya eşanjör kontrolü gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/140/dokuman.pdf'),
  ('COPA', 'Nexa 24 kW', 'E10', 'Yüksek Su Basıncı Arızası', 'Tesisat su basıncı 3,5 barın üzerine çıkarsa hata oluşur; 3,0 barın altına düşünce giderilir. Sık tekrarlıyorsa genleşme tankı kontrol edilmelidir.', 'https://www.copa.com.tr/tr/images/dokumanlar/140/dokuman.pdf'),
  ('COPA', 'Nexa 24 kW', 'E17', 'Baca Sensörü Arızası', 'Baca sıcaklığı yükseldiğinde güvenlik sensörü cihazı arızaya geçirir. Sık tekrarlıyorsa fan ve eşanjör grubunun kontrolü gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/140/dokuman.pdf'),
  ('COPA', 'Nexa 24 kW', 'E24', 'Tesisat Dönüş Sensörü Arızası', 'Tesisattan dönen suyun sıcaklığını ölçen sensör arızalıdır. Sorun giderilene kadar hata devam eder; COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/140/dokuman.pdf'),
  ('COPA', 'Nexa 24 kW', 'E25', 'Donma Güvenliği', 'Tesisat suyu sıcaklığı 10 saniye boyunca 1 °C''nin altına düşerse hata oluşur; sıcaklık yükseldiğinde otomatik düzelir.', 'https://www.copa.com.tr/tr/images/dokumanlar/140/dokuman.pdf'),
  ('COPA', 'Nexa 24 kW', 'E30', 'Fan Sinyal Arızası', 'Fan sinyalinde kesinti olursa cihaz kilitlenir. Reset ile yeniden deneyin; hata sürerse fan kontrol edilmelidir.', 'https://www.copa.com.tr/tr/images/dokumanlar/140/dokuman.pdf'),
  ('COPA', 'Nexa 24 kW', 'E40', 'Anormal Fan Hızı Tespiti', 'Fan hız sinyali ayar değerinden uzun süre saparsa hata oluşur. Reset ile yeniden deneyin; hata sürerse servis kontrolü gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/140/dokuman.pdf'),
  ('COPA', 'Nexa 24 kW', 'E41', 'Brülör Yanma Hatası', 'Gaz valfi kapalı ve brülör devre dışıyken alev algılanırsa cihaz arızaya geçer. Olası gaz valfi arızası için servis kontrolü gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/140/dokuman.pdf'),
  ('COPA', 'Nexa 24 kW', 'E42', 'İyonizasyon Arızası', 'İyonizasyon elektrodundan 15 saniye boyunca akım alınamazsa cihaz arızaya geçer. Hata tekrarlıyorsa iyonizasyon elektrodu kontrol edilmelidir.', 'https://www.copa.com.tr/tr/images/dokumanlar/140/dokuman.pdf'),
  ('COPA', 'Nexa 24 kW', 'E44', 'Gaz Valfi Arızası', 'Gaz akışını kontrol eden valf arızasını bildirir. Gaz valfinin kontrolü için COPA yetkili servisine başvurun.', 'https://www.copa.com.tr/tr/images/dokumanlar/140/dokuman.pdf'),
  ('COPA', 'Nexa 24 kW', 'E45', 'Baca Gazı NTC Yüksek Sıcaklık', 'Yalnız baca gazı sensörü mevcut seçildiğinde geçerlidir. Baca gazı NTC probu 3 saniye boyunca 95 °C''nin üzerinde kalırsa kilitlenme oluşur. RESET gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/140/dokuman.pdf'),
  ('COPA', 'Nexa 24 kW', 'E46', 'Pompa Sinyali Yok veya Aralık Dışında', 'Yalnız PWM pompası seçildiğinde geçerlidir. Enkoder sinyali 10 saniye eksik veya aralık dışında kalırsa hata oluşur; sinyal 5 saniye aralıkta kalınca normal çalışma otomatik başlar.', 'https://www.copa.com.tr/tr/images/dokumanlar/140/dokuman.pdf'),
  ('COPA', 'Nexa 24 kW', 'E51', 'Fan Rotoru Kilitlenme Arızası', 'Fan açıkken fan kodlayıcısından 1 saniye sinyal alınmazsa hata oluşur. Sistem 20 saniye boyunca hatayı gidermeye çalışır; giderilemezse E30 kilitleme hatasına geçer.', 'https://www.copa.com.tr/tr/images/dokumanlar/140/dokuman.pdf'),
  ('COPA', 'e-Lecto 24 kW', 'E03', 'Yüksek Limit Sıcaklık Koruması', 'Devre kesici açıldığında ve 5 saniye boyunca devre kesiciden geri bildirim alınamadığında hata oluşur. Arızayı sıfırlamak için RESET gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/53/dokuman.pdf'),
  ('COPA', 'e-Lecto 24 kW', 'E04', 'Yanlış CB Geri Bildirimi', 'Devre kesici sürülmediği halde 2 saniye boyunca geri besleme alınırsa kilitlenme oluşur. Yanlış geri besleme kaybolduktan sonra RESET gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/53/dokuman.pdf'),
  ('COPA', 'e-Lecto 24 kW', 'F33', 'CH Dönüş NTC Prob Hatası', 'CH dönüş NTC sensöründe açık/kısa devre sorunu varsa hata oluşur. DHW ve CH talepleri durur; hata ortadan kalkınca normal çalışma yeniden başlar.', 'https://www.copa.com.tr/tr/images/dokumanlar/53/dokuman.pdf'),
  ('COPA', 'e-Lecto 24 kW', 'F35', 'CH Akış NTC Prob Hatası', 'CH akış NTC probu açık/kısa devre veya hasarlıysa hata oluşur. DHW ve CH talepleri durur; hata ortadan kalkınca normal çalışma yeniden başlar.', 'https://www.copa.com.tr/tr/images/dokumanlar/53/dokuman.pdf'),
  ('COPA', 'e-Lecto 24 kW', 'E80', 'CH Dönüş NTC Prob – CH Akış NTC Probu Değiştirme Testi Başarısız', 'CH akış NTC ile CH dönüş NTC değiştirme testi başarısız olursa hata oluşur. Arızayı sıfırlamak için RESET gerekir.', 'https://www.copa.com.tr/tr/images/dokumanlar/53/dokuman.pdf'),
  ('COPA', 'e-Lecto 24 kW', 'F13', 'Kilitleme Sıfırlaması Çok Sık Gerçekleşti Hatası', 'Kullanıcı sıfırlaması 1 saat içinde 5 kez olursa hata oluşur. DHW ve CH talepleri durur; hata yalnız beslemenin karttan çıkarılmasıyla giderilebilir.', 'https://www.copa.com.tr/tr/images/dokumanlar/53/dokuman.pdf'),
  ('COPA', 'e-Lecto 24 kW', 'F37', 'Düşük Su Basıncı Hatası', 'Su basıncı FP11/10 bar seviyesinin altına inerse hata oluşur. Basınç FP11/10 + 0,4 bar seviyesine yükseldiğinde hata otomatik silinir.', 'https://www.copa.com.tr/tr/images/dokumanlar/53/dokuman.pdf'),
  ('COPA', 'e-Lecto 24 kW', 'F39', 'Dış Mekan NTC Prob Hatası', 'Dış NTC''de kısa devre varsa veya sensör hasarlıysa hata oluşur. DHW ve CH talepleri durur; hata ortadan kalkınca normal çalışma yeniden başlar.', 'https://www.copa.com.tr/tr/images/dokumanlar/53/dokuman.pdf'),
  ('COPA', 'e-Lecto 24 kW', 'F40', 'Yüksek Su Basıncı', 'Su basıncı FP12/10 seviyesinin üzerine çıkarsa hata oluşur. Basınç FP12/10 - 0,2 bar seviyesine düştüğünde hata otomatik silinir.', 'https://www.copa.com.tr/tr/images/dokumanlar/53/dokuman.pdf'),
  ('COPA', 'e-Lecto 24 kW', 'F47', 'Su Basınç Sensörü Hatası', 'Su basınç sensörü hasarlıysa veya sensör kabloları açık/kısa devre ise hata oluşur. Hata ortadan kalkınca normal çalışma yeniden başlar.', 'https://www.copa.com.tr/tr/images/dokumanlar/53/dokuman.pdf'),
  ('COPA', 'e-Lecto 24 kW', 'F52', 'DHW NTC Prob Hatası', 'DHW NTC probu açık/kısa devre veya hasarlıysa hata oluşur. DHW ve CH talepleri durur; hata ortadan kalkınca normal çalışma yeniden başlar.', 'https://www.copa.com.tr/tr/images/dokumanlar/53/dokuman.pdf'),
  ('COPA', 'e-Lecto 24 kW', 'F70', 'Pompa Enkoder Sinyali Eksik veya Aralık Dışında Hatası', 'Yalnız PWM modülasyonlu pompa seçildiğinde geçerlidir. Enkoder sinyali 10 saniye boyunca eksik veya aralık dışında kalırsa hata oluşur; 5 saniye normal aralıkta kalınca çalışma otomatik başlar.', 'https://www.copa.com.tr/tr/images/dokumanlar/53/dokuman.pdf'),
  ('COPA', 'e-Lecto 24 kW', 'F34', 'Düşük Voltaj Hatası', 'Besleme hattı voltajı 170 ±15 V''un altına düşerse hata oluşur. Gerilim 180 ±15 V''un üzerine çıktığında normal çalışma yeniden başlar.', 'https://www.copa.com.tr/tr/images/dokumanlar/53/dokuman.pdf');
DO $$ BEGIN
 IF (SELECT count(*) FROM copa_raw_seed)<>185 OR EXISTS (
   SELECT 1 FROM copa_raw_seed WHERE brand<>'COPA' OR source_url !~ '^https://www\.copa\.com\.tr/') THEN
   RAISE EXCEPTION 'COPA raw seed/source integrity failure';
 END IF;
 IF EXISTS (SELECT 1 FROM copa_raw_seed s JOIN public.official_error_codes_raw r
   USING(brand,official_model,error_code) WHERE r.official_description IS DISTINCT FROM s.official_description
   OR r.official_action IS DISTINCT FROM s.official_action OR r.source_url IS DISTINCT FROM s.source_url) THEN
   RAISE EXCEPTION 'COPA existing raw conflicts with reviewed source';
 END IF;
 IF EXISTS (SELECT 1 FROM public.official_error_codes_raw r WHERE r.brand='COPA'
   AND NOT EXISTS(SELECT 1 FROM copa_raw_seed s WHERE (s.brand,s.official_model,s.error_code)=
                  (r.brand,r.official_model,r.error_code))) THEN
   RAISE EXCEPTION 'COPA unexpected existing raw scope';
 END IF;
END $$;
INSERT INTO public.official_error_codes_raw
 (brand,official_model,error_code,official_description,official_action,source_url,import_batch)
SELECT s.*, 'copa_official_excel_2026_09_28' FROM copa_raw_seed s
WHERE NOT EXISTS(SELECT 1 FROM public.official_error_codes_raw r
 WHERE (r.brand,r.official_model,r.error_code)=(s.brand,s.official_model,s.error_code));
CREATE TEMP TABLE copa_model_seed (
 family_name text NOT NULL, official_model_name text PRIMARY KEY, normalized_name text NOT NULL,
 fuel_type text NOT NULL, source_url text NOT NULL
) ON COMMIT DROP;
INSERT INTO copa_model_seed VALUES
  ('Eomix', 'Eomix 20', 'eomix 20', 'gas', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('Eomix', 'Eomix 24', 'eomix 24', 'gas', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('Eomix', 'Eomix 35', 'eomix 35', 'gas', 'https://www.copa.com.tr/tr/images/dokumanlar/59/dokuman.pdf'),
  ('Eomix Plus', 'Eomix Plus 24 kW', 'eomix plus 24 kw', 'gas', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('Eomix Plus', 'Eomix Plus 35 kW', 'eomix plus 35 kw', 'gas', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('Eomix Plus', 'Eomix Plus 42 kW', 'eomix plus 42 kw', 'gas', 'https://www.copa.com.tr/tr/images/dokumanlar/66/dokuman.pdf'),
  ('Ultimix', 'Ultimix 18', 'ultimix 18', 'gas', 'https://www.copa.com.tr/tr/images/dokumanlar/106/dokuman.pdf'),
  ('Ultimix', 'Ultimix 24', 'ultimix 24', 'gas', 'https://www.copa.com.tr/tr/images/dokumanlar/106/dokuman.pdf'),
  ('Nexa', 'Nexa 20 kW', 'nexa 20 kw', 'gas', 'https://www.copa.com.tr/tr/images/dokumanlar/140/dokuman.pdf'),
  ('Nexa', 'Nexa 24 kW', 'nexa 24 kw', 'gas', 'https://www.copa.com.tr/tr/images/dokumanlar/140/dokuman.pdf'),
  ('e-Lecto', 'e-Lecto 24 kW', 'e lecto 24 kw', 'electric', 'https://www.copa.com.tr/tr/images/dokumanlar/53/dokuman.pdf'),
  ('e-Lecto', 'e-Lecto 9 kW', 'e lecto 9 kw', 'electric', 'https://www.copa.com.tr/en/e-lecto'),
  ('e-Lecto', 'e-Lecto 12 kW', 'e lecto 12 kw', 'electric', 'https://www.copa.com.tr/en/e-lecto'),
  ('e-Lecto', 'e-Lecto 15 kW', 'e lecto 15 kw', 'electric', 'https://www.copa.com.tr/en/e-lecto'),
  ('e-Lecto', 'e-Lecto 18 kW', 'e lecto 18 kw', 'electric', 'https://www.copa.com.tr/en/e-lecto'),
  ('e-Lecto', 'e-Lecto 21 kW', 'e lecto 21 kw', 'electric', 'https://www.copa.com.tr/en/e-lecto');
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM copa_model_seed s JOIN public.boiler_model_families f
   ON f.brand='COPA' AND f.normalized_name=lower(s.family_name) WHERE f.fuel_type<>s.fuel_type) THEN
   RAISE EXCEPTION 'COPA existing family fuel conflict';
 END IF;
END $$;
INSERT INTO public.boiler_model_families(brand,family_name,normalized_name,fuel_type,is_active)
SELECT DISTINCT 'COPA',family_name,lower(family_name),fuel_type,true FROM copa_model_seed
ON CONFLICT(brand,normalized_name) DO NOTHING;
-- Punctuation is retained in stored family names; runtime normalizes it.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM copa_model_seed s JOIN public.boiler_model_families f
    ON f.brand='COPA' AND f.normalized_name=lower(s.family_name)
    JOIN public.boiler_official_models m ON m.family_id=f.id AND m.normalized_name=s.normalized_name
    WHERE m.official_model_name IS DISTINCT FROM s.official_model_name OR m.source_url IS DISTINCT FROM s.source_url
      OR NOT m.is_active OR NOT f.is_active) THEN
   RAISE EXCEPTION 'COPA existing official model conflict';
 END IF;
END $$;
INSERT INTO public.boiler_official_models(family_id,official_model_name,normalized_name,source_url,is_active)
SELECT f.id,s.official_model_name,s.normalized_name,s.source_url,true FROM copa_model_seed s
JOIN public.boiler_model_families f ON f.brand='COPA' AND f.normalized_name=lower(s.family_name)
ON CONFLICT(family_id,normalized_name) DO NOTHING;
CREATE TEMP TABLE copa_alias_seed(family_name text NOT NULL, official_model_name text,
 normalized_alias text NOT NULL) ON COMMIT DROP;
INSERT INTO copa_alias_seed VALUES
  ('Eomix', NULL, 'eomix'),
  ('Eomix', 'Eomix 20', 'eomix 20'),
  ('Eomix', 'Eomix 24', 'eomix 24'),
  ('Eomix', 'Eomix 35', 'eomix 35'),
  ('Eomix Plus', NULL, 'eomix plus'),
  ('Eomix Plus', NULL, 'eomixplus'),
  ('Eomix Plus', 'Eomix Plus 24 kW', 'eomix plus 24'),
  ('Eomix Plus', 'Eomix Plus 24 kW', 'eomix plus 24 kw'),
  ('Eomix Plus', 'Eomix Plus 24 kW', 'eomixplus 24'),
  ('Eomix Plus', 'Eomix Plus 35 kW', 'eomix plus 35'),
  ('Eomix Plus', 'Eomix Plus 35 kW', 'eomix plus 35 kw'),
  ('Eomix Plus', 'Eomix Plus 35 kW', 'eomixplus 35'),
  ('Eomix Plus', 'Eomix Plus 42 kW', 'eomix plus 42'),
  ('Eomix Plus', 'Eomix Plus 42 kW', 'eomix plus 42 kw'),
  ('Eomix Plus', 'Eomix Plus 42 kW', 'eomixplus 42'),
  ('Nexa', NULL, 'nexa'),
  ('Nexa', 'Nexa 20 kW', 'nexa 20'),
  ('Nexa', 'Nexa 20 kW', 'nexa 20 kw'),
  ('Nexa', 'Nexa 24 kW', 'nexa 24'),
  ('Nexa', 'Nexa 24 kW', 'nexa 24 kw'),
  ('Ultimix', NULL, 'ultimix'),
  ('Ultimix', 'Ultimix 18', 'ultimix 18'),
  ('Ultimix', 'Ultimix 24', 'ultimix 24'),
  ('e-Lecto', NULL, 'e lecto'),
  ('e-Lecto', NULL, 'electo'),
  ('e-Lecto', 'e-Lecto 12 kW', 'e lecto 12'),
  ('e-Lecto', 'e-Lecto 12 kW', 'e lecto 12 kw'),
  ('e-Lecto', 'e-Lecto 12 kW', 'electo 12'),
  ('e-Lecto', 'e-Lecto 15 kW', 'e lecto 15'),
  ('e-Lecto', 'e-Lecto 15 kW', 'e lecto 15 kw'),
  ('e-Lecto', 'e-Lecto 15 kW', 'electo 15'),
  ('e-Lecto', 'e-Lecto 18 kW', 'e lecto 18'),
  ('e-Lecto', 'e-Lecto 18 kW', 'e lecto 18 kw'),
  ('e-Lecto', 'e-Lecto 18 kW', 'electo 18'),
  ('e-Lecto', 'e-Lecto 21 kW', 'e lecto 21'),
  ('e-Lecto', 'e-Lecto 21 kW', 'e lecto 21 kw'),
  ('e-Lecto', 'e-Lecto 21 kW', 'electo 21'),
  ('e-Lecto', 'e-Lecto 24 kW', 'e lecto 24'),
  ('e-Lecto', 'e-Lecto 24 kW', 'e lecto 24 kw'),
  ('e-Lecto', 'e-Lecto 24 kW', 'electo 24'),
  ('e-Lecto', 'e-Lecto 9 kW', 'e lecto 9'),
  ('e-Lecto', 'e-Lecto 9 kW', 'e lecto 9 kw'),
  ('e-Lecto', 'e-Lecto 9 kW', 'electo 9');
INSERT INTO public.boiler_model_aliases(family_id,official_model_id,alias,normalized_alias,alias_type,is_verified)
SELECT f.id,m.id,s.normalized_alias,s.normalized_alias,'manufacturer',true FROM copa_alias_seed s
JOIN public.boiler_model_families f ON f.brand='COPA' AND f.normalized_name=lower(s.family_name)
LEFT JOIN public.boiler_official_models m ON m.family_id=f.id AND m.official_model_name=s.official_model_name
WHERE NOT EXISTS(SELECT 1 FROM public.boiler_model_aliases a WHERE a.family_id=f.id
 AND a.official_model_id IS NOT DISTINCT FROM m.id AND a.normalized_alias=s.normalized_alias);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.official_error_codes_raw WHERE brand='COPA')<>185
   OR (SELECT count(*) FROM copa_model_seed)<>16
   OR (SELECT count(*) FROM public.boiler_model_families WHERE brand='COPA' AND is_active)<>5
   OR (SELECT count(*) FROM copa_model_seed s JOIN public.boiler_official_models m ON m.official_model_name=s.official_model_name
       JOIN public.boiler_model_families f ON f.id=m.family_id AND f.brand='COPA' AND f.fuel_type=s.fuel_type
       WHERE m.is_active AND f.is_active)<>16 THEN
   RAISE EXCEPTION 'COPA post-import scope/fuel count mismatch';
 END IF;
 IF EXISTS(SELECT 1 FROM copa_alias_seed s JOIN public.boiler_model_families f
   ON f.brand='COPA' AND f.normalized_name=lower(s.family_name)
   LEFT JOIN public.boiler_official_models m ON m.family_id=f.id AND m.official_model_name=s.official_model_name
   LEFT JOIN public.boiler_model_aliases a ON a.family_id=f.id AND a.official_model_id IS NOT DISTINCT FROM m.id
     AND a.normalized_alias=s.normalized_alias AND a.is_verified
   WHERE a.id IS NULL OR (s.official_model_name IS NOT NULL AND m.id IS NULL)) THEN
   RAISE EXCEPTION 'COPA alias integrity failure';
 END IF;
END $$;
COMMIT;
