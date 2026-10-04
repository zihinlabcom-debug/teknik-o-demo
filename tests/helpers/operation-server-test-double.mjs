export class OperationError extends Error {
  constructor(code='test',status=500,message='test'){
    super(message);
    this.code=code;
    this.status=status;
  }
}
export async function customerRequestList(){ return []; }
export async function customerRequestDetail(){
  return {
    id:'00000000-0000-0000-0000-000000000000', status:'created', created_at:'2026-10-04T12:00:00Z',
    category_name:'Hizmet', address:null, technician:null, quotes:[], appointments:[], events:[]
  };
}
export async function technicianOffers(){ return []; }
export async function technicianActiveJobs(){ return []; }
export async function technicianJobDetail(){
  return {
    id:'00000000-0000-0000-0000-000000000000', service_request_id:'10000000-0000-0000-0000-000000000000',
    dispatch_id:'20000000-0000-0000-0000-000000000000', accepted_quote_id:'30000000-0000-0000-0000-000000000000',
    technician_id:'40000000-0000-0000-0000-000000000000', status:'assigned', assigned_at:'2026-10-04T12:00:00Z',
    started_at:null, completed_at:null, cancelled_at:null, request:null, quote:null, category:{name:'Hizmet'}, address:null, appointments:[]
  };
}
export async function adminRequestList(){ return []; }
export async function adminRequestDetail(){
  return {
    id:'00000000-0000-0000-0000-000000000000', status:'created', created_at:'2026-10-04T12:00:00Z',
    customer:null, category:null, quotes:[], dispatches:[], jobs:[], events:[]
  };
}
