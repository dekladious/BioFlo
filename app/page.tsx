import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";

export default function Home() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
      {/* Hero Section */}
      <div className="text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 mb-8 shadow-2xl animate-pulse-glow">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold mb-6">
          <span className="gradient-text">Elite Biohacking</span>
          <br />
          <span className="text-slate-900">Personal Assistant</span>
        </h1>
        
        <p className="text-xl sm:text-2xl text-slate-600 mb-4 max-w-2xl mx-auto leading-relaxed">
          Get personalized, evidence-based protocols to optimize your health, performance, and longevity.
        </p>
        
        <p className="text-base text-slate-500 mb-10 max-w-xl mx-auto">
          Powered by AI. Built on science. Tailored to you.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <SignedIn>
            <Link 
              href="/chat"
              className="px-8 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-2xl font-semibold text-lg hover:from-violet-700 hover:to-purple-700 transition-all shadow-xl shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 active:scale-95"
            >
              Open Chat
            </Link>
          </SignedIn>
          <SignedOut>
            <Link 
              href="/sign-in"
              className="px-8 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-2xl font-semibold text-lg hover:from-violet-700 hover:to-purple-700 transition-all shadow-xl shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 active:scale-95"
            >
              Get Started
            </Link>
            <Link 
              href="/subscribe"
              className="px-8 py-4 bg-white/80 backdrop-blur-sm border-2 border-slate-200 text-slate-900 rounded-2xl font-semibold text-lg hover:bg-white hover:border-violet-300 transition-all shadow-lg hover:scale-105 active:scale-95"
            >
              View Plans
            </Link>
          </SignedOut>
        </div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-20">
          {[
            {
              icon: "💊",
              title: "Supplement Stack",
              description: "Personalized supplement recommendations based on your goals",
            },
            {
              icon: "😴",
              title: "Sleep Optimization",
              description: "Circadian rhythm alignment and sleep quality protocols",
            },
            {
              icon: "📋",
              title: "Meal Planning",
              description: "Custom meal plans with macro optimization",
            },
            {
              icon: "🎯",
              title: "Protocol Builder",
              description: "Comprehensive multi-phase biohacking protocols",
            },
            {
              icon: "🌸",
              title: "Women's Health",
              description: "Cycle-based optimization and hormonal protocols",
            },
            {
              icon: "🔬",
              title: "Evidence-Based",
              description: "Built on latest research and best practices",
            },
          ].map((feature, i) => (
            <div 
              key={i}
              className="glass p-6 rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-105 border border-slate-200/50"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="font-semibold text-slate-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
