'use client';

import { DiagnosticOutcome } from '@/components/diagnostic-outcome';
import type { Candidate } from '@/lib/diagnostic-state';
import React, { useState, useRef, useEffect } from 'react';
import type { calculateOMF } from '@/lib/omf-engine';
import type { PriceSource } from '@/lib/part-pricing';
import { 
  Paperclip, 
  Send, 
  Sparkles, 
  ShieldCheck, 
  Tag, 
  Lock, 
  ChevronRight, 
  Zap, 
  Flame, 
  Snowflake, 
  Paintbrush, 
  Home as HomeIcon, 
  Truck,
  Bot,
  User,
  Wrench,
  RefreshCw,
  CheckCircle2,
  X,
  FileCheck,
  AlertTriangle,
  ArrowRight,
  Info
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  options?: string[];
  technicalSource?: { title: string; url: string; page: number } | null;
}

interface DiagnosticState {
  priceSource: PriceSource;
  completed: boolean;
  confidence: number;
  faultTitle: string;
  faultDescription: string;
  price: string;
  warranty: string;
  partsIncluded: string[];
  partPriceNum: number;
  riskSumNum: number;
  breakdown: ReturnType<typeof calculateOMF>["breakdown"];
}

interface DiagnoseResponse {
  stateToken?: string;
  informationProgress?: number;
  assessmentComplete?: boolean;
  candidateProbabilities?: Candidate[];
  diagnosticStatus?: string;
  deterministicOMF?: ReturnType<typeof calculateOMF>;
  technicalSource?: { title: string; url: string; page: number } | null;
  isReadyForPrice?: boolean;
  priceSource?: PriceSource | null;
  aiText: string;
  confidence?: number;
  estimatedPrice?: string | null;
  basePartPrice?: number;
  partPrice?: number;
  riskSum?: number;
  faultTitle?: string;
  options?: string[];
}

const FIXED_LABOR_TL = 2000;

export default function CustomerDashboard() {
  const [problemDescription, setProblemDescription] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [diagnosticStatus, setDiagnosticStatus] = useState('diagnosing');
  const stateToken = useRef<string | undefined>(undefined);
  const [informationProgress, setInformationProgress] = useState(0);
  const [candidateProbabilities, setCandidateProbabilities] = useState<Candidate[] | null>(null);
  
  // Teşhis Güven Düzeyi (%0 - %100)

  const [estimatedPrice, setEstimatedPrice] = useState<string | null>(null);

  // OMF (En Olası Maliyet Fiyatı) Teşhis State'i
  const [diagnostic, setDiagnostic] = useState<DiagnosticState | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Randevu Modalı State'leri
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageId = useRef(0);

  const nextMessageId = () => {
    messageId.current += 1;
    return String(messageId.current);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isAnalyzing, diagnostic]);

  useEffect(() => {
    if (!diagnostic) return;
    const timer = window.setTimeout(() => {
      setDiagnostic(null);
      setEstimatedPrice(null);
      setIsBookingOpen(false);
      setChatHistory(prev => [...prev, { id: `expired-${Date.now()}`, sender: 'ai',
        text: 'Fiyatın geçerlilik süresi doldu. Güncel teklif için fiyatı tekrar kontrol edin.',
        options: ['Fiyatı tekrar kontrol et'] }]);
    }, Math.max(0, Date.parse(diagnostic.priceSource.expiresAt) - Date.now()));
    return () => window.clearTimeout(timer);
  }, [diagnostic]);

  const processAIResponse = async (userText: string, currentHistory: ChatMessage[]) => {
    setIsAnalyzing(true);
    setDiagnostic(null);
    setEstimatedPrice(null);
    setIsBookingOpen(false);

    try {
      const response = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          stateToken: stateToken.current,
          chatHistory: currentHistory.slice(0, -1).map(m => ({ sender: m.sender, text: m.text }))
        }),
      });
      if (!response.ok) throw new Error('Teşhis hizmetine ulaşılamadı.');
      const data = (await response.json()) as DiagnoseResponse;

      stateToken.current = data.stateToken;
      setInformationProgress(data.informationProgress ?? 0);
      setCandidateProbabilities(data.assessmentComplete ? data.candidateProbabilities ?? [] : null);
      setDiagnosticStatus(data.diagnosticStatus ?? 'diagnosing');
      const newConf = data.confidence ?? 0;


      setChatHistory(prev => [
        ...prev,
        {
          id: nextMessageId(),
          sender: 'ai',
          text: data.aiText,
          technicalSource: data.technicalSource,
          options: data.options && data.options.length > 0 ? data.options : undefined
        }
      ]);

      if (data.isReadyForPrice && data.priceSource && data.estimatedPrice && data.deterministicOMF && newConf >= 75) {
        const partPrice = data.priceSource.price;
        const riskSum = Number(data.riskSum || 0);
        const formattedOMF = data.estimatedPrice;

        setEstimatedPrice(formattedOMF);

        setDiagnostic({
          priceSource: data.priceSource,
          completed: true,
          confidence: newConf,
          faultTitle: data.faultTitle || 'Kombi Teknik Müdahale Paketi',
          faultDescription: `KDV dahil parça + Sabit İşçilik (${FIXED_LABOR_TL.toLocaleString('tr-TR')} ₺)`,
          price: formattedOMF,
          warranty: '90 Gün Parça & İşçilik Garantisi',
          partPriceNum: partPrice,
          riskSumNum: riskSum,
          breakdown: data.deterministicOMF.breakdown,
          partsIncluded: [
            `Yedek Parça (${partPrice.toLocaleString('tr-TR')} ₺)`,
            `Sabit İşçilik (${FIXED_LABOR_TL.toLocaleString('tr-TR')} ₺)`,
            ...(riskSum > 0 ? [`Risk Güvence Primi (${riskSum.toLocaleString('tr-TR')} ₺)`] : ['Standart Güvence Primi'])
          ]
        });
      }
    } catch (error) {
      console.error('API İletişim Hatası:', error);
      setChatHistory(prev => [
        ...prev,
        {
          id: nextMessageId(),
          sender: 'ai',
          text: 'Bağlantı sırasında bir hata oluştu. Lütfen tekrar deneyin.'
        }
      ]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText || problemDescription;
    if (!textToSend.trim() || isAnalyzing) return;

    const userMsg: ChatMessage = {
      id: nextMessageId(),
      sender: 'user',
      text: textToSend
    };

    const updatedHistory = [...chatHistory, userMsg];
    setChatHistory(updatedHistory);
    setProblemDescription('');
    processAIResponse(textToSend, updatedHistory);
  };

  const handleOptionClick = (optionText: string) => {
    handleSubmit(undefined, optionText);
  };

  const handleCategoryClick = (label: string) => {
    const selectedProblem = `${label} ile ilgili teknik desteğe ihtiyacım var. Arıza tespiti başlatabilir miyiz?`;
    handleSubmit(undefined, selectedProblem);
  };

  const handleResetChat = () => {
    if (isAnalyzing) return;
    setChatHistory([]);
    setDiagnosticStatus('diagnosing');
    stateToken.current = undefined;
    setInformationProgress(0);
    setCandidateProbabilities(null);

    setEstimatedPrice(null);
    setDiagnostic(null);
    setProblemDescription('');
    setIsCompleted(false);
    setShowBreakdown(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleSubmit(undefined, `[Görsel/Dosya Yüklendi: ${file.name}] Arızalı parçayı veya etiketini inceleyebilir misiniz?`);
    }
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnostic || Date.parse(diagnostic.priceSource.expiresAt) <= Date.now()) {
      setIsBookingOpen(false);
      setDiagnostic(null);
      setEstimatedPrice(null);
      alert('Fiyatın geçerlilik süresi doldu. Lütfen fiyatı tekrar kontrol edin.');
      return;
    }
    if (!fullName || !phone || !address || !appointmentDate) {
      alert('Lütfen tüm alanları doldurun.');
      return;
    }
    setIsCompleted(true);
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

        <div className="mt-4 mb-3 rounded-2xl bg-white border border-slate-200 p-3">
          <div className="flex justify-between text-[11px] text-slate-600 mb-2" aria-live="polite">
            <span>{isAnalyzing ? 'Yanıtınız değerlendiriliyor…' : diagnosticStatus === 'safety_stop' ? 'Güvenlik nedeniyle durduruldu' : candidateProbabilities !== null ? 'Değerlendirme tamamlandı' : 'Bilgi toplama'}</span>
            <span>%{informationProgress}</span>
          </div>
          <div role="progressbar" aria-label="Bilgi toplama ilerlemesi" aria-valuemin={0} aria-valuemax={80} aria-valuenow={informationProgress}
            aria-valuetext={`${informationProgress} bilgi puanı; 80 puanda sorular tamamlanır`}
            className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500 motion-reduce:transition-none"
              style={{ width: `${informationProgress / 80 * 100}%`, background: 'linear-gradient(to right, #ef4444, #f59e0b, #22c55e)',
                backgroundSize: `${informationProgress ? 8000 / informationProgress : 100}% 100%` }} />
          </div>
        </div>

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
                <span>Yapay zekâ teşhis analizi yapıyor...</span>
              </div>
            )}

            {estimatedPrice && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 mt-2 flex items-center justify-between text-emerald-900">
                <div>
                  <span className="block text-[10px] font-semibold text-emerald-600">Güvenilir Tek Fiyat</span>
                  <span className="text-base font-black text-emerald-700">{estimatedPrice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBookingOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1 shadow-sm transition-all active:scale-95"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Usta Çağır</span>
                </button>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

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

        {candidateProbabilities !== null && <DiagnosticOutcome candidates={candidateProbabilities} />}

        {/* --- OMF TEKLİF KARTI (Yalnızca güven yeterliyse) --- */}
        {diagnostic && diagnostic.completed && diagnostic.confidence >= 75 && (
          <div className="mt-4 bg-white rounded-2xl border-2 border-[#EE6C13] shadow-lg overflow-hidden transition-all">
            <div className="bg-[#EE6C13] text-white px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <FileCheck className="w-4 h-4" />
                <span className="font-bold text-xs">Normal Müdahale Teklifi</span>
              </div>
              <button 
                type="button"
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="text-[10px] bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded-full font-medium flex items-center gap-1 transition-colors"
              >
                <Info className="w-3 h-3" />
                {showBreakdown ? 'Kapat' : 'Maliyet Kırılımı'}
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{diagnostic.faultTitle}</h3>
                  <p className="text-[11px] text-slate-600 mt-0.5">{diagnostic.faultDescription}</p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 font-medium">NET BEDEL</div>
                  <div className="text-lg font-black text-[#EE6C13]">{diagnostic.price}</div>
                </div>
              </div>

              {/* Maliyet Kırılımı Detay (Toggle) */}
              <p className="text-[10px] text-slate-500">
                <a href={diagnostic.priceSource.url} target="_blank" rel="noopener noreferrer" className="underline">
                  One Yedek Parça · {diagnostic.priceSource.sku}
                </a>
                {' · Kontrol: '}{new Date(diagnostic.priceSource.checkedAt).toLocaleString('tr-TR')}
              </p>
              {showBreakdown && (
                <div className="bg-orange-50/50 border border-orange-100 p-2.5 rounded-xl text-[10px] text-slate-700 space-y-1 animate-in fade-in">
                  <div className="flex justify-between"><span>Yedek Parça (oneyedekparca.com):</span> <b>{diagnostic.partPriceNum.toLocaleString('tr-TR')} ₺</b></div>
                  <div className="flex justify-between"><span>Sabit Saha İşçiliği:</span> <b>{FIXED_LABOR_TL.toLocaleString('tr-TR')} ₺</b></div>
                  <div className="flex justify-between"><span>OMF (parça + işçilik):</span><b>{diagnostic.breakdown.OMF.toLocaleString('tr-TR')} ₺</b></div>
                  <div className="flex justify-between"><span>OMF üzerinden %20 risk:</span> <b>{diagnostic.riskSumNum.toLocaleString('tr-TR')} ₺</b></div>
                  <div className="flex justify-between"><span>Hizmet bedeli (%15, en az 300 ₺):</span> <b>{diagnostic.breakdown.service.toLocaleString('tr-TR')} ₺</b></div>
                  <div className="border-t border-orange-200 pt-1 mt-1 flex justify-between font-bold text-orange-900">
                    <span>Toplam Teklif:</span>
                    <span>{diagnostic.price}</span>
                  </div>
                </div>
              )}

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Pakete Dahil İşlemler / Parçalar
                </div>
                <ul className="space-y-1 text-[11px] text-slate-600">
                  {diagnostic.partsIncluded.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-[#EE6C13]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-600 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">
                <div className="flex items-center gap-1.5 text-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Keşif ücreti yok (Sabit İşçilik)</span>
                </div>
                <span className="font-semibold text-amber-900">{diagnostic.warranty}</span>
              </div>

              <button
                type="button"
                onClick={() => { setEstimatedPrice(diagnostic.price); setIsBookingOpen(true); }}
                className="w-full bg-[#0B1727] hover:bg-slate-800 text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <span>Teklifi Onayla ve Randevu Al</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

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

          <div className="grid grid-cols-5 gap-1.5">
            {[
              { id: 'kombi', label: 'Kombi', icon: Flame },
              { id: 'klima', label: 'Klima', icon: Snowflake },
              { id: 'boya', label: 'Boya', icon: Paintbrush },
              { id: 'temizlik', label: 'Temizlik', icon: HomeIcon },
              { id: 'nakliye', label: 'Nakliye', icon: Truck },
            ].map((item) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleCategoryClick(item.label)}
                  className="bg-white border border-slate-100 rounded-xl p-2 flex flex-col items-center gap-1.5 shadow-sm hover:border-orange-300 transition-all text-slate-700 active:scale-95"
                >
                  <div className="w-6 h-6 text-[#EE6C13] flex items-center justify-center">
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] font-semibold text-center truncate w-full">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* USTA ÇAĞIR / RANDEVU MODALI */}
      {isBookingOpen && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button 
              type="button"
              onClick={() => { setIsBookingOpen(false); setIsCompleted(false); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            {!isCompleted ? (
              <form onSubmit={handleBookingSubmit} className="space-y-4">
                <div className="text-center mb-4">
                  <div className="w-10 h-10 bg-orange-100 text-[#EE6C13] rounded-2xl flex items-center justify-center mx-auto mb-2">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-black text-slate-900">Servis Randevusu Oluştur</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Güvenilir Tek Fiyat: <span className="font-bold text-emerald-600">{estimatedPrice}</span></p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Ad Soyad</label>
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Adınız ve Soyadınız"
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-[#EE6C13] bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Telefon Numarası</label>
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05XX XXX XX XX"
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-[#EE6C13] bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Servis Adresi</label>
                  <textarea 
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Açık adresinizi giriniz..."
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-[#EE6C13] bg-slate-50 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">İstenen Tarih ve Saat</label>
                  <input 
                    type="datetime-local" 
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-[#EE6C13] bg-slate-50"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#EE6C13] hover:bg-[#d85e0e] text-white py-3 rounded-xl font-bold text-xs shadow-lg shadow-orange-500/25 transition-all active:scale-95 mt-2"
                >
                  Randevuyu Onayla ve Usta Çağır
                </button>
              </form>
            ) : (
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-base font-black text-slate-900">Randevunuz Başarıyla Oluşturuldu!</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  En yakın onaylı teknisyenimiz belirtilen tarih ve saatte adresinize yönlendirilecektir. Sabit işçilik ve OMF şartları geçerlidir.
                </p>
                <button
                  type="button"
                  onClick={() => { setIsBookingOpen(false); setIsCompleted(false); handleResetChat(); }}
                  className="w-full bg-[#0B1727] text-white py-2.5 rounded-xl font-bold text-xs mt-4"
                >
                  Yeni Teşhis Başlat
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
