'use client';

import React, {useEffect, useRef, useState} from 'react';
import {Paperclip, Send, Sparkles, ShieldCheck, Tag, Lock, ChevronRight, Zap, Bot, User, RefreshCw} from 'lucide-react';
import {ServiceCategoryCards} from '@/components/service-category-cards';
import {DiagnosisProgress, ServiceResultCard, TechnicianHandoffNotice} from '@/components/service-result';
import {DiagnosisDebug} from '@/components/diagnosis-debug';
import {PaintingColorCatalog} from '@/components/painting-color-catalog';
import {useServiceConversation} from '@/components/use-service-conversation';
import {serviceCategoryLabel, type ServiceCategory} from '@/lib/service-categories';
import {servicePricePresentation} from '@/lib/service-presentation';

export default function CustomerDashboard() {
  const {messages:chatHistory, input:problemDescription, setInput:setProblemDescription, isAnalyzing,
    response, category, submit, reset, resultDismissed, dismissResult} = useServiceConversation();
  const [isTechnicianDialogOpen, setIsTechnicianDialogOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultCard = !resultDismissed && response ? servicePricePresentation(response) : null;
  useEffect(() => {chatEndRef.current?.scrollIntoView({behavior:'smooth'});}, [chatHistory, isAnalyzing, response]);
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between max-w-md mx-auto relative shadow-2xl font-sans text-slate-900 overflow-y-auto">
      
      {/* İÇERİK ALANI */}
      <div className="px-5 pt-6 pb-6 flex-1 flex flex-col justify-between">
        
        {/* LOGO VE SLOGAN ALANI */}
        <div className="flex flex-col items-center text-center">
          <div className="w-24 h-24 relative mb-1 flex items-center justify-center">
            <img 
              src="/teknik-o-logo.png" 
              alt="Teknik-O Logo" 
              className="w-full h-full object-contain"
              onError={(e) => {
                // Görsel yüklenemezse fallback ikon
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>

          <h1 className="text-2xl font-black text-[#0B1727] tracking-tight leading-tight">
            Sürpriz fiyat yok<br />
            sorunu yaz <span className="text-[#EE6C13]">fiyatını al.</span>
          </h1>

          <p className="text-xs text-slate-500 font-medium mt-1 max-w-xs leading-relaxed">
            Alacağın hizmetin ücretini hemen öğren.<br />
            Sürpriz fiyatlarla belirsizlikle uğraşma.
          </p>
        </div>

        <DiagnosisProgress answeredSystemQuestions={response?.answeredSystemQuestions ?? 0} isAnalyzing={isAnalyzing} resultState={response?.resultState ?? 'diagnosing'} />

        {/* CANLI SOHBET ALANI */}
        <div className="bg-white border-2 border-slate-200 focus-within:border-[#EE6C13] rounded-3xl p-4 shadow-md transition-all flex flex-col justify-between min-h-[220px]">
          
          <div className="max-h-[240px] overflow-y-auto space-y-3 pr-1 text-xs mb-3">
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
                    className={`flex items-start gap-2 max-w-[88%] ${
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
                      className={`p-2.5 rounded-2xl leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-[#0B1727] text-white rounded-tr-none'
                          : 'bg-slate-100 text-slate-800 rounded-tl-none'
                      }`}
                    >
                      {msg.text}

                    </div>
                  </div>

                  {msg.options && (
                    <div className="flex flex-wrap gap-1.5 mt-2 ml-8">
                      {msg.options.map((opt, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleOptionClick(opt)}
                          className="bg-orange-50 hover:bg-orange-100 border border-orange-200 text-[#EE6C13] text-[10px] font-semibold px-2.5 py-1 rounded-xl transition-all active:scale-95"
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

            <div ref={chatEndRef} />
          </div>

          {response?.resultState==='painting_color_catalog'&&
            <PaintingColorCatalog disabled={isAnalyzing} onSelect={color=>void submit(`DYO renk kodu: ${color.colorCode}`)} />}

          {/* Form / Metin Girişi */}
          <form onSubmit={(e) => handleSubmit(e)} className="border-t-2 border-slate-300 pt-3">
            <label htmlFor="customer-message" className="block mb-1.5 text-xs font-semibold text-slate-700">Mesajınız</label>
            <textarea
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
              className="w-full rounded-xl border-2 border-slate-300 bg-slate-50 p-3 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 focus:bg-white resize-none leading-relaxed transition-colors"
            />

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept="image/*,.pdf"
            />

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <Paperclip className="w-3.5 h-3.5 text-[#EE6C13]" />
                  <span>Dosya / Foto</span>
                </button>

                {chatHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={handleResetChat}
                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-red-500 transition-colors ml-2"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Sıfırla</span>
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={isAnalyzing}
                className="flex items-center gap-1.5 bg-[#EE6C13] hover:bg-[#d85e0e] text-white px-4 py-2 rounded-xl font-bold text-xs shadow-md shadow-orange-500/20 transition-all active:scale-95 disabled:opacity-50"
              >
                <span>Gönder</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>

        <ServiceResultCard result={resultCard} onRequestTechnician={() => setIsTechnicianDialogOpen(true)} onReject={dismissResult} />
        <DiagnosisDebug response={response} />

        {/* ÜÇLÜ GÜVENİLİRLİK ÖZELLİKLERİ KARTLARI */}
        <div className="grid grid-cols-3 gap-2 bg-white border border-slate-100 rounded-2xl p-2.5 my-4 shadow-sm text-center">
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
        <div>
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
      <footer className="bg-[#0A182E] text-white py-3 px-6 rounded-t-3xl flex items-center justify-between text-xs font-semibold shrink-0">
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
