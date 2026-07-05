"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COUNTRIES = [
  { code: "US", name: "Amerika Birleşik Devletleri" },
  { code: "GB", name: "Birleşik Krallık" },
  { code: "CA", name: "Kanada" },
  { code: "AU", name: "Avustralya" },
  { code: "DE", name: "Almanya" },
  { code: "TR", name: "Türkiye" },
];

export function SearchForm({ onCreated }: { onCreated?: () => void }) {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [country, setCountry] = useState("US");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, country }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Arama başlatılamadı");
        return;
      }
      setKeyword("");
      onCreated?.();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="keyword">Anahtar Kelime / Niş</Label>
        <Input
          id="keyword"
          placeholder='örn. "portable blender"'
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          required
          minLength={2}
        />
      </div>
      <div className="w-full space-y-1.5 sm:w-48">
        <Label htmlFor="country">Ülke</Label>
        <Select value={country} onValueChange={setCountry}>
          <SelectTrigger id="country">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Başlatılıyor..." : "Ara"}
      </Button>
      {error && <p className="text-sm text-destructive sm:ml-2">{error}</p>}
    </form>
  );
}
