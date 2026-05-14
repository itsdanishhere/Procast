"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Flame, Play, ShieldAlert, Sparkles } from "lucide-react";

import { MarketingNav } from "@/components/layout/marketing-nav";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { landingFeatures, worldStages } from "@/lib/constants";
import { cn } from "@/lib/cn";

const flow = ["Task", "Focus Session", "XP", "Unlock", "Streak", "Growth"];

const testimonials = [
  {
    name: "Dakshayani, CS student",
    quote: "The map changed the feeling of studying. Missing a day finally had visible weight."
  },
  {
    name: "Poonam, exam prep",
    quote: "The question 'what are you avoiding?' makes me start the exact task I was dodging."
  },
  {
    name: "TeamProcast ( Group-19 ), founder",
    quote: "It feels less like a timer and more like a discipline game that happens to be useful."
  }
];

function ProductPreview() {
  return (
    <div className="glass-strong mx-auto mt-12 w-full max-w-6xl rounded-[28px] p-3 shadow-2xl">
      <div className="rounded-[22px] border border-white/10 bg-[#0b0d16] p-4">
        <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-danger/80" />
            <span className="h-3 w-3 rounded-full bg-amber/80" />
            <span className="h-3 w-3 rounded-full bg-mint/80" />
          </div>
          <Badge className="border-cyan/20 bg-cyan/10 text-cyan">Live dashboard preview</Badge>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-cyan">Focus Timer</p>
                <h3 className="mt-1 font-display text-2xl font-extrabold">Deep Focus Lock</h3>
              </div>
              <Badge className="border-danger/25 bg-danger/10 text-danger">Exit penalty armed</Badge>
            </div>
            <div className="mx-auto my-5 flex h-56 w-56 items-center justify-center rounded-full border border-cyan/30 bg-cyan/5 premium-ring">
              <div className="text-center">
                <p className="font-display text-5xl font-extrabold">42:18</p>
                <p className="mt-2 text-xs font-bold uppercase tracking-[0.22em] text-muted">Deep work</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button size="sm">
                <Play className="h-4 w-4" />
                Running
              </Button>
              <Button size="sm" variant="secondary">
                Focus sounds
              </Button>
              <Button size="sm" variant="danger">
                Quit warning
              </Button>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-mint">World</p>
                  <h3 className="mt-1 font-display text-xl font-extrabold">Garden protected</h3>
                </div>
                <Flame className="h-7 w-7 text-amber" />
              </div>
              <div className="world-grid mt-5 grid grid-cols-5 gap-2 rounded-2xl border border-white/10 p-3">
                {worldStages.slice(0, 10).map((stage) => (
                  <div
                    key={stage.level}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-xl border text-lg font-extrabold",
                      stage.level <= 4
                        ? "border-mint/35 bg-mint/10 text-mint"
                        : "border-white/10 bg-white/[0.035] text-white/25"
                    )}
                  >
                    {stage.symbol}
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <div className="mb-2 flex justify-between text-xs font-bold text-muted">
                  <span>Level 4</span>
                  <span>240 XP to Street</span>
                </div>
                <Progress value={64} />
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-cyan">Avoidance prompt</p>
              <p className="mt-3 rounded-xl border border-amber/20 bg-amber/10 p-4 text-sm font-bold text-amber">
                What are you avoiding right now?
              </p>
              <p className="mt-3 text-sm text-muted">Turns vague resistance into a task you can actually start.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <main>
      <MarketingNav />

      <section className="relative mx-auto max-w-7xl px-5 pb-16 pt-20 text-center sm:px-8 lg:pt-24">

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="relative"
        >
          {/* Background Watermark Layer 1 (Glow) */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 opacity-[0.24] blur-[120px]">
            <img src="/logo.png" alt="" className="h-full w-full object-contain" />
          </div>
          {/* Background Watermark Layer 2 (Defined) */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 opacity-[0.14]">
            <img src="/logo.png" alt="" className="h-full w-full object-contain" />
          </div>
          <Badge className="mb-7 border-cyan/25 bg-cyan/10 text-cyan">
            <Sparkles className="h-3.5 w-3.5" />
            Anti-procrastination discipline platform
          </Badge>
          <h1 className="mx-auto max-w-5xl font-display text-5xl font-extrabold leading-[1.02] tracking-normal sm:text-7xl">
            Stop Scrolling. <span className="gradient-text">Start Doing.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted">
            ProCast turns focus sessions into visible world growth. Start the task you are avoiding, earn XP,
            protect your streak, and watch discipline become something you do not want to lose.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), "group")}>
              Start Focusing Free
              <ArrowRight className="h-5 w-5 transition group-hover:translate-x-0.5" />
            </Link>
            <a href="#how-it-works" className={buttonVariants({ variant: "secondary", size: "lg" })}>
              See How It Works
            </a>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {["Loss aversion", "Session recovery", "World unlocks", "Reflection loops"].map((item) => (
              <Badge key={item}>{item}</Badge>
            ))}
          </div>
        </motion.div>
        <ProductPreview />
      </section>

      <section id="features" className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-cyan">Feature showcase</p>
          <h2 className="mt-3 font-display text-4xl font-extrabold">Built to attack procrastination directly.</h2>
          <p className="mt-4 text-muted">
            Every feature has one job: reduce delay, increase follow-through, and make inconsistency emotionally visible.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {landingFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="group transition hover:-translate-y-1 hover:border-cyan/30">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan/10 text-cyan">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-xl font-extrabold">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted">{feature.problem}</p>
              </Card>
            );
          })}
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="glass-strong rounded-[28px] p-6 sm:p-8">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-mint">How it works</p>
              <h2 className="mt-3 font-display text-4xl font-extrabold">A loop your brain understands in 10 seconds.</h2>
            </div>
            <Badge className="border-mint/25 bg-mint/10 text-mint">Task → Focus → Growth</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-6">
            {flow.map((step, index) => (
              <div key={step} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                <span className="text-xs font-extrabold text-cyan">0{index + 1}</span>
                <p className="mt-3 font-display text-lg font-extrabold">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="different" className="mx-auto grid max-w-7xl gap-6 px-5 py-16 sm:px-8 lg:grid-cols-2">
        <Card className="p-7">
          <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-danger">Normal apps</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold">Track work after motivation appears.</h2>
          <ul className="mt-6 space-y-3 text-sm text-muted">
            {["Task lists become guilt storage.", "Timers do not make quitting feel costly.", "Progress disappears into numbers."].map(
              (item) => (
                <li key={item} className="flex gap-3">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                  {item}
                </li>
              )
            )}
          </ul>
        </Card>
        <Card className="border-cyan/25 bg-cyan/[0.045] p-7">
          <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-cyan">ProCast</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold">Creates pressure to start before motivation arrives.</h2>
          <ul className="mt-6 space-y-3 text-sm text-muted">
            {[
              "Your world grows only when sessions are completed.",
              "Breaking discipline can lock previous unlocks again.",
              "Reflection turns distraction into a visible pattern."
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
                {item}
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.name}>
              <p className="text-base leading-7 text-foreground">"{testimonial.quote}"</p>
              <p className="mt-5 text-sm font-bold text-cyan">{testimonial.name}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="glass-strong rounded-[30px] p-8 text-center sm:p-12">
          <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-cyan">Start today</p>
          <h2 className="mx-auto mt-3 max-w-3xl font-display text-4xl font-extrabold">
            Your empty land does not build itself. One completed session starts the world.
          </h2>
          <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), "mt-8")}>
            Start Focusing Free
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#06070a] px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
            <div className="col-span-1 md:col-span-2">
              <Link href="/" className="flex items-center gap-4 font-display text-2xl font-extrabold">
                <div className="relative h-12 w-12 overflow-hidden rounded-xl">
                  <img src="/logo.png" alt="ProCast Logo" className="object-cover" />
                </div>
                ProCast
              </Link>
              <p className="mt-6 max-w-sm text-sm leading-7 text-muted">
                The intelligent anti-procrastination platform that turns focus sessions into visible world progression.
                Stop scrolling and start building your discipline today.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-foreground">Platform</h3>
              <ul className="mt-6 space-y-4 text-sm text-muted">
                <li><a href="#features" className="transition hover:text-cyan">Features</a></li>
                <li><a href="#how-it-works" className="transition hover:text-cyan">How it Works</a></li>
                <li><a href="#different" className="transition hover:text-cyan">Why ProCast?</a></li>
                <li><Link href="/timer" className="transition hover:text-cyan">Mobile Timer</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-foreground">Account</h3>
              <ul className="mt-6 space-y-4 text-sm text-muted">
                <li><Link href="/login" className="transition hover:text-cyan">Login</Link></li>
                <li><Link href="/signup" className="transition hover:text-cyan">Sign Up</Link></li>
                <li><Link href="/settings" className="transition hover:text-cyan">Settings</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-16 flex flex-col items-center justify-between gap-6 border-t border-white/10 pt-8 sm:flex-row">
            <p className="text-xs text-muted">
              © 2026 ProCast Platform. All rights reserved. Built for discipline.
            </p>
            <div className="flex gap-6 text-xs text-muted">
              <a href="#" className="hover:text-foreground">Privacy Policy</a>
              <a href="#" className="hover:text-foreground">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
