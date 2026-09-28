import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

function isolated(source) {
  const run = spawnSync(process.execPath, ['--import','./tests/register-typescript.mjs','--input-type=module','-e',source],
    {cwd:new URL('..',import.meta.url), encoding:'utf8', timeout:30000});
  assert.equal(run.status, 0, run.stderr || run.error?.message);
}

test('closed Supabase diagnosis imports and runs with legacy research and pdf-parse unavailable', () => {
  isolated(`
    import assert from 'node:assert/strict';
    import {registerHooks} from 'node:module';
    registerHooks({resolve(specifier,context,next){
      if(specifier.includes('pdf-parse') || /technical-research(?:\\.ts)?$/.test(specifier) ||
         /manufacturer-document(?:\\.ts)?$/.test(specifier))
        throw Error('Forbidden eager legacy/PDF dependency: '+specifier);
      return next(specifier,context);
    }});
    process.env.DIAGNOSIS_STATE_SECRET='isolated-import-secret';
    const {diagnose}=await import('./src/lib/diagnosis.ts');
    const safety={id:'safety',question_key:'gas_smell',question_text:'Gaz kokusu alıyor musunuz?',
      is_active:true,customer_observable:true,is_safety_question:true,evidence_group:'gas_smell',
      answer_options:['yes','no','unknown']};
    const repository={
      async resolveDevice(){return {familyId:'family',familyName:'ecoTEC intro',officialModelId:null,officialModelName:null};},
      async getCandidates(){return ['Gaz beslemesi sorunu','Ateşleme sistemi sorunu'].map((candidate_name,i)=>({
        id:'c'+i,candidate_name,family_id:'family',official_model_id:null,error_code:'F28',
        verification_status:'verified',is_active:true}));},
      async getQuestions(){return [safety];},async getEffects(){return [];},
      async createSession(){return 'session';},async updateSession(){},
      async recordCandidates(){},async recordQuestionAsked(){},
    };
    const ai={async extractIdentity(){return {brand:'Vaillant',model:'ecoTEC intro',errorCode:'F28'};},
      async chooseQuestion(){return 'safety';}};
    const result=await diagnose('Vaillant ecoTEC intro F28 hatası',[],null,
      {boiler:{repositoryFactory:()=>repository,aiFactory:()=>ai}});
    assert.equal(result.resultState,'diagnosing');
    assert.equal(result.aiText,safety.question_text);
    assert.equal(result.candidateProbabilities.length,2);
    assert.equal(result.candidateProbabilities.reduce((sum,c)=>sum+c.probability,0),100);
  `);
});

function documentScenario(pdf) {
  return `
    import assert from 'node:assert/strict';
    import {registerHooks} from 'node:module';
    let pdfAttempts=0;
    registerHooks({
      resolve(specifier,context,next){
        if(specifier==='pdf-parse'){pdfAttempts++;throw Error('PDF loader unavailable in this test');}
        if(specifier==='node:https')return {url:'test:manufacturer-https',shortCircuit:true};
        return next(specifier,context);
      },
      load(url,context,next){
        if(url==='test:manufacturer-https')return {format:'module',shortCircuit:true,source:
          "import {Readable} from 'node:stream'; import {EventEmitter} from 'node:events';"+
          "export function get(url,options,callback){const response=Readable.from([Buffer.from("+
          ${JSON.stringify(JSON.stringify(pdf?'%PDF-fake':'<p>F.28 official fault description</p>'))}+
          ")]);response.statusCode=200;response.headers={'content-type':'text/html'};queueMicrotask(()=>callback(response));return new EventEmitter();}"};
        return next(url,context);
      }
    });
    const {readManufacturerDocument,containsErrorCode}=await import('./src/lib/manufacturer-document.ts');
    assert.equal(pdfAttempts,0,'importing document helpers must not load the PDF engine');
    assert.equal(containsErrorCode('F.28 fault','F28'),true);
    ${pdf ? `await assert.rejects(readManufacturerDocument('https://official.test/manual.pdf',()=>true),/PDF loader unavailable/);
      assert.equal(pdfAttempts,1);` : `const document=await readManufacturerDocument('https://official.test/fault',()=>true);
      assert.match(document.text,/F\\.28 official fault description/);
      assert.equal(pdfAttempts,0);`}
  `;
}

test('official HTML reading works when pdf-parse cannot be loaded', () => isolated(documentScenario(false)));
test('PDF loading occurs only after the downloaded document has a PDF signature', () => isolated(documentScenario(true)));
