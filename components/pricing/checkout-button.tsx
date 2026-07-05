"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { PlanId } from "@/lib/stripe/plans";

export function CheckoutButton({ planId, label }: { planId: PlanId; label: string }) {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!isSignedIn) {
      router.push("/sign-up");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button className="w-full" onClick={handleClick} disabled={loading}>
      {loading ? "Yönlendiriliyor..." : label}
    </Button>
  );
}
