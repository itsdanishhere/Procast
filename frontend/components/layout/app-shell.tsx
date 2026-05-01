"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Settings, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { appNav } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { normalizeProgress } from "@/lib/progress-dto";
import type { ProgressDTO } from "@/lib/types";

type ShellUser = {
  fullName: string;
  username: string;
  progress?: ProgressDTO | null;
};

export function AppShell({ user: initialUser, children }: { user: ShellUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(initialUser);

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await apiFetch("/users/me");
        if (response.ok) {
          const data = await response.json();
          const mergedProgress = normalizeProgress(data.user.progress, data.user.streak, initialUser.progress ?? undefined);
          setUser({
            fullName: data.user.profile?.fullName || data.user.username,
            username: data.user.username,
            progress: mergedProgress
          });
        } else if (response.status === 401) {
          toast.error("Please log in to continue.");
          router.replace("/login");
        }
      } catch (e) {
        console.error("AppShell user load failed", e);
      }
    }
    loadUser();
  }, [initialUser.progress, router]);

  useEffect(() => {
    function updateProgress(event: Event) {
      const progress = (event as CustomEvent<ProgressDTO>).detail;
      setUser((current) => ({ ...current, progress }));
    }

    window.addEventListener("procast:progress-updated", updateProgress);
    return () => window.removeEventListener("procast:progress-updated", updateProgress);
  }, []);

  async function logout() {
    await apiFetch("/auth/logout", { method: "POST" });
    toast.success("Logged out.");
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen">
      <aside className="fixed bottom-0 left-0 top-0 z-40 hidden w-72 border-r border-white/10 bg-[#08090f]/82 p-5 backdrop-blur-2xl lg:block">
        <Link href="/dashboard" className="mb-10 flex items-center gap-4 font-display text-2xl font-extrabold">
          <div className="relative h-16 w-16 overflow-hidden rounded-xl">
            <img src="/logo.png" alt="ProCast Logo" className="object-cover" />
          </div>
          ProCast
        </Link>

        <div className="glass mb-5 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan/15 font-display text-lg font-extrabold text-cyan">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold">{user.fullName}</p>
              <p className="truncate text-xs text-muted">@{user.username}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white/[0.05] p-2">
              <p className="text-xs text-muted">Lvl</p>
              <p className="font-display font-extrabold text-cyan">{user.progress?.currentLevel ?? 1}</p>
            </div>
            <div className="rounded-xl bg-white/[0.05] p-2">
              <p className="text-xs text-muted">XP</p>
              <p className="font-display font-extrabold text-mint">{user.progress?.totalXp ?? 0}</p>
            </div>
            <div className="rounded-xl bg-white/[0.05] p-2">
              <p className="text-xs text-muted">Streak</p>
              <p className="font-display font-extrabold text-amber">{user.progress?.dailyStreak ?? 0}</p>
            </div>
          </div>
        </div>

        <nav className="space-y-1">
          {appNav.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-muted transition",
                  active && "bg-cyan/12 text-cyan shadow-[inset_0_0_0_1px_rgba(99,179,237,0.22)]",
                  !active && "hover:bg-white/[0.06] hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-muted transition",
              pathname === "/settings" && "bg-cyan/12 text-cyan",
              pathname !== "/settings" && "hover:bg-white/[0.06] hover:text-foreground"
            )}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </nav>

        <div className="absolute bottom-5 left-5 right-5">
          <Button variant="secondary" className="w-full justify-start" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#08090f]/78 backdrop-blur-2xl lg:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-3 font-display text-xl font-extrabold">
            <div className="relative h-12 w-12 overflow-hidden rounded-xl">
              <img src="/logo.png" alt="ProCast Logo" className="object-cover" />
            </div>
            ProCast
          </Link>
          <Button size="icon" variant="secondary" onClick={logout} aria-label="Logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2 overflow-x-auto px-4 pb-3">
          {appNav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-muted",
                  active && "border-cyan/40 bg-cyan/12 text-cyan"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </header>

      <main className="lg:pl-72">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.2em] text-cyan">
                <Sparkles className="h-4 w-4" />
                Discipline OS
              </p>
              <h1 className="mt-2 font-display text-3xl font-extrabold tracking-normal sm:text-4xl">
                Build your world by finishing what you avoid.
              </h1>
            </div>
            <Link href="/timer" className="rounded-full border border-mint/30 bg-mint/10 px-4 py-2 text-sm font-bold text-mint">
              Mobile Timer View
            </Link>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
