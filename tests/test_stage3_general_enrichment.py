import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import generate_stage3_fault_candidates as gen
import prepare_stage3_general_enrichment as enrichment


class ExistingBatchOverlapTest(unittest.TestCase):
 def test_existing_parent_does_not_suppress_new_distinct_sensor(self):
  tables=dict(official_error_codes_raw=[dict(id=1,brand='Other',official_model='Model',error_code='X99',
    official_description='S1 sensörü arızası.',official_action='S2 gidiş NTC sensörünü kontrol edin.',source_url='https://www.copa.com.tr/manual.pdf')],
    boiler_model_families=[dict(id='family',brand='Other',is_active=True)],
    boiler_official_models=[dict(id='model',family_id='family',official_model_name='Model',is_active=True)],
    boiler_fault_candidates=[dict(official_error_record_id=1,candidate_name='Sensör sorunu',fault_class='sensor',
      verification_status='verified',is_active=True,evidence_note='description support: "S1 sensörü arızası."')])
  recovered,_=enrichment.recover(tables)
  self.assertIn('Gidiş sıcaklık sensörü sorunu',{c.name for _,_,_,c in recovered})


class GeneralExtractionTest(unittest.TestCase):
 def test_general_sensor_and_ntc_across_fields_are_one_source_point(self):
  cs=self.extract('NTC sıcaklık dalgalanması hatası','Sistem basıncı, sensörlerin boruya teması ve sistemdeki su miktarı kontrol edilir.')
  self.assertEqual({c.name for c in cs},{'Sıcaklık sensörü sorunu','Tesisat su basıncı/eksik su sorunu'})
  sensor=next(c for c in cs if c.fault_class=='sensor')
  self.assertTrue(sensor.description_phrase);self.assertTrue(sensor.action_phrase)
 def test_general_electronic_and_pcb_across_fields_are_one_source_point(self):
  cs=self.extract('Elektronik izleme/kontrol problemi.','Topraklama ve kart bağlantılarını kontrol edin; ana kartı kontrol edin/değiştirin.')
  self.assertEqual(sum(c.fault_class=='electronic' for c in cs),1)
  pcb=next(c for c in cs if c.fault_class=='electronic')
  self.assertEqual(pcb.name,'Elektronik kart/kontrol ünitesi sorunu')
  self.assertTrue(pcb.description_phrase);self.assertTrue(pcb.action_phrase)
 def test_distinct_temperature_and_pressure_sensors_are_not_merged(self):
  cs=self.extract('Su basınç sensörü arızası.','NTC sıcaklık sensörünü ve su basınç sensörünü kontrol edin.')
  self.assertIn('Sıcaklık sensörü sorunu',{c.name for c in cs})
  self.assertIn('Su basınç sensörü sorunu',{c.name for c in cs})
 def test_distinct_sensor_identifiers_are_not_parent_specific_aliases(self):
  cs=self.extract('S1 sensörü arızası.','S2 NTC sensörünü kontrol edin.')
  self.assertEqual(sum(c.fault_class=='sensor' for c in cs),2)
 def test_action_generic_sensor_does_not_attach_to_other_description_sensor(self):
  cs=self.extract('S1 gidiş NTC arızası.','S2 NTC sensörünü kontrol edin.')
  self.assertEqual(sum(c.fault_class=='sensor' for c in cs),2)
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
