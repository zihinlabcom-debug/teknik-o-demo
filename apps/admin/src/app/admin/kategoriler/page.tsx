export const dynamic='force-dynamic';

import {PanelHeading,PanelCard,EmptyPanelState} from '@/components/operation-panel';
import {AdminCategoryDocumentControls} from '@/components/admin-category-document-controls';
import {adminCategoryCatalog} from '@/lib/technician-management';

export default async function AdminCategories(){
  const categories=await adminCategoryCatalog();
  return <><PanelHeading title="Kategori yönetimi" description="Hizmet kategorilerinin belge gereksinimini yönetin."/>
    <PanelCard title="Kategori kayıtları">{!categories.length?<EmptyPanelState>Kategori kaydı bulunmuyor.</EmptyPanelState>
      :<div className="space-y-3">{categories.map(category=><div key={category.id}
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-sm">
        <div><strong>{category.name}</strong> <span className="text-slate-500">({category.code})</span>
          <span className="ml-2">{category.is_active?'Aktif':'Pasif'} · Belge {category.requires_document?'zorunlu':'isteğe bağlı'}</span></div>
        <AdminCategoryDocumentControls id={category.id} requiresDocument={category.requires_document}/>
      </div>)}</div>}</PanelCard></>;
}
