import { GoogleGenAI, Type, Schema } from '@google/genai';
import { NextResponse } from 'next/server';

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY 
});

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    replyMessage: {
      type: Type.STRING,
      description: 'Müşteriye sorulacak yönlendirici soru veya son açıklama mesajı.',
    },
    currentConfidenceScore: {
      type: Type.INTEGER,
      description: 'Arıza teşhisinin ne kadar netleştiğini belirten %0 - %100 arası güven skoru.',
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
    const { history, userMessage } = await req.json();

    const systemInstruction = `
Sen Teknik-O platformunun yapay zekâlı teknik teşhis asistanısın. 
Görevin, kullanıcının evindeki veya iş yerindeki teknik arızayı (Kombi, Klima, Tesisat, Elektrik, Beyaz Eşya vb.) mantıklı, spesifik ve dinamik sorular sorarak teşhis etmektir.

KURALLAR:
1. Kullanıcının verdiği her bilgiye göre arızayı daraltacak spesifik ve teknik açıdan mantıklı TEK BİR SORU sor.
2. Kullanıcının verdiği detaylara göre arıza teşhis güven skorunu (%0 - %100) güncelle.
3. İlk mesajlarda güven skoru düşük başlasın (%20 - %40). Sorularına yanıt aldıkça ve durum netleştikçe skoru artır.
4. Güven skoru %75 veya üzerine çıktığında "isDiagnosisComplete": true yap ve "diagnosisDetails" nesnesini (kesinleşen arıza adı ve gerçekçi TL cinsinden maliyeti) doldur.
5. Aşırı genel sorular sorma. Cihazın markası, ekrandaki hata kodları, sesler, sızıntılar veya göstergeler gibi spesifik detayları sorgula.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [
        ...history,
        { role: 'user', parts: [{ text: userMessage }] }
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema,
        temperature: 0.2,
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error('Gemini API boş yanıt döndürdü.');
    }

    const parsedData = JSON.parse(resultText);
    return NextResponse.json(parsedData);

  } catch (error: any) {
    console.error('Gemini API Hatası:', error);
    return NextResponse.json(
      { error: 'Teşhis motoru yanıt veremedi.', details: error.message },
      { status: 500 }
    );
  }
}