import 'server-only';
import {requireRole} from './operation-guard';
import {adminSupabase} from './account-supabase';
import {caseInbox,answerCaseQuestion} from '../../../../src/lib/t111-case-server';
export async function ownCaseInbox(){const a=await requireRole('customer');return caseInbox(adminSupabase(),a.id);}
export async function ownCaseAnswer(id:string,input:Record<string,unknown>){const a=await requireRole('customer');return answerCaseQuestion(adminSupabase(),a.id,id,input);}
