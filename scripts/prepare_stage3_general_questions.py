"""Add safe, reusable process inferences; retain literal manufacturer provenance."""
from __future__ import annotations
import copy
import json
import re
from dataclasses import dataclass
from collections import Counter,defaultdict
import stage3_general_data as data
import generate_stage3_question_backfill as old

NAME='20260928000036_enrich_boiler_customer_observations.sql'
NEW_QUESTIONS=[
 ('water_pressure_behavior','Göstergedeki su basıncının zaman içindeki durumu hangisi: düşüş, belirgin hızlı artış, yoksa yaklaşık sabit?',
  'display_water_pressure',False,73,['falling','rising','stable','unknown']),
 ('power_event_onset','Arıza ilk kez elektrik kesintisi veya elektriğin gidip gelmesinden hemen sonra mı başladı?',
  'power_event_onset',False,69,['yes','no','unknown']),
 ('visible_flue_obstruction','Bulunduğunuz güvenli yerden zaten görünen baca çıkışında belirgin bir engel var mı? Çıkışa ulaşmaya çalışmayın.',
  'visible_flue_obstruction',False,66,['yes','no','unknown']),
 ('visible_external_gas_valve','Dışarıdan zaten görünen gaz vanası kapalı konumda mı? Vanaya müdahale etmeyin.',
  'visible_external_gas_valve',False,68,['yes','no','unknown']),
 ('temperature_rise_cold_radiators','Cihaz ekranında sıcaklık hızla yükselirken petekler soğuk kalıyor mu?',
  'display_temperature_rise',False,72,['yes','no','unknown']),
 ('dhw_flow_reduced','Sıcak su musluğundan gelen su miktarı eskisine göre belirgin azaldı mı?',
  'dhw_flow_reduced',False,64,['yes','no','unknown']),
]

@dataclass(frozen=True)
class Item(old.SeedItem):
 fuel_type:str='gas'

def make_item(r,c,fuel):
 description=r['official_description'] or '';action=r['official_action'] or ''
 literal=next((quote for quote in re.findall(r'"([^"]+)"',c.get('evidence_note') or '') if quote in description+' | '+action),action or description)
 return Item(r['brand'],r['official_model'],'',r['error_code'],c['candidate_key'],c['candidate_name'],c['fault_class'],
   description,action,c['evidence_url'],literal,'group' if 'grubu' in c['candidate_name'] else 'component','exact',fuel)

def propose(pool):
 result=[]
 for e in old.candidate_effects(pool):
  # Heat/contact-sensitive connections can fail after warmup. That timing alone
  # neither supports nor weakens the source's wiring candidate.
  if e.question=='fault_timing_after_start' and e.answer=='after_some_time' and old.wiring(e.item):continue
  if e.item.fuel_type=='electric' and ('gas' in e.question or 'ignition' in e.question):continue
  result.append(e)
 for i in pool:
  def add(q,a,reason):result.append(old.Effect(i,q,a,'support',reason))
  context=i.description+' | '+i.action
  if old.semantic(i,r'elektrik besleme|elektrik sigortasi|sebeke|gerilim|voltaj') and old.has(context,r'elektrik|besleme|gerilim|voltaj|sebeke'):
   add('power_event_onset','yes','Elektrik kesintisi/gidip gelmesiyle açık zaman ilişkisi, kaynakta tanımlanan besleme/gerilim noktasını göreli güçlendirir; eşzamanlılık kesin neden kanıtı değildir.')
  if old.semantic(i,r'su kacagi|sizinti'):
   add('water_pressure_behavior','falling','Zaman içinde düşen kullanıcı basıncı, kaynakta belirtilen kaçak/sızıntı noktasını göreli güçlendirir; kapalı sistemde kaçak dışarıdan görünmeyebilir ve sensör yanılabilir.')
  if old.semantic(i,r'genlesme (?:kabi|tanki)'):
   add('water_pressure_behavior','rising','Isıtmada belirgin hızlı basınç artışı, kaynakta tanımlı genleşme/denge noktasını göreli güçlendirir; normal küçük basınç artışı bu cevap değildir.')
  if old.semantic(i,r'yuksek tesisat su basinci'):
   add('water_pressure_behavior','rising','Göstergede belirgin artış kaynakta yüksek basınç olarak tanımlanmış noktayı güçlendirir; gösterge doğrulanmış ölçüm değildir.')
  if old.semantic(i,r'pompa/dolasim|sirkulasyon pompasi|hidrolik dolasim|tesisat filtresi|tesisatta hava|esanjor/isi blogu') and old.thermal_context(pool) and old.display_heat_context(i):
   add('temperature_rise_cold_radiators','yes','Kullanıcı ekranındaki hızlı artışa rağmen peteklerin soğuk kalması, bu ısıl hata kaydında ısının uzaklaştırılması/dolaşım noktasını göreli güçlendirir; sensör veya gösterge yanılabilir.')
  if old.semantic(i,r'^pompa/dolasim|^sirkulasyon pompasi') and old.has(context,r'pompa|sirkulasyon'):
   add('abnormal_fan_noise','yes','Duyulabilir olağandışı çalışma sesi mevcut pompa/mekanik dönüş noktasını da göreli güçlendirebilir; sesin fandan veya pompadan geldiği kesinleştirilmez. Aynı noise evidence_group tekrar sayılmaz.')
  if old.semantic(i,r'esanjor|tesisat filtresi|su filtresi') and old.has(context,r'(?:kullanim suyu|sicak su|DHW).{0,60}(?:tikan|kirec|debi)|(?:tikan|kirec).{0,60}(?:kullanim suyu|sicak su|DHW)'):
   add('dhw_flow_reduced','yes','Kaynakta kullanım suyu yolunda tıkanma/kireç ile ilişkilendirilen mevcut nokta, gözlenen su miktarı azalmasıyla göreli güçlenir; şebeke debisi gibi başka nedenler dışlanmaz.')
  if i.fuel_type=='gas':
   if old.semantic(i,r'atik gaz|baca sistemi|baca/atik gaz') and old.has(context,r'baca|atik gaz'):
    add('visible_flue_obstruction','yes','Güvenli konumdan görülen belirgin dış engel, mevcut atık gaz yolu noktasını göreli güçlendirir; tüm baca içi veya fan arızaları dışlanmaz.')
   if old.semantic(i,r'gaz besleme|gaz giris basinci'):
    add('visible_external_gas_valve','yes','Zaten görünür vananın kapalı olduğunu açıkça gözlemek, mevcut gaz besleme noktasını güçlendirir; kullanıcıdan vana denemesi veya müdahale istenmez.')
 identities=[(e.item.key,e.question,e.answer) for e in result]
 if len(identities)!=len(set(identities)):raise ValueError('Duplicate process effect')
 return result

def render(effects,corrections):
 q=old.legacy.sql
 qs=',\n'.join('('+','.join([q(key),q(text),q(group),str(priority),q(json.dumps(options,ensure_ascii=False))+'::jsonb'])+')'
  for key,text,group,_,priority,options in NEW_QUESTIONS)
 es=',\n'.join('('+','.join(q(v) for v in (e.item.key,e.item.name,e.item.code,e.question,e.answer,e.effect,e.item.source_basis,e.note,e.item.url))+')' for e in effects)
 fixes=',\n'.join('('+q(key)+','+q(question)+','+q(answer)+')' for key,question,answer in corrections)
 return f"""-- General customer-observable process inference, separate from manufacturer causes.
-- pressure-level/trend and temperature-rise/cold-radiators deliberately share
-- evidence groups, so one physical observation is never multiplied twice.
BEGIN;
CREATE TEMP TABLE general_question_seed(question_key text PRIMARY KEY,question_text text,
 evidence_group text,priority integer,answer_options jsonb) ON COMMIT DROP;
INSERT INTO general_question_seed VALUES {qs};
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM general_question_seed s JOIN public.boiler_diagnostic_questions q USING(question_key)
  WHERE q.question_text IS DISTINCT FROM s.question_text OR q.evidence_group IS DISTINCT FROM s.evidence_group
    OR q.answer_options IS DISTINCT FROM s.answer_options OR NOT q.customer_observable OR q.is_safety_question) THEN
  RAISE EXCEPTION 'General question catalog conflict';
 END IF;
END $$;
INSERT INTO public.boiler_diagnostic_questions(question_key,question_text,answer_type,evidence_group,priority,
 answer_options,customer_observable,is_safety_question,is_active)
SELECT question_key,question_text,'single_choice',evidence_group,priority,answer_options,true,false,true
FROM general_question_seed s WHERE NOT EXISTS(SELECT 1 FROM public.boiler_diagnostic_questions q WHERE q.question_key=s.question_key);
CREATE TEMP TABLE general_effect_seed(candidate_key text, candidate_name text,error_code text,
 question_key text,answer_key text,effect text CHECK(effect IN('support','weaken')),
 source_basis text,evidence_note text,source_url text,PRIMARY KEY(candidate_key,question_key,answer_key),CHECK(answer_key<>'unknown')) ON COMMIT DROP;
INSERT INTO general_effect_seed VALUES {es};
DO $$ BEGIN
 IF (SELECT count(*) FROM general_effect_seed)<>{len(effects)} OR EXISTS(
 SELECT 1 FROM general_effect_seed s LEFT JOIN public.boiler_fault_candidates c USING(candidate_key)
 LEFT JOIN public.official_error_codes_raw r ON r.id=c.official_error_record_id
 LEFT JOIN public.boiler_diagnostic_questions q USING(question_key)
 WHERE c.id IS NULL OR r.id IS NULL OR q.id IS NULL OR c.candidate_name IS DISTINCT FROM s.candidate_name
  OR c.error_code IS DISTINCT FROM s.error_code OR c.verification_status<>'verified' OR NOT c.is_active
  OR c.evidence_url IS DISTINCT FROM s.source_url OR coalesce(length(trim(c.evidence_note)),0)=0
  OR length(trim(s.source_basis))=0 OR position(s.source_basis IN coalesce(r.official_description,'')||' | '||coalesce(r.official_action,''))=0
  OR q.is_safety_question OR NOT q.customer_observable OR NOT q.is_active OR NOT(q.answer_options ? s.answer_key)) THEN
  RAISE EXCEPTION 'General effect manufacturer record/question integrity failure';
 END IF;
 IF EXISTS(SELECT 1 FROM general_effect_seed s JOIN public.boiler_fault_candidates c USING(candidate_key)
 JOIN public.boiler_diagnostic_questions q USING(question_key) JOIN public.boiler_question_effects e ON e.candidate_id=c.id
 AND e.question_id=q.id AND e.answer_key=s.answer_key WHERE e.effect<>s.effect) THEN
  RAISE EXCEPTION 'General effect conflicts with an existing effect';
 END IF;
END $$;
INSERT INTO public.boiler_question_effects(candidate_id,question_id,answer_key,effect,evidence_note,source_url)
SELECT c.id,q.id,s.answer_key,s.effect,s.evidence_note,s.source_url FROM general_effect_seed s
JOIN public.boiler_fault_candidates c USING(candidate_key) JOIN public.boiler_diagnostic_questions q USING(question_key)
ON CONFLICT(question_id,candidate_id,answer_key) DO NOTHING;
CREATE TEMP TABLE timing_neutral_seed(candidate_key text,question_key text,answer_key text,
 PRIMARY KEY(candidate_key,question_key,answer_key)) ON COMMIT DROP;
INSERT INTO timing_neutral_seed VALUES {fixes};
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM timing_neutral_seed s JOIN public.boiler_fault_candidates c USING(candidate_key)
 JOIN public.boiler_diagnostic_questions q USING(question_key) JOIN public.boiler_question_effects e
 ON e.candidate_id=c.id AND e.question_id=q.id AND e.answer_key=s.answer_key
 WHERE e.effect NOT IN ('weaken','neutral') OR s.answer_key<>'after_some_time'
 OR q.question_key<>'fault_timing_after_start' OR c.candidate_name !~* '(kablo|soket|bağlantı)') THEN
  RAISE EXCEPTION 'Unexpected timing correction target';
 END IF;
END $$;
UPDATE public.boiler_question_effects e SET effect='neutral',evidence_note=
 coalesce(e.evidence_note,'')||' General review: warmup timing alone does not contradict heat-sensitive wiring/contact faults; neutral x1.'
FROM timing_neutral_seed s,public.boiler_fault_candidates c,public.boiler_diagnostic_questions q
WHERE c.candidate_key=s.candidate_key AND q.question_key=s.question_key AND e.candidate_id=c.id
 AND e.question_id=q.id AND e.answer_key=s.answer_key AND e.effect='weaken';
COMMIT;
"""

def main():
 tables=json.loads((data.OUT/'knowledge-candidates-after.json').read_text(encoding='utf-8'))
 raw={r['id']:r for r in tables['official_error_codes_raw']};families={f['id']:f for f in tables['boiler_model_families']}
 qs={q['id']:q for q in tables['boiler_diagnostic_questions']};cs={c['id']:c for c in tables['boiler_fault_candidates']}
 corrections=[]
 for e in tables['boiler_question_effects']:
  c=cs[e['candidate_id']];question=qs[e['question_id']]
  if question['question_key']=='fault_timing_after_start' and e['answer_key']=='after_some_time' and e['effect']=='weaken' and old.has(c['candidate_name'],r'kablo|soket|baglanti'):
   corrections.append((c['candidate_key'],question['question_key'],e['answer_key']));e['effect']='neutral'
 items=[make_item(raw[c['official_error_record_id']],c,families[c['family_id']].get('fuel_type','gas'))
   for c in cs.values() if c['is_active'] and c['verification_status']=='verified']
 existing={(cs[e['candidate_id']]['candidate_key'],qs[e['question_id']]['question_key'],e['answer_key']):e['effect'] for e in tables['boiler_question_effects']}
 by_pool=old.pools_for(items);new=[]
 for pool in by_pool.values():
  proposed=propose(pool);all_effects={(e.item.key,e.question,e.answer):e.effect for e in proposed}
  all_effects.update({identity:effect for identity,effect in existing.items() if identity[0] in {i.key for i in pool}})
  def useful(q):
   keys={a for _,question,a in all_effects if question==q and a!='unknown'}
   if len(pool)==1:return any(all_effects.get((pool[0].key,q,a))=='support' for a in keys)
   return any(len({all_effects.get((i.key,q,a),'neutral') for i in pool})>1 for a in keys)
  new.extend(e for e in proposed if (e.item.key,e.question,e.answer) not in existing and useful(e.question))
 path=old.MIGRATIONS/NAME
 if any(p.name!=NAME for p in old.MIGRATIONS.glob('*000036_*.sql')):raise ValueError('Migration number collision')
 path.write_text(render(new,corrections),encoding='utf-8')
 after=copy.deepcopy(tables);qbykey={q['question_key']:q for q in after['boiler_diagnostic_questions']}
 for key,text,group,safety,priority,options in NEW_QUESTIONS:
  if key not in qbykey:
   row=dict(id=key,question_key=key,question_text=text,evidence_group=group,is_safety_question=safety,
     priority=priority,answer_options=options,is_active=True,customer_observable=True)
   after['boiler_diagnostic_questions'].append(row);qbykey[key]=row
 cbykey={c['candidate_key']:c for c in after['boiler_fault_candidates']}
 for e in new:after['boiler_question_effects'].append(dict(candidate_id=cbykey[e.item.key]['id'],question_id=qbykey[e.question]['id'],
    answer_key=e.answer,effect=e.effect,evidence_note=e.note,source_url=e.item.url))
 (data.OUT/'knowledge-after.json').write_text(json.dumps(after,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 before=data.inventory(json.loads((data.OUT/'knowledge-before.json').read_text(encoding='utf-8')));final=data.inventory(after)
 report=dict(new_questions=len(NEW_QUESTIONS),new_effects=len(new),timing_neutral_corrections=len(corrections),
  rules=dict(Counter(e.question for e in new)),before=before,after=final,
  effects=[dict(candidate_key=e.item.key,question=e.question,answer=e.answer,effect=e.effect,reason=e.inference,source=e.item.url,basis=e.item.source_basis) for e in new])
 (data.OUT/'coverage-after.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps({k:v for k,v in report.items() if k not in ('before','after','effects')},ensure_ascii=False,indent=2))
 print(json.dumps(final['total'],ensure_ascii=False,indent=2))

if __name__=='__main__':main()
