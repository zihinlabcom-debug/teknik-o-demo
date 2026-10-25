export const dynamic='force-dynamic';
import Link from 'next/link';import {T100NotificationUpdates} from '@/components/t100-notification-updates';import {requireRole} from '@/lib/operation-guard';import {adminSupabase} from '@/lib/account-supabase';
import {PanelHeading,PanelCard,EmptyPanelState} from '@/components/operation-panel';import {T100ServiceActions} from '@/components/t100-service-actions';
import {customerT100State} from '@/lib/t100-server';
const labels:Record<string,string>={
 'completion.reported':'Usta işin tamamlandığını bildirdi.',
 'completion.customer_yes':'Tamamlanma onayınız kaydedildi.',
 'completion.customer_no':'İtirazınız kaydedildi; otomatik sonuçlandırma durduruldu.',
 'completion.admin_refund':'Tam iade kararı verildi; finansal sonucu talep detayından izleyebilirsiniz.',
 'completion.admin_distribute':'Sonuçlandırma kararı verildi; hakediş dağıtımı simülasyondur.',
 'cancellation.customer_pending':'İptalinizin finansal sonucu bekleniyor.',
 'cancellation.technician_completed':'Usta atamasını iptal etti; yeni usta için dağıtım başlatıldı.',
 'distribution.technician_cancelled_restart':'Talebiniz için yeniden usta dağıtımı başladı.',
 'cancellation.review_opened':'İptal / inceleme başvurunuz kaydedildi.',
 'finance.t100_verified':'Finansal sonuç doğrulandı. Ayrıntıları talep detayından görüntüleyin.'
};
export default async function NotificationsPage(){
 const account=await requireRole('customer'),db=adminSupabase();
 const {data:requests,error:requestError}=await db.from('service_requests').select('id').eq('customer_id',account.id).order('created_at',{ascending:false}).limit(100);
 if(requestError)throw new Error('Bildirimler okunamadı.');
 const ids=(requests??[]).map(r=>r.id);
 const [reports,events]=ids.length?await Promise.all([
 db.from('t100_completion_reports').select('job_id,service_request_id,response,resolution,deadline,voided_at,complaint_id,report_version').in('service_request_id',ids).eq('response','pending').is('resolution',null).is('voided_at',null).order('reported_at',{ascending:false}).limit(20),
 db.from('operational_events').select('id,service_request_id,event_type,occurred_at').in('service_request_id',ids).in('event_type',Object.keys(labels)).order('occurred_at',{ascending:false}).limit(50)]):[{data:[],error:null},{data:[],error:null}];
 if(reports.error||events.error)throw new Error('Bildirimler okunamadı.');
 const states=await Promise.all((reports.data??[]).map(r=>customerT100State(r.service_request_id)));
 return <><T100NotificationUpdates/><PanelHeading title="Bildirimler" description="Hizmet onayı, iptal, inceleme ve finans durumları."/><div className="space-y-4">
 {(reports.data??[]).map((r,index)=>{
  const state=states[index];
  return <T100ServiceActions key={r.job_id} role="customer" requestId={r.service_request_id} initialState={state}/>;
 })}
 <PanelCard title="Hizmet hareketleri">{events.data?.length?events.data.map(e=><Link key={e.id} href={'/musteri/taleplerim/'+e.service_request_id} className="block border-b border-slate-100 py-4 text-sm"><p className="font-bold text-[#082B4C]">{labels[e.event_type]}</p><p className="mt-1 text-slate-500">{new Date(e.occurred_at).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'})}</p></Link>):<EmptyPanelState>Henüz hizmet bildirimi bulunmuyor.</EmptyPanelState>}</PanelCard></div></>;
}