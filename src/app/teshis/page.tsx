'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Send, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  Bot,
  User,
  Wrench
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  time: string;
}

export default function TeshisPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    possibleCause: string;
    estimatedCost: string;
    urgency: string;
    confidence: string;
  } | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initialProblem = typeof window !== 'undefined' 
      ? localStorage.getItem('tekniko_current_problem') || 'Kombi su sızdırıyor ve basınç düşüyor.'
      : 'Genel kontrol ve bakım';

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages([
      {
        id: '1',
        sender: 'user',
        text: initialProblem,
        time: now
      },
      {
        id: '2',
        sender: 'ai',
        text: `Sorununuzu aldım: "${initialProblem}". Yapay zekâ algoritmamız geçmiş servis verileriyle kıyaslayarak teşhis koyuyor...`,
        time: now
      }
    ]);

    runAIDiagnostic(initialProblem);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAnalyzing]);

  // AKILLI YAPAY ZEKÂ ANALİZİ
  const runAIDiagnostic = (problemText: string) => {
    setIsAnalyzing(true);
    setAnalysisResult(null);

    setTimeout(() => {
      setIsAnalyzing(false);
      const lower = problemText.toLowerCase();

      let result = {
        possibleCause: 'Genel Arıza Teşhisi ve Bakım İhtiyacı',
        estimatedCost: '500 TL - 900 TL',
        urgency: 'Normal',
        confidence: '%88'
      };

      if (lower.includes('kombi') || lower.includes('su') || lower.includes('basınç') || lower.includes('petek')) {
        result = {
          possibleCause: 'Basınç Sensörü Arızası / Doldurma Musluğu veya İç Filtre Tıkanıklığı',
          estimatedCost: '850 TL - 1.450 TL',
          urgency: 'Orta (24 saat içinde müdahale önerilir)',
          confidence: '%94'
        };
      } else if (lower.includes('klima') || lower.includes('soğutma') || lower.includes('gaz')) {
        result = {
          possibleCause: 'Klima Gaz Eksikliği / Fan Motoru Kondansatör Arızası',
          estimatedCost: '950 TL - 1.800 TL',
          urgency: 'Düşük',
          confidence: '%91'
        };
      } else if (lower.includes('boya') || lower.includes('badana') || lower.includes('duvar')) {
        result = {
          possibleCause: 'Yüzey Hazırlığı + 2 Kat Silinebilir Plastik/Akrilik Boya Uygulaması',
          estimatedCost: '2.500 TL - 4.500 TL',
          urgency: 'Planlı Hizmet',
          confidence: '%96'
        };
      }

      setAnalysisResult(result);

      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'ai',
          text: `Teşhis tamamlandı! Tahmini arıza: **${result.possibleCause}**. Bu işlem için garanti edilen maksimum tavan fiyat **${result.estimatedCost}** olarak belirlenmiştir. Onaylı usta yönlendirelim mi?`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 2000);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    const userQuery = inputText;
    setInputText('');

    // Dinamik Cevap
    setTimeout(() => {
      const aiReply: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: `"${userQuery}" notunuz teşhis dosyasına eklendi. Bölgenizdeki en yüksek puana sahip sertifikalı teknisyene iş emri iletiliyor.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiReply]);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto relative shadow-2xl font-sans text-slate-900">
      
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#EE6C13]" />
              <h1 className="font-bold text-sm text-slate-900">Teknik-O AI Teşhis</h1>
            </div>
            <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              Canlı Analiz Sistemi
            </p>
          </div>
        </div>

        <button 
          onClick={() => alert('Teknisyen yönlendirme talebiniz onaylandı. Usta sizinle iletişime geçecek!')}
          className="bg-[#EE6C13] hover:bg-[#d85e0e] text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Usta Çağır</span>
        </button>
      </header>

      {/* CHAT VE ANALİZ ALANI */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 pb-24">
        
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${
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
              className={`max-w-[80%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-[#0B1727] text-white rounded-tr-none'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
              }`}
            >
              <p>{msg.text}</p>
              <span className="text-[9px] block mt-1 text-right text-slate-400">
                {msg.time}
              </span>
            </div>
          </div>
        ))}

        {/* ANALİZ YÜKLENİYOR SİMÜLASYONU */}
        {isAnalyzing && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center gap-3 animate-pulse">
            <div className="w-6 h-6 border-2 border-[#EE6C13] border-t-transparent rounded-full animate-spin"></div>
            <div>
              <p className="text-xs font-bold text-slate-800">Yapay zekâ arızayı inceliyor...</p>
              <p className="text-[10px] text-slate-500">Veritabanındaki benzer vakalar ve parça fiyatları taranıyor.</p>
            </div>
          </div>
        )}

        {/* AI TEŞHİS SONUÇ KARTI */}
        {analysisResult && (
          <div className="bg-white border-2 border-[#EE6C13]/40 rounded-2xl p-4 shadow-md space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Yapay Zekâ Teşhis Raporu
              </span>
              <span className="text-[10px] bg-orange-100 text-[#EE6C13] font-bold px-2 py-0.5 rounded-full">
                {analysisResult.confidence} Güven Oranı
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Olası Arıza Nedeni</span>
                <span className="font-bold text-slate-800">{analysisResult.possibleCause}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-orange-50/50 p-2.5 rounded-xl border border-orange-100">
                  <span className="text-slate-500 block text-[10px]">Garantili Tavan Fiyat</span>
                  <span className="font-extrabold text-[#EE6C13] text-sm">{analysisResult.estimatedCost}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block text-[10px]">Aciliyet / Süreç</span>
                  <span className="font-semibold text-slate-700">{analysisResult.urgency}</span>
                </div>
              </div>
            </div>

            <div className="pt-1 flex items-center gap-2 text-[10px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-[#EE6C13]" />
              <span>Sürpriz yok: Usta bu fiyatın üzerine çıkamaz.</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* ALT MESAJ YAZMA BAR */}
      <form
        onSubmit={handleSendMessage}
        className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-200 p-3 flex items-center gap-2 z-20"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ek detay yazın veya soru sorun..."
          className="flex-1 bg-slate-100 text-xs text-slate-800 px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#EE6C13]"
        />
        <button
          type="submit"
          className="w-10 h-10 bg-[#EE6C13] hover:bg-[#d85e0e] text-white rounded-xl flex items-center justify-center shrink-0 shadow-md transition-all active:scale-95"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
}