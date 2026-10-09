export const STAGE10_COMPLAINT_PAGE_SIZE=200;

export function normalizeComplaintPage(value:unknown){
  const page=typeof value==='string'&&/^\d+$/.test(value)?Number(value):1;
  return Number.isSafeInteger(page)&&page>=1&&page<=100000?page:1;
}

export function complaintPageRange(page:number){
  const from=(page-1)*STAGE10_COMPLAINT_PAGE_SIZE;
  return {from,to:from+STAGE10_COMPLAINT_PAGE_SIZE};
}

export function finalizeComplaintPage<T>(rows:T[]){
  return {items:rows.slice(0,STAGE10_COMPLAINT_PAGE_SIZE),hasNext:rows.length>STAGE10_COMPLAINT_PAGE_SIZE};
}
