# AdSpy — Facebook Reklam → Amazon Ürün Eşleştirme SaaS

Facebook Ads Library'de reklamı yapılan ürünleri otomatik olarak bulup, aynı
ürünün Amazon'da satılıp satılmadığını (fiyat, rating, link dahil) tespit eden
SaaS platformu. Orijinal n8n workflow'unun mantığı tamamen kod tabanlı bir
Next.js uygulamasına taşınmıştır (bkz. `PROJECT_SPEC.md`).

## Teknoloji Yığını

- Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui bileşenleri
- PostgreSQL + Prisma ORM
- BullMQ + Redis (arka plan iş kuyruğu)
- Clerk (auth)
- Stripe (ödeme/abonelik)
- OpenAI (ürün adı çıkarımı)
- Apify (Facebook Ads Library + Amazon arama scraper aktörleri)
- Resend (e-posta bildirimi)

## Mimari Özet

- `app/` — Next.js sayfaları ve API route'ları (dashboard, pricing, auth, `/api/searches`, `/api/webhooks/*`)
- `lib/apify/` — Apify aktör çağırma + polling (`client.ts`), Facebook/Amazon aktör sarmalayıcıları
- `lib/scraping/` — reklamın yönlendirdiği site HTML'ini çekme ve düz metne çevirme
- `lib/ai/productNameFinder.ts` — OpenAI ile ürün adı çıkarımı
- `lib/queue/` — BullMQ queue tanımı ve arama işleme pipeline'ı (worker)
- `lib/billing/quota.ts` — plan bazlı aylık arama kotası kontrolü
- `lib/stripe/` — Stripe client'ı ve plan tanımları
- `prisma/schema.prisma` — `User`, `Search`, `ProductMatch` modelleri

Arama akışı: kullanıcı `/api/searches` ile arama başlatır (kota kontrolü
yapılır) → iş BullMQ kuyruğuna eklenir → ayrı bir worker process'i
(`npm run worker`) Facebook Ads Library'yi tarar, her reklamın gittiği siteyi
kazır, OpenAI ile ürün adını çıkarır, Amazon'da arar ve sonucu veritabanına
yazar → kullanıcı panelden polling ile durumu izler, arama bitince e-posta
alır.

## Kurulum

### 1. Bağımlılıkları kur

```bash
npm install
```

### 2. Ortam değişkenleri

```bash
cp .env.example .env
```

`.env` dosyasını doldurun:

- **DATABASE_URL**: Supabase veya Neon üzerinde oluşturduğunuz PostgreSQL bağlantı adresi.
- **REDIS_URL**: Upstash Redis (veya herhangi bir Redis) bağlantı adresi.
- **APIFY_API_TOKEN**: Apify hesabınızdaki API token. **Asla** URL'e query param olarak eklemeyin; kod bunu her zaman `Authorization: Bearer` header'ı olarak gönderir (`lib/apify/client.ts`).
- **OPENAI_API_KEY**: OpenAI API anahtarı.
- **STRIPE_***: Stripe Dashboard'dan alınan secret key, webhook secret, publishable key ve Starter/Pro planları için oluşturduğunuz Price ID'ler.
- **CLERK_***: Clerk Dashboard'dan alınan anahtarlar.
- **RESEND_API_KEY**: Arama tamamlandığında e-posta göndermek için (opsiyonel; ayarlanmazsa bildirim atlanır).

### 3. Veritabanı migration

```bash
npx prisma migrate dev --name init
```

### 4. Geliştirme sunucusunu başlat

```bash
npm run dev
```

### 5. Worker'ı başlat (ayrı terminal)

Arka plan işleri (Apify çağrıları, scraping, OpenAI, Amazon araması) `npm run
dev` sürecinde **çalışmaz** — ayrı bir worker process gerekir:

```bash
npm run worker
```

Production'da worker'ın nasıl deploy edileceği için `DEPLOYMENT.md` dosyasına bakın.

## Stripe Webhook'unu Yerelde Test Etme

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Çıktıda verilen `whsec_...` değerini `STRIPE_WEBHOOK_SECRET` olarak `.env`'e ekleyin.

## Maliyet/Kota Notu

Her arama; birden fazla Apify aktör çalıştırması, OpenAI çağrısı ve web
scraping isteği içerir ve doğrudan para maliyeti oluşturur. Bu yüzden:

- Kota kontrolü arama başlamadan **önce** `POST /api/searches` içinde yapılır (`lib/billing/quota.ts`), aşılmışsa `402` döner.
- Worker, plana göre işlenecek **maksimum reklam sayısını** sınırlar (`lib/stripe/plans.ts` → `maxAdsPerSearch`: Free 5, Starter 10, Pro 20).

## Yasal/Etik Not

Bu ürün yalnızca pazar araştırması amaçlıdır. Facebook Ads Library ve
Amazon'un kullanım şartlarına uyum sorumluluğu kullanıcıya/işletme sahibine aittir.
