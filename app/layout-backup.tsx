import "./globals.css";

import React from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" });

export const metadata = {
  title: "BioFlo",
  description: "Your elite biohacking copilot",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark" suppressHydrationWarning>
        <body className={`${inter.className} min-h-screen bg-[#0b1117] text-slate-100 antialiased`}>
          <main className="mx-auto max-w-7xl px-3 py-8 sm:px-4">{children}</main>
          <footer className="mx-auto mb-8 mt-16 max-w-7xl text-center text-xs text-slate-400">
            Educational only · Not medical advice
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}


