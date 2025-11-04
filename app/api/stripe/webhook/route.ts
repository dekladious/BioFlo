import Stripe from "stripe";
import { headers } from "next/headers";
import { clerkClient } from "@clerk/nextjs/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = (await headers()).get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return new Response("Missing webhook secret", { status: 500 });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" as any });
  const clerk = await clerkClient();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err: any) {
    return new Response(`Webhook signature verification failed. ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        const clerkUserId = (customer.metadata as any)?.clerkUserId;
        if (clerkUserId) {
          await clerk.users.updateUser(clerkUserId, {
            publicMetadata: { isPro: true },
            privateMetadata: { stripeCustomerId: customerId },
          });
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        const clerkUserId = (customer.metadata as any)?.clerkUserId;
        const isActive = sub.status === "active" || sub.status === "trialing";
        if (clerkUserId) {
          await clerk.users.updateUser(clerkUserId, {
            publicMetadata: { isPro: isActive },
            privateMetadata: { stripeCustomerId: customerId },
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        const clerkUserId = (customer.metadata as any)?.clerkUserId;
        if (clerkUserId) {
          await clerk.users.updateUser(clerkUserId, { publicMetadata: { isPro: false } });
        }
        break;
      }
      default:
        // ignore other events
        break;
    }
    return new Response("ok", { status: 200 });
  } catch (err: any) {
    console.error("Webhook error", err);
    return new Response("Webhook handler failed", { status: 500 });
  }
}
