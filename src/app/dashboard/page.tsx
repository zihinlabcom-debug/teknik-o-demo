'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  X
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  options?: string[];
}

export default function CustomerDashboard() {
  const [problemDescription, setProblemDescription] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Teşhis Güven Düzeyi (%0 - %100)
  const [confidence, setConfidence] = useState<number>(0);
  const [estimatedPrice, setEstimatedPrice] = useState<string | null>(null);

  // Randevu Modalı State'leri
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isAnalyzing]);

  const getConfidenceColor = (val: number) => {
    if (val < 40) return { bg: 'bg-red-500', text: 'text-red-600', label: 'Düşük Güven' };
    if (val < 75) return { bg: 'bg-amber-500', text: 'text-amber-600', label: 'Orta Güven' };
    return { bg: 'bg-emerald-500', text: 'text-emerald-600', label: 'Yüksek Güven' };
  };

  const processAIResponse = async (userText: string, currentHistory: ChatMessage[]) => {
    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userText, 
          chatHistory: currentHistory.map(m => ({ sender: m.sender, text: m.text })) 
        }),
      });

      const data = await response.json();

      setConfidence(data.confidence || 35);
      if (data.estimatedPrice) setEstimatedPrice(data.estimatedPrice);

      setChatHistory(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'ai',
          text: data.aiText,
          options: data.options && data.options.length > 0 ? data.options : undefined
        }
      ]);
    } catch (error) {
      console.error('API İletişim Hatası:', error);
      setChatHistory(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'ai',
          text: 'Bağlantı sırasında bir hata oluştu. Lütfen tekrar deneyin.'
        }
      ]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent, customText?: string) => {
    if (e) {
      e.preventDefault();
    }
    
    const textToSend = customText || problemDescription;
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
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
    setChatHistory([]);
    setConfidence(0);
    setEstimatedPrice(null);
    setProblemDescription('');
    setIsCompleted(false);
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !address || !appointmentDate) {
      alert('Lütfen tüm alanları doldurun.');
      return;
    }
    setIsCompleted(true);
  };

  const confInfo = getConfidenceColor(confidence);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between max-w-md mx-auto relative shadow-2xl font-sans text-slate-900 overflow-hidden">
      
      {/* İÇERİK ALANI */}
      <div className="px-5 pt-6 pb-6 flex-1 flex flex-col justify-between">
        
        {/* LOGO VE SLOGAN ALANI */}
        <div className="flex flex-col items-center text-center">
          <div className="w-24 h-24 relative mb-1 flex items-center justify-center">
            <img 
              src="/teknik-o-logo.png" 
              alt="Teknik-O Logo" 
              className="w-full h-full object-contain"
            />
          </div>

          <h1 className="text-2xl font-black text-[#0B1727] tracking-tight leading-tight">
            Sürpriz fiyat yok<br />
            sorununu yaz <span className="text-[#EE6C13]">fiyatını al.</span>
          </h1>

          <p className="text-xs text-slate-500 font-medium mt-1 max-w-xs leading-relaxed">
            Alacağın hizmetin ücretini hemen öğren.<br />
            Sürpriz fiyatlarla belirsizlikle uğraşma.
          </p>
        </div>

        {/* TEŞHİS GÜVEN DÜZEYİ ÇUBUĞU */}
        <div className="mt-4 mb-2 bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="flex items-center gap-1 text-slate-700">
              <Sparkles className="w-3.5 h-3.5 text-[#EE6C13]" />
              Teşhis Güven Düzeyi
            </span>
            <span className={`text-xs ${confInfo.text}`}>
              %{confidence} ({confInfo.label})
            </span>
          </div>

          {/* İlerleme Çubuğu */}
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ease-out ${confInfo.bg}`}
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>

        {/* CANLI SOHBET ALANI */}
        <div className="bg-white border-2 border-slate-200 focus-within:border-[#EE6C13] rounded-3xl p-4 shadow-md transition-all flex flex-col justify-between min-h-[220px]">
          
          {/* Sohbet Geçmişi */}
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

                  {/* Sadece Yapay Zekanın sunduğu yönlendirici kısa seçenek butonları kalır */}
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

            {/* Yükleniyor Göstergesi */}
            {isAnalyzing && (
              <div className="flex items-center gap-2 text-slate-400 text-[11px] animate-pulse">
                <Bot className="w-4 h-4 text-[#EE6C13]" />
                <span>Yapay zekâ teşhis analizi yapıyor...</span>
              </div>
            )}

            {/* Güvenilir Tek Fiyat Çıktısı (Sadece bu alanda Usta Çağır butonu bulunur) */}
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
          <form onSubmit={(e) => handleSubmit(e)} className="border-t border-slate-100 pt-2.5">
            <textarea
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
              className="w-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none resize-none bg-transparent leading-relaxed"
            />

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <Paperclip className="w-3.5 h-3.5 text-[#EE6C13]" />
                  <span>Dosya</span>
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
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
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
                  En yakın onaylı teknisyenimiz belirtilen tarih ve saatte adresinize yönlendirilecektir. Sizi arayacağız.
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
      <footer className="bg-[#0A182E] text-white py-3 px-6 rounded-t-3xl flex items-center justify-between text-xs font-semibold">
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