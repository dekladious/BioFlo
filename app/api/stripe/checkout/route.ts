import Stripe from "stripe";
import { auth, currentUser } from "@clerk/nextjs/server";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress;

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" as any });
  const priceId = process.env.STRIPE_PRICE_ID!;
  const baseUrl = process.env.APP_BASE_URL!;

  // Create or reuse a Customer by email; attach clerkUserId in metadata
  const customers = await stripe.customers.list({ email, limit: 1 });
  const existing = customers.data[0];
  const customer = existing
    ? await stripe.customers.update(existing.id, { metadata: { clerkUserId: userId } })
    : await stripe.customers.create({ email: email || undefined, metadata: { clerkUserId: userId } });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/chat?checkout=success`,
    cancel_url: `${baseUrl}/subscribe`,
    customer: customer.id,
  });

  return Response.json({ url: session.url });
}
