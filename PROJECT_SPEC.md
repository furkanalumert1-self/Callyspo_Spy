# Proje: AdSpy — Facebook Reklam → Amazon Ürün Eşleştirme SaaS

## 1. Amaç ve Özet

Bu proje, Facebook Ads Library'de reklamı yapılan ürünleri otomatik olarak bulup, aynı ürünün Amazon'da satılıp satılmadığını (fiyat, rating, link dahil) tespit eden bir **SaaS platformu**dur.

Referans olarak elimde bir n8n workflow'u var; bu proje o workflow'un mantığını **tamamen kod tabanlı bir uygulamaya** (n8n bağımlılığı olmadan) taşıyor. n8n'deki tüm node'lar gerçek backend kodu, kuyruk (queue) işleri ve API entegrasyonlarına dönüştürülecek.

Hedef kitle: dropshipping yapanlar, Amazon FBA satıcıları, e-ticaret ajansları. Kullanıcı bir anahtar kelime/niş girer, sistem arka planda arama yapar ve sonuçları bir panelde listeler.

---

## 2. Orijinal İş Mantığı (n8n'den taşınacak akış)

Bu adımlar birebir backend'de bir "pipeline" olarak kodlanmalı:

1. **Kullanıcı arama başlatır** → `keyword` (örn: "portable blender") ve opsiyonel ülke/durum filtreleri (`country`, `active_status`) alınır.
2. **Facebook Ads Library araması** → Apify aktörü `curious_coder~facebook-ads-library-scraper` çalıştırılır.
   - İstek gövdesi: `{ count, scrapeAdDetails: true, "scrapePageAds.activeStatus": "all", urls: [{ url: facebookLibraryUrl, method: "GET" }] }`
   - Apify run'ı asenkron çalışır → run tamamlanana kadar **polling** yapılır (n8n'de bu bir Wait+If döngüsüydü; kodda `setInterval`/exponential backoff veya bir job queue ile yönetilecek).
3. **Sonuçları çek** → `GET /v2/acts/{actorId}/runs/last/dataset/items` ile scrape edilen reklamlar alınır. Her reklamdan şu alanlar çıkarılır:
   - `snapshot.page_name`, `snapshot.page_profile_uri`
   - `snapshot.cards[0].link_url` (reklamın yönlendirdiği site)
   - `snapshot.body.text` (reklam metni)
4. **Reklamın gittiği web sitesini kazı** → `link_url`'e HTTP GET at, HTML içeriğini al.
5. **HTML → düz metin** → script/style temizle, tag'leri kaldır, HTML entity'leri decode et (n8n Code node'undaki JS mantığı; bu fonksiyon aynen bir util fonksiyonuna taşınacak).
6. **AI ile ürün adı çıkarımı** → OpenAI (gpt-4.1-mini veya güncel eşdeğeri) çağrılır.
   - Sistem promptu: "Bir Facebook reklamının kazınmış site içeriğini al, satılan tek bir ürünü bul, Amazon'da aratılabilecek şekilde ürün adını formatla. İçerik yoksa sayfa adı/caption/body text kullan. Hiçbiri yoksa 'No Product Found' döndür."
   - Girdi: kazınmış plaintext + page_name + caption + body text.
7. **"No Product Found" kontrolü** → Eğer AI ürün bulamadıysa bu reklamı atla, sıradakine geç.
8. **Amazon'da ürün ara** → Apify aktörü `axesso_data~amazon-search-scraper` çalıştırılır.
   - Girdi: `{ keyword, domainCode: "com", sortBy: "recent", maxPages: 1, category: "aps" }`
   - Yine asenkron → polling ile sonuç beklenir.
9. **Amazon sonuçlarını çek ve normalize et**:
   - `amazonURL = "https://www.amazon.com" + dpUrl`
   - `productTitle = productDescription`
   - `price`, `productRating` (ilk 3 karakter/decimal kısmı alınır, örn "4.5 out of 5" → "4.5")
10. **Sonucu kaydet** → Veritabanına yaz (bkz. Bölüm 4). Orijinaldeki Google Sheets yerine artık gerçek bir DB kullanılacak.
11. **Kullanıcıya bildir** → Arama tamamlanınca (webhook/websocket/e-posta) kullanıcıya haber ver.

> Not: n8n'deki "Loop Over Items" (splitInBatches) mantığı, kodda basitçe bir `for` döngüsü veya bir job queue'nun (BullMQ) her reklam için ayrı bir "child job" oluşturmasıyla karşılanacak. Facebook Ads Library'den dönen HER reklam için 4-9 arası adımlar tekrarlanır.

---

## 3. Teknoloji Yığını (Önerilen)

Claude Code bu stack ile ilerlesin (basit, tek repo, kolay deploy edilebilir):

- **Framework**: Next.js 14+ (App Router) — hem frontend hem API route'ları tek yerde
- **Dil**: TypeScript
- **Veritabanı**: PostgreSQL (Supabase veya Neon üzerinde barındırılabilir — ikisi de ücretsiz katman sunuyor)
- **ORM**: Prisma
- **Kuyruk / Arkaplan işleri**: BullMQ + Redis (Upstash Redis kullanılabilir, serverless-uyumlu)
  - Neden gerekli: Apify run'ları dakikalar sürebilir, kullanıcıyı bekletmemek için arama işlemi arka planda kuyruğa alınmalı.
- **Auth**: Clerk veya NextAuth.js (basitlik için Clerk önerilir — hazır UI bileşenleri var)
- **Ödeme**: Stripe (Subscriptions + Metered Billing veya basit plan bazlı kota)
- **AI**: OpenAI API (gpt-4.1-mini veya güncel model — Claude Code implementasyon sırasında güncel model adını doğrulamalı)
- **Scraping/Veri kaynağı**: Apify API (mevcut iki aktör; API key .env'de saklanacak, ASLA URL query param olarak değil, header/Authorization Bearer token olarak)
- **Deployment**: Vercel (Next.js için native) + ayrı bir worker process (BullMQ worker'ı Vercel'de sürekli çalışamaz, bu yüzden worker için Railway/Render gibi bir sürekli çalışan servis gerekir)
- **Styling**: Tailwind CSS + shadcn/ui

---

## 4. Veritabanı Şeması (Prisma taslağı)

```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  stripeCustomerId String?
  plan          String   @default("free") // free, starter, pro
  searchesUsedThisMonth Int @default(0)
  searchQuota   Int      @default(5)
  createdAt     DateTime @default(now())
  searches      Search[]
}

model Search {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  keyword     String
  country     String   @default("US")
  status      String   @default("pending") // pending, running, completed, failed
  createdAt   DateTime @default(now())
  completedAt DateTime?
  results     ProductMatch[]
}

model ProductMatch {
  id              String   @id @default(cuid())
  searchId        String
  search          Search   @relation(fields: [searchId], references: [id])
  fbPageName      String?
  fbAdLinkUrl     String?
  fbAdBodyText    String?  @db.Text
  detectedProductName String?
  amazonUrl       String?
  amazonTitle     String?
  amazonPrice     Float?
  amazonRating    Float?
  createdAt       DateTime @default(now())
}
```

---

## 5. API Route Yapısı (Next.js App Router)

```
/app
  /api
    /searches
      POST    -> yeni arama başlat (kuyruğa job ekler, quota kontrolü yapar)
      GET     -> kullanıcının aramalarını listele
    /searches/[id]
      GET     -> tek aramanın durumu + sonuçları
    /webhooks/stripe
      POST    -> Stripe abonelik event'lerini işler
    /webhooks/apify (opsiyonel)
      POST    -> Apify run tamamlandığında callback alır (polling yerine webhook kullanmak daha verimli, Apify bunu destekliyor)
  /dashboard
    page.tsx        -> kullanıcı paneli: arama formu + geçmiş aramalar
    /searches/[id]/page.tsx -> tek arama sonuç tablosu
  /pricing
    page.tsx        -> planlar + Stripe checkout
  /(auth)
    sign-in, sign-up sayfaları (Clerk kullanılıyorsa otomatik gelir)

/lib
  /apify
    facebookAdsLibrary.ts   -> runActor, pollUntilDone, getResults
    amazonSearch.ts         -> runActor, pollUntilDone, getResults
  /ai
    productNameFinder.ts    -> OpenAI çağrısı + prompt (orijinal system prompt buraya taşınır)
  /scraping
    htmlToPlainText.ts      -> n8n Code node'undaki HTML temizleme fonksiyonu (aynen JS'e taşınır)
  /queue
    searchWorker.ts         -> BullMQ worker: yukarıdaki 11 adımlık pipeline'ı yürütür
    queue.ts                -> queue tanımı
  /db
    prisma.ts
  /stripe
    client.ts, plans.ts
```

---

## 6. Pipeline Worker Mantığı (Sözde kod)

```ts
// lib/queue/searchWorker.ts
async function processSearch(searchId: string) {
  const search = await getSearch(searchId);
  await updateSearchStatus(searchId, "running");

  const fbAds = await runFacebookAdsLibraryScraper(search.keyword, search.country);

  for (const ad of fbAds) {
    try {
      const siteHtml = await fetchWebsite(ad.snapshot.cards?.[0]?.link_url);
      const plainText = htmlToPlainText(siteHtml);

      const productName = await findProductName({
        plainText,
        pageName: ad.snapshot.page_name,
        caption: ad.snapshot.caption,
        bodyText: ad.snapshot.body?.text,
      });

      if (productName === "No Product Found") continue;

      const amazonResults = await runAmazonSearchScraper(productName);
      const bestMatch = amazonResults[0]; // veya bir eşleştirme skoru ile en iyisini seç

      if (bestMatch) {
        await saveProductMatch(searchId, {
          fbPageName: ad.snapshot.page_name,
          fbAdLinkUrl: ad.snapshot.cards?.[0]?.link_url,
          fbAdBodyText: ad.snapshot.body?.text,
          detectedProductName: productName,
          amazonUrl: `https://www.amazon.com${bestMatch.dpUrl}`,
          amazonTitle: bestMatch.productDescription,
          amazonPrice: bestMatch.price,
          amazonRating: parseFloat(bestMatch.productRating),
        });
      }
    } catch (err) {
      // tek bir reklamda hata olursa diğerlerini durdurma, logla ve devam et
      console.error(`Ad processing failed for ${ad.snapshot.page_name}`, err);
      continue;
    }
  }

  await updateSearchStatus(searchId, "completed");
  await notifyUser(search.userId, searchId);
}
```

---

## 7. Ortam Değişkenleri (.env)

```
DATABASE_URL=
REDIS_URL=
APIFY_API_TOKEN=
OPENAI_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
```

**ÖNEMLİ GÜVENLİK NOTU**: Orijinal n8n workflow'unda Apify token URL'nin sonuna query param olarak ekleniyordu (`?token=`). Bu SaaS'ta bu ASLA yapılmayacak — tüm API key'ler `.env`'de tutulacak ve isteklerde `Authorization: Bearer ${APIFY_API_TOKEN}` header'ı olarak gönderilecek.

---

## 8. Kullanıcı Arayüzü Gereksinimleri

1. **Dashboard**: Arama formu (keyword input + ülke seçimi + "Ara" butonu), altında geçmiş aramaların listesi (durum: pending/running/completed).
2. **Arama Sonuç Sayfası**: Tablo halinde — FB Sayfa Adı, Reklam Linki, Tespit Edilen Ürün, Amazon Linki, Fiyat, Rating. Filtreleme/sıralama (fiyata göre, rating'e göre).
3. **Pricing Sayfası**: 2-3 plan (örn. Free: 5 arama/ay, Starter: 50 arama/ay, Pro: 200 arama/ay). Stripe Checkout'a yönlendirme.
4. **Kota Göstergesi**: Kullanıcı panelinde "Bu ay 12/50 arama kullanıldı" gibi bir gösterge.
5. **Bildirim**: Arama tamamlandığında basit bir e-posta (Resend veya benzeri bir servisle) veya panelde canlı durum güncellemesi (polling ile yeterli, websocket şart değil).

---

## 9. Maliyet ve Kota Yönetimi (Kritik)

- Her arama, birden fazla Apify aktör çalıştırması + birden fazla OpenAI çağrısı + web scraping isteği içeriyor. Bu **doğrudan para maliyeti** demek.
- Worker, bir aramada **maksimum kaç reklam işleneceğine** dair bir limit uygulamalı (örn. ilk 10 reklam), aksi halde maliyet kontrolsüz büyür.
- Kullanıcı planına göre bu limit değişebilir (örn. Free plan: ilk 5 reklam, Pro plan: ilk 20 reklam).
- Quota kontrolü **arama başlamadan önce** (`POST /api/searches` içinde) yapılmalı; kullanıcı kotasını aşmışsa 402/403 döndürülmeli.

---

## 10. Claude Code İçin Görev Sırası (Implementasyon Adımları)

Claude Code bu sırayla ilerlemeli:

1. Next.js + TypeScript + Tailwind proje iskeletini kur.
2. Prisma şemasını yukarıdaki modellerle oluştur, migration çalıştır.
3. Clerk auth entegrasyonunu ekle (sign-in/sign-up + middleware ile route koruma).
4. `/lib/apify/*` modüllerini yaz: Facebook Ads Library scraper çağırma + polling, Amazon search scraper çağırma + polling.
5. `/lib/scraping/htmlToPlainText.ts` fonksiyonunu yaz (yukarıdaki n8n Code node mantığını TypeScript'e çevir).
6. `/lib/ai/productNameFinder.ts` yaz (OpenAI çağrısı, orijinal system prompt kullanılarak).
7. BullMQ queue + worker kurulumunu yap (`lib/queue`), yukarıdaki pipeline sözde kodunu gerçek koda dönüştür.
8. `/api/searches` (POST/GET) ve `/api/searches/[id]` (GET) route'larını yaz — quota kontrolü dahil.
9. Dashboard, arama formu ve sonuç tablosu UI'larını yap.
10. Stripe entegrasyonu: pricing sayfası, checkout, webhook handler, plan/quota güncelleme.
11. `.env.example` dosyası oluştur, README'ye kurulum talimatlarını yaz.
12. Worker'ın Vercel dışında (Railway/Render) nasıl deploy edileceğine dair bir `DEPLOYMENT.md` yaz.

---

## 11. Yasal/Etik Not

Facebook Ads Library ve Amazon sayfalarının scrape edilmesi bu platformların kullanım şartlarıyla gri alanda olabilir. Ürün, kullanıcı sözleşmesinde "yalnızca pazar araştırması amaçlıdır" ibaresi bulundurmalı ve ilgili platformların ToS'una uyum sorumluluğu kullanıcıya bildirilmelidir. Bu konuda nihai karar ve hukuki risk değerlendirmesi kullanıcıya/işletme sahibine aittir.
