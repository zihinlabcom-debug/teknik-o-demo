"""Extract Stage 3 candidates and prepare an additive backfill from raw evidence.

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
    "viessmann.ca", "viessmann-us.com", "viessmann.co.uk", "warmhaus.com", "copa.com.tr",
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
    Rule("thermal_cutoff", r"termik\s+(?:kapatma\s+düzeneğ\w*|sigorta\w*)", "Termik kapatma düzeneği sorunu", "electrical"),
    Rule("gas_valve_driver", r"(?:elektronik\s+)?gaz\s+valfi\s+(?:sürücüs\w*|devres\w*)", "Gaz valfi kontrol devresi sorunu", "electronic"),
    Rule("air_measurement", r"hava\s+ölçüm\s+cihaz\w*", "Hava ölçüm cihazı sorunu", "sensor"),
    Rule("control_panel", r"(?:tuş\s+takım\w*|tuş\s+panel\w*|kontrol\s+panel\w*|buton\w*)", "Kontrol paneli/tuş takımı sorunu", "electronic"),
    Rule("coding_resistor", r"kodlama\s+direnc\w*", "Kodlama direnci sorunu", "electrical"),
    Rule("control_module", r"\b(?:UBA\s*3|KIM|BCC)\b", "Kontrol modülü sorunu", "electronic"),
    Rule("coding_key", r"kod\s+anahtar\w*", "Kod anahtarı sorunu", "electronic"),
    Rule("selection_switch", r"(?:seçim\s+şalter\w*|\bDIP\s+Switch\b)", "Seçim şalteri sorunu", "electrical"),
    Rule("operating_unit", r"(?:kumanda\s*/\s*işletim|işletim|kumanda)\s+ünite\w*", "Kumanda/işletim ünitesi sorunu", "electronic"),
    Rule("sensor_connection", r"(?:sensör\w*|prob(?:u|un|unda|ları)?|elektrik)\s+bağlantı\w*", "Sensör/elektrik bağlantısı sorunu", "electrical"),
    Rule("pump_connection", r"(?:elektrik\s+)?pompa\s+bağlantı\w*", "Pompa elektrik bağlantısı sorunu", "electrical"),
    Rule("backflow_safety", r"geri\s+tepme\s+emniyet\s+tertibat\w*", "Geri tepme emniyet tertibatı sorunu", "combustion_air"),
    Rule("heat_management_unit", r"(?:\bHBMU\b|ısı\s+yönetim\s+ünite\w*)", "Isı yönetim ünitesi sorunu", "electronic"),
    Rule("adc", r"(?:analog\s*[-/]\s*dijital\s+çevirici\w*|\bADC\b)", "Analog-dijital çevirici sorunu", "electronic"),
    Rule("clock_module", r"(?:gerçek\s+zaman\s+saati|saat\s+modül\w*)", "Gerçek zaman saati/modülü sorunu", "electronic"),
    Rule("three_way_valve", r"(?:3|üç)\s+yollu\s+(?:motorlu\s+)?vana\w*", "Üç yollu vana sorunu", "hydraulic"),
    Rule("fuse", r"(?:\bF\d+\s+)?sigorta\w*", "Elektrik sigortası sorunu", "electrical"),
    Rule("siphon", r"\bsifon\w*", "Kondens sifonu sorunu", "hydraulic"),
    Rule("temperature_probe", r"(?:gidiş|dönüş|boyler|baca\s+gazı|atık\s+gaz)\s+prob(?:u|un|unda|ları)?\b|\bprob(?:u|un|unda|ları)\b", "Sıcaklık probu sorunu", "sensor"),
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
    Rule("voltage", r"(?:elektrik|şebeke|besleme|giriş)\s+(?:gerilim\w*|voltaj\w*)|elektrik\s+besleme\w*|\bvoltaj\w*|\bgerilim\w*|\b24\s*V\b", "Elektrik besleme/gerilim sorunu", "electrical"),
    Rule("earthing", r"topraklama\w*", "Topraklama sorunu", "electrical"),
    Rule("coding", r"(?:kodlama\s+(?:fiş|kart)\w*|EEPROM\w*)", "Kodlama/EEPROM sorunu", "electronic"),
    Rule("pcb", r"(?:elektronik|ana|baskı\s+devre|kontrol|devre)\s+kart\w*|\bPCB\b|kontrol\s+ünite\w*|elektronik\s+ünite\w*", "Elektronik kart/kontrol ünitesi sorunu", "electronic"),
    Rule("electronics", r"\belektronik\w*", "Elektronik kontrol sistemi sorunu", "electronic"),
    Rule("programming_unit", r"programlama\s+ünite\w*", "Programlama ünitesi sorunu", "electronic"),
    Rule("extension_module", r"(?:uzatma\s+kit\w*|kontrol\s+modül\w*|iletişim\s+modül\w*|\bVitosolic\b)", "Kontrol/uzatma modülü sorunu", "electronic"),
    Rule("bus", r"(?:\b(?:EMS|KM|IMG|LON|e)?-?BUS\b|haberleşme\s+hatt\w*)", "BUS/haberleşme hattı sorunu", "electrical"),
    Rule("ignition_electrode", r"(?:ateşleme|iyonizasyon|alev|ayarlama)\s+elektro(?:t|d)\w*|\belektro(?:t|d)\w*", "Ateşleme/iyonizasyon elektrodu sorunu", "ignition"),
    Rule("ignition_transformer", r"ateşleme\s+(?:trafosu|transformatörü)\w*", "Ateşleme trafosu sorunu", "ignition"),
    Rule("ignition_circuit", r"(?:ateşleme|iyonizasyon|alev)\s+devres\w*|iyonizasyon\s+sinyal\w*", "Ateşleme/iyonizasyon devresi sorunu", "ignition"),
    Rule("burner", r"\bbrülör\w*", "Brülör/yanma sorunu", "ignition"),
    Rule("gas_valve", r"(?:(?:gaz|yakıt|LPG)(?:\s*/\s*modülasyon|\s+emniyet)?\s+(?:valf\w*|vanas\w*|armatür\w*|manyetik\s+valf\w*|solenoid\s+valf\w*)|(?:modülasyon|solenoid)\s+valf\w*)", "Gaz valfi/armatürü sorunu", "gas_supply"),
    Rule("gas_train", r"gaz\s+tren\w*", "Gaz treni sorunu", "gas_supply"),
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
    Rule("cable", r"(?:kablo\w*|kablolama\w*|kablo\s+demet\w*|soket\w*|fiş\w*|konnektör\w*|klemens\w*|cihaz\s+bağlantı\w*|yanlış\s+bağlan\w*)", "Kablolama/soket/bağlantı sorunu", "electrical"),
]
COMPILED_RULES = [(rule, re.compile(rule.pattern, re.I)) for rule in RULES]
# Fuel-aware imports use this reusable vocabulary extension. The historical
# 00016-00031 generator profile remains reproducible without fuel metadata.
FUEL_RULES = [
    Rule("probe_pairing", r"(?:CH\s+)?(?:akış|gidiş|dönüş)\s+NTC.{0,100}değiştirme\s+testi", "NTC gidiş/dönüş eşleşme-kontrol noktası", "installation"),
    Rule("gas_supply", r"gaz\s+akış\w*\s+(?:sorun\w*|problem\w*|kesinti\w*)|gazın\s+açık\s+olduğ\w*\s+kontrol", "Gaz beslemesi sorunu", "gas_supply"),
    Rule("sensor_supply", r"CH\s+(?:akış\w*|gidiş\w*)\s+(?:NTC\s+)?(?:prob\w*|sensör\w*)", "Gidiş sıcaklık sensörü sorunu", "sensor"),
    Rule("sensor_return", r"(?:CH\s+)?dönüş\s+NTC\s+(?:prob\w*|sensör\w*)", "Dönüş sıcaklık sensörü sorunu", "sensor"),
    Rule("sensor_dhw", r"DHW\s+NTC\s+(?:prob\w*|sensör\w*)", "Kullanım suyu sıcaklık sensörü sorunu", "sensor"),
    Rule("sensor_outside", r"dış(?:\s+mekan|\s+hava)?\s+NTC(?:\s+prob\w*)?", "Dış sıcaklık sensörü sorunu", "sensor"),
    Rule("sensor_flue", r"baca\s+gazı(?:nda)?\s+NTC(?:\s+prob\w*)?", "Baca gazı sensörü sorunu", "sensor"),
    Rule("sensor_heating", r"tesisat\s+(?:sıcaklık\s+)?sensör\w*", "Tesisat sıcaklık sensörü sorunu", "sensor"),
    Rule("fan_feedback", r"fan(?:\s+sensör\w*|\s+enkoder\w*|\s+kodlayıcı\w*)?\s+(?:hız\w*\s+)?sinyal\w*|fan\s+(?:enkoder\w*|kodlayıcı\w*)", "Fan hız/sinyal geri bildirimi sorunu", "electrical"),
    Rule("pump_feedback", r"pompa\s+(?:enkoder\w*\s+)?sinyal\w*", "Pompa hız/sinyal geri bildirimi sorunu", "electrical"),
    Rule("expansion", r"genleşme\s+tan[kğ]\w*", "Genleşme kabı sorunu", "hydraulic"),
    Rule("high_limit", r"yüksek\s+limit\s+sıcaklık\s+koruma\w*|(?:NTC\s+)?(?:aşırı|yüksek)\s+sıcakl[ıi][kğ]\w*", "Yüksek limit / termik koruma noktası", "electrical"),
    Rule("water_leak", r"(?:su|tesisat)\s+kaça[kğ]\w*", "Su kaçağı/sızıntısı sorunu", "hydraulic"),
    Rule("group_flame_feedback", r"alev\s+tespiti\s+sinyal\w*.{0,45}aral[ıi][kğ]\w*\s+dış\w*", "Alev algılama/geri bildirim grubu", "ignition"),
    Rule("circuit_breaker_feedback", r"devre\s+kesici\w*.{0,100}(?:geri\s+bildirim|geri\s+besleme)|(?:yanlış\s+)?CB\s+geri\s+bildirim\w*", "Devre kesici geri bildirim/kontrol noktası", "electrical"),
    Rule("gas_valve_feedback", r"gaz\s+(?:vana\w*|valf\w*)\s+(?:tahrik\w*\s+ve\s+)?geri\s+bildirim\w*", "Gaz vanası geri bildirim/kontrol devresi sorunu", "electronic"),
]
COMPILED_FUEL_RULES = [(rule, re.compile(rule.pattern, re.I)) for rule in FUEL_RULES]
FUEL_CONTROL = re.compile(r"kontrolü\s+(?:gerek\w*|için)|kontrol\s+edilmeli\w*", re.I)
# General enrichment is explicit so applied historical seeds stay reproducible.
# Systems named as independent action control points run alongside components.
GENERAL_RULES = [
    Rule('sensor_supply', r'\b(?:gidiş|akış)\s+(?:NTC\s+)?prob\w*', 'Gidiş sıcaklık sensörü sorunu', 'sensor'),
    Rule('sensor_return', r'\bdönüş\s+(?:NTC\s+)?prob\w*', 'Dönüş sıcaklık sensörü sorunu', 'sensor'),
    Rule('ignition_system', r'\bateşleme\b(?!\s+(?:traf\w*|transformat\w*|elektro\w*|devres\w*))', 'Ateşleme sistemi sorunu', 'ignition'),
    Rule('thermal_cutoff', r'termik\s+kapatma(?:\s+düzene\w*)?', 'Termik kapatma düzeneği sorunu', 'electrical'),
    Rule('condensate_drain', r'yoğuşma\s+(?:su(?:yu)?\s+)?(?:gider\w*|tahliye\w*|sifon\w*)', 'Yoğuşma suyu gideri sorunu', 'hydraulic'),
    Rule('circulation_system', r'\b(?:hidrolik\s+)?(?:dolaşım|sirkülasyon)\b(?!\s+pompa)', 'Hidrolik dolaşım noktası', 'hydraulic'),
    Rule('air_pressure_system', r'hava\s+basın(?:ç|cı)\s+sistem\w*', 'Hava basınç sistemi sorunu', 'combustion_air'),
    Rule('recuperator', r'reküperatör\w*', 'Reküperatör/ısı geri kazanımı noktası', 'mechanical'),
    Rule('valve_feedback', r'(?<!gaz\s)\bvalf\s+geri\s+bildirim\w*', 'Valf geri bildirim/kontrol noktası', 'electronic'),
    Rule('voltage', r'\b\d{2,3}\s*V(?:AC|DC)?\b.*(?:besleme\s+gerilimi|şebeke)', 'Elektrik besleme/gerilim sorunu', 'electrical'),
]
COMPILED_GENERAL_RULES = [(rule,re.compile(rule.pattern,re.I)) for rule in GENERAL_RULES]
ACTION_ONLY_SYSTEM_KEYS = {'ignition_system','circulation_system','air_pressure_system','recuperator'}
# These broad labels describe a source-named diagnostic system, not a failed part.
# They are used only when no component/control-point candidate was extracted.
GROUP_RULES = [
    Rule("group_flame_detection", r"(?:alev|iyonizasyon|iyon)\s+(?:algıla\w*|sinyal\w*|denetim\w*|kontrol\w*|akım\w*|bildirim\w*|bileşen\w*|komponent\w*|hata\w*|arız\w*|sahte\b)|sahte\s+alev|alev\s+kapatmas\w*.*algıla\w*", "Alev algılama grubu", "ignition"),
    Rule("group_flame_process", r"alev\s+(?:kayb\w*|yok\b|oluş\w*|sön\w*|sabit\b|stabilizasyon\w*.*sön\w*)|yanma\s+değer\w*", "Alev oluşumu/sürekliliği grubu", "ignition"),
    Rule("group_dry_firing", r"kuru\s+yanma", "Kuru çalışma/termik koruma grubu", "hydraulic"),
    Rule("group_temperature_difference", r"(?:Delta\s*T|ΔT|sıcaklık\s+(?:fark\w*|yayıl\w*))", "Sıcaklık farkı/ısı transferi grubu", "hydraulic"),
    Rule("group_combustion_quality", r"kötü\s+yanma|yanma\s+kalite\w*", "Yanma kalitesi grubu", "ignition"),
    Rule("group_combustion_feedback", r"(?:yanma|yakıt)\s+(?:geri\s*bildirim\s+)?sinyal\w*", "Yanma geri bildirim grubu", "ignition"),
    Rule("group_ignition", r"ateşle\w*|yanma\s+(?:oluş\w*|kilit\w*|geri\s*bildirim\w*)", "Ateşleme/alev oluşumu grubu", "ignition"),
    Rule("group_overheat", r"(?:aşırı\s+(?:ısın\w*|sıcak\w*)|yüksek\s+sıcaklık|sıcaklık\s+(?:artış\w*|fark\w*|limit\w*|sınırlayıc\w*)|çalışma\s+sıcaklığ\w*\s+aşıl\w*|limit\s+termostat|emniyet\s+termostat|termik\s+koruma)", "Aşırı sıcaklık/termik koruma grubu", "hydraulic"),
    Rule("group_gas_control", r"gaz\s+(?:armatür\w*|vana\w*|valf\w*)\s+(?:kumanda\w*|kontrol\w*|sürücü\w*|ofset\w*|kademe\w*)|gaz\s+(?:valf\w*|vana\w*).*(?:geri\s+bildirim|uzun\s+süre|beklenenden|aralık\s+dışı\s+akım)", "Gaz armatürü kontrol grubu", "electronic"),
    Rule("group_gas_path", r"gaz(?:ın)?\s+(?:besleme\w*|kesil\w*|grub\w*|yol\w*|tür\w*|giriş\w*|basın\w*)", "Gaz besleme/yolu grubu", "gas_supply"),
    Rule("group_water_pressure", r"(?:su|tesisat|sistem|kalorifer|pompa|tesisat\s+suyu|dolum)\s+basın\w*|basınç\s+(?:artış\w*|fark\w*|düş\w*)|düşük\s+basınç|(?:çok\s+az|yetersiz)\s+su", "Su basıncı/hidrolik grubu", "hydraulic"),
    Rule("group_circulation", r"sirkülasyon\w*|dolaşım\w*|pompa\w*\s+(?:çalış\w*|kuru\w*)", "Pompa/dolaşım grubu", "hydraulic"),
    Rule("group_filling", r"(?:otomatik\s+)?(?:su\s+)?doldurma\w*", "Su doldurma/hidrolik grubu", "hydraulic"),
    Rule("group_water_flow", r"(?:su|tesisat|sistem|kalorifer)\s+akış\w*|hacimsel\s+debi\w*", "Su akışı/debi grubu", "hydraulic"),
    Rule("group_hydraulic", r"hidrolik\s+(?:sensör\w*|komponent\w*|test\w*)", "Hidrolik sistem grubu", "hydraulic"),
    Rule("group_differential_pressure", r"diferansiyel\s+basınç|fark\s+basınc\w*", "Diferansiyel basınç algılama grubu", "sensor"),
    Rule("group_fan_air", r"fan\w*|yanma\s+havas\w*|hava\s+(?:akış\w*|ölç\w*|fazlalık\w*)|havasızlık", "Fan/yanma havası grubu", "combustion_air"),
    Rule("group_flue", r"(?:atık|baca|duman)\s+gaz\w*|baca\w*|duman\s+boru\w*", "Atık gaz/baca grubu", "combustion_air"),
    Rule("group_temperature", r"sıcaklık\w*|sıcaklığ\w*|\bNTC\b", "Sıcaklık algılama grubu", "sensor"),
    Rule("group_sensor_signal", r"sensör\s+sinyal\w*", "Sensör sinyali/algılama grubu", "sensor"),
    Rule("group_communication", r"(?:iletişim|haberleşme|veri\s+yol\w*|\bBUS\b|\bLON\b|OpenTherm)", "Elektronik haberleşme grubu", "electronic"),
    Rule("group_control", r"(?:cihaz\s+(?:kod\w*|tipi\s+tanımlan\w*)|\bDSN\b|konfigürasyon\w*|kalibrasyon\w*|parametre\w*|yazılım\w*|regülasyon\w*|\bUBA\b|\bEEPROM\b|dahili\s+veri\w*|veri\s+belleğ\w*|bellek\s+checksum|saat\s*/\s*tarih|yanma\s+ayar\w*|ayarlama\s+modül\w*)", "Elektronik kontrol/ayar grubu", "electronic"),
    Rule("group_electrical_connection", r"elektrik\s+(?:bağlant\w*|tesisat\w*)", "Elektrik bağlantısı grubu", "electrical"),
    Rule("group_electrical", r"(?:elektrik|şebeke|gerilim|voltaj|güç\s+kaynağ\w*|ağ\s+frekans\w*)", "Elektrik besleme grubu", "electrical"),
    Rule("group_external_device", r"harici\s+cihaz\w*", "Harici cihaz/bağlantı grubu", "electronic"),
    Rule("group_recovery_unit", r"reküperatör\w*", "Reküperatör/ısı geri kazanımı grubu", "mechanical"),
    Rule("group_scot", r"\bSCOT\s+(?:sistem\w*|aktüatör\w*|kontrol\w*)", "SCOT kontrol grubu", "electronic"),
    Rule("group_dhw", r"(?:sıcak\s+su|kullanım\s+suy\w*|boyler\w*)", "Kullanım suyu grubu", "hydraulic"),
    Rule("group_heating", r"(?:ısıtma\s+devre\w*|kalorifer\s+devre\w*|yerden\s+ısıtma\w*)", "Isıtma devresi grubu", "hydraulic"),
    Rule("group_condensate", r"(?:kondens\w*|yoğuşma\s+suy\w*)", "Kondens tahliyesi grubu", "hydraulic"),
]
COMPILED_GROUP_RULES = [(rule, re.compile(rule.pattern, re.I)) for rule in GROUP_RULES]
FAULT = re.compile(
    r"arız\w*|hata\w*|kısa\s+devre|açık\s+devre|kopuk\w*|kesinti\w*|kesil\w*|"
    r"gevşek|takılı\s+değil|bloke|tıkan\w*|sızıntı\w*|kaçak\w*|"
    r"yanlış|hatalı|düşük|yüksek|yetersiz|eksik|problem|temassız|"
    r"oksit\w*|vermiyor|sızdır\w*|bağlı\s+değil|arıza\s+yapt\w*|"
    r"işlevsiz|(?:açma|kapatma)\s+gecikmes\w*|geç\s+kapan\w*|algılanmıyor|algılanmad\w*|"
    r"geçersiz|kullanılamaz|uygun\s+değil|uyumlu\s+değil|başarısız|hareket\s+etmiyor|açılmıyor|kapanmıyor|"
    r"takılmamış|\byok\b|anormalliğ\w*|sorun\w*", re.I,
)
CONTROL = re.compile(
    r"kontrol\s+et\w*|kontrol\s+ed\w*|kontrol\s+ettir\w*|"
    r"değiştir\w*|temizle\w*|onar\w*|yükselt\w*|ölç(?:ün|ül\w*|tür\w*)|doğrula\w*|"
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
    level: str = "component"

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


def read_applied_seeds() -> dict[tuple[str, str, str], list[Candidate]]:
    """Read the frozen 00016–00026 seed rows; never regenerate those migrations."""
    by_identity: dict[tuple[str, str, str], list[Candidate]] = defaultdict(list)
    db = sqlite3.connect(":memory:")
    for number, (_, slug) in MIGRATION_BRANDS.items():
        path = MIGRATIONS / f"202609270000{number}_seed_{slug}_fault_candidates.sql"
        text = path.read_text(encoding="utf-8")
        match = re.search(r"INSERT INTO stage3_candidate_seed VALUES\n(.*?);\n\nDO", text, re.S)
        if not match:
            raise ValueError(f"Applied seed values not found: {path.name}")
        for row in db.execute("SELECT * FROM (VALUES " + match[1] + ")"):
            brand, model, code, key, name, fault_class, description, action, url, provenance, d_phrase, a_phrase, d_token, a_token = row
            candidate = Candidate(Raw(brand, model, code, description, action, url), key, name, fault_class,
                                  provenance, d_phrase, a_phrase, d_token, a_token)
            by_identity[(brand, model, code)].append(candidate)
    return by_identity


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


def components(clause: str, *, fuel_aware: bool = False, independent_systems: bool = False) -> list[tuple[Rule, str]]:
    matches = []
    for rule, pattern in COMPILED_RULES + (COMPILED_FUEL_RULES if fuel_aware else []) + (COMPILED_GENERAL_RULES if independent_systems else []):
        for hit in pattern.finditer(clause):
            if independent_systems and hit.start()>0 and clause[hit.start()-1].isalpha() and hit[0][0].isalpha():
                continue
            matches.append((hit.start(), hit.end(), rule))
    # Prefer the most specific overlapping term; allow distinct nearby items.
    matches.sort(key=lambda item: (0 if item[2].key == "sensor_connection" or (independent_systems and item[2].key in ('sensor_supply','sensor_return')) else 1,
                                   -(item[1] - item[0]), item[0]))
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
        if independent_systems and rule.key == 'voltage' and re.match(
            r'\s+(?:kes\w*|kapat\w*|aç\w*)', clause[end:], re.I):
            continue  # Switching power for reset/safety is not a supply fault.
        if independent_systems and rule.key == 'burner' and re.match(
            r'\s+(?:termostat\w*|sensör\w*|termik\w*)', clause[end:], re.I):
            continue  # The burner is the thermostat's location, not its cause.
        if independent_systems and rule.key in ('pcb','electronics') and re.match(
            r'\s+(?:üzerinde\w*|fiş\w*|soket\w*|bağlantı\w*)',clause[end:],re.I):
            continue
        if independent_systems and rule.key=='high_limit' and not re.search(
            r'termik|yüksek\s+limit|sıcaklık\s+koruma|limit\s+termostat',clause,re.I):
            continue
        if fuel_aware and rule.key.startswith('pressure_') and re.match(r'\s+yapılandır\w*', clause[end:], re.I):
            continue  # A configured pressure sensor is not a documented failed sensor.
        if fuel_aware and rule.key in ('pump', 'fan') and re.match(
            r'\s+(?:çalış(?:abilir|ır|ıyor)|(?:ON\s*)?\(?AÇIK\)?|açık(?:ken)?)\b', clause[end:], re.I
        ):
            continue
        if fuel_aware and rule.key == 'burner' and re.search(
            r'brülör\s+(?:yanma\s+hatası|devre\s+dışı|kapalı)', clause, re.I
        ):
            continue
        if fuel_aware and rule.fault_class == 'sensor' and re.search(
            r'(?:yüksek|aşırı)\s+sıcakl[ıi][kğ]\w*|\d+\s*°?\s*C.{0,35}(?:üst|üzer|alt|yüksek)', clause, re.I
        ) and not re.search(r'arızalı|hasar|açık\s*[/ ]\s*kısa|kısa\s+devre|açık\s+devre', clause, re.I):
            continue  # A probe reporting a temperature limit is not a failed probe.
        if re.match(r"\s+(?:kapalıyken|çalışırken|açıkken)\b", clause[end:], re.I):
            continue  # A component's operating state is context for a different fault.
        if re.match(r"\s+ile\s+iletişim\s+(?:yok|kesil\w*)", clause[end:], re.I):
            continue  # An unreachable communication endpoint is not established as faulty.
        if rule.key in ("sensor_temperature", "sensor_general") and specific_sensors:
            continue
        if rule.key == "electronics" and any(other_rule.key in ("pcb", "coding") for _, _, other_rule in chosen):
            continue
        if rule.key == "cable" and re.fullmatch(r"(?:fiş|soket)", clause[start:end], re.I) and re.match(
            r"\s*\d+\)", clause[end:]
        ):
            continue  # A parenthesized connector number is an identifier, not a fault.
        if rule.key == "gas_valve" and re.match(
            r"\s+(?:kontrol\s+(?:eden|blokaj|devre|sinyal|bileşen)\w*|aralık\s+dışı\s+akım\b|geri\s+bildirim\b|ofset\s+ayar\w*)",
            clause[end:], re.I
        ):
            continue  # Valve-control feedback does not establish a failed valve.
        if rule.fault_class == "sensor" and re.search(r"\b(?:ölçüm\s+yaparsa|ölçerse)\b", clause[end:end+60], re.I) and not re.search(
            r"(?:arız|hatalı|kopuk|kısa\s+devre)", clause[end:end+35], re.I
        ):
            continue  # A sensor reporting a measured condition is not itself diagnosed as faulty.
        if rule.fault_class == "sensor" and "ΔT" in clause and re.search(r"\b(?:prob\w*|sensör\w*)\s+ile\b", clause, re.I):
            continue  # A probe used to compare temperatures is not a source-backed failed probe.
        if rule.fault_class == "sensor" and re.search(r"sensör\w*\s+arasındaki\s+sıcaklık", clause, re.I):
            continue  # A discrepancy between two readings is not proof of either sensor failing.
        if rule.fault_class == "sensor" and re.search(
            r"prob\w*\s+(?:yer\s+değiştir\w*|değişim\w*)|yanlış\s+bağlan\w*", clause, re.I
        ) and not re.search(r"prob\w*\s+(?:arız\w*|hatalı|kısa\s+devre|kopuk\w*)", clause, re.I):
            continue  # Swapped or miswired probes support a connection issue, not a failed probe.
        if rule.key == "pump" and re.search(r"pompa\w*\s+çalış\w*", clause, re.I) and re.search(
            r"basınç\s+(?:artış\w*|fark\w*)\s+algılanmıyor", clause, re.I
        ):
            continue  # A running pump is context for the pressure fault, not pump-failure evidence.
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
    return bool(FAULT.search(clause) or CONTROL.search(clause)) and not bool(SYMPTOM.fullmatch(clause.rstrip(". ")))


def extract(raw: Raw, *, fuel_type: str | None = None, include_groups: bool = True,
            independent_action_systems: bool = False) -> list[Candidate]:
    if fuel_type not in (None, 'gas', 'electric'):
        raise ValueError('Unsupported boiler fuel type')
    candidates: dict[str, Candidate] = {}
    provenance = source_type(raw.url)

    def add(rule: Rule, field: str, phrase: str, exact_component: str) -> None:
        if independent_action_systems and rule.key in ACTION_ONLY_SYSTEM_KEYS:
            if field!='action' or not (CONTROL.search(phrase) or FUEL_CONTROL.search(phrase)):
                return
        if fuel_type == 'electric' and (rule.fault_class in ('gas_supply', 'ignition', 'combustion_air') or
                re.search(r'\b(?:gaz|baca|yanma|ateşleme|iyonizasyon|alev|brülör)\b', rule.name, re.I)):
            return
        key = rule.key
        if fuel_type and key == 'water_pressure' and re.search(
                r'yüksek\s+(?:su|tesisat|sistem)\s+basın|(?:su|tesisat|sistem)\s+basın\w*\s+(?:çok\s+)?yüksek', raw.description, re.I):
            rule = Rule(rule.key, rule.pattern, 'Yüksek tesisat su basıncı sorunu', rule.fault_class)
        if key == "sensor_temperature" and field == "description":
            if re.search(r"\bgidiş\b", phrase, re.I) and not re.search(r"\bdönüş\b", phrase, re.I):
                key = "sensor_supply"
            elif re.search(r"\bdönüş\b", phrase, re.I) and not re.search(r"\bgidiş\b", phrase, re.I):
                key = "sensor_return"
            elif re.search(r"\b(?:sıcak\s+su|kullanım\s+suyu)\b", phrase, re.I):
                key = "sensor_dhw"
            if key != rule.key:
                rule = next(item for item in RULES + FUEL_RULES + GENERAL_RULES if item.key == key)
        if key in ("sensor_temperature", "sensor_general"):
            specific = [k for k, existing in candidates.items()
                        if existing.fault_class == "sensor" and k not in ("sensor_temperature", "sensor_general")]
            if len(specific) == 1:
                key = specific[0]
                rule = next(item for item in RULES + FUEL_RULES + GENERAL_RULES if item.key == key)
        if key not in candidates:
            digest = hashlib.sha1("\0".join((raw.brand, raw.model, raw.code, key)).encode()).hexdigest()[:20]
            prefix = re.sub(r"[^a-z0-9]+", "_", raw.brand.lower().replace("ö", "o").replace("ü", "u").replace("ı", "i").replace("ç", "c").replace("ş", "s").replace("ğ", "g")).strip("_")
            candidates[key] = Candidate(raw, f"stage3_{prefix}_{digest}", rule.name, rule.fault_class, provenance,
                                        level="group" if key.startswith("group_") or (independent_action_systems and key in ACTION_ONLY_SYSTEM_KEYS) else "component")
        candidate = candidates[key]
        if field == "description" and not candidate.description_phrase:
            candidate.description_phrase = phrase
            candidate.description_token = exact_component
        if field == "action" and not candidate.action_phrase:
            candidate.action_phrase = phrase
            candidate.action_token = exact_component

    for phrase in clauses(raw.description):
        if eligible_description(phrase) or (fuel_type and (
                any(pattern.search(phrase) for _, pattern in COMPILED_FUEL_RULES) or
                re.search(r'termostat\w*\s+açık', phrase, re.I))):
            for rule, exact_component in components(phrase, fuel_aware=fuel_type is not None,
                                                   independent_systems=independent_action_systems):
                add(rule, "description", phrase, exact_component)
    action_has_control = bool(CONTROL.search(raw.action) or (fuel_type and FUEL_CONTROL.search(raw.action)))
    for phrase in clauses(raw.action, split_semicolon=not action_has_control):
        if FAULT.search(phrase) or CONTROL.search(phrase) or (independent_action_systems and
                re.search(r'\d{2,3}\s*V(?:AC|DC)?\s+besleme\s+gerilimi\s+oluştur',phrase,re.I)) or (fuel_type and (
                re.search(r'hasar\w*', phrase, re.I) or FUEL_CONTROL.search(phrase))):
            for rule, exact_component in components(phrase, fuel_aware=fuel_type is not None,
                                                   independent_systems=independent_action_systems):
                if rule.key == "fuse" and re.search(r"sigorta\w*\s+(?:kapat|aç|çıkar)\w*", phrase, re.I):
                    continue  # Switching the household fuse is a reset instruction.
                add(rule, "action", phrase, exact_component)
    if independent_action_systems:
        # Description and action may name the same temperature point at two
        # levels. Do not make the unspecific label a second possible cause.
        specific_temperature = set(candidates) & {'sensor_supply','sensor_return','sensor_dhw','sensor_tank','sensor_flue','sensor_outside','sensor_collector'}
        if specific_temperature:
            for generic in ('sensor_temperature','temperature_probe'):
                candidates.pop(generic,None)
    if not candidates and include_groups:
        for field, text in (("description", raw.description), ("action", raw.action)):
            for phrase in clauses(text):
                for rule, pattern in COMPILED_GROUP_RULES:
                    hit = pattern.search(phrase)
                    if not hit:
                        continue
                    tail = phrase[hit.end():hit.end()+45]
                    control = re.search(r"(?:kontrol|temizle|değiştir|onar|yükselt|gider|ayarla)\w*", tail, re.I)
                    action_supported = (bool(control) and not re.search(
                        r"çıkar\w*|kapat\w*|aç\w*|kes\w*|reset\w*|sıfırla\w*", tail[:control.start()], re.I
                    )) or bool(re.search(r"(?:çok\s+az|yetersiz)\s+su", hit.group(), re.I))
                    if field == "description" or action_supported:
                        add(rule, field, phrase, hit.group())
                        return list(candidates.values())
    return list(candidates.values())


def migration_sql(number: int, brand: str, candidates: list[Candidate], *,
                  raw_row_count: int | None = 5879, migration_name: str | None = None,
                  raw_brand_count: int | None = None) -> str:
    slug = MIGRATION_BRANDS[number][1] if number in MIGRATION_BRANDS else "candidate_coverage_backfill"
    file_name = (f"202609270000{number}_seed_{slug}_fault_candidates.sql" if number in MIGRATION_BRANDS
                 else f"202609270000{number}_backfill_boiler_candidate_coverage.sql")
    file_name = migration_name or file_name
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
    raw_guard = (f"  IF (SELECT count(*) FROM public.official_error_codes_raw) <> {raw_row_count} THEN\n"
                 f"    RAISE EXCEPTION 'Stage 3 stopped: official_error_codes_raw count is not {raw_row_count}';\n"
                 "  END IF;") if raw_row_count is not None else ""
    if raw_brand_count is not None:
        raw_guard += (f"\n  IF (SELECT count(*) FROM public.official_error_codes_raw WHERE brand={sql_quote(brand)}) <> {raw_brand_count} THEN\n"
                      "    RAISE EXCEPTION 'Stage 3 stopped: manufacturer raw scope differs';\n  END IF;")
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
{raw_guard}
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
    CASE WHEN s.candidate_name LIKE '% grubu' THEN 'candidate level: source-named system/group; not a verified failed part' END,
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


def prepare_backfill() -> tuple[list[Candidate], list[Candidate]]:
    """Only new, non-overlapping evidence is backfilled; old seeds aid recovery."""
    applied = read_applied_seeds()
    families = read_families()
    new: list[Candidate] = []
    recovery: list[Candidate] = []
    for raw in read_raw():
        if raw.brand == "Vaillant" and families[(raw.brand, raw.model)] == "ecotec intro":
            continue  # Family-level 00014/00015 candidates already cover both variants.
        previous = applied.get((raw.brand, raw.model, raw.code), [])
        old_keys = {candidate.key for candidate in previous}
        selected = []
        for candidate in extract(raw):
            if candidate.key in old_keys or (candidate.level == "group" and previous):
                continue
            if previous and not candidate.description_phrase:
                continue  # Existing pools are expanded only by independently described points.
            if previous and candidate.name in ("Sensör sorunu", "Sıcaklık probu sorunu") and any(
                existing.fault_class == "sensor" and (
                    candidate.name == "Sensör sorunu" or
                    not re.search(r"\b(?:gidiş|dönüş|boyler|baca)\b", candidate.description_token, re.I) or
                    any(term in candidate.description_token.casefold() and term in
                        (existing.description_token + " " + existing.action_token).casefold()
                        for term in ("gidiş", "dönüş", "boyler", "baca"))
                ) for existing in previous
            ):
                continue
            if previous and candidate.name == "Kod anahtarı sorunu" and any(
                "Kodlama/EEPROM" in existing.name for existing in previous
            ):
                continue
            if previous and candidate.name == "Sensör/elektrik bağlantısı sorunu" and any(
                existing.fault_class == "electrical" and re.search(r"kablo|soket|bağlantı", existing.name, re.I)
                for existing in previous
            ):
                continue
            if previous and candidate.name == "Yanma havası/akış sorunu" and any(
                existing.fault_class == "sensor" and "akış" in existing.name.casefold() for existing in previous
            ):
                continue
            new_tokens = [token.casefold() for token in (candidate.description_token, candidate.action_token) if token]
            old_tokens = [token.casefold() for existing in previous
                          for token in (existing.description_token, existing.action_token) if token]
            if any(a in b or b in a for a in new_tokens for b in old_tokens):
                continue  # Do not seed a second label for the same evidenced physical point.
            selected.append(candidate)
        if selected:
            new.extend(selected)
            recovery.extend(previous)  # An idempotent repair if an applied seed row is absent in live DB.
    keys = [candidate.key for candidate in new + recovery]
    if len(keys) != len(set(keys)):
        raise ValueError("Backfill candidate_key is not unique")
    return new, recovery


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
    new, recovery = prepare_backfill()
    path = MIGRATIONS / "20260927000030_backfill_boiler_candidate_coverage.sql"
    path.write_text(migration_sql(30, "tüm markalar", new + recovery), encoding="utf-8", newline="\n")
    print(f"backfill={path.name} new_component={sum(c.level == 'component' for c in new)} "
          f"new_group={sum(c.level == 'group' for c in new)} recovery={len(recovery)} "
          f"total_seed={len(new) + len(recovery)}")
