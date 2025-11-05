import Stripe from "stripe";
import { auth, currentUser } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { STRIPE as STRIPE_CONST } from "@/lib/constants";
import { ClerkPrivateMetadata } from "@/types";
import { getRequestMetadata, createErrorResponse } from "@/lib/api-utils";

export async function POST(req: Request) {
  const { requestId } = getRequestMetadata(req);
  
  try {
    const { userId } = await auth();
    if (!userId) {
      logger.warn("Portal: Unauthorized request", { requestId });
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    const stripe = new Stripe(env.stripe.secretKey(), { apiVersion: STRIPE_CONST.API_VERSION as any });

    const user = await currentUser();
    const customerId = (user?.privateMetadata as ClerkPrivateMetadata)?.stripeCustomerId;
    if (!customerId) {
      logger.warn("Portal: No Stripe customer found", { userId, requestId });
      return createErrorResponse("No Stripe customer", requestId, 400);
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${env.app.baseUrl()}/chat`,
    });

    logger.info("Portal: Session created", { userId, sessionId: session.id, customerId, requestId });

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
    logger.error("Portal: Error creating session", error);
    return createErrorResponse("Failed to create portal session", requestId, 500);
  }
}
