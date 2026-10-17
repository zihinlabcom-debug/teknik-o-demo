'use client';
import {useState} from 'react';

type SandboxResult={
  intentId:string;
  paymentStatus:'authorized'|'authorization_failed'|'requires_review';
  distributionStarted:boolean;
  reconciliationRequired:boolean;
  distributionCycleId?:string;
};
type Phase='pending'|'declined'|'distributed'|'reconciliation';

/** Only render this when the protected staging request API returns a paymentIntentId.
 * This is a FAKE payment laboratory, not a payment method or card collection form. */
export function Stage12SandboxPayment({intentId}:{intentId:string}){
  const [phase,setPhase]=useState<Phase>('pending');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<string|null>(null);

  async function decide(approve:boolean){
    if(busy||phase==='distributed'||phase==='reconciliation')return;
    setBusy(true);setMessage(null);
    try{
      // Stable across network retry; distinct per decision and per intent.
      const idempotencyKey=`stage12-${approve?'approve':'decline'}-${intentId}`;
      const response=await fetch('/api/finance/fake/authorize',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({intentId,idempotencyKey,approve}),
      });
      const body=await response.json().catch(()=>null) as SandboxResult | {error?:string}|null;
      if(!response.ok){
        if(response.status>=500){
          setPhase('reconciliation');
          setMessage('Sunucu sonucu belirsiz. Yeni provizyon başlatmayın; kayıt kontrol edilmeli.');
        }else{
          setMessage(body&&'error' in body&&typeof body.error==='string'?body.error:'İşlem reddedildi.');
        }
        return;
      }
      if(!body||!('intentId' in body)||body.intentId!==intentId||
         !('paymentStatus' in body)||!('distributionStarted' in body)||!('reconciliationRequired' in body)){
        setPhase('reconciliation');setMessage('Beklenmeyen yanıt. Ödeme durumunu kontrol edin.');return;
      }
      const outcome=body as SandboxResult;
      if(outcome.reconciliationRequired||response.status===202){
        setPhase('reconciliation');setMessage('Provizyon sonucu var, ancak dağıtım henüz doğrulanamadı. Tekrar ödeme oluşturmayın.');
      }else if(outcome.distributionStarted&&outcome.paymentStatus==='authorized'){
        setPhase('distributed');setMessage('Sahte provizyon onaylandı ve usta dağıtımı başlatıldı.');
      }else if(outcome.paymentStatus==='authorization_failed'){
        setPhase('declined');setMessage('Sahte provizyon reddedildi. Usta dağıtımı başlatılmadı.');
      }else{
        setPhase('reconciliation');setMessage('Beklenmeyen ödeme durumu; kontrol gerekli.');
      }
    }catch{
      setPhase('reconciliation');
      setMessage('Bağlantı hatası: istek işlenmiş olabilir. Tekrar işlem yapmadan durumu kontrol edin.');
    }finally{setBusy(false);}
  }

  return <section aria-label="Stage 12 test ödemesi" className="mt-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-950">Sandbox · Yalnızca test — gerçek para çekilmez</p>
    <p className="mt-1 text-xs text-amber-900">Usta dağıtımı için sahte ön provizyonu deneyebilirsiniz.</p>
    {(phase==='pending'||phase==='declined')&&<div className="mt-3 grid grid-cols-2 gap-2">
      <button type="button" disabled={busy} onClick={()=>void decide(true)} className="min-h-11 rounded-xl bg-[#C86B32] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
        {busy?'İşleniyor…':'Test onayla'}
      </button>
      <button type="button" disabled={busy} onClick={()=>void decide(false)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50">
        Test reddet
      </button>
    </div>}
    {message&&<p role="status" aria-live="polite" className="mt-3 text-xs font-semibold text-slate-800">{message}</p>}
  </section>;
}
