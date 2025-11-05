import Stripe from "stripe";
import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { STRIPE as STRIPE_CONST } from "@/lib/constants";
import { ClerkPublicMetadata, ClerkPrivateMetadata } from "@/types";
import { getRequestMetadata, createErrorResponse } from "@/lib/api-utils";

export async function GET(req: Request) {
  const { requestId } = getRequestMetadata(req);
  
  try {
    const user = await currentUser();
    if (!user?.id) {
      logger.warn("Check-status: Unauthorized request", { requestId });
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    const stripe = new Stripe(env.stripe.secretKey(), { apiVersion: STRIPE_CONST.API_VERSION as any });
    const clerk = await clerkClient();
    let customerId = (user.privateMetadata as ClerkPrivateMetadata)?.stripeCustomerId;
    let hasActiveSubscription = false;
    let subscription: Stripe.Subscription | null = null;

    // First try: Check by customerId if we have it
    if (customerId) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: "active",
          limit: 1,
        });
        hasActiveSubscription = subscriptions.data.length > 0;
        subscription = subscriptions.data[0] || null;
      } catch (err: unknown) {
        logger.error("Error checking subscriptions by customerId", err, user.id);
        // Continue to try email lookup
      }
    }

    // Second try: If no customerId or no subscription found, search by email
    if (!hasActiveSubscription) {
      try {
        const primaryEmail = user.emailAddresses?.find(e => e.id === user.primaryEmailAddressId)?.emailAddress 
          || user.emailAddresses?.[0]?.emailAddress;

        if (primaryEmail) {
          const customers = await stripe.customers.list({
            email: primaryEmail,
            limit: 10, // Get more to find the right one
          });

          // Try to find a customer with an active subscription
          for (const customer of customers.data) {
            const subscriptions = await stripe.subscriptions.list({
              customer: customer.id,
              status: "active",
              limit: 1,
            });

            if (subscriptions.data.length > 0) {
              customerId = customer.id;
              hasActiveSubscription = true;
              subscription = subscriptions.data[0] || null;
              break;
            }
          }

          // If we found a customer but no subscription, still save the customerId
          if (!customerId && customers.data.length > 0) {
            customerId = customers.data[0].id;
          }

          // Save customerId to Clerk if we found one
          if (customerId) {
            try {
              await clerk.users.updateUser(user.id, {
                privateMetadata: { ...((user.privateMetadata as ClerkPrivateMetadata) || {}), stripeCustomerId: customerId } as ClerkPrivateMetadata,
              });
            } catch (err: unknown) {
              logger.error("Error updating Clerk user metadata", err, user.id);
            }
          }
        }
      } catch (err: unknown) {
        logger.error("Error searching by email", err, user.id);
      }
    }

    const currentIsPro = Boolean((user.publicMetadata as ClerkPublicMetadata)?.isPro);

    // Update Clerk if status doesn't match
    if (hasActiveSubscription && !currentIsPro) {
      try {
        await clerk.users.updateUser(user.id, {
          publicMetadata: { ...((user.publicMetadata as ClerkPublicMetadata) || {}), isPro: true } as ClerkPublicMetadata,
          privateMetadata: { ...((user.privateMetadata as ClerkPrivateMetadata) || {}), stripeCustomerId: customerId } as ClerkPrivateMetadata,
        });
        logger.info("Check-status: Pro status activated", { userId: user.id, customerId, wasUpdated: true });
    return Response.json({ 
      success: true,
      data: {
        isPro: true, 
        message: "Subscription found! Pro status activated.",
        wasUpdated: true,
        customerId
      },
      requestId,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        "X-Request-Id": requestId,
        "Content-Type": "application/json",
      },
    });
      } catch (err: unknown) {
        logger.error("Error updating Clerk user with Pro status", err, user.id);
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        return Response.json({ 
          error: "Subscription found but failed to activate Pro status",
          details: errorMessage 
        }, { status: 500 });
      }
    }

    return Response.json({ 
      success: true,
      data: {
        isPro: hasActiveSubscription && currentIsPro,
        hasActiveSubscription,
        currentIsPro,
        customerId,
        subscriptionId: subscription?.id,
        message: hasActiveSubscription ? "You have an active subscription" : "No active subscription found"
      },
      requestId,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        "X-Request-Id": requestId,
        "Content-Type": "application/json",
      },
    });
  } catch (error: unknown) {
    logger.error("Check status error", error);
    return createErrorResponse(
      error instanceof Error ? error.message : "Internal server error",
      requestId,
      500
    );
  }
}
