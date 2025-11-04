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
    console.log("✅ Webhook event received:", event.type);
  } catch (err: any) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return new Response(`Webhook signature verification failed. ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const clerkUserId = session.metadata?.clerkUserId;
        const customerId = session.customer as string | undefined;

        console.log("Processing checkout.session.completed:", { clerkUserId, customerId });

        if (clerkUserId && customerId) {
          // Update Clerk user with Pro status and Stripe customer ID
          await clerk.users.updateUser(clerkUserId, {
            publicMetadata: { isPro: true },
            privateMetadata: { stripeCustomerId: customerId },
          });
          console.log("✅ Updated Clerk user with Pro status:", clerkUserId);
          
          // Also save clerkUserId to Stripe customer metadata for future events
          await stripe.customers.update(customerId, {
            metadata: { clerkUserId },
          });
          console.log("✅ Updated Stripe customer metadata:", customerId);
        } else {
          console.error("❌ Missing clerkUserId or customerId:", { clerkUserId, customerId });
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        // Find user(s) with this customer id
        // Clerk doesn't have a "search by metadata" API today; you'd usually store a mapping in your DB.
        // For MVP, set status by querying Stripe Customer's metadata or store mapping elsewhere.
        // If you saved clerkUserId on the Customer metadata, you can fetch it:
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        const clerkUserId = (customer.metadata as any)?.clerkUserId;
        const isActive = sub.status === "active" || sub.status === "trialing";
        console.log("Processing customer.subscription.updated:", { clerkUserId, isActive, status: sub.status });
        
        if (clerkUserId) {
          await clerk.users.updateUser(clerkUserId, {
            publicMetadata: { isPro: isActive },
            privateMetadata: { stripeCustomerId: customerId },
          });
          console.log("✅ Updated subscription status for user:", clerkUserId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        const clerkUserId = (customer.metadata as any)?.clerkUserId;
        console.log("Processing customer.subscription.deleted:", { clerkUserId });
        
        if (clerkUserId) {
          await clerk.users.updateUser(clerkUserId, {
            publicMetadata: { isPro: false },
          });
          console.log("✅ Removed Pro status from user:", clerkUserId);
        }
        break;
      }

      default:
        console.log("ℹ️ Ignoring webhook event type:", event.type);
        break;
    }

    return new Response("ok", { status: 200 });
  } catch (err: any) {
    console.error("❌ Webhook error:", err);
    return new Response("Webhook handler failed", { status: 500 });
  }
}
