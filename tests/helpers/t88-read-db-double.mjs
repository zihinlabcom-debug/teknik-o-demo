import {AsyncLocalStorage} from 'node:async_hooks';

const context=new AsyncLocalStorage();
export const withReadFixture=(fixture,fn)=>context.run(fixture,fn);
export function readFixture(){
  const value=context.getStore();
  if(!value)throw new Error('Read fixture must be explicitly scoped');
  return value;
}

export function makeReadFixture({account={id:'10000000-0000-4000-8000-000000000001',role:'customer',is_active:true,is_test:true},tables={},errors={},reject={},beforeQuery,avatarError=false}={}){
  const fixture={account,tables,errors,reject,calls:[],authReads:0,extraUserReads:0,adminClients:0,signed:[],returnedRows:0};
  fixture.db={from(table){
    const q={table,columns:'*',filters:[],sorts:[],cap:null,mode:'array'};
    const builder={
      select(columns){q.columns=columns;return this;},
      eq(key,value){q.filters.push(['eq',key,value]);return this;},
      in(key,values){q.filters.push(['in',key,values]);return this;},
      is(key,value){q.filters.push(['is',key,value]);return this;},
      not(key,operator,value){if(operator!=='is')throw Error('Unsupported test operator');q.filters.push(['not-is',key,value]);return this;},
      order(key,{ascending=true}={}){q.sorts.push([key,ascending]);return this;},
      limit(value){q.cap=value;return this;},
      single(){q.mode='single';return this;},
      maybeSingle(){q.mode='maybeSingle';return this;},
      async then(resolve,rejectPromise){
        try{
          fixture.calls.push(structuredClone(q));
          if(beforeQuery)await beforeQuery(q,fixture);
          if(fixture.reject[table])throw fixture.reject[table];
          let rows=structuredClone(fixture.tables[table]??[]).filter(row=>q.filters.every(([op,key,value])=>{
            if(op==='eq')return row[key]===value;
            if(op==='in')return value.includes(row[key]);
            if(op==='is')return (row[key]??null)===value;
            return (row[key]??null)!==value;
          }));
          for(const [key,ascending]of [...q.sorts].reverse())rows.sort((a,b)=>(a[key]>b[key]?1:a[key]<b[key]?-1:0)*(ascending?1:-1));
          if(q.cap!==null)rows=rows.slice(0,q.cap);
          fixture.returnedRows+=rows.length;
          if(q.columns!=='*')rows=rows.map(row=>Object.fromEntries(q.columns.split(',').map(k=>[k,row[k]])));
          const error=fixture.errors[table]??(q.mode==='single'&&rows.length!==1?{message:'single row required'}:null);
          return resolve({data:error?null:q.mode==='array'?rows:rows[0]??null,error});
        }catch(error){return rejectPromise(error);}
      },
    };
    return builder;
  },storage:{from(bucket){return {async createSignedUrl(avatarPath,expiresIn){
    fixture.signed.push({bucket,path:avatarPath,expiresIn});
    return avatarError?{data:null,error:{message:'test signing error'}}:{data:{signedUrl:'https://example.invalid/synthetic-avatar'},error:null};
  }};}}};
  return fixture;
}
