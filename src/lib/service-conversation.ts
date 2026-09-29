import {createHmac,timingSafeEqual} from 'node:crypto';
import {diagnose,type DiagnosisMessage} from './diagnosis';
import {decodeBoilerState} from './boiler-diagnosis';
import {ACTIVE_SERVICE_CATEGORIES,inspectServiceCategory,isServiceCategory,serviceCategoryLabel,type ServiceCategory} from './service-categories';
import {hidesFinalTechnicalText,visualProgress,type ServiceResponse} from './service-presentation';

type EngineReply = Partial<ServiceResponse>&{aiText:string};
export type CategoryEngine = (message:string,history:DiagnosisMessage[],stateToken?:unknown)=>Promise<EngineReply>;
export interface CategoryConversationState {
  version:1; category:ServiceCategory|null; boilerStateToken:string|null;
  categoryState:ServiceResponse['categoryState']; answeredQuestionKeys:string[]; pendingQuestionKey:string|null;
  lastTurnId:string|null; lastResponse:Omit<ServiceResponse,'conversationToken'>|null;
}
const secret=()=>process.env.DIAGNOSIS_STATE_SECRET||process.env.OPENAI_API_KEY;
function encodeConversationState(state:CategoryConversationState){
  const key=secret();if(!key)return null;
  const body=Buffer.from(JSON.stringify({state,expires:Date.now()+24*60*60*1000})).toString('base64url');
  return `service.${body}.${createHmac('sha256',key).update('service-v1:'+body).digest('base64url')}`;
}
export function decodeConversationState(token:unknown):CategoryConversationState|null {
  if(!token)return null;
  const key=secret();
  if(typeof token!=='string'||token.length>250000||!token.startsWith('service.')||!key)throw Error('Invalid service conversation');
  const [,body,mac]=token.split('.'),expected=createHmac('sha256',key).update('service-v1:'+body).digest();
  const received=Buffer.from(mac??'','base64url');
  if(received.length!==expected.length||!timingSafeEqual(received,expected))throw Error('Invalid service conversation signature');
  const parsed=JSON.parse(Buffer.from(body,'base64url').toString()),state=parsed.state;
  if(parsed.expires<Date.now()||state?.version!==1||state.category!==null&&!isServiceCategory(state.category)||
      !Array.isArray(state.answeredQuestionKeys)||state.answeredQuestionKeys.length>32||
      state.answeredQuestionKeys.some((id:unknown)=>typeof id!=='string'))throw Error('Invalid service conversation state');
  return state;
}
function emptyConversation(category:ServiceCategory|null):CategoryConversationState {
  return {version:1,category,boilerStateToken:null,categoryState:null,answeredQuestionKeys:[],pendingQuestionKey:null,lastTurnId:null,lastResponse:null};
}
const emptyReply = ():Omit<ServiceResponse,'conversationToken'> => ({
  category:null,stateToken:null,categoryState:null,answeredSystemQuestions:0,visualProgress:0,informationProgress:0,questionCount:0,awaitingAnswer:false,
  resultState:'category_clarification',aiText:'',options:[],assessmentComplete:false,candidateProbabilities:[],groupProbabilities:[],
  diagnosticEvidence:[],diagnosticStatus:'diagnosing',researchStatus:'not_found',canRouteTechnician:false,isReadyForPrice:false,
  pricingStatus:'not_available',pricingData:null,estimatedPrice:null,priceSource:null,deterministicOMF:null,confidence:0,
  faultTitle:null,basePartPrice:0,technicalSource:null,
});

export async function diagnoseService(message:string,history:DiagnosisMessage[],legacyToken?:unknown,options:{
  category?:unknown; categorySelected?:boolean; conversationToken?:unknown; turnId?:unknown; boiler?:CategoryEngine;
}={}):Promise<ServiceResponse> {
  let previous=decodeConversationState(options.conversationToken);
  const supplied=isServiceCategory(options.category)?options.category:null,detected=inspectServiceCategory(message);
  // Backwards compatibility for existing boiler clients, without letting their
  // token leak into a selected non-boiler category.
  if(!previous&&typeof legacyToken==='string'&&legacyToken.startsWith('boiler.')&&
      (!supplied||supplied==='boiler')&&!detected.unsupported&&!detected.categories.some(c=>c!=='boiler')){
    const child=decodeBoilerState(legacyToken);
    if(child){
      previous=emptyConversation('boiler');previous.boilerStateToken=legacyToken;
      const pending=!child.finished&&child.totalAskedQuestions>0;
      previous.pendingQuestionKey=pending?`${child.sessionId}:${child.totalAskedQuestions}`:null;
      previous.answeredQuestionKeys=Array.from({length:Math.max(0,child.totalAskedQuestions-(pending?1:0))},(_,i)=>'legacy-'+i);
    }
  }
  const active=previous?.category??supplied;
  const ambiguous=detected.unsupported||(!active||detected.explicitRequest)&&detected.categories.length>1||options.category!==undefined&&!isServiceCategory(options.category);
  const category=options.categorySelected?supplied:ambiguous?null:
    active&&!detected.explicitRequest?active:detected.category??active;
  const changed=!!previous&&previous.category!==null&&previous.category!==category;
  const state=changed?emptyConversation(category):previous??emptyConversation(category);
  state.category=category;
  const turnId=typeof options.turnId==='string'&&options.turnId.length<=128?options.turnId:null;
  if(!changed&&turnId&&state.lastTurnId===turnId&&state.lastResponse)
    return {...state.lastResponse,conversationToken:encodeConversationState(state)};
  if(state.pendingQuestionKey&&!state.answeredQuestionKeys.includes(state.pendingQuestionKey))
    state.answeredQuestionKeys.push(state.pendingQuestionKey);
  state.pendingQuestionKey=null;
  let reply=emptyReply();
  if(category==='boiler'){
    const run:CategoryEngine=options.boiler??diagnose;
    const engine=await run(message,changed?[]:history,state.boilerStateToken??(!previous&&!changed?legacyToken:null));
    reply={...reply,...engine,category,resultState:engine.resultState??'diagnosing'};
    const child=decodeBoilerState(reply.stateToken);
    reply.questionCount=child?.totalAskedQuestions??engine.questionCount??0;
    reply.awaitingAnswer=['diagnosing','verification'].includes(reply.resultState)&&!reply.assessmentComplete&&reply.questionCount>0;
    state.boilerStateToken=reply.stateToken;
    state.categoryState=null;
    state.pendingQuestionKey=reply.awaitingAnswer?`${child?.sessionId??'boiler'}:${reply.questionCount}`:null;
    if(hidesFinalTechnicalText(reply.resultState))reply.aiText='';
  }else if(category){
    // These catalog/card definitions had no implemented question/price engines.
    // A separate start state is ready for a future category-specific engine.
    state.boilerStateToken=null;state.categoryState={category,stage:'start'};
    reply={...reply,category,categoryState:state.categoryState,resultState:'category_unavailable',
      aiText:`${serviceCategoryLabel(category)} için çevrim içi teklif şu anda sunulamıyor.`};
  }else{
    state.boilerStateToken=null;state.categoryState=null;
    reply={...reply,aiText:'Hangi hizmet için yardım istiyorsunuz?',options:ACTIVE_SERVICE_CATEGORIES.map(c=>c.label),
      awaitingAnswer:true,questionCount:1};
    state.pendingQuestionKey='category-selection';
  }
  reply.answeredSystemQuestions=state.answeredQuestionKeys.length;
  reply.visualProgress=visualProgress(reply.answeredSystemQuestions);
  state.lastTurnId=turnId;state.lastResponse=reply;
  return {...reply,conversationToken:encodeConversationState(state)};
}
