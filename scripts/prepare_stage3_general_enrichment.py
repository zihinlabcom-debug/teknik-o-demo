"""General, offline enrichment over live technical inventory + prepared imports.
Never applies migrations or changes applied/COPA migration files.
"""
from __future__ import annotations
import copy
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
import stage3_general_data as data
import generate_stage3_fault_candidates as gen

OUT=data.OUT
NAME='20260928000035_enrich_boiler_action_control_points.sql'


def point_keys(name):
    keys={r.key for r,_ in gen.components(name,fuel_aware=True,independent_systems=True)}
    aliases={'gas_pressure':'gas_supply','pcb':'electronics','condensate':'condensate_drain',
             'siphon':'condensate_drain','sensor_connection':'cable','pump_connection':'cable'}
    keys={aliases.get(k,k) for k in keys}
    n=data.norm(name)
    if 'atesleme' in n and any(s in n for s in ('sistem','grubu','olusumu')):keys.add('ignition_system')
    if 'alev algilama' in n:keys.add('group_flame_detection')
    if 'gaz besleme' in n or 'gaz giris' in n:keys.add('gas_supply')
    if not keys:keys.add('label:'+n)
    return keys


def recover(tables):
    raw=tables['official_error_codes_raw'];by_raw=defaultdict(list)
    for c in tables['boiler_fault_candidates']:
        if c['verification_status']=='verified' and c['is_active']:by_raw[c['official_error_record_id']].append(c)
    families={f['id']:f for f in tables['boiler_model_families'] if f['is_active']}
    models={(data.norm(families[m['family_id']]['brand']),data.norm(m['official_model_name'])):m
      for m in tables['boiler_official_models'] if m['is_active'] and m['family_id'] in families}
    recovered=[];scan=[]
    for r in raw:
        model=models.get((data.norm(r['brand']),data.norm(r['official_model'])))
        if not model:
            scan.append(dict(raw_id=r['id'],brand=r['brand'],model=r['official_model'],code=r['error_code'],reason='E',detail='Official model catalog scope missing'))
            continue
        family=families[model['family_id']];fuel=family.get('fuel_type','gas')
        source=gen.Raw(r['brand'],r['official_model'],r['error_code'],r['official_description'] or '',r['official_action'] or '',r['source_url'] or '')
        proposed=gen.extract(source,fuel_type=fuel,include_groups=False,independent_action_systems=True)
        existing=list(by_raw[r['id']]);covered=set().union(*(point_keys(c['candidate_name']) for c in existing)) if existing else set()
        if gen.source_type(source.url) not in ('official_manufacturer','trusted_third_party'):
            proposed=[]
        for c in proposed:
            points=point_keys(c.name)
            if covered&points:continue
            # Parent/specific overlap is safe only with one known physical point.
            # A pressure sensor must never suppress a different temperature NTC.
            generic={'Sensör sorunu','Sıcaklık sensörü sorunu','Sıcaklık probu sorunu'}
            named={x['candidate_name'] for x in existing if x['fault_class']=='sensor' and x['candidate_name'] not in generic}
            named.update(p.name for p in proposed if p.fault_class=='sensor' and p.name not in generic)
            temperature={'Sıcaklık sensörü sorunu','Sıcaklık probu sorunu'}
            only_temperature={name for name in named if 'sıcaklık' in name.lower() or 'probu' in name.lower()}
            def compatible(existing_candidate):
                note=existing_candidate.get('evidence_note','')
                if not note or len(gen.source_identifiers(source.description+' '+source.action))>1:return False
                old_point=gen.source_point_markers(note)
                new_point=gen.source_point_markers(c.description_phrase+' '+c.action_phrase)
                return not (old_point and new_point and old_point!=new_point)
            if c.name in generic and any(x['fault_class']=='sensor' for x in existing):
                potential=named if c.name=='Sensör sorunu' else only_temperature
                if len(potential)==1 and any(x['candidate_name'] in potential and compatible(x) for x in existing):continue
            if c.fault_class=='sensor' and c.name not in generic and len(named)==1 and any(
                x['candidate_name']=='Sensör sorunu' or x['candidate_name'] in temperature and c.name in only_temperature
                for x in existing if x['fault_class']=='sensor' and compatible(x)):continue
            recovered.append((r,model,family,c));covered.update(points)
            # Check the complete existing + proposed batch, not just old DB rows.
            existing.append(dict(candidate_name=c.name,fault_class=c.fault_class,evidence_note=c.description_phrase+' '+c.action_phrase))
            scan.append(dict(raw_id=r['id'],brand=r['brand'],model=r['official_model'],code=r['error_code'],
              candidate_key=c.key,candidate_name=c.name,source_type=c.source_type,source_url=c.raw.url,
              description_support=c.description_phrase,action_support=c.action_phrase,
              level=c.level,reason='recovered_source_control_point'))
    return recovered,scan


def overlay_candidates(tables,recovered):
    after=copy.deepcopy(tables)
    for r,m,f,c in recovered:
        after['boiler_fault_candidates'].append(dict(id=c.key,official_error_record_id=r['id'],
          family_id=f['id'],official_model_id=m['id'],error_code=r['error_code'],candidate_key=c.key,
          candidate_name=c.name,description='Source-supported possible technical point',fault_class=c.fault_class,
          verification_status='verified',evidence_source_type=c.source_type,evidence_url=c.raw.url,
          evidence_note='; '.join(f'{field} support: "{phrase}"' for field,phrase in
             [('description',c.description_phrase),('action',c.action_phrase)] if phrase),
          requires_service=True,customer_observable=False,is_active=True))
    return after


def main():
    baseline=json.loads((OUT/'knowledge-before.json').read_text(encoding='utf-8'))
    recovered,scan=recover(baseline)
    after=overlay_candidates(baseline,recovered)
    cs=[c for _,_,_,c in recovered]
    path=gen.MIGRATIONS/NAME
    collisions=[p for p in gen.MIGRATIONS.glob('*000035_*.sql') if p.name!=NAME]
    if collisions:raise ValueError('Migration number collision')
    if cs:path.write_text(gen.migration_sql(35,'ALL',cs,raw_row_count=None,migration_name=NAME),encoding='utf-8')
    (OUT/'knowledge-candidates-after.json').write_text(json.dumps(after,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    before_inv=data.inventory(baseline);after_inv=data.inventory(after)
    report=dict(recovered_candidates=len(cs),source_types=dict(Counter(c.source_type for c in cs)),
      support_kinds=dict(Counter(c.support_kind for c in cs)),action_gap_scan=scan,
      before=before_inv,after_candidates=after_inv)
    (OUT/'candidate-enrichment.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(new_candidates=len(cs),before=before_inv['total'],after=after_inv['total']),ensure_ascii=False,indent=2))


if __name__=='__main__':main()
