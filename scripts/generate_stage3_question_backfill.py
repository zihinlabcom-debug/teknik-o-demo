"""Additive, offline process-inference coverage over immutable applied seeds.

Candidate provenance and customer-observation inference are separate. No research,
DB connection, candidate generation or probability-engine changes take place here.
"""
from __future__ import annotations

import hashlib
import json
import random
import re
import sqlite3
import sys
import unicodedata
from collections import Counter, defaultdict
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import generate_stage3_questions as legacy

ROOT, MIGRATIONS = legacy.ROOT, legacy.MIGRATIONS
OUTPUT = MIGRATIONS / "20260927000031_backfill_boiler_questions_and_effects.sql"
FROZEN_HASHES = {
    "20260927000028_seed_boiler_question_catalog.sql": "cb45d722a8911b4869e25a09678256b7d9fb4c8b8cb7827de4b14384d0b8a1cd",
    "20260927000029_seed_boiler_question_effects.sql": "2dc214d23c544a1171b29c2166694833410585b3f25138cabd5cf5cd4c7f643e",
    "20260927000030_backfill_boiler_candidate_coverage.sql": "f3beec64e757c69bc9804efe8272aab956b2f9979b19ca8de76851951f1f55d1",
}


def values_from(path: Path, table: str):
    text = path.read_text(encoding="utf-8")
    match = re.search(r"INSERT INTO " + table + r" VALUES\n(.*?);\n", text, re.S)
    if not match:
        raise ValueError(f"Missing frozen seed values: {path.name}")
    with sqlite3.connect(":memory:") as db:
        return list(db.execute("SELECT * FROM (VALUES " + match[1].replace("::jsonb", "") + ")"))


BASELINE_QUESTIONS = [tuple(row[:5]) + (json.loads(row[5]),) for row in values_from(
    MIGRATIONS / "20260927000028_seed_boiler_question_catalog.sql", "stage3_question_seed")]
NEW_QUESTIONS = [
    ("fault_timing_after_start", "Hata ortaya çıkmadan önce cihazın çalışma durumu hangisine uyuyor: başlar başlamaz, bir süre çalıştıktan sonra, yoksa aralıklı?",
     "fault_timing_after_start", False, 78, ["immediate", "after_some_time", "intermittent", "unknown"]),
    ("display_temperature_rise", "Hata öncesinde ekrandaki sıcaklığın normalden çok hızlı yükseldiğini gözlüyor musunuz?",
     "display_temperature_rise", False, 76, ["yes", "no", "unknown"]),
    ("ignition_attempt_sequence", "Cihazın ısı vermeye çalışırkenki davranışı hangisine uyuyor: tık sesleri var ama ısı yok, sessizken hemen hata, yoksa kısa süre ısı verip kesilme?",
     "ignition_attempt_sequence", False, 75, ["clicks_no_heat", "silent_immediate", "brief_heat_then_fault", "unknown"]),
    ("heating_dhw_scope", "Sorun hangi kullanımda görülüyor: yalnız kalorifer, yalnız sıcak su, yoksa her ikisinde?",
     "heating_dhw_scope", False, 74, ["heating_only", "dhw_only", "both", "unknown"]),
]


@dataclass(frozen=True)
class SeedItem(legacy.Item):
    source_basis: str
    level: str = "component"
    scope: str = "exact"


@dataclass(frozen=True)
class Effect:
    item: SeedItem
    question: str
    answer: str
    effect: str
    inference: str

    @property
    def note(self):
        return (f'Candidate source basis: "{self.item.source_basis}". '
                f'Process inference: {self.inference} '
                'Bu göreli süreç çıkarımıdır; kesin teşhis veya kaynakta birebir verilen belirti-parça ilişkisi değildir.')


def normalized(text):
    return "".join(c for c in unicodedata.normalize("NFKD", text.lower().replace("ı", "i"))
                   if not unicodedata.combining(c))


def has(text, pattern):
    return bool(re.search(pattern, normalized(text)))


@lru_cache(maxsize=1)
def load_items():
    # Legacy loader reads immutable 00014–26; its old count is only a baseline
    # integrity check, never an expectation for the expanded inventory.
    old = legacy.load_items()
    candidates = {c.key: c for batch in legacy.source.read_applied_seeds().values() for c in batch}
    items = {}
    for i in old:
        c = candidates.get(i.key)
        basis = (c.description_phrase or c.action_phrase) if c else (i.action or i.description)
        items[i.key] = SeedItem(**vars(i), source_basis=basis,
                               scope="exact" if c else "family")
    families = legacy.source.read_families()
    for row in values_from(MIGRATIONS / "20260927000030_backfill_boiler_candidate_coverage.sql", "stage3_candidate_seed"):
        brand, model, code, key, name, fault_class, description, action, url, _, d, a, _, _ = row
        value = SeedItem(brand, model, families[(brand, model)], code, key, name, fault_class,
                         description, action, url, d or a, "group" if name.endswith(" grubu") else "component")
        if key in items:
            previous = items[key]
            if any(getattr(previous, f) != getattr(value, f) for f in legacy.Item.__dataclass_fields__):
                raise ValueError(f"Recovery row conflicts with applied candidate {key}")
        else:
            items[key] = value
    result = sorted(items.values(), key=lambda i: i.key)
    for i in result:
        if not i.source_basis or i.source_basis not in i.description + " | " + i.action or not i.url:
            raise ValueError(f"Missing literal candidate source basis: {i.key}")
    return result


def load_baseline_effects(items):
    by_key = {i.key: i for i in items}
    rows = values_from(MIGRATIONS / "20260927000029_seed_boiler_question_effects.sql", "stage3_effect_seed")
    effects = []
    for key, name, code, question, answer, effect, basis, url in rows:
        i = by_key[key]
        if (i.name, i.code, i.url) != (name, code, url) or basis.lower() not in (i.description + " | " + i.action).lower():
            raise ValueError(f"Frozen effect no longer matches candidate {key}")
        effects.append(Effect(i, question, answer, effect, "Frozen 00029 baseline; no rewrite."))
    return effects


def pools_for(items):
    pools = defaultdict(list)
    for i in items:
        pools[(i.brand, i.model, i.code)].append(i)
    return pools


def semantic(i, pattern):
    # Name identifies the existing fault point; raw context identifies workflow.
    # Fault class by itself is deliberately never used.
    return has(i.name, pattern)


def thermal_context(pool):
    if any(has(i.description, r"solar|kolektor") for i in pool):
        return False  # Solar heat is independent of a boiler startup sequence.
    return any(has(i.description + " | " + i.action,
                   r"termik|asiri (?:sicak|isin)|sicaklik sinir|limit termostat|sicaklik fark|"
                   r"sicaklik.{0,25}(?:yuksek|hizli|artis)|isi transfer|dolasim|sirkulasyon|kuru calis") for i in pool)


def heat_point(i):
    return semantic(i, r"termik|sicaklik sinir|limit termostat|termostat/sicaklik|"
                       r"isi transfer|esanjor/isi blogu|pompa/dolasim|sirkulasyon pompasi|"
                       r"tesisat filtresi|radyator/tesisat vanasi|tesisatta hava|isitma sisteminde hava")


def initiation_control(i):
    return semantic(i, r"elektronik (?:kart|kontrol)|ana elektronik|elektrik besleme|"
                       r"elektrik sigortasi")


def low_water_context(i):
    return has(i.description + " | " + i.action,
               r"(?:dusuk|yetersiz).{0,15}(?:su basinc|tesisat basinc|sistem basinc|su miktar)|"
               r"(?:su basinc|tesisat basinc|sistem basinc|su miktar).{0,30}(?:dusuk|yetersiz|eksik|azligi|artir|yukselt)|"
               r"su eksikligi|susuz|eksik su")


def wiring(i):
    return semantic(i, r"kablo|soket|baglanti") and not semantic(i, r"haberlesme|bus|veri yolu")


def ignition_context(pool):
    if any(has(i.description, r"hatali alev|beklenmedik alev|olmayan alev|atesleme.{0,15}oncesinde alev") for i in pool):
        return False  # Unexpected flame indication is not a failed start.
    return any(has(i.description, r"atesleme|alev (?:yok|olus|kayb|son)|yanma sirasinda alev") for i in pool)


def ignition_point(i):
    return semantic(i, r"atesleme|elektro[td]|alev olusumu")


def gas_flow(i):
    return semantic(i, r"gaz (?:valfi|armaturu|besleme|giris|hatti|treni)|selenoid gaz")


def display_heat_context(i):
    # The normal boiler display is not a flue-gas, tank or remote-zone reading.
    # Lack of a temperature rise is also not positive overheating evidence.
    return not has(i.description, r"atik gaz|baca (?:gazi|gazinin|emniyet|termo|limit)|boyler|bolge\s*\d|zon\s*\d|"
                   r"sicaklik.{0,45}(?:algilanmadi|olusmadi|artmadi|yukselmedi)")


def candidate_effects(pool):
    effects = []
    thermal = thermal_context(pool)
    heat_members = [i for i in pool if heat_point(i)] if thermal else []
    ignition = ignition_context(pool)
    for i in pool:
        def add(q, answer, effect, reason):
            qualifier = " Grup düzeyinde kalır; alt parça teşhisi çıkarılmaz." if i.level == "group" else ""
            effects.append(Effect(i, q, answer, effect, reason + qualifier))

        # Expand the existing reusable observations, preserving every old row.
        if semantic(i, r"gaz beslemesi|gaz giri[sş]i|gaz hatti|gaz besleme/yolu"):
            add("gas_other_appliance", "no", "support", "Başka gazlı cihazın da çalışmaması ortak ev gaz beslemesini göreli olarak güçlendirir; bina beslemesi ürün varsayımı kullanılır.")
            add("gas_other_appliance", "yes", "weaken", "Ocak normal çalışıyorsa eve gaz geldiği kabul edilir; ortak gaz beslemesi göreli zayıflar, kombiye özgü basınç/akış sorunu dışlanmaz.")
        if semantic(i, r"tesisat su basinci/eksik su|sistem basinci / su miktari|su basincinin cok dusuk|su basinci/hidrolik") and low_water_context(i):
            add("display_low_water_pressure", "yes", "support", "Kullanıcı göstergesindeki düşük su basıncı, kaynakta düşük su/basınçla ilişkilendirilen adayı göreli güçlendirir; gösterge gerçek basıncın ölçümle doğrulanması değildir.")
            add("display_low_water_pressure", "no", "weaken", "Gösterge düşük değilse düşük su/basınç adayı göreli zayıflar; gösterge/sensör yanılabileceği için dışlanmaz.")
        if semantic(i, r"su kacagi|esanjor sizintisi"):
            add("visible_water_leak", "yes", "support", "Dışarıdan gözlenen su kaçağı kaynakta tanımlı sızıntı noktasını göreli güçlendirir; kaçağın yeri kesinleşmez.")
        if semantic(i, r"^fan (?:sorunu|arizasi)$|fan/yanma havasi grubu"):
            add("abnormal_fan_noise", "yes", "support", "Çalışma girişimindeki olağandışı sürtme/uğultu, mevcut fan/mekanik hava hareketi adayını göreli güçlendirir; diğer ses kaynakları ve sessiz fan arızası dışlanmaz.")

        if heat_members:
            if i in heat_members:
                if not ignition:
                    add("fault_timing_after_start", "after_some_time", "support", "Cihazın bir süre çalışıp ısındıktan sonra hata vermesi, bu hata kaydındaki ısıl koruma/ısı transferi/dolaşım noktasını göreli güçlendirir; baştan arızalı koruma da mümkündür.")
                if display_heat_context(i):
                    add("display_temperature_rise", "yes", "support", "Hata öncesi kullanıcı ekranındaki olağandışı hızlı sıcaklık artışı, bu ısıl hata bağlamında ısı uzaklaştırma/koruma adayını göreli güçlendirir; gösterge yanılabilir ve parça arızası kanıtlanmaz.")
            elif not ignition and (wiring(i) or initiation_control(i)):
                add("fault_timing_after_start", "after_some_time", "weaken", "Önce çalışma oluşup hata sonradan geliyorsa sürekli başlangıç bağlantısı/kontrol kesintisi açıklaması göreli zayıflar; ısıya bağlı temassızlık veya elektronik arıza hâlâ mümkündür.")
                add("fault_timing_after_start", "immediate", "support", "Hiç çalışma dönemi olmadan hemen hata, aynı havuzdaki başlangıç bağlantısı/kontrol sorununu göreli güçlendirir; önceden kilitlenmiş ısıl koruma dışlanmaz.")

        if ignition:
            if ignition_point(i) or gas_flow(i):
                add("ignition_attempt_sequence", "clicks_no_heat", "support", "Tık sesleriyle girişim var ama yeni ısı oluşmuyorsa çalışma ateşleme aşamasına ulaşmış olabilir; mevcut gaz/ateşleme noktası göreli güçlenir, kıvılcım veya gaz akışı doğrulanmış sayılmaz.")
            if initiation_control(i):
                add("ignition_attempt_sequence", "clicks_no_heat", "weaken", "Duyulabilir girişim, başlangıç komutunun tamamen oluşmaması açıklamasını göreli zayıflatır; kontrolün gaz açma/alev algılama işlevleri yine arızalı olabilir.")
                add("ignition_attempt_sequence", "silent_immediate", "support", "Isı talebinde sessizlik ve hemen hata, çalışma sırasının başlayamamasıyla ilişkili kontrol/besleme noktasını göreli güçlendirir; sessiz çalışma veya başka kilitleme mümkün olduğundan kesin sonuç değildir.")
            if ignition_point(i):
                add("ignition_attempt_sequence", "silent_immediate", "support", "Isı talebinde duyulabilir ateşleme girişimi olmadan hemen hata, mevcut ateşleme başlangıç noktasını göreli güçlendirir; yalnız sessizlik kıvılcım yokluğunu kanıtlamaz.")
            if gas_flow(i):
                add("ignition_attempt_sequence", "silent_immediate", "weaken", "Başlangıç sekansı gözlenmiyorsa gazın alev oluşturamaması açıklaması başlatma sorunlarına göre zayıflar; gaz yolu arızası dışlanmaz.")
            if semantic(i, r"iyonizasyon|alev algilama|alev sinyal|yanma geri bildirim"):
                add("ignition_attempt_sequence", "brief_heat_then_fault", "support", "Kısa yeni ısı üretiminden sonra kesilme, ateşleme sonrası alev sürekliliği/geri bildirim noktasını göreli güçlendirir; gaz sürekliliği gibi diğer nedenler dışlanmaz.")
            elif semantic(i, r"atesleme trafosu|atesleme elemani|atesleme sistemi|atesleme elektrodu"):
                add("ignition_attempt_sequence", "brief_heat_then_fault", "weaken", "Kısa yeni ısı üretimi başlangıç ateşlemesinin tamamen başarısız olması açıklamasını göreli zayıflatır; aralıklı ateşleme arızası dışlanmaz.")

        # Flow/return sensors are often on the shared primary circuit: never
        # label them heating-only merely because of their name/fault class.
        if semantic(i, r"kullanim suyu|sicak su cikis|soguk su sensor|boyler sicaklik") and has(i.description + i.action, r"kullanim suyu|sicak su|boyler|soguk su"):
            add("heating_dhw_scope", "dhw_only", "support", "Kalorifer normal iken yalnız kullanım suyunda sorun görülmesi, kaynakta kullanım suyu/boyler devresine bağlı noktayı göreli güçlendirir; ortak kontrol arızası dışlanmaz.")
            add("heating_dhw_scope", "heating_only", "weaken", "Kullanım suyu normal iken yalnız kaloriferde sorun görülmesi, kullanım suyu/boyler noktasını göreli zayıflatır; kilitleme ve ortak kontrol ihtimali nedeniyle dışlanmaz.")
        if semantic(i, r"isitma devresi grubu|radyator/tesisat vanasi") and has(i.description + i.action, r"radyator|petek|isitma (?:devresi|tesisati|vanasi)") and not has(i.description, r"boyler|kullanim suyu|sicak su|solar|kolektor"):
            add("heating_dhw_scope", "heating_only", "support", "Kullanım suyu normal iken yalnız kaloriferde sorun, kaynakta açıkça ısıtma/radyatör yoluna bağlı noktayı göreli güçlendirir; ortak primer devre de etkilenebilir.")
            add("heating_dhw_scope", "dhw_only", "weaken", "Kalorifer normal iken yalnız kullanım suyunda sorun, radyatör/ısıtma yolu noktasını göreli zayıflatır; ortak primer devre etkisi dışlanmaz.")
    return effects


def is_discriminative(pool, effects, question):
    if len(pool) < 2:
        return False
    lookup = {(e.item.key, e.answer): e.effect for e in effects if e.question == question}
    return any(len({lookup.get((i.key, answer), "neutral") for i in pool}) > 1
               for answer in {a for _, a in lookup})


def build_new_effects(items, baseline):
    frozen = {(e.item.key, e.question, e.answer): e for e in baseline}
    by_candidate = defaultdict(list)
    for e in baseline:
        by_candidate[e.item.key].append(e)
    output = []
    for pool in pools_for(items).values():
        proposed = candidate_effects(pool)
        seen = set()
        for e in proposed:
            identity = (e.item.key, e.question, e.answer)
            if identity in seen:
                raise ValueError(f"Ambiguous process rule {identity}")
            seen.add(identity)
        existing = [e for i in pool for e in by_candidate[i.key]]
        combined = { (e.item.key, e.question, e.answer): e for e in proposed }
        combined.update({(e.item.key, e.question, e.answer): e for e in existing})
        useful = {e.question for e in proposed if len(pool) == 1 or is_discriminative(pool, combined.values(), e.question)}
        output.extend(e for e in proposed if e.question in useful and (e.item.key, e.question, e.answer) not in frozen)
    return sorted(output, key=lambda e: (e.item.key, e.question, e.answer))


def coverage(items, effects):
    pools = pools_for(items)
    by_pool = defaultdict(list)
    covered_candidates = {e.item.key for e in effects if e.effect in {"support", "weaken"}}
    for e in effects:
        by_pool[(e.item.brand, e.item.model, e.item.code)].append(e)
    discriminative = {key for key, pool in pools.items() if any(
        is_discriminative(pool, by_pool[key], q) for q in {e.question for e in by_pool[key]})}
    singleton = {key for key, pool in pools.items() if len(pool) == 1 and by_pool[key]}
    observable = discriminative | singleton
    return {
        "candidate_count": len(items), "pool_count": len(pools),
        "discriminative_pools": len(discriminative), "supported_singleton_pools": len(singleton),
        "observation_supported_pools": len(observable), "questionless_pools": len(pools) - len(observable),
        "no_discriminative_question_pools": len(pools) - len(discriminative),
        "candidate_coverage": {level: {"covered": sum(i.key in covered_candidates for i in items if i.level == level),
                                       "total": sum(i.level == level for i in items)} for level in ("component", "group")},
        "brands": {brand: {"total": sum(k[0] == brand for k in pools),
                           "discriminative": sum(k[0] == brand for k in discriminative),
                           "singleton_supported": sum(k[0] == brand for k in singleton),
                           "questionless": sum(k[0] == brand and k not in observable for k in pools)}
                   for brand in sorted({i.brand for i in items})},
        "residual_reasons": dict(Counter("singleton_without_safe_source_related_observation" if len(pool) == 1
                                         else "no_differential_safe_process_observation" for k, pool in pools.items() if k not in observable)),
    }


@lru_cache(maxsize=1)
def raw_inventory():
    return legacy.source.read_raw(), legacy.source.read_families()


def family_coverage(items, effects):
    # Compare ALL raw code-bearing variants, including rows without candidates.
    raw, families = raw_inventory()
    by_family = defaultdict(set)
    norm_code = lambda code: re.sub(r"[.\s-]", "", code.upper())
    for r in raw:
        by_family[(r.brand, families[(r.brand, r.model)], norm_code(r.code))].add(r.model)
    index = defaultdict(list)
    for i in items:
        index[(i.brand, i.family, norm_code(i.code), i.model)].append(i)
    effect_index = {(e.item.key, e.question, e.answer): e.effect for e in effects}
    native = {(i.brand, i.family, norm_code(i.code)) for i in items if i.scope == "family"}
    supported = discriminative = compatible = conflicts = consensus = 0
    questions = BASELINE_QUESTIONS + NEW_QUESTIONS
    for (brand, family, code), models in by_family.items():
        if len(models) < 2 or (brand, family, code) in native:
            continue
        variants = [index[(brand, family, code, model)] for model in sorted(models)]
        signatures = [{(normalized(i.name), i.fault_class) for i in pool} for pool in variants]
        if not signatures[0] or any(s != signatures[0] for s in signatures):
            continue
        consensus += 1
        logical = {sig: [i for pool in variants for i in pool if (normalized(i.name), i.fault_class) == sig] for sig in signatures[0]}
        has_observation = separates = False
        for q, _, _, safety, _, options in questions:
            if safety:
                continue
            for answer in options:
                if answer == "unknown":
                    continue
                mapped = []
                for members in logical.values():
                    values = [effect_index.get((i.key, q, answer), "neutral") for i in members]
                    if len(set(values)) == 1 and values[0] != "neutral":
                        compatible += 1
                        has_observation = True
                        mapped.append(values[0])
                    else:
                        if len(set(values)) > 1:
                            conflicts += 1
                        mapped.append("neutral")
                separates |= len(set(mapped)) > 1
        supported += has_observation
        discriminative += separates
    return {"eligible_multi_variant_consensus_pools": consensus, "observation_supported": supported,
            "discriminative": discriminative, "compatible_logical_effects": compatible,
            "missing_or_conflicting_logical_effects_neutral": conflicts}


def render_migration(effects):
    quote = legacy.sql
    questions = ",\n".join("  (" + ", ".join([quote(q), quote(t), quote(g), str(p), quote(json.dumps(o, ensure_ascii=False)) + "::jsonb"]) + ")"
                             for q, t, g, _, p, o in NEW_QUESTIONS)
    effects = sorted(effects, key=lambda e: (e.item.key, e.question, e.answer))
    values = ",\n".join("  (" + ", ".join(quote(v) for v in (e.item.key, e.item.name, e.item.code,
                         e.question, e.answer, e.effect, e.item.source_basis, e.inference, e.note, e.item.url)) + ")" for e in effects)
    return f"""-- Additive Stage 3 customer observations; applied 00028/00029/00030 remain unchanged.
-- Candidate source basis is literal provenance. Process inference is NOT a manufacturer diagnosis.
-- Missing/unknown effects are neutral. No eliminate effects or candidate/pricing changes.
BEGIN;
CREATE TEMP TABLE stage3_question_backfill (
  question_key text PRIMARY KEY, question_text text NOT NULL, evidence_group text NOT NULL,
  priority integer NOT NULL, answer_options jsonb NOT NULL
) ON COMMIT DROP;
INSERT INTO stage3_question_backfill VALUES
{questions};
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM stage3_question_backfill s JOIN public.boiler_diagnostic_questions q USING(question_key)
    WHERE q.question_text IS DISTINCT FROM s.question_text OR q.evidence_group IS DISTINCT FROM s.evidence_group
      OR q.priority IS DISTINCT FROM s.priority OR q.answer_options IS DISTINCT FROM s.answer_options
      OR q.answer_type IS DISTINCT FROM 'single_choice' OR q.is_active IS DISTINCT FROM true
      OR q.customer_observable IS DISTINCT FROM true OR q.is_safety_question IS DISTINCT FROM false) THEN
    RAISE EXCEPTION 'Question backfill conflicts with existing catalog';
  END IF;
  IF EXISTS (SELECT 1 FROM stage3_question_backfill s JOIN public.boiler_diagnostic_questions q
    ON q.evidence_group=s.evidence_group AND q.question_key<>s.question_key) THEN
    RAISE EXCEPTION 'Question backfill duplicates a physical evidence group';
  END IF;
END $$;
INSERT INTO public.boiler_diagnostic_questions
  (question_key,question_text,answer_type,answer_options,evidence_group,customer_observable,is_safety_question,priority,is_active)
SELECT s.question_key,s.question_text,'single_choice',s.answer_options,s.evidence_group,true,false,s.priority,true
FROM stage3_question_backfill s
WHERE NOT EXISTS (SELECT 1 FROM public.boiler_diagnostic_questions q WHERE q.question_key=s.question_key);
CREATE TEMP TABLE stage3_effect_backfill (
  candidate_key text NOT NULL, candidate_name text NOT NULL, error_code text NOT NULL,
  question_key text NOT NULL, answer_key text NOT NULL, effect text NOT NULL,
  source_basis text NOT NULL, process_inference text NOT NULL, evidence_note text NOT NULL, source_url text NOT NULL,
  PRIMARY KEY(candidate_key,question_key,answer_key),
  CHECK (answer_key<>'unknown'), CHECK (effect IN ('support','weaken')),
  CHECK (length(trim(source_basis))>0 AND length(trim(process_inference))>0)
) ON COMMIT DROP;
INSERT INTO stage3_effect_backfill VALUES
{values};
DO $$ BEGIN
  IF (SELECT count(*) FROM stage3_effect_backfill)<>{len(effects)} THEN
    RAISE EXCEPTION 'Question effect backfill count differs';
  END IF;
  IF EXISTS (SELECT 1 FROM stage3_effect_backfill s
    LEFT JOIN public.boiler_fault_candidates c ON c.candidate_key=s.candidate_key
    LEFT JOIN public.official_error_codes_raw r ON r.id=c.official_error_record_id
    LEFT JOIN public.boiler_diagnostic_questions q ON q.question_key=s.question_key
    WHERE c.id IS NULL OR r.id IS NULL OR q.id IS NULL
      OR c.candidate_name IS DISTINCT FROM s.candidate_name OR c.error_code IS DISTINCT FROM s.error_code
      OR c.verification_status IS DISTINCT FROM 'verified' OR c.is_active IS DISTINCT FROM true
      OR c.evidence_url IS DISTINCT FROM s.source_url OR coalesce(length(trim(c.evidence_note)),0)=0
      OR position(s.source_basis in coalesce(r.official_description,'') || ' | ' || coalesce(r.official_action,''))=0
      OR q.is_safety_question IS DISTINCT FROM false OR q.is_active IS DISTINCT FROM true
      OR q.customer_observable IS DISTINCT FROM true OR NOT coalesce(q.answer_options ? s.answer_key,false)) THEN
    RAISE EXCEPTION 'Question effect backfill source/catalog integrity failure';
  END IF;
  IF EXISTS (SELECT 1 FROM stage3_effect_backfill s JOIN public.boiler_fault_candidates c ON c.candidate_key=s.candidate_key
    JOIN public.boiler_diagnostic_questions q ON q.question_key=s.question_key
    JOIN public.boiler_question_effects e ON e.candidate_id=c.id AND e.question_id=q.id AND e.answer_key=s.answer_key
    WHERE e.effect IS DISTINCT FROM s.effect OR e.source_url IS DISTINCT FROM s.source_url
      OR e.evidence_note IS DISTINCT FROM s.evidence_note) THEN
    RAISE EXCEPTION 'Question effect backfill conflicts with existing effect';
  END IF;
END $$;
INSERT INTO public.boiler_question_effects (question_id,candidate_id,answer_key,effect,evidence_note,source_url)
SELECT q.id,c.id,s.answer_key,s.effect,s.evidence_note,s.source_url FROM stage3_effect_backfill s
JOIN public.boiler_fault_candidates c ON c.candidate_key=s.candidate_key
JOIN public.boiler_diagnostic_questions q ON q.question_key=s.question_key
WHERE NOT EXISTS (SELECT 1 FROM public.boiler_question_effects e
  WHERE e.candidate_id=c.id AND e.question_id=q.id AND e.answer_key=s.answer_key);
DO $$ BEGIN
  IF (SELECT count(*) FROM stage3_effect_backfill s JOIN public.boiler_fault_candidates c ON c.candidate_key=s.candidate_key
    JOIN public.boiler_diagnostic_questions q ON q.question_key=s.question_key
    JOIN public.boiler_question_effects e ON e.candidate_id=c.id AND e.question_id=q.id AND e.answer_key=s.answer_key
    WHERE e.effect=s.effect AND e.source_url=s.source_url AND e.evidence_note=s.evidence_note)<>{len(effects)} THEN
    RAISE EXCEPTION 'Question effect backfill rows missing after insert';
  END IF;
END $$;
COMMIT;
"""


def runtime_fixture(items, effects):
    # Offline test data is extracted from the applied dataset, never hand-coded
    # into production lookups. Real DB ids are replaced by stable candidate keys.
    cases = json.loads((ROOT / "tests/fixtures/stage3-question-backfill-cases.json").read_text(encoding="utf-8"))
    identities = {(c["brand"], c["family"], c["code"]) for c in cases}
    selected = [i for i in items if (i.brand, i.family, i.code) in identities]
    keys = {i.key for i in selected}
    return {"provenance": "Applied 00014–00030, plus unapplied 00031; offline QA only",
            "candidates": [{"id": i.key, "candidate_name": i.name, "fault_class": i.fault_class,
                            "family_id": i.family, "official_model_id": None if i.scope == "family" else i.model,
                            "error_code": i.code, "verification_status": "verified", "is_active": True} for i in selected],
            "questions": [{"id": q, "question_key": q, "question_text": t, "evidence_group": g,
                           "is_safety_question": bool(s), "priority": p, "answer_options": o,
                           "customer_observable": True, "is_active": True} for q,t,g,s,p,o in BASELINE_QUESTIONS + NEW_QUESTIONS],
            "effects": [{"candidate_id": e.item.key, "question_id": e.question, "answer_key": e.answer,
                         "effect": e.effect} for e in effects if e.item.key in keys]}


def main():
    for filename, expected in FROZEN_HASHES.items():
        if hashlib.sha256((MIGRATIONS / filename).read_bytes()).hexdigest() != expected:
            raise ValueError(f"Applied migration changed: {filename}")
    items = load_items()
    baseline = load_baseline_effects(items)
    new = build_new_effects(items, baseline)
    OUTPUT.write_text(render_migration(new), encoding="utf-8", newline="\n")
    results = ROOT / "test-results"
    report = {"baseline_questions": len(BASELINE_QUESTIONS), "baseline_effects": len(baseline),
              "new_questions": len(NEW_QUESTIONS), "new_effects": len(new),
              "total_questions": len(BASELINE_QUESTIONS) + len(NEW_QUESTIONS), "total_effects": len(baseline) + len(new),
              "new_effect_distribution": {kind: sum(e.effect == kind for e in new) for kind in ("support", "weaken", "eliminate", "neutral")},
              "new_effects_by_question": dict(Counter(e.question for e in new)),
              "before": coverage(items, baseline), "after": coverage(items, baseline + new),
              "family_consensus_before": family_coverage(items, baseline),
              "family_consensus_after": family_coverage(items, baseline + new),
              "applied_hashes": FROZEN_HASHES,
              "limitations": ["Offline applied seed inventory; live active/rejected overrides are not queried.",
                              "Singleton support is not discrimination or calibrated confidence.",
                              "Pressure trend deferred to avoid doubling the existing gauge observation.",
                              "No runtime effect before 00031 is applied; no DB push performed."]}
    rng = random.Random(31)
    report["quality_samples"] = []
    for effect in ("support", "weaken", "eliminate"):
        rows = [e for e in new if e.effect == effect]
        for e in rng.sample(rows, min(20, len(rows))) if effect != "eliminate" else rows:
            report["quality_samples"].append({"brand": e.item.brand, "model": e.item.model, "code": e.item.code,
                "candidate": e.item.name, "candidate_level": e.item.level, "question": e.question,
                "answer": e.answer, "effect": e.effect, "source_basis": e.item.source_basis,
                "source_url": e.item.url, "official_description": e.item.description,
                "official_action": e.item.action, "inference": e.inference})
    (results / "stage3-question-backfill-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    fixture_path = ROOT / "tests/fixtures/stage3-question-backfill.json"
    fixture_path.parent.mkdir(exist_ok=True)
    fixture_path.write_text(json.dumps(runtime_fixture(items, baseline + new), ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({k:v for k,v in report.items() if k not in {"quality_samples", "applied_hashes"}}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
