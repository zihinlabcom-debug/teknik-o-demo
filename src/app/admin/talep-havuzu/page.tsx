import {AdminDataPool} from '@/components/admin-data-pools';
import {PanelHeading} from '@/components/operation-panel';

export default function AdminDemandPool(){
  return <><PanelHeading title="Talep havuzu" description="Aktif olmayan kategoriler için mevcut boş veri alanı."/>
    <div className="rounded-2xl border border-slate-200 bg-white p-5"><AdminDataPool kind="category_demand"/></div></>;
}
