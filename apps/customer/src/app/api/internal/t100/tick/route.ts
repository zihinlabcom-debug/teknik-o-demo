import {timingSafeEqual} from 'node:crypto';import {adminSupabase} from '@/lib/account-supabase';
import {runT100Tick} from '../../../../../../../../src/lib/t100-service-server';
export async function POST(request:Request){
 const secret=process.env.CRON_SECRET;
 if(!secret)return Response.json({error:'Worker yapılandırılmadı.'},{status:503});
 const received=Buffer.from(request.headers.get('authorization')??''),expected=Buffer.from('Bearer '+secret);
 if(received.length!==expected.length||!timingSafeEqual(received,expected))return Response.json({error:'Yetkisiz.'},{status:403});
 try{return Response.json(await runT100Tick(adminSupabase()),{headers:{'Cache-Control':'no-store'}});}
 catch{return Response.json({error:'Sonuçlandırma kuyruğu işlenemedi.'},{status:503});}
}
