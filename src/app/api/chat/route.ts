import { NextResponse } from 'next/server';
import { normalizeHistory } from '@/lib/diagnosis';
import { diagnoseService } from '@/lib/service-conversation';

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
    const result = await diagnoseService(message, history, body.stateToken, {
      category: body.category, categorySelected: body.categorySelected === true,
      conversationToken: body.conversationToken, turnId: body.turnId,
    });
    return NextResponse.json({
      ...result,
      replyMessage: result.aiText,
      category: result.category,
      categoryState: result.categoryState,
      conversationToken: result.conversationToken,
      answeredSystemQuestions: result.answeredSystemQuestions,
      visualProgress: result.visualProgress,
      questionCount: result.questionCount,
      awaitingAnswer: result.awaitingAnswer,
      groupProbabilities: result.groupProbabilities,
      estimatedPrice: result.estimatedPrice,
      resultState: 'resultState' in result ? result.resultState : null,
      canRouteTechnician: 'canRouteTechnician' in result ? result.canRouteTechnician : false,
      pricingData: 'pricingData' in result ? result.pricingData : null,
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
