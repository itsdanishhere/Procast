import Link from "next/link";

import { MarketingNav } from "@/components/layout/marketing-nav";

export function AuthShell({
  children,
  eyebrow,
  title,
  copy
}: {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
  copy: string;
}) {
  return (
    <main>
      <MarketingNav />
      <section className="mx-auto grid min-h-[calc(100vh-72px)] max-w-6xl items-center gap-8 px-5 py-12 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <div className="max-lg:hidden">
          <p className="mb-4 text-sm font-extrabold uppercase tracking-[0.22em] text-cyan">{eyebrow}</p>
          <h1 className="font-display text-5xl font-extrabold leading-[1.05]">
            {title} <span className="gradient-text">before delay wins.</span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-muted">{copy}</p>
          <div className="mt-8 grid max-w-md grid-cols-2 gap-3">
            {["World progression", "Streak pressure", "Focus recovery", "Reflection loops"].map((item) => (
              <div key={item} className="glass rounded-2xl px-4 py-3 text-sm font-bold text-muted">
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="mx-auto w-full max-w-md">
          {children}
          <p className="mt-6 text-center text-xs text-muted">
            By continuing, you agree to build discipline with honest session tracking.{" "}
            <Link href="/" className="font-bold text-cyan">
              Learn more
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
