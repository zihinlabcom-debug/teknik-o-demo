// Offline extraction of already-audited source records; never contacts a service.
import {readFileSync,writeFileSync} from 'node:fs';
const t=JSON.parse(readFileSync('test-results/stage3-closure-audit/live-catalog.json','utf8')).tables;
const familyIds=t.boiler_model_families.filter(f=>['nitromiX','ecoTEC intro','Clas One','microGENUS II','Citius Premix'].includes(f.family_name)).map(f=>f.id);
const raw=t.official_error_codes_raw.filter(r=>['F.76','F.78','F.83','1P1','A99','C47/F47'].includes(r.error_code));
const candidates=t.boiler_fault_candidates.filter(c=>familyIds.includes(c.family_id)&&raw.some(r=>r.id===c.official_error_record_id));
const data={families:t.boiler_model_families.filter(f=>familyIds.includes(f.id)),models:t.boiler_official_models.filter(m=>familyIds.includes(m.family_id)),
 aliases:t.boiler_model_aliases.filter(a=>familyIds.includes(a.family_id)),raw:raw.filter(r=>candidates.some(c=>c.official_error_record_id===r.id)),candidates,
 questions:t.boiler_diagnostic_questions,effects:t.boiler_question_effects.filter(e=>candidates.some(c=>c.id===e.candidate_id))};
writeFileSync('tests/fixtures/stage3-blockers.json',JSON.stringify(data,null,2)+'\n');
console.log({families:data.families.map(f=>f.family_name),candidates:candidates.length,raw:data.raw.length});
