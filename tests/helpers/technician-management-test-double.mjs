const technicianId='40000000-0000-0000-0000-000000000000';
const categoryId='50000000-0000-0000-0000-000000000000';
export async function adminTechnicianOverview(){return {
  technicians:[{id:technicianId,name:'TEST USTA',is_active:true,is_test:true,
    profile:{approval_status:'pending',is_available:false},
    categories:[{category_id:categoryId,approval_status:'pending'}],areas:[{city_id:16,district_id:1601}],documents:[]}],
  categories:[{id:categoryId,code:'painting',name:'Boya',is_active:true,requires_document:false}],
  cities:[{id:16,name:'Bursa',is_active:true}],
  districts:[{id:1601,city_id:16,name:'Nilüfer',is_active:true}],
};}
export async function ownTechnicianProfile(){return {
  isActive:true,profile:{approval_status:'approved',is_available:true},
  categories:[{id:categoryId,name:'Boya',status:'approved',requiresDocument:false,hasSubmittedDocument:false,hasVerifiedDocument:false}],
  documents:[],areas:['Bursa / Nilüfer'],
};}
export async function adminCategoryCatalog(){return [{id:categoryId,code:'painting',
  name:'Boya',is_active:true,requires_document:false}];}
