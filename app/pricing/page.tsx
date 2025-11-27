"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Sparkles, ShieldCheck, Activity } from "lucide-react";
import { pane, paneMuted, gradientText, quickAction } from "@/lib/utils/theme";

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
    <div
      className={`${pane} p-6 ${
        highlight ? "border-accent-cyan/40 ring-1 ring-accent-cyan/20 bg-white/10" : ""
      }`}
    >
      <div className="text-xs uppercase tracking-wide text-white/60">{name}</div>
      <div className="mt-1 text-sm text-white/70">{subtitle}</div>
      <div className="mt-3 text-4xl font-semibold text-white">{priceLabel}</div>
      <ul className="mt-6 space-y-2 text-sm text-white/80">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2">
            <Check className="size-4 text-emerald-400" />
            <span>{feature}</span>
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
      <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-bioflo-hero p-8 shadow-[0_30px_90px_rgba(5,5,11,0.7)]">
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(93,239,251,0.35),transparent_60%)] blur-3xl" />
          <div className="absolute right-0 top-1/3 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(177,149,255,0.3),transparent_60%)] blur-3xl" />
        </div>
        <div className="relative z-10 space-y-6 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-white/60">Pricing</p>
          <h1 className="text-3xl font-semibold text-white md:text-4xl">
            Fuel your health OS with{" "}
            <span className={`${gradientText} text-4xl font-bold`}>smart plans.</span>
          </h1>
          <p className="text-base text-white/70">
            Choose the tier that matches your stack—foundational guidance, full wearable orchestration, or enterprise-level
            deployment.
          </p>

          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                billingCycle === "monthly"
                  ? "border-white bg-white text-black"
                  : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                billingCycle === "yearly"
                  ? "border-white bg-white text-black"
                  : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              Yearly <span className="ml-2 text-[11px] font-medium text-emerald-200">Save 15%</span>
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {[
              { label: "Wearables orchestration", helper: "Oura, Apple Health, Garmin" },
              { label: "AI safety layer", helper: "Enterprise guardrails" },
            ].map((item) => (
              <span key={item.label} className={`${quickAction} border-white/15 bg-white/5 px-4`}>
                <span className="text-xs font-semibold text-white">{item.label}</span>
                <span className="block text-[10px] text-white/60">{item.helper}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
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

      <section className={`${pane} p-6`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/60">What’s included</p>
            <h2 className="text-lg font-semibold text-white">Core modules</h2>
          </div>
          <div className="flex gap-2">
            <span className={`${quickAction} border-white/15 bg-white/5 px-3 py-1 text-[11px]`}>Live protocols</span>
            <span className={`${quickAction} border-white/15 bg-white/5 px-3 py-1 text-[11px]`}>Safety layer</span>
          </div>
        </div>
        <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
          {["Nutrition", "Sleep", "Anxiety & calm", "Training & recovery"].map((k) => (
            <div key={k} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-4 text-center text-white/80">
              {k}
            </div>
          ))}
        </div>
      </section>

      <section className={`${pane} p-6`}>
        <h2 className="mb-3 text-xl font-semibold text-white">FAQ</h2>
        {[
          {
            q: "Can I cancel anytime?",
            a: "Yes. Manage your plan from the billing portal; you retain access until the end of the billing period.",
          },
          {
            q: "Is this medical advice?",
            a: "No—BioFlo is educational and not a substitute for professional medical care.",
          },
          {
            q: "Do you support teams?",
            a: "Enterprise includes SSO, custom branding, and API hooks. Contact us for licensing.",
          },
        ].map((item) => (
          <details key={item.q} className="mb-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80 last:mb-0">
            <summary className="cursor-pointer text-white">{item.q}</summary>
            <p className="mt-2 text-white/70">{item.a}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
