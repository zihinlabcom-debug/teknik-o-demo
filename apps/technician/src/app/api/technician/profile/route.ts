import {NextResponse} from 'next/server';
import {beginPasswordChange,beginPhoneChange,confirmPasswordChange,confirmPhoneChange} from '@/lib/account-password';
import {addTechnicianCategory,updateTechnicianProfile} from '@/lib/profile-server';
import {operationErrorResponse} from '@/lib/operation-server';

export async function POST(request:Request){
  try{
    const body=await request.json().catch(()=>null);
    if(!body||typeof body!=='object')return NextResponse.json({error:'Geçersiz istek.'},{status:400});
    let result;
    switch(body.action){
      case 'update':result=await updateTechnicianProfile(body);break;
      case 'add-category':result=await addTechnicianCategory(body.categoryId,body.currentPassword);break;
      case 'phone-start':result=await beginPhoneChange(body.phone,body.currentPassword,'technician');break;
      case 'phone-confirm':result=await confirmPhoneChange(body.phone,body.token,'technician');break;
      case 'password-start':result=await beginPasswordChange('technician');break;
      case 'password-confirm':result=await confirmPasswordChange(body.password,body.token,'technician');break;
      default:return NextResponse.json({error:'Geçersiz işlem.'},{status:400});
    }
    return NextResponse.json(result,{status:result.ok?200:400,headers:{'Cache-Control':'no-store'}});
  }catch(error){
    const result=operationErrorResponse(error);
    return NextResponse.json(result.body,{status:result.status,headers:{'Cache-Control':'no-store'}});
  }
}
