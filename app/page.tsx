import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div>
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold">AdSpy</span>
          <nav className="flex items-center gap-4">
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">
              Fiyatlandırma
            </Link>
            <SignedIn>
              <Link href="/dashboard">
                <Button size="sm">Panele Git</Button>
              </Link>
            </SignedIn>
            <SignedOut>
              <Link href="/sign-in">
                <Button variant="secondary" size="sm">Giriş Yap</Button>
              </Link>
              <Link href="/sign-up">
                <Button size="sm">Ücretsiz Başla</Button>
              </Link>
            </SignedOut>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Facebook Reklamlarındaki Ürünleri <br /> Amazon'da Otomatik Bul
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Bir anahtar kelime girin; AdSpy, Facebook Ads Library'de reklamı yapılan
          ürünleri tespit edip Amazon'da fiyat, puan ve link ile eşleştirir.
          Dropshipping ve Amazon FBA fırsatlarını dakikalar içinde keşfedin.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link href="/sign-up">
            <Button size="lg">Ücretsiz Dene</Button>
          </Link>
          <Link href="/pricing">
            <Button size="lg" variant="secondary">
              Planları Gör
            </Button>
          </Link>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Bu araç yalnızca pazar araştırması amaçlıdır. Facebook Ads Library ve
          Amazon'un kullanım şartlarına uyum sorumluluğu kullanıcıya aittir.
        </p>
      </main>
    </div>
  );
}
