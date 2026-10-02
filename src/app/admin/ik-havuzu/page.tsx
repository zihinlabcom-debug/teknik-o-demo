import {AdminDataPool} from '@/components/admin-data-pools';
import {PanelHeading} from '@/components/operation-panel';

export default function AdminHrPool(){
  return <><PanelHeading title="İK havuzu" description="İnsan Kaynakları başvuruları için mevcut boş veri alanı."/>
    <div className="rounded-2xl border border-slate-200 bg-white p-5"><AdminDataPool kind="hr_applications"/></div></>;
}
