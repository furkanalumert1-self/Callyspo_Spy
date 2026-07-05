"use client";

import { useEffect, useState } from "react";

interface Quota {
  plan: string;
  used: number;
  quota: number;
  resetsAt: string;
}

export function QuotaBadge() {
  const [quota, setQuota] = useState<Quota | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => res.json())
      .then((data) => setQuota(data.quota))
      .catch(() => {});
  }, []);

  if (!quota) return null;

  const pct = Math.min(100, Math.round((quota.used / quota.quota) * 100));

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium capitalize">{quota.plan} Plan</span>
        <span className="text-muted-foreground">
          Bu ay {quota.used}/{quota.quota} arama kullanıldı
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
