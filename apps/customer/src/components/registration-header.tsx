import {TeknikOBrand} from './brand/teknik-o-brand';
export function RegistrationHeader(){
  return <div className="text-center mb-6">
    <h1><TeknikOBrand size="standard" /></h1>
    <h2 className="text-sm font-semibold text-slate-700 mt-2">Müşteri Kaydı</h2>
    <p className="text-xs text-slate-500 mt-1">Arıza ve servis hizmeti almak için kayıt oluşturun.</p>
  </div>;
}
