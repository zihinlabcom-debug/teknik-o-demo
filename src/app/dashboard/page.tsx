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
import {TeknikOBrand} from '@/components/brand/teknik-o-brand';
import {useCustomerSession} from '@/components/use-customer-session';
import {useServiceConversation} from '@/components/use-service-conversation';
import {isServiceCategory,serviceCategoryLabel, type ServiceCategory} from '@/lib/service-categories';
import {servicePricePresentation} from '@/lib/service-presentation';

export default function CustomerDashboard() {
  return <Suspense fallback={null}><DashboardContent /></Suspense>;
}

function DashboardContent() {
  const router=useRouter();
  const requested=useSearchParams().get('category');
  const {messages:chatHistory, input:problemDescription, setInput:setProblemDescription, isAnalyzing,
    response, category, submit, reset, resultDismissed, dismissResult} = useServiceConversation();
  const [isTechnicianDialogOpen, setIsTechnicianDialogOpen] = useState(false);
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
  const customerStatus=useCustomerSession();
  const navigationReady=customerStatus==='authenticated'&&isServiceCategory(requested);
  const resultCard = !resultDismissed && response ? servicePricePresentation(response) : null;
  const lastAssistantId = [...chatHistory].reverse().find(message => message.sender === 'ai')?.id;
  const latestIsAssistant = chatHistory.at(-1)?.sender === 'ai';
  const markProgrammaticScroll = useCallback(() => {
    programmaticScrollRef.current = true;
    window.clearTimeout(programmaticScrollTimerRef.current);
    programmaticScrollTimerRef.current = window.setTimeout(() => { programmaticScrollRef.current = false; }, 100);
  }, []);
  useEffect(()=>{
    if(customerStatus==='guest')router.replace('/');
    else if(customerStatus==='authenticated'&&!isServiceCategory(requested))router.replace('/hizmetler');
  },[customerStatus,requested,router]);
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
    void submit(`${serviceCategoryLabel(requested)} hizmeti için yardım istiyorum.`,requested);
  },[navigationReady,requested,submit]);
  const handleSubmit = (e?:React.FormEvent, customText?:string) => {
    e?.preventDefault();void submit(customText ?? problemDescription);
  };
  const handleOptionClick = (text:string) => handleSubmit(undefined, text);
  const handleCategoryClick = (selected:ServiceCategory) => {
    setIsTechnicianDialogOpen(false);
    void submit(`${serviceCategoryLabel(selected)} hizmeti için yardım istiyorum.`, selected);
  };
  const handleResetChat = () => {reset();setIsTechnicianDialogOpen(false);};
  const handleFileUpload = (e:React.ChangeEvent<HTMLInputElement>) => {
    const file=e.target.files?.[0];
    if(file)handleSubmit(undefined, `[Görsel/Dosya Yüklendi: ${file.name}] İnceleyebilir misiniz?`);
  };

  if(!navigationReady)return null;

  return (
    <div style={chatViewport ? {height:chatViewport.height, top:chatViewport.top} : undefined} className={`h-dvh min-h-0 w-full max-w-[940px] bg-slate-50 flex flex-col mx-auto shadow-2xl font-sans text-slate-900 overscroll-contain ${chatViewport ? 'fixed inset-x-0 z-50 overflow-hidden' : 'relative overflow-y-auto'}`}>
      
      {/* İÇERİK ALANI */}
      <div className={`min-w-0 flex-1 flex flex-col ${chatViewport ? 'min-h-0 p-0' : 'px-3 sm:px-5 lg:px-8 pt-6 pb-6 justify-between'}`}>
        <Link href="/kategoriler" className={`${chatViewport ? 'hidden' : 'mb-4 inline-flex'} items-center gap-1.5 self-start text-xs font-semibold text-slate-500 hover:text-[#D97724]`}>
          <ArrowLeft className="size-4" aria-hidden="true" /> Kategorilere dön
        </Link>
        
        {/* LOGO VE SLOGAN ALANI */}
        <div className={`${chatViewport ? 'hidden' : 'flex'} flex-col items-center text-center`}>
          <TeknikOBrand size="standard" className="mb-4" />

          <h1 className="text-2xl font-black text-[#0B1727] tracking-tight leading-tight">
            Sürpriz fiyat yok<br />
            sorunu yaz <span className="text-[#EE6C13]">fiyatını al.</span>
          </h1>

          <p className="mt-1 text-xs text-slate-500 font-medium max-w-xs leading-relaxed">
            Alacağın hizmetin ücretini hemen öğren.<br />
            Sürpriz fiyatlarla belirsizlikle uğraşma.
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
                <p className="text-xs font-medium">Arızanızı veya ihtiyacınızı aşağıya yazın.</p>
                <p className="text-[10px] mt-1 text-slate-300">Teşhis sonucu doğrudan burada görüntülenecektir.</p>
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
                <span>Yanıtınız değerlendiriliyor…</span>
              </div>
            )}

            {response?.cleaningInputMode && response.resultState === 'cleaning_question' &&
              <CleaningInputSelector key={`${response.conversationToken}:${response.cleaningInputMode}`}
                mode={response.cleaningInputMode} disabled={isAnalyzing} onContinue={handleOptionClick} />}

            {response?.resultState==='painting_color_catalog'&&
              <PaintingColorCatalog disabled={isAnalyzing} onSelect={color=>void submit(`DYO renk kodu: ${color.colorCode}`)} />}

          </div>

          {/* Form / Metin Girişi */}
          <form onSubmit={(e) => handleSubmit(e)} className="min-w-0 shrink-0 border-t-2 border-slate-300 pt-3">
            <label htmlFor="customer-message" className="block mb-2 text-sm font-semibold text-slate-700">Mesajınız</label>
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
              placeholder="Mesajınızı veya cevabınızı yazın..."
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
                    <span>Sıfırla</span>
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={isAnalyzing}
                  className="flex min-h-11 shrink-0 items-center gap-1.5 bg-[#EE6C13] hover:bg-[#d85e0e] text-white px-5 py-2 rounded-xl font-bold text-sm shadow-md shadow-orange-500/20 transition-all active:scale-95 disabled:opacity-50"
              >
                <span>Gönder</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>

        {!chatViewport && <ServiceResultCard result={resultCard} onRequestTechnician={() => setIsTechnicianDialogOpen(true)} onReject={dismissResult} />}
        {!chatViewport && <DiagnosisDebug response={response} />}

        {/* ÜÇLÜ GÜVENİLİRLİK ÖZELLİKLERİ KARTLARI */}
        <div className={`${chatViewport ? 'hidden' : 'grid'} grid-cols-3 gap-2 bg-white border border-slate-100 rounded-2xl p-2.5 my-4 shadow-sm text-center`}>
          <div className="flex flex-col items-center gap-1 px-1">
            <div className="text-[#EE6C13]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-800 leading-tight">
              Yapay zekâ destekli
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
              Onayın olmadan işlem yok
            </span>
          </div>
        </div>

        {/* POPÜLER HİZMETLER */}
        <div className={chatViewport ? 'hidden' : undefined}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-900">Popüler Hizmetler</h3>
            <button type="button" className="text-[11px] font-semibold text-[#EE6C13] flex items-center gap-0.5 hover:underline">
              Tümünü Gör <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <ServiceCategoryCards onSelect={handleCategoryClick} selected={category} />
        </div>

      </div>

      {isTechnicianDialogOpen && <TechnicianHandoffNotice onClose={() => setIsTechnicianDialogOpen(false)} />}

      {/* FOOTER */}
      <footer className={`${chatViewport ? 'hidden' : 'flex'} bg-[#0A182E] text-white py-3 px-6 rounded-t-3xl items-center justify-between text-xs font-semibold shrink-0`}>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#EE6C13]" />
          <span>Güvenli</span>
        </div>
        <span className="text-slate-600">|</span>
        <div className="flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-[#EE6C13]" />
          <span>Hızlı</span>
        </div>
        <span className="text-slate-600">|</span>
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-[#EE6C13]" />
          <span>Şeffaf</span>
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
