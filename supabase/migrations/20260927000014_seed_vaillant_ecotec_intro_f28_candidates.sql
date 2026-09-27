-- Teknik-O — Vaillant ecoTEC intro F.28 doğrulanmış kök neden adayları
-- Kaynak: kullanıcı tarafından sağlanan Vaillant resmî teknik veri seti.
-- Yalnızca F.28 kaydındaki üretici tedbirinde açıkça kontrol edilmesi istenen
-- teknik nedenler adaylaştırılır. Hata açıklaması tek başına kök neden sayılmaz.
BEGIN;

DO $$
DECLARE
  v_family uuid;
  v_raw_count bigint;
  v_action_count bigint;
BEGIN
  SELECT id INTO v_family
  FROM public.boiler_model_families
  WHERE brand = 'Vaillant'
    AND normalized_name = 'ecotec intro'
    AND is_active = true;

  IF v_family IS NULL THEN
    RAISE EXCEPTION 'Vaillant ecoTEC intro model ailesi bulunamadı';
  END IF;

  SELECT count(*) INTO v_raw_count
  FROM public.official_error_codes_raw
  WHERE brand = 'Vaillant'
    AND official_model IN (
      'ecoTEC intro VUW 18/24 AS/1-1',
      'ecoTEC intro VUW 24/28 AS/1-1'
    )
    AND upper(replace(error_code, ' ', '')) = 'F.28';

  IF v_raw_count <> 2 THEN
    RAISE EXCEPTION 'ecoTEC intro F.28 ham kayıt sayısı beklenen 2, mevcut %', v_raw_count;
  END IF;

  SELECT count(*) INTO v_action_count
  FROM public.official_error_codes_raw
  WHERE brand = 'Vaillant'
    AND official_model IN (
      'ecoTEC intro VUW 18/24 AS/1-1',
      'ecoTEC intro VUW 24/28 AS/1-1'
    )
    AND upper(replace(error_code, ' ', '')) = 'F.28'
    AND official_action ILIKE '%Gaz girişi/basıncı%'
    AND official_action ILIKE '%gaz armatürü%'
    AND official_action ILIKE '%ateşleme sistemi%'
    AND official_action ILIKE '%topraklama%'
    AND official_action ILIKE '%elektronik%'
    AND official_action ILIKE '%atık gaz yolu%';

  IF v_action_count <> 2 THEN
    RAISE EXCEPTION 'ecoTEC intro F.28 kaynak tedbiri beklenen teknik nedenleri açıkça desteklemiyor';
  END IF;
END $$;

WITH family AS (
  SELECT id
  FROM public.boiler_model_families
  WHERE brand = 'Vaillant'
    AND normalized_name = 'ecotec intro'
    AND is_active = true
),
raw_source AS (
  SELECT id, source_url, official_action
  FROM public.official_error_codes_raw
  WHERE brand = 'Vaillant'
    AND official_model = 'ecoTEC intro VUW 18/24 AS/1-1'
    AND upper(replace(error_code, ' ', '')) = 'F.28'
  ORDER BY id
  LIMIT 1
),
seed(candidate_key, candidate_name, description, fault_class) AS (
  VALUES
    ('vaillant_ecotec_intro_f28_gas_supply',
     'Gaz beslemesi veya giriş basıncı sorunu',
     'F.28 ateşleme başarısızlığında üretici gaz girişini ve gaz basıncını kontrol ettirir.',
     'gas_supply'),
    ('vaillant_ecotec_intro_f28_gas_valve',
     'Gaz armatürü arızası',
     'F.28 ateşleme başarısızlığında üretici gaz armatürünü kontrol ettirir.',
     'gas_supply'),
    ('vaillant_ecotec_intro_f28_ignition',
     'Ateşleme sistemi arızası',
     'F.28 ateşleme başarısızlığında üretici ateşleme sistemini kontrol ettirir.',
     'ignition'),
    ('vaillant_ecotec_intro_f28_grounding',
     'Topraklama veya elektrik bağlantısı sorunu',
     'F.28 ateşleme başarısızlığında üretici topraklamayı kontrol ettirir.',
     'electrical'),
    ('vaillant_ecotec_intro_f28_electronics',
     'Elektronik kontrol arızası',
     'F.28 ateşleme başarısızlığında üretici elektronik sistemi kontrol ettirir.',
     'electronic'),
    ('vaillant_ecotec_intro_f28_flue',
     'Atık gaz yolu sorunu',
     'F.28 ateşleme başarısızlığında üretici atık gaz yolunu kontrol ettirir.',
     'combustion_air')
)
INSERT INTO public.boiler_fault_candidates (
  official_error_record_id,
  family_id,
  official_model_id,
  error_code,
  candidate_key,
  candidate_name,
  description,
  fault_class,
  verification_status,
  evidence_source_type,
  evidence_url,
  evidence_note,
  requires_service,
  customer_observable,
  is_active
)
SELECT
  r.id,
  f.id,
  NULL,
  'F.28',
  s.candidate_key,
  s.candidate_name,
  s.description,
  s.fault_class,
  'verified',
  'official_manufacturer',
  r.source_url,
  'Vaillant ecoTEC intro F.28 üretici tedbiri: ' || r.official_action,
  true,
  false,
  true
FROM family f
CROSS JOIN raw_source r
CROSS JOIN seed s
WHERE NOT EXISTS (
  SELECT 1
  FROM public.boiler_fault_candidates c
  WHERE c.family_id = f.id
    AND c.error_code = 'F.28'
    AND c.candidate_key = s.candidate_key
);

DO $$
DECLARE
  v_count bigint;
  v_bad bigint;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.boiler_fault_candidates c
  JOIN public.boiler_model_families f ON f.id = c.family_id
  WHERE f.brand = 'Vaillant'
    AND f.normalized_name = 'ecotec intro'
    AND c.error_code = 'F.28'
    AND c.verification_status = 'verified'
    AND c.is_active = true
    AND c.candidate_key LIKE 'vaillant_ecotec_intro_f28_%';

  IF v_count <> 6 THEN
    RAISE EXCEPTION 'ecoTEC intro F.28 doğrulanmış aday sayısı beklenen 6, mevcut %', v_count;
  END IF;

  SELECT count(*) INTO v_bad
  FROM public.boiler_fault_candidates c
  JOIN public.boiler_model_families f ON f.id = c.family_id
  WHERE f.brand = 'Vaillant'
    AND f.normalized_name = 'ecotec intro'
    AND c.error_code = 'F.28'
    AND c.candidate_key LIKE 'vaillant_ecotec_intro_f28_%'
    AND (
      c.verification_status <> 'verified'
      OR c.evidence_source_type <> 'official_manufacturer'
      OR c.evidence_url IS NULL
      OR c.evidence_note IS NULL
    );

  IF v_bad <> 0 THEN
    RAISE EXCEPTION 'ecoTEC intro F.28 adaylarında doğrulama/kaynak alanı eksik';
  END IF;
END $$;

COMMIT;
