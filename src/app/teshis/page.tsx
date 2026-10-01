'use client';

import React, {useState, useCallback, useEffect, useLayoutEffect, useRef} from 'react';
import Link from 'next/link';
import {ArrowLeft, Send, Bot, User, Wrench} from 'lucide-react';
import {TeknikOBrand} from '@/components/brand/teknik-o-brand';
import {DiagnosisProgress, ServiceResultCard, TechnicianHandoffNotice} from '@/components/service-result';
import {DiagnosisDebug} from '@/components/diagnosis-debug';
import {PaintingColorCatalog} from '@/components/painting-color-catalog';
import {CleaningInputSelector} from '@/components/cleaning-input-selector';
import {useServiceConversation} from '@/components/use-service-conversation';
import {servicePricePresentation} from '@/lib/service-presentation';

export default function TeshisPage() {
  const {messages, input:inputText, setInput:setInputText, isAnalyzing, response, submit,
    resultDismissed, dismissResult} = useServiceConversation('/api/chat');
  const [isTechnicianDialogOpen, setIsTechnicianDialogOpen] = useState(false);
  const [visualViewportHeight, setVisualViewportHeight] = useState<number|null>(null);
  const messageScrollRef = useRef<HTMLDivElement>(null);
  const lastAssistantRef = useRef<HTMLParagraphElement>(null);
  const followLatestRef = useRef(true);
  const programmaticScrollRef = useRef(false);
  const programmaticScrollTimerRef = useRef<number|undefined>(undefined);
  const scrollMetricsRef = useRef({height:0, distanceFromBottom:0});
  const resultCard = !resultDismissed && response ? servicePricePresentation(response) : null;
  const lastAssistantId = [...messages].reverse().find(message => message.sender === 'ai')?.id;
  const latestIsAssistant = messages.at(-1)?.sender === 'ai';
  const markProgrammaticScroll = useCallback(() => {
    programmaticScrollRef.current = true;
    window.clearTimeout(programmaticScrollTimerRef.current);
    programmaticScrollTimerRef.current = window.setTimeout(() => { programmaticScrollRef.current = false; }, 100);
  }, []);
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
  }, [messages.length, latestIsAssistant, markProgrammaticScroll]);
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
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const updateHeight = () => {
      setVisualViewportHeight(viewport.height < window.innerHeight - 16 ? Math.floor(viewport.height) : null);
    };
    updateHeight();
    viewport.addEventListener('resize', updateHeight);
    window.addEventListener('resize', updateHeight);
    return () => {
      viewport.removeEventListener('resize', updateHeight);
      window.removeEventListener('resize', updateHeight);
    };
  }, []);
  useEffect(() => {
    const timer=window.setTimeout(() => {
      let initial:string|null=null;
      try {initial=localStorage.getItem('tekniko_current_problem');localStorage.removeItem('tekniko_current_problem');} catch {}
      if(initial)void submit(initial);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [submit]);
  const handleSendMessage = (e:React.FormEvent) => {e.preventDefault();void submit(inputText);};

  return (
    <div style={visualViewportHeight ? {height:visualViewportHeight} : undefined} className="h-dvh min-h-0 w-full max-w-[940px] bg-slate-50 flex flex-col overflow-hidden mx-auto relative shadow-2xl font-sans text-slate-900">
      
      {/* HEADER */}
      <header className="shrink-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1><TeknikOBrand size="compact" /></h1>
            <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              AI Teşhis · Canlı Analiz Sistemi
            </p>
          </div>
        </div>

        <button 
          onClick={() => setIsTechnicianDialogOpen(true)}
          disabled={!resultCard || isAnalyzing}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Usta Çağır</span>
        </button>
      </header>

      {/* CHAT VE ANALİZ ALANI */}
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
      }} className="min-w-0 min-h-0 flex-1 p-3 sm:p-5 lg:p-8 overflow-y-auto overscroll-contain space-y-4">
        
        <DiagnosisProgress answeredSystemQuestions={response?.answeredSystemQuestions ?? 0} isAnalyzing={isAnalyzing} resultState={response?.resultState ?? 'diagnosing'} />

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex min-w-0 items-start gap-2.5 ${
              msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 ${
                msg.sender === 'user'
                  ? 'bg-slate-800 text-white'
                  : 'bg-orange-100 text-[#EE6C13]'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`min-w-0 max-w-[calc(100%-3rem)] sm:max-w-[88%] break-words [overflow-wrap:anywhere] rounded-2xl p-3.5 text-sm sm:text-base leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-[#0B1727] text-white rounded-tr-none'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
              }`}
            >
              <p ref={msg.id === lastAssistantId ? lastAssistantRef : undefined}>{msg.text}</p>

              <span className="text-[9px] block mt-1 text-right text-slate-400">
                {msg.time}
              </span>
              {(response?.category==='painting'||response?.category==='cleaning')&&msg.sender==='ai'&&msg.options&&msg.options.length>0&&
                <div className="mt-2 flex min-w-0 flex-wrap gap-2">
                  {msg.options.map(option=><button key={option} type="button" onClick={()=>void submit(option)}
                    className="min-h-11 min-w-0 break-words rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-semibold text-[#EE6C13]">
                    {option}
                  </button>)}
                </div>}
            </div>
          </div>
        ))}

        {response?.cleaningInputMode && response.resultState==='cleaning_question' &&
          <CleaningInputSelector key={`${response.conversationToken}:${response.cleaningInputMode}`}
            mode={response.cleaningInputMode} disabled={isAnalyzing} onContinue={answer=>void submit(answer)} />}

        {response?.resultState==='painting_color_catalog'&&
          <PaintingColorCatalog disabled={isAnalyzing} onSelect={color=>void submit(`DYO renk kodu: ${color.colorCode}`)} />}

        {/* YANIT BEKLENİYOR */}
        {isAnalyzing && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center gap-3 animate-pulse">
            <div className="w-6 h-6 border-2 border-[#EE6C13] border-t-transparent rounded-full animate-spin"></div>
            <div>
              <p className="text-xs font-bold text-slate-800">Yanıtınız değerlendiriliyor…</p>
              <p className="text-[10px] text-slate-500">Lütfen bekleyin.</p>
            </div>
          </div>
        )}

        <ServiceResultCard result={resultCard} onRequestTechnician={() => setIsTechnicianDialogOpen(true)} onReject={dismissResult} />
        <DiagnosisDebug response={response} />
      </div>

      {isTechnicianDialogOpen && <TechnicianHandoffNotice onClose={() => setIsTechnicianDialogOpen(false)} />}

      {/* ALT MESAJ YAZMA BAR */}
      <form
        onSubmit={handleSendMessage}
        className="shrink-0 w-full bg-white border-t-2 border-slate-300 p-3 sm:p-4 flex min-w-0 items-center gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ek detay yazın veya soru sorun..."
          className="min-w-0 flex-1 min-h-12 bg-slate-100 text-base text-slate-800 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EE6C13]"
        />
        <button
          type="submit"
          disabled={isAnalyzing}
          className="size-12 bg-[#EE6C13] hover:bg-[#d85e0e] text-white rounded-xl flex items-center justify-center shrink-0 shadow-md transition-all active:scale-95 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

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
