import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#08090f]/78 backdrop-blur-2xl">
      <nav className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2 font-display text-xl font-extrabold sm:gap-4 sm:text-2xl">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl sm:h-14 sm:w-14">
            <img src="/logo.png" alt="ProCast Logo" className="object-cover" />
          </div>
          <span className="truncate">ProCast</span>
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
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/login"
            className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-muted transition hover:text-white sm:border-0 sm:px-4 sm:text-sm"
          >
            Login
          </Link>
          <Link href="/signup" className={cn(buttonVariants({ size: "sm" }), "group shrink-0 px-3 text-xs sm:px-4 sm:text-sm")}>
            Start Free
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
        </div>
      </nav>
    </header>
  );
}
