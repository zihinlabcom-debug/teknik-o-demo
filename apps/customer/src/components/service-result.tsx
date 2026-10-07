'use client';
import {useState} from 'react';
import {Wrench,X} from 'lucide-react';
import {visualProgress,type ServicePricePresentation,type ServiceResponse} from '../lib/service-presentation';
export function DiagnosisProgress({answeredSystemQuestions,isAnalyzing,resultState}:{answeredSystemQuestions:number;isAnalyzing:boolean;resultState:string}){
  const progress=visualProgress(answeredSystemQuestions);
  const finished=['priced','priced_candidate','uncertain_price','pricing_missing'].includes(resultState);
  return <div className="mt-4 mb-3 rounded-2xl bg-white border border-slate-200 p-3">
    <div className="flex justify-between text-[11px] text-slate-600 mb-2" aria-live="polite">
      <span>{isAnalyzing?'Yanıtınız değerlendiriliyor…':resultState==='safety_stop'?'Güvenlik nedeniyle durduruldu':finished?'Değerlendirme tamamlandı':'Bilgi toplama'}</span>
      <span>%{progress}</span>
    </div>
    <div role="progressbar" aria-label="Bilgi toplama ilerlemesi" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}
      aria-valuetext={`%${progress} görsel ilerleme`} className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500 motion-reduce:transition-none"
        style={{width:`${progress}%`,background:'linear-gradient(to right, #ef4444, #f59e0b, #22c55e)',backgroundSize:`${progress?10000/progress:100}% 100%`}} />
    </div>
  </div>;
}
export function ServiceResultCard({result,onRequestTechnician,onReject}:{result:ServicePricePresentation|null;onRequestTechnician:()=>void;onReject:()=>void}){
  if(!result)return null;
  return <section aria-label="Servis fiyatı" className="mt-4 bg-white rounded-2xl border-2 border-[#EE6C13] shadow-lg p-4 space-y-3">
    <h3 className="text-sm font-bold text-slate-900">{result.title}</h3>
    {result.amount?<p className="text-lg font-black text-[#EE6C13]">{result.amount}</p>:result.lines.length?
      <dl className="space-y-1 text-xs text-slate-700">{result.lines.map(line=><div key={line.label} className="flex justify-between gap-3"><dt>{line.label}</dt><dd className="font-semibold">{line.value}</dd></div>)}</dl>:
      <p className="text-lg font-black text-slate-700">Belirsiz</p>}
    <div className="grid grid-cols-2 gap-2">
      <button type="button" onClick={onRequestTechnician} className="bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"><Wrench className="w-3.5 h-3.5" />Usta çağır</button>
      <button type="button" onClick={onReject} className="bg-red-600 hover:bg-red-700 text-white py-2.5 px-2 rounded-xl font-bold text-xs transition-all active:scale-95">Talebi reddet</button>
    </div>
  </section>;
}
export function MinimumOrderNotice({message}:{message:string|null}){
  if(!message)return null;
  return <section aria-label="Minimum sipariş uyarısı" role="status"
    className="mt-4 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-slate-900 shadow-sm">
    <h3 className="text-sm font-bold">Minimum sipariş tutarı</h3>
    <p className="mt-2 text-sm leading-6">{message}</p>
  </section>;
}
export function DiagnosisDebugPanel({enabled,response}:{enabled:boolean;response:ServiceResponse|null}){
  if(!enabled)return null;
  return <section aria-label="Teşhis debug" className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
    <h3 className="font-bold text-slate-900">DEBUG — Teşhis dağılımı</h3>
    <dl className="mt-2 space-y-1">
      <div>Kategori: {response?.category??'seçilmedi'}</div>
      <div>resultState: {response?.resultState??'başlangıç'}</div>
      <div>Soru sayısı: {response?.questionCount??0}</div>
      <div>Cevaplanan soru: {response?.answeredSystemQuestions??0}</div>
    </dl>
    {!!response?.candidateProbabilities.length&&<ul className="mt-2 space-y-1">{response.candidateProbabilities.map(c=><li key={c.name} className="flex justify-between gap-2"><span>{c.name}</span><strong>%{c.probability}</strong></li>)}</ul>}
    {!!response?.groupProbabilities.length&&<ul className="mt-2 border-t border-slate-100 pt-2 space-y-1">{response.groupProbabilities.map(g=><li key={g.key} className="flex justify-between gap-2"><span>{g.name}</span><span>%{g.probability}</span></li>)}</ul>}
  </section>;
}
const SCHEDULED_SERVICE_CATEGORIES=new Set(['painting','cleaning','sofa_cleaning','carpet_cleaning']);
const ISTANBUL_DATE_FORMATTER=new Intl.DateTimeFormat('en-US',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'});
function istanbulServiceDate(offsetDays:number){
  const parts=Object.fromEntries(ISTANBUL_DATE_FORMATTER.formatToParts(new Date())
    .filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
  return new Date(Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day)+offsetDays)).toISOString().slice(0,10);
}
export function TechnicianHandoffNotice({onClose,response}:{onClose:()=>void;response:ServiceResponse|null}){
  const [busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),[requestId,setRequestId]=useState<string|null>(null);
  const [requestedServiceMode,setRequestedServiceMode]=useState<'immediate'|'scheduled'>('immediate');
  const [requestedServiceDate,setRequestedServiceDate]=useState('');
  const canSelectDate=!!response?.category&&SCHEDULED_SERVICE_CATEGORIES.has(response.category);
  const minServiceDate=istanbulServiceDate(1),maxServiceDate=istanbulServiceDate(7);
  const createRequest=async()=>{
    if(busy||requestId)return;
    if(!response?.conversationToken){setError('Talep oluşturmak için tamamlanmış bir hizmet değerlendirmesi gerekli.');return;}
    const serviceMode=canSelectDate?requestedServiceMode:'immediate';
    const serviceDate=serviceMode==='scheduled'?requestedServiceDate:'';
    if(serviceMode==='scheduled'&&(!serviceDate||serviceDate<minServiceDate||serviceDate>maxServiceDate)){
      setError('Hizmet tarihi yarından başlayarak en fazla 7 gün sonrası için seçilebilir.');
      return;
    }
    setBusy(true);setError(null);
    try{
      const reply=await fetch('/api/operations/requests',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          conversationToken:response.conversationToken,
          requestedServiceMode:serviceMode,
          requestedServiceDate:serviceMode==='scheduled'?serviceDate:null,
        }),
      });
      const body=await reply.json().catch(()=>({})) as {id?:string;error?:string};
      if(!reply.ok||!body.id)throw new Error(body.error||'Talep oluşturulamadı.');
      setRequestId(body.id);
    }catch(e){setError(e instanceof Error?e.message:'Talep oluşturulamadı.');}
    finally{setBusy(false);}
  };
  return <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <section role="dialog" aria-modal="true" aria-label="Usta çağır" className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
      <button type="button" aria-label="Kapat" onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
      <div className="w-10 h-10 bg-orange-100 text-[#EE6C13] rounded-2xl flex items-center justify-center mx-auto mb-2"><Wrench className="w-5 h-5" /></div>
      <h3 className="text-center text-base font-black text-slate-900">Usta çağır</h3>
      {requestId?<>
        <p className="text-sm text-emerald-700 mt-3 leading-relaxed text-center font-semibold">Talebiniz oluşturuldu.</p>
        <a href={`/musteri/taleplerim/${requestId}`} className="mt-4 block w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-center text-xs font-bold text-white">Talebi görüntüle</a>
      </>:<>
        <p className="text-xs text-slate-500 mt-3 leading-relaxed">Kayıtlı varsayılan adresiniz kullanılarak gerçek hizmet talebi oluşturulacak. Aynı değerlendirme tekrar gönderilirse ikinci bir talep açılmaz.</p>
        {response?.isReadyForPrice&&response.estimatedPrice&&<p className="mt-2 text-xs font-semibold text-slate-700">Talebi oluşturduğunuzda gösterilen {response.estimatedPrice} maksimum fiyatı kabul etmiş olursunuz.</p>}
        {canSelectDate?<fieldset className="mt-4">
          <legend className="text-xs font-bold text-slate-800">Hizmeti ne zaman istiyorsunuz?</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" aria-pressed={requestedServiceMode==='immediate'} disabled={busy}
              onClick={()=>{setRequestedServiceMode('immediate');setRequestedServiceDate('');setError(null);}}
              className={`min-h-11 rounded-xl border px-3 py-2 text-xs font-bold ${requestedServiceMode==='immediate'?'border-emerald-600 bg-emerald-50 text-emerald-700':'border-slate-300 bg-white text-slate-700'}`}>
              Hemen
            </button>
            <button type="button" aria-pressed={requestedServiceMode==='scheduled'} disabled={busy}
              onClick={()=>{setRequestedServiceMode('scheduled');setError(null);}}
              className={`min-h-11 rounded-xl border px-3 py-2 text-xs font-bold ${requestedServiceMode==='scheduled'?'border-[#EE6C13] bg-orange-50 text-[#C6520D]':'border-slate-300 bg-white text-slate-700'}`}>
              Tarih seç
            </button>
          </div>
          {requestedServiceMode==='scheduled'&&<label className="mt-3 block text-xs font-semibold text-slate-700">
            <span className="mb-1.5 block">Hizmet tarihi</span>
            <input type="date" value={requestedServiceDate} min={minServiceDate} max={maxServiceDate} disabled={busy}
              onChange={event=>{setRequestedServiceDate(event.target.value);setError(null);}}
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#EE6C13]" />
            <span className="mt-1.5 block text-[11px] font-normal leading-4 text-slate-500">Yarından başlayarak en fazla 7 gün sonrası seçilebilir.</span>
          </label>}
        </fieldset>:<p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-600">Bu hizmet için talep Hemen olarak oluşturulur.</p>}
        {error&&<p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</p>}
        <button type="button" disabled={busy||(canSelectDate&&requestedServiceMode==='scheduled'&&!requestedServiceDate)} onClick={()=>void createRequest()} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-2.5 rounded-xl font-bold text-xs mt-4">{busy?'Talep oluşturuluyor…':'Talebi oluştur'}</button>
        <button type="button" onClick={onClose} className="w-full bg-[#0B1727] text-white py-2.5 rounded-xl font-bold text-xs mt-2">Vazgeç</button>
      </>}
    </section>
  </div>;
}
