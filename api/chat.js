import { hasValidSession, isSitePasswordEnabled } from "../lib/security.js";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const MODEL = "gemini-3.8-flash";
const SYSTEM_INSTRUCTION = "Sen Mert AI'sın. Kullanıcıyla Türkçe, samimi, saygılı ve anlaşılır konuş. Kullanıcı başka bir dilde yazarsa o dilde cevap ver. Sorulara doğru ve faydalı cevaplar vermeye çalış; emin olmadığın konularda bunu açıkça belirt. Yaşa uygun, güvenli ve nazik bir yardımcı ol. Gereksiz uzun cevaplar verme; kullanıcı ayrıntı isterse ayrıntılandır. Kendini Mert AI olarak tanıt.";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Sadece POST isteği kullanılabilir." });
  }

  if (isSitePasswordEnabled() && !hasValidSession(req)) {
    return res.status(401).json({ error: "Sohbete devam etmek için önce giriş yapmalısın." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Gemini API anahtarı sunucuda ayarlanmamış. Vercel'de GEMINI_API_KEY değişkenini ekle." });
  }

  const input = req.body && req.body.input;
  if (!(typeof input === "string" || (Array.isArray(input) && input.length > 0 && input.length <= 48))) {
    return res.status(400).json({ error: "Mesaj geçmişi geçersiz. Yeni bir sohbet başlatmayı dene." });
  }

  if (JSON.stringify(input).length > 60000) {
    return res.status(413).json({ error: "Bu sohbetin geçmişi çok uzun. Yeni sohbet başlatabilirsin." });
  }

  try {
    const googleResponse = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        model: MODEL,
        input,
        store: false,
        system_instruction: SYSTEM_INSTRUCTION
      })
    });

    const result = await googleResponse.json();
    if (!googleResponse.ok) {
      const googleMessage = result && result.error && result.error.message;
      console.error("Gemini API error:", googleResponse.status, googleMessage || "No error message");
      if (googleResponse.status === 429) {
        return res.status(429).json({ error: "Gemini kullanım sınırına ulaşıldı. Biraz bekleyip tekrar dene." });
      }
      if (googleResponse.status === 401 || googleResponse.status === 403) {
        return res.status(502).json({ error: "Gemini API anahtarı geçersiz veya bu model için yetkili değil. Vercel'deki GEMINI_API_KEY değerini kontrol et." });
      }
      return res.status(502).json({ error: "Gemini şu anda yanıt veremedi. Biraz sonra tekrar dene." });
    }

    const steps = Array.isArray(result.steps) ? result.steps : [];
    const text = steps
      .filter((step) => step && step.type === "model_output" && Array.isArray(step.content))
      .flatMap((step) => step.content)
      .filter((part) => part && part.type === "text" && typeof part.text === "string")
      .map((part) => part.text)
      .join("\n")
      .trim();

    if (!text) {
      return res.status(502).json({ error: "Gemini boş bir yanıt verdi. Başka bir mesaj göndermeyi dene." });
    }

    return res.status(200).json({ text, steps });
  } catch (error) {
    console.error("Chat function error:", error);
    return res.status(500).json({ error: "Sunucuya bağlanırken sorun oluştu. Tekrar dene." });
  }
}
