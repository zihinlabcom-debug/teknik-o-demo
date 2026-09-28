import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import prepare_stage3_general_questions as general

class GeneralQuestionTest(unittest.TestCase):
 def item(self,name,description,action='',fuel='gas'):
  return general.make_item(dict(brand='Any',official_model='Any',error_code='X',official_description=description,
    official_action=action,source_url='https://www.copa.com.tr/manual.pdf'),
    dict(candidate_key=name,candidate_name=name,fault_class='electrical',evidence_note='',evidence_url='https://www.copa.com.tr/manual.pdf'),fuel)
 def test_wiring_is_not_weakened_only_because_fault_started_after_running(self):
  items=[self.item('Kablolama/soket/bağlantı sorunu','Termik kapatma arızası','Kablolar kontrol edilir.'),
    self.item('Eşanjör/ısı bloğu sorunu','Termik kapatma arızası','Eşanjör kontrol edilir.')]
  effects=general.propose(items)
  self.assertFalse(any(e.item.name.startswith('Kablolama') and e.answer=='after_some_time' and e.effect!='neutral' for e in effects))
 def test_pressure_sensor_and_wiring_are_not_falsely_separated_by_actual_pressure(self):
  items=[self.item('Su basınç sensörü sorunu','Su basınç sensörü arızası','Sensör ve kablo kontrol edilir.','electric'),
    self.item('Kablolama/soket/bağlantı sorunu','Su basınç sensörü arızası','Sensör ve kablo kontrol edilir.','electric')]
  self.assertEqual(general.propose(items),[])
 def test_voltage_point_has_safe_observable_onset_and_electric_excludes_gas(self):
  effects=general.propose([self.item('Elektrik besleme/gerilim sorunu','Düşük voltaj','Besleme gerilimi kontrol edilir.','electric')])
  self.assertTrue(any(e.question=='power_event_onset' for e in effects))
  self.assertTrue(all('gaz' not in e.question and 'ignition' not in e.question for e in effects))
 def test_unknown_safety_and_eliminate_are_never_generated(self):
  items=[self.item('Gaz beslemesi sorunu','Ateşleme başarısız','Gaz beslemesi kontrol edilir.'),
    self.item('Atık gaz/baca sistemi sorunu','Ateşleme başarısız','Baca yolunu kontrol edin.')]
  es=general.propose(items)
  self.assertTrue(es)
  self.assertTrue(all(e.answer!='unknown' and e.effect in ('support','weaken') and e.question!='safety_gas_smell' for e in es))

if __name__=='__main__':unittest.main()
