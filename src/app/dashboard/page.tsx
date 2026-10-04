'use client';

import React, {Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import Link from 'next/link';
import {useRouter,useSearchParams} from 'next/navigation';
import {ArrowLeft, Paperclip, Send, Sparkles, ShieldCheck, Tag, Lock, ChevronRight, Zap, Bot, User, RefreshCw} from 'lucide-react';
import {ServiceCategoryCards} from '@/components/service-category-cards';
import {DiagnosisProgress, ServiceResultCard, TechnicianHandoffNotice} from '@/components/service-result';
import {DiagnosisDebug} from '@/components/diagnosis-debug';
import {PaintingColorCatalog} from '@/components/painting-color-catalog';
import {CleaningInputSelector} from '@/components/cleaning-input-selector';
import {CleaningCarpetInputSelector} from '@/components/cleaning-carpet-input-selector';
import {changeCarpetQuantity,setCarpetArea,type CarpetSelection} from '@/components/cleaning-carpet-input-selector';
import {CarpetServiceConfigurator} from '@/components/carpet-service-configurator';
import {UpholsteryServiceConfigurator,type UpholsterySelection} from '@/components/upholstery-service-configurator';
import {ApartmentServiceConfigurator,EMPTY_APARTMENT_SELECTION,type ApartmentSelection} from '@/components/apartment-service-configurator';
import {HomeCleaningServiceConfigurator,EMPTY_HOME_CLEANING_SELECTION,type HomeCleaningSelection} from '@/components/home-cleaning-service-configurator';
import {PaintingServiceConfigurator,EMPTY_PAINTING_SELECTION,type PaintingSelection,type PaintingSubmissionStep} from '@/components/painting-service-configurator';
import {changeUpholsteryQuantity} from '@/components/cleaning-input-selector';
import {TeknikOBrand} from '@/components/brand/teknik-o-brand';
import {useServiceConversation} from '@/components/use-service-conversation';
import {isServiceCategory,serviceCategoryLabel, type ServiceCategory} from '@/lib/service-categories';
import {servicePricePresentation,type ServiceResponse} from '@/lib/service-presentation';
import type {CarpetKey} from '@/lib/cleaning-carpet';
import type {UpholsteryKey} from '@/lib/cleaning-upholstery';
import {CLEANING_SERVICES} from '@/lib/cleaning-types';

export default function CustomerDashboard() {
  return <Suspense fallback={null}><DashboardContent /></Suspense>;
}

function DashboardContent() {
  const router=useRouter();
  const requested=useSearchParams().get('category');
  const {messages:chatHistory, input:problemDescription, setInput:setProblemDescription, isAnalyzing,
    response, category, submit, reset, resultDismissed, dismissResult} = useServiceConversation();
  const [isTechnicianDialogOpen, setIsTechnicianDialogOpen] = useState(false);
  const [carpetSelection,setCarpetSelection]=useState<CarpetSelection>({});
  const [upholsterySelection,setUpholsterySelection]=useState<UpholsterySelection>({});
  const [apartmentSelection,setApartmentSelection]=useState<ApartmentSelection>(EMPTY_APARTMENT_SELECTION);
  const [homeSelection,setHomeSelection]=useState<HomeCleaningSelection>(EMPTY_HOME_CLEANING_SELECTION);
  const [paintingSelection,setPaintingSelection]=useState<PaintingSelection>(EMPTY_PAINTING_SELECTION);
  const [paintingServiceOptions,setPaintingServiceOptions]=useState<string[]>([]);
  const [paintingQueue,setPaintingQueue]=useState<{
    steps:PaintingSubmissionStep[];next:number;sent:boolean;fromResponse:ServiceResponse|null;
  }|null>(null);
  const [paintingSubmitError,setPaintingSubmitError]=useState<string|null>(null);
  const [paintingAttempt,setPaintingAttempt]=useState(0);
  const paintingSending=useRef(false);
  const [selectedCleaningConfigurator,setSelectedCleaningConfigurator]=useState<'carpet_cleaning'|'upholstery_cleaning'|'apartment_cleaning'|'home_cleaning'|null>(null);
  const [apartmentQueue,setApartmentQueue]=useState<{answers:string[];next:number;sent:boolean}|null>(null);
  const [apartmentSubmitError,setApartmentSubmitError]=useState<string|null>(null);
  const [apartmentAttempt,setApartmentAttempt]=useState(0);
  const apartmentSending=useRef(false);
  const [homeQueue,setHomeQueue]=useState<{answers:string[];next:number;sent:boolean}|null>(null);
  const [homeSubmitError,setHomeSubmitError]=useState<string|null>(null);
  const [homeAttempt,setHomeAttempt]=useState(0);
  const homeSending=useRef(false);
  const [chatViewport, setChatViewport] = useState<{height:number; top:number}|null>(null);
  const openViewportRef = useRef<{width:number; height:number}|null>(null);
  const messageScrollRef = useRef<HTMLDivElement>(null);
  const lastAssistantRef = useRef<HTMLDivElement>(null);
  const followLatestRef = useRef(true);
  const programmaticScrollRef = useRef(false);
  const programmaticScrollTimerRef = useRef<number|undefined>(undefined);
  const scrollMetricsRef = useRef({height:0, distanceFromBottom:0});
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedCategoryStarted = useRef(false);
  const navigationReady=isServiceCategory(requested);
  const resultCard = !resultDismissed && response ? servicePricePresentation(response) : null;
  const lastAssistantId = [...chatHistory].reverse().find(message => message.sender === 'ai')?.id;
  const latestIsAssistant = chatHistory.at(-1)?.sender === 'ai';
  const markProgrammaticScroll = useCallback(() => {
    programmaticScrollRef.current = true;
    window.clearTimeout(programmaticScrollTimerRef.current);
    programmaticScrollTimerRef.current = window.setTimeout(() => { programmaticScrollRef.current = false; }, 100);
  }, []);
  useEffect(()=>{
    if(!isServiceCategory(requested))router.replace('/hizmetler');
  },[requested,router]);
  useLayoutEffect(() => {
    const area = messageScrollRef.current;
    if (area && followLatestRef.current) {
      markProgrammaticScroll();
      area.scrollTop = area.scrollHeight;
      if (latestIsAssistant) keepQuestionVisible(area, lastAssistantRef.current);
    }
    if (area) scrollMetricsRef.current = {
      height:area.clientHeight,
      distanceFromBottom:area.scrollHeight - area.scrollTop - area.clientHeight,
    };
  }, [chatHistory.length, latestIsAssistant, markProgrammaticScroll]);
  useEffect(() => {
    const area = messageScrollRef.current;
    if (!area) return;
    const observer = new ResizeObserver(() => {
      const previous = scrollMetricsRef.current;
      if (area.clientHeight !== previous.height && followLatestRef.current && previous.distanceFromBottom <= 96) {
        markProgrammaticScroll();
        area.scrollTop = area.scrollHeight;
        keepQuestionVisible(area, lastAssistantRef.current);
      }
      scrollMetricsRef.current = {
        height:area.clientHeight,
        distanceFromBottom:area.scrollHeight - area.scrollTop - area.clientHeight,
      };
    });
    observer.observe(area);
    return () => { observer.disconnect(); window.clearTimeout(programmaticScrollTimerRef.current); };
  }, [markProgrammaticScroll]);
  const updateChatViewport = useCallback(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const width = window.innerWidth;
    const focused = document.activeElement === inputRef.current;
    const openViewport = openViewportRef.current;
    if (!openViewport || openViewport.width !== width) {
      openViewportRef.current = {width, height:viewport.height};
    } else if (!focused && viewport.height > openViewport.height) {
      openViewportRef.current = {width, height:viewport.height};
    }
    const keyboardOpen = focused && width <= 640 &&
      (openViewportRef.current?.height ?? viewport.height) - viewport.height >= 100;
    setChatViewport(previous => {
      const next = keyboardOpen ? {height:Math.floor(viewport.height), top:Math.floor(viewport.offsetTop)} : null;
      return previous?.height === next?.height && previous?.top === next?.top ? previous : next;
    });
  }, [setChatViewport]);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    updateChatViewport();
    viewport.addEventListener('resize', updateChatViewport);
    viewport.addEventListener('scroll', updateChatViewport);
    window.addEventListener('resize', updateChatViewport);
    return () => {
      viewport.removeEventListener('resize', updateChatViewport);
      viewport.removeEventListener('scroll', updateChatViewport);
      window.removeEventListener('resize', updateChatViewport);
    };
  }, [updateChatViewport]);
  useLayoutEffect(() => {
    const area = messageScrollRef.current;
    if (chatViewport && area && followLatestRef.current) {
      markProgrammaticScroll();
      area.scrollTop = area.scrollHeight;
      keepQuestionVisible(area, lastAssistantRef.current);
    }
  }, [chatViewport, markProgrammaticScroll]);
  const keyboardFocusMode = chatViewport !== null;
  useEffect(() => {
    if (!keyboardFocusMode) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [keyboardFocusMode]);
  useEffect(() => {
    if(!navigationReady)return;
    if(!isServiceCategory(requested)||selectedCategoryStarted.current)return;
    selectedCategoryStarted.current=true;
    void submit(`${serviceCategoryLabel(requested)} hizmeti iÃ§in yardÄ±m istiyorum.`,requested);
  },[navigationReady,requested,submit]);
  // The apartment form advances only after each signed backend response; this effect is its small submission state machine.
  /* eslint-disable react-hooks/set-state-in-effect -- Queue transitions here follow external API responses, not derived render state. */
  useEffect(()=>{
    if(!apartmentQueue||apartmentSending.current||isAnalyzing)return;
    const answered=response?.answeredSystemQuestions??-1;
    if(answered>apartmentQueue.next){
      setApartmentQueue(current=>current?{...current,next:answered,sent:false}:null);
      return;
    }
    if(answered!==apartmentQueue.next||apartmentQueue.sent){
      setApartmentSubmitError('Bilgiler gÃ¶nderilemedi. LÃ¼tfen tekrar deneyin.');
      setApartmentQueue(null);
      return;
    }
    if(apartmentQueue.next===apartmentQueue.answers.length){
      setApartmentQueue(null);
      return;
    }
    if(response?.resultState!=='cleaning_question'||response.category!=='cleaning'){
      setApartmentSubmitError('Hizmet akÄ±ÅŸÄ± beklenmedik ÅŸekilde deÄŸiÅŸti. LÃ¼tfen tekrar deneyin.');
      setApartmentQueue(null);
      return;
    }
    apartmentSending.current=true;
    setApartmentQueue(current=>current?{...current,sent:true}:null);
    void submit(apartmentQueue.answers[apartmentQueue.next]).finally(()=>{
      apartmentSending.current=false;
      setApartmentAttempt(current=>current+1);
    });
  },[apartmentQueue,apartmentAttempt,isAnalyzing,response,submit]);
  useEffect(()=>{
    if(!homeQueue||homeSending.current||isAnalyzing)return;
    if(response?.resultState==='priced'||response?.resultState==='uncertain_price'){
      setHomeQueue(null);
      return;
    }
    const answered=response?.answeredSystemQuestions??-1;
    if(answered>homeQueue.next){
      setHomeQueue(current=>current?{...current,next:answered,sent:false}:null);
      return;
    }
    if(answered!==homeQueue.next||homeQueue.sent){
      setHomeSubmitError('Bilgiler gÃ¶nderilemedi. LÃ¼tfen tekrar deneyin.');
      setHomeQueue(null);
      return;
    }
    if(homeQueue.next===homeQueue.answers.length){
      setHomeQueue(null);
      return;
    }
    if(response?.resultState!=='cleaning_question'||response.category!=='cleaning'){
      setHomeSubmitError('Hizmet akÄ±ÅŸÄ± beklenmedik ÅŸekilde deÄŸiÅŸti. LÃ¼tfen tekrar deneyin.');
      setHomeQueue(null);
      return;
    }
    homeSending.current=true;
    setHomeQueue(current=>current?{...current,sent:true}:null);
    void submit(homeQueue.answers[homeQueue.next]).finally(()=>{
      homeSending.current=false;
      setHomeAttempt(current=>current+1);
    });
  },[homeQueue,homeAttempt,isAnalyzing,response,submit]);
  useEffect(()=>{
    if(!paintingQueue||paintingSending.current||isAnalyzing)return;
    const step=paintingQueue.steps[paintingQueue.next];
    if(paintingQueue.sent){
      const expected=(paintingQueue.fromResponse?.answeredSystemQuestions??0)+step.expectedDelta;
      const terminal=response?.resultState==='priced'||response?.resultState==='uncertain_price'||
        response?.resultState==='painting_manual_review';
      const valid=response&&response!==paintingQueue.fromResponse&&response.category==='painting'&&
        response.answeredSystemQuestions===expected&&
        (terminal||step.kind==='dyo_code'&&response.resultState==='painting_color_confirmation'||
          step.kind==='catalog_choice'&&response.resultState==='painting_color_catalog'||
          step.kind==='manual_choice'&&response.resultState==='painting_question'||
          !step.kind&&response.resultState==='painting_question');
      if(!valid){
        setPaintingSubmitError('Boya bilgileri gÃ¶nderilemedi. LÃ¼tfen sayfayÄ± yenileyip tekrar deneyin.');
        setPaintingQueue(null);
        return;
      }
      if(terminal||response.resultState==='painting_color_confirmation'){
        setPaintingQueue(null);
        return;
      }
      if(paintingQueue.next===paintingQueue.steps.length-1){
        setPaintingSubmitError('Boya deÄŸerlendirmesi tamamlanamadÄ±. LÃ¼tfen tekrar deneyin.');
        setPaintingQueue(null);
        return;
      }
      setPaintingQueue(current=>current?{...current,next:current.next+1,sent:false,fromResponse:null}:null);
      return;
    }
    if(!response||response.category!=='painting'||
      (response.resultState!=='painting_question'&&response.resultState!=='painting_color_catalog')){
      setPaintingSubmitError('Boya hizmet akÄ±ÅŸÄ± beklenmedik ÅŸekilde deÄŸiÅŸti. LÃ¼tfen tekrar deneyin.');
      setPaintingQueue(null);
      return;
    }
    paintingSending.current=true;
    setPaintingQueue(current=>current?{...current,sent:true,fromResponse:response}:null);
    void submit(step.answer).finally(()=>{
      paintingSending.current=false;
      setPaintingAttempt(current=>current+1);
    });
  },[paintingQueue,paintingAttempt,isAnalyzing,response,submit]);
  /* eslint-enable react-hooks/set-state-in-effect */
  const handleSubmit = (e?:React.FormEvent, customText?:string) => {
    e?.preventDefault();void submit(customText ?? problemDescription);
  };
  const handleOptionClick = (text:string) => {
    if(category==='cleaning'&&response?.resultState==='cleaning_service_selection'){
      const service=CLEANING_SERVICES.find(item=>item.label===text)?.type;
      setSelectedCleaningConfigurator(service==='carpet_cleaning'||service==='upholstery_cleaning'||service==='apartment_cleaning'||service==='home_cleaning'?service:null);
    }
    handleSubmit(undefined,text);
  };
  const handleCategoryClick = (selected:ServiceCategory) => {
    setIsTechnicianDialogOpen(false);
    setSelectedCleaningConfigurator(null);
    void submit(`${serviceCategoryLabel(selected)} hizmeti iÃ§in yardÄ±m istiyorum.`, selected);
  };
  const handleResetChat = () => {reset();setIsTechnicianDialogOpen(false);};
  const handleFileUpload = (e:React.ChangeEvent<HTMLInputElement>) => {
    const file=e.target.files?.[0];
    if(file)handleSubmit(undefined, `[GÃ¶rsel/Dosya YÃ¼klendi: ${file.name}] Ä°nceleyebilir misiniz?`);
  };

  if(!navigationReady)return null;

  const configurator=requested==='painting'||category==='painting'?'painting':
    requested==='carpet_cleaning'||category==='carpet_cleaning'||selectedCleaningConfigurator==='carpet_cleaning'?'carpet_cleaning':
    requested==='sofa_cleaning'||category==='sofa_cleaning'||selectedCleaningConfigurator==='upholstery_cleaning'?'upholstery_cleaning':
      selectedCleaningConfigurator==='apartment_cleaning'?'apartment_cleaning':
        selectedCleaningConfigurator==='home_cleaning'?'home_cleaning':null;
  if(configurator){
    const lastMessage=chatHistory.at(-1);
    const connectionError=lastMessage?.sender==='ai'&&lastMessage.text==='BaÄŸlantÄ± sÄ±rasÄ±nda bir hata oluÅŸtu. LÃ¼tfen tekrar deneyin.'?
      lastMessage.text:null;
    return <div className="min-h-dvh w-full bg-slate-50 font-sans text-slate-900">
      <div className="mx-auto w-full max-w-[1240px] min-w-0 px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 sm:px-6 lg:px-8">
        <Link href="/kategoriler" className="mb-5 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-[#D97724]">
          <ArrowLeft className="size-4" aria-hidden="true" /> Kategorilere dÃ¶n
        </Link>
        <div className="mb-6 flex justify-center"><TeknikOBrand size="standard" /></div>
        {configurator==='painting'?<PaintingServiceConfigurator selection={paintingSelection}
          onChange={setPaintingSelection}
          serviceOptions={response?.resultState==='painting_service_selection'?response.options:paintingServiceOptions}
          onSelectService={label=>{
            if(isAnalyzing||response?.resultState!=='painting_service_selection'||!response.options.includes(label))return;
            setPaintingServiceOptions(response.options);
            setPaintingSelection({...EMPTY_PAINTING_SELECTION,serviceType:label});
            setPaintingSubmitError(null);
            void submit(label);
          }}
          onSelectColorSource={source=>{
            if(isAnalyzing||paintingQueue)return;
            setPaintingSelection(current=>({...current,colorSelectionSource:source,selectedDyoColor:null}));
            if((response?.resultState==='painting_color_catalog'||
              (response?.resultState==='painting_question'&&(response.answeredSystemQuestions??0)>0))&&
              paintingSelection.colorSelectionSource!==source)
              void submit(source==='manual'?'Marka ve renk kodunu kendim yazacaÄŸÄ±m':'DYO renk kataloÄŸundan seÃ§');
          }}
          onCalculate={steps=>{
            if(paintingQueue||isAnalyzing)return;
            setPaintingSubmitError(null);
            if(response?.resultState==='painting_color_catalog'&&paintingSelection.selectedDyoColor){
              void submit(`DYO renk kodu: ${paintingSelection.selectedDyoColor.colorCode}`);
              return;
            }
            if(response?.resultState==='painting_question'&&(response.answeredSystemQuestions??0)>0&&
              paintingSelection.colorSelectionSource==='manual'){
              void submit(`Marka: ${paintingSelection.paintBrand.trim()}, renk kodu: ${paintingSelection.colorCode.trim()}`);
              return;
            }
            setPaintingQueue({steps,next:0,sent:false,fromResponse:null});
          }}
          onConfirmColor={()=>{if(!isAnalyzing)void submit('Bu renkle devam et');}}
          onChangeColor={()=>{
            if(isAnalyzing)return;
            setPaintingSelection(current=>({...current,selectedDyoColor:null}));
            void submit('Rengi deÄŸiÅŸtir');
          }}
          ready={response?.resultState==='painting_question'||response?.resultState==='painting_color_catalog'}
          busy={isAnalyzing||paintingQueue!==null}
          fieldsLocked={(response?.answeredSystemQuestions??0)>0}
          awaitingColorConfirmation={response?.resultState==='painting_color_confirmation'}
          awaitingCatalogColor={response?.resultState==='painting_color_catalog'}
          allowFinalColorEdit={response?.resultState==='painting_question'&&
            (response.answeredSystemQuestions??0)>0&&paintingSelection.colorSelectionSource==='manual'}
          finished={response?.resultState==='priced'||response?.resultState==='uncertain_price'||
            response?.resultState==='painting_manual_review'}
          unavailableText={response?.resultState==='category_unavailable'?response.aiText:null}
          resultExplanation={response?.resultState==='painting_manual_review'?response.aiText:null}
          result={resultCard} onRequestTechnician={()=>setIsTechnicianDialogOpen(true)} onReject={dismissResult}
          errorText={paintingSubmitError??connectionError} />:configurator==='carpet_cleaning'?<CarpetServiceConfigurator selection={carpetSelection}
          onQuantityChange={(key:CarpetKey,delta:number)=>setCarpetSelection(current=>changeCarpetQuantity(current,key,delta))}
          onAreaChange={(key:CarpetKey,index:number,value:string)=>setCarpetSelection(current=>setCarpetArea(current,key,index,value))}
          onCalculate={answer=>void submit(answer)}
          ready={response?.cleaningInputMode==='carpet_items'&&
            (response.resultState==='cleaning_question'||response.resultState==='minimum_order_not_met')||
            resultDismissed&&(response?.category==='carpet_cleaning'||response?.category==='cleaning')&&
            (response.resultState==='priced'||response.resultState==='uncertain_price')}
          busy={isAnalyzing} finished={!isAnalyzing&&!resultDismissed&&
            (response?.resultState==='priced'||response?.resultState==='uncertain_price')}
          minimumOrderMessage={!isAnalyzing&&response?.resultState==='minimum_order_not_met'?response.aiText:null}
          result={isAnalyzing?null:resultCard} onRequestTechnician={()=>setIsTechnicianDialogOpen(true)} onReject={dismissResult}
          errorText={connectionError} />:configurator==='upholstery_cleaning'?<UpholsteryServiceConfigurator
          selection={upholsterySelection}
          onQuantityChange={(key:UpholsteryKey,delta:number)=>setUpholsterySelection(current=>changeUpholsteryQuantity(current,key,delta))}
          onCalculate={answer=>void submit(answer)}
          ready={response?.cleaningInputMode==='upholstery_items'&&
            (response.resultState==='cleaning_question'||response.resultState==='minimum_order_not_met')||
            resultDismissed&&(response?.category==='sofa_cleaning'||response?.category==='cleaning')&&
            (response.resultState==='priced'||response.resultState==='uncertain_price')}
          busy={isAnalyzing} finished={!isAnalyzing&&!resultDismissed&&
            (response?.resultState==='priced'||response?.resultState==='uncertain_price')}
          minimumOrderMessage={!isAnalyzing&&response?.resultState==='minimum_order_not_met'?response.aiText:null}
          result={isAnalyzing?null:resultCard} onRequestTechnician={()=>setIsTechnicianDialogOpen(true)} onReject={dismissResult}
          errorText={connectionError} />:configurator==='apartment_cleaning'?<ApartmentServiceConfigurator
          selection={apartmentSelection} onChange={setApartmentSelection}
          onCalculate={answers=>{
            if(apartmentQueue||isAnalyzing)return;
            setApartmentSubmitError(null);
            setApartmentQueue({answers,next:response?.answeredSystemQuestions??0,sent:false});
          }}
          ready={response?.resultState==='cleaning_question'&&response.category==='cleaning'}
          busy={isAnalyzing||apartmentQueue!==null}
          fieldsLocked={(response?.answeredSystemQuestions??0)>0}
          finished={response?.resultState==='priced'||response?.resultState==='uncertain_price'}
          result={resultCard} onRequestTechnician={()=>setIsTechnicianDialogOpen(true)} onReject={dismissResult}
          errorText={apartmentSubmitError??connectionError} />:<HomeCleaningServiceConfigurator
          selection={homeSelection} onChange={setHomeSelection}
          onCalculate={answers=>{
            if(homeQueue||isAnalyzing)return;
            setHomeSubmitError(null);
            setHomeQueue({answers,next:response?.answeredSystemQuestions??0,sent:false});
          }}
          ready={response?.resultState==='cleaning_question'&&response.category==='cleaning'}
          busy={isAnalyzing||homeQueue!==null}
          fieldsLocked={(response?.answeredSystemQuestions??0)>0}
          finished={response?.resultState==='priced'||response?.resultState==='uncertain_price'}
          result={resultCard} onRequestTechnician={()=>setIsTechnicianDialogOpen(true)} onReject={dismissResult}
          errorText={homeSubmitError??connectionError} />}
      </div>
      {isTechnicianDialogOpen&&<TechnicianHandoffNotice response={response} onClose={()=>setIsTechnicianDialogOpen(false)} />}
    </div>;
  }

  return (
    <div style={chatViewport ? {height:chatViewport.height, top:chatViewport.top} : undefined} className={`h-dvh min-h-0 w-full max-w-[940px] bg-slate-50 flex flex-col mx-auto shadow-2xl font-sans text-slate-900 overscroll-contain ${chatViewport ? 'fixed inset-x-0 z-50 overflow-hidden' : 'relative overflow-y-auto'}`}>
      
      {/* Ä°Ã‡ERÄ°K ALANI */}
      <div className={`min-w-0 flex-1 flex flex-col ${chatViewport ? 'min-h-0 p-0' : 'px-3 sm:px-5 lg:px-8 pt-6 pb-6 justify-between'}`}>
        <Link href="/kategoriler" className={`${chatViewport ? 'hidden' : 'mb-4 inline-flex'} items-center gap-1.5 self-start text-xs font-semibold text-slate-500 hover:text-[#D97724]`}>
          <ArrowLeft className="size-4" aria-hidden="true" /> Kategorilere dÃ¶n
        </Link>
        
        {/* LOGO VE SLOGAN ALANI */}
        <div className={`${chatViewport ? 'hidden' : 'flex'} flex-col items-center text-center`}>
          <TeknikOBrand size="standard" className="mb-4" />

          <h1 className="text-2xl font-black text-[#0B1727] tracking-tight leading-tight">
            SÃ¼rpriz fiyat yok<br />
            sorunu yaz <span className="text-[#EE6C13]">fiyatÄ±nÄ± al.</span>
          </h1>

          <p className="mt-1 text-xs text-slate-500 font-medium max-w-xs leading-relaxed">
            AlacaÄŸÄ±n hizmetin Ã¼cretini hemen Ã¶ÄŸren.<br />
            SÃ¼rpriz fiyatlarla belirsizlikle uÄŸraÅŸma.
          </p>
        </div>

        {!chatViewport && <DiagnosisProgress answeredSystemQuestions={response?.answeredSystemQuestions ?? 0} isAnalyzing={isAnalyzing} resultState={response?.resultState ?? 'diagnosing'} />}

        {/* CANLI SOHBET ALANI */}
        <div className={`min-w-0 bg-white border-2 border-slate-200 focus-within:border-[#EE6C13] p-3 sm:p-5 shadow-md transition-colors flex flex-col ${chatViewport ? 'flex-1 min-h-0 rounded-none' : 'h-[min(54dvh,560px)] min-h-[330px] max-[360px]:min-h-[370px] rounded-3xl'}`}>
          
          <div ref={messageScrollRef} onScroll={() => {
            const area = messageScrollRef.current;
            if (!area || area.clientHeight !== scrollMetricsRef.current.height) return;
            const distanceFromBottom = area.scrollHeight - area.scrollTop - area.clientHeight;
            if (programmaticScrollRef.current) {
              scrollMetricsRef.current = {height:area.clientHeight, distanceFromBottom};
              return;
            }
            followLatestRef.current = distanceFromBottom <= 96;
            scrollMetricsRef.current = {height:area.clientHeight, distanceFromBottom};
          }} className="min-w-0 min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-4 pr-1 text-sm mb-4">
            {chatHistory.length === 0 ? (
              <div className="text-center py-6 text-slate-400">
                <p className="text-xs font-medium">ArÄ±zanÄ±zÄ± veya ihtiyacÄ±nÄ±zÄ± aÅŸaÄŸÄ±ya yazÄ±n.</p>
                <p className="text-[10px] mt-1 text-slate-300">TeÅŸhis sonucu doÄŸrudan burada gÃ¶rÃ¼ntÃ¼lenecektir.</p>
              </div>
            ) : (
              chatHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`flex min-w-0 items-start gap-2 max-w-full sm:max-w-[90%] ${
                      msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] ${
                        msg.sender === 'user'
                          ? 'bg-slate-800 text-white'
                          : 'bg-orange-100 text-[#EE6C13]'
                      }`}
                    >
                      {msg.sender === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                    </div>

                    <div
                      ref={msg.id === lastAssistantId ? lastAssistantRef : undefined}
                      className={`min-w-0 break-words [overflow-wrap:anywhere] p-3 sm:p-3.5 rounded-2xl leading-relaxed text-sm sm:text-base ${
                        msg.sender === 'user'
                          ? 'bg-[#0B1727] text-white rounded-tr-none'
                          : 'bg-slate-100 text-slate-800 rounded-tl-none'
                      }`}
                    >
                      {msg.text}

                    </div>
                  </div>

                  {msg.options && (
                    <div className="flex min-w-0 flex-wrap gap-2 mt-2 ml-8">
                      {msg.options.map((opt, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleOptionClick(opt)}
                          className="min-h-11 min-w-0 break-words bg-orange-50 hover:bg-orange-100 border border-orange-200 text-[#EE6C13] text-sm font-semibold px-3 py-2 rounded-xl transition-all active:scale-95"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}

            {isAnalyzing && (
              <div className="flex items-center gap-2 text-slate-400 text-[11px] animate-pulse">
                <Bot className="w-4 h-4 text-[#EE6C13]" />
                <span>YanÄ±tÄ±nÄ±z deÄŸerlendiriliyorâ€¦</span>
              </div>
            )}

            {response?.cleaningInputMode && response.resultState === 'cleaning_question' &&
              (response.cleaningInputMode==='carpet_items'?
                <CleaningCarpetInputSelector key={`${response.category}:carpet`} disabled={isAnalyzing} onContinue={handleOptionClick} />:
                <CleaningInputSelector key={`${response.conversationToken}:${response.cleaningInputMode}`}
                  mode={response.cleaningInputMode} disabled={isAnalyzing} onContinue={handleOptionClick} />)}

            {response?.resultState==='painting_color_catalog'&&
              <PaintingColorCatalog disabled={isAnalyzing} onSelect={color=>void submit(`DYO renk kodu: ${color.colorCode}`)} />}

          </div>

          {/* Form / Metin GiriÅŸi */}
          <form onSubmit={(e) => handleSubmit(e)} className="min-w-0 shrink-0 border-t-2 border-slate-300 pt-3">
            <label htmlFor="customer-message" className="block mb-2 text-sm font-semibold text-slate-700">MesajÄ±nÄ±z</label>
            <textarea
              ref={inputRef}
              onFocus={updateChatViewport}
              onBlur={() => setChatViewport(null)}
              id="customer-message"
              rows={2}
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="MesajÄ±nÄ±zÄ± veya cevabÄ±nÄ±zÄ± yazÄ±n..."
              className="h-16 w-full min-w-0 rounded-xl border-2 border-slate-300 bg-slate-50 p-3 text-base text-slate-900 placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 focus:bg-white resize-none leading-relaxed transition-colors"
            />

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept="image/*,.pdf"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex min-h-11 items-center gap-1 whitespace-nowrap text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <Paperclip className="w-3.5 h-3.5 text-[#EE6C13]" />
                  <span>Dosya / Foto</span>
                </button>

                {chatHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={handleResetChat}
                    className="flex min-h-11 items-center gap-1 text-sm text-slate-500 hover:text-red-500 transition-colors ml-2"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>SÄ±fÄ±rla</span>
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={isAnalyzing}
                  className="flex min-h-11 shrink-0 items-center gap-1.5 bg-[#EE6C13] hover:bg-[#d85e0e] text-white px-5 py-2 rounded-xl font-bold text-sm shadow-md shadow-orange-500/20 transition-all active:scale-95 disabled:opacity-50"
              >
                <span>GÃ¶nder</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>

        {!chatViewport && <ServiceResultCard result={resultCard} onRequestTechnician={() => setIsTechnicianDialogOpen(true)} onReject={dismissResult} />}
        {!chatViewport && <DiagnosisDebug response={response} />}

        {/* ÃœÃ‡LÃœ GÃœVENÄ°LÄ°RLÄ°K Ã–ZELLÄ°KLERÄ° KARTLARI */}
        <div className={`${chatViewport ? 'hidden' : 'grid'} grid-cols-3 gap-2 bg-white border border-slate-100 rounded-2xl p-2.5 my-4 shadow-sm text-center`}>
          <div className="flex flex-col items-center gap-1 px-1">
            <div className="text-[#EE6C13]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-800 leading-tight">
              Yapay zekÃ¢ destekli
            </span>
          </div>

          <div className="flex flex-col items-center gap-1 px-1 border-x border-slate-100">
            <div className="text-[#EE6C13]">
              <Tag className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-800 leading-tight">
              Maksimum fiyat garantisi
            </span>
          </div>

          <div className="flex flex-col items-center gap-1 px-1">
            <div className="text-[#EE6C13]">
              <Lock className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-800 leading-tight">
              OnayÄ±n olmadan iÅŸlem yok
            </span>
          </div>
        </div>

        {/* POPÃœLER HÄ°ZMETLER */}
        <div className={chatViewport ? 'hidden' : undefined}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-900">PopÃ¼ler Hizmetler</h3>
            <button type="button" className="text-[11px] font-semibold text-[#EE6C13] flex items-center gap-0.5 hover:underline">
              TÃ¼mÃ¼nÃ¼ GÃ¶r <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <ServiceCategoryCards onSelect={handleCategoryClick} selected={category} />
        </div>

      </div>

      {isTechnicianDialogOpen && <TechnicianHandoffNotice response={response} onClose={() => setIsTechnicianDialogOpen(false)} />}

      {/* FOOTER */}
      <footer className={`${chatViewport ? 'hidden' : 'flex'} bg-[#0A182E] text-white py-3 px-6 rounded-t-3xl items-center justify-between text-xs font-semibold shrink-0`}>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#EE6C13]" />
          <span>GÃ¼venli</span>
        </div>
        <span className="text-slate-600">|</span>
        <div className="flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-[#EE6C13]" />
          <span>HÄ±zlÄ±</span>
        </div>
        <span className="text-slate-600">|</span>
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-[#EE6C13]" />
          <span>Åeffaf</span>
        </div>
      </footer>

    </div>
  );
}

function keepQuestionVisible(area:HTMLDivElement, question:HTMLElement|null) {
  if (!question) return;
  const areaRect = area.getBoundingClientRect();
  const questionRect = question.getBoundingClientRect();
  const margin = Math.max(0, Math.min(8, (areaRect.height - questionRect.height) / 2));
  if (questionRect.top < areaRect.top + margin)
    area.scrollTop += questionRect.top - areaRect.top - margin;
  else if (questionRect.bottom > areaRect.bottom - margin)
    area.scrollTop += questionRect.bottom - areaRect.bottom + margin;
}
