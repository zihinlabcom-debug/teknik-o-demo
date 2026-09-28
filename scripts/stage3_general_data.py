"""Read-only inventory/coverage helpers over a pinned technical DB snapshot."""
from __future__ import annotations
import copy
import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results/stage3-general'
sys.path.insert(0, str(ROOT / 'scripts'))
import generate_stage3_fault_candidates as generator


def norm(text):
    return re.sub(r'[^a-z0-9]+', ' ', ''.join(c for c in unicodedata.normalize(
        'NFKD', str(text or '').lower().replace('ı', 'i')) if not unicodedata.combining(c))).strip()


def code(text):
    return re.sub(r'[.\s-]', '', str(text or '').upper())


def key(raw):
    return norm(raw['brand']).replace(' ', ''), norm(raw['official_model']), code(raw['error_code'])


def load_database():
    return json.loads((OUT / 'database-before.json').read_text(encoding='utf-8'))['tables']


def baseline_with_prepared():
    tables = copy.deepcopy(load_database())
    # A prepared import is a separate, explicit overlay, never claimed as live DB.
    fixture = json.loads((ROOT / 'tests/fixtures/copa-stage3.json').read_text(encoding='utf-8'))
    review = json.loads((ROOT / 'test-results/copa-stage3/preparation.json').read_text(encoding='utf-8'))
    existing = {norm(r['brand']) for r in tables['boiler_model_families']}
    if {norm(r['brand']) for r in fixture['families']} & existing:
        raise ValueError('Prepared COPA overlay overlaps live DB; reconcile explicitly')
    tables['boiler_model_families'] += fixture['families']
    tables['boiler_official_models'] += fixture['models']
    tables['boiler_model_aliases'] += fixture['aliases']
    model_by_id = {m['id']:m for m in fixture['models']}
    raw_lookup = {}
    for number, item in enumerate(review['spot_checks'], 1):
        raw = dict(id=f'prepared-raw-{number}',brand=item['brand'],official_model=item['model'],
                   error_code=item['code'],official_description=item['description'],
                   official_action=item['action'],source_url=item['source_url'],
                   import_batch='copa_official_excel_2026_09_28')
        tables['official_error_codes_raw'].append(raw)
        raw_lookup[(item['model'], code(item['code']))] = raw
    for item in fixture['candidates']:
        raw = raw_lookup[(model_by_id[item['official_model_id']]['official_model_name'],code(item['error_code']))]
        tables['boiler_fault_candidates'].append(dict(item,
          official_error_record_id=raw['id'],evidence_source_type='official_manufacturer',
          evidence_url=raw['source_url'],evidence_note='Prepared source-grounded COPA seed; see 00033.'))
    questions = {q['question_key']:q for q in tables['boiler_diagnostic_questions']}
    for effect in fixture['effects']:
        question = questions[effect['question_id']]
        tables['boiler_question_effects'].append(dict(effect,question_id=question['id']))
    return tables


def allowed_question(q, fuel):
    return q.get('is_active') and q.get('customer_observable') and not q.get('is_safety_question') and (
      fuel != 'electric' or not re.search(r'\b(?:gaz|gas|brulor|burner|iyonizasyon|ionization|alev|flame|yanma|combustion|baca|flue|atesleme|ignition)\w*',
       norm(q['question_key']+' '+q['question_text']+' '+(q.get('evidence_group') or ''))))


def inventory(tables):
    raw = tables['official_error_codes_raw']
    families = {r['id']:r for r in tables['boiler_model_families'] if r['is_active']}
    models = {r['id']:r for r in tables['boiler_official_models'] if r['is_active']}
    raw_by_id = {r['id']:r for r in raw}
    raw_pools = defaultdict(list)
    for r in raw: raw_pools[key(r)].append(r)
    candidates = [c for c in tables['boiler_fault_candidates'] if c['is_active'] and c['verification_status']=='verified']
    by_pool = defaultdict(list)
    orphan = []
    for c in candidates:
        r = raw_by_id.get(c.get('official_error_record_id'))
        if not r:
            orphan.append(c['id']);continue
        by_pool[key(r)].append(c)
    family_by_model = {(norm(families[m['family_id']]['brand']).replace(' ',''),norm(m['official_model_name'])):families[m['family_id']]
       for m in models.values() if m['family_id'] in families}
    questions = {q['id']:q for q in tables['boiler_diagnostic_questions']}
    effects = defaultdict(list)
    for e in tables['boiler_question_effects']: effects[e['candidate_id']].append(e)
    pools = []
    for identity, records in sorted(raw_pools.items()):
        members = by_pool[identity]
        family = family_by_model.get(identity[:2])
        fuel = family.get('fuel_type','gas') if family else 'gas'
        lookup = {(c['id'],e['question_id'],e['answer_key']):e['effect'] for c in members for e in effects[c['id']]
           if e['question_id'] in questions and allowed_question(questions[e['question_id']],fuel)}
        qids = {q for _,q,a in lookup if a!='unknown'}
        useful = []
        for q in qids:
            keys = {a for _,qid,a in lookup if qid==q and a!='unknown'}
            if len(members)==1:
                good = any(lookup.get((members[0]['id'],q,a))=='support' for a in keys)
            else:
                good = any(len({lookup.get((c['id'],q,a),'neutral') for c in members})>1 for a in keys)
            if good: useful.append(questions[q]['question_key'])
        pools.append(dict(identity=list(identity),brand=records[0]['brand'],model=records[0]['official_model'],
          code=records[0]['error_code'],raw_ids=[r['id'] for r in records],family_id=family['id'] if family else None,
          family=family['family_name'] if family else None,fuel_type=fuel,candidate_count=len(members),
          candidates=[dict(id=c['id'],key=c['candidate_key'],name=c['candidate_name'],fault_class=c['fault_class']) for c in members],
          diagnostic_questions=sorted(useful),effect_supported=bool(useful),source_url=records[0]['source_url']))
    family_codes = defaultdict(list)
    for p in pools:
        if p['family_id']: family_codes[(p['family_id'],code(p['code']))].append(p)
    consensus = set();family_consensus = 0
    for group in family_codes.values():
        if len(group)<2:continue
        signatures = [{(norm(c['name']),c['fault_class']) for c in p['candidates']} for p in group]
        if signatures[0] and all(s==signatures[0] for s in signatures):
            consensus.update(tuple(p['identity']) for p in group);family_consensus+=1
    for p in pools:p['family_consensus']=tuple(p['identity']) in consensus
    brands = sorted({r['brand'] for r in raw} | {f['brand'] for f in families.values()})
    def metrics(selected, selected_raw, selected_candidates, fs, ms):
        supported=[p for p in selected if p['candidate_count']]
        questionless=[p for p in supported if not p['effect_supported']]
        return dict(raw_rows=len(selected_raw),families=len(fs),official_models=len(ms),raw_pools=len(selected),
          candidate_count=len(selected_candidates),candidate_pools=len(supported),candidate_less_pools=len(selected)-len(supported),
          candidate_coverage=round(100*len(supported)/len(selected),2) if selected else 0,
          effect_pools=len(supported)-len(questionless),questionless_pools=len(questionless),
          family_consensus_raw_pools=sum(p['family_consensus'] for p in supported),
          exact_model_only_pools=sum(not p['family_consensus'] for p in supported),
          single_candidate_pools=sum(p['candidate_count']==1 for p in supported),
          multi_candidate_pools=sum(p['candidate_count']>1 for p in supported),
          evidence_source_types=dict(Counter(c.get('evidence_source_type','unknown') for c in selected_candidates)),
          raw_source_types=dict(Counter(generator.source_type(r['source_url']) for r in selected_raw)),
          empty_raw_source=sum(not r['source_url'] for r in selected_raw),
          empty_candidate_source=sum(not c.get('evidence_url') for c in selected_candidates),
          duplicate_raw=len(selected_raw)-len(selected),
          duplicate_semantic_candidate=sum(p['candidate_count']-len({(norm(c['name']),c['fault_class']) for c in p['candidates']}) for p in supported))
    brand_rows={brand:metrics([p for p in pools if p['brand']==brand],[r for r in raw if r['brand']==brand],
        [c for c in candidates if raw_by_id.get(c.get('official_error_record_id'),{}).get('brand')==brand],
        [f for f in families.values() if f['brand']==brand],
        [m for m in models.values() if families.get(m['family_id'],{}).get('brand')==brand]) for brand in brands}
    total=metrics(pools,raw,candidates,list(families.values()),list(models.values()))
    total.update(brands=len(brands),family_consensus_family_code_pools=family_consensus,orphan_candidates=len(orphan))
    return dict(total=total,brands=brand_rows,pools=pools)


def write_before():
    live=inventory(load_database());prepared=baseline_with_prepared();combined=inventory(prepared)
    OUT.mkdir(exist_ok=True,parents=True)
    (OUT/'knowledge-before.json').write_text(json.dumps(prepared,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    report=dict(mode='live DB audit + explicitly unapplied COPA overlay',live=live,combined=combined)
    (OUT/'audit-before.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    lines=['# Stage 3 before audit','', 'Canlı DB ve uygulanmamış COPA ayrı tutulur; production henüz değiştirilmedi.','',
      '## Canlı DB', '```json',json.dumps(live['total'],ensure_ascii=False,indent=2),'```','',
      '## COPA 00032–00034 dahil hazırlanmış birleşik kapsam', '```json',json.dumps(combined['total'],ensure_ascii=False,indent=2),'```','',
      '| Marka | Raw | Family | Model | Pool | Candidate pool | % | Effect pool | Questionless | Tek / Çok |',
      '|---|---:|---:|---:|---:|---:|---:|---:|---:|---|']
    for brand,m in combined['brands'].items():lines.append(f"| {brand} | {m['raw_rows']} | {m['families']} | {m['official_models']} | {m['raw_pools']} | {m['candidate_pools']} | {m['candidate_coverage']} | {m['effect_pools']} | {m['questionless_pools']} | {m['single_candidate_pools']} / {m['multi_candidate_pools']} |")
    (OUT/'audit-before.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    print(json.dumps(dict(live=live['total'],combined=combined['total']),ensure_ascii=False,indent=2))


if __name__=='__main__':write_before()
