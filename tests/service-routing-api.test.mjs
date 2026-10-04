import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {ACTIVE_SERVICE_CATEGORIES} from '../src/lib/service-categories.ts';
import {decodeConversationState} from '../src/lib/service-conversation.ts';

registerHooks({resolve(specifier,context,next){
 if(specifier==='@/lib/account-supabase')return next(new URL('./helpers/account-supabase-authenticated.mjs',import.meta.url).href,context);
 if(specifier.startsWith('@/'))return next(new URL('../src/'+specifier.slice(2)+'.ts',import.meta.url).href,context);
 if(specifier==='next/server')return next('next/server.js',context);
 return next(specifier,context);
}});
const diagnose=await import('../src/app/api/diagnose/route.ts');
const chat=await import('../src/app/api/chat/route.ts');

test('both actual API routes isolate cleaning and the remaining unavailable cards without network requests',async()=>{
 const savedSecret=process.env.DIAGNOSIS_STATE_SECRET,savedFetch=globalThis.fetch;
 process.env.DIAGNOSIS_STATE_SECRET='offline-category-api-secret';
 let calls=0;
 globalThis.fetch=async()=>{calls++;throw Error('This route must not access AI or a database');};
 try{
  const examples={painting:'3+1 evimi boyatmak istiyorum',cleaning:'boş ev temizliği istiyorum',moving:'evimi başka eve taşıyacağım',
   sofa_cleaning:'koltuk takımımı yıkatacağım',carpet_cleaning:'6 metrekare halı yıkatacağım'};
  for(const route of [diagnose,chat]){
   for(const category of ACTIVE_SERVICE_CATEGORIES.filter(c=>!['boiler','painting'].includes(c.id))){
    for(const selected of [true,false]){
     const body=selected?{message:category.label,category:category.id,categorySelected:true,stateToken:'boiler.old-state'}:{message:examples[category.id]};
     const res=await route.POST(new Request('http://localhost/api/test',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}));
     assert.equal(res.status,200);
     const result=await res.json();assert.equal(result.category,category.id);assert.equal(result.categoryState.category,category.id);
     const expected=category.id==='cleaning'?(selected?'cleaning_service_selection':'cleaning_question'):
      ['sofa_cleaning','carpet_cleaning'].includes(category.id)?'cleaning_question':'category_unavailable';
     assert.equal(result.resultState,expected);assert.equal(result.stateToken,null);
     assert.equal(result.answeredSystemQuestions,0);assert.deepEqual(result.candidateProbabilities,[]);
     assert.equal(decodeConversationState(result.conversationToken).boilerStateToken,null);
     assert.doesNotMatch(result.aiText,/markası|modeli|hata kodu/);
    }
   }
   for(const body of [{message:'Boya',category:'painting',categorySelected:true},{message:'3+1 evimi boyatmak istiyorum'}]){
    const painting=await route.POST(new Request('http://localhost/api/test',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}));
    assert.equal(painting.status,200);const result=await painting.json();
    assert.equal(result.category,'painting');assert.equal(result.resultState,'painting_service_selection');
    assert.equal(result.aiText,'Hangi boya hizmetine ihtiyacınız var?');
    assert.deepEqual(result.options,['Duvar Boyama','Mobilya Boyama','Dış Cephe Boyama']);
    assert.equal(result.stateToken,null);assert.equal(result.estimatedPrice,null);
    assert.equal(decodeConversationState(result.conversationToken).boilerStateToken,null);
   }
   const res=await route.POST(new Request('http://localhost/api/test',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:'Yardım istiyorum'})}));
   const result=await res.json();assert.equal(result.category,null);assert.equal(result.resultState,'category_clarification');
   assert.equal(result.options.length,6);
  }
  assert.equal(calls,0);
 }finally{
  globalThis.fetch=savedFetch;
  if(savedSecret===undefined)delete process.env.DIAGNOSIS_STATE_SECRET;else process.env.DIAGNOSIS_STATE_SECRET=savedSecret;
 }
});
