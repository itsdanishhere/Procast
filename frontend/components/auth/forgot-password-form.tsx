"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState<{ message: string; devResetLink?: string; devResetUrl?: string } | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await apiFetch("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email })
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError("An error occurred. Please check your email or try again later.");
      return;
    }

    setSent({
      ...data,
      message: data.message || "If that account exists, a reset link is ready."
    });
  }

  return (
    <Card className="glass-strong p-7">
      <div className="mb-7 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan/12 text-cyan">
          <MailCheck className="h-7 w-7" />
        </div>
        <h2 className="font-display text-3xl font-extrabold">Forgot Password?</h2>
        <p className="mt-2 text-sm text-muted">Generate a time-boxed reset link for your account.</p>
      </div>

      {sent ? (
        <div className="space-y-4 text-center">
          <p className="rounded-2xl border border-mint/20 bg-mint/10 p-4 text-sm font-bold text-mint">{sent.message}</p>
          {sent.devResetLink || sent.devResetUrl ? (
            <a href={sent.devResetLink || sent.devResetUrl} className="block rounded-2xl border border-cyan/20 bg-cyan/10 p-4 text-sm font-bold text-cyan">
              Open development reset link
            </a>
          ) : null}
          <Link href="/login" className="text-sm font-bold text-cyan">
            Back to login
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-muted">Email</span>
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          {error ? <p className="rounded-xl border border-danger/25 bg-danger/10 p-3 text-sm font-bold text-danger">{error}</p> : null}
          <Button className="w-full" size="lg" disabled={loading}>
            {loading ? "Preparing..." : "Send Reset Link"}
          </Button>
        </form>
      )}
    </Card>
  );
}
