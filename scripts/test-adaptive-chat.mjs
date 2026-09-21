import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const results=[];
for (const scenario of [
 {name:'Nitromix F76', messages:['Demirdöküm Nitromix kombimde F76 yazıyor.'], status:'diagnosing'},
 {name:'Kod yok, ekran kapalı', messages:['Demirdöküm Nitromix kombim çalışmıyor, hata kodu yok, ekran kapalı.', 'Evde elektrik var, diğer cihazlar çalışıyor.', 'Kombi ekranı hep kapalı, yanık kokusu yok.']},
 {name:'F22 gözlemle daraltma', messages:['Demirdöküm Nitromix F22 gösteriyor.', 'Basınç 0,3 bar.', 'Altında su damlıyor.']},
 {name:'Bilinmeyen kod', messages:['Vaillant ecoTEC plus VUW 246/5-5 kombide F76 var.']},
 {name:'Gaz kokusu', messages:['Kombinin yanında gaz kokusu var.'], status:'safety_stop'},
]) {
 const history=[];
 let stateToken;
 const questions=new Set();
 for (const message of scenario.messages) {
  const response=await fetch('http://localhost:3000/api/diagnose',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message,chatHistory:history,stateToken})});
  const data=await response.json();
  assert.equal(response.status,200,JSON.stringify(data));
  assert.equal(data.isReadyForPrice,false);
  stateToken=data.stateToken;
  assert.ok(stateToken);
  assert.ok(data.informationProgress>=0 && data.informationProgress<=80);
  if(data.informationProgress===80) assert.equal(data.aiText.includes('?'),false);
  if(data.aiText.includes('?')) {assert.equal(questions.has(data.aiText),false); questions.add(data.aiText);}
  if(data.candidateProbabilities.length) assert.equal(data.candidateProbabilities.reduce((n,c)=>n+c.probability,0),100);
  if(scenario.status==='safety_stop') assert.equal(data.diagnosticStatus,'safety_stop');
  results.push({scenario:scenario.name,message,...data});
  history.push({role:'user',content:message},{role:'assistant',content:data.aiText});
  console.log(scenario.name, message, '\n=>',data.aiText);
 }
}
await writeFile('test-results/adaptive-chat-live.json',JSON.stringify(results,null,2));
