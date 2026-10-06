export const INACTIVE_SERVICE_CATEGORIES=[
  {slug:'climate',name:'Klima',group:'planned'},
  {slug:'pet_care',name:'Evcil Hayvan Bakımı',group:'planned'},
  {slug:'garden',name:'Bahçe İşleri',group:'planned'},
  {slug:'plumbing',name:'Tesisat İşleri',group:'planned'},
  {slug:'electrical',name:'Elektrik',group:'planned'},
  {slug:'appliances',name:'Beyaz Eşya',group:'planned'},
  {slug:'windows',name:'Cam / Pencere',group:'planned'},
  {slug:'other_services',name:'Diğer hizmetler',group:'unplanned'},
] as const;

export type InactiveServiceCategory=typeof INACTIVE_SERVICE_CATEGORIES[number];
export function inactiveServiceCategory(slug:unknown):InactiveServiceCategory|null{
  return typeof slug==='string'?INACTIVE_SERVICE_CATEGORIES.find(item=>item.slug===slug)??null:null;
}
