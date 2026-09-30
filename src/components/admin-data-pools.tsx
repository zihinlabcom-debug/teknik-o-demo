import type {ReactNode} from 'react';

export type AdminDataPoolKind='customers'|'category_demand'|'hr_applications';
type Column={key:string;label:string};
type PoolDefinition={title:string;description:string;emptyText:string;columns:readonly Column[]};

export const ADMIN_DATA_POOLS:Record<AdminDataPoolKind,PoolDefinition>={
  customers:{
    title:'Müşteriler',description:'Müşteri kayıtları için yönetim görünümü.',
    emptyText:'Henüz kayıtlı müşteri verisi bulunmuyor.',
    columns:[
      {key:'fullName',label:'Ad Soyad'},{key:'phone',label:'Telefon'},
      {key:'email',label:'E-posta'},{key:'city',label:'Şehir'},
      {key:'district',label:'İlçe'},{key:'address',label:'Adres'},
      {key:'createdAt',label:'Kayıt Tarihi'},{key:'status',label:'Hesap Durumu'},
    ],
  },
  category_demand:{
    title:'Talep Havuzu',description:'Aktif olmayan kategorilere yönelik ilgi kayıtları için yönetim görünümü.',
    emptyText:'Henüz kategori talebi bulunmuyor.',
    columns:[
      {key:'customer',label:'Müşteri'},{key:'category',label:'Kategori'},
      {key:'subcategory',label:'Alt Kategori'},{key:'city',label:'Şehir'},
      {key:'district',label:'İlçe'},{key:'note',label:'Açıklama'},
      {key:'status',label:'Durum'},{key:'createdAt',label:'Oluşturulma Tarihi'},
    ],
  },
  hr_applications:{
    title:'İK Havuzu',description:'İnsan Kaynakları başvuruları için yönetim görünümü.',
    emptyText:'Henüz İK başvurusu bulunmuyor.',
    columns:[
      {key:'fullName',label:'İsim Soyisim'},{key:'phone',label:'Telefon'},
      {key:'email',label:'E-posta'},{key:'address',label:'Adres'},
      {key:'introduction',label:'Tanıtım'},{key:'status',label:'Durum'},
      {key:'createdAt',label:'Başvuru Tarihi'},
    ],
  },
};

export type AdminDataRow={id:string;[key:string]:ReactNode};

export function AdminDataPool({kind,rows=[],connected=false}:{kind:AdminDataPoolKind;rows?:readonly AdminDataRow[];connected?:boolean}){
  const definition=ADMIN_DATA_POOLS[kind];
  return <section aria-label={definition.title}>
    <h2 className="text-xl font-bold text-gray-800">{definition.title}</h2>
    <p className="mt-1 text-sm text-gray-600">{definition.description}</p>
    {!connected&&<p className="mt-2 text-xs font-semibold text-orange-700">Demo: gerçek veri bağlantısı henüz etkin değil.</p>}
    <div className="mt-5 overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full min-w-max border-collapse text-left text-sm">
        <thead className="bg-gray-50 text-gray-600"><tr>{definition.columns.map(column=><th key={column.key} scope="col" className="whitespace-nowrap border-b border-gray-200 px-4 py-3 font-semibold">{column.label}</th>)}</tr></thead>
        <tbody>{rows.map(row=><tr key={row.id} className="border-b border-gray-100 last:border-0">{definition.columns.map(column=><td key={column.key} className="max-w-xs px-4 py-3 align-top text-gray-700">{row[column.key]??'—'}</td>)}</tr>)}</tbody>
      </table>
    </div>
    {rows.length===0&&<p role="status" className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-600">{definition.emptyText}</p>}
  </section>;
}
