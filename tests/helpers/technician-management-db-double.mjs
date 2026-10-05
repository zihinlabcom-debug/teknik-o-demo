let account=null;
let response={data:true,error:null};
export const calls=[];
export function setAccount(value){account=value;}
export function setResponse(value){response=value;}
export async function currentAccount(){return account;}
export function adminSupabase(){return {rpc:async(name,args)=>{calls.push({name,args});return response;}};}
