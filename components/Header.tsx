"use client";

import React from "react";
import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProBadge } from "@/components/ProBadge";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b1117]/65 backdrop-blur supports-[backdrop-filter]:bg-[#0b1117]/55">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-3 sm:px-4">
        {/* LEFT: Brand */}
        <Link href="/" className="flex items-center gap-2">
          <div className="size-7 rounded-xl bg-gradient-to-br from-sky-500 to-emerald-500 shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset]" />
          <span className="font-semibold tracking-tight">BioFlo</span>
        </Link>

        {/* RIGHT: Primary nav + auth */}
        <div className="flex items-center gap-1 sm:gap-2">
          <nav className="hidden items-center gap-1 sm:gap-2 text-sm md:flex">
            <Link
              href="/chat"
              className="rounded-xl px-3 py-1.5 text-slate-200 transition hover:bg-white/5 hover:text-white"
            >
              Chat
            </Link>
            <Link
              href="/pricing"
              className="rounded-xl px-3 py-1.5 text-slate-200 transition hover:bg-white/5 hover:text-white"
            >
              Pricing
            </Link>
            <Link
              href="/analytics"
              className="rounded-xl px-3 py-1.5 text-slate-200 transition hover:bg-white/5 hover:text-white"
            >
              Analytics
            </Link>
            <Link
              href="/protocols"
              className="rounded-xl px-3 py-1.5 text-slate-200 transition hover:bg-white/5 hover:text-white"
            >
              Protocols
            </Link>
          </nav>

          <div className="mx-1 hidden h-5 w-px bg-white/10 md:block" />

          <ThemeToggle />

          <SignedOut>
            <Link
              href="/sign-in"
              className="ml-1 rounded-xl bg-white px-3 py-1.5 text-sm font-medium text-black transition hover:brightness-110"
            >
              Sign in
            </Link>
          </SignedOut>

          <SignedIn>
            <div className="flex items-center">
              <UserButton afterSignOutUrl="/" />
              <ProBadge />
            </div>
          </SignedIn>
        </div>
      </div>
    </header>
  );
}

