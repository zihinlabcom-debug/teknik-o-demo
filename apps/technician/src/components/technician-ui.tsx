import type {ReactNode} from 'react';

const labels:Record<string,string>={
  pending:'Bekliyor',offered:'Teklif edildi',broadcasting:'Ustalara iletiliyor',accepted:'Kabul edildi',
  assigned:'Atandı',in_progress:'İşlemde',completed:'Tamamlandı',cancelled:'İptal edildi',
  scheduled:'Planlandı',confirmed:'Onaylandı',approved:'Onaylandı',rejected:'Reddedildi',
  resolved:'Sonuçlandı',declined:'Reddedildi',under_review:'İnceleniyor',submitted:'İnceleniyor',
  draft:'Taslak',expired:'Süresi doldu',withdrawn:'Geri çekildi',rescheduled:'Yeniden planlandı',
  suspended:'Askıya alındı',pending_document:'Belge bekleniyor',verified:'Doğrulandı',active:'Aktif',
  exhausted:'Usta bulunamadı',distributing:'Ustalara iletiliyor',admin_intervention:'Yönetim incelemesi gerekli',
  request_open:'Talep açık',technician_unavailable:'Usta bulunamadı',pending_admin:'Yönetim onayı bekleniyor',
  customer_accepted:'Müşteri kabul etti',customer_rejected:'Müşteri reddetti',
  admin_continue:'Önceki kapsamla devam',admin_cancelled:'Yönetim tarafından iptal edildi',
  correction_pending:'Düzeltme bekleniyor',correction_assigned:'Düzeltme atandı',corrected:'Düzeltildi',
};

export function statusLabel(value:string|null|undefined){
  if(!value)return 'Durum belirtilmedi';
  return labels[value]??'Bilinmeyen durum';
}

export function formatMoney(amount:number|string|null|undefined,currency='TRY'){
  if(amount===null||amount===undefined||amount==='')return 'Fiyat bilgisi yok';
  const value=Number(amount);
  if(!Number.isFinite(value))return `${amount} ${currency}`;
  return new Intl.NumberFormat('tr-TR',{style:'currency',currency:currency==='TRY'?'TRY':currency,maximumFractionDigits:2}).format(value);
}

export function TechnicianPageHero({eyebrow='USTA OPERASYONU',title,description,aside}:{eyebrow?:string;title:string;description:string;aside?:ReactNode}){
  return <header className="relative mb-5 overflow-hidden rounded-[22px] bg-[#082B4C] px-5 py-5 text-white shadow-[0_10px_28px_rgba(8,43,76,0.16)]">
    <div className="absolute -right-12 -top-20 size-44 rounded-full border-[28px] border-[#C86B32]/25"/>
    <div className="absolute -bottom-16 right-16 size-32 rounded-full bg-white/5"/>
    <div className="relative flex min-h-[104px] items-end justify-between gap-4">
      <div className="min-w-0"><p className="text-[11px] font-extrabold tracking-[0.18em] text-[#F0A36D]">{eyebrow}</p><h1 className="mt-2 text-[27px] font-extrabold leading-tight tracking-[-0.035em]">{title}</h1><p className="mt-2 max-w-sm text-sm leading-6 text-white/80">{description}</p></div>
      {aside&&<div className="shrink-0">{aside}</div>}
    </div>
  </header>;
}

export function StatusBadge({value,tone}:{value:string;tone?:'success'|'warning'|'danger'|'info'}){
  const normalized=tone??(value==='completed'||value==='approved'||value==='confirmed'?'success':value==='cancelled'||value==='rejected'||value==='declined'?'danger':value==='pending'||value==='offered'||value==='submitted'?'warning':'info');
  const style={success:'border-emerald-200 bg-emerald-50 text-emerald-800',warning:'border-amber-200 bg-amber-50 text-amber-800',danger:'border-red-200 bg-red-50 text-red-800',info:'border-blue-200 bg-blue-50 text-blue-800'}[normalized];
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${style}`}>{statusLabel(value)}</span>;
}

export function MetaItem({label,children}:{label:string;children:ReactNode}){
  return <div className="min-w-0 rounded-xl bg-[#F5F7FA] p-3"><dt className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-[#17263B]">{children}</dd></div>;
}
