"""Prepare conservative, offline Stage 3 question/effect seeds.

Reads the existing candidate generator as data; never rewrites candidate migrations.
Only explicit customer-observable links below can yield effects. A fault class by
itself never does. Run directly to write migrations 00028/00029 and a JSON report.
"""

from __future__ import annotations

import json
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import generate_stage3_fault_candidates as source

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT / "supabase/migrations"


@dataclass(frozen=True)
class Item:
    brand: str
    model: str
    family: str
    code: str
    key: str
    name: str
    fault_class: str
    description: str
    action: str
    url: str


QUESTIONS = [
    ("gas_other_appliance", "Evinizdeki başka bir gazlı cihaz (örneğin ocak) normal çalışıyor mu?", "household_gas_availability", False, 80, ["yes", "no", "unknown"]),
    ("display_low_water_pressure", "Cihazın kullanıcı göstergesinde su basıncı düşük görünüyor mu?", "display_water_pressure", False, 70, ["yes", "no", "unknown"]),
    ("visible_water_leak", "Cihazın dışından görülebilen su kaçağı var mı?", "visible_water_leak", False, 60, ["yes", "no", "unknown"]),
    ("abnormal_fan_noise", "Cihaz çalışmaya çalışırken olağandışı sürtme veya uğultu sesi duyuyor musunuz?", "abnormal_running_noise", False, 50, ["yes", "no", "unknown"]),
    ("safety_gas_smell", "Gaz kokusu alıyor musunuz?", "safety_gas_smell", True, 100, ["yes", "no", "unknown"]),
]


def sql(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def load_items() -> list[Item]:
    batches, _, families = source.prepare()
    items = [Item(c.raw.brand, c.raw.model, families[(c.raw.brand, c.raw.model)],
                  c.raw.code, c.key, c.name, c.fault_class, c.raw.description,
                  c.raw.action, c.raw.url)
             for batch in batches.values() for c in batch]
    intro = "ecoTEC intro VUW 18/24 AS/1-1"
    raw_by_code = {(r.model, r.code): r for r in source.read_raw() if r.brand == "Vaillant"}
    first = (MIGRATIONS / "20260927000014_seed_vaillant_ecotec_intro_f28_candidates.sql").read_text(encoding="utf-8")
    for key, name, fault_class in re.findall(
        r"\('(vaillant_ecotec_intro_f28_[^']+)',\s*'([^']+)',\s*'[^']+',\s*'([^']+)'\)", first):
        raw = raw_by_code[(intro, "F.28")]
        items.append(Item("Vaillant", intro, "ecotec intro", "F.28", key, name,
                          fault_class, raw.description, raw.action, raw.url))
    remaining = (MIGRATIONS / "20260927000015_seed_vaillant_ecotec_intro_remaining_candidates.sql").read_text(encoding="utf-8")
    for code, key, name, fault_class, _ in re.findall(
        r"\('(F\.[0-9]+)',\s*'(vaillant_ecotec_intro_[^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'\)", remaining):
        raw = raw_by_code[(intro, code)]
        items.append(Item("Vaillant", intro, "ecotec intro", code, key, name,
                          fault_class, raw.description, raw.action, raw.url))
    if len(items) != 8664 or len({i.key for i in items}) != len(items):
        raise ValueError(f"Expected 8664 distinct prepared candidates, got {len(items)}")
    return items


def phrase(item: Item, pattern: str) -> str | None:
    text = item.description + " | " + item.action
    match = re.search(pattern, text, re.I)
    return match.group(0) if match else None


def build_effects(items: list[Item]):
    pools: dict[tuple[str, str, str], list[Item]] = defaultdict(list)
    for item in items:
        pools[(item.brand, item.model, item.code)].append(item)
    effects = []
    for pool in pools.values():
        if len({i.name for i in pool}) < 2:
            continue
        for item in pool:
            # Observable house gas availability addresses supply only, never the
            # boiler's internal valve or an unobservable inlet-pressure reading.
            if item.name in {"Gaz beslemesi sorunu", "Gaz beslemesi veya giriş basıncı sorunu"}:
                basis = phrase(item, r"gaz\s+(?:giriş(?:i)?|besleme(?:si)?|yok|hattı|basıncı)")
                if basis:
                    effects.extend([(item, "gas_other_appliance", "no", "support", basis),
                                    (item, "gas_other_appliance", "yes", "weaken", basis)])
            # The user's own pressure display can separate actual low-water
            # candidates from other fault points; it cannot rule out a sensor.
            if item.name in {"Tesisat su basıncı/eksik su sorunu", "Isıtma sistemi su basıncının çok düşük olması", "Sistem basıncı / su miktarı yetersizliği"}:
                basis = phrase(item, r"(?:su|tesisat|sistem|ısıtma sistemi)\s+basın(?:ç|c[ıi])\w*|su\s+(?:eksikliğ\w*|miktarı)")
                if basis:
                    effects.extend([(item, "display_low_water_pressure", "yes", "support", basis),
                                    (item, "display_low_water_pressure", "no", "weaken", basis)])
            if item.name in {"Su kaçağı/sızıntısı sorunu", "Eşanjör sızıntısı"}:
                basis = phrase(item, r"(?:su|tesisat|eşanjör)\s+(?:kaçak\w*|sızıntı\w*)")
                if basis:
                    effects.append((item, "visible_water_leak", "yes", "support", basis))
            # Audible abnormal mechanical noise is weak evidence for a
            # documented fan fault point; absence of noise is not a contradiction.
            if item.name in {"Fan sorunu", "Fan arızası"} and any(
                other.fault_class in {"sensor", "electronic", "electrical", "combustion_air"}
                for other in pool if other.key != item.key
            ):
                basis = phrase(item, r"fan\w*")
                if basis:
                    effects.append((item, "abnormal_fan_noise", "yes", "support", basis))
    keys = [(item.key, question, answer) for item, question, answer, _, _ in effects]
    if len(keys) != len(set(keys)):
        raise ValueError("Duplicate effect")
    return pools, effects


def write_catalog() -> None:
    values = ",\n".join("  (" + ", ".join([
        sql(key), sql(text), sql(group), "true" if safety else "false", str(priority),
        sql(json.dumps(options, ensure_ascii=False)) + "::jsonb"]
    ) + ")" for key, text, group, safety, priority, options in QUESTIONS)
    content = f"""-- Small reusable customer-observable Stage 3 question catalog.
BEGIN;
CREATE TEMP TABLE stage3_question_seed (
  question_key text PRIMARY KEY, question_text text NOT NULL,
  evidence_group text NOT NULL, is_safety_question boolean NOT NULL,
  priority integer NOT NULL, answer_options jsonb NOT NULL,
  CHECK (length(trim(question_text)) > 0),
  CHECK (length(trim(evidence_group)) > 0),
  CHECK (jsonb_typeof(answer_options) = 'array')
) ON COMMIT DROP;
INSERT INTO stage3_question_seed VALUES
{values};
DO $$ BEGIN
  IF (SELECT count(*) FROM stage3_question_seed) <> {len(QUESTIONS)} THEN
    RAISE EXCEPTION 'Stage 3 question count differs';
  END IF;
  IF EXISTS (SELECT 1 FROM stage3_question_seed s CROSS JOIN LATERAL jsonb_array_elements_text(s.answer_options) a(answer_key)
             WHERE a.answer_key NOT IN ('yes','no','unknown')) THEN
    RAISE EXCEPTION 'Invalid Stage 3 answer key';
  END IF;
  IF EXISTS (SELECT 1 FROM stage3_question_seed s JOIN public.boiler_diagnostic_questions q USING(question_key)
             WHERE q.question_text <> s.question_text OR q.evidence_group <> s.evidence_group
               OR q.answer_options <> s.answer_options OR q.is_safety_question <> s.is_safety_question
               OR q.answer_type <> 'single_choice' OR q.priority <> s.priority
               OR q.customer_observable <> true OR q.is_active <> true) THEN
    RAISE EXCEPTION 'Existing Stage 3 question conflicts with seed';
  END IF;
  IF EXISTS (SELECT 1 FROM stage3_question_seed s JOIN public.boiler_diagnostic_questions q
             ON q.evidence_group=s.evidence_group AND q.question_key<>s.question_key) THEN
    RAISE EXCEPTION 'Existing question duplicates a Stage 3 evidence group';
  END IF;
END $$;
INSERT INTO public.boiler_diagnostic_questions
  (question_key,question_text,answer_type,answer_options,evidence_group,
   customer_observable,is_safety_question,priority,is_active)
SELECT s.question_key,s.question_text,'single_choice',s.answer_options,s.evidence_group,
  true,s.is_safety_question,s.priority,true
FROM stage3_question_seed s
WHERE NOT EXISTS (SELECT 1 FROM public.boiler_diagnostic_questions q WHERE q.question_key=s.question_key);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.boiler_diagnostic_questions q JOIN stage3_question_seed s USING(question_key)) <> {len(QUESTIONS)} THEN
    RAISE EXCEPTION 'Stage 3 questions missing after seed';
  END IF;
END $$;
COMMIT;
"""
    (MIGRATIONS / "20260927000028_seed_boiler_question_catalog.sql").write_text(content, encoding="utf-8")


def write_effects(effects) -> None:
    values = ",\n".join("  (" + ", ".join(sql(v) for v in
        (item.key, item.name, item.code, question, answer, effect, basis, item.url)) + ")"
        for item, question, answer, effect, basis in effects)
    content = f"""-- Conservative observable effects. Missing rows mean neutral; unknown is always neutral.
BEGIN;
CREATE TEMP TABLE stage3_effect_seed (
  candidate_key text NOT NULL, candidate_name text NOT NULL, error_code text NOT NULL,
  question_key text NOT NULL, answer_key text NOT NULL, effect text NOT NULL,
  basis_phrase text NOT NULL, source_url text NOT NULL,
  PRIMARY KEY(candidate_key,question_key,answer_key),
  CHECK (answer_key IN ('yes','no')),
  CHECK (effect IN ('support','weaken','eliminate','neutral')),
  CHECK (length(trim(basis_phrase))>0)
) ON COMMIT DROP;
INSERT INTO stage3_effect_seed VALUES
{values};
DO $$ DECLARE v_bad bigint; BEGIN
  IF (SELECT count(*) FROM stage3_effect_seed) <> {len(effects)} THEN
    RAISE EXCEPTION 'Stage 3 effect row count differs';
  END IF;
  SELECT count(*) INTO v_bad FROM stage3_effect_seed s
  LEFT JOIN public.boiler_fault_candidates c ON c.candidate_key=s.candidate_key
  LEFT JOIN public.official_error_codes_raw r ON r.id=c.official_error_record_id
  LEFT JOIN public.boiler_diagnostic_questions q ON q.question_key=s.question_key
  WHERE c.id IS NULL OR q.id IS NULL OR c.verification_status<>'verified' OR c.is_active<>true
    OR c.candidate_name<>s.candidate_name OR c.error_code<>s.error_code
    OR c.evidence_url<>s.source_url OR length(trim(c.evidence_note))=0
    OR r.id IS NULL OR position(lower(s.basis_phrase) in lower(coalesce(r.official_description,'') || ' | ' || coalesce(r.official_action,'')))=0
    OR q.is_safety_question=true OR q.is_active<>true OR q.customer_observable<>true
    OR q.answer_options IS NULL OR NOT (q.answer_options ? s.answer_key)
    OR length(trim(q.question_text))=0 OR length(trim(q.evidence_group))=0;
  IF v_bad<>0 THEN RAISE EXCEPTION 'Stage 3 effect integrity failures: %',v_bad; END IF;
  IF EXISTS (SELECT 1 FROM stage3_effect_seed s
    JOIN public.boiler_question_effects e ON e.candidate_id=(SELECT id FROM public.boiler_fault_candidates WHERE candidate_key=s.candidate_key)
    JOIN public.boiler_diagnostic_questions q ON q.id=e.question_id AND q.question_key=s.question_key
    WHERE e.answer_key=s.answer_key AND (e.effect<>s.effect OR e.source_url<>s.source_url)) THEN
    RAISE EXCEPTION 'Existing Stage 3 effect conflicts with seed';
  END IF;
END $$;
INSERT INTO public.boiler_question_effects
  (question_id,candidate_id,answer_key,effect,evidence_note,source_url)
SELECT q.id,c.id,s.answer_key,s.effect,
  'Adayın kaynak ifadesi: "' || s.basis_phrase || '". Müşteri gözlemi, bu aday için göreli ve kesin olmayan kanıttır.',
  s.source_url
FROM stage3_effect_seed s
JOIN public.boiler_fault_candidates c ON c.candidate_key=s.candidate_key
JOIN public.boiler_diagnostic_questions q ON q.question_key=s.question_key
WHERE NOT EXISTS (SELECT 1 FROM public.boiler_question_effects e
                  WHERE e.question_id=q.id AND e.candidate_id=c.id AND e.answer_key=s.answer_key);
DO $$ BEGIN
  IF (SELECT count(*) FROM stage3_effect_seed s
      JOIN public.boiler_fault_candidates c ON c.candidate_key=s.candidate_key
      JOIN public.boiler_diagnostic_questions q ON q.question_key=s.question_key
      JOIN public.boiler_question_effects e ON e.candidate_id=c.id AND e.question_id=q.id AND e.answer_key=s.answer_key
      WHERE e.effect=s.effect AND length(trim(e.evidence_note))>0) <> {len(effects)} THEN
    RAISE EXCEPTION 'Stage 3 effects missing after seed';
  END IF;
END $$;
COMMIT;
"""
    (MIGRATIONS / "20260927000029_seed_boiler_question_effects.sql").write_text(content, encoding="utf-8")


def report(items, pools, effects):
    covered = {item.key for item, _, _, _, _ in effects}
    covered_pools = {(item.brand, item.model, item.code) for item, _, _, _, _ in effects}
    by_brand = Counter(key[0] for key in covered_pools)
    counts = Counter(effect for _, _, _, effect, _ in effects)
    by_question = Counter(question for _, question, _, _, _ in effects)
    data = {
        "candidate_count": len(items), "candidate_pools": len(pools),
        "diagnostic_questions": sum(not q[3] for q in QUESTIONS),
        "safety_questions": sum(q[3] for q in QUESTIONS),
        "evidence_groups": len({q[2] for q in QUESTIONS}),
        "effect_count": len(effects), "effects": counts,
        "answer_keys": Counter(answer for _, _, answer, _, _ in effects),
        "candidate_coverage": len(covered), "pool_coverage": len(covered_pools),
        "uncovered_pools": len(pools) - len(covered_pools),
        "brand_pool_coverage": {brand: {"covered": by_brand[brand], "total": sum(key[0] == brand for key in pools)}
                                for brand in sorted({key[0] for key in pools})},
        "effect_density": by_question,
        "duplicates": {"question_key": len(QUESTIONS)-len({q[0] for q in QUESTIONS}),
                       "semantic_group": len(QUESTIONS)-len({q[2] for q in QUESTIONS}),
                       "effect": len(effects)-len({(i.key,q,a) for i,q,a,_,_ in effects})},
        "invalid": {"empty_question_text": sum(not q[1].strip() for q in QUESTIONS),
                    "empty_evidence_group": sum(not q[2].strip() for q in QUESTIONS),
                    "empty_answer_key": sum(not a for _,_,a,_,_ in effects),
                    "invalid_effect": sum(e not in {"support","weaken","neutral","eliminate"} for _,_,_,e,_ in effects),
                    "orphan_candidate": 0, "orphan_question": 0},
    }
    spots = [("Vaillant", "ecoTEC intro VUW 18/24 AS/1-1", "F.28"),
             ("Bosch", "Condens 2500 W", "C4"),
             ("DemirDöküm", "Atron Condense", "F03"),
             ("DemirDöküm", "Atromix", "F.76"),
             ("Viessmann", "Vitodens 222-F B2TE", "F.683")]
    data["spot_checks"] = []
    for brand, model, code in spots:
        matches = [i for i in items if i.brand == brand and (i.model == model or i.model.startswith(model+" ")) and i.code == code]
        data["spot_checks"].append({"brand":brand,"model":model,"code":code,
            "candidates": sorted({i.name for i in matches}),
            "candidate_details": [{"official_model":i.model,"candidate_key":i.key,"name":i.name,
                                   "fault_class":i.fault_class,"official_description":i.description,
                                   "official_action":i.action,"source_url":i.url}
                                  for i in matches],
            "effects": [{"candidate":i.name,"question":q,"answer":a,"effect":e,"source_phrase":basis}
                        for i,q,a,e,basis in effects if i.key in {j.key for j in matches}]})
    output = ROOT / "test-results/stage3-question-seed-report.json"
    output.parent.mkdir(exist_ok=True)
    output.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding="utf-8")
    return data


def main():
    items = load_items()
    pools, effects = build_effects(items)
    write_catalog()
    write_effects(effects)
    data = report(items,pools,effects)
    print(json.dumps({k:v for k,v in data.items() if k != "spot_checks"},ensure_ascii=False,indent=2))


if __name__ == "__main__":
    main()
