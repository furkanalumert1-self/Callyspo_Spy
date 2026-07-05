import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/getOrCreateUser";
import { quotaStatus } from "@/lib/billing/quota";

export async function GET() {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ user, quota: quotaStatus(user) });
}
