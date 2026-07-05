import { requireUser } from "@/lib/auth/getOrCreateUser";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchForm } from "@/components/dashboard/search-form";
import { SearchHistory } from "@/components/dashboard/search-history";
import { QuotaBadge } from "@/components/dashboard/quota-badge";

export default async function DashboardPage() {
  const user = await requireUser();

  const searches = await prisma.search.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { results: true } } },
  });

  const serialized = searches.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() }));

  return (
    <div className="space-y-8">
      <QuotaBadge />

      <Card>
        <CardHeader>
          <CardTitle>Yeni Arama Başlat</CardTitle>
        </CardHeader>
        <CardContent>
          <SearchForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Geçmiş Aramalar</CardTitle>
        </CardHeader>
        <CardContent>
          <SearchHistory initialSearches={serialized} />
        </CardContent>
      </Card>
    </div>
  );
}
