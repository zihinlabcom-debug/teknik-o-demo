'use client';
import {useState} from 'react';
type Phase='ready'|'working'|'distributed'|'declined'|'review';
type Result={outcome?:string;distributionStarted?:boolean;reconciliationRequired?:boolean;error?:string};
export function Stage12IyzicoSandboxPayment({intentId}:{intentId:string}){
  const [phase,setPhase]=useState<Phase>('ready'),[message,setMessage]=useState<string|null>(null);
  const [card,setCard]=useState({cardHolderName:'',cardNumber:'',expireMonth:'',expireYear:'',cvc:''});
  async function submit(){
    if(phase==='working'||phase==='distributed'||phase==='review')return;
    setPhase('working');setMessage(null);
    try{
      const response=await fetch('/api/finance/iyzico/authorize',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({intentId,...card})});
      setCard({cardHolderName:'',cardNumber:'',expireMonth:'',expireYear:'',cvc:''});
      const body=await response.json().catch(()=>({})) as Result;
      if(response.status===202||body.reconciliationRequired){setPhase('review');setMessage('Sonuç belirsiz veya mutabakat bekliyor. Yeni provizyon göndermeyin; Durumu doğrula ile Retrieve çalıştırın.');return;}
      if(!response.ok){setPhase('declined');setMessage(body.error||'Sandbox provizyonu reddedildi.');return;}
      if(body.outcome==='succeeded'&&body.distributionStarted){setPhase('distributed');setMessage('Sandbox provizyonu doğrulandı ve usta dağıtımı başlatıldı.');return;}
      if(body.outcome==='declined'){setPhase('declined');setMessage('Sandbox provizyonu reddedildi. Usta dağıtımı başlatılmadı.');return;}
      setPhase('review');setMessage('Ödeme veya dağıtım sonucu doğrulanamadı. Yeni provizyon göndermeyin.');
    }catch{setCard({cardHolderName:'',cardNumber:'',expireMonth:'',expireYear:'',cvc:''});setPhase('review');setMessage('Bağlantı sonucu belirsiz. Yeni provizyon göndermeyin; önce durumu doğrulayın.');}
  }
  async function reconcile(){
    if(phase!=='review')return;setPhase('working');setMessage(null);
    try{const response=await fetch('/api/finance/iyzico/reconcile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({intentId})});
      const body=await response.json().catch(()=>({})) as Result;
      if(response.ok&&body.outcome==='succeeded'&&body.distributionStarted&&!body.reconciliationRequired){setPhase('distributed');setMessage('Sağlayıcı kaydı doğrulandı ve usta dağıtımı başlatıldı.');return;}
      setPhase('review');setMessage(body.error||'Sağlayıcı durumu henüz kesinleştirilemedi. Manuel inceleme gerekli.');
    }catch{setPhase('review');setMessage('Mutabakat isteği tamamlanamadı. Otomatik ödeme tekrarı yapılmadı.');}
  }
  return <section aria-label="İyzico Sandbox ödemesi" className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3">
    <p className="text-xs font-black text-amber-950">Yalnız iyzico Sandbox — gerçek para kullanılmaz</p>
    {phase!=='distributed'&&phase!=='review'&&<div className="mt-3 grid grid-cols-2 gap-2">
      <input aria-label="Kart üzerindeki ad" placeholder="Kart üzerindeki ad" value={card.cardHolderName} onChange={e=>setCard({...card,cardHolderName:e.target.value})} className="col-span-2 rounded-lg border p-2 text-xs" />
      <input aria-label="Test kart numarası" inputMode="numeric" autoComplete="off" placeholder="Test kart numarası" value={card.cardNumber} onChange={e=>setCard({...card,cardNumber:e.target.value})} className="col-span-2 rounded-lg border p-2 text-xs" />
      <input aria-label="Son kullanma ayı" inputMode="numeric" placeholder="AA" value={card.expireMonth} onChange={e=>setCard({...card,expireMonth:e.target.value})} className="rounded-lg border p-2 text-xs" />
      <input aria-label="Son kullanma yılı" inputMode="numeric" placeholder="YYYY" value={card.expireYear} onChange={e=>setCard({...card,expireYear:e.target.value})} className="rounded-lg border p-2 text-xs" />
      <input aria-label="CVC" inputMode="numeric" autoComplete="off" placeholder="CVC" value={card.cvc} onChange={e=>setCard({...card,cvc:e.target.value})} className="rounded-lg border p-2 text-xs" />
      <button type="button" disabled={phase==='working'} onClick={()=>void submit()} className="rounded-lg bg-emerald-700 p-2 text-xs font-bold text-white disabled:opacity-50">{phase==='working'?'İşleniyor…':'Sandbox PreAuth'}</button>
    </div>}
    {phase==='review'&&<button type="button" onClick={()=>void reconcile()} className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">Durumu doğrula</button>}
    {message&&<p role="status" aria-live="polite" className="mt-3 text-xs font-semibold text-slate-800">{message}</p>}
  </section>;
}
