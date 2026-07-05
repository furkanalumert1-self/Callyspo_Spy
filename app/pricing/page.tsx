import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckoutButton } from "@/components/pricing/checkout-button";
import { PLANS } from "@/lib/stripe/plans";

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-4">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Ana Sayfa
        </Link>
      </div>
      <div className="text-center">
        <h1 className="text-3xl font-bold">Fiyatlandırma</h1>
        <p className="mt-2 text-muted-foreground">İhtiyacınıza uygun planı seçin.</p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {Object.values(PLANS).map((plan) => (
          <Card key={plan.id} className={plan.id === "pro" ? "border-primary shadow-md" : ""}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold text-foreground">${plan.priceMonthly}</span> / ay
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {plan.features.map((f) => (
                  <li key={f}>✓ {f}</li>
                ))}
              </ul>
              {plan.id === "free" ? (
                <Link href="/sign-up">
                  <Button className="w-full" variant="secondary">
                    Ücretsiz Başla
                  </Button>
                </Link>
              ) : (
                <CheckoutButton planId={plan.id} label={`${plan.name} Planına Geç`} />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        Bu araç yalnızca pazar araştırması amaçlıdır. Facebook Ads Library ve Amazon
        kullanım şartlarına uyum sorumluluğu kullanıcıya aittir.
      </p>
    </div>
  );
}
