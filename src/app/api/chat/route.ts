import { GoogleGenAI, Type, Schema } from '@google/genai';
import { NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    replyMessage: {
      type: Type.STRING,
      description: 'Müşteriye verilecek yanıt, yönlendirici teknik soru veya açıklama. ASLA "Anlayamadım" kelimesini kullanma. Kullanıcının verdiği her kelimeyi (marka, belirti vb.) kabul et ve bir sonraki teknik soruya geç.',
    },
    currentConfidenceScore: {
      type: Type.INTEGER,
      description: 'Arıza teşhisinin netleşme oranı (%0 - %100). Kullanıcı her detay verdiğinde skoru artır (%40, %60, %85 gibi).',
    },
    isDiagnosisComplete: {
      type: Type.BOOLEAN,
      description: 'Güven skoru %75 ve üzerine ulaştığında true olmalıdır.',
    },
    diagnosisDetails: {
      type: Type.OBJECT,
      description: 'Eğer isDiagnosisComplete true ise doldurulacak arıza ve maliyet bilgisi.',
      properties: {
        primaryFault: {
          type: Type.STRING,
          description: 'Tespit edilen en olası arıza veya parça değişimi başlığı.',
        },
        estimatedCost: {
          type: Type.INTEGER,
          description: 'Tahmini işçilik ve parça dahil toplam tamir tutarı (TL cinsinden).',
        },
      },
    },
  },
  required: ['replyMessage', 'currentConfidenceScore', 'isDiagnosisComplete'],
};

export async function POST(req: Request) {
  try {
    if (!ai) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY ortam değişkeni tanımlı değil.' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const history = body.history || body.messages || [];
    const userMessage = body.userMessage || body.message;

    if (!userMessage) {
      return NextResponse.json(
        { error: 'Mesaj alanı boş olamaz.' },
        { status: 400 }
      );
    }

    const systemInstruction = `
Sen Teknik-O platformunun uzman yapay zekâlı teknik teşhis asistanısın. 
Görevin, ev veya işyeri arızalarını (Kombi, Klima, Tesisat vb.) adım adım akıllı sorularla çözmektir.

KESİN KURALLAR:
1. ASLA "Anlayamadım", "Lütfen tekrar edin" veya "Sorunuzu anlamadım" gibi ifadeler KULLANMA. Kullanıcının yazdığı her şeyi (kısa bile olsa) doğru kabul et ve bağlama dahil et.
2. Kullanıcı marka veya parça ismi verdiyse (Örn: "Demirdöküm nitromix" veya "Kısa süre çalışıyor"), bunu hafızanda tut ve bir sonraki mantıksal teknik soruya geç (Örn: Ekran yanıp sönüyor mu, hata kodu nedir?).
3. Güven skorunu kullanıcı her mesaj yazdığında artır. %75'e ulaştığında teşhisi tamamla.
`;

    const formattedHistory = history
      .filter((item: { role: string; content?: string; text?: string }) => {
        const role = item.role;
        return (role === 'user' || role === 'assistant' || role === 'model') && (item.content || item.text || (item as any).parts);
      })
      .map((item: { role: string; content?: string; text?: string; parts?: any }) => {
        let textContent = '';
        if (item.parts && Array.isArray(item.parts)) {
          textContent = item.parts.map((p: any) => p.text).join(' ');
        } else {
          textContent = String(item.content || item.text || '');
        }

        return {
          role: item.role === 'assistant' ? 'model' : item.role,
          parts: [{ text: textContent }],
        };
      });

    const contents = [
      ...formattedHistory,
      { role: 'user', parts: [{ text: userMessage }] },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema,
        temperature: 0.5,
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error('Gemini API boş yanıt döndürdü.');
    }

    const parsedData = JSON.parse(resultText);
    return NextResponse.json(parsedData);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.';
    console.error('Teknik-O Teşhis Motoru Hatası:', error);

    return NextResponse.json(
      { error: 'Teşhis motoru yanıt veremedi.', details: errorMessage },
      { status: 500 }
    );
  }
}