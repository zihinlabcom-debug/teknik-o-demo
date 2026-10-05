export function adminRouteAccess(role:string|null,isActive:boolean,markerValid:boolean){
  if(role===null)return {allowed:false,status:401} as const;
  if(role!=='admin'||!isActive||!markerValid)return {allowed:false,status:403} as const;
  return {allowed:true,status:200} as const;
}
