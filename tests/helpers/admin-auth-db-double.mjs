export const state={role:'admin',active:true,email:'admin-test@example.invalid',
  confirmed:true,authId:'10000000-0000-4000-8000-000000000001',blocked:false,
  failures:0,signOutCount:0,sessionOptions:null,password:'admin-password-123A',
  signInCount:0,magicLinks:0,authorization:true,authorizationError:false,approvalCalls:[]};
export const fakeSessionId='70000000-0000-4000-8000-000000000007';
export const fakeAccessToken=`x.${Buffer.from(JSON.stringify({session_id:fakeSessionId})).toString('base64url')}.x`;
export function resetAdminAuthDouble(){Object.assign(state,{role:'admin',active:true,
  email:'admin-test@example.invalid',confirmed:true,authId:'10000000-0000-4000-8000-000000000001',
  blocked:false,failures:0,signOutCount:0,sessionOptions:null,signInCount:0,magicLinks:0,
  password:'admin-password-123A',authorization:true,authorizationError:false,approvalCalls:[]});}
export function adminSupabase(){return {
  rpc:async(_name,args)=>{
    if(_name==='admin_authorize_session'){
      state.approvalCalls.push(args);
      return {data:state.authorization,error:state.authorizationError?{message:'DB unavailable'}:null};
    }
    if(args.p_action==='check')return {data:!state.blocked,error:null};
    if(args.p_action==='failure'){state.failures++;return {data:false,error:null};}
    return {data:true,error:null};
  },
  from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{id:state.authId,
    role:state.role,is_active:state.active},error:null})})})}),
  auth:{admin:{
    getUserById:async()=>({data:{user:{id:state.authId,email:state.email}},error:null}),
    generateLink:async()=>{state.magicLinks++;return {error:new Error('legacy bypass forbidden')};},
  }},
};}
export async function serverSupabase(options){
  state.sessionOptions=options;
  const makeUser=()=>({id:state.authId,email:state.email,email_confirmed_at:state.confirmed?'2026-10-13T00:00:00Z':null});
  return {auth:{
    signInWithPassword:async({email,password})=>{
      state.signInCount++;
      if(email!==state.email||password!==state.password)return {data:{user:null,session:null},error:{message:'wrong'}};
      return {data:{user:makeUser(),session:{access_token:fakeAccessToken}},error:null};
    },
    getUser:async()=>({data:{user:makeUser()},error:null}),
    signOut:async()=>{state.signOutCount++;return {error:null};},
  }};
}
