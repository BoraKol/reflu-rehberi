# ReflüRehber

**Klasik Reflü (GERD) ve Sessiz Reflü (LPR) için Klinik Kılavuz Odaklı, Halüsinasyonsuz Kişisel Takip Rehberi**

ReflüRehber; mide yanması/ekşimesi gibi klasik reflü (**GERD**) belirtileri ile ses kısıklığı, boğazda gıcık, sık boğaz temizleme ve geniz akıntısı gibi sessiz reflü (**LPR**) belirtilerini birlikte takip etmeyi kolaylaştıran, genel klinik uzlaşıyı kişisel gözlemlerden şeffaf biçimde ayıran modern bir web uygulamasıdır.

> **Tıbbi Bilgilendirme Notu:** ReflüRehber tıbbi tavsiye, teşhis veya tedavi önerisi sunmaz. Yalnızca kişisel öğün, alışkanlık ve belirti gözlemlerinizi düzenli tutmanız ve hekim görüşmelerinize hazırlanmanız için geliştirilmiş bir takip günlüğüdür.

---

## Öne Çıkan Özellikler

- **Bugün & 7 Günlük Ritim Haritası**
  - Günlük takip serisi, haftalık aktiflik halkası, keşif adımları ve tek dokunuşla günlük his işaretleme.
  - **7 Günlük GERD vs. LPR Mini Grafik**: Mide ve boğaz eksenlerinin son 7 günlük yoğunluk eğilimi.
  - **Yemek–Uyku Kalkanı (3 veya 4 Saat Zamanlayıcı)**: Son öğün saatine göre güvenli yatış saatini hesaplar; 30 dk kala, 15 dk kala ve hedef saat dolduğunda tarayıcı + uygulama içi bildirim verir.
- **Hızlı Kayıt & Deterministik Kırmızı Bayrak Koruması**
  - Doğal Türkçe metin veya öğün fotoğrafı ile hızlı ayrıştırma (sunucu tarafı Gemini JSON ayrıştırıcı + tam **çevrimdışı Türkçe sözlük** yedeklemesi).
  - Kaydetmeden önce her besin ve belirtinin (1–5 şiddet) kullanıcı tarafından onaylanıp düzenlenebildiği şeffaf önizleme akışı.
  - Göğüs ağrısı, nefes darlığı, kanlı kusma, yutma güçlüğü (disfaji) gibi alarm ifadeleri için deterministik **Red Flag Guard** uyarısı.
- **Belirti Değerlendirme (RSI & Haftalık GERD)**
  - 9 maddelik Belafsky **Reflü Semptom İndeksi (RSI)** ve 6 maddelik haftalık **GERD** sıklık değerlendirmesi ile iki eksenli semptom profili (`LPR_DOMINANT`, `GERD_DOMINANT`, `MIXED`, `LOW_SYMPTOM`).
- **Doğrulanmış Besin Rehberi & Paketli Ürün Etiket Kontrolü**
  - 60+ Türkçe besin için asitlik kategorisi, fizyolojik mekanizma ve LPR özel notları (uydurma pH rakamları içermez, listede olmayan besinler için tahmin üretmez).
  - **Open Food Facts** entegrasyonu ile ürün adı veya barkod üzerinden gerçek içindekiler metni tarama (sitrik asit/E330, domates salçası, kafein, kakao, nane, kapsaisin, sirke, karbondioksit ve yüksek yağ `>17.5 g / 100 g` vurgusu).
- **Kişisel Tetikleyici Dedektifi**
  - Tek geçişli `O(N)` korelasyon motoru ve **Minimum Örneklem Koruması** (en az 3 tekrar olmadan tesadüfi çıkarım yapmaz).
  - Etkileşimli **GERD vs. LPR Zaman Grafiği** (30 günlük kayan görünürlük penceresi) ve **Yemek Saati – Belirti Zaman Çizgisi** (scatter grafiği).
  - `< 3 saat` vs. `≥ 3 saat` yemek–uyku aralığı karşılaştırması.
- **Tek Sayfalık A4 Doktor Raporu & Yerel JSON Yedekleme**
  - A4 yazdırma ve PDF dışa aktarımına uygun hekim görüşmesi özeti.
  - Kullanıcı kontrolünde yerel JSON yedek indirme.
- **Erişilebilirlik & Çoklu Cihaz Uyumu**
  - WCAG AAA kontrastlı **Okunabilirlik Modu**, ekran okuyucu / klavye desteği ve 320px küçük telefonlardan masaüstüne tam duyarlı (safe-area uyumlu) arayüz.

---

## Mimari ve Teknoloji Yığını

| Katman | Teknoloji / Yapı |
| --- | --- |
| **Arayüz** | React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Recharts |
| **Derleme** | Vite 8 (rota bazlı `React.lazy` + vendor chunk ayrımı) |
| **Sunucu** | Express 4 (güvenli `/api/parse-log` proxy, statik dağıtım) |
| **Kimlik & Veri** | Firebase Authentication (E-posta/Şifre + Google), Cloud Firestore |
| **Yapay Zeka (Opsiyonel)** | Google GenAI (`gemini-2.5-flash` yalnızca yapılandırılmış JSON çıkarımı) |
| **Test** | Node Test Runner (`tsx --test`) |

```text
├── server.ts                  # Güvenlik başlıkları, Origin/Rate-Limit korumalı API & SPA sunucusu
├── firestore.rules            # Varsayılan-red (default-deny), kullanıcı izolasyonlu Firestore kuralları
├── src/
│   ├── App.tsx                # Yalın kompozisyon kökü & lazy route yönetimi
│   ├── firebase.ts            # Ortam değişkeni tabanlı Firebase istemci yapılandırması
│   ├── engine/                # Saf iş mantığı (korelasyon, kırmızı bayrak, tetikleyici, grafik penceresi)
│   ├── data/                  # Doğrulanmış Türkçe besin kataloğu, bilgi kartları, geçici demo verisi
│   ├── services/              # Firestore repository & mapper'lar, Gemini parser istemcisi, OpenFoodFacts
│   ├── hooks/                 # Oturum, sağlık verisi, uyku kalkanı, okunabilirlik, modal & viewport hook'ları
│   ├── lib/                   # Paylaşılan saf yardımcılar (Türkçe normalizasyon, zaman, güvenli ID, sayı)
│   └── components/            # Modüler UI görünümleri, layout kabuğu ve ortak UI bileşenleri
```

---

## Gizlilik ve Güvenlik Mimarisi

- **Tarayıcıda Sıfır Sağlık Verisi**: Kişisel sağlık kayıtları `localStorage` veya `sessionStorage` içine asla yazılmaz; açılışta ve oturum kapatıldığında bellek ve eski anahtarlar temizlenir.
- **Katı Hesap İzolasyonu ([firestore.rules](firestore.rules))**: Tüm okuma/yazma işlemleri yalnızca e-posta adresi doğrulanmış (`email_verified == true`) kullanıcıya kendi `uid` alanı altında açılır; şema beyaz listesi (`hasOnly`), boyut limitleri ve sunucu zaman damgası (`request.time`) zorunludur.
- **Sunucu Tarafı API Koruması ([server.ts](server.ts))**:
  - `GEMINI_API_KEY` yalnızca sunucu ortamında tutulur, istemci paketine asla girmez.
  - `/api/parse-log` uç noktasında aynı köken (`Origin`/`Referer`) ve `application/json` doğrulaması, IP bazlı sliding-window rate limiter (20 istek/dk), yüklenen görsellerde JPEG/PNG/WebP **magic-byte** doğrulaması ve zaman aşımı uygulanır.
  - Güvenlik başlıkları (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `COOP`, üretimde `HSTS`) varsayılan olarak etkindir.
- **Güvenli Hata Yönetimi**: Üretim ortamında konsola veya kullanıcı arayüzüne PII (e-posta, uid) veya ham hata yığınları sızdırılmaz.

---

## Yerel Kurulum ve Çalıştırma

### Gereksinimler
- Node.js **20+** (önerilen: Node 22)
- npm

### 1. Bağımlılıkları Yükleyin
```bash
npm install
```

### 2. Ortam Değişkenlerini Yapılandırın
`.env.example` dosyasını `.env.local` olarak kopyalayıp kendi değerlerinizi doldurun:

```bash
cp .env.example .env.local
```

> Firebase yapılandırmasını henüz girmeden de uygulamayı başlatıp **14 Günlük Örnek Önizle** modu ile tüm ekranları inceleyebilirsiniz. `GEMINI_API_KEY` tanımlı değilse Hızlı Kayıt otomatik olarak **çevrimdışı Türkçe yerel ayrıştırıcı** ile çalışır.

### 3. Geliştirme Sunucusunu Başlatın
```bash
npm run dev
```
Uygulama varsayılan olarak `http://localhost:3000` adresinde çalışır.

---

## Komutlar

| Komut | Açıklama |
| --- | --- |
| `npm run dev` | Express + Vite geliştirme sunucusunu başlatır |
| `npm run build` | Üretim istemci paketini `dist/` klasörüne derler |
| `npm start` | Üretim sunucusunu başlatır (`NODE_ENV=production` ile) |
| `npm test` | Motor ve yardımcı birim testlerini çalıştırır |
| `npm run lint` | TypeScript tip kontrolünü (`tsc --noEmit`) çalıştırır |

---

## Üretime Alma (Deploy) Kontrol Listesi

1. **Google Cloud Console → Credentials → Firebase Web API Key**:
   - *Application restrictions* bölümünden **HTTP referrers** kısıtlaması ekleyin (yalnızca kendi domain'iniz).
   - *API restrictions* bölümünden anahtarı yalnızca kullandığınız Firebase API'leriyle sınırlandırın.
2. **Firestore Güvenlik Kuralları**:
   - `firestore.rules` dosyasını Firebase projenize deploy edin (`firebase deploy --only firestore:rules`).
3. **Ortam Değişkenleri**:
   - `NODE_ENV=production`, `APP_URL=https://alanadiniz.com`, `GEMINI_API_KEY` ve `VITE_FIREBASE_*` değişkenlerini yalnızca barındırma sağlayıcınızın gizli değişken (Secrets/Env) panelinde tanımlayın.
