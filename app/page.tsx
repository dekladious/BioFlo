import Link from "next/link";
import { Sparkles, UtensilsCrossed, MoonStar } from "lucide-react";

const FEATURES = [
  {
    title: "Anxiety protocols",
    body: "Calm stress and improve resilience",
    Icon: Sparkles,
  },
  {
    title: "Nutrition & meal plans",
    body: "Optimize diet for your biology",
    Icon: UtensilsCrossed,
  },
  {
    title: "Sleep & recovery",
    body: "Tools to enhance sleep quality",
    Icon: MoonStar,
  },
];

export default function Home() {
  return (
    <div className="mx-auto mt-12 max-w-7xl px-3 sm:px-4">
      {/* HERO */}
      <section
        className="relative rounded-[22px] border border-white/10 bg-white/[0.045] backdrop-blur
                   shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_30px_60px_rgba(0,0,0,0.45)]
                   px-6 sm:px-10 md:px-14 py-10 md:py-14"
      >
        {/* soft glow underline behind primary CTA */}
        <div
          className="pointer-events-none absolute left-1/2 top-[132px] h-20 w-[420px] -translate-x-1/2 rounded-full blur-3xl opacity-50
                        bg-[radial-gradient(60%_60%_at_50%_50%,rgba(56,189,248,0.35),transparent_60%)]"
        />

        <div className="text-center">
          <h1 className="text-[40px] leading-[1.05] font-semibold md:text-[64px] tracking-tight">
            Your elite biohacking{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-400">
              copilot
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-3xl text-slate-300">
            BioFlo Pro provides expert wellness guidance personalized to your unique needs.
          </p>

          <div className="mt-7 flex items-center justify-center gap-3">
            <Link
              href="/subscribe"
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-sky-400 to-emerald-400 text-black font-medium
                         shadow-[0_16px_40px_rgba(56,189,248,0.35)] hover:brightness-110 transition will-change-transform"
            >
              Get BioFlo Pro
            </Link>
            <Link
              href="/chat"
              className="px-5 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition"
            >
              Try the chat
            </Link>
          </div>
        </div>

        {/* FEATURE CARDS */}
        <div className="mt-9 grid gap-5 md:grid-cols-3">
          {FEATURES.map(({ title, body, Icon }) => (
            <div
              key={title}
              className="group relative overflow-hidden rounded-[18px] border border-white/10 bg-white/[0.055] p-6
                         shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_20px_40px_rgba(0,0,0,0.35)]
                         hover:border-white/20 hover:bg-white/[0.07] transition"
            >
              {/* corner sheen */}
              <div
                className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl opacity-0
                              bg-[radial-gradient(60%_60%_at_50%_50%,rgba(56,189,248,0.25),transparent_60%)]
                              group-hover:opacity-100 transition"
              />
              <div className="flex items-center gap-3">
                <div
                  className="grid place-items-center rounded-xl p-2
                             bg-gradient-to-br from-sky-400/20 to-emerald-400/20
                             border border-white/10"
                >
                  <Icon className="h-5 w-5 text-slate-200" />
                </div>
                <div className="font-semibold">{title}</div>
              </div>
              <p className="mt-2 text-sm text-slate-300">{body}</p>
            </div>
          ))}
        </div>

        {/* soft card outline */}
        <div className="pointer-events-none absolute inset-0 rounded-[22px] ring-1 ring-white/5" />
      </section>

      {/* breathing room so the footer doesn't hug the hero on tall displays */}
      <div className="h-28" />
    </div>
  );
}
