"""Offline COPA import preparation. Never connects to a DB or edits the workbook.

Manual source review is input data with pinned document hashes, not model/code
conditions in the extractor. Candidate/effect rules are the shared generators.
"""
from __future__ import annotations
import hashlib
import json
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path
from urllib.parse import urlsplit
from openpyxl import load_workbook

sys.path.insert(0, str(Path(__file__).resolve().parent))
import generate_stage3_fault_candidates as candidates
import generate_stage3_question_backfill as questions

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / 'data/imports/kombi/COPA_Kombi_Resmi_Ariza_Verileri_V1.xlsx'
REVIEW = INPUT.with_name('copa-source-review.json')
OUTPUT = ROOT / 'test-results/copa-stage3'
NAMES = ['20260928000032_import_copa_identity_and_fuel.sql',
         '20260928000033_seed_copa_fault_candidates.sql',
         '20260928000034_seed_copa_question_effects.sql']


def norm(value):
    value = value.lower().replace('ı', 'i')
    return re.sub(r'[^a-z0-9]+', ' ', ''.join(c for c in unicodedata.normalize('NFKD', value)
                                           if not unicodedata.combining(c))).strip()


def values(rows):
    return ',\n'.join('  (' + ', '.join('NULL' if v is None else candidates.sql_quote(str(v))
                                      for v in row) + ')' for row in rows)


def load_data():
    review = json.loads(REVIEW.read_text(encoding='utf-8'))
    if hashlib.sha256(INPUT.read_bytes()).hexdigest() != review['workbook_sha256']:
        raise ValueError('Reviewed workbook changed')
    book = load_workbook(INPUT, read_only=True, data_only=True)
    raw_sheet = list(book['Ariza_Verileri'].values)
    scope = list(book['Kapsam_Kaynaklar'].values)
    families = {r[0]: {'fuel_type': 'electric' if r[2] == 'Elektrik' else 'gas', 'source_url': r[3]}
                for r in scope[1:] if r[0] != 'NORMALİZASYON NOTU'}
    sources = {r['family']: r for r in review['sources']}
    for family, source in sources.items():
        parsed = urlsplit(source['url'])
        path = OUTPUT / f'documents/copa-{source["id"]}.pdf'
        if parsed.scheme != 'https' or parsed.hostname not in ('copa.com.tr', 'www.copa.com.tr') or not source['accessible']:
            raise ValueError('Unapproved/unavailable source')
        if not path.read_bytes().startswith(b'%PDF-') or hashlib.sha256(path.read_bytes()).hexdigest() != source['sha256']:
            raise ValueError('Reviewed PDF changed or is missing')
        if families[family]['source_url'] != source['url']:
            raise ValueError('Source/family mismatch')
    rows = [r[:7] for r in raw_sheet[1:] if any(v is not None for v in r)]
    blanks = {raw_sheet[0][i]: sum(not r[i] for r in rows) for i in range(1, 7)}
    if len(rows) != 185 or any(blanks.values()) or len({(r[1], r[2], r[3]) for r in rows}) != len(rows):
        raise ValueError('Workbook audit failed')
    corrections = {(r['family'], r['code']): r for r in review['corrections']}
    raw, audit, models = [], [], {}
    for r in rows:
        _, brand, model, code, description, action, url = r
        family = next(f for f in sorted(families, key=len, reverse=True)
                      if norm(model).startswith(norm(f) + ' '))
        source = sources[family]
        if brand != 'COPA' or url != source['url']:
            raise ValueError('Raw identity/source mismatch')
        correction = corrections.get((family, code))
        imported_description = correction['description'] if correction else description
        imported_action = correction['action'] if correction else action
        raw.append(candidates.Raw(brand, model, code, imported_description, imported_action, url))
        audit.append({'brand': brand, 'model': model, 'family': family, 'code': code,
                      'excel_description': description, 'excel_action': action,
                      'description': imported_description, 'action': imported_action,
                      'source_url': url, 'source_verified': True, 'pages': source['pages'],
                      'source_sha256': source['sha256'], 'corrected': bool(correction),
                      'effects_allowed': correction.get('effects_allowed', True) if correction else True})
        models[model] = {'family': family, 'name': model, 'fuel_type': families[family]['fuel_type'],
                         'source_url': url, 'has_raw_scope': True}
    extra = review['additional_catalog']
    for model in extra['models']:
        models[model] = {'family': extra['family'], 'name': model, 'fuel_type': extra['fuel_type'],
                         'source_url': extra['source_url'], 'has_raw_scope': False}
    aliases = set()
    for family in families:
        for alias in [family, family.replace('-', ' '), family.replace('-', '').replace(' ', '')]:
            aliases.add((family, None, norm(alias)))
    for model, data in models.items():
        without_unit = re.sub(r'\s+kW$', '', model)
        for alias in [model, without_unit, without_unit.replace(data['family'], data['family'].replace('-', '').replace(' ', ''))]:
            aliases.add((data['family'], model, norm(alias)))
    aliases = sorted(aliases, key=lambda a: (a[0], a[1] or '', a[2]))
    return review, families, raw, models, aliases, audit, blanks


def identity_sql(families, raw, models, aliases):
    raw_values = values([(r.brand, r.model, r.code, r.description, r.action, r.url) for r in raw])
    model_values = values([(m['family'], m['name'], norm(m['name']), m['fuel_type'], m['source_url']) for m in models.values()])
    alias_values = values(aliases)
    return f"""-- COPA: reviewed, source-grounded 185 raw rows; workbook is never modified.
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
{raw_values};
DO $$ BEGIN
 IF (SELECT count(*) FROM copa_raw_seed)<>185 OR EXISTS (
   SELECT 1 FROM copa_raw_seed WHERE brand<>'COPA' OR source_url !~ '^https://www\\.copa\\.com\\.tr/') THEN
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
{model_values};
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
{alias_values};
INSERT INTO public.boiler_model_aliases(family_id,official_model_id,alias,normalized_alias,alias_type,is_verified)
SELECT f.id,m.id,s.normalized_alias,s.normalized_alias,'manufacturer',true FROM copa_alias_seed s
JOIN public.boiler_model_families f ON f.brand='COPA' AND f.normalized_name=lower(s.family_name)
LEFT JOIN public.boiler_official_models m ON m.family_id=f.id AND m.official_model_name=s.official_model_name
WHERE NOT EXISTS(SELECT 1 FROM public.boiler_model_aliases a WHERE a.family_id=f.id
 AND a.official_model_id IS NOT DISTINCT FROM m.id AND a.normalized_alias=s.normalized_alias);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.official_error_codes_raw WHERE brand='COPA')<>185
   OR (SELECT count(*) FROM copa_model_seed)<>{len(models)}
   OR (SELECT count(*) FROM public.boiler_model_families WHERE brand='COPA' AND is_active)<>{len(families)}
   OR (SELECT count(*) FROM copa_model_seed s JOIN public.boiler_official_models m ON m.official_model_name=s.official_model_name
       JOIN public.boiler_model_families f ON f.id=m.family_id AND f.brand='COPA' AND f.fuel_type=s.fuel_type
       WHERE m.is_active AND f.is_active)<>{len(models)} THEN
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
"""


def prepare():
    review, families, raw, models, aliases, audit, blanks = load_data()
    cs = [c for r in raw for c in candidates.extract(r, fuel_type=models[r.model]['fuel_type'], include_groups=False)]
    by_identity = {(r['model'], r['code']): r for r in audit}
    items = [questions.SeedItem(c.raw.brand, c.raw.model, models[c.raw.model]['family'], c.raw.code,
              c.key, c.name, c.fault_class, c.raw.description, c.raw.action, c.raw.url,
              c.description_phrase or c.action_phrase, c.level, 'exact') for c in cs]
    es = questions.build_new_effects(items, [])
    catalog = questions.BASELINE_QUESTIONS + questions.NEW_QUESTIONS
    gas_topics = {'gas_other_appliance','safety_gas_smell','ignition_attempt_sequence'}
    es = [e for e in es if by_identity[(e.item.model, e.item.code)]['effects_allowed'] and
          not (models[e.item.model]['fuel_type'] == 'electric' and e.question in gas_topics)]
    return review, families, raw, models, aliases, audit, blanks, cs, items, es, catalog


def main():
    data = prepare()
    review, families, raw, models, aliases, audit, blanks, cs, items, es, catalog = data
    OUTPUT.mkdir(parents=True, exist_ok=True)
    # Numbers 32-34 are owned by this preparation. Never overwrite another task.
    for number, name in zip((32,33,34), NAMES):
        collisions = [p for p in candidates.MIGRATIONS.glob(f'*0000{number}_*.sql') if p.name != name]
        if collisions: raise ValueError(f'Migration number occupied: {collisions}')
    (candidates.MIGRATIONS / NAMES[0]).write_text(identity_sql(families, raw, models, aliases), encoding='utf-8')
    (candidates.MIGRATIONS / NAMES[1]).write_text(candidates.migration_sql(33, 'COPA', cs,
        raw_row_count=None, raw_brand_count=185, migration_name=NAMES[1]), encoding='utf-8')
    # Reuses the identical existing catalog; only new COPA effects are inserted.
    (candidates.MIGRATIONS / NAMES[2]).write_text(questions.render_migration(es), encoding='utf-8')
    fixture = {'families': [{'id': norm(f), 'brand': 'COPA', 'family_name': f, 'normalized_name': f.lower(),
                'fuel_type': d['fuel_type'], 'is_active': True} for f,d in families.items()],
      'models': [{'id': norm(m), 'family_id': norm(d['family']), 'official_model_name': m,
                  'normalized_name': norm(m), 'is_active': True} for m,d in models.items()],
      'aliases': [{'family_id': norm(f), 'official_model_id': norm(m) if m else None,
                   'normalized_alias': a, 'is_verified': True} for f,m,a in aliases],
      'raw': [{'id': i+1, 'brand': r.brand, 'official_model': r.model, 'error_code': r.code} for i,r in enumerate(raw)],
      'candidates': [{'id': c.key, 'candidate_key': c.key, 'candidate_name': c.name, 'fault_class': c.fault_class,
        'family_id': norm(models[c.raw.model]['family']), 'official_model_id': norm(c.raw.model),
        'error_code': c.raw.code, 'verification_status': 'verified', 'is_active': True} for c in cs],
      'questions': [{'id': q, 'question_key': q, 'question_text': t, 'evidence_group': g,
        'is_safety_question': s, 'priority': p, 'answer_options': o, 'is_active': True,
        'customer_observable': True} for q,t,g,s,p,o in catalog],
      'effects': [{'candidate_id': e.item.key, 'question_id': e.question,
                    'answer_key': e.answer, 'effect': e.effect} for e in es]}
    (ROOT / 'tests/fixtures/copa-stage3.json').write_text(json.dumps(fixture,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    pools = {(r.model,r.code) for r in raw}
    supported = {(c.raw.model,c.raw.code) for c in cs}
    questioned = {(e.item.model,e.item.code) for e in es}
    counts = {'excel_raw':len(raw),'prepared_raw':len(raw),'family_count':len(families),'excel_models':11,
      'official_models':len(models),'aliases':len(aliases),'gas_models':sum(d['fuel_type']=='gas' for d in models.values()),
      'electric_models':sum(d['fuel_type']=='electric' for d in models.values()),'candidates':len(cs),
      'raw_model_code_pools':len(pools),'candidate_pools':len(supported),
      'candidate_coverage_percent':round(100*len(supported)/len(pools),2),
      'questions_reused':len({e.question for e in es}),'new_questions':0,'effects':len(es),
      'questionless_candidate_pools':len(supported-questioned),'raw_without_candidate':len(pools-supported),
      'source_empty':sum(not c.raw.url for c in cs),'evidence_empty':sum(not (c.description_phrase or c.action_phrase) for c in cs),
      'duplicate_raw':len(raw)-len(pools),
      'duplicate_semantic_candidate':len(cs)-len({(c.raw.model,c.raw.code,c.name,c.fault_class) for c in cs}),
      'corrected_rows':sum(r['corrected'] for r in audit),
      'support_kind':dict(Counter(c.support_kind for c in cs)),
      'fault_classes':dict(Counter(c.fault_class for c in cs)),
      'evidence_source_types':dict(Counter(c.source_type for c in cs)),
      'per_family':{f:{'raw':sum(models[r.model]['family']==f for r in raw),
          'models':sum(d['family']==f for d in models.values()),
          'candidates':sum(models[c.raw.model]['family']==f for c in cs),
          'effects':sum(models[e.item.model]['family']==f for e in es)} for f in families}}
    report = {'counts':counts,'blank_fields':blanks,'sources':review['sources'],'notes':review['notes'],
              'migrations':NAMES,'spot_checks':audit,
              'questionless_pools':[{'model':m,'code':c} for m,c in sorted(supported-questioned)]}
    (OUTPUT/'preparation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    lines=['# COPA Stage 3 hazırlık ve kaynak denetimi','',json.dumps(counts,ensure_ascii=False,indent=2),'',
      '185 satırın tamamı denetlendi; aşağıdaki kayıtlar Excel ve import karşılaştırmasını içerir. '+
      'Description/action kaynak anlamını koruyan metinlerdir; birebir PDF alıntısı iddiası yoktur.','',
      '| Model | Kod | Import açıklaması | Import işlem | Resmî kaynak / PDF sayfası | Sonuç | Excel farkı |',
      '|---|---|---|---|---|---|---|']
    for r in audit:
        esc=lambda v:str(v).replace('|','/').replace('\n',' ')
        lines.append('| '+' | '.join(map(esc,[r['model'],r['code'],r['description'],r['action'],
         r['source_url']+' / '+','.join(map(str,r['pages'])),'DOĞRULANDI',
         'Source-aligned correction' if r['corrected'] else 'Semantically compatible']))+' |')
    lines+=['','## Kaynak kapsamı ve farklılıklar']+['- '+n for n in review['notes']]
    lines+=['','DB push, commit, push ve deploy yapılmadı. Bu rapor uygulanmış DB sonucu değildir.']
    (OUTPUT/'audit.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    print(json.dumps(counts,ensure_ascii=False,indent=2))


if __name__ == '__main__': main()
