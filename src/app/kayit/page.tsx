'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
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
    city: '',
    district: '',
    address: ''
  });
  const [otpCode, setOtpCode] = useState<string[]>(['', '', '', '']);
  useEffect(() => {
    const loadCities = async () => {
      const { data, error } = await supabase.from('cities').select('id,name').eq('is_active', true).order('plate_code');
      if (!error && data) setCities(data);
    };
    loadCities();
  }, []);

  useEffect(() => {
    const loadDistricts = async () => {
      if (!selectedCityId) {
        setDistricts([]);
        return;
      }
      const { data, error } = await supabase.from('districts').select('id,city_id,name').eq('city_id', selectedCityId).eq('is_active', true).order('name');
      if (!error && data) setDistricts(data);
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
        
        {/* LOGO VE BA�?LIK */}
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









