import Stripe from "stripe";
import { auth, currentUser } from "@clerk/nextjs/server";

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" as any });

    // We stored the Stripe customer id on the Clerk user (privateMetadata) after checkout (webhook).
    const user = await currentUser();
    const customerId = (user?.privateMetadata as any)?.stripeCustomerId as string | undefined;
    if (!customerId) {
      return Response.json({ error: "No Stripe customer found" }, { status: 400 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.APP_BASE_URL}/chat`,
    });

    return Response.json({ url: session.url });
  } catch (error: any) {
    console.error("Portal route error:", error);
    return Response.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
