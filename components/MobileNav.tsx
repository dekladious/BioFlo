"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Home, MessageSquare, Calendar, Target, Shield, Settings, BarChart3 } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/check-ins", label: "Check-ins", icon: Calendar },
  { href: "/protocols", label: "Protocols", icon: Target },
  { href: "/care-mode", label: "Care Mode", icon: Shield },
  { href: "/admin/analytics", label: "Admin", icon: BarChart3 },
];

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-4 right-4 z-50 p-2 rounded-lg bg-white/10 backdrop-blur border border-white/20 text-white hover:bg-white/20 transition"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`md:hidden fixed top-0 right-0 z-40 h-full w-64 bg-[#0b1117] border-l border-white/10 shadow-2xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <Link href="/" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
              <div className="size-7 rounded-xl bg-gradient-to-br from-sky-500 to-emerald-500" />
              <span className="font-semibold tracking-tight">BioFlo</span>
            </Link>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                    isActive
                      ? "bg-sky-400/20 text-white border border-sky-400/30"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="size-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-white/10">
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-white/5 hover:text-white transition"
            >
              <Settings className="size-5" />
              <span className="font-medium">Settings</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

