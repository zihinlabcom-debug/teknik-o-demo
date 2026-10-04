// Real two-connection acceptance race on disposable tekniko_operation_test only.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';

const run=promisify(execFile);
const container=process.argv[2]||'tekniko-operation-pg';
assert.ok(['tekniko-operation-pg','tekniko-stage15-price-pg'].includes(container),'disposable container only');
const args=['exec',container,'psql','-X','-q','-t','-A','-v','ON_ERROR_STOP=1',
  '-U','postgres','-d','tekniko_operation_test'];
async function sql(source){
  const {stdout}=await run('docker',[...args,'-c',source],{maxBuffer:1024*1024});
  return stdout.trim();
}
async function attempt(source){
  try{return {ok:true,value:await sql(source)};}
  catch(error){return {ok:false,error:String(error.stderr||error.message)};}
}
function lockRequest(id){
  return new Promise((resolve,reject)=>{
    const child=spawn('docker',[...args,'-c',
      `begin; select id from public.service_requests where id='${id}' for update; select 'LOCKED'; select pg_sleep(3); commit;`]);
    let output='';let error='';let ready=false;
    child.stdout.on('data',chunk=>{
      output+=chunk.toString();
      if(!ready&&output.includes('LOCKED')){ready=true;resolve(child);}
    });
    child.stderr.on('data',chunk=>{error+=chunk.toString();});
    child.on('error',reject);
    child.on('exit',code=>{if(!ready)reject(new Error(`Request lock failed ${code}: ${error}`));});
  });
}

assert.equal(await sql('select current_database()'),'tekniko_operation_test');
const customer=randomUUID(),request=randomUUID(),quoteA=randomUUID(),quoteB=randomUUID();
await sql(`
  insert into auth.users(id) values('${customer}');
  insert into public.users(id,name,role) values('${customer}','TEST QUOTE CUSTOMER','customer');
  insert into public.service_requests(id,customer_id) values('${request}','${customer}');
  insert into public.service_quotes(id,service_request_id,version,status,subtotal,service_fee,total_amount)
    values('${quoteA}','${request}',1,'offered',100.00,15.00,115.00),
          ('${quoteB}','${request}',2,'offered',200.00,30.00,230.00);
`);
const lock=await lockRequest(request);
const results=await Promise.all([
  attempt(`set role service_role; select public.accept_service_quote('${quoteA}','${customer}')`),
  attempt(`set role service_role; select public.accept_service_quote('${quoteB}','${customer}')`)
]);
assert.equal(results.filter(result=>result.ok).length,1,'one quote accepted');
assert.match(results.find(result=>!result.ok).error,/Another quote is already accepted for this request/);
const winner=results.find(result=>result.ok).value;
assert.ok(winner===quoteA||winner===quoteB);
assert.equal(await sql(`select count(*) from public.service_quotes where service_request_id='${request}' and status='accepted'`),'1');
assert.equal(await sql(`select count(*) from public.operational_events where service_request_id='${request}' and event_type='quote.accepted'`),'1');
assert.equal(await sql(`select total_amount::text from public.service_quotes where id='${winner}'`),winner===quoteA?'115.00':'230.00');
assert.equal(await sql(`set role service_role; select public.accept_service_quote('${winner}','${customer}')`),winner);
assert.equal(await sql(`select count(*) from public.operational_events where service_request_id='${request}' and event_type='quote.accepted'`),'1');
assert.equal(lock.exitCode,0);
console.log('PASS: concurrent quote acceptance has one winner, stable numeric snapshot and one event');
