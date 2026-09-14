import { GoogleGenAI, Type, Schema } from '@google/genai';
import { NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

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
    if (!ai) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY ortam değişkeni (env) tanımlı değil.' },
        { status: 500 }
      );
    }

    const { history = [], userMessage } = await req.json();

    if (!userMessage) {
      return NextResponse.json(
        { error: 'Mesaj alanı boş olamaz.' },
        { status: 400 }
      );
    }

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

    // History verisini formatla
    const formattedHistory = history.map((item: { role: string; text: unknown }) => ({
      role: item.role === 'assistant' ? 'model' : item.role,
      parts: [
        {
          text: typeof item.text === 'object' ? JSON.stringify(item.text) : String(item.text),
        },
      ],
    }));

    // İçerik dizisini oluştur (Son kullanıcı mesajı en sona eklenir)
    const contents = [
      ...formattedHistory,
      { role: 'user', parts: [{ text: userMessage }] },
    ];

    // Model çağrısı: model ismi 'gemini-1.5-flash' olarak güncellendi
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents,
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

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.';
    console.error('Teknik-O Teşhis Motoru Hatası:', error);

    return NextResponse.json(
      { error: 'Teşhis motoru yanıt veremedi.', details: errorMessage },
      { status: 500 }
    );
  }
}