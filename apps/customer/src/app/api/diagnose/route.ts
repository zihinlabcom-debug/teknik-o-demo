import { NextResponse } from 'next/server';
import { normalizeHistory } from '@/lib/diagnosis';
import { diagnoseService } from '@/lib/service-conversation';
import { currentAccount } from '@/lib/account-supabase';

export const maxDuration = 180;

export async function POST(req: Request) {
  const account = await currentAccount();
  if (!account) {
    return NextResponse.json({ error: 'Bu işlem için aktif oturum gerekli.' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Geçerli JSON gönderilmelidir.' }, { status: 400 });
  }
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!message || message.length > 6000) {
    return NextResponse.json({ error: 'Mesaj 1–6000 karakter olmalıdır.' }, { status: 400 });
  }
  const history = normalizeHistory(body.chatHistory ?? body.history ?? body.messages);
  if (history.at(-1)?.role === 'user' && history.at(-1)?.content === message) history.pop();
  try {
    return NextResponse.json(await diagnoseService(message, history, body.stateToken, {
      category: body.category, categorySelected: body.categorySelected === true,
      conversationToken: body.conversationToken, turnId: body.turnId,
      customerId: account.id,
    }), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('AI teşhis hatası:', error);
    return NextResponse.json({ error: 'Teşhis hizmetine ulaşılamadı. Lütfen yeniden deneyin.',
      isReadyForPrice: false, estimatedPrice: null, priceSource: null }, { status: 503 });
  }
}
