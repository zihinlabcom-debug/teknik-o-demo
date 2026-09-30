'use client';

import {useState} from 'react';
import Link from 'next/link';
import {TeknikOBrand} from '@/components/brand/teknik-o-brand';

export default function GirisPage(){
  const [notice,setNotice]=useState('');

  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 font-sans text-[#0B1727]">
    <div className="w-full max-w-md">
      <Link href="/" className="mb-4 inline-flex text-sm font-semibold text-slate-600 hover:text-[#C65F16] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97724]">
        ← Ana Sayfaya Dön
      </Link>

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xl sm:p-8">
        <header className="text-center">
          <h1><TeknikOBrand size="standard" /></h1>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">Müşteri Girişi</p>
          <h2 className="mt-7 text-2xl font-extrabold tracking-tight">Tekrar hoş geldiniz</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Hesabınıza cep telefonunuza gelecek SMS koduyla giriş yapabileceksiniz.</p>
        </header>

        <form className="mt-8" onSubmit={event=>{
          event.preventDefault();
          setNotice('SMS doğrulaması henüz etkin değil. Kod gönderilmedi ve giriş yapılmadı.');
        }}>
          <label htmlFor="login-phone" className="block text-sm font-semibold text-slate-800">Telefon Numarası</label>
          <input id="login-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" required
            placeholder="+90 5xx xxx xx xx"
            className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-[#D97724] focus:outline-none" />
          <button type="submit" className="mt-4 w-full rounded-xl bg-[#D97724] px-4 py-3 font-bold text-white shadow-sm transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97724]">
            SMS Kodu Gönder
          </button>
          {notice&&<p role="status" className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm leading-5 text-orange-900">{notice}</p>}
        </form>

        <section aria-label="SMS kodu ile doğrulama" className="mt-8 border-t border-slate-200 pt-6">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Sonraki adım</p>
          <label htmlFor="login-otp" className="mt-3 block text-sm font-semibold text-slate-800">SMS Doğrulama Kodu</label>
          <input id="login-otp" name="otp" type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="SMS kodu" disabled
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-base text-slate-500 placeholder:text-slate-400" />
          <button type="button" disabled className="mt-4 w-full rounded-xl bg-slate-200 px-4 py-3 font-bold text-slate-500">Doğrula ve Giriş Yap</button>
          <button type="button" disabled className="mt-3 w-full text-sm font-semibold text-slate-400">Kodu Tekrar Gönder</button>
          <p className="mt-3 text-center text-xs leading-5 text-slate-500">SMS gönderimi ve kod doğrulaması entegrasyon tamamlandığında açılacak.</p>
        </section>

        <p className="mt-7 text-center text-sm text-slate-600">Hesabınız yok mu? <Link href="/kayit" className="font-bold text-[#A64D12] underline underline-offset-2">Kayıt Ol</Link></p>
      </div>
    </div>
  </main>;
}
