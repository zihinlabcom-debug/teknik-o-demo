import json
import re
import sqlite3
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import stage3_general_data as data
import generate_stage3_fault_candidates as gen
import prepare_stage3_general_enrichment as enrichment
import prepare_stage3_general_questions as questions

class GeneralSeedIntegrityTest(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.before=json.loads((data.OUT/'knowledge-before.json').read_text(encoding='utf-8'))
  cls.after=json.loads((data.OUT/'knowledge-after.json').read_text(encoding='utf-8'))
  cls.raw={r['id']:r for r in cls.after['official_error_codes_raw']}
  cls.old_ids={c['id'] for c in cls.before['boiler_fault_candidates']}
  cls.cs={c['id']:c for c in cls.after['boiler_fault_candidates']}
  cls.new=[c for c in cls.cs.values() if c['id'] not in cls.old_ids]
  cls.qs={q['id']:q for q in cls.after['boiler_diagnostic_questions']}
 def pool(self,fragment,code):
  rs=[r for r in self.raw.values() if fragment.lower() in r['official_model'].lower() and data.code(r['error_code'])==code]
  return [c for c in self.cs.values() if c['official_error_record_id'] in {r['id'] for r in rs}]
 def test_existing_raw_catalog_candidates_are_retained_byte_for_byte_in_overlay(self):
  for table in ['official_error_codes_raw','boiler_model_families','boiler_official_models','boiler_model_aliases']:
   self.assertEqual(self.before[table],self.after[table])
  for c in self.before['boiler_fault_candidates']:self.assertEqual(c,self.cs[c['id']])
 def test_new_candidates_have_literal_same_record_support_and_source_class(self):
  self.assertTrue(self.new)
  for c in self.new:
   r=self.raw[c['official_error_record_id']]
   self.assertEqual(c['evidence_url'],r['source_url'])
   self.assertEqual(c['evidence_source_type'],gen.source_type(c['evidence_url']))
   notes=re.findall(r'(description|action) support: "([^"]+)"',c['evidence_note'])
   self.assertTrue(notes,c['candidate_key'])
   for field,quote in notes:self.assertIn(quote,r['official_'+field] or '')
 def test_nitromix_f28_recovery_is_system_not_unmentioned_transformer(self):
  cs=self.pool('nitromix P','F28');self.assertTrue(cs)
  self.assertEqual({c['candidate_name'] for c in cs}&{'Ateşleme sistemi sorunu'},{'Ateşleme sistemi sorunu'})
  self.assertFalse(any('trafosu' in c['candidate_name'] for c in cs))
  signatures={tuple(sorted(c['candidate_name'] for c in cs if c['official_error_record_id']==rid)) for rid in {c['official_error_record_id'] for c in cs}}
  self.assertEqual(len(signatures),1);self.assertEqual(len(next(iter(signatures))),8)
 def test_nitromix_f76_and_copa_electric_source_points_remain(self):
  f76=self.pool('nitromix P','F76');self.assertEqual(len({c['candidate_name'] for c in f76}),3)
  self.assertTrue(any('soket' in c['candidate_name'] for c in f76))
  self.assertEqual({c['candidate_name'] for c in self.pool('e-Lecto 24','F47')},
    {'Su basınç sensörü sorunu','Kablolama/soket/bağlantı sorunu'})
  self.assertEqual({c['candidate_name'] for c in self.pool('e-Lecto 24','F34')},{'Elektrik besleme/gerilim sorunu'})
 def test_duplicate_orphan_empty_source_and_key_counts_are_zero(self):
  audit=data.inventory(self.after)['total']
  for metric in ['duplicate_raw','duplicate_semantic_candidate','orphan_candidates','empty_raw_source','empty_candidate_source']:
   self.assertEqual(audit[metric],0,metric)
  self.assertEqual(len(self.cs),len({c['candidate_key'] for c in self.cs.values()}))
 def test_unknown_safety_and_electric_effects_are_not_fabricated(self):
  families={f['id']:f for f in self.after['boiler_model_families']}
  for e in self.after['boiler_question_effects']:
   c=self.cs[e['candidate_id']];q=self.qs[e['question_id']]
   self.assertNotEqual(e['answer_key'],'unknown');self.assertFalse(q['is_safety_question'])
   if families[c['family_id']].get('fuel_type')=='electric':self.assertTrue(data.allowed_question(q,'electric'))
  new_keys={q[0] for q in questions.NEW_QUESTIONS}
  self.assertEqual(self.qs['water_pressure_behavior']['evidence_group'],'display_water_pressure')
  self.assertEqual(self.qs['temperature_rise_cold_radiators']['evidence_group'],'display_temperature_rise')
  self.assertTrue(new_keys<={q['question_key'] for q in self.qs.values()})
 def test_warmup_does_not_mechanically_weaken_any_wiring_point(self):
  for e in self.after['boiler_question_effects']:
   if self.qs[e['question_id']]['question_key']=='fault_timing_after_start' and e['answer_key']=='after_some_time' and re.search('kablo|soket|bağlantı',self.cs[e['candidate_id']]['candidate_name'],re.I):
    self.assertNotEqual(e['effect'],'weaken')
 def test_new_migration_seed_values_match_overlay_and_are_guarded_additions(self):
  candidate_sql=(gen.MIGRATIONS/enrichment.NAME).read_text(encoding='utf-8')
  block=re.search(r'INSERT INTO stage3_candidate_seed VALUES\n(.*?);\n',candidate_sql,re.S)[1]
  with sqlite3.connect(':memory:') as db:rows=list(db.execute('SELECT * FROM (VALUES '+block+')'))
  self.assertEqual(len(rows),len(self.new));self.assertEqual({r[3] for r in rows},{c['candidate_key'] for c in self.new})
  for r in rows:
   self.assertTrue(r[10] or r[11]);self.assertTrue(not r[10] or r[10] in r[6]);self.assertTrue(not r[11] or r[11] in r[7])
  sql=(gen.MIGRATIONS/questions.NAME).read_text(encoding='utf-8')
  block=re.search(r'INSERT INTO general_effect_seed VALUES (.*?);\nDO',sql,re.S)[1]
  with sqlite3.connect(':memory:') as db:es=list(db.execute('SELECT * FROM (VALUES '+block+')'))
  expected=json.loads((data.OUT/'coverage-after.json').read_text(encoding='utf-8'))
  self.assertEqual(len(es),expected['new_effects'])
  by_key={c['candidate_key']:c for c in self.cs.values()}
  for row in es:
   c=by_key[row[0]];r=self.raw[c['official_error_record_id']]
   self.assertEqual(row[1],c['candidate_name']);self.assertEqual(row[2],c['error_code'])
   self.assertIn(row[6],(r['official_description'] or '')+' | '+(r['official_action'] or ''))
   self.assertEqual(row[8],r['source_url']);self.assertIn(row[5],['support','weaken'])
  self.assertIn('ON CONFLICT(question_id,candidate_id,answer_key) DO NOTHING',sql)
  self.assertIn('General effect conflicts with an existing effect',sql)
  self.assertIn("e.effect='weaken'",sql)

if __name__=='__main__':unittest.main()
