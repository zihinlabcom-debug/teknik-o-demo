const statusLabels={
  created:'Oluşturuldu',
  draft:'Taslak',offered:'Teklif edildi',accepted:'Kabul edildi',rejected:'Reddedildi',expired:'Süresi doldu',
  cancelled:'İptal edildi',pending:'Bekliyor',broadcasting:'Ustalara iletiliyor',declined:'Reddedildi',
  withdrawn:'Geri çekildi',assigned:'Atandı',in_progress:'İşlemde',completed:'Tamamlandı',
  scheduled:'Planlandı',confirmed:'Onaylandı',rescheduled:'Yeniden planlandı',active:'Aktif',
  exhausted:'Usta bulunamadı',technician_unavailable:'Usta bulunamadı',distributing:'Ustalara iletiliyor',
  admin_intervention:'Yönetim incelemesi gerekli',request_open:'Talep açık',under_review:'İnceleniyor',
  resolved:'Sonuçlandı',pending_admin:'Yönetim onayı bekleniyor',customer_accepted:'Müşteri kabul etti',
  customer_rejected:'Müşteri reddetti',admin_continue:'Önceki kapsamla devam',
  admin_cancelled:'Yönetim tarafından iptal edildi',correction_pending:'Düzeltme bekleniyor',
  correction_assigned:'Düzeltme atandı',corrected:'Düzeltildi',
} as const satisfies Record<string,string>;

const assignmentSourceLabels={
  automatic:'Otomatik atama',
  admin_manual:'Yönetici ataması',
} as const satisfies Record<string,string>;

const eventLabels={
  'completion.reported':'Müşteri tamamlama onayı bekleniyor',
  'completion.customer_yes':'Müşteri tamamlanmayı onayladı',
  'completion.customer_no':'Müşteri tamamlanmaya itiraz etti',
  'completion.admin_distribute':'Admin ödeme sonuçlandırma kararı verdi',
  'completion.admin_refund':'Admin tam iade kararı verdi',
  'completion.preparation_blocked':'Sonuçlandırma hazırlığı inceleme bekliyor',
  'cancellation.customer_pending':'Müşteri iptali finansal sonuç bekliyor',
  'cancellation.review_opened':'İptal incelemesi açıldı',
  'cancellation.technician_completed':'Usta atamasını iptal etti',
  'distribution.technician_cancelled_restart':'Usta iptali sonrası dağıtım yeniden başladı',
  'finance.t100_verified':'Finansal sonuç doğrulandı; dağıtım simülasyondur',
  'request.created':'Talep oluşturuldu',
  'quote.accepted':'Fiyat kabul edildi',
  'distribution.started':'Usta dağıtımı başladı',
  'distribution.redistributed':'Talep yeniden dağıtıldı',
  'distribution.exhausted':'Usta dağıtımı tamamlanamadı',
  'distribution.manual_assignment_required':'Yönetici ataması gerekli',
  'dispatch.round_started':'Dağıtım turu başladı',
  'dispatch.accepted':'Usta teklifi kabul etti',
  'job.assigned':'Usta atandı',
  'job.started':'İş başlatıldı',
  'job.completed':'İş tamamlandı',
  'job.cancelled':'İş iptal edildi',
  'job.appointment_timeout':'Randevu belirleme süresi doldu',
  'appointment.rescheduled':'Randevu yeniden planlandı',
  'appointment.scheduled':'Randevu oluşturuldu',
  'appointment.completed':'Randevu tamamlandı',
  'request.technician_unavailable':'Uygun usta bulunamadı',
  'admin.manual_assignment':'Yönetici usta atadı',
  'admin.service_cancelled':'Yönetici hizmeti iptal etti',
  'admin.technician_changed':'Yönetici ustayı değiştirdi',
  'additional_cost.created':'Ek maliyet talebi oluşturuldu',
  'additional_cost.admin_cancelled':'Ek maliyet nedeniyle hizmet iptal edildi',
  'additional_cost.admin_continued':'Önceki kapsamla devam edildi',
  'complaint.created':'Şikâyet oluşturuldu',
  'complaint.resolved':'Şikâyet sonuçlandırıldı',
  'complaint.decision_corrected':'Şikâyet kararı düzeltildi',
  'warranty.created':'Garanti talebi oluşturuldu',
  'warranty.correction_assigned':'Garanti düzeltmesi atandı',
  'warranty.correction_completed':'Garanti düzeltmesi tamamlandı',
  'finance.authorization_failed':'Ödeme provizyonu başarısız',
  'finance.authorized':'Ödeme provizyonu alındı',
  'finance.payment_pending':'Ödeme bekleniyor',
  'finance.captured':'Ödeme tahsil edildi',
  'finance.iyzico_capture_succeeded':'Ödeme tahsil edildi',
  'finance.iyzico_authorize_succeeded':'Ödeme provizyonu başarılı',
  'finance.voided':'Ödeme provizyonu iptal edildi',
  'finance.refunded':'Ödeme iade edildi',
} as const satisfies Record<string,string>;

const exclusionReasonLabels={
  technician_cancelled:'Usta işi iptal etti',
  appointment_timeout:'Randevu süresi doldu',
  declined:'Teklifi reddetti',
} as const satisfies Record<string,string>;

export function operationStatusLabel(value:string|null|undefined){
  if(!value)return 'Durum belirtilmedi';
  return statusLabels[value as keyof typeof statusLabels]??'Bilinmeyen durum';
}

export function assignmentSourceLabel(value:string|null|undefined){
  if(!value)return 'Atama kaynağı belirtilmedi';
  return assignmentSourceLabels[value as keyof typeof assignmentSourceLabels]??'Bilinmeyen atama kaynağı';
}

export function operationEventLabel(value:string|null|undefined){
  if(!value)return 'Olay türü belirtilmedi';
  return eventLabels[value as keyof typeof eventLabels]??'Tanımlanmamış teknik olay';
}

export function exclusionReasonLabel(value:string|null|undefined){
  if(!value)return 'Dışlama nedeni belirtilmedi';
  return exclusionReasonLabels[value as keyof typeof exclusionReasonLabels]??'Tanımlanmamış dışlama nedeni';
}

const operationDateTimeFormatter=new Intl.DateTimeFormat('tr-TR',{
  timeZone:'Europe/Istanbul',
  year:'numeric',month:'2-digit',day:'2-digit',
  hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23',
});

export function formatOperationDateTime(value:string|null|undefined){
  if(!value)return '—';
  const date=new Date(value);
  return Number.isNaN(date.getTime())?'—':operationDateTimeFormatter.format(date);
}
