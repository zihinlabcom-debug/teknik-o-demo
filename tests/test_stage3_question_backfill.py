"""General process-inference rules, frozen history and additive seed checks."""
import hashlib
import sys
import unittest
from dataclasses import replace
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import generate_stage3_question_backfill as seed


def item(name, basis, key=None, fault_class="electrical"):
    return seed.SeedItem("Test", "Model", "family", "X", key or name, name,
                         fault_class, basis, "", "https://example.test/manual.pdf",
                         basis, "group" if name.endswith(" grubu") else "component")


class ProcessRulesTest(unittest.TestCase):
    def effects(self, pool):
        return {(e.item.name, e.question, e.answer): e.effect for e in seed.build_new_effects(pool, [])}

    def test_thermal_workflow_uses_semantics_and_source_not_class(self):
        pool = [item("Termik kapatma düzeneği sorunu", "Termik kapatma düzeneği arızası"),
                item("Eşanjör/ısı bloğu sorunu", "Termik koruma. Eşanjörü kontrol edin."),
                item("Kablolama/soket/bağlantı sorunu", "Termik koruma. Kabloyu kontrol edin.")]
        effects = self.effects(pool)
        self.assertEqual(effects[(pool[0].name, "fault_timing_after_start", "after_some_time")], "support")
        self.assertEqual(effects[(pool[1].name, "fault_timing_after_start", "after_some_time")], "support")
        self.assertEqual(effects[(pool[2].name, "fault_timing_after_start", "after_some_time")], "weaken")
        self.assertEqual(effects, self.effects([replace(i, fault_class="sensor") for i in pool]))
        self.assertFalse(self.effects([item("Tanımlanmamış nokta", "Sensörü kontrol edin.", fault_class="hydraulic")]))

    def test_exchanger_leak_is_not_assumed_to_be_overheating(self):
        pool = [item("Eşanjör/ısı bloğu sorunu", "Eşanjör sızıntısı"),
                item("Kablolama/soket/bağlantı sorunu", "Kabloyu kontrol edin.")]
        self.assertNotIn("fault_timing_after_start", {q for _, q, _ in self.effects(pool)})

    def test_display_temperature_is_not_proof_of_a_failed_temperature_sensor(self):
        pool = [item("Termostat/sıcaklık sınırlayıcısı sorunu", "Aşırı ısınma. Limit termostatı kontrol edin."),
                item("Sıcaklık sensörü sorunu", "Aşırı ısınma. Sensörü kontrol edin.")]
        effects = self.effects(pool)
        self.assertEqual(effects[(pool[0].name, "display_temperature_rise", "yes")], "support")
        self.assertFalse(any(name == pool[1].name and q == "display_temperature_rise" for name, q, _ in effects))

    def test_ignition_sequence_is_one_group_and_different_sequences_differ(self):
        pool = [item("Gaz valfi/armatürü sorunu", "Ateşleme başarısız. Gaz valfini kontrol edin."),
                item("Ateşleme/iyonizasyon elektrodu sorunu", "Ateşleme başarısız. Elektrodu kontrol edin."),
                item("Elektronik kart/kontrol ünitesi sorunu", "Ateşleme başarısız. Kartı kontrol edin.")]
        effects = self.effects(pool)
        self.assertEqual(effects[(pool[0].name, "ignition_attempt_sequence", "clicks_no_heat")], "support")
        self.assertEqual(effects[(pool[0].name, "ignition_attempt_sequence", "silent_immediate")], "weaken")
        self.assertEqual(effects[(pool[2].name, "ignition_attempt_sequence", "clicks_no_heat")], "weaken")
        groups = [q[2] for q in seed.NEW_QUESTIONS if "ignition" in q[0]]
        self.assertEqual(groups, ["ignition_attempt_sequence"])

    def test_group_inference_does_not_name_a_new_exact_part(self):
        pool = [item("Ateşleme/alev oluşumu grubu", "Ateşleme başarısız."),
                item("Elektronik kontrol sistemi sorunu", "Ateşleme başarısız. Elektronik kontrolü kontrol edin.")]
        effects = seed.build_new_effects(pool, [])
        group_effects = [e for e in effects if e.item.level == "group"]
        self.assertTrue(group_effects)
        for e in group_effects:
            self.assertIn("grup", e.inference.lower())
            self.assertNotIn("elektrot arızalı", e.note)

    def test_generic_pressure_sensor_is_not_actual_low_pressure(self):
        pool = [item("Su basınç sensörü sorunu", "Düşük su basıncı. Sensörü kontrol edin."),
                item("Tesisat su basıncı/eksik su sorunu", "Düşük tesisat su basıncı.")]
        effects = self.effects(pool)
        self.assertNotIn((pool[0].name, "display_low_water_pressure", "yes"), effects)
        self.assertEqual(effects[(pool[1].name, "display_low_water_pressure", "yes")], "support")
        self.assertFalse(any("trend" in q[0] for q in seed.NEW_QUESTIONS))

    def test_primary_flow_sensor_is_not_heating_only(self):
        pool = [item("Gidiş sıcaklık sensörü sorunu", "Gidiş sensörünü kontrol edin."),
                item("Kullanım suyu sıcaklık sensörü sorunu", "Kullanım suyu sensörünü kontrol edin.")]
        effects = self.effects(pool)
        self.assertFalse(any(n == pool[0].name and q == "heating_dhw_scope" for n, q, _ in effects))
        self.assertEqual(effects[(pool[1].name, "heating_dhw_scope", "dhw_only")], "support")

    def test_insufficient_circulation_is_not_low_water_pressure(self):
        pool = [item("Tesisat su basıncı/eksik su sorunu", "Yetersiz sirkülasyon. Primer devrede yetersiz su dolaşımı."),
                item("Pompa/dolaşım sorunu", "Yetersiz sirkülasyon. Pompayı kontrol edin.")]
        self.assertFalse(any(q == "display_low_water_pressure" for _, q, _ in self.effects(pool)))

    def test_clicks_do_not_weaken_earthing_or_prove_ionization_ground_is_good(self):
        pool = [item("Topraklama sorunu", "Ateşleme başarısız. Topraklamayı kontrol edin."),
                item("Gaz valfi/armatürü sorunu", "Ateşleme başarısız. Gaz valfini kontrol edin.")]
        self.assertFalse(any(n == pool[0].name and q == "ignition_attempt_sequence" for n, q, _ in self.effects(pool)))

    def test_external_flue_zone_or_tank_temperature_is_not_the_main_display(self):
        for description in ("Baca gazı aşırı sıcaklık uyarısı", "Boyler aşırı sıcaklık", "Bölge 3 aşırı sıcaklık"):
            pool = [item("Aşırı sıcaklık/termik koruma grubu", description),
                    item("Kablolama/soket/bağlantı sorunu", description + ". Kabloyu kontrol edin.")]
            self.assertFalse(any(q == "display_temperature_rise" for _, q, _ in self.effects(pool)))

    def test_absent_temperature_rise_is_not_overheating_evidence(self):
        pool = [item("Pompa/dolaşım sorunu", "Üç ateşleme denemesinden sonra sıcaklık farkı artışı algılanmadı. Dolaşımı kontrol edin."),
                item("Elektronik kontrol sistemi sorunu", "Üç ateşleme denemesinden sonra sıcaklık farkı artışı algılanmadı. Kartı kontrol edin.")]
        self.assertFalse(any(q == "display_temperature_rise" for _, q, _ in self.effects(pool)))

    def test_startup_timing_is_not_multiplied_again_after_an_ignition_sequence(self):
        pool = [item("Termik kapatma düzeneği sorunu", "Ateşleme başarısız. Termik kapatmayı kontrol edin."),
                item("Elektronik kontrol sistemi sorunu", "Ateşleme başarısız. Elektronik kontrolü kontrol edin.")]
        self.assertFalse(any(q == "fault_timing_after_start" for _, q, _ in self.effects(pool)))

    def test_heating_scope_does_not_override_an_explicit_tank_fault_context(self):
        pool = [item("Radyatör/tesisat vanası sorunu", "Boyler aşırı sıcaklık. Radyatör vanalarını kontrol edin."),
                item("Kablolama/soket/bağlantı sorunu", "Boyler aşırı sıcaklık. Kabloyu kontrol edin.")]
        self.assertFalse(any(n == pool[0].name and q == "heating_dhw_scope" for n, q, _ in self.effects(pool)))

    def test_unexpected_flame_presence_is_not_failed_ignition_sequence(self):
        pool = [item("Alev oluşumu/sürekliliği grubu", "Hatalı alev oluşumu"),
                item("Elektronik kontrol sistemi sorunu", "Hatalı alev oluşumu. Kartı kontrol edin.")]
        self.assertFalse(any(q == "ignition_attempt_sequence" for _, q, _ in self.effects(pool)))

    def test_solar_heat_is_not_driven_by_the_boiler_startup_or_main_display(self):
        pool = [item("Pompa/dolaşım sorunu", "Solar kolektör aşırı sıcaklık. Pompayı kontrol edin."),
                item("Kablolama/soket/bağlantı sorunu", "Solar kolektör aşırı sıcaklık. Kabloyu kontrol edin.")]
        self.assertFalse(self.effects(pool))

    def test_uniform_pool_effect_cannot_count_as_discrimination(self):
        pool = [item("Termik kapatma düzeneği sorunu", "Termik kapatma arızası"),
                item("Termostat/sıcaklık sınırlayıcısı sorunu", "Aşırı sıcaklık. Limit termostat arızası")]
        self.assertEqual(seed.build_new_effects(pool, []), [])

    def test_singleton_can_have_observation_support_but_is_reported_separately(self):
        pool = [item("Aşırı sıcaklık/termik koruma grubu", "Aşırı sıcaklık koruması.")]
        effects = seed.build_new_effects(pool, [])
        self.assertTrue(effects)
        coverage = seed.coverage(pool, effects)
        self.assertEqual(coverage["discriminative_pools"], 0)
        self.assertEqual(coverage["supported_singleton_pools"], 1)


class AdditiveSeedTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.items = seed.load_items()
        cls.baseline = seed.load_baseline_effects(cls.items)
        cls.new = seed.build_new_effects(cls.items, cls.baseline)

    def test_applied_inventory_and_baseline_are_read_not_rebuilt(self):
        self.assertEqual(len(self.items), 10096)
        self.assertEqual(len({i.key for i in self.items}), len(self.items))
        self.assertEqual(len(self.baseline), 979)
        self.assertEqual(len(seed.BASELINE_QUESTIONS), 5)

    def test_frozen_migrations_are_byte_identical(self):
        for filename, expected in seed.FROZEN_HASHES.items():
            self.assertEqual(hashlib.sha256((seed.MIGRATIONS / filename).read_bytes()).hexdigest(), expected)

    def test_history_writer_is_disabled(self):
        with self.assertRaisesRegex(RuntimeError, "applied"):
            seed.legacy.write_catalog()
        with self.assertRaisesRegex(RuntimeError, "applied"):
            seed.legacy.write_effects([])

    def test_deterministic_additive_transaction_with_valid_evidence_and_no_eliminate(self):
        self.assertEqual(seed.render_migration(self.new), seed.render_migration(list(reversed(self.new))))
        identities = {(e.item.key, e.question, e.answer) for e in self.baseline}
        for e in self.new:
            self.assertNotIn((e.item.key, e.question, e.answer), identities)
            identities.add((e.item.key, e.question, e.answer))
            self.assertIn(e.effect, {"support", "weaken"})
            self.assertNotEqual(e.answer, "unknown")
            self.assertNotEqual(e.question, "safety_gas_smell")
            self.assertIn(e.item.source_basis, e.item.description + " | " + e.item.action)
            self.assertIn("Candidate source basis:", e.note)
            self.assertIn("Process inference:", e.note)
        sql = seed.render_migration(self.new)
        for phrase in ("BEGIN;", "COMMIT;", "RAISE EXCEPTION", "WHERE NOT EXISTS", "source_basis", "is_safety_question"):
            self.assertIn(phrase, sql)
        self.assertNotIn("UPDATE public.boiler_fault_candidates", sql)

    def test_f76_all_variants_get_matching_reusable_effects(self):
        rows = [i for i in self.items if i.brand == "DemirDöküm" and i.family == "nitromix" and i.code == "F.76"]
        self.assertEqual(len(rows), 9)
        per_model = []
        for model in sorted({i.model for i in rows}):
            keys = {i.key for i in rows if i.model == model}
            per_model.append({(e.item.name, e.question, e.answer, e.effect) for e in self.new if e.item.key in keys})
        self.assertTrue(per_model[0])
        self.assertTrue(all(effects == per_model[0] for effects in per_model))
        self.assertIn("fault_timing_after_start", {q for _, q, _, _ in per_model[0]})
        self.assertIn("display_temperature_rise", {q for _, q, _, _ in per_model[0]})

    def test_prepared_sql_rows_match_the_additive_generator_exactly(self):
        self.assertEqual(seed.OUTPUT.read_text(encoding="utf-8"), seed.render_migration(self.new))
        rows = seed.values_from(seed.OUTPUT, "stage3_effect_backfill")
        self.assertEqual(len(rows), len(self.new))
        self.assertEqual({(row[0], row[3], row[4]) for row in rows},
                         {(e.item.key, e.question, e.answer) for e in self.new})
        self.assertTrue(all(row[8].startswith("Candidate source basis:") for row in rows))

    def test_old_questions_are_unchanged_and_new_observations_are_unique(self):
        questions = seed.BASELINE_QUESTIONS + seed.NEW_QUESTIONS
        self.assertEqual(len({q[0] for q in questions}), len(questions))
        self.assertEqual(len({q[2] for q in questions}), len(questions))
        for q in seed.NEW_QUESTIONS:
            self.assertEqual(q[1].count("?"), 1)
            self.assertIn("unknown", q[5])
            for forbidden in ("multimetre", "voltaj", "direnç", "kapak", "sök", "gaz valfi"):
                self.assertNotIn(forbidden, q[1].lower())


if __name__ == "__main__":
    unittest.main()
