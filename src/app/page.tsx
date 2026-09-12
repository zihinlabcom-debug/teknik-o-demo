import React from 'react';

export default function CustomerHome() {
  // Hizmet kategorileri (İleride ikonlar ve alt sayfalar eklenecek)
  const categories = [
    { id: 1, name: 'Kombi', icon: '🔥' },
    { id: 2, name: 'Klima', icon: '❄️' },
    { id: 3, name: 'Tesisat', icon: '🚰' },
    { id: 4, name: 'Elektrik', icon: '⚡' },
    { id: 5, name: 'Beyaz Eşya', icon: '🧺' },
    { id: 6, name: 'Temizlik', icon: '🧹' },
    { id: 7, name: 'Boya / Badana', icon: '🎨' },
    { id: 8, name: 'Çilingir', icon: '🔑' },
  ];

  return (
    <main className="min-h-screen bg-white text-gray-800 flex flex-col items-center justify-between p-6 max-w-md mx-auto">
      
      {/* Üst Logo ve Slogan Bölümü */}
      <div className="w-full text-center mt-6">
        <h1 className="text-4xl font-extrabold text-amber-600 tracking-tight">
          Teknik-o
        </h1>
        <p className="text-sm font-semibold text-slate-600 mt-1">
          Teknik Hizmetin Akıllı Platformu
        </p>
      </div>

      {/* 8'li Kategori Kutuları (2x4 Grid) */}
      <div className="w-full grid grid-cols-4 gap-3 my-8">
        {categories.map((item) => (
          <div
            key={item.id}
            className="aspect-square bg-sky-400 hover:bg-sky-500 transition-colors rounded-2xl flex flex-col items-center justify-center text-white shadow-sm cursor-pointer p-2 active:scale-95"
          >
            <span className="text-2xl mb-1">{item.icon}</span>
            <span className="text-[10px] font-medium text-center line-clamp-1">{item.name}</span>
          </div>
        ))}
      </div>

      {/* Açıklama Metni */}
      <div className="w-full text-center px-2">
        <p className="text-xs leading-relaxed text-gray-500 font-normal">
          Teknik-O, yüzlerce kategorideki ev hizmetlerinden yapay zekâ destekli
          teşhis sistemiyle sizi doğru çözüme yönlendirir. Sorununuzu anlatın,
          tahmini maliyeti öğrenin ve güvenle hizmet alın.
        </p>
      </div>

      {/* Kayıt Ol Butonu */}
      <div className="w-full mb-8 mt-6">
        <button className="w-full py-4 bg-amber-600 hover:bg-amber-700 active:scale-98 transition-all text-white font-bold text-lg rounded-2xl shadow-lg shadow-amber-600/30">
          Kayıt Ol
        </button>
      </div>

    </main>
  );
}