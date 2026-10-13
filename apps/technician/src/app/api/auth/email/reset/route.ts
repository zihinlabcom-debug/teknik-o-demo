import {emailAuthPost} from '@/lib/email-auth-route';
export async function POST(request:Request){return emailAuthPost(request,'technician','reset');}
