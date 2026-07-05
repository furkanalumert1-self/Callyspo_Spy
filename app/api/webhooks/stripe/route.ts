import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe/client";
import { getPlanIdByStripePriceId, PLANS } from "@/lib/stripe/plans";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const planId = session.metadata?.planId;
      if (userId && planId && session.subscription) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            plan: planId,
            stripeSubscriptionId:
              typeof session.subscription === "string" ? session.subscription : session.subscription.id,
            searchQuota: PLANS[planId as keyof typeof PLANS]?.searchQuota,
          },
        });
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const priceId = subscription.items.data[0]?.price.id;
      const isActive = subscription.status === "active" || subscription.status === "trialing";
      const planId = isActive && priceId ? getPlanIdByStripePriceId(priceId) : "free";

      const user = await prisma.user.findFirst({
        where: { stripeCustomerId: subscription.customer as string },
      });

      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            plan: planId ?? "free",
            searchQuota: PLANS[(planId ?? "free") as keyof typeof PLANS]?.searchQuota,
            stripeSubscriptionId: event.type === "customer.subscription.deleted" ? null : subscription.id,
          },
        });
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
