import {TechnicianProfileForm} from '@/components/technician-profile-form';
import {getTechnicianProfile} from '@/lib/profile-server';

export const dynamic='force-dynamic';

export default async function TechnicianProfilePage(){
  return <TechnicianProfileForm data={await getTechnicianProfile()}/>;
}
