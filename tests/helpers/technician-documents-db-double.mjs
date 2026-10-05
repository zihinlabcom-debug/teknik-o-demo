export const state={account:{id:'20000000-0000-4000-8000-000000000002',role:'technician'},
  owner:'20000000-0000-4000-8000-000000000002',categoryId:'30000000-0000-4000-8000-000000000003',
  uploads:[],metadata:[],removed:[],failMetadata:false};
export function resetDocumentDouble(){state.account={id:state.owner,role:'technician'};
  state.uploads=[];state.metadata=[];state.removed=[];state.failMetadata=false;}
export async function currentAccount(){return state.account;}
export function adminSupabase(){return {
  from(table){
    if(table==='technician_service_categories')return {select:()=>({eq:()=>({eq:()=>({maybeSingle:async()=>
      ({data:{category_id:state.categoryId},error:null})})})})};
    if(table==='technician_documents')return {
      insert(payload){state.metadata.push(payload);return {select:()=>({single:async()=>state.failMetadata?
        {data:null,error:{message:'failed'}}:{data:{id:'40000000-0000-4000-8000-000000000004'},error:null}})};},
      select:()=>({eq:()=>({maybeSingle:async()=>({data:{technician_id:state.owner,
        storage_path:`technician/${state.owner}/test.pdf`},error:null})})}),
    };
    throw new Error(`Unexpected table ${table}`);
  },
  storage:{from:()=>({upload:async(path)=>{state.uploads.push(path);return {error:null};},
    remove:async(paths)=>{state.removed.push(...paths);return {error:null};},
    createSignedUrl:async()=>({data:{signedUrl:'https://example.invalid/private'},error:null}),
  })},
};}
