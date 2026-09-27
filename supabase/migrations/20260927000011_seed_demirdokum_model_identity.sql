-- Teknik-O — DemirDöküm cihaz tanıma katmanı
-- 16 model ailesi, 39 resmi model ve güvenli alias kayıtları
-- Ham official_error_codes_raw verisine dokunmaz.
BEGIN;

-- 1) Model aileleri
INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('DemirDöküm', 'ademiX', 'ademix', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('DemirDöküm', 'Adonis', 'adonis', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('DemirDöküm', 'Atromix', 'atromix', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('DemirDöküm', 'Atron Condense', 'atron condense', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('DemirDöküm', 'Atron', 'atron', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('DemirDöküm', 'isomiX', 'isomix', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('DemirDöküm', 'Kalisto', 'kalisto', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('DemirDöküm', 'Nepto', 'nepto', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('DemirDöküm', 'Neva', 'neva', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('DemirDöküm', 'nitromiX ioni', 'nitromix ioni', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('DemirDöküm', 'nitromiX', 'nitromix', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('DemirDöküm', 'Nitron Condense', 'nitron condense', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('DemirDöküm', 'Nitron', 'nitron', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('DemirDöküm', 'Nitron Plus', 'nitron plus', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('DemirDöküm', 'Sargon Condense', 'sargon condense', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('DemirDöküm', 'vintomiX', 'vintomix', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

-- 2) Resmî modeller
INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'ademiX P18/24-AS/1',
  'ademix p18/24-as/1',
  NULL,
  NULL,
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'ademix'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'ademiX P24/24-AS/2',
  'ademix p24/24-as/2',
  NULL,
  NULL,
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'ademix'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'ademiX P24/28-AS/1',
  'ademix p24/28-as/1',
  NULL,
  NULL,
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'ademix'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'ademiX P28/28-AS/2',
  'ademix p28/28-as/2',
  NULL,
  NULL,
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'ademix'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Adonis B 24',
  'adonis b 24',
  NULL,
  NULL,
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'adonis'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Atromix P20',
  'atromix p20',
  NULL,
  NULL,
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'atromix'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Atromix P24',
  'atromix p24',
  NULL,
  NULL,
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'atromix'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Atromix P28',
  'atromix p28',
  NULL,
  NULL,
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'atromix'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Atron Condense P 20-FC/3 (H-TR)',
  'atron condense p 20-fc/3 (h-tr)',
  NULL,
  NULL,
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'atron condense'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Atron Condense P 24-FC/3 (H-TR)',
  'atron condense p 24-fc/3 (h-tr)',
  NULL,
  NULL,
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'atron condense'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Atron H24',
  'atron h24',
  NULL,
  NULL,
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'atron'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Atron H28',
  'atron h28',
  NULL,
  NULL,
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'atron'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'isomiX P 35-CS/1 (N-TR)',
  'isomix p 35-cs/1 (n-tr)',
  NULL,
  NULL,
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'isomix'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Kalisto BK-B-124 C',
  'kalisto bk-b-124 c',
  NULL,
  NULL,
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'kalisto'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Kalisto BK-B-128 C',
  'kalisto bk-b-128 c',
  NULL,
  NULL,
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'kalisto'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Kalisto HK-B-124 C',
  'kalisto hk-b-124 c',
  NULL,
  NULL,
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'kalisto'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Kalisto HK-B-128 C',
  'kalisto hk-b-128 c',
  NULL,
  NULL,
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'kalisto'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Nepto HK T 224',
  'nepto hk t 224',
  NULL,
  NULL,
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'nepto'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Nepto HK T 228',
  'nepto hk t 228',
  NULL,
  NULL,
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'nepto'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Neva HK 24',
  'neva hk 24',
  NULL,
  NULL,
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'neva'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Neva HK 28',
  'neva hk 28',
  NULL,
  NULL,
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'neva'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'nitromiX ioni P24/26-CS/1 (N-TR)',
  'nitromix ioni p24/26-cs/1 (n-tr)',
  NULL,
  NULL,
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'nitromix ioni'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'nitromiX ioni P28/36-CS/1 (N-TR)',
  'nitromix ioni p28/36-cs/1 (n-tr)',
  NULL,
  NULL,
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'nitromix ioni'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'nitromiX ioni P34/36-CS/1 (N-TR)',
  'nitromix ioni p34/36-cs/1 (n-tr)',
  NULL,
  NULL,
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'nitromix ioni'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'nitromiX P24 NG (HEP)',
  'nitromix p24 ng (hep)',
  NULL,
  NULL,
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'nitromix'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'nitromiX P28 NG (HEP)',
  'nitromix p28 ng (hep)',
  NULL,
  NULL,
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'nitromix'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'nitromiX P35 NG (HEP)',
  'nitromix p35 ng (hep)',
  NULL,
  NULL,
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'nitromix'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Nitron Condense 24 (H-TR)',
  'nitron condense 24 (h-tr)',
  NULL,
  NULL,
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'nitron condense'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Nitron Condense 24 (H-TR/HEP)',
  'nitron condense 24 (h-tr/hep)',
  NULL,
  NULL,
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'nitron condense'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Nitron Condense 28 (H-TR)',
  'nitron condense 28 (h-tr)',
  NULL,
  NULL,
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'nitron condense'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Nitron Condense 28 (H-TR/HEP)',
  'nitron condense 28 (h-tr/hep)',
  NULL,
  NULL,
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'nitron condense'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Nitron HK F 224',
  'nitron hk f 224',
  NULL,
  NULL,
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'nitron'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Nitron HK F 230',
  'nitron hk f 230',
  NULL,
  NULL,
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'nitron'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Nitron Plus HK 24 (H-TR)',
  'nitron plus hk 24 (h-tr)',
  NULL,
  NULL,
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'nitron plus'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Nitron Plus HK 30 (H-TR)',
  'nitron plus hk 30 (h-tr)',
  NULL,
  NULL,
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'nitron plus'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Sargon Condense HK B 224 CM',
  'sargon condense hk b 224 cm',
  NULL,
  NULL,
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'sargon condense'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Sargon Condense HK B 230 CM',
  'sargon condense hk b 230 cm',
  NULL,
  NULL,
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'sargon condense'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'vintomiX P 24/28-AS/1',
  'vintomix p 24/28-as/1',
  NULL,
  NULL,
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'vintomix'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'vintomiX P 28/36-AS/1',
  'vintomix p 28/36-as/1',
  NULL,
  NULL,
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'vintomix'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  is_active = true,
  updated_at = now();

-- 3) Aile aliasları — yalnız güvenli, doğrudan aile adı eşleşmeleri
INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  NULL,
  'ademiX',
  'ademix',
  'customer',
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'ademix'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'ademix'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  NULL,
  'Adonis',
  'adonis',
  'customer',
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'adonis'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'adonis'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  NULL,
  'Atromix',
  'atromix',
  'customer',
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'atromix'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'atromix'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  NULL,
  'Atron Condense',
  'atron condense',
  'customer',
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'atron condense'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'atron condense'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  NULL,
  'Atron',
  'atron',
  'customer',
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'atron'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'atron'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  NULL,
  'isomiX',
  'isomix',
  'customer',
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'isomix'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'isomix'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  NULL,
  'Kalisto',
  'kalisto',
  'customer',
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'kalisto'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'kalisto'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  NULL,
  'Nepto',
  'nepto',
  'customer',
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'nepto'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'nepto'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  NULL,
  'Neva',
  'neva',
  'customer',
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'neva'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'neva'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  NULL,
  'nitromiX ioni',
  'nitromix ioni',
  'customer',
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'nitromix ioni'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'nitromix ioni'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  NULL,
  'nitromiX',
  'nitromix',
  'customer',
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'nitromix'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'nitromix'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  NULL,
  'Nitron Condense',
  'nitron condense',
  'customer',
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'nitron condense'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'nitron condense'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  NULL,
  'Nitron',
  'nitron',
  'customer',
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'nitron'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'nitron'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  NULL,
  'Nitron Plus',
  'nitron plus',
  'customer',
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'nitron plus'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'nitron plus'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  NULL,
  'Sargon Condense',
  'sargon condense',
  'customer',
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'sargon condense'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'sargon condense'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  NULL,
  'vintomiX',
  'vintomix',
  'customer',
  true
FROM public.boiler_model_families f
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'vintomix'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'vintomix'
  );

-- 4) Resmî model adlarını manufacturer alias olarak kaydet
INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  m.id,
  'ademiX P18/24-AS/1',
  'ademix p18/24-as/1',
  'manufacturer',
  true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m
  ON m.family_id = f.id
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'ademix'
  AND m.normalized_name = 'ademix p18/24-as/1'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'ademix p18/24-as/1'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  m.id,
  'ademiX P24/24-AS/2',
  'ademix p24/24-as/2',
  'manufacturer',
  true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m
  ON m.family_id = f.id
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'ademix'
  AND m.normalized_name = 'ademix p24/24-as/2'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'ademix p24/24-as/2'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  m.id,
  'ademiX P24/28-AS/1',
  'ademix p24/28-as/1',
  'manufacturer',
  true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m
  ON m.family_id = f.id
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'ademix'
  AND m.normalized_name = 'ademix p24/28-as/1'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'ademix p24/28-as/1'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  m.id,
  'ademiX P28/28-AS/2',
  'ademix p28/28-as/2',
  'manufacturer',
  true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m
  ON m.family_id = f.id
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'ademix'
  AND m.normalized_name = 'ademix p28/28-as/2'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'ademix p28/28-as/2'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  m.id,
  'Adonis B 24',
  'adonis b 24',
  'manufacturer',
  true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m
  ON m.family_id = f.id
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'adonis'
  AND m.normalized_name = 'adonis b 24'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'adonis b 24'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  m.id,
  'Atromix P20',
  'atromix p20',
  'manufacturer',
  true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m
  ON m.family_id = f.id
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'atromix'
  AND m.normalized_name = 'atromix p20'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'atromix p20'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  m.id,
  'Atromix P24',
  'atromix p24',
  'manufacturer',
  true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m
  ON m.family_id = f.id
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'atromix'
  AND m.normalized_name = 'atromix p24'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'atromix p24'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  m.id,
  'Atromix P28',
  'atromix p28',
  'manufacturer',
  true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m
  ON m.family_id = f.id
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'atromix'
  AND m.normalized_name = 'atromix p28'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'atromix p28'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  m.id,
  'Atron Condense P 20-FC/3 (H-TR)',
  'atron condense p 20-fc/3 (h-tr)',
  'manufacturer',
  true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m
  ON m.family_id = f.id
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'atron condense'
  AND m.normalized_name = 'atron condense p 20-fc/3 (h-tr)'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'atron condense p 20-fc/3 (h-tr)'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  m.id,
  'Atron Condense P 24-FC/3 (H-TR)',
  'atron condense p 24-fc/3 (h-tr)',
  'manufacturer',
  true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m
  ON m.family_id = f.id
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'atron condense'
  AND m.normalized_name = 'atron condense p 24-fc/3 (h-tr)'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'atron condense p 24-fc/3 (h-tr)'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  m.id,
  'Atron H24',
  'atron h24',
  'manufacturer',
  true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m
  ON m.family_id = f.id
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'atron'
  AND m.normalized_name = 'atron h24'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'atron h24'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  m.id,
  'Atron H28',
  'atron h28',
  'manufacturer',
  true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m
  ON m.family_id = f.id
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'atron'
  AND m.normalized_name = 'atron h28'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'atron h28'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  m.id,
  'isomiX P 35-CS/1 (N-TR)',
  'isomix p 35-cs/1 (n-tr)',
  'manufacturer',
  true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m
  ON m.family_id = f.id
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'isomix'
  AND m.normalized_name = 'isomix p 35-cs/1 (n-tr)'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'isomix p 35-cs/1 (n-tr)'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  m.id,
  'Kalisto BK-B-124 C',
  'kalisto bk-b-124 c',
  'manufacturer',
  true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m
  ON m.family_id = f.id
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'kalisto'
  AND m.normalized_name = 'kalisto bk-b-124 c'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'kalisto bk-b-124 c'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  m.id,
  'Kalisto BK-B-128 C',
  'kalisto bk-b-128 c',
  'manufacturer',
  true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m
  ON m.family_id = f.id
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'kalisto'
  AND m.normalized_name = 'kalisto bk-b-128 c'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'kalisto bk-b-128 c'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  m.id,
  'Kalisto HK-B-124 C',
  'kalisto hk-b-124 c',
  'manufacturer',
  true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m
  ON m.family_id = f.id
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'kalisto'
  AND m.normalized_name = 'kalisto hk-b-124 c'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'kalisto hk-b-124 c'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  m.id,
  'Kalisto HK-B-128 C',
  'kalisto hk-b-128 c',
  'manufacturer',
  true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m
  ON m.family_id = f.id
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'kalisto'
  AND m.normalized_name = 'kalisto hk-b-128 c'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'kalisto hk-b-128 c'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  m.id,
  'Nepto HK T 224',
  'nepto hk t 224',
  'manufacturer',
  true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m
  ON m.family_id = f.id
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'nepto'
  AND m.normalized_name = 'nepto hk t 224'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'nepto hk t 224'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  m.id,
  'Nepto HK T 228',
  'nepto hk t 228',
  'manufacturer',
  true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m
  ON m.family_id = f.id
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'nepto'
  AND m.normalized_name = 'nepto hk t 228'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'nepto hk t 228'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  m.id,
  'Neva HK 24',
  'neva hk 24',
  'manufacturer',
  true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m
  ON m.family_id = f.id
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'neva'
  AND m.normalized_name = 'neva hk 24'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'neva hk 24'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  m.id,
  'Neva HK 28',
  'neva hk 28',
  'manufacturer',
  true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m
  ON m.family_id = f.id
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'neva'
  AND m.normalized_name = 'neva hk 28'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'neva hk 28'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  m.id,
  'nitromiX ioni P24/26-CS/1 (N-TR)',
  'nitromix ioni p24/26-cs/1 (n-tr)',
  'manufacturer',
  true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m
  ON m.family_id = f.id
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'nitromix ioni'
  AND m.normalized_name = 'nitromix ioni p24/26-cs/1 (n-tr)'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'nitromix ioni p24/26-cs/1 (n-tr)'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  m.id,
  'nitromiX ioni P28/36-CS/1 (N-TR)',
  'nitromix ioni p28/36-cs/1 (n-tr)',
  'manufacturer',
  true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m
  ON m.family_id = f.id
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'nitromix ioni'
  AND m.normalized_name = 'nitromix ioni p28/36-cs/1 (n-tr)'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'nitromix ioni p28/36-cs/1 (n-tr)'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  m.id,
  'nitromiX ioni P34/36-CS/1 (N-TR)',
  'nitromix ioni p34/36-cs/1 (n-tr)',
  'manufacturer',
  true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m
  ON m.family_id = f.id
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'nitromix ioni'
  AND m.normalized_name = 'nitromix ioni p34/36-cs/1 (n-tr)'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'nitromix ioni p34/36-cs/1 (n-tr)'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  m.id,
  'nitromiX P24 NG (HEP)',
  'nitromix p24 ng (hep)',
  'manufacturer',
  true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m
  ON m.family_id = f.id
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'nitromix'
  AND m.normalized_name = 'nitromix p24 ng (hep)'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'nitromix p24 ng (hep)'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  m.id,
  'nitromiX P28 NG (HEP)',
  'nitromix p28 ng (hep)',
  'manufacturer',
  true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m
  ON m.family_id = f.id
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'nitromix'
  AND m.normalized_name = 'nitromix p28 ng (hep)'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'nitromix p28 ng (hep)'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  m.id,
  'nitromiX P35 NG (HEP)',
  'nitromix p35 ng (hep)',
  'manufacturer',
  true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m
  ON m.family_id = f.id
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'nitromix'
  AND m.normalized_name = 'nitromix p35 ng (hep)'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'nitromix p35 ng (hep)'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  m.id,
  'Nitron Condense 24 (H-TR)',
  'nitron condense 24 (h-tr)',
  'manufacturer',
  true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m
  ON m.family_id = f.id
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'nitron condense'
  AND m.normalized_name = 'nitron condense 24 (h-tr)'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'nitron condense 24 (h-tr)'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  m.id,
  'Nitron Condense 24 (H-TR/HEP)',
  'nitron condense 24 (h-tr/hep)',
  'manufacturer',
  true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m
  ON m.family_id = f.id
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'nitron condense'
  AND m.normalized_name = 'nitron condense 24 (h-tr/hep)'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'nitron condense 24 (h-tr/hep)'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  m.id,
  'Nitron Condense 28 (H-TR)',
  'nitron condense 28 (h-tr)',
  'manufacturer',
  true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m
  ON m.family_id = f.id
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'nitron condense'
  AND m.normalized_name = 'nitron condense 28 (h-tr)'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'nitron condense 28 (h-tr)'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  m.id,
  'Nitron Condense 28 (H-TR/HEP)',
  'nitron condense 28 (h-tr/hep)',
  'manufacturer',
  true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m
  ON m.family_id = f.id
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'nitron condense'
  AND m.normalized_name = 'nitron condense 28 (h-tr/hep)'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'nitron condense 28 (h-tr/hep)'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  m.id,
  'Nitron HK F 224',
  'nitron hk f 224',
  'manufacturer',
  true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m
  ON m.family_id = f.id
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'nitron'
  AND m.normalized_name = 'nitron hk f 224'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'nitron hk f 224'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  m.id,
  'Nitron HK F 230',
  'nitron hk f 230',
  'manufacturer',
  true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m
  ON m.family_id = f.id
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'nitron'
  AND m.normalized_name = 'nitron hk f 230'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'nitron hk f 230'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  m.id,
  'Nitron Plus HK 24 (H-TR)',
  'nitron plus hk 24 (h-tr)',
  'manufacturer',
  true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m
  ON m.family_id = f.id
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'nitron plus'
  AND m.normalized_name = 'nitron plus hk 24 (h-tr)'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'nitron plus hk 24 (h-tr)'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  m.id,
  'Nitron Plus HK 30 (H-TR)',
  'nitron plus hk 30 (h-tr)',
  'manufacturer',
  true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m
  ON m.family_id = f.id
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'nitron plus'
  AND m.normalized_name = 'nitron plus hk 30 (h-tr)'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'nitron plus hk 30 (h-tr)'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  m.id,
  'Sargon Condense HK B 224 CM',
  'sargon condense hk b 224 cm',
  'manufacturer',
  true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m
  ON m.family_id = f.id
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'sargon condense'
  AND m.normalized_name = 'sargon condense hk b 224 cm'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'sargon condense hk b 224 cm'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  m.id,
  'Sargon Condense HK B 230 CM',
  'sargon condense hk b 230 cm',
  'manufacturer',
  true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m
  ON m.family_id = f.id
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'sargon condense'
  AND m.normalized_name = 'sargon condense hk b 230 cm'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'sargon condense hk b 230 cm'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  m.id,
  'vintomiX P 24/28-AS/1',
  'vintomix p 24/28-as/1',
  'manufacturer',
  true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m
  ON m.family_id = f.id
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'vintomix'
  AND m.normalized_name = 'vintomix p 24/28-as/1'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'vintomix p 24/28-as/1'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id,
  m.id,
  'vintomiX P 28/36-AS/1',
  'vintomix p 28/36-as/1',
  'manufacturer',
  true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m
  ON m.family_id = f.id
WHERE f.brand = 'DemirDöküm'
  AND f.normalized_name = 'vintomix'
  AND m.normalized_name = 'vintomix p 28/36-as/1'
  AND NOT EXISTS (
    SELECT 1
    FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'vintomix p 28/36-as/1'
  );

-- 5) Güvenlik kontrolleri
DO $$
DECLARE
  v_family_count bigint;
  v_model_count bigint;
  v_family_alias_count bigint;
  v_model_alias_count bigint;
BEGIN
  SELECT count(*) INTO v_family_count
  FROM public.boiler_model_families
  WHERE brand = 'DemirDöküm' AND is_active = true;

  SELECT count(*) INTO v_model_count
  FROM public.boiler_official_models m
  JOIN public.boiler_model_families f ON f.id = m.family_id
  WHERE f.brand = 'DemirDöküm' AND m.is_active = true;

  SELECT count(*) INTO v_family_alias_count
  FROM public.boiler_model_aliases a
  JOIN public.boiler_model_families f ON f.id = a.family_id
  WHERE f.brand = 'DemirDöküm'
    AND a.official_model_id IS NULL
    AND a.is_verified = true;

  SELECT count(*) INTO v_model_alias_count
  FROM public.boiler_model_aliases a
  JOIN public.boiler_model_families f ON f.id = a.family_id
  WHERE f.brand = 'DemirDöküm'
    AND a.official_model_id IS NOT NULL
    AND a.is_verified = true;

  IF v_family_count <> 16 THEN
    RAISE EXCEPTION 'DemirDöküm aile sayısı beklenen 16, mevcut %', v_family_count;
  END IF;

  IF v_model_count <> 39 THEN
    RAISE EXCEPTION 'DemirDöküm model sayısı beklenen 39, mevcut %', v_model_count;
  END IF;

  IF v_family_alias_count < 16 THEN
    RAISE EXCEPTION 'DemirDöküm aile alias sayısı en az 16 olmalı, mevcut %', v_family_alias_count;
  END IF;

  IF v_model_alias_count < 39 THEN
    RAISE EXCEPTION 'DemirDöküm model alias sayısı en az 39 olmalı, mevcut %', v_model_alias_count;
  END IF;
END $$;

COMMIT;