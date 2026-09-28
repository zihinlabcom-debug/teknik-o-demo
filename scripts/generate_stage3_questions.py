"""Prepare conservative, offline Stage 3 question/effect seeds.

Reads the existing candidate generator as data; never rewrites candidate migrations.
Only explicit customer-observable links below can yield effects. A fault class by
itself never does. Applied 00028/00029 are frozen; use the additive backfill script.
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
    # Question/effect seed 00028/00029 was designed against the already applied
    # candidate set. A later coverage backfill must not silently change it.
    batches, families = source.read_applied_seeds(), source.read_families()
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
    raise RuntimeError("00028 is an applied migration; use generate_stage3_question_backfill.py")


def write_effects(effects) -> None:
    raise RuntimeError("00029 is an applied migration; use generate_stage3_question_backfill.py")


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
    raise SystemExit("00028/00029 are applied and cannot be regenerated. Run generate_stage3_question_backfill.py instead.")


if __name__ == "__main__":
    main()
