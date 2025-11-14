"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";

const pane =
  "rounded-[18px] border border-white/10 bg-white/[0.035] backdrop-blur shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_30px_rgba(0,0,0,0.25)]";

const features = [
  "Personalized protocols",
  "Nutrition & meal plans",
  "Sleep & recovery guidance",
  "Conversation history & memory",
  "Priority responses",
];

function PriceCard({
  name,
  price,
  period,
  highlight = false,
  children,
}: {
  name: string;
  price: string;
  period: "/mo" | "/year";
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`${pane} p-6 ${highlight ? "ring-1 ring-sky-400/30 border-white/20" : ""}`}>
      <div className="text-slate-300">{name}</div>
      <div className="mt-2 text-4xl font-semibold">
        £{price}
        <span className="text-lg align-top">{period}</span>
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2">
            <Check className="size-4 text-emerald-400" />
            <span className="text-slate-200">{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">{children}</div>
    </div>
  );
}

export default function PricingPage() {
  const [yearly, setYearly] = useState(true);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className={`${pane} p-8`}>
        <h1 className="text-3xl md:text-4xl font-semibold text-center">Subscribe</h1>
        <p className="text-center text-slate-300 mt-2">Choose the plan that's right for you.</p>

        {/* Toggle */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => setYearly(false)}
            className={`px-3 py-1.5 rounded-xl border text-sm ${!yearly ? "bg-white text-black" : "border-white/10 text-slate-300"}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setYearly(true)}
            className={`px-3 py-1.5 rounded-xl border text-sm ${yearly ? "bg-white text-black" : "border-white/10 text-slate-300"}`}
          >
            Yearly
          </button>
        </div>

        {/* Cards */}
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          <PriceCard name="Basic" price={yearly ? "100" : "9.99"} period={yearly ? "/year" : "/mo"}>
            <Link href="/subscribe" className="inline-block w-full text-center px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5">
              Get Started
            </Link>
          </PriceCard>

          <PriceCard name="Pro" price={yearly ? "150" : "14.99"} period={yearly ? "/year" : "/mo"} highlight>
            <Link
              href="/subscribe"
              className="inline-block w-full text-center px-4 py-2 rounded-xl
                         bg-gradient-to-r from-sky-400 to-emerald-400 text-black font-medium
                         shadow-[0_12px_30px_rgba(56,189,248,0.35)] hover:brightness-110"
            >
              Go Pro
            </Link>
          </PriceCard>

          <PriceCard name="Enterprise" price={yearly ? "500" : "49.99"} period={yearly ? "/year" : "/mo"}>
            <Link href="/contact" className="inline-block w-full text-center px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5">
              Contact Sales
            </Link>
          </PriceCard>
        </div>
      </section>

      {/* Comparison */}
      <section className={`${pane} p-6`}>
        <div className="text-sm text-slate-300">What's included</div>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          {["Nutrition", "Sleep", "Anxiety", "Training"].map((k) => (
            <div key={k} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-center">
              {k}
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className={`${pane} p-6`}>
        <h2 className="text-xl font-semibold mb-3">FAQ</h2>
        <details className="rounded-xl border border-white/10 p-4 mb-2 bg-white/[0.04]">
          <summary className="cursor-pointer font-medium">Can I cancel anytime?</summary>
          <p className="mt-2 text-slate-300 text-sm">
            Yes. Manage your plan from the billing portal; you'll keep access until the end of the period.
          </p>
        </details>
        <details className="rounded-xl border border-white/10 p-4 mb-2 bg-white/[0.04]">
          <summary className="cursor-pointer font-medium">Is this medical advice?</summary>
          <p className="mt-2 text-slate-300 text-sm">
            No—BioFlo is educational only and not a substitute for professional medical care.
          </p>
        </details>
        <details className="rounded-xl border border-white/10 p-4 bg-white/[0.04]">
          <summary className="cursor-pointer font-medium">Do you offer teams?</summary>
          <p className="mt-2 text-slate-300 text-sm">
            Yes—Enterprise includes SSO and custom branding. Contact us for licensing.
          </p>
        </details>
      </section>
    </div>
  );
}
