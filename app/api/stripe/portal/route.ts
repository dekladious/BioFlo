import Stripe from "stripe";
import { auth, currentUser } from "@clerk/nextjs/server";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" as any });

  const user = await currentUser();
  const customerId = (user?.privateMetadata as any)?.stripeCustomerId as string | undefined;
  if (!customerId) return new Response("No Stripe customer", { status: 400 });

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.APP_BASE_URL}/chat`,
  });

  return Response.json({ url: session.url });
}
