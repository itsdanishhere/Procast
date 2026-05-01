"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-client";

export function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password })
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error || "Login failed.");
      return;
    }

    toast.success("Session restored.");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="glass-strong p-7">
      <div className="mb-7 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan/12 text-cyan">
          <LockKeyhole className="h-7 w-7" />
        </div>
        <h2 className="font-display text-3xl font-extrabold">Welcome Back</h2>
        <p className="mt-2 text-sm text-muted">Pick up where your world stopped growing.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-muted">Email or username</span>
          <Input value={identifier} onChange={(event) => setIdentifier(event.target.value)} required autoComplete="username" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-muted">Password</span>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        <div className="flex items-center justify-between gap-3 text-sm">
          <label className="flex items-center gap-2 font-bold text-muted">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="h-4 w-4 accent-cyan"
            />
            Remember session
          </label>
          <Link href="/forgot-password" className="font-bold text-cyan hover:underline">
            Forgot password?
          </Link>
        </div>
        {error ? <p className="rounded-xl border border-danger/25 bg-danger/10 p-3 text-sm font-bold text-danger">{error}</p> : null}
        <Button className="w-full" size="lg" disabled={loading}>
          {loading ? "Checking..." : "Login"}
          <ArrowRight className="h-5 w-5" />
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        No account?{" "}
        <Link href="/signup" className="font-bold text-cyan">
          Sign up
        </Link>
      </p>
    </Card>
  );
}
