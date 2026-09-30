'use client';

import {useSyncExternalStore} from 'react';

const subscribeToStorage=(notify:()=>void)=>{
  window.addEventListener('storage',notify);
  return ()=>window.removeEventListener('storage',notify);
};
const customerStatus=(): 'authenticated'|'guest'=>{
  try {return localStorage.getItem('tekniko_customer')?'authenticated':'guest';}
  catch {return 'guest';}
};
const serverStatus=(): 'checking'=>'checking';

export function useCustomerSession(){
  return useSyncExternalStore(subscribeToStorage,customerStatus,serverStatus);
}
