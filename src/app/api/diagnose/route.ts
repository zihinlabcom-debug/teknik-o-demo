import { NextResponse } from 'next/server';
import { diagnose, normalizeHistory } from '@/lib/diagnosis';

export const maxDuration = 180;

export async function POST(req: Request) {
  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Geçerli JSON gönderilmelidir.' }, { status: 400 });
  }
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!message || message.length > 6000) {
    return NextResponse.json({ error: 'Mesaj 1–6000 karakter olmalıdır.' }, { status: 400 });
  }
  const history = normalizeHistory(body.chatHistory);
  // Compatibility with clients that include the current message in history.
  if (history.at(-1)?.role === 'user' && history.at(-1)?.content === message) history.pop();
  try {
    return NextResponse.json(await diagnose(message, history, body.stateToken), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('AI teşhis hatası:', error);
    return NextResponse.json({ error: 'Teşhis hizmetine ulaşılamadı. Lütfen yeniden deneyin.',
      isReadyForPrice: false, estimatedPrice: null, priceSource: null }, { status: 503 });
  }
}
