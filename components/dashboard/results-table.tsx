"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ProductMatch {
  id: string;
  fbPageName: string | null;
  fbAdLinkUrl: string | null;
  detectedProductName: string | null;
  amazonUrl: string | null;
  amazonTitle: string | null;
  amazonPrice: number | null;
  amazonRating: number | null;
}

interface SearchDetail {
  id: string;
  keyword: string;
  status: string;
  adsFound: number;
  adsProcessed: number;
  maxAdsToProcess: number;
  errorMessage: string | null;
  results: ProductMatch[];
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Bekliyor",
  running: "Çalışıyor",
  completed: "Tamamlandı",
  failed: "Başarısız",
};

type SortKey = "price" | "rating" | null;

export function ResultsTable({ initialSearch }: { initialSearch: SearchDetail }) {
  const [search, setSearch] = useState(initialSearch);
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function refresh() {
      const res = await fetch(`/api/searches/${search.id}`);
      if (!res.ok) return;
      const data = await res.json();
      setSearch(data.search);
    }

    if (search.status === "pending" || search.status === "running") {
      intervalRef.current = setInterval(refresh, 4000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.status, search.id]);

  const sortedResults = useMemo(() => {
    if (!sortKey) return search.results;
    const copy = [...search.results];
    copy.sort((a, b) => {
      const av = (sortKey === "price" ? a.amazonPrice : a.amazonRating) ?? -Infinity;
      const bv = (sortKey === "price" ? b.amazonPrice : b.amazonRating) ?? -Infinity;
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return copy;
  }, [search.results, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Badge>{STATUS_LABEL[search.status] ?? search.status}</Badge>
        <span className="text-sm text-muted-foreground">
          {search.adsProcessed} / {search.adsFound || search.maxAdsToProcess} reklam işlendi · {search.results.length} eşleşme
        </span>
      </div>

      {search.status === "failed" && search.errorMessage && (
        <p className="text-sm text-destructive">Hata: {search.errorMessage}</p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>FB Sayfa Adı</TableHead>
            <TableHead>Reklam Linki</TableHead>
            <TableHead>Tespit Edilen Ürün</TableHead>
            <TableHead>Amazon Linki</TableHead>
            <TableHead>
              <Button variant="ghost" size="sm" onClick={() => toggleSort("price")}>
                Fiyat {sortKey === "price" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" size="sm" onClick={() => toggleSort("rating")}>
                Rating {sortKey === "rating" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </Button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedResults.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.fbPageName ?? "-"}</TableCell>
              <TableCell>
                {r.fbAdLinkUrl ? (
                  <a href={r.fbAdLinkUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    Reklamı Gör
                  </a>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell>{r.detectedProductName ?? "-"}</TableCell>
              <TableCell>
                {r.amazonUrl ? (
                  <a href={r.amazonUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {r.amazonTitle?.slice(0, 40) ?? "Amazon'da Gör"}
                  </a>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell>{r.amazonPrice != null ? `$${r.amazonPrice.toFixed(2)}` : "-"}</TableCell>
              <TableCell>{r.amazonRating != null ? r.amazonRating.toFixed(1) : "-"}</TableCell>
            </TableRow>
          ))}
          {sortedResults.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                {search.status === "completed" ? "Eşleşme bulunamadı." : "Sonuçlar işleniyor..."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
