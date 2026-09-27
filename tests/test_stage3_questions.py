"""Offline checks for the conservative Stage 3 question/effect seed."""

import sys
import sqlite3
import unittest
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import generate_stage3_questions as seed


class Stage3QuestionsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.items = seed.load_items()
        cls.pools, cls.effects = seed.build_effects(cls.items)

    def test_candidate_inventory_is_unchanged(self):
        self.assertEqual(len(self.items), 8664)
        self.assertEqual(len({item.key for item in self.items}), 8664)
        self.assertEqual(len(self.pools), 4370)

    def test_question_catalog_is_small_safe_and_semantically_unique(self):
        self.assertEqual(len(seed.QUESTIONS), 5)
        self.assertEqual(len({q[0] for q in seed.QUESTIONS}), len(seed.QUESTIONS))
        self.assertEqual(len({q[2] for q in seed.QUESTIONS}), len(seed.QUESTIONS))
        forbidden = ("multimetre", "voltaj", "ohm", "kapağı aç", "soket", "gaz basıncını ölç")
        for _, text, group, _, _, options in seed.QUESTIONS:
            self.assertTrue(text.strip() and group.strip())
            self.assertTrue(text.endswith("?"))
            self.assertTrue(all(word not in text.lower() for word in forbidden))
            self.assertEqual(options, ["yes", "no", "unknown"])

    def test_every_effect_is_source_grounded_and_within_multi_candidate_pool(self):
        seen = set()
        for item, question, answer, effect, phrase in self.effects:
            identity = (item.key, question, answer)
            self.assertNotIn(identity, seen)
            seen.add(identity)
            self.assertIn(phrase.lower(), (item.description + " | " + item.action).lower())
            self.assertGreaterEqual(len({i.name for i in self.pools[(item.brand,item.model,item.code)]}), 2)
            self.assertIn(effect, {"support", "weaken"})
            self.assertNotEqual(answer, "unknown")
            self.assertNotEqual(question, "safety_gas_smell")
        self.assertEqual(len(self.effects), 979)

    def test_gas_observation_is_not_assigned_to_boiler_gas_valve(self):
        self.assertTrue(any(q == "gas_other_appliance" for _,q,_,_,_ in self.effects))
        self.assertFalse(any(q == "gas_other_appliance" and "valfi" in item.name.lower()
                             for item,q,_,_,_ in self.effects))

    def test_required_spot_pools_are_conservative(self):
        checks = [("Vaillant", "ecoTEC intro VUW 18/24 AS/1-1", "F.28", {"gas_other_appliance"}),
                  ("Bosch", "Condens 2500 W", "C4", set()),
                  ("DemirDöküm", "Atron Condense", "F03", set()),
                  ("DemirDöküm", "Atromix", "F.76", set()),
                  ("Viessmann", "Vitodens 222-F B2TE", "F.683", {"abnormal_fan_noise"})]
        for brand, model, code, expected in checks:
            keys = {i.key for i in self.items if i.brand == brand and i.model.startswith(model) and i.code == code}
            self.assertTrue(keys)
            self.assertEqual({q for i,q,_,_,_ in self.effects if i.key in keys}, expected)

    def test_ddl_drafts_have_transaction_guards_and_no_unknown_effect(self):
        migration_dir = seed.MIGRATIONS
        for number in (28,29):
            files = list(migration_dir.glob(f"202609270000{number}*.sql"))
            self.assertEqual(len(files), 1)
            text = files[0].read_text(encoding="utf-8")
            self.assertIn("BEGIN;", text)
            self.assertIn("COMMIT;", text)
            self.assertIn("RAISE EXCEPTION", text)
            self.assertIn("WHERE NOT EXISTS", text)
        effect_sql = files[0].read_text(encoding="utf-8")
        self.assertIn("answer_key IN ('yes','no')", effect_sql)
        self.assertIn("candidate_key,question_key,answer_key", effect_sql)
        values = effect_sql.split("INSERT INTO stage3_effect_seed VALUES\n", 1)[1].split(";\nDO $$", 1)[0]
        rows = list(sqlite3.connect(":memory:").execute("SELECT * FROM (VALUES " + values + ")"))
        self.assertEqual(len(rows), len(self.effects))
        self.assertEqual({(row[0],row[3],row[4]) for row in rows},
                         {(item.key,question,answer) for item,question,answer,_,_ in self.effects})


if __name__ == "__main__":
    unittest.main()
