'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Wrench, User, ShieldCheck, Send, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

export default function Home() {
  const [role, setRole] = useState<'customer' | 'technician' | 'admin'>('customer');
  const [requests, setRequests] = useState<any[]>([]);
  
  // Müşteri Formu State'leri
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [appliance, setAppliance] = useState('Kombi');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  // Verileri Supabase'den Çek
  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from('service_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setRequests(data);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Müşteri: Yeni Arıza Talebi Oluştur
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !description) return alert('Lütfen gerekli alanları doldurun.');
    setLoading(true);

    const { error } = await supabase.from('service_requests').insert([
      {
        customer_name: customerName,
        phone: phone,
        appliance_type: appliance,
        issue_description: description,
        status: 'pending'
      }
    ]);

    setLoading(false);
    if (error) {
      alert('Hata oluştu: ' + error.message);
    } else {
      alert('Talebiniz başarıyla alındı!');
      setCustomerName('');
      setPhone('');
      setDescription('');
      fetchRequests();
    }
  };

  // Usta / Admin: Talep Durumunu Güncelle
  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('service_requests')
      .update({ status: newStatus })
      .eq('id', id);

    if (!error) fetchRequests();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans p-4 md:p-8">
      {/* Üst Başlık & Rol Değiştirici */}
      <header className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center pb-6 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-emerald-400 tracking-tight flex items-center gap-2">
            <Wrench className="w-6 h-6" /> TEKNİK-O DEMO
          </h1>
          <p className="text-xs text-slate-400">Canlı Saha & İş Akış Simülasyonu</p>
        </div>

        {/* Rol Geçiş Butonları */}
        <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setRole('customer')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              role === 'customer' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" /> Müşteri
          </button>
          <button
            onClick={() => setRole('technician')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              role === 'technician' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wrench className="w-4 h-4" /> Usta
          </button>
          <button
            onClick={() => setRole('admin')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              role === 'admin' ? 'bg-blue-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Admin
          </button>
        </div>
      </header>

      {/* İçerik Alanı */}
      <main className="max-w-5xl mx-auto mt-8">
        {/* 1. MÜŞTERİ PANELİ */}
        {role === 'customer' && (
          <div className="max-w-lg mx-auto bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-emerald-400 flex items-center gap-2">
              <User className="w-5 h-5" /> Arıza/Bakım Talebi Oluştur
            </h2>
            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-300">Adınız Soyadınız</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Örn: Eşim"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-300">Telefon Numarası</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05xx xxx xx xx"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-300">Cihaz Türü</label>
                <select
                  value={appliance}
                  onChange={(e) => setAppliance(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="Kombi">Kombi</option>
                  <option value="Klima">Klima</option>
                  <option value="Beyaz Eşya">Beyaz Eşya</option>
                  <option value="Tesisat/Elektrik">Tesisat / Elektrik</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-300">Şikayet / Arıza Tanımı</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Örn: Vaillant kombi F.27 hatası veriyor, sıcak su gelmiyor."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" /> {loading ? 'Gönderiliyor...' : 'Talebi İlet'}
              </button>
            </form>
          </div>
        )}

        {/* 2. USTA PANELİ */}
        {role === 'technician' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
              <Wrench className="w-5 h-5" /> Saha Usta Paneli (Gelen İşler)
            </h2>
            {requests.length === 0 ? (
              <p className="text-slate-500 text-sm">Henüz aktif talep bulunmuyor.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {requests.map((req) => (
                  <div key={req.id} className="bg-slate-800 p-5 rounded-xl border border-slate-700 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs px-2 py-1 rounded-md font-semibold">
                          {req.appliance_type}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(req.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h3 className="font-bold text-base">{req.customer_name}</h3>
                      <p className="text-xs text-slate-400 mb-3">{req.phone || 'Telefon belirtilmedi'}</p>
                      <p className="text-sm bg-slate-900 p-3 rounded-lg border border-slate-800 mb-4">{req.issue_description}</p>
                    </div>

                    <div className="flex gap-2">
                      {req.status === 'pending' && (
                        <button
                          onClick={() => updateStatus(req.id, 'in_progress')}
                          className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2 rounded-lg text-xs transition"
                        >
                          İşe Git / Üstlen
                        </button>
                      )}
                      {req.status === 'in_progress' && (
                        <button
                          onClick={() => updateStatus(req.id, 'completed')}
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2 rounded-lg text-xs transition flex items-center justify-center gap-1"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Tamamlandı Olarak İşaretle
                        </button>
                      )}
                      {req.status === 'completed' && (
                        <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" /> Tamamlandı
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. ADMIN PANELİ */}
        {role === 'admin' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-blue-400 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" /> Yönetici (Admin) Kontrol Paneli
            </h2>
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/50 border-b border-slate-700 text-xs text-slate-400">
                    <th className="p-3">Müşteri</th>
                    <th className="p-3">Cihaz</th>
                    <th className="p-3">Arıza Detayı</th>
                    <th className="p-3">Durum</th>
                    <th className="p-3">Tarih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 text-sm">
                  {requests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-700/20">
                      <td className="p-3 font-medium">{req.customer_name}</td>
                      <td className="p-3 text-xs">{req.appliance_type}</td>
                      <td className="p-3 text-xs text-slate-300">{req.issue_description}</td>
                      <td className="p-3">
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-semibold ${
                            req.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : req.status === 'in_progress'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-slate-400">
                        {new Date(req.created_at).toLocaleDateString('tr-TR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}