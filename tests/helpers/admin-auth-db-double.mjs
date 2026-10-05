export const state={role:'admin',active:true,email:'admin-test@example.invalid',
  authId:'10000000-0000-4000-8000-000000000001',blocked:false,failures:0,
  verifyCount:0,signOutCount:0,sessionOptions:null};
export const fakeSessionId='70000000-0000-4000-8000-000000000007';
export const fakeAccessToken=`x.${Buffer.from(JSON.stringify({session_id:fakeSessionId})).toString('base64url')}.x`;
export function resetAdminAuthDouble(){Object.assign(state,{role:'admin',active:true,
  email:'admin-test@example.invalid',authId:'10000000-0000-4000-8000-000000000001',
  blocked:false,failures:0,verifyCount:0,signOutCount:0,sessionOptions:null});}
export function adminSupabase(){return {
  rpc:async(_name,args)=>{
    if(args.p_action==='check')return {data:!state.blocked,error:null};
    if(args.p_action==='failure'){state.failures++;return {data:false,error:null};}
    return {data:true,error:null};
  },
  from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{id:state.authId,
    role:state.role,is_active:state.active},error:null})})})}),
  auth:{admin:{
    getUserById:async()=>({data:{user:{id:state.authId,email:state.email}},error:null}),
    generateLink:async()=>({data:{user:{id:state.authId},properties:{hashed_token:'fake-hash'}},error:null}),
  }},
};}
export async function serverSupabase(options){state.sessionOptions=options;return {auth:{
  verifyOtp:async()=>{state.verifyCount++;return {data:{user:{id:state.authId},
    session:{access_token:fakeAccessToken}},error:null};},
  signOut:async()=>{state.signOutCount++;return {error:null};},
}};}
