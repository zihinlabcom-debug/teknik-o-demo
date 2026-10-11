import {authorizeAndReleaseFakePayment} from '@/lib/finance/sandbox-finance-server';
import {handleFakeAuthorization} from '@/lib/finance/fake-authorization-handler';

export async function POST(req:Request){
  return handleFakeAuthorization(req,authorizeAndReleaseFakePayment);
}
