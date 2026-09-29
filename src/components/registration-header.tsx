import Image from 'next/image';
export function RegistrationHeader(){
  return <div className="text-center mb-6">
    <div className="flex items-center justify-center gap-3">
      <Image src="/logo-icon.png" alt="Teknik-O logo" width={48} height={48} className="w-12 h-12 object-contain" />
      <h1 className="text-2xl font-extrabold text-slate-900">TEKNİK<span className="text-[#D97724]">-O</span></h1>
    </div>
    <h2 className="text-sm font-semibold text-slate-700 mt-2">Müşteri Kaydı</h2>
    <p className="text-xs text-slate-500 mt-1">Arıza ve servis hizmeti almak için kayıt oluşturun.</p>
  </div>;
}
