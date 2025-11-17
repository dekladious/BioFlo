import "./globals.css";

import React from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";

import Background from "@/components/Background";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" });

export const metadata = {
  title: "BioFlo",
  description: "Your elite biohacking copilot",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  const stored = localStorage.getItem('bioflo-theme');
                  const isDark = stored ? stored === 'dark' : true;
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                })();
              `,
            }}
          />
        </head>
        <body className={`${inter.className} min-h-screen bg-[#0b1117] dark:bg-[#0b1117] bg-white text-slate-100 dark:text-slate-100 text-slate-900 antialiased`}>
          <Background />
          <Header />
          <MobileNav />
          <main className="mx-auto max-w-7xl px-3 py-8 sm:px-4">{children}</main>
          <footer className="mx-auto mb-8 mt-16 max-w-7xl text-center text-xs text-slate-400 dark:text-slate-400 text-slate-600">
            Educational only · Not medical advice
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
