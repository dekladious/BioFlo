import Stripe from "stripe";
import { headers } from "next/headers";
import { clerkClient } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { STRIPE as STRIPE_CONST } from "@/lib/constants";
import { ClerkPublicMetadata, ClerkPrivateMetadata } from "@/types";
import { generateRequestId } from "@/lib/api-utils";

export const runtime = "nodejs";

// Webhook idempotency tracking (in-memory - use Redis for production)
const processedEvents = new Set<string>();

// Clean up old event IDs periodically (keep last 1000)
function cleanupProcessedEvents() {
  if (processedEvents.size > 1000) {
    const entries = Array.from(processedEvents);
    processedEvents.clear();
    // Keep last 100 entries
    entries.slice(-100).forEach(id => processedEvents.add(id));
  }
}

export async function POST(req: Request) {
  const body = await req.text();
  const sig = (await headers()).get("stripe-signature");
  const secret = env.stripe.webhookSecret();
  
  if (!sig || !secret) {
    logger.error("Webhook: Missing signature or secret");
    return new Response("Missing webhook secret", { status: 500 });
  }

  const stripe = new Stripe(env.stripe.secretKey(), { apiVersion: STRIPE_CONST.API_VERSION as any });
  const clerk = await clerkClient();

  const requestId = generateRequestId();
  
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
    logger.info("Webhook: Event received", { type: event.type, eventId: event.id, requestId });
    
    // Idempotency check - prevent duplicate processing
    if (processedEvents.has(event.id)) {
      logger.info("Webhook: Event already processed (idempotency)", { eventId: event.id, requestId });
      return new Response("Event already processed", { status: 200 });
    }
    
    // Mark as processed
    processedEvents.add(event.id);
    cleanupProcessedEvents();
  } catch (err: unknown) {
    logger.error("Webhook: Signature verification failed", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return new Response(`Webhook signature verification failed. ${errorMessage}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        const clerkUserId = customer.metadata?.clerkUserId as string | undefined;
        if (clerkUserId) {
          await clerk.users.updateUser(clerkUserId, {
            publicMetadata: { isPro: true } as ClerkPublicMetadata,
            privateMetadata: { stripeCustomerId: customerId } as ClerkPrivateMetadata,
          });
          logger.info("Webhook: User upgraded to Pro", { clerkUserId, customerId, sessionId: session.id, requestId });
        } else {
          logger.warn("Webhook: checkout.session.completed missing clerkUserId", { customerId, sessionId: session.id, requestId });
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        const clerkUserId = customer.metadata?.clerkUserId as string | undefined;
        const isActive = sub.status === "active" || sub.status === "trialing";
        if (clerkUserId) {
          await clerk.users.updateUser(clerkUserId, {
            publicMetadata: { isPro: isActive } as ClerkPublicMetadata,
            privateMetadata: { stripeCustomerId: customerId } as ClerkPrivateMetadata,
          });
          logger.info("Webhook: Subscription updated", { clerkUserId, customerId, status: sub.status, isActive, requestId });
        } else {
          logger.warn("Webhook: customer.subscription.updated missing clerkUserId", { customerId, subscriptionId: sub.id, requestId });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        const clerkUserId = customer.metadata?.clerkUserId as string | undefined;
        if (clerkUserId) {
          await clerk.users.updateUser(clerkUserId, { publicMetadata: { isPro: false } as ClerkPublicMetadata });
          logger.info("Webhook: Subscription cancelled", { clerkUserId, customerId, subscriptionId: sub.id, requestId });
        } else {
          logger.warn("Webhook: customer.subscription.deleted missing clerkUserId", { customerId, subscriptionId: sub.id, requestId });
        }
        break;
      }
      default:
        break;
    }
    return new Response("ok", { 
      status: 200,
      headers: {
        "X-Request-Id": requestId,
      },
    });
  } catch (err: unknown) {
    logger.error("Webhook: Handler error", err);
    return new Response("Webhook handler failed", { 
      status: 500,
      headers: {
        "X-Request-Id": requestId,
      },
    });
  }
}
