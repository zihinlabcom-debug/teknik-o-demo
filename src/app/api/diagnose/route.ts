import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { message, chatHistory } = await req.json();

    // Sohbet geçmişindeki yapay zekâ mesaj sayısını hesaplayalım (soru sınırı için)
    const assistantTurnCount = Array.isArray(chatHistory) 
      ? chatHistory.filter((m: any) => m.role === 'assistant' || m.sender === 'ai' || m.type === 'ai').length 
      : 0;

    const prompt = `
Sen "Teknik-O" adlı profesyonel, güvenilir ve akıllı bir ev bakım ve arıza teşhis yapay zekasısın.
Şu ana kadar sorulan soru/yanıt sayısı: ${assistantTurnCount} (Maksimum sınır: 10 soru).

Kuralların:
1. Soruları müşteriye kesinlikle tek tek sor, asla birleşik veya birden fazla soru içeren cümleler kurma.
2. Kombi gibi markanın önemli olduğu kategorilerde ilk olarak cihazın markasını sor.
3. KESİN KURAL: Aşağıdaki "Geçmiş Sohbet" geçmişini incele. Daha önce sorduğun soruları ve kullanıcının verdiği yanıtları kontrol et. Kesinlikle ama kesinlikle daha önce sorduğun bir soruyu bir daha sorma. Kullanıcı hangi bilgiyi verdiyse onu hafızanda tut ve sürekli yeni bir adım veya soru ile ilerle.
4. Her cevapta arıza olasılıklarını güncelleyip belirsizliği en çok azaltacak sonraki tek soruyu seç.
5. Maksimum soru sınırı 10'dur. Eğer soru sayısı 10'a ulaştıysa ve güven ("confidence") hâlâ %75'in altındaysa, daha fazla soru sorma, teşhiri sonlandır; "belirsizFiyat" alanını true yap, estimatedPrice'ı null yap ve aiText içinde müşteriye ustanın yerinde inceleme yaparak fiyat belirleyeceğini kibarca bildir.
6. Soru sayısı 10'un altındayken güven %75'in altında kalırsa fiyat verme (estimatedPrice: null), tek bir ek soru sorarak arızayı netleştir.
7. Güven %75 ve üzerindeyse tahmini tek fiyat sun, belirsizFiyat alanını false yap.

Geçmiş Sohbet:
${JSON.stringify(chatHistory || [])}

Kullanıcının Son Mesajı: "${message}"

Lütfen sadece geçerli bir JSON objesi döndür. Markdown blokları (\`\`\`json ...) veya başka hiçbir açıklama metni ekleme. Kesinlikle şu formatta yanıt ver:
{
  "aiText": "Kullanıcıya vereceğin tek ve net yanıt veya soru",
  "confidence": 45,
  "estimatedPrice": null,
  "belirsizFiyat": false
}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash', // Sizin tercih ettiğiniz orijinal isim birebir duruyor
      contents: prompt,
    });

    const textResponse = response.text || '';
    
    // Markdown bloklarını ve olası ekstra karakterleri temizle
    const cleanJson = textResponse
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const jsonStart = cleanJson.indexOf('{');
    const jsonEnd = cleanJson.lastIndexOf('}');
    
    let resultData;
    if (jsonStart !== -1 && jsonEnd !== -1) {
      const jsonString = cleanJson.substring(jsonStart, jsonEnd + 1);
      resultData = JSON.parse(jsonString);
    } else {
      resultData = {
        aiText: cleanJson || 'Arızanızı aldım, cihazınızın markasını öğrenebilir miyim?',
        confidence: 40,
        estimatedPrice: null,
        belirsizFiyat: false
      };
    }

    const finalConfidence = typeof resultData.confidence === 'number' ? resultData.confidence : 35;
    
    // 10 soru dolmuş ve güven hâlâ %75 altındaysa kesinlikle belirsiz fiyat aktif olur
    const isBelirsiz = (assistantTurnCount >= 10 && finalConfidence < 75) || resultData.belirsizFiyat === true;

    return NextResponse.json({
      aiText: resultData.aiText || 'Yanıt alınamadı.',
      confidence: finalConfidence,
      estimatedPrice: (!isBelirsiz && finalConfidence >= 75) ? (resultData.estimatedPrice || null) : null,
      belirsizFiyat: isBelirsiz
    });

  } catch (error) {
    // BURASI ÇOK ÖNEMLİ: Gerçek hatanın ne olduğunu görmek için konsola yazdırıyoruz
    console.error('AI Teşhis Detaylı Hata:', error);
    
    return NextResponse.json(
      { 
        aiText: 'Anlayamadım, lütfen cihazınızın markasını ve arızanızı biraz daha açıklar mısınız?', 
        confidence: 30, 
        estimatedPrice: null,
        belirsizFiyat: false
      }, 
      { status: 200 }
    );
  }
}