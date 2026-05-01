import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#08090f]/78 backdrop-blur-2xl">
      <nav className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-4 font-display text-2xl font-extrabold">
          <div className="relative h-14 w-14 overflow-hidden rounded-xl">
            <img src="/logo.png" alt="ProCast Logo" className="object-cover" />
          </div>
          ProCast
        </Link>
        <div className="hidden items-center gap-8 text-sm font-bold text-muted md:flex">
          <a href="/#features" className="transition hover:text-foreground">
            Features
          </a>
          <a href="/#how-it-works" className="transition hover:text-foreground">
            How it works
          </a>
          <a href="/#different" className="transition hover:text-foreground">
            Why different
          </a>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden px-4 py-2 text-sm font-bold text-muted transition hover:text-white sm:block">
            Login
          </Link>
          <Link href="/signup" className={cn(buttonVariants({ size: "sm" }), "group")}>
            Start Free
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
        </div>
      </nav>
    </header>
  );
}
