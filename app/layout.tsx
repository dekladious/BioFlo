import "./globals.css";
import { ClerkProvider, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const metadata = {
  title: "BioFlo - Your Elite Biohacking Assistant",
  description: "Personalized biohacking protocols, supplements, and optimization strategies powered by AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className="h-full">
        <body className="h-full">
          <ErrorBoundary>
            <div className="min-h-screen flex flex-col">
              <header className="sticky top-0 z-50 glass border-b border-slate-200/50 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                        <span className="text-white text-sm font-bold">BF</span>
                      </div>
                      <span className="text-xl font-bold gradient-text">BioFlo</span>
                    </Link>
                    <nav className="flex items-center gap-6">
                      <Link 
                        href="/chat" 
                        className="text-sm font-medium text-slate-700 hover:text-violet-600 transition-colors"
                      >
                        Chat
                      </Link>
                      <Link 
                        href="/subscribe" 
                        className="text-sm font-medium text-slate-700 hover:text-violet-600 transition-colors"
                      >
                        Subscribe
                      </Link>
                      <SignedOut>
                        <Link 
                          href="/sign-in" 
                          className="text-sm px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40"
                        >
                          Sign in
                        </Link>
                      </SignedOut>
                      <SignedIn>
                        <UserButton 
                          afterSignOutUrl="/"
                          appearance={{
                            elements: {
                              avatarBox: "w-9 h-9",
                            },
                          }}
                        />
                      </SignedIn>
                    </nav>
                  </div>
                </div>
              </header>
              <main className="flex-1">{children}</main>
            </div>
          </ErrorBoundary>
        </body>
      </html>
    </ClerkProvider>
  );
}
