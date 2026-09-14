'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Wrench, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Building2, 
  Navigation, 
  ArrowRight, 
  CheckCircle2, 
  ArrowLeft 
} from 'lucide-react';

// İl ve İlçe Katalog Verisi
const CITIES_DATA: Record<string, string[]> = {
  "İstanbul": ["Kadıköy", "Beşiktaş", "Üsküdar", "Şişli", "Bakırköy", "Beylikdüzü", "Ümraniye", "Pendik", "Maltepe", "Ataşehir", "Sarıyer"],
  "Ankara": ["Çankaya", "Keçiören", "Yenimahalle", "Mamuk", "Etimesgut", "Sincan", "Gölbaşı"],
  "İzmir": ["Karşıyaka", "Konak", "Bornova", "Buca", "Çiğli", "Gaziemir", "Bayraklı", "Urla"],
  "Bursa": ["Nilüfer", "Osmangazi", "Yıldırım", "Mudanya", "İnegöl", "Gemlik"],
  "Antalya": ["Muratpaşa", "Konyaaltı", "Kepez", "Alanya", "Manavgat"],
  "Adana": ["Seyhan", "Çukurova", "Yüreğir", "Sarıçam"],
  "Kocaeli": ["İzmit", "Gebze", "Darica", "Körfez", "Başiskele"],
  "Gaziantep": ["Şahinbey", "Şehitkamil"],
  "Konya": ["Selçuklu", "Meram", "Karatay"],
  "Mersin": ["Yenişehir", "Mezitli", "Toroslar", "Akdeniz"]
};

export default function KayitPage() {
  const router = useRouter();
  const [authStep, setAuthStep] = useState<'form' | 'otp'>('form');
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    city: '',
    district: '',
    address: ''
  });
  const [otpCode, setOtpCode] = useState<string[]>(['', '', '', '']);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // İl değiştiğinde ilçeyi sıfırla
    if (name === 'city') {
      setFormData(prev => ({ ...prev, city: value, district: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phone) {
      alert('Lütfen zorunlu alanları (Ad Soyad ve Telefon) doldurunuz.');
      return;
    }
    setAuthStep('otp');
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value[value.length - 1];
    const newOtp = [...otpCode];
    newOtp[index] = value;
    setOtpCode(newOtp);

    if (value && index < 3) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerifyOtp = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tekniko_customer', JSON.stringify(formData));
    }
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-center items-center p-4 font-sans my-6">
      {/* Geri Dön Linki */}
      <div className="w-full max-w-md mb-4">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Ana Sayfaya Dön
        </Link>
      </div>

      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-100">
        
        {/* LOGO VE BAŞLIK */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-amber-100 text-[#D97724] rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Wrench className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Teknik<span className="text-[#D97724]">-o</span> Müşteri Kaydı
          </h1>
          <p className="text-xs text-slate-500 mt-1">Arıza ve servis hizmeti almak için kayıt oluşturun.</p>
        </div>

        {authStep === 'form' ? (
          <form onSubmit={handleFormSubmit} className="space-y-3.5">
            {/* 1. Ad Soyad */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ad Soyad *</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="Ahmet Yılmaz"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#D97724]"
                />
              </div>
            </div>

            {/* 2. Telefon Numarası */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Telefon Numarası *</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="05XX XXX XX XX"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#D97724]"
                />
              </div>
            </div>

            {/* 3. E-mail Adresi */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail Adresi</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="ahmet@example.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#D97724]"
                />
              </div>
            </div>

            {/* 4. İl (Katalogdan Seçim) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">İl</label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3 top-3 text-slate-400 z-10" />
                <select
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#D97724] appearance-none text-slate-700 cursor-pointer"
                >
                  <option value="">İl Seçiniz</option>
                  {Object.keys(CITIES_DATA).map((cityName) => (
                    <option key={cityName} value={cityName}>
                      {cityName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 5. İlçe (İle Göre Dinamik Katalog) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">İlçe</label>
              <div className="relative">
                <Navigation className="w-4 h-4 absolute left-3 top-3 text-slate-400 z-10" />
                <select
                  name="district"
                  value={formData.district}
                  onChange={handleInputChange}
                  disabled={!formData.city}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#D97724] appearance-none text-slate-700 disabled:bg-slate-100 disabled:cursor-not-allowed cursor-pointer"
                >
                  <option value="">
                    {formData.city ? 'İlçe Seçiniz' : 'Önce İl Seçiniz'}
                  </option>
                  {formData.city &&
                    CITIES_DATA[formData.city]?.map((districtName) => (
                      <option key={districtName} value={districtName}>
                        {districtName}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* 6. Açık Adres */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Açık Adres</label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <textarea
                  name="address"
                  rows={2}
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Mahalle, Sokak, Bina No..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#D97724] resize-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#D97724] hover:bg-[#c3671c] text-white font-semibold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm mt-3"
            >
              <span>Doğrulama Kodu Gönder</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <div className="space-y-5 text-center">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Doğrulama Kodu</h3>
              <p className="text-xs text-slate-500 mt-1">
                <span className="font-semibold text-slate-700">{formData.phone}</span> numarasına gönderilen 4 haneli kodu giriniz.
              </p>
            </div>

            {/* OTP Kutuları */}
            <div className="flex justify-center gap-3 my-4">
              {otpCode.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className="w-12 h-12 text-center text-xl font-bold rounded-xl border-2 border-slate-200 focus:border-[#D97724] focus:outline-none bg-slate-50 text-slate-900"
                />
              ))}
            </div>

            <div className="space-y-2">
              <button
                onClick={handleVerifyOtp}
                className="w-full bg-[#D97724] hover:bg-[#c3671c] text-white font-semibold py-3 rounded-xl transition-all shadow-md text-sm"
              >
                Kayıt Oluştur ve Giriş Yap
              </button>
              <button
                onClick={() => setAuthStep('form')}
                className="text-xs text-slate-500 hover:text-slate-700 block mx-auto underline"
              >
                Bilgileri Düzenle
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}