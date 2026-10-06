export type AccountRole = 'customer' | 'technician' | 'admin';
export type Account = {id:string; role:AccountRole; is_test:boolean; is_active:boolean};

export function isAccountRole(value:unknown):value is AccountRole {
  return value==='customer'||value==='technician'||value==='admin';
}
