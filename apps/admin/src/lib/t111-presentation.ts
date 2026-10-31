const labels:Record<string,string>={not_created:'Ödeme kaydı yok',pending_authorization:'Provizyon bekliyor',authorization_failed:'Provizyon başarısız',authorized:'Provizyon doğrulandı',capture_failed:'Tahsilat başarısız',captured:'Tahsilat doğrulandı',requires_review:'Belirsiz — finansal inceleme gerekli',cancelled:'İptal edildi',voided:'Provizyon kapatıldı',refunded:'Tam iade doğrulandı',partially_refunded:'Kısmi iade doğrulandı',verified:'Sonuç doğrulandı',pending:'Bekliyor',reserved:'İşlem sürüyor',unknown:'Belirsiz — inceleme gerekli',blocked:'İşlem engellendi',failed:'Başarısız'};
export function financeLabel(status:string){return labels[status]??'Tanımlanmamış finans durumu';}
export function remainingAuthorizationLabel(input:{request:{financial_uncertainty:boolean};payments:Array<{authorized:number;captured:number;status:string}>;finalization:null|{remainingAuthorizationVerified:boolean}}){
 if(input.request.financial_uncertainty)return 'Belirsiz — finansal inceleme gerekli';
 const residual=input.payments.some(p=>p.authorized>p.captured&&!['voided','cancelled'].includes(p.status));
 if(!residual)return 'Kalan provizyon bulunmuyor';
 return input.finalization?.remainingAuthorizationVerified?'Kalan provizyonun kapatılması doğrulandı':'Kalan provizyon henüz doğrulanmadı';
}
