import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBoilerGroups,questionDiscrimination} from '../src/lib/boiler-groups.ts';
const candidates=[
 {id:'gas',candidate_name:'Gaz beslemesi sorunu',fault_class:'gas_supply'},
 {id:'valve',candidate_name:'Gaz valfi/armatürü sorunu',fault_class:'gas_supply'},
 {id:'electrode',candidate_name:'Ateşleme/iyonizasyon elektrodu sorunu',fault_class:'ignition'},
 {id:'wire',candidate_name:'Kablolama/soket/bağlantı sorunu',fault_class:'electrical'},
 {id:'board',candidate_name:'Elektronik kontrol sistemi sorunu',fault_class:'electronic'},
];
const assessments=weights=>weights.map((probability,i)=>({candidateId:candidates[i].id,candidateName:candidates[i].candidate_name,probability,rank:i+1}));
test('group sums preserve every candidate once and total exactly one hundred',()=>{
 for(const weights of [[10,20,25,20,25],[20,20,20,20,20],[0,0,70,15,15]]){
  const groups=buildBoilerGroups(candidates,assessments(weights));
  assert.equal(groups.reduce((n,g)=>n+Math.round(g.probability*100),0),10000);
  assert.equal(groups.find(g=>g.key==='gas_path').probability,weights[0]+weights[1]);
  assert.deepEqual(new Set(groups.flatMap(g=>g.candidateIds)),new Set(candidates.map(c=>c.id)));
  assert.equal(groups.flatMap(g=>g.candidateIds).length,candidates.length);
 }
});
test('a duplicated ID or semantic candidate is rejected rather than inflating the group summary',()=>{
 assert.throws(()=>buildBoilerGroups([...candidates,candidates[0]],[...assessments([20,20,20,20,20])]),/duplicate/i);
 assert.throws(()=>buildBoilerGroups([...candidates,{...candidates[0],id:'dup'}],assessments([20,20,20,20,20])),/duplicate/i);
});
test('same group different candidates can still make a question useful, group value is separate',()=>{
 const qs=[{id:'q',answer_options:['yes','unknown']}];
 const weights=assessments([20,20,20,20,20]);
 const values=questionDiscrimination(candidates,weights,qs,[{question_id:'q',candidate_id:'gas',answer_key:'yes',effect:'support'}]);
 assert.equal(values.q.candidateDiscriminative,true);assert.equal(values.q.groupDiscriminative,true);
 const all=questionDiscrimination(candidates,weights,qs,candidates.map(c=>({question_id:'q',candidate_id:c.id,answer_key:'yes',effect:'support'})));
 assert.equal(all.q.candidateDiscriminative,false);assert.equal(all.q.groupDiscriminative,false);
});
