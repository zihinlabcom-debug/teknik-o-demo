'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {RegistrationHeader} from '@/components/registration-header';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Building2, 
  Navigation, 
  LockKeyhole,
  ArrowRight, 
  CheckCircle2, 
  ArrowLeft 
} from 'lucide-react';

export default function KayitPage() {
  const router = useRouter();
  const [cities, setCities] = useState<{ id: number; name: string }[]>([]);
  const [districts, setDistricts] = useState<{ id: number; city_id: number; name: string }[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [authStep, setAuthStep] = useState<'form' | 'otp'>('form');
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    passwordConfirmation: '',
    city: '',
    district: '',
    address: ''
  });
  const [otpCode, setOtpCode] = useState<string[]>(Array(6).fill(''));
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  useEffect(() => {
    const loadCities = async () => {
      try{
        const response=await fetch('/api/auth/email/catalog');
        const result=await response.json();
        if(!response.ok)throw new Error('Catalog unavailable');
        setCities(result.items);
      }catch{setNotice('İl seçenekleri yüklenemedi. Lütfen sayfayı yenileyin.');}
    };
    loadCities();
  }, []);

  useEffect(() => {
    const loadDistricts = async () => {
      if (!selectedCityId) {
        setDistricts([]);
        return;
      }
      try{
        const response=await fetch('/api/auth/email/catalog?cityId='+selectedCityId);
        const result=await response.json();
        if(!response.ok)throw new Error('Catalog unavailable');
        setDistricts(result.items);
      }catch{setNotice('İlçe seçenekleri yüklenemedi. Lütfen tekrar seçin.');}
    };
    loadDistricts();
  }, [selectedCityId]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // İl değiştiğinde ilçeyi sıfırla
    if (name === 'city') {
      const cityId = value ? Number(value) : null;
      setSelectedCityId(cityId);
      setFormData(prev => ({ ...prev, city: value, district: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phone || !formData.city || !formData.district || !formData.address) {
      setNotice('Lütfen tüm zorunlu alanları doldurun.');
      return;
    }
    if(formData.password!==formData.passwordConfirmation){
      setNotice('Şifreler eşleşmiyor.');
      return;
    }
    setBusy(true);setNotice('');
    try{
      const response=await fetch('/api/auth/email/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        phone:formData.phone,fullName:formData.fullName,email:formData.email,password:formData.password,
        cityId:Number(formData.city),districtId:Number(formData.district),addressLine:formData.address,
      })});
      const result=await response.json();
      if(!response.ok){setNotice(result.error||'Doğrulama başlatılamadı.');return;}
      if(result.requiresOtp===false){router.replace(result.redirect||'/hizmetler');router.refresh();return;}
      setAuthStep('otp');
      setNotice('E-posta adresinize gönderilen 6 haneli kodu girin.');
    }catch{setNotice('Doğrulama hizmetine ulaşılamıyor.');}
    finally{setBusy(false);}
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value[value.length - 1];
    const newOtp = [...otpCode];
    newOtp[index] = value;
    setOtpCode(newOtp);

    if (value && index < otpCode.length-1) {
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

  const handleVerifyOtp = async () => {
    setBusy(true);setNotice('');
    try{
      const response=await fetch('/api/auth/email/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:formData.email,token:otpCode.join('')})});
      const result=await response.json();
      if(!response.ok){setNotice(result.error||'Kod doğrulanamadı.');return;}
      router.replace(result.redirect||'/hizmetler');router.refresh();
    }catch{setNotice('Doğrulama hizmetine ulaşılamıyor.');}
    finally{setBusy(false);}
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
        
        <RegistrationHeader />

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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Şifre *</label>
              <div className="relative">
                <LockKeyhole className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input type="password" name="password" required minLength={10} maxLength={128}
                  autoComplete="new-password" value={formData.password} onChange={handleInputChange}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#D97724]" />
              </div>
              <p className="mt-1 text-xs text-slate-500">En az 10 karakter; büyük harf, küçük harf ve rakam.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Şifre tekrar *</label>
              <div className="relative">
                <LockKeyhole className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input type="password" name="passwordConfirmation" required minLength={10} maxLength={128}
                  autoComplete="new-password" value={formData.passwordConfirmation} onChange={handleInputChange}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#D97724]" />
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">E-posta Adresi *</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="ahmet@example.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#D97724]"
                />
              </div>
            </div>

            {/* 4. İl (Katalogdan Seçim) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">İl *</label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3 top-3 text-slate-400 z-10" />
                <select
                  name="city"
                  required
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#D97724] appearance-none text-slate-700 cursor-pointer"
                >
                  <option value="">İl Seçiniz</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 5. İlçe (İle Göre Dinamik Katalog) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">İlçe *</label>
              <div className="relative">
                <Navigation className="w-4 h-4 absolute left-3 top-3 text-slate-400 z-10" />
                <select
                  name="district"
                  required
                  value={formData.district}
                  onChange={handleInputChange}
                  disabled={!formData.city}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#D97724] appearance-none text-slate-700 disabled:bg-slate-100 disabled:cursor-not-allowed cursor-pointer"
                >
                  <option value="">
                    {formData.city ? 'İlçe Seçiniz' : 'Önce İl Seçiniz'}
                  </option>
                  {selectedCityId &&
                    districts.map((district) => (
                      <option key={district.id} value={district.id}>
                        {district.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* 6. Açık Adres */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Açık Adres *</label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <textarea
                  name="address"
                  required
                  minLength={10}
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
              disabled={busy}
              className="w-full bg-[#D97724] hover:bg-[#c3671c] text-white font-semibold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm mt-3"
            >
              <span>Hesap Oluştur</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-xs leading-5 text-slate-500">E-posta doğrulamasından sonra profil ve adres bilgileriniz güvenli biçimde kaydedilir.</p>
          </form>
        ) : (
          <div className="space-y-5 text-center">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Doğrulama Kodu</h3>
              <p className="text-xs text-slate-500 mt-1">
                <span className="font-semibold text-slate-700">{formData.email}</span> için e-posta doğrulama kodunu giriniz.
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
                disabled={busy}
                className="w-full bg-[#D97724] hover:bg-[#c3671c] text-white font-semibold py-3 rounded-xl transition-all shadow-md text-sm"
              >
                Kayıt Oluştur ve Giriş Yap
              </button>
              <button type="button" disabled={busy} onClick={async()=>{
                setBusy(true);
                try{const response=await fetch('/api/auth/email/resend',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:formData.email})});
                  const result=await response.json();setNotice(result.message||result.error);}
                catch{setNotice('Kod gönderilemedi.');}finally{setBusy(false);}
              }} className="block mx-auto text-sm underline">Kodu yeniden gönder</button>
              <button
                onClick={() => setAuthStep('form')}
                className="text-xs text-slate-500 hover:text-slate-700 block mx-auto underline"
              >
                Bilgileri Düzenle
              </button>
            </div>
          </div>
        )}
        {notice&&<p role="status" className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">{notice}</p>}
      </div>
    </div>
  );
}









