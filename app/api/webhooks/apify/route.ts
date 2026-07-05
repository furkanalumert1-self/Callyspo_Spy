import { NextRequest, NextResponse } from "next/server";

/**
 * Optional callback endpoint (see PROJECT_SPEC section 5). The pipeline in
 * lib/queue/searchWorker.ts uses polling (pollUntilDone) instead of webhooks,
 * so this route is not required for the pipeline to function — it exists as
 * an extension point if Apify actors are later configured with a webhook
 * pointing here for faster run-completion signaling.
 */
export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.APIFY_WEBHOOK_SECRET || secret !== process.env.APIFY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  console.log("[apify-webhook] received event", payload?.eventType);

  return NextResponse.json({ received: true });
}
