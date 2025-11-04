import "./globals.css";
import { ClerkProvider, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export const metadata = {
  title: "BioFlo",
  description: "Your biohacking personal assistant",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="bg-white text-slate-900">
          <header className="border-b">
            <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
              <Link href="/" className="font-semibold">BioFlo</Link>
              <nav className="flex items-center gap-3">
                <Link href="/chat" className="text-sm">Chat</Link>
                <Link href="/subscribe" className="text-sm">Subscribe</Link>
                <SignedOut>
                  <Link href="/sign-in" className="text-sm px-3 py-1 rounded bg-black text-white">Sign in</Link>
                </SignedOut>
                <SignedIn>
                  <UserButton afterSignOutUrl="/" />
                </SignedIn>
              </nav>
            </div>
          </header>
          <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
