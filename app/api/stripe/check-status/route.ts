import Stripe from "stripe";
import { currentUser, clerkClient } from "@clerk/nextjs/server";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("STRIPE_SECRET_KEY is missing");
      return Response.json({ error: "Stripe configuration error" }, { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" as any });
    const clerk = await clerkClient();
    let customerId = (user.privateMetadata as any)?.stripeCustomerId as string | undefined;
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
      } catch (err: any) {
        console.error("Error checking subscriptions by customerId:", err.message);
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
                privateMetadata: { ...((user.privateMetadata as any) || {}), stripeCustomerId: customerId },
              });
            } catch (err: any) {
              console.error("Error updating Clerk user metadata:", err.message);
            }
          }
        }
      } catch (err: any) {
        console.error("Error searching by email:", err.message);
      }
    }

    const currentIsPro = Boolean((user.publicMetadata as any)?.isPro);

    // Update Clerk if status doesn't match
    if (hasActiveSubscription && !currentIsPro) {
      try {
        await clerk.users.updateUser(user.id, {
          publicMetadata: { ...((user.publicMetadata as any) || {}), isPro: true },
          privateMetadata: { ...((user.privateMetadata as any) || {}), stripeCustomerId: customerId },
        });
        return Response.json({ 
          isPro: true, 
          message: "Subscription found! Pro status activated.",
          wasUpdated: true,
          customerId
        });
      } catch (err: any) {
        console.error("Error updating Clerk user with Pro status:", err.message);
        return Response.json({ 
          error: "Subscription found but failed to activate Pro status",
          details: err.message 
        }, { status: 500 });
      }
    }

    return Response.json({ 
      isPro: hasActiveSubscription && currentIsPro,
      hasActiveSubscription,
      currentIsPro,
      customerId,
      subscriptionId: subscription?.id,
      message: hasActiveSubscription ? "You have an active subscription" : "No active subscription found"
    });
  } catch (error: any) {
    console.error("Check status error:", error);
    return Response.json({ 
      error: error.message || "Internal server error",
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined
    }, { status: 500 });
  }
}
