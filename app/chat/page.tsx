import { currentUser } from "@clerk/nextjs/server";
import ChatInterface from "@/components/ChatInterface";
import CheckoutSuccess from "@/components/CheckoutSuccess";
import { ClerkPublicMetadata } from "@/types";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  // Middleware already ensures user is authenticated
  const user = await currentUser();
  const isPro = Boolean((user?.publicMetadata as ClerkPublicMetadata)?.isPro);
  const params = await searchParams;
  const isCheckoutSuccess = params?.checkout === "success";

  if (!isPro) {
    return (
      <main className="max-w-2xl mx-auto p-6 space-y-4">
        {isCheckoutSuccess && <CheckoutSuccess />}
        <h1 className="text-2xl font-semibold">BioFlo Pro required</h1>
        <p className="text-slate-600">Get full access for £14.99/month.</p>
        <div className="flex gap-2">
          <a href="/subscribe" className="inline-block px-4 py-2 bg-black text-white rounded-lg">
            {isCheckoutSuccess ? "Check Subscription Status" : "Subscribe"}
          </a>
          {isCheckoutSuccess && (
            <a
              href="/chat"
              className="px-4 py-2 border rounded-lg inline-block"
            >
              Refresh
            </a>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-4">
      {isCheckoutSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 mb-4">
          <p className="font-semibold">Welcome to BioFlo Pro! 🎉</p>
          <p className="text-sm mt-1">Your subscription is active. Enjoy unlimited access!</p>
        </div>
      )}
      <h1 className="text-2xl font-semibold">BioFlo Chat</h1>
      <ChatInterface />
    </main>
  );
}
