"""Offline checks for the unapplied Stage 3 fault-candidate seed generator."""

import re
import sqlite3
import unittest
from pathlib import Path
import sys


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.generate_stage3_fault_candidates import (  # noqa: E402
    MIGRATION_BRANDS,
    MIGRATIONS,
    Raw,
    extract,
    migration_sql,
    prepare,
    source_type,
)


class CandidateGenerationTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.by_number, cls.considered, cls.families = prepare()

    def candidates(self, brand, model, code):
        return [candidate for seeds in self.by_number.values() for candidate in seeds
                if (candidate.raw.brand, candidate.raw.model, candidate.raw.code) == (brand, model, code)]

    def test_bosch_fan_symptom_uses_voltage_control_point(self):
        names = [c.name for c in self.candidates("Bosch", "Class 2000 W", "C7")]
        self.assertEqual(names, ["Elektrik besleme/gerilim sorunu"])

    def test_bosch_c4_has_four_distinct_action_control_points(self):
        candidates = self.candidates("Bosch", "Condens 2500 W", "C4")
        self.assertEqual({c.name for c in candidates}, {
            "Diferansiyel basınç sensörü sorunu", "Kablolama/soket/bağlantı sorunu",
            "Bağlantı hortumu sorunu", "Atık gaz/baca sistemi sorunu",
        })
        self.assertTrue(all(c.action_phrase and not c.description_phrase for c in candidates))

    def test_atron_f03_keeps_ntc_and_cable_as_separate_candidates(self):
        candidates = self.candidates("DemirDöküm", "Atron Condense P 20-FC/3 (H-TR)", "F03")
        self.assertEqual({c.name for c in candidates}, {
            "Gidiş sıcaklık sensörü sorunu", "Kablolama/soket/bağlantı sorunu",
        })
        self.assertEqual({c.support_kind for c in candidates}, {"description", "action"})

    def test_symptom_with_generic_reset_or_service_produces_nothing(self):
        raw = Raw("Baymak", "DUOTEC", "E01", "Başarısız ateşleme",
                  "RESET tuşuna basın; sorun devam ederse yetkili servisi arayın.",
                  "https://www.baymak.com.tr/manual.pdf")
        self.assertEqual(extract(raw), [])

    def test_explicit_component_fault_survives_generic_action(self):
        raw = Raw("Baymak", "DUOTEC", "E02", "Gidiş sıcaklık sensörü arızalı",
                  "Resetleyin.", "https://www.baymak.com.tr/manual.pdf")
        candidates = extract(raw)
        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0].support_kind, "description")

    def test_multiple_action_items_before_one_control_verb_are_all_supported(self):
        raw = Raw("Bosch", "Condens 2500 W", "C4", "Fan çalışmıyor",
                  "Fanı, kabloyu ve gaz valfini kontrol edin.",
                  "https://www.bosch-homecomfort.com/manual.pdf")
        self.assertEqual({c.name for c in extract(raw)}, {
            "Fan sorunu", "Kablolama/soket/bağlantı sorunu", "Gaz valfi/armatürü sorunu",
        })

    def test_fault_class_is_semantic_not_merely_component_location(self):
        candidates = self.candidates("DemirDöküm", "Atromix P20", "F.76")
        self.assertEqual([(c.name, c.fault_class) for c in candidates],
                         [("Termostat/sıcaklık sınırlayıcısı sorunu", "sensor")])

    def test_contextual_identifiers_and_fault_effects_are_not_root_candidates(self):
        reference = Raw("Viessmann", "Vitodens", "1A",
                        "Sol akış sensörü 1 (fiş 163) arızalı.", "Sensörü değiştirin.",
                        "https://www.viessmann.com.tr/manual.pdf")
        self.assertEqual([c.name for c in extract(reference)], ["Akış/debi sensörü sorunu"])
        self.assertEqual(extract(Raw("Viessmann", "Vitodens", "F07",
                                     "brülör kapanır ve arıza durumuna geçer.", "Resetleyin.",
                                     reference.url)), [])

    def test_flue_sensor_is_not_misread_as_flue_system(self):
        raw = Raw("E.C.A.", "Model", "F53", "Baca gazı sıcaklık sensörü hatası",
                  "Yetkili servise başvurun.", "https://www.eca.com.tr/manual.pdf")
        self.assertEqual([c.name for c in extract(raw)], ["Baca gazı sensörü sorunu"])

    def test_viessmann_community_and_mirrors_are_third_party(self):
        self.assertEqual(source_type("https://community.viessmann.de/x.pdf"), "trusted_third_party")
        self.assertEqual(source_type("https://www.manualslib.de/x.pdf"), "trusted_third_party")
        self.assertEqual(source_type("https://www.viessmann.com.tr/x.pdf"), "official_manufacturer")

    def test_every_seed_has_literal_candidate_specific_evidence_and_unique_key(self):
        keys = []
        for number, (brand, _) in MIGRATION_BRANDS.items():
            for candidate in self.by_number[number]:
                keys.append(candidate.key)
                self.assertEqual(candidate.raw.brand in ("Immergas", "Alpha") if number == 23
                                 else candidate.raw.brand == brand, True)
                self.assertTrue(candidate.description_phrase or candidate.action_phrase)
                if candidate.description_phrase:
                    self.assertIn(candidate.description_phrase, candidate.raw.description)
                    self.assertIn(candidate.description_token, candidate.description_phrase)
                if candidate.action_phrase:
                    self.assertIn(candidate.action_phrase, candidate.raw.action)
                    self.assertIn(candidate.action_token, candidate.action_phrase)
                self.assertTrue(candidate.raw.url.startswith("https://"))
        self.assertEqual(len(keys), len(set(keys)))

    def test_generated_sql_matches_evidence_action_and_records_both_supports(self):
        sql = migration_sql(17, "Bosch", self.by_number[17])
        self.assertIn("coalesce(r.official_action,'')=s.evidence_action", sql)
        self.assertIn("description support:", sql)
        self.assertIn("action support:", sql)
        self.assertIn("position(s.action_support in s.evidence_action)", sql)

    def test_all_migrations_parse_as_seed_values_and_exclude_ecotec_intro(self):
        db = sqlite3.connect(":memory:")
        for number, (_, slug) in MIGRATION_BRANDS.items():
            path = MIGRATIONS / f"202609270000{number}_seed_{slug}_fault_candidates.sql"
            text = path.read_text(encoding="utf-8")
            match = re.search(r"INSERT INTO stage3_candidate_seed VALUES\n(.*?);\n\nDO", text, re.S)
            self.assertIsNotNone(match, path.name)
            rows = db.execute("SELECT * FROM (VALUES " + match[1] + ")").fetchall()
            self.assertEqual(len(rows), len(self.by_number[number]))
            self.assertTrue(all(len(row) == 14 for row in rows))
            if number == 16:
                self.assertFalse(any("ecoTEC intro" in row[1] for row in rows))


if __name__ == "__main__":
    unittest.main()
