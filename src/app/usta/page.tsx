"use client";

import React, { useState } from "react";

export default function UstaPanelFixed() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState("home");
  const [jobStatus, setJobStatus] = useState("pool");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [poolJobs, setPoolJobs] = useState([
    {
      id: 1,
      category: "Kombi & Isıtma",
      title: "Demirdöküm Nitromix - F76 Arızası",
      price: "1.850 TL",
      diagnosis: "Su basınç sensörü ve iç filtre arızası.",
      confidence: "%92"
    }
  ]);

  const [extraReason, setExtraReason] = useState("");
  const [uploadedPhoto, setUploadedPhoto] = useState(null);
  const [customerApproved, setCustomerApproved] = useState(null);
  const [systemCalculatedPrice, setSystemCalculatedPrice] = useState(null);

  const availableProfessions = [
    "Boya / Badana", "Su Tesisatı", "Elektrik", "Kombi / Isıtma", 
    "Temizlik", "Beyaz Eşya Tamiri", "Bahçe İşleri", "Marangoz", "Klima & Soğutma", "Çilingir"
  ];
  const [selectedProfessions, setSelectedProfessions] = useState([]);

  const toggleProfession = (prof) => {
    if (selectedProfessions.includes(prof)) {
      setSelectedProfessions(selectedProfessions.filter(p => p !== prof));
    } else {
      setSelectedProfessions([...selectedProfessions, prof]);
    }
  };

  const categories = [
    { name: "Kombi", icon: "🔥" }, { name: "Klima", icon: "❄️" },
    { name: "Tesisat", icon: "🔧" }, { name: "Elektrik", icon: "⚡" },
    { name: "Beyaz Eşya", icon: "🧊" }, { name: "Temizlik", icon: "🧹" },
    { name: "Boya / Badana", icon: "🎨" }, { name: "Çilingir", icon: "🔑" },
  ];

  if (step === "dashboard") {
    return (
      <main className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
        <div className="max-w-3xl mx-auto">
          <header className="flex justify-between items-center mb-6 bg-slate-800 p-4 rounded-2xl shadow-lg border border-slate-700/50">
            <div>
              <h1 className="text-lg font-bold text-[#D97724]">Teknik-O Usta Paneli</h1>
              <p className="text-xs text-slate-400">Bölge: Bursa / Nilüfer</p>
            </div>
            <button 
              onClick={() => { setStep("home"); setJobStatus("pool"); setCustomerApproved(null); setSystemCalculatedPrice(null); }}
              className="text-xs text-red-400 font-medium hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition"
            >
              Çıkış Yap
            </button>
          </header>

          {successMessage && (
            <div className="mb-4 bg-emerald-900/30 border border-emerald-500/30 text-emerald-300 p-3 rounded-xl text-xs font-medium">
              {successMessage}
            </div>
          )}

          <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700/50 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
              <div className="flex items-center gap-2">
                {jobStatus === "extra_requested" && (
                  <button 
                    onClick={() => { 
                      setJobStatus("in_progress"); 
                      setExtraReason(""); 
                      setUploadedPhoto(null); 
                      setSystemCalculatedPrice(null); 
                      setCustomerApproved(null); 
                    }}
                    className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition flex items-center justify-center text-xs font-bold"
                  >
                    ←
                  </button>
                )}
                <h2 className="text-md font-bold text-white">
                  {jobStatus === "pool" && "Açık İş Havuzu (Nilüfer)"}
                  {jobStatus === "accepted" && "Kabul Edilen İş - Adres ve Randevu"}
                  {jobStatus === "scheduled" && "Aktif İş, Konum ve İletişim"}
                  {jobStatus === "in_progress" && "İş Başladı - Saha Yönetimi"}
                  {jobStatus === "extra_requested" && "Ekstra İş / Parça Talep Süreci"}
                  {jobStatus === "completed" && "İş Tamamlandı"}
                </h2>
              </div>
            </div>

            {jobStatus === "pool" && (
              <div className="space-y-4">
                {poolJobs.length > 0 ? (
                  poolJobs.map((job) => (
                    <div key={job.id} className="border border-slate-700 bg-slate-900/50 rounded-2xl p-5 hover:border-[#D97724] transition space-y-4 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="bg-[#0E7490]/20 text-[#0E7490] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">{job.category}</span>
                          <h3 className="text-sm font-bold text-white mt-2">{job.title}</h3>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Net İşçilik + Parça</span>
                          <span className="text-lg font-extrabold text-[#D97724]">{job.price}</span>
                        </div>
                      </div>

                      <div className="bg-slate-800 p-3.5 rounded-xl text-xs text-slate-300 space-y-1">
                        <p><strong>Yapay Zekâ Teşhisi:</strong> {job.diagnosis}</p>
                        <p><strong>Güven Skoru:</strong> <span className="text-emerald-400 font-bold">{job.confidence}</span></p>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button 
                          onClick={() => { setJobStatus("accepted"); setSuccessMessage("İş kabul edildi. Müşteri adresi açıldı."); }}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition text-xs shadow-md"
                        >
                          Kabul Et
                        </button>
                        <button 
                          onClick={() => {
                            setPoolJobs(poolJobs.filter(j => j.id !== job.id));
                            setSuccessMessage("İş reddedildi.");
                          }}
                          className="px-4 py-2.5 border border-slate-700 text-slate-300 hover:bg-slate-800 font-semibold rounded-xl transition text-xs"
                        >
                          Reddet
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 space-y-4 bg-slate-900/50 rounded-2xl border border-dashed border-slate-700">
                    <p className="text-sm font-bold text-white">Bölgenizde şu an yeni bir iş bulunmuyor</p>
                    <button 
                      onClick={() => {
                        setPoolJobs([{
                          id: 1,
                          category: "Kombi & Isıtma",
                          title: "Demirdöküm Nitromix - F76 Arızası",
                          price: "1.850 TL",
                          diagnosis: "Su basınç sensörü ve iç filtre arızası.",
                          confidence: "%92"
                        }]);
                        setSuccessMessage("Havuz yenilendi.");
                      }}
                      className="bg-[#D97724] hover:bg-[#c3671c] text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm"
                    >
                      Havuzu Yenile
                    </button>
                  </div>
                )}
              </div>
            )}

            {jobStatus === "accepted" && (
              <div className="space-y-4">
                <div className="bg-[#D97724]/10 border border-[#D97724]/30 p-4 rounded-xl text-xs text-slate-200 space-y-1">
                  <p className="font-bold text-[#D97724] text-sm">Müşteri Adres Bilgisi:</p>
                  <p><strong>Ad Soyad:</strong> Mehmet Demir</p>
                  <p><strong>Adres:</strong> 29 Ekim Mah. 410. Sok. No: 12 Kat: 3 Daire: 7, Nilüfer / Bursa</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase">Bugün İçin Ziyaret Saati Seçin</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {["10:00 - 12:00", "13:00 - 15:00", "15:00 - 17:00", "17:00 - 19:00"].map((slot, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedSlot(slot)}
                        className={`p-2.5 rounded-xl text-xs font-bold border transition ${selectedSlot === slot ? 'bg-[#D97724] text-white border-[#D97724] shadow-md' : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-[#D97724]'}`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  disabled={!selectedSlot}
                  onClick={() => { setJobStatus("scheduled"); setSuccessMessage(`Randevu ${selectedSlot} için onaylandı!`); }}
                  className={`w-full py-3 rounded-xl text-xs font-bold transition shadow-md ${selectedSlot ? 'bg-[#D97724] hover:bg-[#c3671c] text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
                >
                  Randevuyu Onayla ve Müşteriye Bildir
                </button>
              </div>
            )}

            {jobStatus === "scheduled" && (
              <div className="space-y-4 text-center py-2">
                <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-lg font-bold">✓</div>
                <h3 className="text-sm font-bold text-white">Randevu Saati: <span className="text-[#D97724]">{selectedSlot}</span></h3>
                
                <div className="bg-slate-900 border border-slate-700 p-3.5 rounded-xl text-xs text-slate-300 text-left space-y-2">
                  <p className="font-bold text-white">Müşteri Konum Bilgisi:</p>
                  <p className="text-slate-400">29 Ekim Mah. 410. Sok. No: 12 Kat: 3 Daire: 7, Nilüfer / Bursa</p>
                  <a 
                    href="https://maps.google.com/?q=29+Ocak+Mahallesi+Nilüfer+Bursa" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-full bg-[#0E7490]/20 hover:bg-[#0E7490]/30 text-[#0E7490] border border-[#0E7490]/40 font-bold py-2 rounded-lg text-xs transition"
                  >
                    🗺️ Haritada Aç / Yol Tarifi Al
                  </a>
                </div>

                <div className="pt-2">
                  <a 
                    href="tel:05555555555" 
                    className="inline-flex items-center justify-center w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs transition shadow-md"
                  >
                    📞 Müşteriyi Ara
                  </a>
                </div>

                <button 
                  onClick={() => { setJobStatus("in_progress"); setSuccessMessage("İş başlama konumu aktif."); }}
                  className="w-full bg-[#0E7490] hover:bg-[#0b5c73] text-white font-bold py-3 rounded-xl text-xs transition mt-2 shadow-md"
                >
                  Adrese Vardım / İşe Başla
                </button>
              </div>
            )}

            {jobStatus === "in_progress" && (
              <div className="space-y-4">
                <div className="bg-[#0E7490]/10 border border-[#0E7490]/30 p-4 rounded-xl text-xs text-slate-200">
                  <p className="font-bold text-[#0E7490] text-sm mb-1">Sahadasınız - İş Devam Ediyor</p>
                </div>

                <button 
                  onClick={() => setJobStatus("extra_requested")}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl text-xs transition shadow-md"
                >
                  ⚠️ Ekstra İş / Parça Talebi Oluştur
                </button>

                <button 
                  onClick={() => { setJobStatus("completed"); setSuccessMessage("İş başarıyla tamamlandı!"); }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs transition shadow-md"
                >
                  ✅ İşi Sorunsuz Tamamla
                </button>
              </div>
            )}

            {jobStatus === "extra_requested" && (
              <div className="space-y-4">
                <div className="bg-amber-900/20 border border-amber-500/30 p-4 rounded-xl text-xs text-slate-200 space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">1. Arıza / Değişim Açıklaması</label>
                    <textarea 
                      rows={2}
                      value={extraReason}
                      onChange={(e) => setExtraReason(e.target.value)}
                      placeholder="Örn: Parça değişimi gerekiyor..." 
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">2. Fotoğraf Yükle</label>
                    <input 
                      type="file" 
                      onChange={(e) => e.target.files && setUploadedPhoto(e.target.files[0])}
                      className="w-full p-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-300"
                    />
                  </div>

                  {!systemCalculatedPrice ? (
                    <button 
                      onClick={() => {
                        if (!extraReason) {
                          alert("Lütfen açıklama giriniz.");
                          return;
                        }
                        setSystemCalculatedPrice("1.250 TL");
                      }}
                      className="w-full bg-[#D97724] hover:bg-[#c3671c] text-white font-bold py-2.5 rounded-lg text-xs transition shadow-sm"
                    >
                      Sisteme Gönder ve Fiyat Analizi Üret
                    </button>
                  ) : (
                    <div className="bg-slate-900 p-3.5 rounded-lg border border-amber-500/40 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold uppercase text-slate-400">Analiz Edilen Tutar:</span>
                        <span className="text-sm font-extrabold text-[#D97724]">{systemCalculatedPrice}</span>
                      </div>

                      {customerApproved === null && (
                        <button 
                          onClick={() => {
                            const res = window.confirm("Müşteri ekstra ücreti onaylıyor mu?");
                            setCustomerApproved(res);
                          }}
                          className="w-full bg-[#0E7490] hover:bg-[#0b5c73] text-white font-bold py-2.5 rounded-lg text-xs transition"
                        >
                          Müşteriye Onay Gönder
                        </button>
                      )}

                      {customerApproved === true && (
                        <div className="bg-emerald-900/40 text-emerald-300 border border-emerald-500/40 p-2.5 rounded-lg text-xs font-bold space-y-2">
                          <p>🎉 Müşteri onayladı!</p>
                          <button 
                            onClick={() => { setJobStatus("in_progress"); setSuccessMessage("İşe devam edebilirsiniz."); }}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-xs"
                          >
                            İşe Geri Dön
                          </button>
                        </div>
                      )}

                      {customerApproved === false && (
                        <div className="bg-red-900/40 text-red-300 border border-red-500/40 p-2.5 rounded-lg text-xs font-bold space-y-2">
                          <p>❌ İşlem sonlandırıldı.</p>
                          <button 
                            onClick={() => { setJobStatus("pool"); setCustomerApproved(null); setExtraReason(""); setSystemCalculatedPrice(null); }}
                            className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-lg text-xs"
                          >
                            Havuza Geri Dön
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {jobStatus === "completed" && (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl font-bold">✓</div>
                <h3 className="text-lg font-bold text-white">İş Başarıyla Tamamlandı!</h3>
                <button 
                  onClick={() => { setJobStatus("pool"); setSuccessMessage(""); setSystemCalculatedPrice(null); }}
                  className="bg-[#D97724] hover:bg-[#c3671c] text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-md"
                >
                  Yeni İş Bekle (Havuza Dön)
                </button>
              </div>
            )}

          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-slate-700/50 flex flex-col items-center p-6 text-center">
        
        <div className="mt-4 mb-6">
          <h1 className="text-3xl font-black tracking-tight">
            <span className="text-[#D97724]">Teknik</span>
            <span className="text-slate-500">-</span>
            <span className="text-[#0E7490]">o</span>
          </h1>
          <p className="text-[11px] font-bold tracking-widest text-slate-400 uppercase mt-1">Usta Paneli</p>
        </div>

        <div className="grid grid-cols-4 gap-3 w-full mb-6">
          {categories.map((cat, idx) => (
            <div key={idx} className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-3 flex flex-col items-center justify-center hover:border-[#D97724] transition shadow-sm">
              <span className="text-2xl mb-1">{cat.icon}</span>
              <span className="text-[11px] font-medium text-slate-300">{cat.name}</span>
            </div>
          ))}
        </div>

        <button 
          onClick={() => setShowAuthModal(true)}
          className="w-full bg-[#D97724] hover:bg-[#c3671c] text-white font-bold py-3.5 rounded-2xl transition shadow-lg text-sm"
        >
          Kayıt Ol / Giriş Yap
        </button>

        {showAuthModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-700 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-2xl text-left relative">
              <button 
                onClick={() => setShowAuthModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>

              <h3 className="text-xl font-bold text-white mb-4 text-center">
                {isLogin ? "Usta Giriş Yap" : "Usta Ağına Kayıt Ol"}
              </h3>

              <form onSubmit={(e) => { e.preventDefault(); setStep("dashboard"); }} className="space-y-3">
                {!isLogin && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">İsim</label>
                        <input type="text" required className="w-full p-2.5 text-sm bg-slate-900 border border-slate-700 text-white rounded-xl outline-none" placeholder="Ahmet" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Soyisim</label>
                        <input type="text" required className="w-full p-2.5 text-sm bg-slate-900 border border-slate-700 text-white rounded-xl outline-none" placeholder="Yılmaz" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">E-Posta</label>
                      <input type="email" required className="w-full p-2.5 text-sm bg-slate-900 border border-slate-700 text-white rounded-xl outline-none" placeholder="ahmet@ornek.com" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Telefon No</label>
                      <input type="tel" required className="w-full p-2.5 text-sm bg-slate-900 border border-slate-700 text-white rounded-xl outline-none" placeholder="05XX XXX XX XX" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Uzmanlık Alanları</label>
                      <div className="grid grid-cols-2 gap-2 bg-slate-900 p-3 rounded-xl border border-slate-700">
                        {availableProfessions.map((prof, i) => (
                          <label key={i} className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={selectedProfessions.includes(prof)}
                              onChange={() => toggleProfession(prof)}
                              className="rounded text-[#D97724] w-4 h-4 bg-slate-800 border-slate-700"
                            />
                            <span>{prof}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Telefon Numarası</label>
                  <input type="tel" required className="w-full p-2.5 text-sm bg-slate-900 border border-slate-700 text-white rounded-xl outline-none" placeholder="05XX XXX XX XX" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Şifre</label>
                  <input type="password" required className="w-full p-2.5 text-sm bg-slate-900 border border-slate-700 text-white rounded-xl outline-none" placeholder="••••••••" />
                </div>

                <button type="submit" className="w-full bg-[#D97724] hover:bg-[#c3671c] text-white font-bold py-3 rounded-xl text-sm transition shadow-md mt-2">
                  {isLogin ? "Giriş Yap" : "Kayıt Ol ve Havuza Katıl"}
                </button>
              </form>

              <div className="mt-4 text-center text-xs text-slate-400">
                {isLogin ? "Hesabınız yok mu?" : "Zaten üye misiniz?"}
                <button onClick={() => setIsLogin(!isLogin)} className="ml-1 text-[#D97724] font-bold hover:underline">
                  {isLogin ? "Kayıt Ol" : "Giriş Yap"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}