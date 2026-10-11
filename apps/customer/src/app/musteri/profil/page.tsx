import {CustomerProfileForm} from '@/components/customer-profile-form';
import {getCustomerProfile} from '@/lib/profile-server';

export const dynamic='force-dynamic';

export default async function CustomerProfilePage(){
  return <CustomerProfileForm profile={await getCustomerProfile()}/>;
}
