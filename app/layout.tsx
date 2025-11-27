import "./globals.css";

import React from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";

import Background from "@/components/Background";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { SettingsCog } from "@/components/SettingsCog";
import { PageShell } from "@/components/layout/PageShell";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" });

export const metadata = {
  title: "BioFlo",
  description: "Your elite biohacking copilot",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning className="dark">
        <head>
          {/* Inline script to prevent flash of wrong theme */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  try {
                    const stored = localStorage.getItem('bioflo-theme');
                    let isDark = true;
                    
                    if (stored === 'light') {
                      isDark = false;
                    } else if (stored === 'system') {
                      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    }
                    
                    document.documentElement.classList.toggle('dark', isDark);
                    document.documentElement.classList.toggle('light', !isDark);
                    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
                  } catch (e) {}
                })();
              `,
            }}
          />
        </head>
        <body className={`${inter.className} min-h-screen text-base antialiased`}>
          <ThemeProvider>
            <Background />
            <SettingsCog />
            <div className="relative flex min-h-screen flex-col">
              <Header />
              <MobileNav />
              <main className="flex-1">
                <PageShell>{children}</PageShell>
              </main>
              <footer className="mb-10 mt-8 w-full px-4 text-center text-xs text-[color:var(--text-soft)]">
                Educational only · Not medical advice
              </footer>
            </div>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
