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
    prepare_backfill,
    read_applied_seeds,
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
        self.assertTrue(all(c.action_phrase for c in candidates))
        self.assertEqual([c.name for c in candidates if c.description_phrase],
                         ["Diferansiyel basınç sensörü sorunu"])

    def test_atron_f03_keeps_ntc_and_cable_as_separate_candidates(self):
        candidates = self.candidates("DemirDöküm", "Atron Condense P 20-FC/3 (H-TR)", "F03")
        self.assertEqual({c.name for c in candidates}, {
            "Gidiş sıcaklık sensörü sorunu", "Kablolama/soket/bağlantı sorunu",
        })
        self.assertEqual({c.support_kind for c in candidates}, {"description", "action"})

    def test_named_ignition_system_with_generic_reset_produces_only_group(self):
        raw = Raw("Baymak", "DUOTEC", "E01", "Başarısız ateşleme",
                  "RESET tuşuna basın; sorun devam ederse yetkili servisi arayın.",
                  "https://www.baymak.com.tr/manual.pdf")
        self.assertEqual([(c.name, c.level) for c in extract(raw)],
                         [("Ateşleme/alev oluşumu grubu", "group")])

    def test_explicit_component_fault_survives_generic_action(self):
        raw = Raw("Baymak", "DUOTEC", "E02", "Gidiş sıcaklık sensörü arızalı",
                  "Resetleyin.", "https://www.baymak.com.tr/manual.pdf")
        candidates = extract(raw)
        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0].support_kind, "description")

    def test_nitromix_f76_extracts_all_three_literal_control_points(self):
        for model in ("nitromiX P24 NG (HEP)", "nitromiX P28 NG (HEP)", "nitromiX P35 NG (HEP)"):
            candidates = self.candidates("DemirDöküm", model, "F.76")
            self.assertEqual({c.name for c in candidates}, {
                "Termik kapatma düzeneği sorunu", "Kablolama/soket/bağlantı sorunu",
                "Eşanjör/ısı bloğu sorunu",
            })
            for candidate in candidates:
                self.assertTrue(candidate.description_phrase or candidate.action_phrase)
                self.assertEqual(candidate.source_type, "official_manufacturer")

    def test_only_system_description_creates_group_without_inventing_part(self):
        raw = Raw("Baymak", "DUOTEC", "E01", "Başarısız ateşleme",
                  "RESET tuşuna basın; sorun devam ederse yetkili servisi arayın.",
                  "https://www.baymak.com.tr/manual.pdf")
        candidates = extract(raw)
        self.assertEqual([(c.name, c.fault_class) for c in candidates],
                         [("Ateşleme/alev oluşumu grubu", "ignition")])
        self.assertEqual(candidates[0].description_phrase, "Başarısız ateşleme")
        self.assertEqual(candidates[0].action_phrase, "")

    def test_generic_symptom_and_reset_without_technical_system_remain_empty(self):
        raw = Raw("Baymak", "DUOTEC", "F00", "Genel hata",
                  "RESET tuşuna basın; sorun devam ederse yetkili servisi arayın.",
                  "https://www.baymak.com.tr/manual.pdf")
        self.assertEqual(extract(raw), [])

    def test_control_feedback_does_not_become_a_failed_gas_valve(self):
        raw = Raw("Immergas", "VICTRIX", "87",
                  "Gaz vanası kontrol blokajı: Gaz vanasını kontrol eden bileşenlerden birinde anormallik algılanır.",
                  "Yetkili servise başvurun.", "https://www.immergas.com.tr/manual.pdf")
        self.assertEqual([(c.name, c.level) for c in extract(raw)],
                         [("Gaz armatürü kontrol grubu", "group")])

    def test_probe_word_does_not_match_problem_and_reset_is_not_electrical_evidence(self):
        url = "https://www.demirdokum.com.tr/manual.pdf"
        self.assertEqual(extract(Raw("DemirDöküm", "Model", "F4", "Alev algılama problemi.",
                                     "Resetleyin.", url))[0].level, "group")
        self.assertEqual(extract(Raw("DemirDöküm", "Model", "F5", "Reset kilitlenmesi",
                                     "Güç kaynağını çıkarın ve hata nedenini kontrol edin.", url)), [])

    def test_measuring_probe_does_not_become_a_failed_part(self):
        raw = Raw("Warmhaus", "Enerwa", "Er18",
                  "Donma Arızası: CH sıcaklık probu 10 saniye boyunca 1°C'nin altında ölçüm yaparsa hata verilir.",
                  "Yetkili servise başvurun.", "https://www.warmhaus.com/manual.pdf")
        self.assertFalse(any(c.level == "component" for c in extract(raw)))

    def test_flame_outage_is_not_an_ignition_circuit_component(self):
        raw = Raw("DemirDöküm", "Nitron", "F15", "Alev devre dışı, ateşleme bloke oluyor",
                  "Resetleyin.", "https://www.demirdokum.com.tr/manual.pdf")
        self.assertTrue(all(c.level == "group" for c in extract(raw)))

    def test_switching_a_fuse_for_reset_is_not_a_fuse_fault(self):
        raw = Raw("Warmhaus", "Ewa", "E28", "Maksimum reset sayısına ulaşıldı",
                  "Kombi sigortasını kapatıp tekrar açın; temel hata nedenini kontrol edin.",
                  "https://www.warmhaus.com/manual.pdf")
        self.assertEqual(extract(raw), [])

    def test_sensor_reading_discrepancy_is_a_group_not_a_failed_sensor(self):
        raw = Raw("Vaillant", "ecoTEC", "F.84",
                  "Gidiş-dönüş sensörleri arasındaki sıcaklık yayılması geçersiz", "",
                  "https://www.vaillant.com.tr/manual.pdf")
        self.assertTrue(all(c.level == "group" for c in extract(raw)))

    def test_flow_context_does_not_claim_a_pressure_fault(self):
        raw = Raw("Warmhaus", "Ewa", "E19", "Su akış metresi ile su akışı seçimi girdi okuması",
                  "Yetkili servisi arayın.", "https://www.warmhaus.com/manual.pdf")
        self.assertEqual([c.name for c in extract(raw)], ["Su akışı/debi grubu"])

    def test_named_heat_management_unit_is_a_component_not_group_fallback(self):
        raw = Raw("Viessmann", "Vitodens", "163", "HBMU ısı yönetim ünitesi veri belleği erişim arızası",
                  "HBMU ısı yönetim ünitesini değiştirin.", "https://www.viessmann.com.tr/manual.pdf")
        self.assertIn("Isı yönetim ünitesi sorunu", [c.name for c in extract(raw)])
        self.assertTrue(all(c.level == "component" for c in extract(raw)))

    def test_running_pump_with_missing_pressure_change_is_pressure_group(self):
        raw = Raw("Vaillant", "ecoTEC", "F.75", "Pompa çalışırken basınç farkı algılanmıyor",
                  "Yetkili servise başvurun.", "https://www.vaillant.com.tr/manual.pdf")
        self.assertEqual([(c.name, c.level) for c in extract(raw)],
                         [("Su basıncı/hidrolik grubu", "group")])

    def test_ignition_context_does_not_override_delta_t_fault(self):
        raw = Raw("Warmhaus", "Ewa", "E72", "Ateşlemede Delta T sıcaklık farkı",
                  "Yetkili servise başvurun.", "https://www.warmhaus.com/manual.pdf")
        self.assertEqual([(c.name, c.level) for c in extract(raw)],
                         [("Sıcaklık farkı/ısı transferi grubu", "group")])
        spread = Raw("Vaillant", "Model", "F.023",
                     "Gidiş-dönüş arasındaki sıcaklık yayılması çok fazla", "",
                     "https://www.vaillant.com.tr/manual.pdf")
        self.assertEqual([(c.name, c.level) for c in extract(spread)],
                         [("Sıcaklık farkı/ısı transferi grubu", "group")])

    def test_named_pressure_difference_remains_group_without_inventing_sensor(self):
        raw = Raw("Vaillant", "Model", "F.94", "Vortex ve fark basıncı arızası", "",
                  "https://www.vaillant.com.tr/manual.pdf")
        self.assertEqual([(c.name, c.level) for c in extract(raw)],
                         [("Diferansiyel basınç algılama grubu", "group")])

    def test_lpg_solenoid_valve_control_point_is_component(self):
        raw = Raw("Viessmann", "Vitodens", "F.462", "LPG emniyet solenoid valfi açılmıyor",
                  "EM-EA1 üzerindeki solenoid valf bağlantısını kontrol edin.",
                  "https://www.viessmann.com.tr/manual.pdf")
        self.assertIn("Gaz valfi/armatürü sorunu", [c.name for c in extract(raw)])
        self.assertTrue(all(c.level == "component" for c in extract(raw)))

    def test_named_control_module_missing_and_selection_switch_setting(self):
        url = "https://www.eca.com.tr/manual.pdf"
        missing = Raw("E.C.A.", "Model", "35", "BCC yok / takılmamış",
                      "Yetkili servise başvurun.", url)
        self.assertEqual([c.name for c in extract(missing)], ["Kontrol modülü sorunu"])
        incompatible = Raw("E.C.A.", "Model", "34", "BCC uyumlu değil",
                           "Yetkili servise başvurun.", url)
        self.assertEqual([c.name for c in extract(incompatible)], ["Kontrol modülü sorunu"])
        switch = Raw("Buderus", "Model", "50", "Seçim şalteri (DIP Switch) pozisyon seçim hatası",
                     "Seçim şalteri pozisyon ayarlarını kontrol edin.",
                     "https://www.buderus.com/manual.pdf")
        self.assertEqual([c.name for c in extract(switch)], ["Seçim şalteri sorunu"])

    def test_named_pump_connection_and_combustion_feedback_keep_source_scope(self):
        url = "https://www.vaillant.com.tr/manual.pdf"
        connection = Raw("Vaillant", "Model", "X", "Elektrik pompa bağlantısı kesilmiş", "", url)
        self.assertEqual([c.name for c in extract(connection)], ["Pompa elektrik bağlantısı sorunu"])
        feedback = Raw("Warmhaus", "Model", "Y", "Yanma geribildirim sinyali sorunu", "",
                       "https://www.warmhaus.com/manual.pdf")
        self.assertEqual([c.name for c in extract(feedback)], ["Yanma geri bildirim grubu"])

    def test_communication_endpoint_and_swapped_probe_do_not_become_failed_parts(self):
        communication = Raw("Vaillant", "Model", "X", "Elektronik kart ile iletişim yok", "",
                            "https://www.vaillant.com.tr/manual.pdf")
        self.assertEqual([c.name for c in extract(communication)], ["Elektronik haberleşme grubu"])
        swapped = Raw("Immergas", "Model", "70",
                      "Dönüş/gidiş probu yer değiştirmiş: Cihaz bağlantılarında gidiş ve dönüş problarının yanlış bağlandığı algılanır.",
                      "Yetkili servise başvurun.", "https://www.immergas.com.tr/manual.pdf")
        self.assertEqual([c.name for c in extract(swapped)], ["Kablolama/soket/bağlantı sorunu"])

    def test_component_evidence_suppresses_group_fallback_and_keys_are_deterministic(self):
        raw = Raw("Bosch", "Condens", "C4", "Diferansiyel basınç sensörü arızası",
                  "Sensörü kontrol edin.", "https://www.bosch-homecomfort.com/manual.pdf")
        first, second = extract(raw), extract(raw)
        self.assertEqual([(c.key, c.name) for c in first], [(c.key, c.name) for c in second])
        self.assertTrue(all(c.level == "component" for c in first))

    def test_backfill_includes_only_new_points_and_recovery_rows_without_duplicate_keys(self):
        new, recovery = prepare_backfill()
        keys = [c.key for c in new + recovery]
        self.assertEqual(len(keys), len(set(keys)))
        self.assertTrue(new)
        f76 = [c for c in new + recovery if c.raw.brand == "DemirDöküm"
               and c.raw.model == "nitromiX P24 NG (HEP)" and c.raw.code == "F.76"]
        self.assertEqual({c.name for c in f76}, {
            "Termik kapatma düzeneği sorunu", "Kablolama/soket/bağlantı sorunu",
            "Eşanjör/ısı bloğu sorunu",
        })
        self.assertEqual(len(f76), 3)
        sql = migration_sql(30, "tüm markalar", new + recovery)
        self.assertIn("20260927000030_backfill_boiler_candidate_coverage.sql", sql)
        self.assertIn("candidate level: source-named system/group", sql)
        self.assertIn("WHERE NOT EXISTS (SELECT 1 FROM public.boiler_fault_candidates c WHERE c.candidate_key=s.candidate_key)", sql)
        applied_keys = {candidate.key for rows in read_applied_seeds().values() for candidate in rows}
        self.assertFalse(applied_keys.intersection(candidate.key for candidate in new))
        self.assertTrue(all(candidate.level == "component" for candidate in recovery))

    def test_committed_backfill_values_match_generator_and_keep_exact_evidence(self):
        new, recovery = prepare_backfill()
        path = MIGRATIONS / "20260927000030_backfill_boiler_candidate_coverage.sql"
        text = path.read_text(encoding="utf-8")
        self.assertEqual(text, migration_sql(30, "tüm markalar", new + recovery))
        match = re.search(r"INSERT INTO stage3_candidate_seed VALUES\n(.*?);\n\nDO", text, re.S)
        self.assertIsNotNone(match)
        rows = sqlite3.connect(":memory:").execute("SELECT * FROM (VALUES " + match[1] + ")").fetchall()
        self.assertEqual(len(rows), len(new) + len(recovery))
        self.assertTrue(all(len(row) == 14 and row[8].startswith("https://") for row in rows))

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

    def test_applied_migrations_remain_parseable_and_exclude_ecotec_intro(self):
        db = sqlite3.connect(":memory:")
        applied = read_applied_seeds()
        self.assertEqual(sum(map(len, applied.values())), 8566)
        for number, (_, slug) in MIGRATION_BRANDS.items():
            path = MIGRATIONS / f"202609270000{number}_seed_{slug}_fault_candidates.sql"
            text = path.read_text(encoding="utf-8")
            match = re.search(r"INSERT INTO stage3_candidate_seed VALUES\n(.*?);\n\nDO", text, re.S)
            self.assertIsNotNone(match, path.name)
            rows = db.execute("SELECT * FROM (VALUES " + match[1] + ")").fetchall()
            self.assertTrue(all(len(row) == 14 for row in rows))
            if number == 16:
                self.assertFalse(any("ecoTEC intro" in row[1] for row in rows))


if __name__ == "__main__":
    unittest.main()
