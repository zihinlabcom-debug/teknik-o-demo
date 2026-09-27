"""Regenerate the unapplied Stage 3 candidate seeds from their raw evidence.

This deliberately uses only the imported description/action fields. A candidate
names a manufacturer-linked fault point, not a confirmed broken part. The
evidence phrases remain in the seed so SQL can verify them against the raw row.
"""

from __future__ import annotations

import hashlib
import re
import sqlite3
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlsplit

from openpyxl import load_workbook


ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT / "supabase" / "migrations"
VAİLLANT_WORKBOOK = ROOT / "data/imports/kombi/Vaillant_Kombi_Resmi_Ariza_Verileri_FINAL.xlsx"
MIGRATION_BRANDS = {
    16: ("Vaillant", "vaillant_remaining"),
    17: ("Bosch", "bosch"),
    18: ("Buderus", "buderus"),
    19: ("DemirDöküm", "demirdokum"),
    20: ("Ariston", "ariston"),
    21: ("Baymak", "baymak"),
    22: ("E.C.A.", "eca"),
    23: ("Immergas", "immergas_alpha"),
    24: ("Lambert", "lambert"),
    25: ("Viessmann", "viessmann"),
    26: ("Warmhaus", "warmhaus"),
}
OFFICIAL_HOSTS = {
    "vaillant.com.tr", "bosch-homecomfort.com", "boschhc-documents.com",
    "buderus.com", "demirdokum.com.tr", "ariston.com", "baymak.com.tr",
    "eca.com.tr", "ecateknikurunler.com.tr", "ecaboilers.co.uk",
    "immergas.com.tr", "immergas.com", "immergas.com.gr", "viessmann.com.tr",
    "viessmann.ca", "viessmann-us.com", "viessmann.co.uk", "warmhaus.com",
}
TRUSTED_HOSTS = {
    "manualslib.com", "manualslib.de", "manualslib.es", "manualzz.com",
    "schede-tecniche.it", "scribd.com", "manymanuals.com", "c-o-k.ru",
    "community.viessmann.de", "buras.com.tr", "kombikarttamiri.com",
    "ecakombiservis.net",
}


@dataclass(frozen=True)
class Rule:
    key: str
    pattern: str
    name: str
    fault_class: str


# Component vocabulary is independent of brand, model, and error code. Longer,
# more specific matches take priority over a generic word in the same span.
RULES = [
    Rule("pressure_differential", r"diferansiyel\s+basın(?:ç|c[ıi])\s+sensör\w*", "Diferansiyel basınç sensörü sorunu", "sensor"),
    Rule("pressure_air", r"(?:hava\s+basın(?:ç|c[ıi])\s+(?:anahtar|şalter|sensör)\w*|presostat\w*)", "Hava basınç şalteri/sensörü sorunu", "sensor"),
    Rule("pressure_gas_sensor", r"gaz\s+(?:giriş\s+)?basın(?:ç|c[ıi])\s+sensör\w*", "Gaz basınç sensörü sorunu", "sensor"),
    Rule("pressure_water_sensor", r"(?:su|tesisat|sistem)\s+basın(?:ç|c[ıi])\s+sensör\w*|basın(?:ç|c[ıi])\s+sensör\w*", "Su basınç sensörü sorunu", "sensor"),
    Rule("sensor_flue", r"(?:baca(?:\s+gazı)?|atık\s+gaz)\s+(?:sıcaklık\s+)?sensör\w*", "Baca gazı sensörü sorunu", "sensor"),
    Rule("sensor_collector", r"kolektör\s+(?:sıcaklık\s+)?sensör\w*", "Kolektör sıcaklık sensörü sorunu", "sensor"),
    Rule("sensor_outside", r"(?:dış\s+(?:hava\s+)?sıcaklık|harici\s+sıcaklık)\s+sensör\w*", "Dış sıcaklık sensörü sorunu", "sensor"),
    Rule("sensor_dhw", r"(?:kullanım\s+(?:suyu|sıcak\s+suyu)|sıcak\s+su|çıkış\s+sıcaklık)\s+(?:sıcaklık\s+)?(?:ntc|sensör)\w*", "Kullanım suyu sıcaklık sensörü sorunu", "sensor"),
    Rule("sensor_supply", r"(?:gidiş|besleme)\s+(?:(?:devresi|suyu|hattı|bağlantısı)\s+)?(?:sıcaklık\s+)?(?:ntc|sensör)\w*", "Gidiş sıcaklık sensörü sorunu", "sensor"),
    Rule("sensor_return", r"dönüş\s+(?:(?:devresi|suyu|hattı|bağlantısı)\s+)?(?:sıcaklık\s+)?(?:ntc|sensör)\w*", "Dönüş sıcaklık sensörü sorunu", "sensor"),
    Rule("sensor_tank", r"(?:boyler|depo)\s+(?:sıcaklık\s+)?(?:ntc|sensör)\w*", "Boyler sıcaklık sensörü sorunu", "sensor"),
    Rule("sensor_flame", r"(?:alev|iyonizasyon)\s+(?:denetleme\s+)?sensör\w*", "Alev/iyonizasyon sensörü sorunu", "sensor"),
    Rule("air_mass_flow", r"hava\s+kütlesi\s+(?:debi|akış)\s+sensör\w*", "Hava kütlesi debi sensörü sorunu", "sensor"),
    Rule("flow_meter", r"(?:akış\s+(?:metre|sensör)|debi\s+(?:ölçer|sensör))\w*", "Akış/debi sensörü sorunu", "sensor"),
    Rule("sensor_temperature", r"(?:sıcaklık\s+sensör\w*|\bNTC\b)", "Sıcaklık sensörü sorunu", "sensor"),
    Rule("sensor_general", r"\bsensör\w*", "Sensör sorunu", "sensor"),
    Rule("thermostat", r"(?:emniyet|limit|güvenlik|oda|atık\s+gaz)?\s*termostat\w*|sıcaklık\s+sınırlayıcı\w*|\bSTB\b", "Termostat/sıcaklık sınırlayıcısı sorunu", "sensor"),
    Rule("voltage", r"(?:elektrik|şebeke|besleme|giriş)\s+(?:besleme\w*|gerilim\w*|voltaj\w*)|\bvoltaj\w*|\bgerilim\w*|\b24\s*V\b", "Elektrik besleme/gerilim sorunu", "electrical"),
    Rule("earthing", r"topraklama\w*", "Topraklama sorunu", "electrical"),
    Rule("coding", r"(?:kodlama\s+(?:fiş|kart)\w*|EEPROM\w*)", "Kodlama/EEPROM sorunu", "electronic"),
    Rule("pcb", r"(?:elektronik|ana|baskı\s+devre|kontrol|devre)\s+kart\w*|\bPCB\b|kontrol\s+ünite\w*|elektronik\s+ünite\w*", "Elektronik kart/kontrol ünitesi sorunu", "electronic"),
    Rule("electronics", r"\belektronik\w*", "Elektronik kontrol sistemi sorunu", "electronic"),
    Rule("programming_unit", r"programlama\s+ünite\w*", "Programlama ünitesi sorunu", "electronic"),
    Rule("extension_module", r"(?:uzatma\s+kit\w*|kontrol\s+modül\w*|iletişim\s+modül\w*|\bVitosolic\b)", "Kontrol/uzatma modülü sorunu", "electronic"),
    Rule("bus", r"(?:\b(?:EMS|KM|IMG|LON|e)?-?BUS\b|haberleşme\s+hatt\w*)", "BUS/haberleşme hattı sorunu", "electrical"),
    Rule("ignition_electrode", r"(?:ateşleme|iyonizasyon|alev)\s+elektrot\w*|\belektrot\w*", "Ateşleme/iyonizasyon elektrodu sorunu", "ignition"),
    Rule("ignition_transformer", r"ateşleme\s+(?:trafosu|transformatörü)\w*", "Ateşleme trafosu sorunu", "ignition"),
    Rule("ignition_circuit", r"(?:ateşleme|iyonizasyon)\s+devre\w*|iyonizasyon\s+sinyal\w*", "Ateşleme/iyonizasyon devresi sorunu", "ignition"),
    Rule("burner", r"\bbrülör\w*", "Brülör/yanma sorunu", "ignition"),
    Rule("gas_valve", r"gaz\s+(?:valf\w*|vanas\w*|armatür\w*|manyetik\s+valf\w*)", "Gaz valfi/armatürü sorunu", "gas_supply"),
    Rule("gas_nozzle", r"gaz\s+meme\w*", "Gaz memesi sorunu", "gas_supply"),
    Rule("gas_air_ratio", r"gaz[-\s]+hava\s+oran\w*|\bCO₂\s+ayar\w*", "Gaz/hava karışım ayarı sorunu", "combustion_air"),
    Rule("gas_pressure", r"gaz\s+(?:giriş|bağlantı)?\s*basın(?:ç|c[ıi])\w*", "Gaz giriş basıncı sorunu", "gas_supply"),
    Rule("gas_supply", r"gaz\s+(?:besleme\w*|giriş\w*|hatt\w*|sayac\w*)|\bgaz\s+yok\b", "Gaz beslemesi sorunu", "gas_supply"),
    Rule("water_pressure", r"(?:tesisat|sistem|su|çalışma|soğuk\s+tesisat)\s+basın(?:ç|c[ıi])\w*|\bsu\s+eksikliğ\w*|\byetersiz\s+su\b", "Tesisat su basıncı/eksik su sorunu", "hydraulic"),
    Rule("water_leak", r"(?:su|tesisat)\s+(?:kaçak\w*|sızıntı\w*)", "Su kaçağı/sızıntısı sorunu", "hydraulic"),
    Rule("expansion", r"genleşme\s+kab\w*", "Genleşme kabı sorunu", "hydraulic"),
    Rule("safety_valve", r"emniyet\s+(?:ventil\w*|valf\w*)", "Emniyet ventili sorunu", "hydraulic"),
    Rule("filling_valve", r"doldurma\s+(?:vana\w*|musluğ\w*)", "Doldurma vanası/musluğu sorunu", "hydraulic"),
    Rule("radiator_valve", r"(?:radyatör|petek|tesisat|kalorifer|su)\s+vana\w*", "Radyatör/tesisat vanası sorunu", "hydraulic"),
    Rule("pump", r"(?:sirkülasyon|ısıtma|tesisat|kondens)?\s*pompa\w*", "Pompa/dolaşım sorunu", "hydraulic"),
    Rule("heat_exchanger", r"(?:ısı\s+)?eşanjör\w*|ısı\s+bloğ\w*", "Eşanjör/ısı bloğu sorunu", "hydraulic"),
    Rule("filter", r"(?:dönüş|tesisat|su)?\s*filtre\w*", "Tesisat filtresi sorunu", "hydraulic"),
    Rule("system_air", r"(?:tesisatta|devrede|üründe|sistemde)\s+hava\b|hava\s+alma", "Tesisatta hava sorunu", "hydraulic"),
    Rule("flue", r"(?:atık\s+gaz|baca(?:\s+gazı)?)\s+(?:sistem\w*|hatt\w*|boru\w*|tahliye\w*|taraf\w*|tıkan\w*|çekiş\w*|sızıntı\w*|kaçak\w*|resirkülasyon\w*)|\bbaca\s*/\s*tıkan\w*|\bbaca(?:yı|da|dan|nın|sı)\b", "Atık gaz/baca sistemi sorunu", "combustion_air"),
    Rule("flue_damper", r"atık\s+gaz\s+klape\w*", "Atık gaz klapesi sorunu", "combustion_air"),
    Rule("combustion_air", r"(?:yanma\s+havas\w*|hava\s+giriş\w*|hava\s+akış\w*)", "Yanma havası/akış sorunu", "combustion_air"),
    Rule("condensate", r"kondens\s+(?:tahliye\w*|gider\w*|sifon\w*)", "Kondens tahliyesi sorunu", "hydraulic"),
    Rule("hose", r"(?:bağlantı\s+)?hortum\w*", "Bağlantı hortumu sorunu", "mechanical"),
    Rule("fan", r"\bfan\w*", "Fan sorunu", "mechanical"),
    Rule("cable", r"(?:kablo\w*|kablolama\w*|kablo\s+demet\w*|soket\w*|fiş\w*|konnektör\w*|klemens\w*)", "Kablolama/soket/bağlantı sorunu", "electrical"),
]
COMPILED_RULES = [(rule, re.compile(rule.pattern, re.I)) for rule in RULES]
FAULT = re.compile(
    r"arız\w*|hata\w*|kısa\s+devre|açık\s+devre|kopuk\w*|kesinti\w*|"
    r"gevşek|takılı\s+değil|bloke|tıkan\w*|sızıntı\w*|kaçak\w*|"
    r"yanlış|hatalı|düşük|yüksek|yetersiz|eksik|problem|temassız|"
    r"oksit\w*|vermiyor|sızdır\w*|bağlı\s+değil|arıza\s+yapt\w*", re.I,
)
CONTROL = re.compile(
    r"kontrol\s+et\w*|kontrol\s+ed\w*|kontrol\s+ettir\w*|"
    r"değiştir\w*|temizle\w*|onar\w*|ölç\w*|doğrula\w*|"
    r"sağla\w*|doldur\w*|havalandır\w*|basınçlandır\w*|"
    r"açık\s+olduğ\w*\s+(?:emin|kontrol)|emin\s+ol\w*", re.I,
)
SYMPTOM = re.compile(
    r"(?:fan\s+çalışmıyor|ateşleme\s+başarısız|başarısız\s+ateşleme|"
    r"fan\s+(?:hız[ıi]|devri|devir\s+sayıs[ıi]|geri\s+besleme)\s+(?:çok\s+)?(?:düşük|yetersiz|hatası)|"
    r"pompa\s+çalışmıyor|alev\s+(?:oluşmuyor|algılanmıyor|sönmesi)|"
    r"brülör\s+(?:bloke|arıza\s+durumunda|kapan\w*(?:\s+ve\s+arıza\s+durumuna\s+geç\w*)?|devre\s+dışı))",
    re.I,
)


@dataclass(frozen=True)
class Raw:
    brand: str
    model: str
    code: str
    description: str
    action: str
    url: str


@dataclass
class Candidate:
    raw: Raw
    key: str
    name: str
    fault_class: str
    source_type: str
    description_phrase: str = ""
    action_phrase: str = ""
    description_token: str = ""
    action_token: str = ""

    @property
    def support_kind(self) -> str:
        if self.description_phrase and self.action_phrase:
            return "both"
        return "description" if self.description_phrase else "action"


def sql_quote(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def read_raw() -> list[Raw]:
    text = (MIGRATIONS / "20260927000010_import_kombi_raw_data.sql").read_text(encoding="utf-8")
    blocks = re.findall(
        r"FROM \(VALUES\n(.*?)\n\) AS v\(brand, official_model, error_code, "
        r"official_description, official_action, source_url, import_batch\)", text, re.S,
    )
    db = sqlite3.connect(":memory:")
    result = []
    for block in blocks:
        result.extend(Raw(row[0], row[1], row[2], row[3], row[4] or "", row[5])
                      for row in db.execute("SELECT * FROM (VALUES " + block + ")"))
    workbook = load_workbook(VAİLLANT_WORKBOOK, read_only=True, data_only=True)
    for row in list(workbook.active.values)[1:]:
        if row[1] == "Vaillant":
            result.append(Raw(row[1], row[2], row[3], row[4], row[5] or "", row[6]))
    identities = [(r.brand, r.model, r.code) for r in result]
    if len(result) != 5879 or len(set(identities)) != len(result):
        raise ValueError("Raw row count or identity uniqueness differs from the prepared import")
    return result


def read_families() -> dict[tuple[str, str], str]:
    result = {}
    pattern = re.compile(
        r"INSERT INTO public\.boiler_official_models.*?SELECT\s*f\.id,\s*'((?:''|[^'])*)'"
        r".*?FROM public\.boiler_model_families f\s*WHERE f\.brand\s*=\s*'((?:''|[^'])*)'"
        r"\s*AND f\.normalized_name\s*=\s*'((?:''|[^'])*)'", re.S | re.I,
    )
    for file in sorted(MIGRATIONS.glob("2026092700001[123]*model_identity*.sql")):
        for match in pattern.finditer(file.read_text(encoding="utf-8")):
            result[(match[2], match[1])] = match[3]
    return result


def source_type(url: str) -> str:
    parts = urlsplit(url)
    host = (parts.hostname or "").lower()
    if parts.scheme != "https" or not host:
        raise ValueError(f"Source is not HTTPS: {url}")
    if any(host == domain or host.endswith("." + domain) for domain in OFFICIAL_HOSTS):
        # Community attachments are uploaded by users, despite the host name.
        if host != "community.viessmann.de":
            return "official_manufacturer"
    if any(host == domain or host.endswith("." + domain) for domain in TRUSTED_HOSTS):
        return "trusted_third_party"
    raise ValueError(f"Source host has no established provenance classification: {host}")


def clauses(text: str, *, split_semicolon: bool = True) -> list[str]:
    # A clause is kept verbatim for the auditable exact-source-phrase check.
    boundary = r"(?<=[.!?])\s+|\s*;\s*" if split_semicolon else r"(?<=[.!?])\s+"
    return [part.strip() for part in re.split(boundary, text or "") if part.strip()]


def components(clause: str) -> list[tuple[Rule, str]]:
    matches = []
    for rule, pattern in COMPILED_RULES:
        for hit in pattern.finditer(clause):
            matches.append((hit.start(), hit.end(), rule))
    # Prefer the most specific overlapping term; allow distinct nearby items.
    matches.sort(key=lambda item: (-(item[1] - item[0]), item[0]))
    chosen = []
    for start, end, rule in matches:
        if any(start < used_end and end > used_start for used_start, used_end, _ in chosen):
            continue
        chosen.append((start, end, rule))
    by_key = {}
    specific_sensors = {
        rule.key for _, _, rule in chosen
        if (rule.key.startswith("sensor_") and rule.key not in ("sensor_temperature", "sensor_general"))
        or rule.key in ("pressure_differential", "pressure_air", "pressure_gas_sensor", "pressure_water_sensor", "air_mass_flow", "flow_meter")
    }
    for start, end, rule in sorted(chosen, key=lambda item: (item[0], item[1])):
        if rule.key in ("sensor_temperature", "sensor_general") and specific_sensors:
            continue
        if rule.key == "electronics" and any(other_rule.key in ("pcb", "coding") for _, _, other_rule in chosen):
            continue
        if rule.key == "cable" and re.fullmatch(r"(?:fiş|soket)", clause[start:end], re.I) and re.match(
            r"\s*\d+\)", clause[end:]
        ):
            continue  # A parenthesized connector number is an identifier, not a fault.
        # A location is not automatically the failed item: "eşanjöründeki
        # termostat arızalı" supports the thermostat, not the exchanger.
        if re.search(r"(?:deki|daki|ndeki|ndaki)$", clause[start:end], re.I) and any(
            other_start >= end and other_rule.key != rule.key
            for other_start, _, other_rule in chosen
        ):
            continue
        # "fan kablosunu kontrol edin" supports wiring; a separate "fanı"
        # mention is required to seed a fan control point.
        if rule.key != "cable" and re.match(r"\s+(?:kablo|soket|fiş|konnektör|bağlantı)\w*", clause[end:], re.I):
            continue
        if rule.key != "cable" and re.search(r"\bgiden\s+kablo\w*", clause[end:], re.I):
            continue
        by_key.setdefault(rule.key, (rule, clause[start:end]))
    return list(by_key.values())


def eligible_description(clause: str) -> bool:
    return bool(FAULT.search(clause)) and not bool(SYMPTOM.fullmatch(clause.rstrip(". ")))


def extract(raw: Raw) -> list[Candidate]:
    candidates: dict[str, Candidate] = {}
    provenance = source_type(raw.url)

    def add(rule: Rule, field: str, phrase: str, exact_component: str) -> None:
        key = rule.key
        if key == "sensor_temperature" and field == "description":
            if re.search(r"\bgidiş\b", phrase, re.I) and not re.search(r"\bdönüş\b", phrase, re.I):
                key = "sensor_supply"
            elif re.search(r"\bdönüş\b", phrase, re.I) and not re.search(r"\bgidiş\b", phrase, re.I):
                key = "sensor_return"
            elif re.search(r"\b(?:sıcak\s+su|kullanım\s+suyu)\b", phrase, re.I):
                key = "sensor_dhw"
            if key != rule.key:
                rule = next(item for item in RULES if item.key == key)
        if key in ("sensor_temperature", "sensor_general"):
            specific = [k for k, existing in candidates.items()
                        if existing.fault_class == "sensor" and k not in ("sensor_temperature", "sensor_general")]
            if len(specific) == 1:
                key = specific[0]
                rule = next(item for item in RULES if item.key == key)
        if key not in candidates:
            digest = hashlib.sha1("\0".join((raw.brand, raw.model, raw.code, key)).encode()).hexdigest()[:20]
            prefix = re.sub(r"[^a-z0-9]+", "_", raw.brand.lower().replace("ö", "o").replace("ü", "u").replace("ı", "i").replace("ç", "c").replace("ş", "s").replace("ğ", "g")).strip("_")
            candidates[key] = Candidate(raw, f"stage3_{prefix}_{digest}", rule.name, rule.fault_class, provenance)
        candidate = candidates[key]
        if field == "description" and not candidate.description_phrase:
            candidate.description_phrase = phrase
            candidate.description_token = exact_component
        if field == "action" and not candidate.action_phrase:
            candidate.action_phrase = phrase
            candidate.action_token = exact_component

    for phrase in clauses(raw.description):
        if eligible_description(phrase):
            for rule, exact_component in components(phrase):
                add(rule, "description", phrase, exact_component)
    action_has_control = bool(CONTROL.search(raw.action))
    for phrase in clauses(raw.action, split_semicolon=not action_has_control):
        if FAULT.search(phrase) or CONTROL.search(phrase):
            for rule, exact_component in components(phrase):
                add(rule, "action", phrase, exact_component)
    return list(candidates.values())


def migration_sql(number: int, brand: str, candidates: list[Candidate]) -> str:
    slug = MIGRATION_BRANDS[number][1]
    file_name = f"202609270000{number}_seed_{slug}_fault_candidates.sql"
    display_brand = "Immergas + Alpha" if number == 23 else brand
    values = []
    for c in candidates:
        r = c.raw
        fields = [r.brand, r.model, r.code, c.key, c.name, c.fault_class,
                  r.description, r.action, r.url, c.source_type,
                  c.description_phrase, c.action_phrase,
                  c.description_token, c.action_token]
        values.append("  (" + ", ".join(sql_quote(value) for value in fields) + ")")
    if not values:
        raise ValueError(f"No candidates for {brand}")
    count = len(values)
    return f"""-- Teknik-O Stage 3: {display_brand} için açıklama + işlem kaynaklı olası teknik arıza noktaları.
-- Bir kontrol noktası kesin parça arızası değil, kaynağın bu hata ile ilişkilendirdiği olası adaydır.
-- Ham açıklama, işlem, URL ve her adayın exact support phrase'i transaction içinde doğrulanır.
-- Üretici araştırması veya canlı veritabanı çağrısı yapılmadan {file_name} üretildi.
BEGIN;

CREATE TEMP TABLE stage3_candidate_seed (
  brand text NOT NULL, official_model text NOT NULL, error_code text NOT NULL,
  candidate_key text NOT NULL, candidate_name text NOT NULL, fault_class text NOT NULL,
  evidence_description text NOT NULL, evidence_action text NOT NULL,
  evidence_url text NOT NULL, evidence_source_type text NOT NULL,
  description_support text NOT NULL, action_support text NOT NULL,
  description_token text NOT NULL, action_token text NOT NULL,
  PRIMARY KEY (candidate_key),
  CHECK (description_support <> '' OR action_support <> '')
) ON COMMIT DROP;

INSERT INTO stage3_candidate_seed VALUES
{',\n'.join(values)};

DO $$
DECLARE v_bad bigint;
BEGIN
  IF (SELECT count(*) FROM public.official_error_codes_raw) <> 5879 THEN
    RAISE EXCEPTION 'Stage 3 stopped: official_error_codes_raw count is not 5879';
  END IF;
  IF (SELECT count(*) FROM stage3_candidate_seed) <> {count} THEN
    RAISE EXCEPTION 'Stage 3 stopped: {slug} seed count differs from {count}';
  END IF;
  SELECT count(*) INTO v_bad FROM stage3_candidate_seed s
  LEFT JOIN public.official_error_codes_raw r
    ON r.brand=s.brand AND r.official_model=s.official_model AND r.error_code=s.error_code
    AND r.official_description=s.evidence_description
    AND coalesce(r.official_action,'')=s.evidence_action AND r.source_url=s.evidence_url
  LEFT JOIN (
    SELECT m.id, m.official_model_name, f.brand
    FROM public.boiler_official_models m
    JOIN public.boiler_model_families f ON f.id=m.family_id
    WHERE m.is_active=true AND f.is_active=true
  ) model ON model.official_model_name=s.official_model AND model.brand=s.brand
  WHERE r.id IS NULL OR model.id IS NULL
    OR (s.description_support<>'' AND position(s.description_support in s.evidence_description)=0)
    OR (s.action_support<>'' AND position(s.action_support in s.evidence_action)=0)
    OR (s.description_support<>'' AND position(s.description_token in s.description_support)=0)
    OR (s.action_support<>'' AND position(s.action_token in s.action_support)=0);
  IF v_bad <> 0 THEN
    RAISE EXCEPTION 'Stage 3 stopped: {slug} raw evidence, support phrase, or model identity differs';
  END IF;
  IF EXISTS (SELECT 1 FROM stage3_candidate_seed
      WHERE evidence_url !~ '^https://[^ ]+$' OR length(trim(candidate_name))=0
        OR evidence_source_type NOT IN ('official_manufacturer','trusted_third_party')
        OR fault_class NOT IN ('gas_supply','ignition','sensor','hydraulic','electrical','electronic',
                              'combustion_air','mechanical','installation','other')) THEN
    RAISE EXCEPTION 'Stage 3 stopped: invalid {slug} seed fields';
  END IF;
  IF EXISTS (SELECT 1 FROM stage3_candidate_seed s JOIN public.boiler_fault_candidates c
      ON c.candidate_key=s.candidate_key WHERE c.verification_status<>'verified' OR c.is_active<>true
      OR c.candidate_name<>s.candidate_name OR c.evidence_url<>s.evidence_url) THEN
    RAISE EXCEPTION 'Stage 3 stopped: existing candidate key conflicts with seed';
  END IF;
END $$;

INSERT INTO public.boiler_fault_candidates (
  official_error_record_id,family_id,official_model_id,error_code,candidate_key,candidate_name,
  description,fault_class,verification_status,evidence_source_type,evidence_url,evidence_note,
  requires_service,customer_observable,is_active
)
SELECT r.id, f.id, m.id, s.error_code, s.candidate_key, s.candidate_name,
  'Kaynağın bu hatayla ilişkilendirdiği olası teknik arıza noktası: ' || s.candidate_name,
  s.fault_class, 'verified', s.evidence_source_type, r.source_url,
  concat_ws(E'\\n',
    CASE WHEN s.description_support<>'' THEN 'description support: "' || s.description_token || '"; context: "' || s.description_support || '"' END,
    CASE WHEN s.action_support<>'' THEN 'action support: "' || s.action_token || '"; context: "' || s.action_support || '"' END),
  true, false, true
FROM stage3_candidate_seed s
JOIN public.official_error_codes_raw r
  ON r.brand=s.brand AND r.official_model=s.official_model AND r.error_code=s.error_code
  AND r.official_description=s.evidence_description
  AND coalesce(r.official_action,'')=s.evidence_action AND r.source_url=s.evidence_url
JOIN public.boiler_official_models m ON m.official_model_name=s.official_model AND m.is_active=true
JOIN public.boiler_model_families f ON f.id=m.family_id AND f.brand=s.brand AND f.is_active=true
WHERE NOT EXISTS (SELECT 1 FROM public.boiler_fault_candidates c WHERE c.candidate_key=s.candidate_key);

DO $$
DECLARE v_actual bigint;
BEGIN
  SELECT count(*) INTO v_actual FROM public.boiler_fault_candidates c
  JOIN stage3_candidate_seed s ON s.candidate_key=c.candidate_key
  JOIN public.boiler_official_models m ON m.id=c.official_model_id
  JOIN public.boiler_model_families f ON f.id=c.family_id
  WHERE f.brand=s.brand AND m.official_model_name=s.official_model AND c.error_code=s.error_code
    AND c.verification_status='verified' AND c.is_active=true
    AND c.evidence_source_type=s.evidence_source_type AND c.evidence_url=s.evidence_url
    AND length(trim(c.evidence_note))>0;
  IF v_actual <> {count} THEN
    RAISE EXCEPTION 'Stage 3 stopped: {slug} expected {count} verified candidates, found %', v_actual;
  END IF;
END $$;
COMMIT;
"""


def prepare() -> tuple[dict[int, list[Candidate]], dict[int, list[Raw]], dict[tuple[str, str], str]]:
    raw_rows = read_raw()
    families = read_families()
    by_number: dict[int, list[Candidate]] = defaultdict(list)
    considered: dict[int, list[Raw]] = defaultdict(list)
    for raw in raw_rows:
        if (raw.brand, raw.model) not in families:
            raise ValueError(f"No approved model identity: {raw.brand} / {raw.model}")
        if raw.brand == "Vaillant" and families[(raw.brand, raw.model)] == "ecotec intro":
            continue  # Migrations 00014/00015 and the existing live 98 candidates are untouched.
        number = 23 if raw.brand in ("Immergas", "Alpha") else next(
            n for n, (brand, _) in MIGRATION_BRANDS.items() if brand == raw.brand
        )
        considered[number].append(raw)
        by_number[number].extend(extract(raw))
    for candidates in by_number.values():
        keys = [c.key for c in candidates]
        if len(keys) != len(set(keys)):
            raise ValueError("Duplicate candidate_key")
    return by_number, considered, families


def report(by_number: dict[int, list[Candidate]], considered: dict[int, list[Raw]], families: dict[tuple[str, str], str]) -> None:
    for number, (brand, _) in MIGRATION_BRANDS.items():
        brands = ("Alpha", "Immergas") if number == 23 else (brand,)
        for subbrand in brands:
            seeds = [c for c in by_number[number] if c.raw.brand == subbrand]
            rows = [r for r in considered[number] if r.brand == subbrand]
            covered = {(c.raw.brand, c.raw.model, c.raw.code) for c in seeds}
            zero = [r for r in rows if (r.brand, r.model, r.code) not in covered]
            supports = Counter(c.support_kind for c in seeds)
            sources = Counter(c.source_type for c in seeds)
            classes = Counter(c.fault_class for c in seeds)
            symptom_general = sum(
                not components(r.action)
                and (not r.action or bool(re.search(r"reset|servis|yeniden|başlat|kapat|açın|bekleyin|iletişime", r.action, re.I)))
                for r in zero
            )
            print(
                f"{subbrand}: families={len({families[(r.brand, r.model)] for r in rows})} "
                f"models={len({(r.brand, r.model) for r in rows})} "
                f"codes={len({(r.brand, r.model, r.code) for r in rows})} "
                f"candidates={len(seeds)} description_only={supports['description']} "
                f"action_only={supports['action']} both={supports['both']} "
                f"zero_candidates={len(zero)} symptom_general={symptom_general} sources={dict(sources)} "
                f"duplicate=0 empty_url={sum(not c.raw.url for c in seeds)} "
                f"empty_note={sum(not(c.description_phrase or c.action_phrase) for c in seeds)} "
                f"classes={dict(sorted(classes.items()))}"
            )


if __name__ == "__main__":
    by_number, considered, families = prepare()
    for number, (brand, slug) in MIGRATION_BRANDS.items():
        path = MIGRATIONS / f"202609270000{number}_seed_{slug}_fault_candidates.sql"
        path.write_text(migration_sql(number, brand, by_number[number]), encoding="utf-8", newline="\n")
    report(by_number, considered, families)
