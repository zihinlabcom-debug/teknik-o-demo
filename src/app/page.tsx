'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// Kategori Listesi
const categories = [
  { id: 'kombi', name: 'Kombi', img: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=300&q=80' },
  { id: 'klima', name: 'Klima', img: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=300&q=80' },
  { id: 'tesisat', name: 'Tesisat', img: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=300&q=80' },
  { id: 'elektrik', name: 'Elektrik', img: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=300&q=80' },
  { id: 'beyaz-esya', name: 'Beyaz Eşya', img: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=300&q=80' },
  { id: 'temizlik', name: 'Temizlik', img: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=300&q=80' },
  { id: 'boya', name: 'Boya / Bad...', img: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=300&q=80' },
  { id: 'cilingir', name: 'Çilingir', img: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=300&q=80' },
];

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col justify-between max-w-md mx-auto px-6 py-8 relative shadow-xl font-sans">
      
      {/* ÜST LOGO VE ALTYAZI */}
      <div className="flex flex-col items-center mt-2">
        <div className="flex items-center gap-3 mb-1">
          {/* Gerçek Amblem Görseli (Public klasöründen çekiliyor) */}
          <div className="w-12 h-12 relative flex-shrink-0 bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm flex items-center justify-center p-1">
            <Image 
              src="/logo-icon.png" 
              alt="TEKNİK-O Amblem" 
              width={48} 
              height={48} 
              className="object-contain w-full h-full"
            />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">
            <span className="text-[#D97724]">TEKNİK</span>
            <span className="text-slate-400">-</span>
            <span className="text-[#0E7490]">O</span>
          </h1>
        </div>
        <p className="text-[11px] font-bold tracking-widest text-slate-400 uppercase mt-1">
          TEKNİK HİZMETİN AKILLI PLATFORMU
        </p>
      </div>

      {/* KATEGORİ IZGARASI (4x2) */}
      <div className="grid grid-cols-4 gap-3 my-6">
        {categories.map((item) => (
          <button
            key={item.id}
            onClick={() => setSelectedCategory(item.id)}
            className={`flex flex-col items-center bg-white border border-slate-100 rounded-2xl p-2 shadow-sm transition-all hover:shadow-md ${
              selectedCategory === item.id ? 'ring-2 ring-[#D97724]' : ''
            }`}
          >
            <div className="w-full h-16 rounded-xl overflow-hidden mb-2 bg-slate-100">
              <img
                src={item.img}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-xs font-semibold text-slate-700 truncate w-full text-center">
              {item.name}
            </span>
          </button>
        ))}
      </div>

      {/* BİLGİLENDİRME METNİ */}
      <div className="text-center px-2 mb-6">
        <p className="text-xs text-slate-400 leading-relaxed font-normal">
          <span className="font-semibold text-slate-600">TEKNİK-O</span>, yüzlerce kategorideki ev hizmetlerinden yapay zekâ destekli
          teşhis sistemiyle sizi doğru çözüme yönlendirir. Sorununuzu anlatın,
          tahmini maliyeti öğrenin ve güvenle hizmet alın.
        </p>
      </div>

      {/* ALT KISIM: BUTON VE İŞTİRAK YAZISI */}
      <div className="w-full pb-2 flex flex-col items-center">
        <Link
          href="/kayit"
          className="w-full bg-[#D97724] hover:bg-[#c3671c] text-white font-bold py-3.5 rounded-2xl flex items-center justify-center text-base shadow-md transition-all active:scale-[0.99]"
        >
          Kayıt Ol / Giriş Yap
        </Link>
        
        {/* Karaca Grup İştirakidir Yazısı */}
        <p className="text-[10px] tracking-wider text-slate-400 mt-3 font-medium uppercase">
          KARACA GRUOP İŞTİRAKİDİR
        </p>
      </div>

    </div>
  );
}