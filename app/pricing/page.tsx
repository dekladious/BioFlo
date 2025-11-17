"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";

const pane =
  "rounded-[18px] border border-white/10 bg-white/[0.035] backdrop-blur shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_30px_rgba(0,0,0,0.25)]";

function PriceCard({
  name,
  subtitle,
  priceLabel,
  highlight = false,
  features,
  children,
}: {
  name: string;
  subtitle: string;
  priceLabel: string;
  highlight?: boolean;
  features: string[];
  children: React.ReactNode;
}) {
  return (
    <div className={`${pane} p-6 ${highlight ? "ring-1 ring-sky-400/30 border-white/20" : ""}`}>
      <div className="text-slate-300 uppercase tracking-wide text-xs">{name}</div>
      <div className="mt-1 text-sm text-slate-400">{subtitle}</div>
      <div className="mt-3 text-4xl font-semibold text-white">{priceLabel}</div>
      <ul className="mt-6 space-y-2 text-sm">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2">
            <Check className="size-4 text-emerald-400" />
            <span className="text-slate-200">{feature}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">{children}</div>
    </div>
  );
}

const PRO_MONTHLY = 24.99;
const ENTERPRISE_MONTHLY = 249;
const DISCOUNT = 0.15;

function formatPrice(amount: number) {
  if (amount >= 100) return `£${amount.toFixed(0)}`;
  return `£${amount.toFixed(2)}`;
}

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const proPriceLabel =
    billingCycle === "monthly"
      ? `${formatPrice(PRO_MONTHLY)}/mo`
      : `${formatPrice(PRO_MONTHLY * 12 * (1 - DISCOUNT))}/yr`;

  const enterprisePriceLabel =
    billingCycle === "monthly"
      ? `${formatPrice(ENTERPRISE_MONTHLY)}/mo`
      : `${formatPrice(ENTERPRISE_MONTHLY * 12 * (1 - DISCOUNT))}/yr`;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className={`${pane} p-8`}>
        <h1 className="text-3xl md:text-4xl font-semibold text-center">Subscribe</h1>
        <p className="text-center text-slate-300 mt-2">Choose the plan that matches your stack.</p>

        {/* Toggle */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`px-3 py-1.5 rounded-xl border text-sm ${billingCycle === "monthly" ? "bg-white text-black" : "border-white/10 text-slate-300"}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle("yearly")}
            className={`px-3 py-1.5 rounded-xl border text-sm flex items-center gap-1 ${
              billingCycle === "yearly" ? "bg-white text-black" : "border-white/10 text-slate-300"
            }`}
          >
            Yearly <span className="text-[11px] text-emerald-400 font-medium">Save 15%</span>
          </button>
        </div>

        {/* Cards */}
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          <PriceCard
            name="Basic"
            subtitle="Solo explorers getting started"
            priceLabel="Free"
            features={[
              "Daily AI guidance & check-ins",
              "Foundational sleep & nutrition cues",
              "Email summaries each week",
              "Community updates",
            ]}
          >
            <Link href="/subscribe" className="inline-block w-full text-center px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5">
              Get Started
            </Link>
          </PriceCard>

          <PriceCard
            name="Pro"
            subtitle="Wearables + full tool stack"
            priceLabel={proPriceLabel}
            highlight
            features={[
              "All Basic benefits",
              "Wearables sync (Oura, Apple Health, Garmin)",
              "Full tool suite: protocols, sleep & meal planners",
              "Priority support & faster responses",
            ]}
          >
            <Link
              href="/subscribe"
              className="inline-block w-full text-center px-4 py-2 rounded-xl
                         bg-gradient-to-r from-sky-400 to-emerald-400 text-black font-medium
                         shadow-[0_12px_30px_rgba(56,189,248,0.35)] hover:brightness-110"
            >
              Go Pro
            </Link>
          </PriceCard>

          <PriceCard
            name="Enterprise"
            subtitle="Teams, clinics & corporate wellness"
            priceLabel={enterprisePriceLabel}
            features={[
              "Everything in Pro",
              "Company SSO & role-based admin controls",
              "Hook into internal data lakes & HR/wellness apps",
              "Dedicated success architect + SLA",
            ]}
          >
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
