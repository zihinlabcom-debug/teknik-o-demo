import hashlib
import json
import re
import sqlite3
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import prepare_copa_stage3 as copa
import generate_stage3_fault_candidates as gen

class CopaTest(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.data=copa.prepare()
  cls.review,cls.families,cls.raw,cls.models,cls.aliases,cls.audit,cls.blanks,cls.cs,cls.items,cls.effects,cls.catalog=cls.data
 def names(self,model,code):return {c.name for c in self.cs if c.raw.model==model and c.raw.code==code}
 def test_input_audit_and_workbook_is_unmodified(self):
  self.assertEqual(len(self.raw),185);self.assertEqual(len(self.families),5)
  self.assertEqual(len({r.model for r in self.raw}),11)
  self.assertFalse(any(self.blanks.values()))
  self.assertEqual(hashlib.sha256(copa.INPUT.read_bytes()).hexdigest(),self.review['workbook_sha256'])
 def test_sources_are_official_pinned_and_complete(self):
  self.assertEqual(len(self.review['sources']),5)
  self.assertTrue(all(r['source_verified'] for r in self.audit))
  self.assertTrue(all(gen.source_type(r.url)=='official_manufacturer' for r in self.raw))
 def test_source_corrections_do_not_reuse_eomix_causes_for_plus(self):
  self.assertEqual(self.names('Eomix Plus 24 kW','E01'),set())
  self.assertEqual(self.names('Eomix Plus 24 kW','E03'),{'Gidiş sıcaklık sensörü sorunu'})
  self.assertEqual(self.names('Eomix Plus 24 kW','E44'),{'Gaz vanası geri bildirim/kontrol devresi sorunu'})
  self.assertEqual(self.names('Eomix Plus 24 kW','E08'),{'Tesisat su basıncı/eksik su sorunu'})
  self.assertTrue(all(e.item.code!='E45' or e.item.family!='Eomix Plus' for e in self.effects))
 def test_electric_scope_and_documented_points(self):
  self.assertEqual(self.names('e-Lecto 24 kW','F47'),{'Su basınç sensörü sorunu','Kablolama/soket/bağlantı sorunu'})
  self.assertEqual(self.names('e-Lecto 24 kW','F34'),{'Elektrik besleme/gerilim sorunu'})
  self.assertEqual(self.names('e-Lecto 24 kW','E03'),{'Yüksek limit / termik koruma noktası','Devre kesici geri bildirim/kontrol noktası'})
  for code,fragment in [('F33','Dönüş'),('F35','Gidiş'),('F39','Dış'),('F52','Kullanım suyu'),('F70','Pompa')]:
   self.assertTrue(any(fragment in n for n in self.names('e-Lecto 24 kW',code)))
  self.assertFalse(any(r.model=='e-Lecto 12 kW' for r in self.raw))
  self.assertEqual(sum(m['fuel_type']=='electric' for m in self.models.values()),6)
 def test_no_electric_combustion_candidates_or_effects(self):
  self.assertTrue(all(c.fault_class not in ('gas_supply','ignition','combustion_air') for c in self.cs if c.raw.model.startswith('e-Lecto')))
  self.assertTrue(all(e.question not in ('safety_gas_smell','gas_other_appliance','ignition_attempt_sequence') for e in self.effects if e.item.family=='e-Lecto'))
  # Reusable fuel guard also rejects misleading boilerplate from any brand.
  raw=gen.Raw('COPA','Any electric device','X1','Gaz valfi arızası','Gaz valfini kontrol edin.','https://www.copa.com.tr/manual.pdf')
  self.assertEqual(gen.extract(raw,fuel_type='electric',include_groups=False),[])
 def test_only_literal_source_backed_candidates_and_distinct_keys(self):
  self.assertEqual(len(self.cs),len({c.key for c in self.cs}))
  self.assertEqual(len(self.cs),len({(c.raw.model,c.raw.code,c.name,c.fault_class) for c in self.cs}))
  for c in self.cs:
   self.assertTrue(c.description_phrase or c.action_phrase)
   if c.description_phrase:self.assertIn(c.description_phrase,c.raw.description)
   if c.action_phrase:self.assertIn(c.action_phrase,c.raw.action)
 def test_signal_vs_component_and_temperature_vs_failed_probe(self):
  self.assertEqual(self.names('Eomix Plus 24 kW','E06'),{'Yüksek limit / termik koruma noktası'})
  self.assertEqual(self.names('e-Lecto 24 kW','E80'),{'NTC gidiş/dönüş eşleşme-kontrol noktası'})
  self.assertEqual(self.names('e-Lecto 24 kW','F13'),set())
  self.assertEqual(self.names('e-Lecto 24 kW','F40'),{'Yüksek tesisat su basıncı sorunu'})
 def test_reusable_extraction_works_for_another_brand_and_arbitrary_code(self):
  raw=gen.Raw('Vaillant','Unseen electric model','X123','DHW NTC prob hatası','DHW NTC probu hasarlıdır.','https://www.vaillant.com.tr/manual.pdf')
  self.assertEqual({c.name for c in gen.extract(raw,fuel_type='electric',include_groups=False)},{'Kullanım suyu sıcaklık sensörü sorunu'})
 def test_existing_catalog_only_unknown_neutral_no_eliminate(self):
  keys={q[0] for q in self.catalog}
  self.assertTrue(all(e.question in keys and e.effect in ('support','weaken') and e.answer!='unknown' for e in self.effects))
  self.assertEqual(len(self.effects),len({(e.item.key,e.question,e.answer) for e in self.effects}))
 def test_migrations_and_fixture_agree_and_are_idempotent_additions(self):
  root=gen.MIGRATIONS
  sql=(root/copa.NAMES[0]).read_text(encoding='utf-8')
  self.assertEqual(sql,copa.identity_sql(self.families,self.raw,self.models,self.aliases))
  self.assertIn('WHERE NOT EXISTS',sql);self.assertIn('ON CONFLICT',sql)
  self.assertIn("CHECK (fuel_type IN ('gas','electric'))",sql)
  block=re.search(r'INSERT INTO copa_raw_seed VALUES\n(.*?);\nDO',sql,re.S)[1]
  with sqlite3.connect(':memory:') as db:rows=list(db.execute('SELECT * FROM (VALUES '+block+')'))
  self.assertEqual(len(rows),185);self.assertEqual(len({(r[0],r[1],r[2]) for r in rows}),185)
  cs_sql=(root/copa.NAMES[1]).read_text(encoding='utf-8')
  self.assertEqual(cs_sql,gen.migration_sql(33,'COPA',self.cs,raw_row_count=None,raw_brand_count=185,migration_name=copa.NAMES[1]))
  self.assertIn('official_error_record_id',cs_sql);self.assertIn('position(s.action_support',cs_sql)
  self.assertEqual((root/copa.NAMES[2]).read_text(encoding='utf-8'),copa.questions.render_migration(self.effects))
  fixture=json.loads((copa.ROOT/'tests/fixtures/copa-stage3.json').read_text(encoding='utf-8'))
  self.assertEqual(len(fixture['candidates']),len(self.cs));self.assertEqual(len(fixture['effects']),len(self.effects))

if __name__=='__main__':unittest.main()
