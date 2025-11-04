import Stripe from "stripe";
import { currentUser } from "@clerk/nextjs/server";

export async function POST() {
  try {
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      console.error("No user found - user:", user);
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.STRIPE_PRICE_ID;
    const baseUrl = process.env.APP_BASE_URL;

    if (!stripeSecretKey) {
      console.error("STRIPE_SECRET_KEY is missing");
      return Response.json({ error: "Stripe configuration error" }, { status: 500 });
    }

    if (!priceId) {
      console.error("STRIPE_PRICE_ID is missing");
      return Response.json({ error: "Stripe price configuration error" }, { status: 500 });
    }

    if (!baseUrl) {
      console.error("APP_BASE_URL is missing");
      return Response.json({ error: "Application configuration error" }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" as any });

    // For subscription mode, customer is automatically created by Stripe
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/chat?checkout=success`,
      cancel_url: `${baseUrl}/subscribe`,
      metadata: { clerkUserId: userId },
    });

    if (!session.url) {
      console.error("Stripe session created but no URL returned");
      return Response.json({ error: "Failed to create checkout session" }, { status: 500 });
    }

    return Response.json({ url: session.url });
  } catch (error: any) {
    console.error("Checkout route error:", error);
    return Response.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
