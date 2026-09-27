-- Teknik-O — Vaillant, Bosch, Buderus, Warmhaus cihaz tanıma katmanı
-- Model aileleri + resmî modeller + güvenli aliaslar
-- Ham official_error_codes_raw verisine dokunmaz.
BEGIN;

-- Vaillant: model aileleri
INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Vaillant', 'atmoTEC plus', 'atmotec plus', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Vaillant', 'atmoTEC pro', 'atmotec pro', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Vaillant', 'ecoTEC exclusive', 'ecotec exclusive', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Vaillant', 'ecoTEC intro', 'ecotec intro', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Vaillant', 'ecoTEC plus', 'ecotec plus', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Vaillant', 'ecoTEC pro', 'ecotec pro', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Vaillant', 'ecoTEC pure', 'ecotec pure', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Vaillant', 'turboTEC plus', 'turbotec plus', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Vaillant', 'turboTEC pro', 'turbotec pro', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Vaillant', 'turboTEC', 'turbotec', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

-- Vaillant: resmî modeller
INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'atmoTEC plus VUW 240/5-5 (H-TR)',
  'atmotec plus vuw 240/5-5 (h-tr)',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Vaillant'
      AND r.official_model = 'atmoTEC plus VUW 240/5-5 (H-TR)'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'atmotec plus'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'atmoTEC plus VUW 280/5-5 (H-TR)',
  'atmotec plus vuw 280/5-5 (h-tr)',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Vaillant'
      AND r.official_model = 'atmoTEC plus VUW 280/5-5 (H-TR)'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'atmotec plus'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'atmoTEC plus VUW TR 200/3-5',
  'atmotec plus vuw tr 200/3-5',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Vaillant'
      AND r.official_model = 'atmoTEC plus VUW TR 200/3-5'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'atmotec plus'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'atmoTEC plus VUW TR 240/3-5',
  'atmotec plus vuw tr 240/3-5',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Vaillant'
      AND r.official_model = 'atmoTEC plus VUW TR 240/3-5'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'atmotec plus'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'atmoTEC plus VUW TR 280/3-5',
  'atmotec plus vuw tr 280/3-5',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Vaillant'
      AND r.official_model = 'atmoTEC plus VUW TR 280/3-5'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'atmotec plus'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'atmoTEC pro VUW 200/5-3 (H-TR)',
  'atmotec pro vuw 200/5-3 (h-tr)',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Vaillant'
      AND r.official_model = 'atmoTEC pro VUW 200/5-3 (H-TR)'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'atmotec pro'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'atmoTEC pro VUW 240/5-3 (H-TR)',
  'atmotec pro vuw 240/5-3 (h-tr)',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Vaillant'
      AND r.official_model = 'atmoTEC pro VUW 240/5-3 (H-TR)'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'atmotec pro'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'atmoTEC pro VUW TR 200/3-3',
  'atmotec pro vuw tr 200/3-3',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Vaillant'
      AND r.official_model = 'atmoTEC pro VUW TR 200/3-3'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'atmotec pro'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'atmoTEC pro VUW TR 240/3-3',
  'atmotec pro vuw tr 240/3-3',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Vaillant'
      AND r.official_model = 'atmoTEC pro VUW TR 240/3-3'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'atmotec pro'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'ecoTEC exclusive VUW 356/5-7 (H-TR)',
  'ecotec exclusive vuw 356/5-7 (h-tr)',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Vaillant'
      AND r.official_model = 'ecoTEC exclusive VUW 356/5-7 (H-TR)'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'ecotec exclusive'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'ecoTEC intro VUW 18/24 AS/1-1',
  'ecotec intro vuw 18/24 as/1-1',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Vaillant'
      AND r.official_model = 'ecoTEC intro VUW 18/24 AS/1-1'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'ecotec intro'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'ecoTEC intro VUW 24/28 AS/1-1',
  'ecotec intro vuw 24/28 as/1-1',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Vaillant'
      AND r.official_model = 'ecoTEC intro VUW 24/28 AS/1-1'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'ecotec intro'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'ecoTEC plus VUI 36CS/1-5 (N-TR)',
  'ecotec plus vui 36cs/1-5 (n-tr)',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Vaillant'
      AND r.official_model = 'ecoTEC plus VUI 36CS/1-5 (N-TR)'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'ecotec plus'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'ecoTEC plus VUI 40CS/1-5 (N-TR)',
  'ecotec plus vui 40cs/1-5 (n-tr)',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Vaillant'
      AND r.official_model = 'ecoTEC plus VUI 40CS/1-5 (N-TR)'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'ecotec plus'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'ecoTEC plus VUW 26CS/1-5 (N-TR)',
  'ecotec plus vuw 26cs/1-5 (n-tr)',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Vaillant'
      AND r.official_model = 'ecoTEC plus VUW 26CS/1-5 (N-TR)'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'ecotec plus'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'ecoTEC plus VUW 32CS/1-5 (N-TR)',
  'ecotec plus vuw 32cs/1-5 (n-tr)',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Vaillant'
      AND r.official_model = 'ecoTEC plus VUW 32CS/1-5 (N-TR)'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'ecotec plus'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'ecoTEC plus VUW 36CS/1-5 (N-TR)',
  'ecotec plus vuw 36cs/1-5 (n-tr)',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Vaillant'
      AND r.official_model = 'ecoTEC plus VUW 36CS/1-5 (N-TR)'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'ecotec plus'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'ecoTEC plus VUW 40CS/1-5 (N-TR)',
  'ecotec plus vuw 40cs/1-5 (n-tr)',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Vaillant'
      AND r.official_model = 'ecoTEC plus VUW 40CS/1-5 (N-TR)'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'ecotec plus'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'ecoTEC plus VUW TR 236/5-5 F A',
  'ecotec plus vuw tr 236/5-5 f a',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Vaillant'
      AND r.official_model = 'ecoTEC plus VUW TR 236/5-5 F A'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'ecotec plus'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'ecoTEC plus VUW TR 296/5-5 F A',
  'ecotec plus vuw tr 296/5-5 f a',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Vaillant'
      AND r.official_model = 'ecoTEC plus VUW TR 296/5-5 F A'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'ecotec plus'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'ecoTEC plus VUW TR 346/5-5 F A',
  'ecotec plus vuw tr 346/5-5 f a',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Vaillant'
      AND r.official_model = 'ecoTEC plus VUW TR 346/5-5 F A'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'ecotec plus'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'ecoTEC plus VUW TR 376/5-5 F A',
  'ecotec plus vuw tr 376/5-5 f a',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Vaillant'
      AND r.official_model = 'ecoTEC plus VUW TR 376/5-5 F A'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'ecotec plus'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'ecoTEC pro VUW TR 236/5-3',
  'ecotec pro vuw tr 236/5-3',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Vaillant'
      AND r.official_model = 'ecoTEC pro VUW TR 236/5-3'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'ecotec pro'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'ecoTEC pro VUW TR 286/5-3',
  'ecotec pro vuw tr 286/5-3',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Vaillant'
      AND r.official_model = 'ecoTEC pro VUW TR 286/5-3'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'ecotec pro'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'ecoTEC pure VMW 236/7-2 (H-TR)',
  'ecotec pure vmw 236/7-2 (h-tr)',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Vaillant'
      AND r.official_model = 'ecoTEC pure VMW 236/7-2 (H-TR)'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'ecotec pure'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'ecoTEC pure VMW 286/7-2 (H-TR)',
  'ecotec pure vmw 286/7-2 (h-tr)',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Vaillant'
      AND r.official_model = 'ecoTEC pure VMW 286/7-2 (H-TR)'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'ecotec pure'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'turboTEC plus VUW TR 202/3-5',
  'turbotec plus vuw tr 202/3-5',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Vaillant'
      AND r.official_model = 'turboTEC plus VUW TR 202/3-5'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'turbotec plus'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'turboTEC plus VUW TR 242/3-5',
  'turbotec plus vuw tr 242/3-5',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Vaillant'
      AND r.official_model = 'turboTEC plus VUW TR 242/3-5'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'turbotec plus'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'turboTEC plus VUW TR 282/3-5',
  'turbotec plus vuw tr 282/3-5',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Vaillant'
      AND r.official_model = 'turboTEC plus VUW TR 282/3-5'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'turbotec plus'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'turboTEC plus VUW TR 362/3-5',
  'turbotec plus vuw tr 362/3-5',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Vaillant'
      AND r.official_model = 'turboTEC plus VUW TR 362/3-5'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'turbotec plus'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'turboTEC pro VUW TR 202/3-3',
  'turbotec pro vuw tr 202/3-3',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Vaillant'
      AND r.official_model = 'turboTEC pro VUW TR 202/3-3'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'turbotec pro'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'turboTEC pro VUW TR 242/3-3',
  'turbotec pro vuw tr 242/3-3',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Vaillant'
      AND r.official_model = 'turboTEC pro VUW TR 242/3-3'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'turbotec pro'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'turboTEC VUW 202/5-3 (H-TR)',
  'turbotec vuw 202/5-3 (h-tr)',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Vaillant'
      AND r.official_model = 'turboTEC VUW 202/5-3 (H-TR)'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'turbotec'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'turboTEC VUW 202/5-5 (H-TR)',
  'turbotec vuw 202/5-5 (h-tr)',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Vaillant'
      AND r.official_model = 'turboTEC VUW 202/5-5 (H-TR)'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'turbotec'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'turboTEC VUW 242/5-3 (H-TR)',
  'turbotec vuw 242/5-3 (h-tr)',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Vaillant'
      AND r.official_model = 'turboTEC VUW 242/5-3 (H-TR)'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'turbotec'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'turboTEC VUW 242/5-5 (H-TR)',
  'turbotec vuw 242/5-5 (h-tr)',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Vaillant'
      AND r.official_model = 'turboTEC VUW 242/5-5 (H-TR)'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'turbotec'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'turboTEC VUW 282/5-5 (H-TR)',
  'turbotec vuw 282/5-5 (h-tr)',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Vaillant'
      AND r.official_model = 'turboTEC VUW 282/5-5 (H-TR)'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'turbotec'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'turboTEC VUW 322/5-5 (H-TR)',
  'turbotec vuw 322/5-5 (h-tr)',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Vaillant'
      AND r.official_model = 'turboTEC VUW 322/5-5 (H-TR)'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'turbotec'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

-- Vaillant: aile aliasları
INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'atmoTEC plus', 'atmotec plus', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'atmotec plus'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'atmotec plus'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'atmoTEC pro', 'atmotec pro', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'atmotec pro'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'atmotec pro'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'ecoTEC exclusive', 'ecotec exclusive', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'ecotec exclusive'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'ecotec exclusive'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'ecoTEC intro', 'ecotec intro', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'ecotec intro'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'ecotec intro'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'ecoTEC plus', 'ecotec plus', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'ecotec plus'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'ecotec plus'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'ecoTEC pro', 'ecotec pro', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'ecotec pro'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'ecotec pro'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'ecoTEC pure', 'ecotec pure', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'ecotec pure'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'ecotec pure'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'turboTEC plus', 'turbotec plus', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'turbotec plus'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'turbotec plus'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'turboTEC pro', 'turbotec pro', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'turbotec pro'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'turbotec pro'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'turboTEC', 'turbotec', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'turbotec'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'turbotec'
  );

-- Vaillant: resmî model aliasları
INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'atmoTEC plus VUW 240/5-5 (H-TR)', 'atmotec plus vuw 240/5-5 (h-tr)', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'atmotec plus'
  AND m.normalized_name = 'atmotec plus vuw 240/5-5 (h-tr)'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'atmotec plus vuw 240/5-5 (h-tr)'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'atmoTEC plus VUW 280/5-5 (H-TR)', 'atmotec plus vuw 280/5-5 (h-tr)', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'atmotec plus'
  AND m.normalized_name = 'atmotec plus vuw 280/5-5 (h-tr)'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'atmotec plus vuw 280/5-5 (h-tr)'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'atmoTEC plus VUW TR 200/3-5', 'atmotec plus vuw tr 200/3-5', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'atmotec plus'
  AND m.normalized_name = 'atmotec plus vuw tr 200/3-5'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'atmotec plus vuw tr 200/3-5'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'atmoTEC plus VUW TR 240/3-5', 'atmotec plus vuw tr 240/3-5', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'atmotec plus'
  AND m.normalized_name = 'atmotec plus vuw tr 240/3-5'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'atmotec plus vuw tr 240/3-5'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'atmoTEC plus VUW TR 280/3-5', 'atmotec plus vuw tr 280/3-5', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'atmotec plus'
  AND m.normalized_name = 'atmotec plus vuw tr 280/3-5'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'atmotec plus vuw tr 280/3-5'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'atmoTEC pro VUW 200/5-3 (H-TR)', 'atmotec pro vuw 200/5-3 (h-tr)', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'atmotec pro'
  AND m.normalized_name = 'atmotec pro vuw 200/5-3 (h-tr)'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'atmotec pro vuw 200/5-3 (h-tr)'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'atmoTEC pro VUW 240/5-3 (H-TR)', 'atmotec pro vuw 240/5-3 (h-tr)', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'atmotec pro'
  AND m.normalized_name = 'atmotec pro vuw 240/5-3 (h-tr)'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'atmotec pro vuw 240/5-3 (h-tr)'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'atmoTEC pro VUW TR 200/3-3', 'atmotec pro vuw tr 200/3-3', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'atmotec pro'
  AND m.normalized_name = 'atmotec pro vuw tr 200/3-3'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'atmotec pro vuw tr 200/3-3'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'atmoTEC pro VUW TR 240/3-3', 'atmotec pro vuw tr 240/3-3', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'atmotec pro'
  AND m.normalized_name = 'atmotec pro vuw tr 240/3-3'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'atmotec pro vuw tr 240/3-3'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'ecoTEC exclusive VUW 356/5-7 (H-TR)', 'ecotec exclusive vuw 356/5-7 (h-tr)', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'ecotec exclusive'
  AND m.normalized_name = 'ecotec exclusive vuw 356/5-7 (h-tr)'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'ecotec exclusive vuw 356/5-7 (h-tr)'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'ecoTEC intro VUW 18/24 AS/1-1', 'ecotec intro vuw 18/24 as/1-1', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'ecotec intro'
  AND m.normalized_name = 'ecotec intro vuw 18/24 as/1-1'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'ecotec intro vuw 18/24 as/1-1'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'ecoTEC intro VUW 24/28 AS/1-1', 'ecotec intro vuw 24/28 as/1-1', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'ecotec intro'
  AND m.normalized_name = 'ecotec intro vuw 24/28 as/1-1'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'ecotec intro vuw 24/28 as/1-1'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'ecoTEC plus VUI 36CS/1-5 (N-TR)', 'ecotec plus vui 36cs/1-5 (n-tr)', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'ecotec plus'
  AND m.normalized_name = 'ecotec plus vui 36cs/1-5 (n-tr)'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'ecotec plus vui 36cs/1-5 (n-tr)'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'ecoTEC plus VUI 40CS/1-5 (N-TR)', 'ecotec plus vui 40cs/1-5 (n-tr)', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'ecotec plus'
  AND m.normalized_name = 'ecotec plus vui 40cs/1-5 (n-tr)'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'ecotec plus vui 40cs/1-5 (n-tr)'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'ecoTEC plus VUW 26CS/1-5 (N-TR)', 'ecotec plus vuw 26cs/1-5 (n-tr)', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'ecotec plus'
  AND m.normalized_name = 'ecotec plus vuw 26cs/1-5 (n-tr)'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'ecotec plus vuw 26cs/1-5 (n-tr)'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'ecoTEC plus VUW 32CS/1-5 (N-TR)', 'ecotec plus vuw 32cs/1-5 (n-tr)', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'ecotec plus'
  AND m.normalized_name = 'ecotec plus vuw 32cs/1-5 (n-tr)'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'ecotec plus vuw 32cs/1-5 (n-tr)'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'ecoTEC plus VUW 36CS/1-5 (N-TR)', 'ecotec plus vuw 36cs/1-5 (n-tr)', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'ecotec plus'
  AND m.normalized_name = 'ecotec plus vuw 36cs/1-5 (n-tr)'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'ecotec plus vuw 36cs/1-5 (n-tr)'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'ecoTEC plus VUW 40CS/1-5 (N-TR)', 'ecotec plus vuw 40cs/1-5 (n-tr)', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'ecotec plus'
  AND m.normalized_name = 'ecotec plus vuw 40cs/1-5 (n-tr)'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'ecotec plus vuw 40cs/1-5 (n-tr)'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'ecoTEC plus VUW TR 236/5-5 F A', 'ecotec plus vuw tr 236/5-5 f a', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'ecotec plus'
  AND m.normalized_name = 'ecotec plus vuw tr 236/5-5 f a'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'ecotec plus vuw tr 236/5-5 f a'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'ecoTEC plus VUW TR 296/5-5 F A', 'ecotec plus vuw tr 296/5-5 f a', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'ecotec plus'
  AND m.normalized_name = 'ecotec plus vuw tr 296/5-5 f a'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'ecotec plus vuw tr 296/5-5 f a'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'ecoTEC plus VUW TR 346/5-5 F A', 'ecotec plus vuw tr 346/5-5 f a', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'ecotec plus'
  AND m.normalized_name = 'ecotec plus vuw tr 346/5-5 f a'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'ecotec plus vuw tr 346/5-5 f a'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'ecoTEC plus VUW TR 376/5-5 F A', 'ecotec plus vuw tr 376/5-5 f a', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'ecotec plus'
  AND m.normalized_name = 'ecotec plus vuw tr 376/5-5 f a'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'ecotec plus vuw tr 376/5-5 f a'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'ecoTEC pro VUW TR 236/5-3', 'ecotec pro vuw tr 236/5-3', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'ecotec pro'
  AND m.normalized_name = 'ecotec pro vuw tr 236/5-3'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'ecotec pro vuw tr 236/5-3'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'ecoTEC pro VUW TR 286/5-3', 'ecotec pro vuw tr 286/5-3', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'ecotec pro'
  AND m.normalized_name = 'ecotec pro vuw tr 286/5-3'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'ecotec pro vuw tr 286/5-3'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'ecoTEC pure VMW 236/7-2 (H-TR)', 'ecotec pure vmw 236/7-2 (h-tr)', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'ecotec pure'
  AND m.normalized_name = 'ecotec pure vmw 236/7-2 (h-tr)'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'ecotec pure vmw 236/7-2 (h-tr)'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'ecoTEC pure VMW 286/7-2 (H-TR)', 'ecotec pure vmw 286/7-2 (h-tr)', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'ecotec pure'
  AND m.normalized_name = 'ecotec pure vmw 286/7-2 (h-tr)'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'ecotec pure vmw 286/7-2 (h-tr)'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'turboTEC plus VUW TR 202/3-5', 'turbotec plus vuw tr 202/3-5', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'turbotec plus'
  AND m.normalized_name = 'turbotec plus vuw tr 202/3-5'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'turbotec plus vuw tr 202/3-5'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'turboTEC plus VUW TR 242/3-5', 'turbotec plus vuw tr 242/3-5', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'turbotec plus'
  AND m.normalized_name = 'turbotec plus vuw tr 242/3-5'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'turbotec plus vuw tr 242/3-5'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'turboTEC plus VUW TR 282/3-5', 'turbotec plus vuw tr 282/3-5', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'turbotec plus'
  AND m.normalized_name = 'turbotec plus vuw tr 282/3-5'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'turbotec plus vuw tr 282/3-5'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'turboTEC plus VUW TR 362/3-5', 'turbotec plus vuw tr 362/3-5', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'turbotec plus'
  AND m.normalized_name = 'turbotec plus vuw tr 362/3-5'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'turbotec plus vuw tr 362/3-5'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'turboTEC pro VUW TR 202/3-3', 'turbotec pro vuw tr 202/3-3', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'turbotec pro'
  AND m.normalized_name = 'turbotec pro vuw tr 202/3-3'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'turbotec pro vuw tr 202/3-3'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'turboTEC pro VUW TR 242/3-3', 'turbotec pro vuw tr 242/3-3', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'turbotec pro'
  AND m.normalized_name = 'turbotec pro vuw tr 242/3-3'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'turbotec pro vuw tr 242/3-3'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'turboTEC VUW 202/5-3 (H-TR)', 'turbotec vuw 202/5-3 (h-tr)', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'turbotec'
  AND m.normalized_name = 'turbotec vuw 202/5-3 (h-tr)'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'turbotec vuw 202/5-3 (h-tr)'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'turboTEC VUW 202/5-5 (H-TR)', 'turbotec vuw 202/5-5 (h-tr)', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'turbotec'
  AND m.normalized_name = 'turbotec vuw 202/5-5 (h-tr)'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'turbotec vuw 202/5-5 (h-tr)'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'turboTEC VUW 242/5-3 (H-TR)', 'turbotec vuw 242/5-3 (h-tr)', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'turbotec'
  AND m.normalized_name = 'turbotec vuw 242/5-3 (h-tr)'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'turbotec vuw 242/5-3 (h-tr)'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'turboTEC VUW 242/5-5 (H-TR)', 'turbotec vuw 242/5-5 (h-tr)', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'turbotec'
  AND m.normalized_name = 'turbotec vuw 242/5-5 (h-tr)'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'turbotec vuw 242/5-5 (h-tr)'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'turboTEC VUW 282/5-5 (H-TR)', 'turbotec vuw 282/5-5 (h-tr)', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'turbotec'
  AND m.normalized_name = 'turbotec vuw 282/5-5 (h-tr)'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'turbotec vuw 282/5-5 (h-tr)'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'turboTEC VUW 322/5-5 (H-TR)', 'turbotec vuw 322/5-5 (h-tr)', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Vaillant'
  AND f.normalized_name = 'turbotec'
  AND m.normalized_name = 'turbotec vuw 322/5-5 (h-tr)'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'turbotec vuw 322/5-5 (h-tr)'
  );

-- Bosch: model aileleri
INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Bosch', 'Class 2000 W', 'class 2000 w', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Bosch', 'Class 6000 W', 'class 6000 w', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Bosch', 'Classic Silver', 'classic silver', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Bosch', 'ClassicPlus', 'classicplus', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Bosch', 'Comfort', 'comfort', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Bosch', 'Comfort Condense', 'comfort condense', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Bosch', 'Condens 1200 W', 'condens 1200 w', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Bosch', 'Condens 2200i W', 'condens 2200i w', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Bosch', 'Condens 2300i W', 'condens 2300i w', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Bosch', 'Condens 2500 W', 'condens 2500 w', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Bosch', 'Condens 7000i W', 'condens 7000i w', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Bosch', 'Exclusive', 'exclusive', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

-- Bosch: resmî modeller
INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Class 2000 W',
  'class 2000 w',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Bosch'
      AND r.official_model = 'Class 2000 W'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Bosch'
  AND f.normalized_name = 'class 2000 w'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Class 6000 W',
  'class 6000 w',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Bosch'
      AND r.official_model = 'Class 6000 W'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Bosch'
  AND f.normalized_name = 'class 6000 w'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Classic Silver',
  'classic silver',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Bosch'
      AND r.official_model = 'Classic Silver'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Bosch'
  AND f.normalized_name = 'classic silver'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'ClassicPlus',
  'classicplus',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Bosch'
      AND r.official_model = 'ClassicPlus'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Bosch'
  AND f.normalized_name = 'classicplus'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Comfort',
  'comfort',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Bosch'
      AND r.official_model = 'Comfort'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Bosch'
  AND f.normalized_name = 'comfort'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Comfort Condense',
  'comfort condense',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Bosch'
      AND r.official_model = 'Comfort Condense'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Bosch'
  AND f.normalized_name = 'comfort condense'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Condens 1200 W (GC1200W 20/22, 24, 28/30 C 23 ailesi)',
  'condens 1200 w (gc1200w 20/22, 24, 28/30 c 23 ailesi)',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Bosch'
      AND r.official_model = 'Condens 1200 W (GC1200W 20/22, 24, 28/30 C 23 ailesi)'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Bosch'
  AND f.normalized_name = 'condens 1200 w'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Condens 2200i W (GC2201iW 24 C 23)',
  'condens 2200i w (gc2201iw 24 c 23)',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Bosch'
      AND r.official_model = 'Condens 2200i W (GC2201iW 24 C 23)'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Bosch'
  AND f.normalized_name = 'condens 2200i w'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Condens 2300i W',
  'condens 2300i w',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Bosch'
      AND r.official_model = 'Condens 2300i W'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Bosch'
  AND f.normalized_name = 'condens 2300i w'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Condens 2500 W',
  'condens 2500 w',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Bosch'
      AND r.official_model = 'Condens 2500 W'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Bosch'
  AND f.normalized_name = 'condens 2500 w'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Condens 7000i W',
  'condens 7000i w',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Bosch'
      AND r.official_model = 'Condens 7000i W'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Bosch'
  AND f.normalized_name = 'condens 7000i w'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Exclusive',
  'exclusive',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Bosch'
      AND r.official_model = 'Exclusive'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Bosch'
  AND f.normalized_name = 'exclusive'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

-- Bosch: aile aliasları
INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'Class 2000 W', 'class 2000 w', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Bosch'
  AND f.normalized_name = 'class 2000 w'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'class 2000 w'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'Class 6000 W', 'class 6000 w', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Bosch'
  AND f.normalized_name = 'class 6000 w'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'class 6000 w'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'Classic Silver', 'classic silver', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Bosch'
  AND f.normalized_name = 'classic silver'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'classic silver'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'ClassicPlus', 'classicplus', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Bosch'
  AND f.normalized_name = 'classicplus'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'classicplus'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'Comfort', 'comfort', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Bosch'
  AND f.normalized_name = 'comfort'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'comfort'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'Comfort Condense', 'comfort condense', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Bosch'
  AND f.normalized_name = 'comfort condense'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'comfort condense'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'Condens 1200 W', 'condens 1200 w', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Bosch'
  AND f.normalized_name = 'condens 1200 w'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'condens 1200 w'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'Condens 2200i W', 'condens 2200i w', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Bosch'
  AND f.normalized_name = 'condens 2200i w'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'condens 2200i w'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'Condens 2300i W', 'condens 2300i w', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Bosch'
  AND f.normalized_name = 'condens 2300i w'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'condens 2300i w'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'Condens 2500 W', 'condens 2500 w', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Bosch'
  AND f.normalized_name = 'condens 2500 w'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'condens 2500 w'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'Condens 7000i W', 'condens 7000i w', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Bosch'
  AND f.normalized_name = 'condens 7000i w'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'condens 7000i w'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'Exclusive', 'exclusive', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Bosch'
  AND f.normalized_name = 'exclusive'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'exclusive'
  );

-- Bosch: resmî model aliasları
INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'Class 2000 W', 'class 2000 w', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Bosch'
  AND f.normalized_name = 'class 2000 w'
  AND m.normalized_name = 'class 2000 w'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'class 2000 w'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'Class 6000 W', 'class 6000 w', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Bosch'
  AND f.normalized_name = 'class 6000 w'
  AND m.normalized_name = 'class 6000 w'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'class 6000 w'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'Classic Silver', 'classic silver', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Bosch'
  AND f.normalized_name = 'classic silver'
  AND m.normalized_name = 'classic silver'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'classic silver'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'ClassicPlus', 'classicplus', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Bosch'
  AND f.normalized_name = 'classicplus'
  AND m.normalized_name = 'classicplus'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'classicplus'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'Comfort', 'comfort', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Bosch'
  AND f.normalized_name = 'comfort'
  AND m.normalized_name = 'comfort'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'comfort'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'Comfort Condense', 'comfort condense', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Bosch'
  AND f.normalized_name = 'comfort condense'
  AND m.normalized_name = 'comfort condense'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'comfort condense'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'Condens 1200 W (GC1200W 20/22, 24, 28/30 C 23 ailesi)', 'condens 1200 w (gc1200w 20/22, 24, 28/30 c 23 ailesi)', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Bosch'
  AND f.normalized_name = 'condens 1200 w'
  AND m.normalized_name = 'condens 1200 w (gc1200w 20/22, 24, 28/30 c 23 ailesi)'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'condens 1200 w (gc1200w 20/22, 24, 28/30 c 23 ailesi)'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'Condens 2200i W (GC2201iW 24 C 23)', 'condens 2200i w (gc2201iw 24 c 23)', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Bosch'
  AND f.normalized_name = 'condens 2200i w'
  AND m.normalized_name = 'condens 2200i w (gc2201iw 24 c 23)'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'condens 2200i w (gc2201iw 24 c 23)'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'Condens 2300i W', 'condens 2300i w', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Bosch'
  AND f.normalized_name = 'condens 2300i w'
  AND m.normalized_name = 'condens 2300i w'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'condens 2300i w'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'Condens 2500 W', 'condens 2500 w', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Bosch'
  AND f.normalized_name = 'condens 2500 w'
  AND m.normalized_name = 'condens 2500 w'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'condens 2500 w'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'Condens 7000i W', 'condens 7000i w', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Bosch'
  AND f.normalized_name = 'condens 7000i w'
  AND m.normalized_name = 'condens 7000i w'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'condens 7000i w'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'Exclusive', 'exclusive', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Bosch'
  AND f.normalized_name = 'exclusive'
  AND m.normalized_name = 'exclusive'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'exclusive'
  );

-- Buderus: model aileleri
INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Buderus', 'Logamax plus GB012', 'logamax plus gb012', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Buderus', 'Logamax plus GB022i', 'logamax plus gb022i', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Buderus', 'Logamax plus GB042', 'logamax plus gb042', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Buderus', 'Logamax plus GB062', 'logamax plus gb062', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Buderus', 'Logamax plus GB072', 'logamax plus gb072', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Buderus', 'Logamax plus GB112', 'logamax plus gb112', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Buderus', 'Logamax plus GB122i', 'logamax plus gb122i', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Buderus', 'Logamax plus GB152', 'logamax plus gb152', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Buderus', 'Logamax plus GB162', 'logamax plus gb162', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Buderus', 'Logamax plus GB172i', 'logamax plus gb172i', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Buderus', 'Logamax plus GB172i.2', 'logamax plus gb172i.2', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Buderus', 'Logamax plus GB182i.2', 'logamax plus gb182i.2', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Buderus', 'Logamax plus GB192i.2', 'logamax plus gb192i.2', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Buderus', 'Logamax U022', 'logamax u022', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Buderus', 'Logamax U042', 'logamax u042', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Buderus', 'Logamax U052', 'logamax u052', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Buderus', 'Logamax U062', 'logamax u062', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Buderus', 'Logamax U072', 'logamax u072', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

-- Buderus: resmî modeller
INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Logamax plus GB012',
  'logamax plus gb012',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Buderus'
      AND r.official_model = 'Logamax plus GB012'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax plus gb012'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Logamax plus GB022i',
  'logamax plus gb022i',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Buderus'
      AND r.official_model = 'Logamax plus GB022i'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax plus gb022i'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Logamax plus GB042',
  'logamax plus gb042',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Buderus'
      AND r.official_model = 'Logamax plus GB042'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax plus gb042'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Logamax plus GB062',
  'logamax plus gb062',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Buderus'
      AND r.official_model = 'Logamax plus GB062'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax plus gb062'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Logamax plus GB072',
  'logamax plus gb072',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Buderus'
      AND r.official_model = 'Logamax plus GB072'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax plus gb072'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Logamax plus GB112-24/29/43/60/24T25/29T25',
  'logamax plus gb112-24/29/43/60/24t25/29t25',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Buderus'
      AND r.official_model = 'Logamax plus GB112-24/29/43/60/24T25/29T25'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax plus gb112'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Logamax plus GB122i',
  'logamax plus gb122i',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Buderus'
      AND r.official_model = 'Logamax plus GB122i'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax plus gb122i'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Logamax plus GB152-16/24T',
  'logamax plus gb152-16/24t',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Buderus'
      AND r.official_model = 'Logamax plus GB152-16/24T'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax plus gb152'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Logamax plus GB162-15…35 V3',
  'logamax plus gb162-15…35 v3',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Buderus'
      AND r.official_model = 'Logamax plus GB162-15…35 V3'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax plus gb162'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Logamax plus GB172i',
  'logamax plus gb172i',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Buderus'
      AND r.official_model = 'Logamax plus GB172i'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax plus gb172i'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Logamax plus GB172i.2',
  'logamax plus gb172i.2',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Buderus'
      AND r.official_model = 'Logamax plus GB172i.2'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax plus gb172i.2'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Logamax plus GB182i.2',
  'logamax plus gb182i.2',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Buderus'
      AND r.official_model = 'Logamax plus GB182i.2'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax plus gb182i.2'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Logamax plus GB192i.2',
  'logamax plus gb192i.2',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Buderus'
      AND r.official_model = 'Logamax plus GB192i.2'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax plus gb192i.2'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Logamax U022',
  'logamax u022',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Buderus'
      AND r.official_model = 'Logamax U022'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax u022'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Logamax U042-24K',
  'logamax u042-24k',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Buderus'
      AND r.official_model = 'Logamax U042-24K'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax u042'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Logamax U052',
  'logamax u052',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Buderus'
      AND r.official_model = 'Logamax U052'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax u052'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Logamax U062',
  'logamax u062',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Buderus'
      AND r.official_model = 'Logamax U062'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax u062'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Logamax U072',
  'logamax u072',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Buderus'
      AND r.official_model = 'Logamax U072'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax u072'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

-- Buderus: aile aliasları
INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'Logamax plus GB012', 'logamax plus gb012', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax plus gb012'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'logamax plus gb012'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'Logamax plus GB022i', 'logamax plus gb022i', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax plus gb022i'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'logamax plus gb022i'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'Logamax plus GB042', 'logamax plus gb042', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax plus gb042'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'logamax plus gb042'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'Logamax plus GB062', 'logamax plus gb062', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax plus gb062'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'logamax plus gb062'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'Logamax plus GB072', 'logamax plus gb072', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax plus gb072'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'logamax plus gb072'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'Logamax plus GB112', 'logamax plus gb112', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax plus gb112'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'logamax plus gb112'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'Logamax plus GB122i', 'logamax plus gb122i', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax plus gb122i'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'logamax plus gb122i'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'Logamax plus GB152', 'logamax plus gb152', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax plus gb152'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'logamax plus gb152'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'Logamax plus GB162', 'logamax plus gb162', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax plus gb162'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'logamax plus gb162'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'Logamax plus GB172i', 'logamax plus gb172i', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax plus gb172i'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'logamax plus gb172i'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'Logamax plus GB172i.2', 'logamax plus gb172i.2', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax plus gb172i.2'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'logamax plus gb172i.2'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'Logamax plus GB182i.2', 'logamax plus gb182i.2', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax plus gb182i.2'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'logamax plus gb182i.2'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'Logamax plus GB192i.2', 'logamax plus gb192i.2', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax plus gb192i.2'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'logamax plus gb192i.2'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'Logamax U022', 'logamax u022', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax u022'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'logamax u022'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'Logamax U042', 'logamax u042', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax u042'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'logamax u042'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'Logamax U052', 'logamax u052', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax u052'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'logamax u052'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'Logamax U062', 'logamax u062', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax u062'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'logamax u062'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'Logamax U072', 'logamax u072', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax u072'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'logamax u072'
  );

-- Buderus: resmî model aliasları
INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'Logamax plus GB012', 'logamax plus gb012', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax plus gb012'
  AND m.normalized_name = 'logamax plus gb012'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'logamax plus gb012'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'Logamax plus GB022i', 'logamax plus gb022i', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax plus gb022i'
  AND m.normalized_name = 'logamax plus gb022i'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'logamax plus gb022i'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'Logamax plus GB042', 'logamax plus gb042', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax plus gb042'
  AND m.normalized_name = 'logamax plus gb042'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'logamax plus gb042'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'Logamax plus GB062', 'logamax plus gb062', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax plus gb062'
  AND m.normalized_name = 'logamax plus gb062'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'logamax plus gb062'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'Logamax plus GB072', 'logamax plus gb072', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax plus gb072'
  AND m.normalized_name = 'logamax plus gb072'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'logamax plus gb072'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'Logamax plus GB112-24/29/43/60/24T25/29T25', 'logamax plus gb112-24/29/43/60/24t25/29t25', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax plus gb112'
  AND m.normalized_name = 'logamax plus gb112-24/29/43/60/24t25/29t25'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'logamax plus gb112-24/29/43/60/24t25/29t25'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'Logamax plus GB122i', 'logamax plus gb122i', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax plus gb122i'
  AND m.normalized_name = 'logamax plus gb122i'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'logamax plus gb122i'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'Logamax plus GB152-16/24T', 'logamax plus gb152-16/24t', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax plus gb152'
  AND m.normalized_name = 'logamax plus gb152-16/24t'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'logamax plus gb152-16/24t'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'Logamax plus GB162-15…35 V3', 'logamax plus gb162-15…35 v3', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax plus gb162'
  AND m.normalized_name = 'logamax plus gb162-15…35 v3'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'logamax plus gb162-15…35 v3'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'Logamax plus GB172i', 'logamax plus gb172i', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax plus gb172i'
  AND m.normalized_name = 'logamax plus gb172i'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'logamax plus gb172i'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'Logamax plus GB172i.2', 'logamax plus gb172i.2', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax plus gb172i.2'
  AND m.normalized_name = 'logamax plus gb172i.2'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'logamax plus gb172i.2'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'Logamax plus GB182i.2', 'logamax plus gb182i.2', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax plus gb182i.2'
  AND m.normalized_name = 'logamax plus gb182i.2'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'logamax plus gb182i.2'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'Logamax plus GB192i.2', 'logamax plus gb192i.2', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax plus gb192i.2'
  AND m.normalized_name = 'logamax plus gb192i.2'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'logamax plus gb192i.2'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'Logamax U022', 'logamax u022', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax u022'
  AND m.normalized_name = 'logamax u022'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'logamax u022'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'Logamax U042-24K', 'logamax u042-24k', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax u042'
  AND m.normalized_name = 'logamax u042-24k'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'logamax u042-24k'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'Logamax U052', 'logamax u052', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax u052'
  AND m.normalized_name = 'logamax u052'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'logamax u052'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'Logamax U062', 'logamax u062', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax u062'
  AND m.normalized_name = 'logamax u062'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'logamax u062'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'Logamax U072', 'logamax u072', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Buderus'
  AND f.normalized_name = 'logamax u072'
  AND m.normalized_name = 'logamax u072'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'logamax u072'
  );

-- Warmhaus: model aileleri
INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Warmhaus', 'Enerwa', 'enerwa', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Warmhaus', 'Enerwa Plus', 'enerwa plus', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Warmhaus', 'Ewa', 'ewa', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Warmhaus', 'Glowa', 'glowa', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Warmhaus', 'Minerwa', 'minerwa', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET
  family_name = EXCLUDED.family_name,
  is_active = true,
  updated_at = now();

-- Warmhaus: resmî modeller
INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Enerwa 24/31',
  'enerwa 24/31',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Warmhaus'
      AND r.official_model = 'Enerwa 24/31'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Warmhaus'
  AND f.normalized_name = 'enerwa'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Enerwa Plus 28/35',
  'enerwa plus 28/35',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Warmhaus'
      AND r.official_model = 'Enerwa Plus 28/35'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Warmhaus'
  AND f.normalized_name = 'enerwa plus'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Enerwa Plus 33/39',
  'enerwa plus 33/39',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Warmhaus'
      AND r.official_model = 'Enerwa Plus 33/39'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Warmhaus'
  AND f.normalized_name = 'enerwa plus'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Enerwa Plus 42/40',
  'enerwa plus 42/40',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Warmhaus'
      AND r.official_model = 'Enerwa Plus 42/40'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Warmhaus'
  AND f.normalized_name = 'enerwa plus'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Enerwa Plus 45/43',
  'enerwa plus 45/43',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Warmhaus'
      AND r.official_model = 'Enerwa Plus 45/43'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Warmhaus'
  AND f.normalized_name = 'enerwa plus'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Ewa 20',
  'ewa 20',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Warmhaus'
      AND r.official_model = 'Ewa 20'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Warmhaus'
  AND f.normalized_name = 'ewa'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Ewa 24',
  'ewa 24',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Warmhaus'
      AND r.official_model = 'Ewa 24'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Warmhaus'
  AND f.normalized_name = 'ewa'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Glowa 20/23',
  'glowa 20/23',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Warmhaus'
      AND r.official_model = 'Glowa 20/23'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Warmhaus'
  AND f.normalized_name = 'glowa'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Glowa 24/28',
  'glowa 24/28',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Warmhaus'
      AND r.official_model = 'Glowa 24/28'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Warmhaus'
  AND f.normalized_name = 'glowa'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Minerwa 25',
  'minerwa 25',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand = 'Warmhaus'
      AND r.official_model = 'Minerwa 25'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url) <> ''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand = 'Warmhaus'
  AND f.normalized_name = 'minerwa'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name = EXCLUDED.official_model_name,
  source_url = COALESCE(boiler_official_models.source_url, EXCLUDED.source_url),
  is_active = true,
  updated_at = now();

-- Warmhaus: aile aliasları
INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'Enerwa', 'enerwa', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Warmhaus'
  AND f.normalized_name = 'enerwa'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'enerwa'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'Enerwa Plus', 'enerwa plus', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Warmhaus'
  AND f.normalized_name = 'enerwa plus'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'enerwa plus'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'Ewa', 'ewa', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Warmhaus'
  AND f.normalized_name = 'ewa'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'ewa'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'Glowa', 'glowa', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Warmhaus'
  AND f.normalized_name = 'glowa'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'glowa'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, NULL, 'Minerwa', 'minerwa', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand = 'Warmhaus'
  AND f.normalized_name = 'minerwa'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id = f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias = 'minerwa'
  );

-- Warmhaus: resmî model aliasları
INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'Enerwa 24/31', 'enerwa 24/31', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Warmhaus'
  AND f.normalized_name = 'enerwa'
  AND m.normalized_name = 'enerwa 24/31'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'enerwa 24/31'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'Enerwa Plus 28/35', 'enerwa plus 28/35', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Warmhaus'
  AND f.normalized_name = 'enerwa plus'
  AND m.normalized_name = 'enerwa plus 28/35'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'enerwa plus 28/35'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'Enerwa Plus 33/39', 'enerwa plus 33/39', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Warmhaus'
  AND f.normalized_name = 'enerwa plus'
  AND m.normalized_name = 'enerwa plus 33/39'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'enerwa plus 33/39'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'Enerwa Plus 42/40', 'enerwa plus 42/40', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Warmhaus'
  AND f.normalized_name = 'enerwa plus'
  AND m.normalized_name = 'enerwa plus 42/40'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'enerwa plus 42/40'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'Enerwa Plus 45/43', 'enerwa plus 45/43', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Warmhaus'
  AND f.normalized_name = 'enerwa plus'
  AND m.normalized_name = 'enerwa plus 45/43'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'enerwa plus 45/43'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'Ewa 20', 'ewa 20', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Warmhaus'
  AND f.normalized_name = 'ewa'
  AND m.normalized_name = 'ewa 20'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'ewa 20'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'Ewa 24', 'ewa 24', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Warmhaus'
  AND f.normalized_name = 'ewa'
  AND m.normalized_name = 'ewa 24'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'ewa 24'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'Glowa 20/23', 'glowa 20/23', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Warmhaus'
  AND f.normalized_name = 'glowa'
  AND m.normalized_name = 'glowa 20/23'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'glowa 20/23'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'Glowa 24/28', 'glowa 24/28', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Warmhaus'
  AND f.normalized_name = 'glowa'
  AND m.normalized_name = 'glowa 24/28'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'glowa 24/28'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT
  f.id, m.id, 'Minerwa 25', 'minerwa 25', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id = f.id
WHERE f.brand = 'Warmhaus'
  AND f.normalized_name = 'minerwa'
  AND m.normalized_name = 'minerwa 25'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id = m.id
      AND a.normalized_alias = 'minerwa 25'
  );

-- Sayısal doğrulamalar
DO $$
DECLARE v_family bigint; v_model bigint; v_falias bigint; v_malias bigint;
BEGIN
  SELECT count(*) INTO v_family
  FROM public.boiler_model_families
  WHERE brand = 'Vaillant' AND is_active = true;
  IF v_family <> 10 THEN
    RAISE EXCEPTION 'Vaillant aile sayısı beklenen 10, mevcut %', v_family;
  END IF;
  SELECT count(*) INTO v_model
  FROM public.boiler_official_models m
  JOIN public.boiler_model_families f ON f.id=m.family_id
  WHERE f.brand = 'Vaillant' AND m.is_active = true;
  IF v_model <> 38 THEN
    RAISE EXCEPTION 'Vaillant model sayısı beklenen 38, mevcut %', v_model;
  END IF;
  SELECT count(*) INTO v_falias
  FROM public.boiler_model_aliases a
  JOIN public.boiler_model_families f ON f.id=a.family_id
  WHERE f.brand = 'Vaillant' AND a.official_model_id IS NULL AND a.is_verified=true;
  IF v_falias < 10 THEN
    RAISE EXCEPTION 'Vaillant aile alias sayısı en az 10, mevcut %', v_falias;
  END IF;
  SELECT count(*) INTO v_malias
  FROM public.boiler_model_aliases a
  JOIN public.boiler_model_families f ON f.id=a.family_id
  WHERE f.brand = 'Vaillant' AND a.official_model_id IS NOT NULL AND a.is_verified=true;
  IF v_malias < 38 THEN
    RAISE EXCEPTION 'Vaillant model alias sayısı en az 38, mevcut %', v_malias;
  END IF;
  SELECT count(*) INTO v_family
  FROM public.boiler_model_families
  WHERE brand = 'Bosch' AND is_active = true;
  IF v_family <> 12 THEN
    RAISE EXCEPTION 'Bosch aile sayısı beklenen 12, mevcut %', v_family;
  END IF;
  SELECT count(*) INTO v_model
  FROM public.boiler_official_models m
  JOIN public.boiler_model_families f ON f.id=m.family_id
  WHERE f.brand = 'Bosch' AND m.is_active = true;
  IF v_model <> 12 THEN
    RAISE EXCEPTION 'Bosch model sayısı beklenen 12, mevcut %', v_model;
  END IF;
  SELECT count(*) INTO v_falias
  FROM public.boiler_model_aliases a
  JOIN public.boiler_model_families f ON f.id=a.family_id
  WHERE f.brand = 'Bosch' AND a.official_model_id IS NULL AND a.is_verified=true;
  IF v_falias < 12 THEN
    RAISE EXCEPTION 'Bosch aile alias sayısı en az 12, mevcut %', v_falias;
  END IF;
  SELECT count(*) INTO v_malias
  FROM public.boiler_model_aliases a
  JOIN public.boiler_model_families f ON f.id=a.family_id
  WHERE f.brand = 'Bosch' AND a.official_model_id IS NOT NULL AND a.is_verified=true;
  IF v_malias < 12 THEN
    RAISE EXCEPTION 'Bosch model alias sayısı en az 12, mevcut %', v_malias;
  END IF;
  SELECT count(*) INTO v_family
  FROM public.boiler_model_families
  WHERE brand = 'Buderus' AND is_active = true;
  IF v_family <> 18 THEN
    RAISE EXCEPTION 'Buderus aile sayısı beklenen 18, mevcut %', v_family;
  END IF;
  SELECT count(*) INTO v_model
  FROM public.boiler_official_models m
  JOIN public.boiler_model_families f ON f.id=m.family_id
  WHERE f.brand = 'Buderus' AND m.is_active = true;
  IF v_model <> 18 THEN
    RAISE EXCEPTION 'Buderus model sayısı beklenen 18, mevcut %', v_model;
  END IF;
  SELECT count(*) INTO v_falias
  FROM public.boiler_model_aliases a
  JOIN public.boiler_model_families f ON f.id=a.family_id
  WHERE f.brand = 'Buderus' AND a.official_model_id IS NULL AND a.is_verified=true;
  IF v_falias < 18 THEN
    RAISE EXCEPTION 'Buderus aile alias sayısı en az 18, mevcut %', v_falias;
  END IF;
  SELECT count(*) INTO v_malias
  FROM public.boiler_model_aliases a
  JOIN public.boiler_model_families f ON f.id=a.family_id
  WHERE f.brand = 'Buderus' AND a.official_model_id IS NOT NULL AND a.is_verified=true;
  IF v_malias < 18 THEN
    RAISE EXCEPTION 'Buderus model alias sayısı en az 18, mevcut %', v_malias;
  END IF;
  SELECT count(*) INTO v_family
  FROM public.boiler_model_families
  WHERE brand = 'Warmhaus' AND is_active = true;
  IF v_family <> 5 THEN
    RAISE EXCEPTION 'Warmhaus aile sayısı beklenen 5, mevcut %', v_family;
  END IF;
  SELECT count(*) INTO v_model
  FROM public.boiler_official_models m
  JOIN public.boiler_model_families f ON f.id=m.family_id
  WHERE f.brand = 'Warmhaus' AND m.is_active = true;
  IF v_model <> 10 THEN
    RAISE EXCEPTION 'Warmhaus model sayısı beklenen 10, mevcut %', v_model;
  END IF;
  SELECT count(*) INTO v_falias
  FROM public.boiler_model_aliases a
  JOIN public.boiler_model_families f ON f.id=a.family_id
  WHERE f.brand = 'Warmhaus' AND a.official_model_id IS NULL AND a.is_verified=true;
  IF v_falias < 5 THEN
    RAISE EXCEPTION 'Warmhaus aile alias sayısı en az 5, mevcut %', v_falias;
  END IF;
  SELECT count(*) INTO v_malias
  FROM public.boiler_model_aliases a
  JOIN public.boiler_model_families f ON f.id=a.family_id
  WHERE f.brand = 'Warmhaus' AND a.official_model_id IS NOT NULL AND a.is_verified=true;
  IF v_malias < 10 THEN
    RAISE EXCEPTION 'Warmhaus model alias sayısı en az 10, mevcut %', v_malias;
  END IF;
END $$;

COMMIT;