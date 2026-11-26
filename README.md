# Mert AI

Gemini destekli, Türkçe arayüzlü bir sohbet sitesi. Vercel'de yayınlanmak üzere hazırlanmıştır. Next.js veya yerel Node.js kurulumu gerekmez.

## Dosyalar

- `index.html`, `styles.css`, `app.js`: sohbet ekranı ve tarayıcı tarafı
- `api/chat.js`: Gemini API'ye sunucu tarafından güvenli istek gönderir
- `api/login.js`: isteğe bağlı site şifresi girişi
- `lib/security.js`: isteğe bağlı giriş oturumu kontrolü

## Vercel'e yayınlama

1. Bu klasörün içindeki dosyaları GitHub'da yeni bir repository'ye yükle. Klasör yapısı korunmalı; `api` ve `lib` klasörleri de yüklenmeli.
2. Vercel Dashboard → **Add New → Project** bölümüne gir.
3. GitHub repository'sinin yanındaki **Import** seçeneğine bas.
4. Framework Preset alanında **Other** seç. Build Command ve Output Directory alanlarını boş bırakıp Deploy'a bas.
5. Proje açılınca **Settings → Environment Variables** bölümüne gir ve şu değişkeni ekle:
   - `GEMINI_API_KEY` = Google AI Studio'dan aldığın yeni API anahtarı
6. Yalnızca arkadaşının şifreyle girmesini istiyorsan ayrıca şunu ekle:
   - `SITE_PASSWORD` = Mert'in kullanacağı giriş şifresi (API anahtarın DEĞİL)
7. **Deployments** bölümünden son dağıtımı yeniden Deploy et. Environment Variable değişiklikleri yeni dağıtımda etkin olur.

`SITE_PASSWORD` eklenmezse siteye bağlantısı olan herkes sohbet ekranını açabilir. API anahtarı yine sunucu tarafında gizli kalır.

## Önemli güvenlik notları

- Gemini anahtarını asla `index.html`, `app.js` veya GitHub dosyalarına yazma.
- API anahtarı yalnızca Vercel'deki `GEMINI_API_KEY` Environment Variable alanında bulunmalı.
- API anahtarı daha önce yanlışlıkla paylaşıldıysa Google AI Studio'dan iptal edilip yenisi oluşturulmalıdır.
- Bu örnek Gemini Interactions API'sini `store: false` ile çağırır. Sohbet geçmişi kullanıcı tarayıcısında tutulur; Google tarafında kalıcı etkileşim geçmişi saklanması istenmez.
- Gemini API kullanımında Google hesabının kota ve ücret koşulları geçerlidir.

## Kullanılan Gemini modeli

`gemini-3.8-flash` — model adı sunucu tarafındaki `api/chat.js` dosyasında bulunur.
