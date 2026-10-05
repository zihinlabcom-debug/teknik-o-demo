let account=null;
let authUserId=null;
let signOutCount=0;
let otpRequests=0;
export function setFakeAccount(value){account=value;authUserId=value?.id??null;signOutCount=0;otpRequests=0;}
export function changeFakeRole(role){if(account)account={...account,role};}
export function fakeStats(){return {signOutCount,otpRequests};}

export function adminSupabase(){return {
  from(){return {select(){return {in(){return {limit:async()=>({data:account?[account]:[],error:null})};}};}};},
  auth:{admin:{generateLink:async()=>({data:null,error:new Error('Test links disabled')})}},
};}

export async function serverSupabase(){return {
  auth:{
    signInWithOtp:async()=>{otpRequests++;return {error:null};},
    verifyOtp:async()=>({data:{user:authUserId?{id:authUserId}:null},error:authUserId?null:new Error('No user')}),
    signOut:async()=>{signOutCount++;return {error:null};},
  },
  from(){return {select(){return {eq(){return {maybeSingle:async()=>({
    data:account?{role:account.role,is_active:account.is_active}:null,error:null,
  })};}};}};},
};}
