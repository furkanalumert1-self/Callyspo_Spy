import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/getOrCreateUser";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResultsTable } from "@/components/dashboard/results-table";

export default async function SearchDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();

  const search = await prisma.search.findUnique({
    where: { id: params.id },
    include: { results: { orderBy: { createdAt: "desc" } } },
  });

  if (!search || search.userId !== user.id) {
    notFound();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>&quot;{search.keyword}&quot; Arama Sonuçları</CardTitle>
      </CardHeader>
      <CardContent>
        <ResultsTable initialSearch={search} />
      </CardContent>
    </Card>
  );
}
