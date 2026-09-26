import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBoilerWeights, determineBoilerResult, eligibleQuestions, MAX_BOILER_QUESTIONS,
  selectCandidatePool, verifiedCandidates } from '../src/lib/boiler-probability.ts';

const candidates = ['Eşanjör/dolaşım','Anakart','Soket/kablo','Fan'].map((candidate_name, index) => ({
  id: `c${index}`, candidate_name, verification_status: 'verified', is_active: true,
  family_id: 'family', official_model_id: null, error_code: 'F28',
}));
const assessment = (answers, effects) => calculateBoilerWeights(candidates, answers, effects);
const weights = (answerKey, effect) => assessment([{ questionId: 'q1', answerKey, evidenceGroup: 'gas' }],
  [{ question_id: 'q1', candidate_id: 'c0', answer_key: answerKey, effect }]).map(item => item.probability);

test('equal verified pool and V1 support/weaken/neutral/unknown/eliminate math', () => {
  assert.deepEqual(assessment([], []).map(item => item.probability), [25,25,25,25]);
  assert.deepEqual(weights('yes','support'), [40,20,20,20]);
  assert.deepEqual(weights('yes','weaken'), [14.29,28.57,28.57,28.57]);
  assert.deepEqual(weights('yes','neutral'), [25,25,25,25]);
  assert.deepEqual(weights('unknown','support'), [25,25,25,25]);
  assert.deepEqual(weights('yes','eliminate'), [0,33.34,33.33,33.33]);
  for (const result of [assessment([],[]),assessment([{questionId:'q1',answerKey:'yes',evidenceGroup:'gas'}],
    [{question_id:'q1',candidate_id:'c0',answer_key:'yes',effect:'weaken'}])])
    assert.equal(result.reduce((sum,item)=>sum+item.probability,0),100);
});

test('one observation group contributes at most once and its question is not repeated', () => {
  const effects = [
    { question_id:'q1',candidate_id:'c0',answer_key:'yes',effect:'support' },
    { question_id:'q2',candidate_id:'c0',answer_key:'yes',effect:'support' },
  ];
  assert.deepEqual(assessment([
    { questionId:'q1',answerKey:'yes',evidenceGroup:'gas' },
    { questionId:'q2',answerKey:'yes',evidenceGroup:'gas' },
  ], effects).map(item=>item.probability), [40,20,20,20]);
  const questions = ['q1','q2'].map(id=>({id,question_key:id,question_text:'Gözlem?',evidence_group:'gas',
    customer_observable:true,is_safety_question:false,is_active:true,priority:null}));
  assert.deepEqual(eligibleQuestions(questions,effects,candidates.map(item=>item.id),['q1'],['gas']),[]);
});

test('verification consumes remaining slots at question 10, 11 and 12', () => {
  const leading = [{candidateId:'c0',candidateName:'A',probability:80,rank:1},
    {candidateId:'c1',candidateName:'B',probability:20,rank:2}];
  assert.equal(MAX_BOILER_QUESTIONS,12);
  assert.equal(determineBoilerResult(leading,10,null,true,true),'verification');
  assert.equal(determineBoilerResult(leading,11,10,true,true),'verification');
  assert.equal(determineBoilerResult(leading,12,10,false,true),'priced_candidate');
  assert.equal(determineBoilerResult(leading,11,null,true,true),'verification');
  assert.equal(determineBoilerResult(leading,12,11,false,true),'priced_candidate');
  assert.equal(determineBoilerResult(leading,12,null,false,true),'priced_candidate');
  assert.equal(determineBoilerResult(leading,10,null,false,false),'pricing_missing');
  assert.equal(determineBoilerResult(leading,12,10,false,false),'pricing_missing');
  assert.equal(determineBoilerResult([{...leading[0],probability:70},{...leading[1],probability:30}],12,null,false,true),
    'uncertain_price');
});

test('only active verified candidates enter code or symptom pools', () => {
  const rows = [...candidates,
    {...candidates[0],id:'review',verification_status:'needs_review'},
    {...candidates[0],id:'reject',verification_status:'rejected'},
    {...candidates[0],id:'inactive',is_active:false},
    {...candidates[0],id:'symptom',error_code:null},
    {...candidates[0],id:'sibling',official_model_id:'other'},
  ];
  assert.equal(verifiedCandidates(rows).length,6);
  assert.deepEqual(selectCandidatePool(rows,'family',null,'F.28').candidates.map(item=>item.id),['c0','c1','c2','c3']);
  assert.deepEqual(selectCandidatePool(rows,'family',null,'unrecognized').candidates.map(item=>item.id),['symptom']);
  assert.deepEqual(selectCandidatePool(rows,'family',null,null).candidates.map(item=>item.id),['symptom']);
});
