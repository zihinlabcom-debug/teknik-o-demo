import { NextResponse } from 'next/server';
import { diagnose, normalizeHistory } from '@/lib/diagnosis';

export const maxDuration = 180;

export async function POST(req: Request) {
  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Geçerli JSON gönderilmelidir.' }, { status: 400 });
  }
  const rawMessage = body?.userMessage ?? body?.message;
  const message = typeof rawMessage === 'string' ? rawMessage.trim() : '';
  if (!message || message.length > 6000) {
    return NextResponse.json({ error: 'Mesaj 1–6000 karakter olmalıdır.' }, { status: 400 });
  }
  const history = normalizeHistory(body.history ?? body.messages);
  if (history.at(-1)?.role === 'user' && history.at(-1)?.content === message) history.pop();
  try {
    const result = await diagnose(message, history, body.stateToken);
    return NextResponse.json({
      replyMessage: result.aiText,
      researchStatus: result.researchStatus,
      stateToken: result.stateToken,
      informationProgress: result.informationProgress,
      assessmentComplete: result.assessmentComplete,
      candidateProbabilities: result.candidateProbabilities,
      diagnosticEvidence: result.assessmentComplete ? result.diagnosticEvidence : [],
      technicalSource: result.technicalSource,
      diagnosticStatus: result.diagnosticStatus,
      currentConfidenceScore: result.confidence,
      isDiagnosisComplete: result.isReadyForPrice,
      diagnosisDetails: result.isReadyForPrice ? {
        primaryFault: result.faultTitle, basePartPrice: result.basePartPrice,
        estimatedCost: result.deterministicOMF?.breakdown.total,
      } : null,
      deterministicOMF: result.deterministicOMF,
      pricingStatus: result.pricingStatus,
      priceSource: result.priceSource,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Teşhis hatası:', error);
    return NextResponse.json({ error: 'Teşhis hizmetine ulaşılamadı. Lütfen yeniden deneyin.' }, { status: 503 });
  }
}
