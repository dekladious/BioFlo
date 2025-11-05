import Stripe from "stripe";
import { auth, currentUser } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { STRIPE as STRIPE_CONST } from "@/lib/constants";
import { getRequestMetadata, createErrorResponse } from "@/lib/api-utils";

export async function POST(req: Request) {
  const { requestId } = getRequestMetadata(req);
  
  try {
    const { userId } = await auth();
    if (!userId) {
      logger.warn("Checkout: Unauthorized request", { requestId });
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress;

    if (!email) {
      logger.warn("Checkout: No email found for user", { userId, requestId });
      return createErrorResponse("Email address required", requestId, 400);
    }

    const stripe = new Stripe(env.stripe.secretKey(), { apiVersion: STRIPE_CONST.API_VERSION as any });
    const priceId = env.stripe.priceId();
    const baseUrl = env.app.baseUrl();
    
    if (!priceId || !baseUrl) {
      logger.error("Checkout: Missing configuration", { requestId, hasPriceId: !!priceId, hasBaseUrl: !!baseUrl });
      return createErrorResponse("Service configuration error", requestId, 500);
    }

    const customers = await stripe.customers.list({ email, limit: 1 });
    const existing = customers.data[0];
    const customer = existing
      ? await stripe.customers.update(existing.id, { metadata: { clerkUserId: userId } })
      : await stripe.customers.create({ email, metadata: { clerkUserId: userId } });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/chat?checkout=success`,
      cancel_url: `${baseUrl}/subscribe`,
      customer: customer.id,
      metadata: {
        clerkUserId: userId,
        requestId,
      },
    });

    logger.info("Checkout: Session created", { userId, sessionId: session.id, customerId: customer.id, requestId });

    return Response.json({ 
      success: true,
      data: { url: session.url },
      requestId,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        "X-Request-Id": requestId,
        "Content-Type": "application/json",
      },
    });
  } catch (error: unknown) {
    logger.error("Checkout: Error creating session", error);
    return createErrorResponse("Failed to create checkout session", requestId, 500);
  }
}
