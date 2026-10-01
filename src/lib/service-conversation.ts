import {createHmac,timingSafeEqual} from 'node:crypto';
import {diagnose,type DiagnosisMessage} from './diagnosis';
import {decodeBoilerState} from './boiler-diagnosis';
import {diagnosePainting} from './painting-engine';
import {runCleaning,type CleaningState} from './cleaning-engine';
import {CLEANING_SERVICES} from './cleaning-types';
import {parseHomeExtras} from './cleaning-home';
import {ACTIVE_SERVICE_CATEGORIES,inspectServiceCategory,isServiceCategory,serviceCategoryLabel,type ServiceCategory} from './service-categories';
import {hidesFinalTechnicalText,visualProgress,type ServiceResponse} from './service-presentation';

type EngineReply = Partial<ServiceResponse>&{aiText:string};
export type CategoryEngine = (message:string,history:DiagnosisMessage[],stateToken?:unknown)=>Promise<EngineReply>;
export type PaintingServiceType='wall_painting'|'furniture_painting'|'exterior_painting';
const paintingServices=[
  {type:'wall_painting',label:'Duvar Boyama'},
  {type:'furniture_painting',label:'Mobilya Boyama'},
  {type:'exterior_painting',label:'Dış Cephe Boyama'},
] as const;
const selectedPaintingService=(message:string):PaintingServiceType|null=>
  paintingServices.find(service=>service.label.toLocaleLowerCase('tr-TR')===message.trim().toLocaleLowerCase('tr-TR'))?.type??null;
export interface CategoryConversationState {
  version:1; category:ServiceCategory|null; boilerStateToken:string|null; paintingStateToken?:string|null;
  paintingServiceType?:PaintingServiceType|null;
  cleaningState?:CleaningState|null;
  categoryState:ServiceResponse['categoryState']; answeredQuestionKeys:string[]; pendingQuestionKey:string|null;
  lastTurnId:string|null; lastResponse:Omit<ServiceResponse,'conversationToken'>|null;
  pendingCategoryHistory?:DiagnosisMessage[];
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
      state.paintingServiceType!==undefined&&state.paintingServiceType!==null&&
        !paintingServices.some(service=>service.type===state.paintingServiceType)||
      state.cleaningState!==undefined&&state.cleaningState!==null&&
        (!['home_cleaning','apartment_cleaning','upholstery_cleaning','carpet_cleaning',null].includes(state.cleaningState.serviceType)||
          !['home','apartment','upholstery','carpet'].every(key=>state.cleaningState[key]==null||
            typeof state.cleaningState[key]==='object'))||
      !Array.isArray(state.answeredQuestionKeys)||state.answeredQuestionKeys.length>32||
      state.answeredQuestionKeys.some((id:unknown)=>typeof id!=='string'))throw Error('Invalid service conversation state');
  if(state.pendingCategoryHistory!==undefined&&(!Array.isArray(state.pendingCategoryHistory)||state.pendingCategoryHistory.length>8||
    state.pendingCategoryHistory.some((m:DiagnosisMessage)=>!m||!['user','assistant'].includes(m.role)||typeof m.content!=='string'||m.content.length>6000)))
    throw Error('Invalid pending category history');
  return state;
}
function emptyConversation(category:ServiceCategory|null):CategoryConversationState {
  return {version:1,category,boilerStateToken:null,paintingStateToken:null,paintingServiceType:null,cleaningState:null,
    categoryState:null,answeredQuestionKeys:[],pendingQuestionKey:null,lastTurnId:null,lastResponse:null};
}
const emptyReply = ():Omit<ServiceResponse,'conversationToken'> => ({
  category:null,stateToken:null,categoryState:null,answeredSystemQuestions:0,visualProgress:0,informationProgress:0,questionCount:0,awaitingAnswer:false,
  resultState:'category_clarification',aiText:'',options:[],assessmentComplete:false,candidateProbabilities:[],groupProbabilities:[],
  diagnosticEvidence:[],diagnosticStatus:'diagnosing',researchStatus:'not_found',canRouteTechnician:false,isReadyForPrice:false,
  pricingStatus:'not_available',pricingData:null,estimatedPrice:null,priceSource:null,deterministicOMF:null,confidence:0,
  faultTitle:null,basePartPrice:0,technicalSource:null,
});
function mergeCategoryHistory(saved:DiagnosisMessage[],history:DiagnosisMessage[]){
  let overlap=Math.min(saved.length,history.length);
  while(overlap&&!saved.slice(-overlap).every((m,i)=>m.role===history[i].role&&m.content===history[i].content))overlap--;
  return [...saved.slice(0,saved.length-overlap),...history];
}

export async function diagnoseService(message:string,history:DiagnosisMessage[],legacyToken?:unknown,options:{
  category?:unknown; categorySelected?:boolean; conversationToken?:unknown; turnId?:unknown;
  boiler?:CategoryEngine; painting?:CategoryEngine;
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
  const cleaningServiceAnswer=active==='cleaning'&&previous?.lastResponse?.resultState==='cleaning_service_selection'&&
    CLEANING_SERVICES.some(service=>service.label.toLocaleLowerCase('tr-TR')===message.trim().toLocaleLowerCase('tr-TR'));
  const cleaningExtraAnswer=active==='cleaning'&&previous?.cleaningState?.serviceType==='home_cleaning'&&
    previous.cleaningState.home?.step==='extras'&&parseHomeExtras(message)!==null;
  const ambiguous=(detected.unsupported&&!cleaningExtraAnswer)||
    (!active||detected.explicitRequest)&&detected.categories.length>1||
    options.category!==undefined&&!isServiceCategory(options.category);
  const category=options.categorySelected?supplied:cleaningServiceAnswer?'cleaning':ambiguous?null:
    active&&!detected.explicitRequest?active:detected.category??active;
  const changed=!!previous&&previous.category!==null&&previous.category!==category;
  const restartedPainting=category==='painting'&&previous?.category==='painting'&&
    options.categorySelected===true&&supplied==='painting';
  const restartedCleaning=(category==='cleaning'||category==='sofa_cleaning'||category==='carpet_cleaning')&&previous?.category===category&&
    options.categorySelected===true&&supplied===category;
  const state=changed||restartedPainting||restartedCleaning?emptyConversation(category):previous??emptyConversation(category);
  state.category=category;
  const turnId=typeof options.turnId==='string'&&options.turnId.length<=128?options.turnId:null;
  if(!changed&&turnId&&previous?.lastTurnId===turnId&&previous.lastResponse)
    return {...previous.lastResponse,conversationToken:encodeConversationState(previous)};
  const awaitingPaintingService=state.pendingQuestionKey==='painting-service-selection';
  if(state.pendingQuestionKey&&!['painting','cleaning','sofa_cleaning','carpet_cleaning'].includes(state.category??'')&&
      !state.answeredQuestionKeys.includes(state.pendingQuestionKey))
    state.answeredQuestionKeys.push(state.pendingQuestionKey);
  state.pendingQuestionKey=null;
  let reply=emptyReply();
  if(category==='boiler'){
    const run:CategoryEngine=options.boiler??diagnose;
    const engineHistory=mergeCategoryHistory(state.pendingCategoryHistory??[],changed?[]:history);
    const engine=await run(message,engineHistory,state.boilerStateToken??(!previous&&!changed?legacyToken:null));
    reply={...reply,...engine,category,resultState:engine.resultState??'diagnosing'};
    const child=decodeBoilerState(reply.stateToken);
    reply.questionCount=child?.totalAskedQuestions??engine.questionCount??0;
    reply.awaitingAnswer=['diagnosing','verification'].includes(reply.resultState)&&!reply.assessmentComplete&&reply.questionCount>0;
    state.boilerStateToken=reply.stateToken;
    state.paintingStateToken=null;
    if(child)delete state.pendingCategoryHistory;
    else{
      const context=[...engineHistory,{role:'user' as const,content:message}];
      state.pendingCategoryHistory=context.length>8?[context[0],...context.slice(-7)]:context;
    }
    state.categoryState=null;
    state.pendingQuestionKey=reply.awaitingAnswer?`${child?.sessionId??'boiler'}:${reply.questionCount}`:null;
    if(hidesFinalTechnicalText(reply.resultState))reply.aiText='';
  }else if(category==='painting'){
    const serviceType=state.paintingServiceType??
      (awaitingPaintingService?selectedPaintingService(message):null);
    state.paintingServiceType=serviceType;
    state.boilerStateToken=null;state.categoryState={category,stage:'start'};
    if(!serviceType){
      state.paintingStateToken=null;
      state.pendingQuestionKey='painting-service-selection';
      if(!state.pendingCategoryHistory)
        state.pendingCategoryHistory=[...mergeCategoryHistory([],changed||restartedPainting?[]:history),
          {role:'user' as const,content:message}].slice(-8);
      reply={...reply,category,resultState:'painting_service_selection',
        aiText:'Hangi boya hizmetine ihtiyacınız var?',options:paintingServices.map(service=>service.label),
        questionCount:1,awaitingAnswer:true};
    }else if(serviceType!=='wall_painting'){
      state.paintingStateToken=null;delete state.pendingCategoryHistory;
      const label=paintingServices.find(service=>service.type===serviceType)!.label;
      reply={...reply,category,resultState:'category_unavailable',categoryState:state.categoryState,
        aiText:`${label} hizmeti geliştirme aşamasında. Şu anda çevrim içi teklif sunulamıyor.`};
    }else{
      const run:CategoryEngine=options.painting??diagnosePainting;
      const engineHistory=state.pendingCategoryHistory??(changed?[]:history);
      // The subservice button is routing input, not a wall/ceiling observation.
      const engine=await run(awaitingPaintingService?'':message,engineHistory,state.paintingStateToken??null);
      reply={...reply,...engine,category,resultState:engine.resultState??'painting_question'};
      reply.answeredSystemQuestions=engine.answeredSystemQuestions??0;
      reply.questionCount=engine.questionCount??0;
      reply.awaitingAnswer=['painting_question','painting_color_catalog','painting_color_confirmation']
        .includes(reply.resultState);
      state.paintingStateToken=reply.stateToken;
      delete state.pendingCategoryHistory;
    }
  }else if(category==='cleaning'||category==='sofa_cleaning'||category==='carpet_cleaning'){
    state.boilerStateToken=null;state.paintingStateToken=null;state.paintingServiceType=null;
    state.categoryState={category,stage:'start'};
    const engine=runCleaning(message,state.cleaningState,category==='sofa_cleaning'?'upholstery_cleaning':
      category==='carpet_cleaning'?'carpet_cleaning':undefined);
    state.cleaningState=engine.state;
    delete state.pendingCategoryHistory;
    const {state:childState,...cleaningReply}=engine;
    void childState;
    reply={...reply,...cleaningReply,category,categoryState:state.categoryState,stateToken:null};
  }else if(category){
    // These catalog/card definitions had no implemented question/price engines.
    // A separate start state is ready for a future category-specific engine.
    state.boilerStateToken=null;state.paintingStateToken=null;state.paintingServiceType=null;state.categoryState={category,stage:'start'};
    delete state.pendingCategoryHistory;
    reply={...reply,category,categoryState:state.categoryState,resultState:'category_unavailable',
      aiText:`${serviceCategoryLabel(category)} için çevrim içi teklif şu anda sunulamıyor.`};
  }else{
    state.boilerStateToken=null;state.paintingStateToken=null;state.paintingServiceType=null;state.categoryState=null;
    reply={...reply,aiText:'Hangi hizmet için yardım istiyorsunuz?',options:ACTIVE_SERVICE_CATEGORIES.map(c=>c.label),
      awaitingAnswer:true,questionCount:1};
    state.pendingQuestionKey='category-selection';
    const context=[...mergeCategoryHistory(state.pendingCategoryHistory??[],changed?[]:history),
      {role:'user' as const,content:message},{role:'assistant' as const,content:reply.aiText}];
    // Keep the initial request plus recent clarification turns, bounded in the
    // signed token; repeated user answers are not deduplicated by their text.
    state.pendingCategoryHistory=context.length>8?[context[0],...context.slice(-7)]:context;
  }
  if(!['painting','cleaning','sofa_cleaning','carpet_cleaning'].includes(category??''))reply.answeredSystemQuestions=state.answeredQuestionKeys.length;
  reply.visualProgress=visualProgress(reply.answeredSystemQuestions);
  state.lastTurnId=turnId;state.lastResponse=reply;
  return {...reply,conversationToken:encodeConversationState(state)};
}
