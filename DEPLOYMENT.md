# Deployment

AdSpy'ın iki ayrı çalışan parçası var: **Next.js uygulaması** (web + API
route'ları) ve **BullMQ worker** (arka plan arama pipeline'ı). Next.js
Vercel'in serverless fonksiyonlarında çalışır ve bu ortamda sürekli/uzun
ömürlü process'ler (worker gibi) çalıştıramaz — bu yüzden worker'ı ayrı,
sürekli çalışan bir servise (Railway veya Render) deploy etmeniz gerekir.

## 1. Next.js Uygulaması → Vercel

1. Repoyu Vercel'e bağlayın.
2. Ortam değişkenlerini (`.env.example` içindeki tüm anahtarlar) Vercel
   proje ayarlarında tanımlayın.
3. Build komutu: `npm run build` (Vercel varsayılanı). Prisma client'ının
   build sırasında üretilmesi için `package.json`'a `postinstall: prisma
   generate` eklemek isterseniz ekleyebilirsiniz; aksi halde ilk `next build`
   Prisma client'ı otomatik üretir.
4. `NEXT_PUBLIC_APP_URL`'i Vercel'in verdiği production domain'e ayarlayın.
5. Stripe webhook endpoint'ini Stripe Dashboard'da
   `https://<domain>/api/webhooks/stripe` olarak tanımlayın ve üretilen
   `whsec_...` değerini `STRIPE_WEBHOOK_SECRET` olarak ayarlayın.

## 2. Worker → Railway veya Render

Worker, `npm run worker` komutuyla (`lib/queue/runWorker.ts`) başlatılan
sürekli çalışan bir Node process'idir. BullMQ job'larını Redis üzerinden
dinler ve `lib/queue/searchWorker.ts` içindeki pipeline'ı yürütür.

### Railway

1. Aynı repodan yeni bir servis oluşturun.
2. Start command: `npm run worker`
3. Build command: `npm install && npx prisma generate`
4. Aynı ortam değişkenlerini (`DATABASE_URL`, `REDIS_URL`, `APIFY_API_TOKEN`,
   `OPENAI_API_KEY`, `RESEND_API_KEY`, vb.) bu servise de ekleyin.
5. Otomatik yeniden başlatmayı (restart policy: always) açık bırakın —
   worker sürekli çalışmalı.

### Render

1. "Background Worker" servis tipini seçin (Web Service değil).
2. Build command: `npm install && npx prisma generate`
3. Start command: `npm run worker`
4. Aynı ortam değişkenlerini ekleyin.

## 3. Redis

Upstash Redis (serverless, ücretsiz katman) hem Vercel'deki API
route'larından (job enqueue etmek için) hem de Railway/Render'daki worker'dan
erişilebilir olmalı — `REDIS_URL`'i her iki ortamda da aynı değere ayarlayın.

## 4. Veritabanı Migration'ları Production'da Çalıştırma

```bash
npx prisma migrate deploy
```

Bunu bir CI adımı olarak veya deploy öncesi manuel olarak çalıştırın (Vercel
build adımına eklemek build süresini uzatabileceğinden, ayrı bir migration
job'u/CI adımı tercih edilir).

## 5. Sağlık Kontrolü

- Web: `https://<domain>/` açılmalı, Clerk sign-in akışı çalışmalı.
- Worker: loglarında `[worker] AdSpy search worker started, waiting for
  jobs...` mesajını görmelisiniz. Bir arama başlattığınızda birkaç saniye
  içinde `[worker] search <id> completed` (veya `failed`) logunu görmelisiniz.
