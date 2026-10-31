import 'server-only';
import {t100Rpc,type T100Db,T100Error} from './t100-rpc';
import type {CaseQuestion,CaseNotice} from './t111-contract';
export async function caseInbox(db:T100Db,actorId:string){
 return await t100Rpc(db,'t111_case_inbox',{p_actor_id:actorId}) as {questions:CaseQuestion[];notices:CaseNotice[]};
}
export async function answerCaseQuestion(db:T100Db,actorId:string,id:string,input:Record<string,unknown>){
 if(!/^[0-9a-f-]{36}$/i.test(id)||typeof input.text!=='string'||input.text.trim().length<10||input.text.trim().length>2000||typeof input.key!=='string'||input.key.length<8||input.key.length>128||Object.keys(input).some(k=>!['text','key'].includes(k)))throw new T100Error(400,'invalid_response','Yanıt 10–2000 karakter olmalıdır.');
 return {id:await t100Rpc(db,'t111_respond_information',{p_id:id,p_actor_id:actorId,p_text:input.text.trim(),p_key:input.key})};
}
