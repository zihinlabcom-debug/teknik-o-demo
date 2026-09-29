import {readFileSync,writeFileSync} from 'node:fs';
import {matchesBoilerErrorCode} from '../src/lib/boiler-error-code.ts';
const t=JSON.parse(readFileSync('test-results/stage3-closure-audit/live-catalog.json','utf8')).tables;
const scopes=[['Ariston','Clas One','1P1'],['DemirDöküm','nitromiX','F76'],['Bosch','Condens 2500 W','EA'],['Vaillant','ecoTEC intro','F28']];
const families=t.boiler_model_families.filter(f=>scopes.some(([b,m])=>b===f.brand&&m===f.family_name));
const candidates=t.boiler_fault_candidates.filter(c=>scopes.some(([b,m,code])=>families.some(f=>f.id===c.family_id&&f.brand===b&&f.family_name===m)&&matchesBoilerErrorCode(c.error_code,code)));
const data={provenance:'Offline subset of GET-only 2026-09-29 technical snapshot; no invented source rows',families,
 models:t.boiler_official_models.filter(m=>families.some(f=>f.id===m.family_id)),aliases:t.boiler_model_aliases.filter(a=>families.some(f=>f.id===a.family_id)),
 raw:t.official_error_codes_raw.filter(r=>candidates.some(c=>c.official_error_record_id===r.id)),candidates,
 questions:t.boiler_diagnostic_questions,effects:t.boiler_question_effects.filter(e=>candidates.some(c=>c.id===e.candidate_id))};
writeFileSync('tests/fixtures/free-text-relevance.json',JSON.stringify(data,null,2)+'\n');
console.log({families:families.map(f=>f.family_name),candidates:candidates.length});
