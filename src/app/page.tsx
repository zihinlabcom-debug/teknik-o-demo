'use client';

import React, { useState, useRef, useEffect } from 'react';

interface Message {
  id: number;
  sender: 'ai' | 'user';
  text: string;
}

interface DiagnosisResult {
  primaryFault: string;
  confidenceScore: number;
  estimatedCost: number;
}

export default function CustomerHome() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Müşteri Form Verileri
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    city: 'Bursa',
    district: '',
    address: '',
    email: '',
    phone: '',
  });

  const [otpCode, setOtpCode] = useState(['', '', '', '']);

  // Canlı Sohbet Mesajları & Teşhis Durumu
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: 'ai',
      text: 'Yüzlerce kategorideki ev hizmetlerinde hangi alanda destek almak istersiniz? Tüm ihtiyaçlarınızı veya arızanızı bana yazarak anlatabilirsiniz.',
    },
  ]);
  const [aiInput, setAiInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Teşhis & Güven Skoru Durumları
  const [confidenceScore, setConfidenceScore] = useState<number>(0);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [isServiceRequested, setIsServiceRequested] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const categories = [
    { id: 1, name: 'Kombi', img: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=200&auto=format&fit=crop&q=80' },
    { id: 2, name: 'Klima', img: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=200&auto=format&fit=crop&q=80' },
    { id: 3, name: 'Tesisat', img: 'https://images.unsplash.com/photo-1505798577917-a65157d3320a?w=200&auto=format&fit=crop&q=80' },
    { id: 4, name: 'Elektrik', img: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=200&auto=format&fit=crop&q=80' },
    { id: 5, name: 'Beyaz Eşya', img: 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=200&auto=format&fit=crop&q=80' },
    { id: 6, name: 'Temizlik', img: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=200&auto=format&fit=crop&q=80' },
    { id: 7, name: 'Boya / Badana', img: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=200&auto=format&fit=crop&q=80' },
    { id: 8, name: 'Çilingir', img: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=200&auto=format&fit=crop&q=80' },
  ];

  // Sayfa ilk açıldığında oturum kontrolü
  useEffect(() => {
    const savedLoginState = localStorage.getItem('tekniko_isLoggedIn');
    const savedUserData = localStorage.getItem('tekniko_userData');

    if (savedLoginState === 'true') {
      setIsLoggedIn(true);
    }
    if (savedUserData) {
      setFormData(JSON.parse(savedUserData));
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, diagnosis]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('otp');
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otpCode];
    newOtp[index] = value;
    setOtpCode(newOtp);

    if (value && index < 3) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('tekniko_isLoggedIn', 'true');
    localStorage.setItem('tekniko_userData', JSON.stringify(formData));
    setIsLoggedIn(true);
    setIsModalOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('tekniko_isLoggedIn');
    localStorage.removeItem('tekniko_userData');
    setIsLoggedIn(false);
    setConfidenceScore(0);
    setDiagnosis(null);
    setIsServiceRequested(false);
  };

  // CANLI GERÇEK GEMINI API SOHBET FONKSİYONU
  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim() || diagnosis || isTyping) return;

    const userText = aiInput;
    const userMsg: Message = { id: Date.now(), sender: 'user', text: userText };
    
    setMessages((prev) => [...prev, userMsg]);
    setAiInput('');
    setIsTyping(true);

    try {
      const historyForApi = messages.map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: historyForApi,
          userMessage: userText,
        }),
      });

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setConfidenceScore(data.currentConfidenceScore);

      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: 'ai', text: data.replyMessage },
      ]);

      if (data.isDiagnosisComplete && data.diagnosisDetails) {
        setDiagnosis({
          primaryFault: data.diagnosisDetails.primaryFault,
          confidenceScore: data.currentConfidenceScore,
          estimatedCost: data.diagnosisDetails.estimatedCost,
        });
      }

    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: 'Üzgünüm, şu an bir aksaklık yaşandı. Lütfen tekrar dener misiniz?',
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // İptal Etme İşlemi
  const handleCancelDiagnosis = () => {
    setDiagnosis(null);
    setConfidenceScore(0);
    setIsServiceRequested(false);
    setMessages([
      {
        id: Date.now(),
        sender: 'ai',
        text: 'Teşhis işlemi iptal edildi. Farklı bir konuda yardımcı olmamı ister misiniz?',
      },
    ]);
  };

  // Servis / Usta Çağırma İşlemi
  const handleBookService = () => {
    setIsServiceRequested(true);
  };

  if (!isHydrated) return null;

  return (
    <main className="min-h-screen bg-slate-50 text-gray-800 flex flex-col items-center justify-between p-4 max-w-md mx-auto relative pb-6">
      
      {/* Üst Logo ve Slogan */}
      <div className="w-full text-center mt-2 relative">
        <h1 className="text-4xl font-black text-amber-600 tracking-tight">
          Teknik-o
        </h1>
        <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">
          Teknik Hizmetin Akıllı Platformu
        </p>

        {isLoggedIn && (
          <button
            onClick={handleLogout}
            className="absolute right-0 top-0 text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-2 py-1 rounded-lg transition-all"
          >
            Çıkış Yap
          </button>
        )}
      </div>

      {/* Kategori Kartları */}
      <div className="w-full grid grid-cols-4 gap-2.5 my-3">
        {categories.map((item) => (
          <div
            key={item.id}
            onClick={() => !isLoggedIn && setIsModalOpen(true)}
            className="group relative aspect-square bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-slate-100 flex flex-col items-center justify-between p-2 cursor-pointer active:scale-95"
          >
            <div className="w-full h-3/4 rounded-xl overflow-hidden bg-slate-100">
              <img
                src={item.img}
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            </div>
            <span className="text-[11px] font-semibold text-slate-700 text-center truncate w-full mt-1">
              {item.name}
            </span>
          </div>
        ))}
      </div>

      {/* KULLANICI GİRİŞ YAPMADIYSA GÖSTERİLECEK HOŞ GELDİNİZ VE KAYIT EKRANI */}
      {!isLoggedIn ? (
        <>
          <div className="w-full text-center px-2">
            <p className="text-xs leading-relaxed text-slate-500 font-medium">
              Teknik-O, yüzlerce kategorideki ev hizmetlerinden yapay zekâ destekli
              teşhis sistemiyle sizi doğru çözüme yönlendirir. Sorununuzu anlatın,
              tahmini maliyeti öğrenin ve güvenle hizmet alın.
            </p>
          </div>

          <div className="w-full mb-4 mt-4">
            <button
              onClick={() => {
                setStep('form');
                setIsModalOpen(true);
              }}
              className="w-full py-4 bg-amber-600 hover:bg-amber-700 active:scale-98 transition-all text-white font-bold text-base rounded-2xl shadow-lg shadow-amber-600/25"
            >
              Kayıt Ol / Giriş Yap
            </button>
          </div>
        </>
      ) : (
        /* SADECE GİRİŞ YAPMIŞ KULLANICILARA GÖSTERİLECEK SOHBET VE TEŞHİS MOTORU EKRANI */
        <div className="w-full mt-2 flex-1 flex flex-col justify-end">
          <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-xl flex flex-col h-[440px] justify-between">
            
            {/* Üst Bar: Güven Skoru İlerleme Çubuğu */}
            <div className="border-b pb-2 mb-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  <span className="text-xs font-bold text-slate-700">
                    Hoş Geldin, {formData.firstName || 'Müşteri'}
                  </span>
                </div>
                <span className="text-[11px] font-extrabold text-amber-600">
                  Güven: %{confidenceScore}
                </span>
              </div>
              
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    confidenceScore >= 75 ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.min(confidenceScore, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Mesaj Akış Alanı */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-amber-600 text-white rounded-br-none font-medium'
                        : 'bg-slate-100 text-slate-800 rounded-bl-none font-medium'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 text-slate-400 p-2.5 rounded-2xl rounded-bl-none text-xs flex items-center gap-1">
                    <span>Teşhis analizi yapılıyor</span>
                    <span className="animate-bounce">.</span>
                    <span className="animate-bounce delay-100">.</span>
                    <span className="animate-bounce delay-200">.</span>
                  </div>
                </div>
              )}

              {/* DURUM 1: GÜVEN SKORU %75 ALTINDA KALDIYSA YERİNDE TEŞHİS SEÇENEĞİ */}
              {confidenceScore > 0 && confidenceScore < 75 && !isServiceRequested && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl my-2 text-slate-700">
                  <p className="text-[11px] font-medium text-amber-900 mb-2">
                    Teşhis güven skoru henüz %75’in altındadır. Uzaktan net fiyat sunulamamaktadır.
                  </p>
                  <button
                    onClick={handleBookService}
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-sm mb-2"
                  >
                    🛠️ Yerinde Teşhis İçin Usta Çağır
                  </button>
                  <p className="text-[10px] text-amber-800/80 leading-tight text-center">
                    (Usta geldiğinde sisteme girilen her parça ve fiyat yine sizin onayınıza sunulacak, onaylamadan ücret talep edilmeyecektir.)
                  </p>
                </div>
              )}

              {/* DURUM 2: GÜVEN SKORU %75 VE ÜSTÜNE ÇIKTIYSA NET TEŞHİS VE FİYAT KARTI */}
              {diagnosis && (
                <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-lg border border-slate-800 my-2 animate-in fade-in slide-in-from-bottom duration-300">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-2">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                      ✓ Teşhis Doğruluğu: %{diagnosis.confidenceScore}
                    </span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">Net Tahmin</span>
                  </div>

                  <div className="mb-3">
                    <div className="text-[11px] text-slate-400">En Olası Arıza:</div>
                    <div className="text-sm font-bold text-amber-400">{diagnosis.primaryFault}</div>
                  </div>

                  <div className="mb-4">
                    <div className="text-[11px] text-slate-400">Tahmini Maliyet:</div>
                    <div className="text-xl font-black text-white">{diagnosis.estimatedCost.toLocaleString('tr-TR')} TL</div>
                  </div>

                  {!isServiceRequested ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleBookService}
                        className="py-2.5 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-bold rounded-xl text-xs shadow-md transition-all"
                      >
                        🛠️ Servis Çağır
                      </button>
                      <button
                        onClick={handleCancelDiagnosis}
                        className="py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-semibold rounded-xl text-xs transition-all"
                      >
                        ✕ İptal Et
                      </button>
                    </div>
                  ) : null}
                </div>
              )}

              {/* TALEP ALINDI ONAY MESAJI */}
              {isServiceRequested && (
                <div className="bg-emerald-950/90 border border-emerald-500/40 p-3 rounded-2xl text-center text-xs font-semibold text-emerald-300 my-2">
                  ✓ Servis talebiniz alındı! En yakın usta yönlendiriliyor. Usta fiyat girmeden hiçbir işlem onaylanmaz.
                  <button
                    onClick={handleCancelDiagnosis}
                    className="block w-full mt-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px]"
                  >
                    Talebi İptal Et
                  </button>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Mesaj Giriş Kutusu */}
            {!diagnosis && (
              <form onSubmit={handleAiSubmit} className="relative mt-2 pt-2 border-t flex gap-2">
                <input
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="Arızanızı anlatmaya devam edin..."
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-amber-600 font-medium"
                />
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white px-4 rounded-xl font-bold text-sm shadow-md transition-transform active:scale-90 flex items-center justify-center"
                >
                  ➔
                </button>
              </form>
            )}

          </div>
        </div>
      )}

      {/* Açılır Kayıt Modalı */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h2 className="text-lg font-bold text-slate-800">
                {step === 'form' ? 'Müşteri Kayıt Formu' : 'SMS Doğrulama'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            {step === 'form' && (
              <form onSubmit={handleFormSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">İsim</label>
                    <input
                      type="text"
                      required
                      placeholder="Ahmet"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-600 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Soyisim</label>
                    <input
                      type="text"
                      required
                      placeholder="Yılmaz"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-600 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Telefon Numarası</label>
                  <input
                    type="tel"
                    required
                    placeholder="05XX XXX XX XX"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-600 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">E-Posta</label>
                  <input
                    type="email"
                    required
                    placeholder="ahmet@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-600 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">İl</label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-600 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">İlçe</label>
                    <input
                      type="text"
                      required
                      placeholder="Nilüfer"
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-600 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Adres</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Mahalle, Cadde, Sokak, Bina No ve Daire..."
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-600 text-sm resize-none"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 active:scale-98 transition-all text-white font-bold text-base rounded-xl mt-2 shadow-md"
                >
                  Kodu Gönder ve Devam Et
                </button>
              </form>
            )}

            {step === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="py-4 text-center space-y-4">
                <p className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">{formData.phone}</span> numarasına gönderilen 4 haneli doğrulama kodunu giriniz.
                </p>

                <div className="flex justify-center gap-3 my-4">
                  {otpCode.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      className="w-12 h-12 text-center text-xl font-bold rounded-xl border-2 border-slate-200 focus:border-amber-600 focus:outline-none bg-slate-50"
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 active:scale-98 transition-all text-white font-bold text-base rounded-xl shadow-md"
                >
                  Hesabı Doğrula ve Giriş Yap
                </button>
              </form>
            )}

          </div>
        </div>
      )}

    </main>
  );
}