import {TechnicianProfileForm} from '@/components/technician-profile-form';
import {PanelHeading} from '@/components/operation-panel';
import {getTechnicianProfile} from '@/lib/profile-server';

export const dynamic='force-dynamic';

export default async function TechnicianProfilePage(){
  return <><PanelHeading title="Profil ve hizmet alanları" description="Hesap bilgilerinizi, hizmet bölgelerinizi, kategorilerinizi ve mesleki belgelerinizi yönetin."/><TechnicianProfileForm data={await getTechnicianProfile()}/></>;
}
