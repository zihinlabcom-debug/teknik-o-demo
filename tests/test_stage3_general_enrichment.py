import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import generate_stage3_fault_candidates as gen


class GeneralExtractionTest(unittest.TestCase):
 def extract(self,description,action,fuel='gas'):
  raw=gen.Raw('Unseen manufacturer','Unseen model','X99',description,action,'https://www.copa.com.tr/manual.pdf')
  return gen.extract(raw,fuel_type=fuel,include_groups=False,independent_action_systems=True)
 def test_independent_action_system_survives_other_components(self):
  cs=self.extract('Ateşleme başarısız','Gaz armatürü, kablo, ateşleme, topraklama ve elektronik kontrol edilir.')
  names={c.name for c in cs}
  self.assertIn('Ateşleme sistemi sorunu',names)
  self.assertTrue(any('Gaz valfi' in n for n in names))
  self.assertFalse(any('trafosu' in n for n in names))
 def test_component_and_same_physical_generic_system_do_not_duplicate(self):
  cs=self.extract('Başlatma hatası','Gaz valfi kontrol edilir.')
  self.assertEqual(len(cs),1)
  self.assertFalse(any('Gaz sistemi' in c.name for c in cs))
 def test_passive_check_and_control_function_are_action_supported(self):
  cs=self.extract('Başlatma hatası','Termik kapatma ve yoğuşma gideri fonksiyonu kontrol edilir; ateşleme ölçülür.')
  names={c.name for c in cs}
  self.assertIn('Termik kapatma düzeneği sorunu',names)
  self.assertIn('Yoğuşma suyu gideri sorunu',names)
  self.assertIn('Ateşleme sistemi sorunu',names)
 def test_reset_only_symptom_does_not_invent_cause(self):
  self.assertEqual(self.extract('Ateşleme başarısız','Reset yapın; servis çağırın.'),[])
 def test_other_error_transformer_evidence_does_not_move_into_ignition(self):
  ignition=self.extract('Ateşleme başarısız','Ateşleme kontrol edilir.')
  transformer=self.extract('Trafo arızası','Ateşleme trafosu kontrol edilir.')
  self.assertEqual({c.name for c in ignition},{'Ateşleme sistemi sorunu'})
  self.assertTrue(any('trafosu' in c.name for c in transformer))
  self.assertFalse(any(c.name=='Ateşleme sistemi sorunu' for c in transformer))
 def test_electric_profile_never_recovers_combustion_system(self):
  cs=self.extract('Hata','Gaz valfi, ateşleme ve pompa kontrol edilir.','electric')
  self.assertTrue(cs)
  self.assertTrue(all(c.fault_class not in ('gas_supply','ignition','combustion_air') for c in cs))
 def test_action_is_explanation_not_control_does_not_add_ignition(self):
  self.assertEqual(self.extract('Ateşleme başarısız','Arka arkaya beş başarısız ateşleme denemesinden sonra ürün arıza konumuna geçer.'),[])
 def test_unicode_substring_does_not_turn_flow_probe_into_outside_probe(self):
  names={c.name for c in self.extract('Gidiş probu arızası','Gidiş NTC probunda anormallik algılanır.')}
  self.assertNotIn('Dış sıcaklık sensörü sorunu',names)
  self.assertIn('Gidiş sıcaklık sensörü sorunu',names)
 def test_board_socket_location_is_not_board_fault(self):
  names={c.name for c in self.extract('Bağlantı arızası','Elektronik kart üzerindeki çoklu soket tam takılmamış.')}
  self.assertNotIn('Elektronik kart/kontrol ünitesi sorunu',names)
  self.assertTrue(any('bağlantı' in n for n in names))
 def test_electronics_temperature_does_not_invent_a_high_limit_device(self):
  names={c.name for c in self.extract('Elektronikte yüksek sıcaklık arızası','Elektronik kart kontrol edilir.')}
  self.assertNotIn('Yüksek limit / termik koruma noktası',names)
 def test_switching_power_off_for_reset_is_not_a_supply_control_point(self):
  self.assertEqual(self.extract('Çok fazla resetleme.','Tekrarında cihazın elektrik beslemesini kesip teknik servis kontrolü gerekir.'),[])
 def test_burner_thermostat_location_is_not_a_burner_cause(self):
  names={c.name for c in self.extract('Brülör termostatı aşırı sıcaklık algıladı veya kontak bağlantısı açık.','Arıza nedeni giderildikten sonra reset gerekir.')}
  self.assertNotIn('Brülör/yanma sorunu',names)
 def test_generic_temperature_and_specific_probe_do_not_count_twice_across_fields(self):
  cs=self.extract('Sıcaklık sensöründe kısa devre.','Boyler sıcaklık sensörü kontrol edilir.')
  self.assertEqual({c.name for c in cs},{'Boyler sıcaklık sensörü sorunu'})


if __name__=='__main__':unittest.main()
