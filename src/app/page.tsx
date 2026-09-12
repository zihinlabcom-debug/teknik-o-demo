'use client';

import React, { useState } from 'react';

export default function CustomerHome() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState<'form' | 'otp' | 'success'>('form');
  
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

  // SMS Doğrulama Kodu (4 haneli test kodu)
  const [otpCode, setOtpCode] = useState(['', '', '', '']);

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

  // Form Gönderimi ➔ SMS Adımına Geçiş
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('otp');
  };

  // OTP Kutuları İçi Değişim
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otpCode];
    newOtp[index] = value;
    setOtpCode(newOtp);

    // Otomatik sonraki kutuya odaklanma
    if (value && index < 3) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  // SMS Kodunu Doğrulama
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('success');
    setTimeout(() => {
      setIsModalOpen(false);
      setStep('form');
      setFormData({
        firstName: '',
        lastName: '',
        city: 'Bursa',
        district: '',
        address: '',
        email: '',
        phone: '',
      });
      setOtpCode(['', '', '', '']);
    }, 2500);
  };

  return (
    <main className="min-h-screen bg-slate-50 text-gray-800 flex flex-col items-center justify-between p-6 max-w-md mx-auto relative">
      
      {/* Üst Logo ve Slogan */}
      <div className="w-full text-center mt-4">
        <h1 className="text-4xl font-black text-amber-600 tracking-tight">
          Teknik-o
        </h1>
        <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">
          Teknik Hizmetin Akıllı Platformu
        </p>
      </div>

      {/* Kategori Kartları */}
      <div className="w-full grid grid-cols-4 gap-3 my-6">
        {categories.map((item) => (
          <div
            key={item.id}
            onClick={() => setIsModalOpen(true)}
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

      {/* Açıklama Metni */}
      <div className="w-full text-center px-2">
        <p className="text-xs leading-relaxed text-slate-500 font-medium">
          Teknik-O, yüzlerce kategorideki ev hizmetlerinden yapay zekâ destekli
          teşhis sistemiyle sizi doğru çözüme yönlendirir. Sorununuzu anlatın,
          tahmini maliyeti öğrenin ve güvenle hizmet alın.
        </p>
      </div>

      {/* Kayıt Ol Butonu */}
      <div className="w-full mb-6 mt-4">
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full py-4 bg-amber-600 hover:bg-amber-700 active:scale-98 transition-all text-white font-bold text-base rounded-2xl shadow-lg shadow-amber-600/25"
        >
          Kayıt Ol
        </button>
      </div>

      {/* Açılır Kayıt & Doğrulama Modalı */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h2 className="text-lg font-bold text-slate-800">
                {step === 'form' && 'Müşteri Kayıt Formu'}
                {step === 'otp' && 'SMS Doğrulama'}
                {step === 'success' && 'Tebrikler!'}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setStep('form');
                }}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* ADIM 1: DETAYLI KAYIT FORMU */}
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

            {/* ADIM 2: TELEFON SMS DOĞRULAMA (OTP) */}
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
                  Hesabı Doğrula ve Tamamla
                </button>

                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="text-xs text-slate-400 hover:text-slate-600 underline block mx-auto mt-2"
                >
                  Bilgileri Düzenle
                </button>
              </form>
            )}

            {/* ADIM 3: BAŞARILI MESAJI */}
            {step === 'success' && (
              <div className="py-8 text-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl mb-3 animate-bounce">
                  ✓
                </div>
                <h3 className="text-xl font-bold text-slate-800">Üyelik Aktif Edildi!</h3>
                <p className="text-xs text-slate-500 mt-2">
                  Sayın <span className="font-semibold text-slate-700">{formData.firstName} {formData.lastName}</span>, Teknik-O'ya hoş geldiniz.
                </p>
              </div>
            )}

          </div>
        </div>
      )}

    </main>
  );
}