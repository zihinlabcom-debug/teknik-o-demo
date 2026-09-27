-- Teknik-O — kalan 7 marka cihaz tanıma katmanı
-- Ariston, Baymak, E.C.A., Immergas, Alpha, Lambert, Viessmann
-- Model aileleri + resmî modeller + güvenli aliaslar
-- official_error_codes_raw tablosuna dokunmaz.
BEGIN;

-- Ariston: aileler
INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Ariston', 'Alteas One Net', 'alteas one net', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Ariston', 'BS II', 'bs ii', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Ariston', 'Cares Premium', 'cares premium', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Ariston', 'Cares S', 'cares s', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Ariston', 'Cares X', 'cares x', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Ariston', 'Clas', 'clas', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Ariston', 'Clas Evo', 'clas evo', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Ariston', 'Clas One', 'clas one', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Ariston', 'Clas Premium', 'clas premium', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Ariston', 'Clas Premium Evo', 'clas premium evo', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Ariston', 'Clas X', 'clas x', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Ariston', 'Egis', 'egis', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Ariston', 'Egis Plus', 'egis plus', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Ariston', 'Genus', 'genus', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Ariston', 'Genus Evo', 'genus evo', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Ariston', 'Genus One', 'genus one', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Ariston', 'Genus Premium', 'genus premium', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Ariston', 'Genus Premium Evo', 'genus premium evo', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Ariston', 'Genus X', 'genus x', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Ariston', 'Matis', 'matis', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Ariston', 'microGENUS II', 'microgenus ii', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Ariston', 'microGENUS PLUS', 'microgenus plus', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Ariston', 'Uno', 'uno', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

-- Ariston: resmî modeller
INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Alteas One Net 24/30/35',
  'alteas one net 24/30/35',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Ariston'
      AND r.official_model='Alteas One Net 24/30/35'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='alteas one net'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'BS II 24 FF / CF',
  'bs ii 24 ff / cf',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Ariston'
      AND r.official_model='BS II 24 FF / CF'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='bs ii'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Cares Premium 24 / 30',
  'cares premium 24 / 30',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Ariston'
      AND r.official_model='Cares Premium 24 / 30'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='cares premium'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Cares S 24 / 30',
  'cares s 24 / 30',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Ariston'
      AND r.official_model='Cares S 24 / 30'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='cares s'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Cares X 15/18/24 FF-CF / System',
  'cares x 15/18/24 ff-cf / system',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Ariston'
      AND r.official_model='Cares X 15/18/24 FF-CF / System'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='cares x'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Clas 24 FF / 28 FF',
  'clas 24 ff / 28 ff',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Ariston'
      AND r.official_model='Clas 24 FF / 28 FF'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='clas'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Clas Evo 24/28 FF-CF / System',
  'clas evo 24/28 ff-cf / system',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Ariston'
      AND r.official_model='Clas Evo 24/28 FF-CF / System'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='clas evo'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'CLAS ONE / CLAS ONE SYSTEM',
  'clas one / clas one system',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Ariston'
      AND r.official_model='CLAS ONE / CLAS ONE SYSTEM'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='clas one'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Clas Premium 24/30/35',
  'clas premium 24/30/35',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Ariston'
      AND r.official_model='Clas Premium 24/30/35'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='clas premium'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Clas Premium Evo 24/30/35 / System',
  'clas premium evo 24/30/35 / system',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Ariston'
      AND r.official_model='Clas Premium Evo 24/30/35 / System'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='clas premium evo'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Clas X 24/28/32 FF-CF / System',
  'clas x 24/28/32 ff-cf / system',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Ariston'
      AND r.official_model='Clas X 24/28/32 FF-CF / System'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='clas x'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Egis 24 FF / CF',
  'egis 24 ff / cf',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Ariston'
      AND r.official_model='Egis 24 FF / CF'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='egis'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Egis Plus 24 FF / CF',
  'egis plus 24 ff / cf',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Ariston'
      AND r.official_model='Egis Plus 24 FF / CF'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='egis plus'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Genus 23/27/30 MFFI / 27 RFFI',
  'genus 23/27/30 mffi / 27 rffi',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Ariston'
      AND r.official_model='Genus 23/27/30 MFFI / 27 RFFI'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='genus'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Genus Evo 24/30/32/35 FF-CF',
  'genus evo 24/30/32/35 ff-cf',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Ariston'
      AND r.official_model='Genus Evo 24/30/32/35 FF-CF'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='genus evo'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'GENUS ONE / GENUS ONE NET',
  'genus one / genus one net',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Ariston'
      AND r.official_model='GENUS ONE / GENUS ONE NET'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='genus one'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Genus Premium 24/30/35 / System',
  'genus premium 24/30/35 / system',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Ariston'
      AND r.official_model='Genus Premium 24/30/35 / System'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='genus premium'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Genus Premium Evo 24/30/35 / System',
  'genus premium evo 24/30/35 / system',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Ariston'
      AND r.official_model='Genus Premium Evo 24/30/35 / System'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='genus premium evo'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Genus X 24/30/32/35 FF-CF',
  'genus x 24/30/32/35 ff-cf',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Ariston'
      AND r.official_model='Genus X 24/30/32/35 FF-CF'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='genus x'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Matis 24 FF / 24 CF',
  'matis 24 ff / 24 cf',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Ariston'
      AND r.official_model='Matis 24 FF / 24 CF'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='matis'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'microGENUS II / HE 24/28/31/32 MFFI',
  'microgenus ii / he 24/28/31/32 mffi',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Ariston'
      AND r.official_model='microGENUS II / HE 24/28/31/32 MFFI'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='microgenus ii'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'microGENUS PLUS 24/28 MI-MFFI / 31 MFFI',
  'microgenus plus 24/28 mi-mffi / 31 mffi',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Ariston'
      AND r.official_model='microGENUS PLUS 24/28 MI-MFFI / 31 MFFI'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='microgenus plus'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Uno 24 MFFI / MI',
  'uno 24 mffi / mi',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Ariston'
      AND r.official_model='Uno 24 MFFI / MI'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='uno'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

-- Ariston: aile aliasları
INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Alteas One Net', 'alteas one net', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='alteas one net'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='alteas one net'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'BS II', 'bs ii', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='bs ii'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='bs ii'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Cares Premium', 'cares premium', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='cares premium'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='cares premium'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Cares S', 'cares s', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='cares s'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='cares s'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Cares X', 'cares x', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='cares x'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='cares x'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Clas', 'clas', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='clas'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='clas'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Clas Evo', 'clas evo', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='clas evo'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='clas evo'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Clas One', 'clas one', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='clas one'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='clas one'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Clas Premium', 'clas premium', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='clas premium'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='clas premium'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Clas Premium Evo', 'clas premium evo', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='clas premium evo'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='clas premium evo'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Clas X', 'clas x', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='clas x'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='clas x'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Egis', 'egis', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='egis'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='egis'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Egis Plus', 'egis plus', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='egis plus'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='egis plus'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Genus', 'genus', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='genus'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='genus'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Genus Evo', 'genus evo', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='genus evo'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='genus evo'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Genus One', 'genus one', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='genus one'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='genus one'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Genus Premium', 'genus premium', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='genus premium'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='genus premium'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Genus Premium Evo', 'genus premium evo', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='genus premium evo'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='genus premium evo'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Genus X', 'genus x', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='genus x'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='genus x'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Matis', 'matis', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='matis'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='matis'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'microGENUS II', 'microgenus ii', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='microgenus ii'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='microgenus ii'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'microGENUS PLUS', 'microgenus plus', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='microgenus plus'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='microgenus plus'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Uno', 'uno', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Ariston'
  AND f.normalized_name='uno'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='uno'
  );

-- Ariston: resmî model aliasları
INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Alteas One Net 24/30/35', 'alteas one net 24/30/35', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Ariston'
  AND f.normalized_name='alteas one net'
  AND m.normalized_name='alteas one net 24/30/35'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='alteas one net 24/30/35'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'BS II 24 FF / CF', 'bs ii 24 ff / cf', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Ariston'
  AND f.normalized_name='bs ii'
  AND m.normalized_name='bs ii 24 ff / cf'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='bs ii 24 ff / cf'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Cares Premium 24 / 30', 'cares premium 24 / 30', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Ariston'
  AND f.normalized_name='cares premium'
  AND m.normalized_name='cares premium 24 / 30'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='cares premium 24 / 30'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Cares S 24 / 30', 'cares s 24 / 30', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Ariston'
  AND f.normalized_name='cares s'
  AND m.normalized_name='cares s 24 / 30'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='cares s 24 / 30'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Cares X 15/18/24 FF-CF / System', 'cares x 15/18/24 ff-cf / system', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Ariston'
  AND f.normalized_name='cares x'
  AND m.normalized_name='cares x 15/18/24 ff-cf / system'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='cares x 15/18/24 ff-cf / system'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Clas 24 FF / 28 FF', 'clas 24 ff / 28 ff', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Ariston'
  AND f.normalized_name='clas'
  AND m.normalized_name='clas 24 ff / 28 ff'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='clas 24 ff / 28 ff'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Clas Evo 24/28 FF-CF / System', 'clas evo 24/28 ff-cf / system', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Ariston'
  AND f.normalized_name='clas evo'
  AND m.normalized_name='clas evo 24/28 ff-cf / system'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='clas evo 24/28 ff-cf / system'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'CLAS ONE / CLAS ONE SYSTEM', 'clas one / clas one system', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Ariston'
  AND f.normalized_name='clas one'
  AND m.normalized_name='clas one / clas one system'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='clas one / clas one system'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Clas Premium 24/30/35', 'clas premium 24/30/35', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Ariston'
  AND f.normalized_name='clas premium'
  AND m.normalized_name='clas premium 24/30/35'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='clas premium 24/30/35'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Clas Premium Evo 24/30/35 / System', 'clas premium evo 24/30/35 / system', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Ariston'
  AND f.normalized_name='clas premium evo'
  AND m.normalized_name='clas premium evo 24/30/35 / system'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='clas premium evo 24/30/35 / system'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Clas X 24/28/32 FF-CF / System', 'clas x 24/28/32 ff-cf / system', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Ariston'
  AND f.normalized_name='clas x'
  AND m.normalized_name='clas x 24/28/32 ff-cf / system'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='clas x 24/28/32 ff-cf / system'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Egis 24 FF / CF', 'egis 24 ff / cf', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Ariston'
  AND f.normalized_name='egis'
  AND m.normalized_name='egis 24 ff / cf'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='egis 24 ff / cf'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Egis Plus 24 FF / CF', 'egis plus 24 ff / cf', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Ariston'
  AND f.normalized_name='egis plus'
  AND m.normalized_name='egis plus 24 ff / cf'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='egis plus 24 ff / cf'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Genus 23/27/30 MFFI / 27 RFFI', 'genus 23/27/30 mffi / 27 rffi', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Ariston'
  AND f.normalized_name='genus'
  AND m.normalized_name='genus 23/27/30 mffi / 27 rffi'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='genus 23/27/30 mffi / 27 rffi'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Genus Evo 24/30/32/35 FF-CF', 'genus evo 24/30/32/35 ff-cf', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Ariston'
  AND f.normalized_name='genus evo'
  AND m.normalized_name='genus evo 24/30/32/35 ff-cf'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='genus evo 24/30/32/35 ff-cf'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'GENUS ONE / GENUS ONE NET', 'genus one / genus one net', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Ariston'
  AND f.normalized_name='genus one'
  AND m.normalized_name='genus one / genus one net'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='genus one / genus one net'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Genus Premium 24/30/35 / System', 'genus premium 24/30/35 / system', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Ariston'
  AND f.normalized_name='genus premium'
  AND m.normalized_name='genus premium 24/30/35 / system'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='genus premium 24/30/35 / system'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Genus Premium Evo 24/30/35 / System', 'genus premium evo 24/30/35 / system', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Ariston'
  AND f.normalized_name='genus premium evo'
  AND m.normalized_name='genus premium evo 24/30/35 / system'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='genus premium evo 24/30/35 / system'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Genus X 24/30/32/35 FF-CF', 'genus x 24/30/32/35 ff-cf', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Ariston'
  AND f.normalized_name='genus x'
  AND m.normalized_name='genus x 24/30/32/35 ff-cf'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='genus x 24/30/32/35 ff-cf'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Matis 24 FF / 24 CF', 'matis 24 ff / 24 cf', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Ariston'
  AND f.normalized_name='matis'
  AND m.normalized_name='matis 24 ff / 24 cf'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='matis 24 ff / 24 cf'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'microGENUS II / HE 24/28/31/32 MFFI', 'microgenus ii / he 24/28/31/32 mffi', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Ariston'
  AND f.normalized_name='microgenus ii'
  AND m.normalized_name='microgenus ii / he 24/28/31/32 mffi'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='microgenus ii / he 24/28/31/32 mffi'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'microGENUS PLUS 24/28 MI-MFFI / 31 MFFI', 'microgenus plus 24/28 mi-mffi / 31 mffi', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Ariston'
  AND f.normalized_name='microgenus plus'
  AND m.normalized_name='microgenus plus 24/28 mi-mffi / 31 mffi'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='microgenus plus 24/28 mi-mffi / 31 mffi'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Uno 24 MFFI / MI', 'uno 24 mffi / mi', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Ariston'
  AND f.normalized_name='uno'
  AND m.normalized_name='uno 24 mffi / mi'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='uno 24 mffi / mi'
  );

-- Baymak: aileler
INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Baymak', 'DUOTEC', 'duotec', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Baymak', 'DUOTEC COMPACT', 'duotec compact', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Baymak', 'LUNA AVANT', 'luna avant', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

-- Baymak: resmî modeller
INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'DUOTEC 33',
  'duotec 33',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Baymak'
      AND r.official_model='DUOTEC 33'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Baymak'
  AND f.normalized_name='duotec'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'DUOTEC 42',
  'duotec 42',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Baymak'
      AND r.official_model='DUOTEC 42'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Baymak'
  AND f.normalized_name='duotec'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'DUOTEC 42 DHW',
  'duotec 42 dhw',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Baymak'
      AND r.official_model='DUOTEC 42 DHW'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Baymak'
  AND f.normalized_name='duotec'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'DUOTEC 45',
  'duotec 45',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Baymak'
      AND r.official_model='DUOTEC 45'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Baymak'
  AND f.normalized_name='duotec'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'DUOTEC COMPACT 24',
  'duotec compact 24',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Baymak'
      AND r.official_model='DUOTEC COMPACT 24'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Baymak'
  AND f.normalized_name='duotec compact'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'DUOTEC COMPACT 30',
  'duotec compact 30',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Baymak'
      AND r.official_model='DUOTEC COMPACT 30'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Baymak'
  AND f.normalized_name='duotec compact'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'LUNA AVANT 24 Fx',
  'luna avant 24 fx',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Baymak'
      AND r.official_model='LUNA AVANT 24 Fx'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Baymak'
  AND f.normalized_name='luna avant'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

-- Baymak: aile aliasları
INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'DUOTEC', 'duotec', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Baymak'
  AND f.normalized_name='duotec'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='duotec'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'DUOTEC COMPACT', 'duotec compact', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Baymak'
  AND f.normalized_name='duotec compact'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='duotec compact'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'LUNA AVANT', 'luna avant', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Baymak'
  AND f.normalized_name='luna avant'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='luna avant'
  );

-- Baymak: resmî model aliasları
INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'DUOTEC 33', 'duotec 33', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Baymak'
  AND f.normalized_name='duotec'
  AND m.normalized_name='duotec 33'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='duotec 33'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'DUOTEC 42', 'duotec 42', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Baymak'
  AND f.normalized_name='duotec'
  AND m.normalized_name='duotec 42'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='duotec 42'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'DUOTEC 42 DHW', 'duotec 42 dhw', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Baymak'
  AND f.normalized_name='duotec'
  AND m.normalized_name='duotec 42 dhw'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='duotec 42 dhw'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'DUOTEC 45', 'duotec 45', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Baymak'
  AND f.normalized_name='duotec'
  AND m.normalized_name='duotec 45'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='duotec 45'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'DUOTEC COMPACT 24', 'duotec compact 24', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Baymak'
  AND f.normalized_name='duotec compact'
  AND m.normalized_name='duotec compact 24'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='duotec compact 24'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'DUOTEC COMPACT 30', 'duotec compact 30', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Baymak'
  AND f.normalized_name='duotec compact'
  AND m.normalized_name='duotec compact 30'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='duotec compact 30'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'LUNA AVANT 24 Fx', 'luna avant 24 fx', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Baymak'
  AND f.normalized_name='luna avant'
  AND m.normalized_name='luna avant 24 fx'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='luna avant 24 fx'
  );

-- E.C.A.: aileler
INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('E.C.A.', 'Calora Premix', 'calora premix', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('E.C.A.', 'Citius Premix', 'citius premix', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('E.C.A.', 'Confeo Digital', 'confeo digital', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('E.C.A.', 'Confeo Plus', 'confeo plus', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('E.C.A.', 'Confeo Premix', 'confeo premix', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('E.C.A.', 'Fortius', 'fortius', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('E.C.A.', 'Fortius Plus', 'fortius plus', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('E.C.A.', 'Gelios Plus', 'gelios plus', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('E.C.A.', 'Gerda', 'gerda', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('E.C.A.', 'Kronos', 'kronos', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('E.C.A.', 'Proteus', 'proteus', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('E.C.A.', 'Proteus Plus', 'proteus plus', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('E.C.A.', 'Proteus Plus Blue', 'proteus plus blue', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('E.C.A.', 'Proteus Premix', 'proteus premix', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('E.C.A.', 'Scot', 'scot', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

-- E.C.A.: resmî modeller
INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Calora Premix',
  'calora premix',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='E.C.A.'
      AND r.official_model='Calora Premix'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='E.C.A.'
  AND f.normalized_name='calora premix'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Citius Premix',
  'citius premix',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='E.C.A.'
      AND r.official_model='Citius Premix'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='E.C.A.'
  AND f.normalized_name='citius premix'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Confeo Digital',
  'confeo digital',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='E.C.A.'
      AND r.official_model='Confeo Digital'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='E.C.A.'
  AND f.normalized_name='confeo digital'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Confeo Plus DCO 24/28 HM',
  'confeo plus dco 24/28 hm',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='E.C.A.'
      AND r.official_model='Confeo Plus DCO 24/28 HM'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='E.C.A.'
  AND f.normalized_name='confeo plus'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Confeo Premix',
  'confeo premix',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='E.C.A.'
      AND r.official_model='Confeo Premix'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='E.C.A.'
  AND f.normalized_name='confeo premix'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Fortius',
  'fortius',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='E.C.A.'
      AND r.official_model='Fortius'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='E.C.A.'
  AND f.normalized_name='fortius'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Fortius Plus',
  'fortius plus',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='E.C.A.'
      AND r.official_model='Fortius Plus'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='E.C.A.'
  AND f.normalized_name='fortius plus'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Gelios Plus',
  'gelios plus',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='E.C.A.'
      AND r.official_model='Gelios Plus'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='E.C.A.'
  AND f.normalized_name='gelios plus'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Gerda',
  'gerda',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='E.C.A.'
      AND r.official_model='Gerda'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='E.C.A.'
  AND f.normalized_name='gerda'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Kronos KR 24 HM',
  'kronos kr 24 hm',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='E.C.A.'
      AND r.official_model='Kronos KR 24 HM'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='E.C.A.'
  AND f.normalized_name='kronos'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Proteus',
  'proteus',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='E.C.A.'
      AND r.official_model='Proteus'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='E.C.A.'
  AND f.normalized_name='proteus'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Proteus Plus',
  'proteus plus',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='E.C.A.'
      AND r.official_model='Proteus Plus'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='E.C.A.'
  AND f.normalized_name='proteus plus'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Proteus Plus Blue',
  'proteus plus blue',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='E.C.A.'
      AND r.official_model='Proteus Plus Blue'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='E.C.A.'
  AND f.normalized_name='proteus plus blue'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Proteus Premix',
  'proteus premix',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='E.C.A.'
      AND r.official_model='Proteus Premix'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='E.C.A.'
  AND f.normalized_name='proteus premix'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Scot SC 24 HM',
  'scot sc 24 hm',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='E.C.A.'
      AND r.official_model='Scot SC 24 HM'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='E.C.A.'
  AND f.normalized_name='scot'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

-- E.C.A.: aile aliasları
INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Calora Premix', 'calora premix', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='E.C.A.'
  AND f.normalized_name='calora premix'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='calora premix'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Citius Premix', 'citius premix', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='E.C.A.'
  AND f.normalized_name='citius premix'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='citius premix'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Confeo Digital', 'confeo digital', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='E.C.A.'
  AND f.normalized_name='confeo digital'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='confeo digital'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Confeo Plus', 'confeo plus', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='E.C.A.'
  AND f.normalized_name='confeo plus'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='confeo plus'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Confeo Premix', 'confeo premix', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='E.C.A.'
  AND f.normalized_name='confeo premix'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='confeo premix'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Fortius', 'fortius', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='E.C.A.'
  AND f.normalized_name='fortius'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='fortius'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Fortius Plus', 'fortius plus', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='E.C.A.'
  AND f.normalized_name='fortius plus'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='fortius plus'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Gelios Plus', 'gelios plus', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='E.C.A.'
  AND f.normalized_name='gelios plus'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='gelios plus'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Gerda', 'gerda', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='E.C.A.'
  AND f.normalized_name='gerda'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='gerda'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Kronos', 'kronos', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='E.C.A.'
  AND f.normalized_name='kronos'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='kronos'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Proteus', 'proteus', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='E.C.A.'
  AND f.normalized_name='proteus'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='proteus'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Proteus Plus', 'proteus plus', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='E.C.A.'
  AND f.normalized_name='proteus plus'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='proteus plus'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Proteus Plus Blue', 'proteus plus blue', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='E.C.A.'
  AND f.normalized_name='proteus plus blue'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='proteus plus blue'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Proteus Premix', 'proteus premix', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='E.C.A.'
  AND f.normalized_name='proteus premix'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='proteus premix'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Scot', 'scot', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='E.C.A.'
  AND f.normalized_name='scot'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='scot'
  );

-- E.C.A.: resmî model aliasları
INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Calora Premix', 'calora premix', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='E.C.A.'
  AND f.normalized_name='calora premix'
  AND m.normalized_name='calora premix'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='calora premix'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Citius Premix', 'citius premix', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='E.C.A.'
  AND f.normalized_name='citius premix'
  AND m.normalized_name='citius premix'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='citius premix'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Confeo Digital', 'confeo digital', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='E.C.A.'
  AND f.normalized_name='confeo digital'
  AND m.normalized_name='confeo digital'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='confeo digital'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Confeo Plus DCO 24/28 HM', 'confeo plus dco 24/28 hm', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='E.C.A.'
  AND f.normalized_name='confeo plus'
  AND m.normalized_name='confeo plus dco 24/28 hm'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='confeo plus dco 24/28 hm'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Confeo Premix', 'confeo premix', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='E.C.A.'
  AND f.normalized_name='confeo premix'
  AND m.normalized_name='confeo premix'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='confeo premix'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Fortius', 'fortius', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='E.C.A.'
  AND f.normalized_name='fortius'
  AND m.normalized_name='fortius'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='fortius'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Fortius Plus', 'fortius plus', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='E.C.A.'
  AND f.normalized_name='fortius plus'
  AND m.normalized_name='fortius plus'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='fortius plus'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Gelios Plus', 'gelios plus', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='E.C.A.'
  AND f.normalized_name='gelios plus'
  AND m.normalized_name='gelios plus'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='gelios plus'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Gerda', 'gerda', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='E.C.A.'
  AND f.normalized_name='gerda'
  AND m.normalized_name='gerda'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='gerda'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Kronos KR 24 HM', 'kronos kr 24 hm', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='E.C.A.'
  AND f.normalized_name='kronos'
  AND m.normalized_name='kronos kr 24 hm'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='kronos kr 24 hm'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Proteus', 'proteus', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='E.C.A.'
  AND f.normalized_name='proteus'
  AND m.normalized_name='proteus'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='proteus'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Proteus Plus', 'proteus plus', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='E.C.A.'
  AND f.normalized_name='proteus plus'
  AND m.normalized_name='proteus plus'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='proteus plus'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Proteus Plus Blue', 'proteus plus blue', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='E.C.A.'
  AND f.normalized_name='proteus plus blue'
  AND m.normalized_name='proteus plus blue'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='proteus plus blue'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Proteus Premix', 'proteus premix', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='E.C.A.'
  AND f.normalized_name='proteus premix'
  AND m.normalized_name='proteus premix'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='proteus premix'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Scot SC 24 HM', 'scot sc 24 hm', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='E.C.A.'
  AND f.normalized_name='scot'
  AND m.normalized_name='scot sc 24 hm'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='scot sc 24 hm'
  );

-- Immergas: aileler
INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Immergas', 'ALPHA ECO', 'alpha eco', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Immergas', 'EOLO MYTHOS', 'eolo mythos', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Immergas', 'EOLO STAR', 'eolo star', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Immergas', 'HERCULES CONDENSING', 'hercules condensing', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Immergas', 'HERCULES CONDENSING ABT', 'hercules condensing abt', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Immergas', 'MAIOR EOLO', 'maior eolo', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Immergas', 'MINI EOLO STAR', 'mini eolo star', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Immergas', 'VICTRIX 24 TT', 'victrix 24 tt', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Immergas', 'VICTRIX 26', 'victrix 26', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Immergas', 'VICTRIX EXA', 'victrix exa', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Immergas', 'VICTRIX MAIOR', 'victrix maior', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Immergas', 'VICTRIX OMNIA', 'victrix omnia', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Immergas', 'VICTRIX SUPERIOR', 'victrix superior', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Immergas', 'VICTRIX TERA', 'victrix tera', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Immergas', 'VICTRIX ZEUS', 'victrix zeus', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Immergas', 'VICTRIX ZEUS SUPERIOR', 'victrix zeus superior', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

-- Immergas: resmî modeller
INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'ALPHA ECO 28',
  'alpha eco 28',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Immergas'
      AND r.official_model='ALPHA ECO 28'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='alpha eco'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'EOLO MYTHOS',
  'eolo mythos',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Immergas'
      AND r.official_model='EOLO MYTHOS'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='eolo mythos'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'EOLO STAR 24 3 E',
  'eolo star 24 3 e',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Immergas'
      AND r.official_model='EOLO STAR 24 3 E'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='eolo star'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'EOLO STAR 24 5 E',
  'eolo star 24 5 e',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Immergas'
      AND r.official_model='EOLO STAR 24 5 E'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='eolo star'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'HERCULES CONDENSING',
  'hercules condensing',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Immergas'
      AND r.official_model='HERCULES CONDENSING'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='hercules condensing'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'HERCULES CONDENSING 32 3 ERP',
  'hercules condensing 32 3 erp',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Immergas'
      AND r.official_model='HERCULES CONDENSING 32 3 ERP'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='hercules condensing'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'HERCULES CONDENSING ABT 32 3 ERP',
  'hercules condensing abt 32 3 erp',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Immergas'
      AND r.official_model='HERCULES CONDENSING ABT 32 3 ERP'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='hercules condensing abt'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'MAIOR EOLO',
  'maior eolo',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Immergas'
      AND r.official_model='MAIOR EOLO'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='maior eolo'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'MINI EOLO STAR 24 3 E',
  'mini eolo star 24 3 e',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Immergas'
      AND r.official_model='MINI EOLO STAR 24 3 E'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='mini eolo star'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'VICTRIX 24 TT 1 E',
  'victrix 24 tt 1 e',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Immergas'
      AND r.official_model='VICTRIX 24 TT 1 E'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix 24 tt'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'VICTRIX 26 2 ERP',
  'victrix 26 2 erp',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Immergas'
      AND r.official_model='VICTRIX 26 2 ERP'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix 26'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'VICTRIX EXA 28 1 ERP',
  'victrix exa 28 1 erp',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Immergas'
      AND r.official_model='VICTRIX EXA 28 1 ERP'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix exa'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'VICTRIX EXA 32 1 ERP',
  'victrix exa 32 1 erp',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Immergas'
      AND r.official_model='VICTRIX EXA 32 1 ERP'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix exa'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'VICTRIX MAIOR 28 TT 1 ERP',
  'victrix maior 28 tt 1 erp',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Immergas'
      AND r.official_model='VICTRIX MAIOR 28 TT 1 ERP'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix maior'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'VICTRIX MAIOR 35 TT 1 ERP',
  'victrix maior 35 tt 1 erp',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Immergas'
      AND r.official_model='VICTRIX MAIOR 35 TT 1 ERP'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix maior'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'VICTRIX OMNIA',
  'victrix omnia',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Immergas'
      AND r.official_model='VICTRIX OMNIA'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix omnia'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'VICTRIX SUPERIOR 32 2 ERP',
  'victrix superior 32 2 erp',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Immergas'
      AND r.official_model='VICTRIX SUPERIOR 32 2 ERP'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix superior'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'VICTRIX SUPERIOR 32 X 2 ERP',
  'victrix superior 32 x 2 erp',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Immergas'
      AND r.official_model='VICTRIX SUPERIOR 32 X 2 ERP'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix superior'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'VICTRIX TERA 24 1 E',
  'victrix tera 24 1 e',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Immergas'
      AND r.official_model='VICTRIX TERA 24 1 E'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix tera'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'VICTRIX TERA 28 1',
  'victrix tera 28 1',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Immergas'
      AND r.official_model='VICTRIX TERA 28 1'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix tera'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'VICTRIX TERA 32 1',
  'victrix tera 32 1',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Immergas'
      AND r.official_model='VICTRIX TERA 32 1'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix tera'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'VICTRIX TERA 38 1',
  'victrix tera 38 1',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Immergas'
      AND r.official_model='VICTRIX TERA 38 1'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix tera'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'VICTRIX ZEUS 25',
  'victrix zeus 25',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Immergas'
      AND r.official_model='VICTRIX ZEUS 25'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix zeus'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'VICTRIX ZEUS 32',
  'victrix zeus 32',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Immergas'
      AND r.official_model='VICTRIX ZEUS 32'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix zeus'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'VICTRIX ZEUS SUPERIOR 32 KW',
  'victrix zeus superior 32 kw',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Immergas'
      AND r.official_model='VICTRIX ZEUS SUPERIOR 32 KW'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix zeus superior'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

-- Immergas: aile aliasları
INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'ALPHA ECO', 'alpha eco', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='alpha eco'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='alpha eco'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'EOLO MYTHOS', 'eolo mythos', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='eolo mythos'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='eolo mythos'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'EOLO STAR', 'eolo star', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='eolo star'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='eolo star'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'HERCULES CONDENSING', 'hercules condensing', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='hercules condensing'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='hercules condensing'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'HERCULES CONDENSING ABT', 'hercules condensing abt', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='hercules condensing abt'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='hercules condensing abt'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'MAIOR EOLO', 'maior eolo', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='maior eolo'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='maior eolo'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'MINI EOLO STAR', 'mini eolo star', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='mini eolo star'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='mini eolo star'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'VICTRIX 24 TT', 'victrix 24 tt', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix 24 tt'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='victrix 24 tt'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'VICTRIX 26', 'victrix 26', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix 26'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='victrix 26'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'VICTRIX EXA', 'victrix exa', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix exa'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='victrix exa'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'VICTRIX MAIOR', 'victrix maior', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix maior'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='victrix maior'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'VICTRIX OMNIA', 'victrix omnia', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix omnia'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='victrix omnia'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'VICTRIX SUPERIOR', 'victrix superior', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix superior'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='victrix superior'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'VICTRIX TERA', 'victrix tera', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix tera'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='victrix tera'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'VICTRIX ZEUS', 'victrix zeus', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix zeus'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='victrix zeus'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'VICTRIX ZEUS SUPERIOR', 'victrix zeus superior', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix zeus superior'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='victrix zeus superior'
  );

-- Immergas: resmî model aliasları
INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'ALPHA ECO 28', 'alpha eco 28', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Immergas'
  AND f.normalized_name='alpha eco'
  AND m.normalized_name='alpha eco 28'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='alpha eco 28'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'EOLO MYTHOS', 'eolo mythos', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Immergas'
  AND f.normalized_name='eolo mythos'
  AND m.normalized_name='eolo mythos'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='eolo mythos'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'EOLO STAR 24 3 E', 'eolo star 24 3 e', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Immergas'
  AND f.normalized_name='eolo star'
  AND m.normalized_name='eolo star 24 3 e'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='eolo star 24 3 e'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'EOLO STAR 24 5 E', 'eolo star 24 5 e', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Immergas'
  AND f.normalized_name='eolo star'
  AND m.normalized_name='eolo star 24 5 e'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='eolo star 24 5 e'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'HERCULES CONDENSING', 'hercules condensing', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Immergas'
  AND f.normalized_name='hercules condensing'
  AND m.normalized_name='hercules condensing'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='hercules condensing'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'HERCULES CONDENSING 32 3 ERP', 'hercules condensing 32 3 erp', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Immergas'
  AND f.normalized_name='hercules condensing'
  AND m.normalized_name='hercules condensing 32 3 erp'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='hercules condensing 32 3 erp'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'HERCULES CONDENSING ABT 32 3 ERP', 'hercules condensing abt 32 3 erp', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Immergas'
  AND f.normalized_name='hercules condensing abt'
  AND m.normalized_name='hercules condensing abt 32 3 erp'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='hercules condensing abt 32 3 erp'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'MAIOR EOLO', 'maior eolo', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Immergas'
  AND f.normalized_name='maior eolo'
  AND m.normalized_name='maior eolo'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='maior eolo'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'MINI EOLO STAR 24 3 E', 'mini eolo star 24 3 e', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Immergas'
  AND f.normalized_name='mini eolo star'
  AND m.normalized_name='mini eolo star 24 3 e'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='mini eolo star 24 3 e'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'VICTRIX 24 TT 1 E', 'victrix 24 tt 1 e', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix 24 tt'
  AND m.normalized_name='victrix 24 tt 1 e'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='victrix 24 tt 1 e'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'VICTRIX 26 2 ERP', 'victrix 26 2 erp', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix 26'
  AND m.normalized_name='victrix 26 2 erp'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='victrix 26 2 erp'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'VICTRIX EXA 28 1 ERP', 'victrix exa 28 1 erp', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix exa'
  AND m.normalized_name='victrix exa 28 1 erp'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='victrix exa 28 1 erp'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'VICTRIX EXA 32 1 ERP', 'victrix exa 32 1 erp', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix exa'
  AND m.normalized_name='victrix exa 32 1 erp'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='victrix exa 32 1 erp'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'VICTRIX MAIOR 28 TT 1 ERP', 'victrix maior 28 tt 1 erp', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix maior'
  AND m.normalized_name='victrix maior 28 tt 1 erp'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='victrix maior 28 tt 1 erp'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'VICTRIX MAIOR 35 TT 1 ERP', 'victrix maior 35 tt 1 erp', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix maior'
  AND m.normalized_name='victrix maior 35 tt 1 erp'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='victrix maior 35 tt 1 erp'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'VICTRIX OMNIA', 'victrix omnia', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix omnia'
  AND m.normalized_name='victrix omnia'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='victrix omnia'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'VICTRIX SUPERIOR 32 2 ERP', 'victrix superior 32 2 erp', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix superior'
  AND m.normalized_name='victrix superior 32 2 erp'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='victrix superior 32 2 erp'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'VICTRIX SUPERIOR 32 X 2 ERP', 'victrix superior 32 x 2 erp', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix superior'
  AND m.normalized_name='victrix superior 32 x 2 erp'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='victrix superior 32 x 2 erp'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'VICTRIX TERA 24 1 E', 'victrix tera 24 1 e', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix tera'
  AND m.normalized_name='victrix tera 24 1 e'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='victrix tera 24 1 e'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'VICTRIX TERA 28 1', 'victrix tera 28 1', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix tera'
  AND m.normalized_name='victrix tera 28 1'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='victrix tera 28 1'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'VICTRIX TERA 32 1', 'victrix tera 32 1', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix tera'
  AND m.normalized_name='victrix tera 32 1'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='victrix tera 32 1'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'VICTRIX TERA 38 1', 'victrix tera 38 1', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix tera'
  AND m.normalized_name='victrix tera 38 1'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='victrix tera 38 1'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'VICTRIX ZEUS 25', 'victrix zeus 25', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix zeus'
  AND m.normalized_name='victrix zeus 25'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='victrix zeus 25'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'VICTRIX ZEUS 32', 'victrix zeus 32', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix zeus'
  AND m.normalized_name='victrix zeus 32'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='victrix zeus 32'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'VICTRIX ZEUS SUPERIOR 32 KW', 'victrix zeus superior 32 kw', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Immergas'
  AND f.normalized_name='victrix zeus superior'
  AND m.normalized_name='victrix zeus superior 32 kw'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='victrix zeus superior 32 kw'
  );

-- Alpha: aileler
INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Alpha', 'ALPHA ECO', 'alpha eco', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

-- Alpha: resmî modeller
INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'ALPHA ECO 28',
  'alpha eco 28',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Alpha'
      AND r.official_model='ALPHA ECO 28'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Alpha'
  AND f.normalized_name='alpha eco'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

-- Alpha: aile aliasları
INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'ALPHA ECO', 'alpha eco', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Alpha'
  AND f.normalized_name='alpha eco'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='alpha eco'
  );

-- Alpha: resmî model aliasları
INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'ALPHA ECO 28', 'alpha eco 28', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Alpha'
  AND f.normalized_name='alpha eco'
  AND m.normalized_name='alpha eco 28'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='alpha eco 28'
  );

-- Lambert: aileler
INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Lambert', 'Attivo', 'attivo', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Lambert', 'LPY', 'lpy', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Lambert', 'LPY Compact', 'lpy compact', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

-- Lambert: resmî modeller
INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Attivo 24 Fx',
  'attivo 24 fx',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Lambert'
      AND r.official_model='Attivo 24 Fx'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Lambert'
  AND f.normalized_name='attivo'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Attivo 24 LN',
  'attivo 24 ln',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Lambert'
      AND r.official_model='Attivo 24 LN'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Lambert'
  AND f.normalized_name='attivo'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Attivo 240',
  'attivo 240',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Lambert'
      AND r.official_model='Attivo 240'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Lambert'
  AND f.normalized_name='attivo'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Attivo 310',
  'attivo 310',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Lambert'
      AND r.official_model='Attivo 310'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Lambert'
  AND f.normalized_name='attivo'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'LPY 24 Fi',
  'lpy 24 fi',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Lambert'
      AND r.official_model='LPY 24 Fi'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Lambert'
  AND f.normalized_name='lpy'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'LPY 28 Fi',
  'lpy 28 fi',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Lambert'
      AND r.official_model='LPY 28 Fi'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Lambert'
  AND f.normalized_name='lpy'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'LPY 33 Fi',
  'lpy 33 fi',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Lambert'
      AND r.official_model='LPY 33 Fi'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Lambert'
  AND f.normalized_name='lpy'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'LPY 42 Fi',
  'lpy 42 fi',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Lambert'
      AND r.official_model='LPY 42 Fi'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Lambert'
  AND f.normalized_name='lpy'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'LPY 45 Fi',
  'lpy 45 fi',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Lambert'
      AND r.official_model='LPY 45 Fi'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Lambert'
  AND f.normalized_name='lpy'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'LPY Compact 24',
  'lpy compact 24',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Lambert'
      AND r.official_model='LPY Compact 24'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Lambert'
  AND f.normalized_name='lpy compact'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'LPY Compact 30',
  'lpy compact 30',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Lambert'
      AND r.official_model='LPY Compact 30'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Lambert'
  AND f.normalized_name='lpy compact'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

-- Lambert: aile aliasları
INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Attivo', 'attivo', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Lambert'
  AND f.normalized_name='attivo'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='attivo'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'LPY', 'lpy', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Lambert'
  AND f.normalized_name='lpy'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='lpy'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'LPY Compact', 'lpy compact', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Lambert'
  AND f.normalized_name='lpy compact'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='lpy compact'
  );

-- Lambert: resmî model aliasları
INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Attivo 24 Fx', 'attivo 24 fx', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Lambert'
  AND f.normalized_name='attivo'
  AND m.normalized_name='attivo 24 fx'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='attivo 24 fx'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Attivo 24 LN', 'attivo 24 ln', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Lambert'
  AND f.normalized_name='attivo'
  AND m.normalized_name='attivo 24 ln'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='attivo 24 ln'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Attivo 240', 'attivo 240', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Lambert'
  AND f.normalized_name='attivo'
  AND m.normalized_name='attivo 240'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='attivo 240'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Attivo 310', 'attivo 310', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Lambert'
  AND f.normalized_name='attivo'
  AND m.normalized_name='attivo 310'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='attivo 310'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'LPY 24 Fi', 'lpy 24 fi', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Lambert'
  AND f.normalized_name='lpy'
  AND m.normalized_name='lpy 24 fi'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='lpy 24 fi'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'LPY 28 Fi', 'lpy 28 fi', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Lambert'
  AND f.normalized_name='lpy'
  AND m.normalized_name='lpy 28 fi'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='lpy 28 fi'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'LPY 33 Fi', 'lpy 33 fi', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Lambert'
  AND f.normalized_name='lpy'
  AND m.normalized_name='lpy 33 fi'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='lpy 33 fi'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'LPY 42 Fi', 'lpy 42 fi', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Lambert'
  AND f.normalized_name='lpy'
  AND m.normalized_name='lpy 42 fi'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='lpy 42 fi'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'LPY 45 Fi', 'lpy 45 fi', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Lambert'
  AND f.normalized_name='lpy'
  AND m.normalized_name='lpy 45 fi'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='lpy 45 fi'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'LPY Compact 24', 'lpy compact 24', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Lambert'
  AND f.normalized_name='lpy compact'
  AND m.normalized_name='lpy compact 24'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='lpy compact 24'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'LPY Compact 30', 'lpy compact 30', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Lambert'
  AND f.normalized_name='lpy compact'
  AND m.normalized_name='lpy compact 30'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='lpy compact 30'
  );

-- Viessmann: aileler
INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Viessmann', 'Vitodens 100-W', 'vitodens 100-w', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Viessmann', 'Vitodens 111-W', 'vitodens 111-w', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Viessmann', 'Vitodens Vitotronic', 'vitodens vitotronic', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Viessmann', 'Vitodens 200-W B2HA', 'vitodens 200-w b2ha', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Viessmann', 'Vitodens 200-W B2KA', 'vitodens 200-w b2ka', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Viessmann', 'Vitodens 222-F B2SA', 'vitodens 222-f b2sa', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Viessmann', 'Vitodens 222-F B2TA', 'vitodens 222-f b2ta', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Viessmann', 'Vitodens 222-F B2TE', 'vitodens 222-f b2te', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Viessmann', 'Vitodens 222-W B2LE', 'vitodens 222-w b2le', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Viessmann', 'Vitodens 333-F B3TB', 'vitodens 333-f b3tb', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Viessmann', 'Vitodens Classic', 'vitodens classic', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Viessmann', 'Vitodens Connect', 'vitodens connect', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Viessmann', 'Vitodens Trend', 'vitodens trend', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

INSERT INTO public.boiler_model_families
  (brand, family_name, normalized_name, is_active)
VALUES
  ('Viessmann', 'Vitopend 200-W WH2B', 'vitopend 200-w wh2b', true)
ON CONFLICT (brand, normalized_name)
DO UPDATE SET family_name=EXCLUDED.family_name, is_active=true, updated_at=now();

-- Viessmann: resmî modeller
INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Vitodens 100-W B1HF/B1KF',
  'vitodens 100-w b1hf/b1kf',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Viessmann'
      AND r.official_model='Vitodens 100-W B1HF/B1KF'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitodens 100-w'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Vitodens 111-W B1LF',
  'vitodens 111-w b1lf',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Viessmann'
      AND r.official_model='Vitodens 111-W B1LF'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitodens 111-w'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Vitodens 200-W / 300-W / 222-W / 222-F / 333-F (Vitotronic)',
  'vitodens 200-w / 300-w / 222-w / 222-f / 333-f (vitotronic)',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Viessmann'
      AND r.official_model='Vitodens 200-W / 300-W / 222-W / 222-F / 333-F (Vitotronic)'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitodens vitotronic'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Vitodens 200-W B2HA',
  'vitodens 200-w b2ha',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Viessmann'
      AND r.official_model='Vitodens 200-W B2HA'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitodens 200-w b2ha'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Vitodens 200-W B2KA',
  'vitodens 200-w b2ka',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Viessmann'
      AND r.official_model='Vitodens 200-W B2KA'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitodens 200-w b2ka'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Vitodens 222-F B2SA',
  'vitodens 222-f b2sa',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Viessmann'
      AND r.official_model='Vitodens 222-F B2SA'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitodens 222-f b2sa'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Vitodens 222-F B2TA',
  'vitodens 222-f b2ta',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Viessmann'
      AND r.official_model='Vitodens 222-F B2TA'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitodens 222-f b2ta'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Vitodens 222-F B2TE',
  'vitodens 222-f b2te',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Viessmann'
      AND r.official_model='Vitodens 222-F B2TE'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitodens 222-f b2te'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Vitodens 222-W B2LE',
  'vitodens 222-w b2le',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Viessmann'
      AND r.official_model='Vitodens 222-W B2LE'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitodens 222-w b2le'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Vitodens 333-F B3TB',
  'vitodens 333-f b3tb',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Viessmann'
      AND r.official_model='Vitodens 333-F B3TB'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitodens 333-f b3tb'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Vitodens Classic BPKB-24/BPKB-28',
  'vitodens classic bpkb-24/bpkb-28',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Viessmann'
      AND r.official_model='Vitodens Classic BPKB-24/BPKB-28'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitodens classic'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Vitodens Connect B0KA',
  'vitodens connect b0ka',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Viessmann'
      AND r.official_model='Vitodens Connect B0KA'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitodens connect'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Vitodens Trend BPKA-19 / BPKA-25',
  'vitodens trend bpka-19 / bpka-25',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Viessmann'
      AND r.official_model='Vitodens Trend BPKA-19 / BPKA-25'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitodens trend'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

INSERT INTO public.boiler_official_models
  (family_id, official_model_name, normalized_name, manufacturer_model_code, source_url, is_active)
SELECT
  f.id,
  'Vitopend 200-W WH2B',
  'vitopend 200-w wh2b',
  NULL,
  (
    SELECT r.source_url
    FROM public.official_error_codes_raw r
    WHERE r.brand='Viessmann'
      AND r.official_model='Vitopend 200-W WH2B'
      AND r.source_url IS NOT NULL
      AND btrim(r.source_url)<>''
    ORDER BY r.id
    LIMIT 1
  ),
  true
FROM public.boiler_model_families f
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitopend 200-w wh2b'
ON CONFLICT (family_id, normalized_name)
DO UPDATE SET
  official_model_name=EXCLUDED.official_model_name,
  source_url=COALESCE(boiler_official_models.source_url,EXCLUDED.source_url),
  is_active=true,
  updated_at=now();

-- Viessmann: aile aliasları
INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Vitodens 100-W', 'vitodens 100-w', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitodens 100-w'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='vitodens 100-w'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Vitodens 111-W', 'vitodens 111-w', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitodens 111-w'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='vitodens 111-w'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Vitodens Vitotronic', 'vitodens vitotronic', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitodens vitotronic'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='vitodens vitotronic'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Vitodens 200-W B2HA', 'vitodens 200-w b2ha', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitodens 200-w b2ha'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='vitodens 200-w b2ha'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Vitodens 200-W B2KA', 'vitodens 200-w b2ka', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitodens 200-w b2ka'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='vitodens 200-w b2ka'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Vitodens 222-F B2SA', 'vitodens 222-f b2sa', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitodens 222-f b2sa'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='vitodens 222-f b2sa'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Vitodens 222-F B2TA', 'vitodens 222-f b2ta', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitodens 222-f b2ta'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='vitodens 222-f b2ta'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Vitodens 222-F B2TE', 'vitodens 222-f b2te', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitodens 222-f b2te'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='vitodens 222-f b2te'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Vitodens 222-W B2LE', 'vitodens 222-w b2le', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitodens 222-w b2le'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='vitodens 222-w b2le'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Vitodens 333-F B3TB', 'vitodens 333-f b3tb', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitodens 333-f b3tb'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='vitodens 333-f b3tb'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Vitodens Classic', 'vitodens classic', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitodens classic'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='vitodens classic'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Vitodens Connect', 'vitodens connect', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitodens connect'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='vitodens connect'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Vitodens Trend', 'vitodens trend', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitodens trend'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='vitodens trend'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, NULL, 'Vitopend 200-W WH2B', 'vitopend 200-w wh2b', 'customer', true
FROM public.boiler_model_families f
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitopend 200-w wh2b'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.family_id=f.id
      AND a.official_model_id IS NULL
      AND a.normalized_alias='vitopend 200-w wh2b'
  );

-- Viessmann: resmî model aliasları
INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Vitodens 100-W B1HF/B1KF', 'vitodens 100-w b1hf/b1kf', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitodens 100-w'
  AND m.normalized_name='vitodens 100-w b1hf/b1kf'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='vitodens 100-w b1hf/b1kf'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Vitodens 111-W B1LF', 'vitodens 111-w b1lf', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitodens 111-w'
  AND m.normalized_name='vitodens 111-w b1lf'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='vitodens 111-w b1lf'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Vitodens 200-W / 300-W / 222-W / 222-F / 333-F (Vitotronic)', 'vitodens 200-w / 300-w / 222-w / 222-f / 333-f (vitotronic)', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitodens vitotronic'
  AND m.normalized_name='vitodens 200-w / 300-w / 222-w / 222-f / 333-f (vitotronic)'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='vitodens 200-w / 300-w / 222-w / 222-f / 333-f (vitotronic)'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Vitodens 200-W B2HA', 'vitodens 200-w b2ha', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitodens 200-w b2ha'
  AND m.normalized_name='vitodens 200-w b2ha'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='vitodens 200-w b2ha'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Vitodens 200-W B2KA', 'vitodens 200-w b2ka', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitodens 200-w b2ka'
  AND m.normalized_name='vitodens 200-w b2ka'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='vitodens 200-w b2ka'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Vitodens 222-F B2SA', 'vitodens 222-f b2sa', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitodens 222-f b2sa'
  AND m.normalized_name='vitodens 222-f b2sa'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='vitodens 222-f b2sa'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Vitodens 222-F B2TA', 'vitodens 222-f b2ta', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitodens 222-f b2ta'
  AND m.normalized_name='vitodens 222-f b2ta'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='vitodens 222-f b2ta'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Vitodens 222-F B2TE', 'vitodens 222-f b2te', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitodens 222-f b2te'
  AND m.normalized_name='vitodens 222-f b2te'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='vitodens 222-f b2te'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Vitodens 222-W B2LE', 'vitodens 222-w b2le', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitodens 222-w b2le'
  AND m.normalized_name='vitodens 222-w b2le'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='vitodens 222-w b2le'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Vitodens 333-F B3TB', 'vitodens 333-f b3tb', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitodens 333-f b3tb'
  AND m.normalized_name='vitodens 333-f b3tb'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='vitodens 333-f b3tb'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Vitodens Classic BPKB-24/BPKB-28', 'vitodens classic bpkb-24/bpkb-28', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitodens classic'
  AND m.normalized_name='vitodens classic bpkb-24/bpkb-28'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='vitodens classic bpkb-24/bpkb-28'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Vitodens Connect B0KA', 'vitodens connect b0ka', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitodens connect'
  AND m.normalized_name='vitodens connect b0ka'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='vitodens connect b0ka'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Vitodens Trend BPKA-19 / BPKA-25', 'vitodens trend bpka-19 / bpka-25', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitodens trend'
  AND m.normalized_name='vitodens trend bpka-19 / bpka-25'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='vitodens trend bpka-19 / bpka-25'
  );

INSERT INTO public.boiler_model_aliases
  (family_id, official_model_id, alias, normalized_alias, alias_type, is_verified)
SELECT f.id, m.id, 'Vitopend 200-W WH2B', 'vitopend 200-w wh2b', 'manufacturer', true
FROM public.boiler_model_families f
JOIN public.boiler_official_models m ON m.family_id=f.id
WHERE f.brand='Viessmann'
  AND f.normalized_name='vitopend 200-w wh2b'
  AND m.normalized_name='vitopend 200-w wh2b'
  AND NOT EXISTS (
    SELECT 1 FROM public.boiler_model_aliases a
    WHERE a.official_model_id=m.id
      AND a.normalized_alias='vitopend 200-w wh2b'
  );

-- Sayısal doğrulamalar
DO $$
DECLARE v_family bigint; v_model bigint; v_falias bigint; v_malias bigint;
BEGIN
  SELECT count(*) INTO v_family
  FROM public.boiler_model_families
  WHERE brand='Ariston' AND is_active=true;
  IF v_family <> 23 THEN
    RAISE EXCEPTION 'Ariston aile sayısı beklenen 23, mevcut %', v_family;
  END IF;
  SELECT count(*) INTO v_model
  FROM public.boiler_official_models m
  JOIN public.boiler_model_families f ON f.id=m.family_id
  WHERE f.brand='Ariston' AND m.is_active=true;
  IF v_model <> 23 THEN
    RAISE EXCEPTION 'Ariston model sayısı beklenen 23, mevcut %', v_model;
  END IF;
  SELECT count(*) INTO v_falias
  FROM public.boiler_model_aliases a
  JOIN public.boiler_model_families f ON f.id=a.family_id
  WHERE f.brand='Ariston' AND a.official_model_id IS NULL AND a.is_verified=true;
  IF v_falias < 23 THEN
    RAISE EXCEPTION 'Ariston aile alias sayısı en az 23, mevcut %', v_falias;
  END IF;
  SELECT count(*) INTO v_malias
  FROM public.boiler_model_aliases a
  JOIN public.boiler_model_families f ON f.id=a.family_id
  WHERE f.brand='Ariston' AND a.official_model_id IS NOT NULL AND a.is_verified=true;
  IF v_malias < 23 THEN
    RAISE EXCEPTION 'Ariston model alias sayısı en az 23, mevcut %', v_malias;
  END IF;
  SELECT count(*) INTO v_family
  FROM public.boiler_model_families
  WHERE brand='Baymak' AND is_active=true;
  IF v_family <> 3 THEN
    RAISE EXCEPTION 'Baymak aile sayısı beklenen 3, mevcut %', v_family;
  END IF;
  SELECT count(*) INTO v_model
  FROM public.boiler_official_models m
  JOIN public.boiler_model_families f ON f.id=m.family_id
  WHERE f.brand='Baymak' AND m.is_active=true;
  IF v_model <> 7 THEN
    RAISE EXCEPTION 'Baymak model sayısı beklenen 7, mevcut %', v_model;
  END IF;
  SELECT count(*) INTO v_falias
  FROM public.boiler_model_aliases a
  JOIN public.boiler_model_families f ON f.id=a.family_id
  WHERE f.brand='Baymak' AND a.official_model_id IS NULL AND a.is_verified=true;
  IF v_falias < 3 THEN
    RAISE EXCEPTION 'Baymak aile alias sayısı en az 3, mevcut %', v_falias;
  END IF;
  SELECT count(*) INTO v_malias
  FROM public.boiler_model_aliases a
  JOIN public.boiler_model_families f ON f.id=a.family_id
  WHERE f.brand='Baymak' AND a.official_model_id IS NOT NULL AND a.is_verified=true;
  IF v_malias < 7 THEN
    RAISE EXCEPTION 'Baymak model alias sayısı en az 7, mevcut %', v_malias;
  END IF;
  SELECT count(*) INTO v_family
  FROM public.boiler_model_families
  WHERE brand='E.C.A.' AND is_active=true;
  IF v_family <> 15 THEN
    RAISE EXCEPTION 'E.C.A. aile sayısı beklenen 15, mevcut %', v_family;
  END IF;
  SELECT count(*) INTO v_model
  FROM public.boiler_official_models m
  JOIN public.boiler_model_families f ON f.id=m.family_id
  WHERE f.brand='E.C.A.' AND m.is_active=true;
  IF v_model <> 15 THEN
    RAISE EXCEPTION 'E.C.A. model sayısı beklenen 15, mevcut %', v_model;
  END IF;
  SELECT count(*) INTO v_falias
  FROM public.boiler_model_aliases a
  JOIN public.boiler_model_families f ON f.id=a.family_id
  WHERE f.brand='E.C.A.' AND a.official_model_id IS NULL AND a.is_verified=true;
  IF v_falias < 15 THEN
    RAISE EXCEPTION 'E.C.A. aile alias sayısı en az 15, mevcut %', v_falias;
  END IF;
  SELECT count(*) INTO v_malias
  FROM public.boiler_model_aliases a
  JOIN public.boiler_model_families f ON f.id=a.family_id
  WHERE f.brand='E.C.A.' AND a.official_model_id IS NOT NULL AND a.is_verified=true;
  IF v_malias < 15 THEN
    RAISE EXCEPTION 'E.C.A. model alias sayısı en az 15, mevcut %', v_malias;
  END IF;
  SELECT count(*) INTO v_family
  FROM public.boiler_model_families
  WHERE brand='Immergas' AND is_active=true;
  IF v_family <> 16 THEN
    RAISE EXCEPTION 'Immergas aile sayısı beklenen 16, mevcut %', v_family;
  END IF;
  SELECT count(*) INTO v_model
  FROM public.boiler_official_models m
  JOIN public.boiler_model_families f ON f.id=m.family_id
  WHERE f.brand='Immergas' AND m.is_active=true;
  IF v_model <> 25 THEN
    RAISE EXCEPTION 'Immergas model sayısı beklenen 25, mevcut %', v_model;
  END IF;
  SELECT count(*) INTO v_falias
  FROM public.boiler_model_aliases a
  JOIN public.boiler_model_families f ON f.id=a.family_id
  WHERE f.brand='Immergas' AND a.official_model_id IS NULL AND a.is_verified=true;
  IF v_falias < 16 THEN
    RAISE EXCEPTION 'Immergas aile alias sayısı en az 16, mevcut %', v_falias;
  END IF;
  SELECT count(*) INTO v_malias
  FROM public.boiler_model_aliases a
  JOIN public.boiler_model_families f ON f.id=a.family_id
  WHERE f.brand='Immergas' AND a.official_model_id IS NOT NULL AND a.is_verified=true;
  IF v_malias < 25 THEN
    RAISE EXCEPTION 'Immergas model alias sayısı en az 25, mevcut %', v_malias;
  END IF;
  SELECT count(*) INTO v_family
  FROM public.boiler_model_families
  WHERE brand='Alpha' AND is_active=true;
  IF v_family <> 1 THEN
    RAISE EXCEPTION 'Alpha aile sayısı beklenen 1, mevcut %', v_family;
  END IF;
  SELECT count(*) INTO v_model
  FROM public.boiler_official_models m
  JOIN public.boiler_model_families f ON f.id=m.family_id
  WHERE f.brand='Alpha' AND m.is_active=true;
  IF v_model <> 1 THEN
    RAISE EXCEPTION 'Alpha model sayısı beklenen 1, mevcut %', v_model;
  END IF;
  SELECT count(*) INTO v_falias
  FROM public.boiler_model_aliases a
  JOIN public.boiler_model_families f ON f.id=a.family_id
  WHERE f.brand='Alpha' AND a.official_model_id IS NULL AND a.is_verified=true;
  IF v_falias < 1 THEN
    RAISE EXCEPTION 'Alpha aile alias sayısı en az 1, mevcut %', v_falias;
  END IF;
  SELECT count(*) INTO v_malias
  FROM public.boiler_model_aliases a
  JOIN public.boiler_model_families f ON f.id=a.family_id
  WHERE f.brand='Alpha' AND a.official_model_id IS NOT NULL AND a.is_verified=true;
  IF v_malias < 1 THEN
    RAISE EXCEPTION 'Alpha model alias sayısı en az 1, mevcut %', v_malias;
  END IF;
  SELECT count(*) INTO v_family
  FROM public.boiler_model_families
  WHERE brand='Lambert' AND is_active=true;
  IF v_family <> 3 THEN
    RAISE EXCEPTION 'Lambert aile sayısı beklenen 3, mevcut %', v_family;
  END IF;
  SELECT count(*) INTO v_model
  FROM public.boiler_official_models m
  JOIN public.boiler_model_families f ON f.id=m.family_id
  WHERE f.brand='Lambert' AND m.is_active=true;
  IF v_model <> 11 THEN
    RAISE EXCEPTION 'Lambert model sayısı beklenen 11, mevcut %', v_model;
  END IF;
  SELECT count(*) INTO v_falias
  FROM public.boiler_model_aliases a
  JOIN public.boiler_model_families f ON f.id=a.family_id
  WHERE f.brand='Lambert' AND a.official_model_id IS NULL AND a.is_verified=true;
  IF v_falias < 3 THEN
    RAISE EXCEPTION 'Lambert aile alias sayısı en az 3, mevcut %', v_falias;
  END IF;
  SELECT count(*) INTO v_malias
  FROM public.boiler_model_aliases a
  JOIN public.boiler_model_families f ON f.id=a.family_id
  WHERE f.brand='Lambert' AND a.official_model_id IS NOT NULL AND a.is_verified=true;
  IF v_malias < 11 THEN
    RAISE EXCEPTION 'Lambert model alias sayısı en az 11, mevcut %', v_malias;
  END IF;
  SELECT count(*) INTO v_family
  FROM public.boiler_model_families
  WHERE brand='Viessmann' AND is_active=true;
  IF v_family <> 14 THEN
    RAISE EXCEPTION 'Viessmann aile sayısı beklenen 14, mevcut %', v_family;
  END IF;
  SELECT count(*) INTO v_model
  FROM public.boiler_official_models m
  JOIN public.boiler_model_families f ON f.id=m.family_id
  WHERE f.brand='Viessmann' AND m.is_active=true;
  IF v_model <> 14 THEN
    RAISE EXCEPTION 'Viessmann model sayısı beklenen 14, mevcut %', v_model;
  END IF;
  SELECT count(*) INTO v_falias
  FROM public.boiler_model_aliases a
  JOIN public.boiler_model_families f ON f.id=a.family_id
  WHERE f.brand='Viessmann' AND a.official_model_id IS NULL AND a.is_verified=true;
  IF v_falias < 14 THEN
    RAISE EXCEPTION 'Viessmann aile alias sayısı en az 14, mevcut %', v_falias;
  END IF;
  SELECT count(*) INTO v_malias
  FROM public.boiler_model_aliases a
  JOIN public.boiler_model_families f ON f.id=a.family_id
  WHERE f.brand='Viessmann' AND a.official_model_id IS NOT NULL AND a.is_verified=true;
  IF v_malias < 14 THEN
    RAISE EXCEPTION 'Viessmann model alias sayısı en az 14, mevcut %', v_malias;
  END IF;
END $$;

COMMIT;