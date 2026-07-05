"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface SearchRow {
  id: string;
  keyword: string;
  country: string;
  status: string;
  adsFound: number;
  adsProcessed: number;
  maxAdsToProcess: number;
  createdAt: string;
  _count: { results: number };
}

const STATUS_VARIANT: Record<string, "secondary" | "default" | "success" | "destructive"> = {
  pending: "secondary",
  running: "default",
  completed: "success",
  failed: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Bekliyor",
  running: "Çalışıyor",
  completed: "Tamamlandı",
  failed: "Başarısız",
};

export function SearchHistory({ initialSearches }: { initialSearches: SearchRow[] }) {
  const [searches, setSearches] = useState(initialSearches);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function refresh() {
      const res = await fetch("/api/searches");
      if (!res.ok) return;
      const data = await res.json();
      setSearches(data.searches);
    }

    const hasActive = searches.some((s) => s.status === "pending" || s.status === "running");
    if (hasActive) {
      intervalRef.current = setInterval(refresh, 5000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searches]);

  if (searches.length === 0) {
    return <p className="text-sm text-muted-foreground">Henüz arama yapılmadı.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Anahtar Kelime</TableHead>
          <TableHead>Ülke</TableHead>
          <TableHead>Durum</TableHead>
          <TableHead>İşlenen / Bulunan Reklam</TableHead>
          <TableHead>Eşleşme</TableHead>
          <TableHead>Tarih</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {searches.map((s) => (
          <TableRow key={s.id}>
            <TableCell className="font-medium">{s.keyword}</TableCell>
            <TableCell>{s.country}</TableCell>
            <TableCell>
              <Badge variant={STATUS_VARIANT[s.status] ?? "secondary"}>{STATUS_LABEL[s.status] ?? s.status}</Badge>
            </TableCell>
            <TableCell>
              {s.adsProcessed} / {s.adsFound || s.maxAdsToProcess}
            </TableCell>
            <TableCell>{s._count.results}</TableCell>
            <TableCell>{new Date(s.createdAt).toLocaleString("tr-TR")}</TableCell>
            <TableCell>
              <Link href={`/dashboard/searches/${s.id}`} className="text-sm text-primary hover:underline">
                Detay
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
