-- Teknik-O — Vaillant ecoTEC intro kalan F-kodları doğrulanmış kök neden adayları
-- Kaynak: kullanıcı tarafından sağlanan Vaillant resmî teknik veri seti.
-- Kural: Bir aday ancak kendi destek ifadesi canlı ham kaydın açıklama/tedbir metninde geçiyorsa eklenir.
BEGIN;

DO $$
DECLARE
  v_family uuid;
  v_raw bigint;
BEGIN
  SELECT id INTO v_family
  FROM public.boiler_model_families
  WHERE brand='Vaillant' AND normalized_name='ecotec intro' AND is_active=true;

  IF v_family IS NULL THEN
    RAISE EXCEPTION 'Vaillant ecoTEC intro ailesi bulunamadı';
  END IF;

  SELECT count(*) INTO v_raw
  FROM public.official_error_codes_raw
  WHERE brand='Vaillant'
    AND official_model IN ('ecoTEC intro VUW 18/24 AS/1-1','ecoTEC intro VUW 24/28 AS/1-1');

  IF v_raw <> 80 THEN
    RAISE EXCEPTION 'ecoTEC intro ham kayıt sayısı beklenen 80, mevcut %', v_raw;
  END IF;
END $$;

WITH seed(error_code,candidate_key,candidate_name,fault_class,support_phrase) AS (
  VALUES
    ('F.00', 'vaillant_ecotec_intro_f00_sensor', 'Gidiş sıcaklık sensörü arızası', 'sensor', 'sensör'),
    ('F.00', 'vaillant_ecotec_intro_f00_wiring', 'Sensör fişi / soket / kablo demeti bağlantı sorunu', 'electrical', 'kablo demeti'),
    ('F.01', 'vaillant_ecotec_intro_f01_sensor', 'Dönüş sıcaklık sensörü arızası', 'sensor', 'sensör'),
    ('F.01', 'vaillant_ecotec_intro_f01_wiring', 'Sensör fişi / soket / kablo demeti bağlantı sorunu', 'electrical', 'kablo demeti'),
    ('F.10', 'vaillant_ecotec_intro_f10_sensor', 'Gidiş sıcaklık sensörü arızası veya kısa devresi', 'sensor', 'gidiş sensörü'),
    ('F.10', 'vaillant_ecotec_intro_f10_wiring', 'Gidiş sensörü kablo demeti sorunu', 'electrical', 'kablo demeti'),
    ('F.11', 'vaillant_ecotec_intro_f11_sensor', 'Dönüş sıcaklık sensörü arızası veya kısa devresi', 'sensor', 'dönüş sensörü'),
    ('F.11', 'vaillant_ecotec_intro_f11_wiring', 'Dönüş sensörü kablo demeti sorunu', 'electrical', 'kablo demeti'),
    ('F.13', 'vaillant_ecotec_intro_f13_sensor', 'Boyler sıcaklık sensörü arızası veya kısa devresi', 'sensor', 'boyler sıcaklık sensörü'),
    ('F.13', 'vaillant_ecotec_intro_f13_wiring', 'Boyler sıcaklık sensörü bağlantı kablosu sorunu', 'electrical', 'bağlantı kablosu'),
    ('F.20', 'vaillant_ecotec_intro_f20_flow_sensor', 'Gidiş/dönüş sıcaklık sensörü sorunu', 'sensor', 'gidiş/dönüş sensörleri'),
    ('F.20', 'vaillant_ecotec_intro_f20_chassis', 'Şasi / topraklama bağlantısı sorunu', 'electrical', 'şasi bağlantısı'),
    ('F.20', 'vaillant_ecotec_intro_f20_ignition', 'Ateşleme elemanı sorunu', 'ignition', 'ateşleme elemanları'),
    ('F.22', 'vaillant_ecotec_intro_f22_low_pressure', 'Isıtma sistemi su basıncının çok düşük olması', 'hydraulic', 'sistemi doldurulur'),
    ('F.22', 'vaillant_ecotec_intro_f22_pressure_sensor', 'Su basıncı sensörü arızası', 'sensor', 'su basıncı sensörü'),
    ('F.22', 'vaillant_ecotec_intro_f22_wiring', 'Su basıncı sensörü kablo/bağlantı sorunu', 'electrical', 'ilgili kablolar'),
    ('F.23', 'vaillant_ecotec_intro_f23_pump', 'Sirkülasyon pompası sorunu', 'mechanical', 'pompa'),
    ('F.23', 'vaillant_ecotec_intro_f23_air', 'Isıtma sisteminde hava bulunması', 'hydraulic', 'sistem havası'),
    ('F.23', 'vaillant_ecotec_intro_f23_sensor_connection', 'Gidiş/dönüş sensör bağlantısı sorunu', 'electrical', 'sensör bağlantıları'),
    ('F.24', 'vaillant_ecotec_intro_f24_pump', 'Sirkülasyon pompası sorunu', 'mechanical', 'pompa'),
    ('F.24', 'vaillant_ecotec_intro_f24_air_pressure', 'Sistem havası veya tesisat basıncı sorunu', 'hydraulic', 'sistem havası/basıncı'),
    ('F.24', 'vaillant_ecotec_intro_f24_check_valve', 'Çekvalf sorunu', 'mechanical', 'çekvalf'),
    ('F.25', 'vaillant_ecotec_intro_f25_flue_limit', 'Atık gaz limit termostatı arızası veya bağlantı sorunu', 'sensor', 'atık gaz limit termostatı'),
    ('F.25', 'vaillant_ecotec_intro_f25_wiring', 'Atık gaz limit termostatı kablo demeti sorunu', 'electrical', 'kablo demeti'),
    ('F.27', 'vaillant_ecotec_intro_f27_pcb', 'Elektronik kart arızası', 'electronic', 'elektronik kart'),
    ('F.27', 'vaillant_ecotec_intro_f27_gas_valve', 'Selenoid gaz valfi arızası', 'gas_supply', 'selenoid gaz valfi'),
    ('F.29', 'vaillant_ecotec_intro_f29_gas_supply', 'Gaz girişi / gaz beslemesi sorunu', 'gas_supply', 'gaz girişi'),
    ('F.29', 'vaillant_ecotec_intro_f29_flue_recirculation', 'Atık gaz devridaimi sorunu', 'combustion_air', 'atık gaz devridaimi'),
    ('F.29', 'vaillant_ecotec_intro_f29_grounding', 'Topraklama sorunu', 'electrical', 'topraklama'),
    ('F.29', 'vaillant_ecotec_intro_f29_ignition_transformer', 'Ateşleme trafosu arızası', 'ignition', 'ateşleme trafosu'),
    ('F.29', 'vaillant_ecotec_intro_f29_condensate', 'Yoğuşma suyu gideri tıkanıklığı/sorunu', 'hydraulic', 'yoğuşma suyu gideri'),
    ('F.32', 'vaillant_ecotec_intro_f32_fan', 'Fan arızası', 'mechanical', 'fan/hall sensörü'),
    ('F.32', 'vaillant_ecotec_intro_f32_hall', 'Fan Hall sensörü arızası', 'sensor', 'hall sensörü'),
    ('F.32', 'vaillant_ecotec_intro_f32_wiring', 'Fan fişi / soket / kablo demeti sorunu', 'electrical', 'kablo demeti'),
    ('F.32', 'vaillant_ecotec_intro_f32_electronics', 'Elektronik kontrol arızası', 'electronic', 'elektronik'),
    ('F.33', 'vaillant_ecotec_intro_f33_air_flue', 'Yanma havası / atık gaz borusu sorunu', 'combustion_air', 'yanma havası/atık gaz borusu'),
    ('F.33', 'vaillant_ecotec_intro_f33_fan', 'Fan sorunu', 'mechanical', 'fan'),
    ('F.33', 'vaillant_ecotec_intro_f33_electronics', 'Elektronik kontrol arızası', 'electronic', 'elektronik'),
    ('F.33', 'vaillant_ecotec_intro_f33_sensor', 'Yanma havası/atık gaz sistemi sensörü sorunu', 'sensor', 'ilgili sensörler'),
    ('F.46', 'vaillant_ecotec_intro_f46_sensor', 'Soğuk su sensörü arızası veya kısa devresi', 'sensor', 'soğuk su sensörü'),
    ('F.46', 'vaillant_ecotec_intro_f46_wiring', 'Soğuk su sensörü kablo demeti sorunu', 'electrical', 'kablo demeti'),
    ('F.49', 'vaillant_ecotec_intro_f49_short', 'e-Veri yolu kısa devresi', 'electrical', 'kısa devre'),
    ('F.49', 'vaillant_ecotec_intro_f49_overload', 'e-Veri yolu aşırı yükü', 'electrical', 'aşırı yük'),
    ('F.49', 'vaillant_ecotec_intro_f49_polarity', 'e-Veri yolu kutuplama/bağlantı hatası', 'electrical', 'kutuplama'),
    ('F.61', 'vaillant_ecotec_intro_f61_gas_valve_wiring', 'Gaz armatürü kablo demeti sorunu', 'electrical', 'gaz armatürü kablo demeti'),
    ('F.61', 'vaillant_ecotec_intro_f61_gas_valve', 'Gaz armatürü arızası', 'gas_supply', 'gaz armatürü'),
    ('F.61', 'vaillant_ecotec_intro_f61_pcb', 'Elektronik kart arızası', 'electronic', 'elektronik kart'),
    ('F.62', 'vaillant_ecotec_intro_f62_gas_valve', 'Gaz armatürü arızası', 'gas_supply', 'gaz armatürü'),
    ('F.62', 'vaillant_ecotec_intro_f62_pcb', 'Elektronik kart arızası', 'electronic', 'elektronik kart'),
    ('F.62', 'vaillant_ecotec_intro_f62_electrode', 'Ateşleme elektrodu arızası', 'ignition', 'ateşleme elektrodu'),
    ('F.63', 'vaillant_ecotec_intro_f63_pcb', 'EEPROM / elektronik kart arızası', 'electronic', 'elektronik kart'),
    ('F.64', 'vaillant_ecotec_intro_f64_flow_sensor', 'Gidiş sıcaklık sensörü arızası', 'sensor', 'gidiş/dönüş sıcaklık sensörleri'),
    ('F.64', 'vaillant_ecotec_intro_f64_return_sensor', 'Dönüş sıcaklık sensörü arızası', 'sensor', 'gidiş/dönüş sıcaklık sensörleri'),
    ('F.64', 'vaillant_ecotec_intro_f64_pcb', 'Elektronik kart arızası', 'electronic', 'elektronik kart'),
    ('F.65', 'vaillant_ecotec_intro_f65_external_heat', 'Elektroniğe dışarıdan aşırı ısı etkisi', 'installation', 'dış ısı etkisi'),
    ('F.65', 'vaillant_ecotec_intro_f65_pcb', 'Elektronik kart arızası', 'electronic', 'elektronik kart'),
    ('F.67', 'vaillant_ecotec_intro_f67_flame_signal', 'Alev sinyali / iyonizasyon algılama sorunu', 'ignition', 'alev sinyali'),
    ('F.67', 'vaillant_ecotec_intro_f67_pcb', 'Elektronik kart arızası', 'electronic', 'elektronik kart'),
    ('F.67', 'vaillant_ecotec_intro_f67_flue', 'Atık gaz yolu sorunu', 'combustion_air', 'atık gaz yolu'),
    ('F.68', 'vaillant_ecotec_intro_f68_gas_pressure', 'Gaz hattı veya gaz basıncı sorunu', 'gas_supply', 'gaz hattı/basıncı'),
    ('F.68', 'vaillant_ecotec_intro_f68_air_mix', 'Gaz-hava karışım oranı sorunu', 'combustion_air', 'hava karışım oranı'),
    ('F.68', 'vaillant_ecotec_intro_f68_flue_recirculation', 'Atık gaz devridaimi sorunu', 'combustion_air', 'atık gaz devridaimi'),
    ('F.68', 'vaillant_ecotec_intro_f68_condensate', 'Yoğuşma gideri sorunu', 'hydraulic', 'yoğuşma gideri'),
    ('F.70', 'vaillant_ecotec_intro_f70_dsn', 'Yanlış cihaz tipi numarası (DSN) ayarı', 'electronic', 'doğru cihaz tipi numarası'),
    ('F.71', 'vaillant_ecotec_intro_f71_sensor_position', 'Gidiş sıcaklık sensörü konum/montaj sorunu', 'installation', 'konumu'),
    ('F.71', 'vaillant_ecotec_intro_f71_sensor', 'Gidiş sıcaklık sensörü arızası', 'sensor', 'gidiş sıcaklık sensörünün'),
    ('F.72', 'vaillant_ecotec_intro_f72_flow_sensor', 'Gidiş sıcaklık sensörü arızası', 'sensor', 'gidiş ve dönüş sıcaklık sensörleri'),
    ('F.72', 'vaillant_ecotec_intro_f72_return_sensor', 'Dönüş sıcaklık sensörü arızası', 'sensor', 'gidiş ve dönüş sıcaklık sensörleri'),
    ('F.73', 'vaillant_ecotec_intro_f73_pressure_sensor', 'Su basıncı sensörü arızası', 'sensor', 'su basıncı sensörü'),
    ('F.73', 'vaillant_ecotec_intro_f73_wiring', 'Su basıncı sensörü kablo demeti sorunu', 'electrical', 'kablo demeti'),
    ('F.74', 'vaillant_ecotec_intro_f74_pressure_sensor', 'Su basıncı sensörü arızası', 'sensor', 'su basıncı sensörü'),
    ('F.74', 'vaillant_ecotec_intro_f74_wiring', 'Su basıncı sensörü kablo demeti sorunu', 'electrical', 'kablo demeti'),
    ('F.76', 'vaillant_ecotec_intro_f76_heat_exchanger_leak', 'Eşanjör sızıntısı', 'hydraulic', 'eşanjör sızıntı'),
    ('F.76', 'vaillant_ecotec_intro_f76_thermal_fuse', 'Termik sigorta / termik kapatma düzeneği arızası', 'electrical', 'termik sigorta'),
    ('F.77', 'vaillant_ecotec_intro_f77_flue_damper', 'Atık gaz klapesi arızası', 'combustion_air', 'atık gaz klapesi'),
    ('F.77', 'vaillant_ecotec_intro_f77_condensate_pump', 'Yoğuşma suyu pompası arızası', 'mechanical', 'yoğuşma suyu pompası'),
    ('F.78', 'vaillant_ecotec_intro_f78_ntc', 'Sıcak su çıkış NTC sensörü arızası', 'sensor', 'ntc sensörü'),
    ('F.83', 'vaillant_ecotec_intro_f83_pressure', 'Sistem basıncı / su miktarı yetersizliği', 'hydraulic', 'sistem basıncı'),
    ('F.83', 'vaillant_ecotec_intro_f83_sensor_contact', 'NTC sensörlerinin boruya temas/montaj sorunu', 'installation', 'sensörlerin boruya teması'),
    ('F.84', 'vaillant_ecotec_intro_f84_sensor_installation', 'Gidiş/dönüş sensörlerinin yanlış montajı', 'installation', 'doğru monte'),
    ('F.85', 'vaillant_ecotec_intro_f85_sensor_installation', 'Gidiş/dönüş sensörlerinin yanlış borulara monte edilmesi', 'installation', 'doğru borulara monte'),
    ('F.86', 'vaillant_ecotec_intro_f86_limit_thermostat', 'Limit termostat sorunu', 'sensor', 'limit termostat'),
    ('F.86', 'vaillant_ecotec_intro_f86_flow_sensor', 'Gidiş sensörü sorunu', 'sensor', 'gidiş sensörü'),
    ('F.86', 'vaillant_ecotec_intro_f86_three_way_valve', 'Üç yollu vana sorunu', 'mechanical', 'üç yollu vana'),
    ('F.86', 'vaillant_ecotec_intro_f86_condensate_pump', 'Yoğuşma suyu pompası sorunu', 'mechanical', 'yoğuşma suyu pompası'),
    ('F.87', 'vaillant_ecotec_intro_f87_ignition_transformer', 'Ateşleme trafosu arızası', 'ignition', 'ateşleme trafosu'),
    ('F.87', 'vaillant_ecotec_intro_f87_wiring', 'Ateşleme trafosu bağlantı/kablo demeti sorunu', 'electrical', 'kablo demeti'),
    ('F.88', 'vaillant_ecotec_intro_f88_gas_valve', 'Gaz armatürü arızası', 'gas_supply', 'gaz armatürü'),
    ('F.88', 'vaillant_ecotec_intro_f88_wiring', 'Gaz armatürü bağlantı/kablo demeti sorunu', 'electrical', 'kablo demeti'),
    ('F.89', 'vaillant_ecotec_intro_f89_pump', 'Pompa arızası veya yanlış pompa tipi', 'mechanical', 'doğru pompa tipi'),
    ('F.89', 'vaillant_ecotec_intro_f89_wiring', 'Pompa bağlantı/kablo demeti sorunu', 'electrical', 'kablo demeti'),
    ('F.97', 'vaillant_ecotec_intro_f97_pcb', 'Ana elektronik devre kartı arızası', 'electronic', 'elektronik kart')
),
family AS (
  SELECT id
  FROM public.boiler_model_families
  WHERE brand='Vaillant' AND normalized_name='ecotec intro' AND is_active=true
),
raw_one AS (
  SELECT DISTINCT ON (error_code)
    id, error_code, official_description, official_action, source_url
  FROM public.official_error_codes_raw
  WHERE brand='Vaillant'
    AND official_model='ecoTEC intro VUW 18/24 AS/1-1'
    AND error_code <> 'F.28'
  ORDER BY error_code,id
)
INSERT INTO public.boiler_fault_candidates (
  official_error_record_id,family_id,official_model_id,error_code,
  candidate_key,candidate_name,description,fault_class,
  verification_status,evidence_source_type,evidence_url,evidence_note,
  requires_service,customer_observable,is_active
)
SELECT
  r.id,
  f.id,
  NULL,
  s.error_code,
  s.candidate_key,
  s.candidate_name,
  'Vaillant ecoTEC intro ' || s.error_code || ' kaynağında açıkça kontrol edilen neden.',
  s.fault_class,
  'verified',
  'official_manufacturer',
  r.source_url,
  'Üretici açıklaması: ' || coalesce(r.official_description,'') ||
  ' | Üretici tedbiri: ' || coalesce(r.official_action,''),
  true,
  false,
  true
FROM seed s
JOIN raw_one r ON r.error_code=s.error_code
CROSS JOIN family f
WHERE (coalesce(r.official_description,'') || ' ' || coalesce(r.official_action,'')) ILIKE '%' || s.support_phrase || '%'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_fault_candidates c
    WHERE c.family_id=f.id
      AND c.error_code=s.error_code
      AND c.candidate_key=s.candidate_key
  );

DO $$
DECLARE
  v_count bigint;
  v_supported bigint;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.boiler_fault_candidates c
  JOIN public.boiler_model_families f ON f.id=c.family_id
  WHERE f.brand='Vaillant'
    AND f.normalized_name='ecotec intro'
    AND c.error_code <> 'F.28'
    AND c.candidate_key LIKE 'vaillant_ecotec_intro_%'
    AND c.verification_status='verified'
    AND c.is_active=true;

  IF v_count <> 92 THEN
    RAISE EXCEPTION 'ecoTEC intro kalan kodlar aday sayısı beklenen 92, mevcut %', v_count;
  END IF;

  SELECT count(*) INTO v_supported
  FROM public.boiler_fault_candidates c
  JOIN public.boiler_model_families f ON f.id=c.family_id
  WHERE f.brand='Vaillant'
    AND f.normalized_name='ecotec intro'
    AND c.candidate_key LIKE 'vaillant_ecotec_intro_%'
    AND (c.evidence_source_type <> 'official_manufacturer'
         OR c.evidence_url IS NULL
         OR c.evidence_note IS NULL);

  IF v_supported <> 0 THEN
    RAISE EXCEPTION 'ecoTEC intro adaylarında kaynak/doğrulama alanı eksik';
  END IF;
END $$;

COMMIT;
