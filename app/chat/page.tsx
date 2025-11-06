import { currentUser } from "@clerk/nextjs/server";
import ChatInterface from "@/components/ChatInterface";
import CheckoutSuccess from "@/components/CheckoutSuccess";
import { ClerkPublicMetadata } from "@/types";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const user = await currentUser();
  const isPro = Boolean((user?.publicMetadata as ClerkPublicMetadata)?.isPro);
  const params = await searchParams;
  const isCheckoutSuccess = params?.checkout === "success";

  if (!isPro) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-2xl mx-auto">
          {isCheckoutSuccess && <CheckoutSuccess />}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 mb-4 shadow-lg">
              <span className="text-white text-2xl">🔒</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-3">BioFlo Pro Required</h1>
            <p className="text-lg text-slate-600 mb-2">
              Unlock unlimited access to personalized biohacking protocols
            </p>
            <p className="text-sm text-slate-500">
              £14.99/month · Cancel anytime
            </p>
          </div>
          
          <div className="glass rounded-2xl p-8 border border-slate-200/50 shadow-xl">
            <div className="space-y-4 mb-6">
              {[
                "Personalized protocol generation",
                "Supplement recommendations",
                "Meal planning & nutrition",
                "Sleep optimization",
                "Women's health protocols",
                "Priority support",
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-slate-700">{feature}</span>
                </div>
              ))}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <a 
                href="/subscribe" 
                className="flex-1 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-semibold hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 text-center"
              >
                {isCheckoutSuccess ? "Check Subscription Status" : "Subscribe Now"}
              </a>
              {isCheckoutSuccess && (
                <a
                  href="/chat"
                  className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-semibold hover:border-violet-300 transition-all text-center"
                >
                  Refresh
                </a>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {isCheckoutSuccess && (
        <div className="mb-6 glass rounded-2xl p-4 border border-green-200/50 bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-green-900">Welcome to BioFlo Pro! 🎉</p>
              <p className="text-sm text-green-700">Your subscription is active. Enjoy unlimited access!</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="glass rounded-3xl p-6 sm:p-8 border border-slate-200/50 shadow-2xl min-h-[600px]">
        <ChatInterface />
      </div>
    </main>
  );
}
