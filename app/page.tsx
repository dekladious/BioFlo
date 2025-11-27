"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  ArrowRight,
  Check,
  Moon,
  Zap,
  Brain,
  Heart,
  TrendingUp,
  Shield,
  Sparkles,
  Star,
  Target,
  Activity,
  MessageSquare,
  FlaskConical,
  BookOpen,
  Users,
  Cpu,
  BarChart3,
  Loader2,
  Calendar,
  Sun,
  Coffee,
  Smartphone,
  Thermometer,
} from "lucide-react";

// Plan items for the demo
const planItemsData = [
  { Icon: Coffee, text: "No caffeine after 1pm", time: "1:00 PM" },
  { Icon: Smartphone, text: "Blue light blocking mode", time: "8:00 PM" },
  { Icon: Moon, text: "Wind-down routine begins", time: "9:00 PM" },
  { Icon: Thermometer, text: "Cool room to 65-68°F", time: "9:30 PM" },
];

type DemoPhase = "user1" | "thinking1" | "ai1" | "user2" | "thinking2" | "building" | "showPlan" | "pause";

function AnimatedAIDemo() {
  const [phase, setPhase] = useState<DemoPhase>("user1");
  const [displayedText, setDisplayedText] = useState("");
  const [planItems, setPlanItems] = useState(0);

  const messages = {
    user1: "How was my sleep last night? Any issues?",
    ai1: "Based on your Ultrahuman data, you got 6.8 hours with a sleep score of 74. Your deep sleep was 18% below baseline, and you had 3 wake periods after 2am. This correlates with your late caffeine intake yesterday.",
    user2: "Can you update my plan to help me sleep better tonight?",
  };

  // Phase transitions
  useEffect(() => {
    const timings: Record<DemoPhase, number> = {
      user1: 1800,
      thinking1: 2200,
      ai1: 4000,
      user2: 2000,
      thinking2: 2500,
      building: 3000,
      showPlan: 4500,
      pause: 2000,
    };

    const nextPhase: Record<DemoPhase, DemoPhase> = {
      user1: "thinking1",
      thinking1: "ai1",
      ai1: "user2",
      user2: "thinking2",
      thinking2: "building",
      building: "showPlan",
      showPlan: "pause",
      pause: "user1",
    };

    const timer = setTimeout(() => {
      const next = nextPhase[phase];
      setPhase(next);
      setDisplayedText("");
      if (next === "user1") setPlanItems(0);
    }, timings[phase]);

    return () => clearTimeout(timer);
  }, [phase]);

  // Typing effect
  useEffect(() => {
    if (phase !== "user1" && phase !== "ai1" && phase !== "user2") return;
    const text = messages[phase as keyof typeof messages];
    if (!text) return;

    let i = 0;
    const speed = phase.startsWith("user") ? 25 : 12;
    const interval = setInterval(() => {
      if (i <= text.length) {
        setDisplayedText(text.slice(0, i));
        i++;
      } else {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [phase]);

  // Animate plan items
  useEffect(() => {
    if (phase !== "building") return;
    const interval = setInterval(() => {
      setPlanItems((prev) => (prev < planItemsData.length ? prev + 1 : prev));
    }, 500);
    return () => clearInterval(interval);
  }, [phase]);

  // PLAN VIEW
  if (phase === "showPlan" || phase === "pause") {
    return (
      <div className="relative rounded-3xl border border-accent-green/30 bg-[#0a0a12]/95 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 bg-gradient-to-r from-accent-green/10 to-accent-cyan/10">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-xl bg-gradient-to-br from-accent-green to-accent-cyan flex items-center justify-center">
              <Calendar className="size-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Today&apos;s Optimized Plan</p>
              <p className="text-xs text-accent-green">Sleep optimization active</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-accent-green/10 border border-accent-green/20 px-3 py-1">
            <Check className="size-3 text-accent-green" />
            <span className="text-xs text-accent-green font-medium">Updated</span>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Sun className="size-4 text-yellow-400" />
            <span className="text-sm text-white/70">Focus: Better sleep tonight</span>
          </div>

          <div className="space-y-2.5">
            {planItemsData.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition-all hover:bg-white/[0.07]"
              >
                <div className="rounded-lg bg-accent-cyan/10 p-2">
                  <item.Icon className="size-4 text-accent-cyan" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{item.text}</p>
                  <p className="text-xs text-white/50">{item.time}</p>
                </div>
                <div className="size-5 rounded-full border-2 border-white/20" />
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-accent-purple/20 bg-accent-purple/5 p-3">
            <p className="text-xs text-accent-purple font-medium mb-1">AI Prediction</p>
            <p className="text-sm text-white/80">
              These changes should improve your deep sleep by ~15%.
            </p>
          </div>
        </div>

        <div className="border-t border-white/10 p-4 bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">4 tasks for better sleep</span>
            <span className="text-xs text-accent-cyan font-medium">View full plan →</span>
          </div>
        </div>
      </div>
    );
  }

  // CHAT VIEW
  return (
    <div className="relative rounded-3xl border border-white/10 bg-[#0a0a12]/95 backdrop-blur-xl shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-xl bg-gradient-to-br from-accent-cyan to-accent-purple flex items-center justify-center">
            <Sparkles className="size-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">BioFlo AI</p>
            <p className="text-xs text-accent-green flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-accent-green animate-pulse" />
              {phase === "thinking1" || phase === "thinking2" || phase === "building" ? "Analyzing..." : "Online"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 py-1">
          <Activity className="size-3 text-accent-cyan" />
          <span className="text-xs text-white/60">Ultrahuman connected</span>
        </div>
      </div>

      <div className="p-5 space-y-3 h-[340px] overflow-hidden">
        {/* User 1 */}
        {(phase !== "user1" || displayedText) && (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-accent-cyan/20 border border-accent-cyan/30 text-white">
              <p className="text-sm">
                {phase === "user1" ? displayedText : messages.user1}
                {phase === "user1" && <span className="inline-block w-0.5 h-4 bg-white ml-0.5 animate-pulse" />}
              </p>
            </div>
          </div>
        )}

        {/* Thinking 1 */}
        {phase === "thinking1" && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-3 bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <Loader2 className="size-4 text-accent-purple animate-spin" />
                <span className="text-sm text-white/60">Analyzing your sleep data...</span>
              </div>
            </div>
          </div>
        )}

        {/* AI 1 */}
        {(phase === "ai1" || phase === "user2" || phase === "thinking2" || phase === "building") && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-white/5 border border-white/10 text-white/90">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="size-3.5 text-accent-purple" />
                <span className="text-xs font-medium text-accent-purple">Sleep Analysis</span>
              </div>
              <p className="text-sm leading-relaxed">
                {phase === "ai1" ? displayedText : messages.ai1}
                {phase === "ai1" && <span className="inline-block w-0.5 h-4 bg-accent-cyan ml-0.5 animate-pulse" />}
              </p>
            </div>
          </div>
        )}

        {/* User 2 */}
        {(phase === "user2" || phase === "thinking2" || phase === "building") && phase !== "user2" && (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-accent-cyan/20 border border-accent-cyan/30 text-white">
              <p className="text-sm">{messages.user2}</p>
            </div>
          </div>
        )}
        {phase === "user2" && (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-accent-cyan/20 border border-accent-cyan/30 text-white">
              <p className="text-sm">
                {displayedText}
                <span className="inline-block w-0.5 h-4 bg-white ml-0.5 animate-pulse" />
              </p>
            </div>
          </div>
        )}

        {/* Thinking 2 */}
        {phase === "thinking2" && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-5 py-4 bg-gradient-to-r from-accent-purple/10 to-accent-cyan/10 border border-accent-purple/20">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Brain className="size-5 text-accent-purple" />
                  <span className="absolute -top-1 -right-1 size-2 rounded-full bg-accent-green animate-ping" />
                </div>
                <span className="text-sm font-medium text-white">Creating your optimized plan...</span>
              </div>
            </div>
          </div>
        )}

        {/* Building Plan */}
        {phase === "building" && (
          <div className="flex justify-start">
            <div className="max-w-[90%] rounded-2xl px-4 py-3 bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="size-3.5 text-accent-cyan" />
                <span className="text-xs font-medium text-accent-cyan">Building Plan</span>
              </div>
              <div className="space-y-2">
                {planItemsData.slice(0, planItems).map((item, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg bg-white/5 p-2">
                    <item.Icon className="size-3.5 text-accent-cyan" />
                    <span className="text-xs text-white/80">{item.text}</span>
                  </div>
                ))}
                {planItems < planItemsData.length && (
                  <div className="flex items-center gap-2 text-white/40">
                    <Loader2 className="size-3 animate-spin" />
                    <span className="text-xs">Adding recommendations...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
          <MessageSquare className="size-4 text-white/40" />
          <span className="text-sm text-white/40">Ask BioFlo anything about your health...</span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    // Animated counter
    let count = 0;
    const target = 12847;
    const interval = setInterval(() => {
      count += Math.ceil(target / 50);
      if (count >= target) {
        setUserCount(target);
        clearInterval(interval);
      } else {
        setUserCount(count);
      }
    }, 40);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-24 pb-20">
      {/* ============ HERO SECTION ============ */}
      <section className="relative pt-8 lg:pt-12">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Left: Copy */}
          <div className="space-y-8">
            {/* AI Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent-cyan/20 to-accent-purple/20 border border-accent-cyan/30 px-4 py-2">
              <Cpu className="size-4 text-accent-cyan" />
              <span className="text-sm font-medium bg-gradient-to-r from-accent-cyan to-accent-purple bg-clip-text text-transparent">
                Powered by Advanced AI
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-white leading-[1.1] tracking-tight">
              Your AI health coach that{" "}
              <span className="bg-gradient-to-r from-accent-cyan via-accent-purple to-accent-green bg-clip-text text-transparent">
                actually understands you
              </span>
            </h1>

            {/* Subhead */}
            <p className="text-lg text-white/70 max-w-xl leading-relaxed">
              BioFlo&apos;s cutting-edge AI analyzes your wearable data, learns your unique patterns, 
              and creates <span className="text-white font-medium">hyper-personalized health recommendations</span> in real-time. 
              No generic advice. Just intelligent insights that adapt as you do.
            </p>

            {/* AI Features */}
            <div className="flex flex-wrap gap-3">
              {[
                "Real-time data analysis",
                "Personalized recommendations",
                "Learns your patterns",
                "24/7 AI coaching",
              ].map((feature) => (
                <span
                  key={feature}
                  className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-2 text-sm text-white/70"
                >
                  <Check className="size-3.5 text-accent-green" />
                  {feature}
                </span>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/sign-up"
                className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent-cyan to-accent-purple px-8 py-4 text-base font-semibold text-white transition-all hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(93,239,251,0.4)]"
              >
                Start free trial
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/chat"
                className="group inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-4 text-base font-medium text-white/80 transition hover:bg-white/10"
              >
                <MessageSquare className="size-4" />
                Try the AI coach
              </Link>
            </div>

            {/* Trust */}
            <div className="flex items-center gap-6 pt-2 text-sm text-white/50">
              <span className="flex items-center gap-2">
                <Check className="size-4 text-accent-green" />
                No credit card required
              </span>
              <span className="flex items-center gap-2">
                <Shield className="size-4 text-accent-green" />
                HIPAA compliant
              </span>
            </div>
          </div>

          {/* Right: Animated AI Demo */}
          <div className="relative">
            {/* Glow effects */}
            <div className="absolute -inset-8 bg-gradient-to-r from-accent-cyan/30 via-accent-purple/20 to-accent-green/30 blur-3xl opacity-40" />
            <AnimatedAIDemo />
          </div>
        </div>
      </section>

      {/* ============ SOCIAL PROOF ============ */}
      <section>
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8">
          <div className="flex flex-wrap items-center justify-center gap-10 lg:gap-16">
            {/* Users */}
            <div className="text-center">
              <p className="text-4xl font-bold text-white">{userCount.toLocaleString()}+</p>
              <p className="text-sm text-white/50">Active users</p>
            </div>

            {/* Rating */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="size-5 fill-current" />
                ))}
              </div>
              <p className="text-sm text-white/50">4.9/5 average rating</p>
            </div>

            {/* Integrations */}
            <div className="text-center">
              <p className="text-2xl font-bold text-white">20+</p>
              <p className="text-sm text-white/50">Integrations</p>
            </div>

            <div className="hidden lg:block h-12 w-px bg-white/10" />

            {/* Integration logos */}
            <div className="flex items-center gap-3">
              {["Ultrahuman", "Oura", "WHOOP", "Apple Watch"].map((name) => (
                <span
                  key={name}
                  className="px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs text-white/70"
                >
                  {name}
                </span>
              ))}
              <span className="text-sm text-white/50">& more</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============ AI TECHNOLOGY ============ */}
      <section className="space-y-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent-purple/10 border border-accent-purple/20 px-4 py-2 mx-auto">
            <Brain className="size-4 text-accent-purple" />
            <span className="text-sm text-accent-purple font-medium">Our AI Technology</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Intelligence that evolves with you
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            Our proprietary AI doesn&apos;t just read your data—it understands the complex relationships 
            between your sleep, stress, activity, and nutrition to deliver insights no other app can.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Pattern Recognition */}
          <div className="group rounded-3xl border border-white/10 bg-white/5 p-8 transition-all hover:border-white/20 hover:bg-white/[0.07]">
            <div className="inline-flex rounded-2xl bg-accent-cyan/10 p-4 mb-6">
              <BarChart3 className="size-6 text-accent-cyan" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Pattern Recognition</h3>
            <p className="text-white/60 leading-relaxed">
              Our AI identifies subtle patterns in your biometrics that humans miss—like how your Tuesday workouts affect your Thursday sleep.
            </p>
          </div>

          {/* Real-Time Adaptation */}
          <div className="group rounded-3xl border border-white/10 bg-white/5 p-8 transition-all hover:border-white/20 hover:bg-white/[0.07]">
            <div className="inline-flex rounded-2xl bg-accent-purple/10 p-4 mb-6">
              <Zap className="size-6 text-accent-purple" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Real-Time Adaptation</h3>
            <p className="text-white/60 leading-relaxed">
              Plans adjust instantly based on your current state. Tired morning? The AI shifts your workout. High HRV? Time for that challenging session.
            </p>
          </div>

          {/* Predictive Insights */}
          <div className="group rounded-3xl border border-white/10 bg-white/5 p-8 transition-all hover:border-white/20 hover:bg-white/[0.07]">
            <div className="inline-flex rounded-2xl bg-accent-green/10 p-4 mb-6">
              <Target className="size-6 text-accent-green" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Predictive Insights</h3>
            <p className="text-white/60 leading-relaxed">
              Get warnings before problems happen. The AI can predict energy crashes, poor sleep nights, and stress peaks hours in advance.
            </p>
          </div>
        </div>
      </section>

      {/* ============ RESULTS ============ */}
      <section className="space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            What changes when you use BioFlo
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            Real results from real users who trusted our AI with their health optimization.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Improved Sleep */}
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 p-6">
            <div className="inline-flex rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 p-3 mb-4">
              <Moon className="size-6 text-white" />
            </div>
            <p className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
              +31%
            </p>
            <p className="text-lg font-semibold text-white mt-1">Improved Sleep</p>
            <p className="text-sm text-white/50 mt-2">
              Average increase in sleep quality score within 30 days
            </p>
          </div>

          {/* Reduced Anxiety */}
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-6">
            <div className="inline-flex rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 p-3 mb-4">
              <Heart className="size-6 text-white" />
            </div>
            <p className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
              -42%
            </p>
            <p className="text-lg font-semibold text-white mt-1">Reduced Anxiety</p>
            <p className="text-sm text-white/50 mt-2">
              Users report significantly lower stress and anxiety levels
            </p>
          </div>

          {/* HRV Improvement */}
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-6">
            <div className="inline-flex rounded-2xl bg-gradient-to-br from-purple-400 to-pink-500 p-3 mb-4">
              <Activity className="size-6 text-white" />
            </div>
            <p className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              +18%
            </p>
            <p className="text-lg font-semibold text-white mt-1">Higher HRV</p>
            <p className="text-sm text-white/50 mt-2">
              Improved heart rate variability indicating better recovery
            </p>
          </div>

          {/* Retention */}
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 p-6">
            <div className="inline-flex rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 p-3 mb-4">
              <TrendingUp className="size-6 text-white" />
            </div>
            <p className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              95%
            </p>
            <p className="text-lg font-semibold text-white mt-1">Can&apos;t Live Without It</p>
            <p className="text-sm text-white/50 mt-2">
              Of users say BioFlo is essential to their daily routine
            </p>
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section className="space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Everything you need to optimize your health
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            A complete suite of AI-powered tools designed for serious health optimization.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Brain,
              title: "AI Health Coach",
              description: "24/7 access to an AI that knows your complete health history and gives personalized advice",
            },
            {
              icon: Moon,
              title: "Sleep Intelligence",
              description: "Deep analysis of sleep stages, patterns, and factors affecting your rest quality",
            },
            {
              icon: Activity,
              title: "HRV & Recovery Tracking",
              description: "Monitor your body's readiness and know exactly when to push hard or rest",
            },
            {
              icon: Target,
              title: "Smart Daily Plans",
              description: "AI-generated schedules that adapt to your energy, goals, and real-time biometrics",
            },
            {
              icon: FlaskConical,
              title: "N=1 Experiments",
              description: "Run personalized experiments to discover what actually works for YOUR body",
            },
            {
              icon: BarChart3,
              title: "Trend Analysis",
              description: "See long-term patterns and correlations you'd never spot on your own",
            },
            {
              icon: Sparkles,
              title: "Protocol Library",
              description: "Science-backed protocols for sleep, focus, recovery, and longevity",
            },
            {
              icon: Users,
              title: "Care Mode",
              description: "Smart alerts to trusted contacts if unusual patterns are detected",
            },
            {
              icon: BookOpen,
              title: "Learn Hub",
              description: "Personalized micro-lessons based on your data and health goals",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="group flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 transition-all hover:border-accent-cyan/30 hover:bg-white/[0.07]"
            >
              <div className="rounded-xl bg-accent-cyan/10 p-3 group-hover:bg-accent-cyan/20 transition-colors">
                <feature.icon className="size-5 text-accent-cyan" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
                <p className="text-sm text-white/60">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ TESTIMONIAL ============ */}
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-accent-cyan/5 via-accent-purple/5 to-accent-green/5 p-10 lg:p-14">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="flex justify-center gap-1 text-yellow-400">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="size-6 fill-current" />
            ))}
          </div>
          <blockquote className="text-xl lg:text-2xl text-white/90 leading-relaxed">
            &quot;BioFlo&apos;s AI is genuinely incredible. It noticed a correlation between my late-night 
            screen time and next-day anxiety before I ever connected the dots. Within two weeks of 
            following its recommendations, my sleep score went from 68 to 89.&quot;
          </blockquote>
          <div className="flex items-center justify-center gap-4">
            <div className="size-12 rounded-full bg-gradient-to-br from-accent-cyan to-accent-purple flex items-center justify-center text-white font-semibold text-lg">
              M
            </div>
            <div className="text-left">
              <p className="font-semibold text-white">Dr. Michael Torres</p>
              <p className="text-sm text-white/50">Physician & Biohacker</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="relative overflow-hidden rounded-3xl border border-accent-cyan/20 bg-gradient-to-br from-[#0a0a12] via-accent-cyan/5 to-accent-purple/5 p-12 lg:p-16 text-center">
        {/* Animated background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(93,239,251,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(177,149,255,0.1),transparent_50%)]" />

        <div className="relative space-y-6 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent-cyan/10 border border-accent-cyan/20 px-4 py-2">
            <Sparkles className="size-4 text-accent-cyan" />
            <span className="text-sm text-accent-cyan font-medium">Start your AI health journey</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
            Ready to let AI optimize your health?
          </h2>

          <p className="text-lg text-white/70">
            Join thousands who&apos;ve discovered what personalized, AI-powered health coaching can do.
            Your body has patterns—let our AI decode them.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              href="/sign-up"
              className="group inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-semibold text-black transition-all hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(255,255,255,0.3)]"
            >
              Start your free trial
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <p className="text-sm text-white/50 flex items-center justify-center gap-3 flex-wrap">
            <span>✓ 14-day free trial</span>
            <span>•</span>
            <span>✓ No credit card required</span>
            <span>•</span>
            <span>✓ Cancel anytime</span>
          </p>
        </div>
      </section>
    </div>
  );
}
