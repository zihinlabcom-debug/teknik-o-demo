'use client';

import React, { useState } from 'react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'finance' | 'appointments' | 'field' | 'completed' | 'pools' | 'complaints'>('finance');

  // Örnek Finansal Veriler
  const [finances] = useState({
    totalRevenue: 125000,
    platformFee: 18750, // %15
    riskPool: 25000,    // %20
    technicianPayouts: 81250 // Parça + İşçilik
  });

  const [complaints] = useState([
    { id: 1, tip: 'Müşteri', isim: 'Ahmet Yılmaz', detay: 'Usta randevu saatine geç kaldı.', durum: 'İnceleniyor' },
    { id: 2, tip: 'Usta', isim: 'Ali Usta', detay: 'Müşteri ek hizmet bedelini ödemekte zorluk çıkardı.', durum: 'Çözüldü' }
  ]);

  const [technicians] = useState([
    { id: 1, isim: 'Mehmet Usta', durum: 'dolu', aktifMusteri: 'Ahmet Yılmaz', adres: 'Nilüfer, Bursa' },
    { id: 2, isim: 'Can Usta', durum: 'bos', aktifMusteri: '-', adres: 'Osmangazi, Bursa' }
  ]);

  // 1. Randevu Alınan / Bekleyen İşler (Usta atandı ama henüz işleme başlanmadı)
  const [appointments, setAppointments] = useState([
    {
      id: 101,
      isim: 'Canan Kaya',
      cihaz: 'Baymak Kombi',
      ariza: 'Petekler ısınmıyor',
      randevuTarihi: '16.09.2026 - 14:00',
      usta: 'Can Usta',
      durum: 'Randevu Verildi'
    }
  ]);

  // 2. Sahada Olan / Başlanmış İşler (Usta adreste, parça/fiyat revizyon talebi burada görünür)
  const [fieldJobs, setFieldJobs] = useState([
    {
      id: 1,
      isim: 'Ahmet Yılmaz',
      cihaz: 'Demirdöküm Kombi',
      ariza: 'F76 Basınç Hatası',
      fiyat: '4.500 TL',
      usta: 'Mehmet Usta',
      durum: 'Sahada - İş Başlandı',
      pendingApproval: {
        hasRequest: true,
        aciklama: 'Ana kart değişimi ve iç filtre temizliği gerekiyor.',
        parcaMaliyeti: 3500,
        iscilikUcreti: 1000,
        foto: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300'
      }
    }
  ]);

  // Tamamlanan İşler Listesi
  const [completedJobs] = useState([
    {
      id: 2,
      isim: 'Ayşe Demir',
      cihaz: 'Vaillant Kombi',
      ariza: 'Sıcak su vermiyor (Üç yollu vana değişimi)',
      toplamTutar: '3.200 TL',
      usta: 'Can Usta',
      tamamlanmaTarihi: '15.09.2026 - 14:30'
    }
  ]);

  // Onaylama veya Reddetme Fonksiyonu (Sahadaki işler için)
  const handleApprovalAction = (jobId: number, action: 'onayla' | 'reddet') => {
    setFieldJobs(prev => prev.map(job => {
      if (job.id === jobId) {
        return {
          ...job,
          durum: action === 'onayla' ? 'Fiyat Onaylandı - İşlem Sürüyor' : 'Fiyat Reddedildi',
          pendingApproval: { ...job.pendingApproval, hasRequest: false }
        };
      }
      return job;
    }));
    alert(action === 'onayla' ? 'Fiyat ve parça talebi onaylandı!' : 'Talep reddedildi.');
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-6">
      {/* Üst Header */}
      <header className="mb-8 border-b pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-wider text-orange-600">TEKNİK-O</h1>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-widest">Yönetim Paneli</p>
        </div>
        <div className="bg-orange-100 text-orange-700 px-4 py-2 rounded-lg font-semibold text-sm">
          Sistem Durumu: Aktif 🟢
        </div>
      </header>

      {/* Navigasyon Sekmeleri */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
        <button onClick={() => setActiveTab('finance')} className={`px-4 py-2 rounded-lg font-medium text-sm transition ${activeTab === 'finance' ? 'bg-orange-600 text-white shadow' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>💰 Finans & Havuzlar</button>
        <button onClick={() => setActiveTab('appointments')} className={`px-4 py-2 rounded-lg font-medium text-sm transition ${activeTab === 'appointments' ? 'bg-orange-600 text-white shadow' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>📅 Randevu Bekleyenler</button>
        <button onClick={() => setActiveTab('field')} className={`px-4 py-2 rounded-lg font-medium text-sm transition ${activeTab === 'field' ? 'bg-orange-600 text-white shadow' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>🛠️ Sahada Olanlar (Aktif)</button>
        <button onClick={() => setActiveTab('completed')} className={`px-4 py-2 rounded-lg font-medium text-sm transition ${activeTab === 'completed' ? 'bg-orange-600 text-white shadow' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>✅ Tamamlanan İşler</button>
        <button onClick={() => setActiveTab('pools')} className={`px-4 py-2 rounded-lg font-medium text-sm transition ${activeTab === 'pools' ? 'bg-orange-600 text-white shadow' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>👷 Usta Havuzları</button>
        <button onClick={() => setActiveTab('complaints')} className={`px-4 py-2 rounded-lg font-medium text-sm transition ${activeTab === 'complaints' ? 'bg-orange-600 text-white shadow' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>⚠️ Şikayetler</button>
      </div>

      {/* İçerik Alanları */}
      <main className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        
        {/* 1. FİNANS & HAKEDİŞLER */}
        {activeTab === 'finance' && (
          <div>
            <h2 className="text-xl font-bold mb-4 text-gray-800">Finansal Dağılım ve Hakediş Modülü</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                <p className="text-sm text-orange-600 font-semibold">Toplam Ciro</p>
                <p className="text-2xl font-bold text-gray-900">{finances.totalRevenue.toLocaleString()} TL</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <p className="text-sm text-blue-600 font-semibold">Teknik-O Geliri (%15)</p>
                <p className="text-2xl font-bold text-gray-900">{finances.platformFee.toLocaleString()} TL</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                <p className="text-sm text-purple-600 font-semibold">Risk Havuzu (%20)</p>
                <p className="text-2xl font-bold text-gray-900">{finances.riskPool.toLocaleString()} TL</p>
              </div>
              <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                <p className="text-sm text-green-600 font-semibold">Usta Hakedişleri (Parça+İşçilik)</p>
                <p className="text-2xl font-bold text-gray-900">{finances.technicianPayouts.toLocaleString()} TL</p>
              </div>
            </div>
          </div>
        )}

        {/* 2. RANDEVU BEKLEYENLER */}
        {activeTab === 'appointments' && (
          <div>
            <h2 className="text-xl font-bold mb-4 text-gray-800">Randevu Alınan / İşleme Başlanmamış Kayıtlar</h2>
            {appointments.length === 0 ? (
              <p className="text-gray-500">Bekleyen randevu kaydı bulunmuyor.</p>
            ) : (
              <div className="space-y-4">
                {appointments.map((app) => (
                  <div key={app.id} className="border rounded-xl p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2">Randevu</span>
                      <span className="font-bold text-lg">{app.isim}</span>
                      <span className="text-sm text-gray-500 ml-2">({app.cihaz})</span>
                      <p className="text-sm text-gray-600 mt-1"><strong>Arıza:</strong> {app.ariza}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-orange-600">Planlanan: {app.randevuTarihi}</p>
                      <p className="text-xs text-gray-500 mt-1">Atanan Usta: <strong>{app.usta}</strong></p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. SAHADA OLANLAR (AKTİF İŞLER VE ONAYLAR) */}
        {activeTab === 'field' && (
          <div>
            <h2 className="text-xl font-bold mb-4 text-gray-800">Sahada Olan / İşleme Başlanmış Müşteriler</h2>
            {fieldJobs.length === 0 ? (
              <p className="text-gray-500">Şu an sahada aktif işlemde olan müşteri bulunmuyor.</p>
            ) : (
              <div className="space-y-6">
                {fieldJobs.map((cust) => (
                  <div key={cust.id} className="border rounded-xl p-5 shadow-sm bg-white hover:border-orange-200 transition">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b gap-2">
                      <div>
                        <span className="text-xs font-bold bg-orange-100 text-orange-800 px-2 py-1 rounded mr-2">ID: #{cust.id}</span>
                        <span className="font-bold text-lg text-gray-900">{cust.isim}</span>
                        <span className="text-sm text-gray-500 ml-2">({cust.cihaz})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-600">Atanan Usta: <strong className="text-orange-600">{cust.usta}</strong></span>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-500 text-white">
                          {cust.durum}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-3 text-sm text-gray-700">
                      <div>
                        <p><strong className="text-gray-900">AI İlk Teşhis:</strong> {cust.ariza}</p>
                      </div>
                      <div>
                        <p><strong className="text-gray-900">Teklif Edilen Fiyat:</strong> <span className="text-orange-600 font-bold">{cust.fiyat}</span></p>
                      </div>
                    </div>

                    {cust.pendingApproval.hasRequest && (
                      <div className="mt-4 bg-orange-50 border border-orange-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-orange-600 text-white text-xs font-bold px-2 py-0.5 rounded">⚠️ Usta Fiyat & Parça Revizyon Talebi</span>
                        </div>
                        <div className="flex flex-col md:flex-row gap-4 items-center">
                          <img src={cust.pendingApproval.foto} alt="Arızalı Parça" className="w-28 h-28 object-cover rounded-lg border shadow-sm" />
                          <div className="flex-1 space-y-1">
                            <p className="text-sm text-gray-700"><strong>Usta Açıklaması:</strong> {cust.pendingApproval.aciklama}</p>
                            <p className="text-sm text-gray-700"><strong>Parça Maliyeti:</strong> {cust.pendingApproval.parcaMaliyeti} TL</p>
                            <p className="text-sm text-gray-700"><strong>İşçilik Ücreti:</strong> {cust.pendingApproval.iscilikUcreti} TL</p>
                            <p className="text-xs font-bold text-orange-700 mt-1">Toplam Revize Tutar: {cust.pendingApproval.parcaMaliyeti + cust.pendingApproval.iscilikUcreti} TL</p>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleApprovalAction(cust.id, 'onayla')}
                              className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-green-700 shadow"
                            >
                              Onayla
                            </button>
                            <button 
                              onClick={() => handleApprovalAction(cust.id, 'reddet')}
                              className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-red-700 shadow"
                            >
                              Reddet
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. TAMAMLANAN İŞLER */}
        {activeTab === 'completed' && (
          <div>
            <h2 className="text-xl font-bold mb-4 text-gray-800">Tamamlanan ve Arşivlenen İşler</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b text-gray-500 text-sm">
                    <th className="py-3 px-4">Müşteri Adı</th>
                    <th className="py-3 px-4">Cihaz & Yapılan İşlem</th>
                    <th className="py-3 px-4">Toplam Tahsilat</th>
                    <th className="py-3 px-4">Hizmet Veren Usta</th>
                    <th className="py-3 px-4">Tamamlanma Tarihi</th>
                  </tr>
                </thead>
                <tbody>
                  {completedJobs.map(job => (
                    <tr key={job.id} className="border-b hover:bg-gray-50 text-sm">
                      <td className="py-3 px-4 font-bold">{job.isim}</td>
                      <td className="py-3 px-4 text-gray-600">{job.ariza}</td>
                      <td className="py-3 px-4 font-semibold text-green-600">{job.toplamTutar}</td>
                      <td className="py-3 px-4">{job.usta}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{job.tamamlanmaTarihi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. USTA HAVUZLARI (BOŞ / DOLU) */}
        {activeTab === 'pools' && (
          <div>
            <h2 className="text-xl font-bold mb-4 text-gray-800">Canlı Usta Operasyon ve Havuz Takibi</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border p-4 rounded-xl bg-green-50/50">
                <h3 className="font-bold text-green-700 mb-3">🟢 Boş Havuz (Müsait Ustalar)</h3>
                {technicians.filter(t => t.durum === 'bos').map(t => (
                  <div key={t.id} className="bg-white p-3 rounded-lg border shadow-sm mb-2 flex justify-between items-center">
                    <span>{t.isim} ({t.adres})</span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">İş Bekliyor</span>
                  </div>
                ))}
              </div>
              <div className="border p-4 rounded-xl bg-orange-50/50">
                <h3 className="font-bold text-orange-700 mb-3">🟠 Dolu Havuz (Aktif Sahadaki Ustalar)</h3>
                {technicians.filter(t => t.durum === 'dolu').map(t => (
                  <div key={t.id} className="bg-white p-3 rounded-lg border shadow-sm mb-2 flex justify-between items-center">
                    <div>
                      <p className="font-bold">{t.isim}</p>
                      <p className="text-xs text-gray-500">Müşteri: {t.aktifMusteri} ({t.adres})</p>
                    </div>
                    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">Sahada</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 6. ŞİKAYETLER */}
        {activeTab === 'complaints' && (
          <div>
            <h2 className="text-xl font-bold mb-4 text-gray-800">Müşteri ve Usta Şikayet Yönetimi</h2>
            <div className="space-y-3">
              {complaints.map((c) => (
                <div key={c.id} className="border p-4 rounded-xl flex justify-between items-center">
                  <div>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${c.tip === 'Müşteri' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{c.tip} Şikayeti</span>
                    <p className="font-bold mt-1">{c.isim}</p>
                    <p className="text-sm text-gray-600">{c.detay}</p>
                  </div>
                  <span className="text-sm font-semibold text-orange-600">{c.durum}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}