import React from 'react';

export default function CustomerHome() {
  // Hizmet kategorileri ve Unsplash üzerindeki kaliteli fotoğraf bağlantıları
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

  return (
    <main className="min-h-screen bg-slate-50 text-gray-800 flex flex-col items-center justify-between p-6 max-w-md mx-auto">
      
      {/* Üst Logo ve Slogan Bölümü */}
      <div className="w-full text-center mt-4">
        <h1 className="text-4xl font-black text-amber-600 tracking-tight">
          Teknik-o
        </h1>
        <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">
          Teknik Hizmetin Akıllı Platformu
        </p>
      </div>

      {/* 8'li Fotoğraflı Kategori Kartları (2x4 Grid) */}
      <div className="w-full grid grid-cols-4 gap-3 my-6">
        {categories.map((item) => (
          <div
            key={item.id}
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
        <button className="w-full py-4 bg-amber-600 hover:bg-amber-700 active:scale-98 transition-all text-white font-bold text-base rounded-2xl shadow-lg shadow-amber-600/25">
          Kayıt Ol
        </button>
      </div>

    </main>
  );
}