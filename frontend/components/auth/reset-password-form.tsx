"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { KeyRound } from "lucide-react";

import { PasswordStrength } from "@/components/auth/password-strength";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-client";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await apiFetch("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password })
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      const errorMsg = typeof data.error === "object" ? data.error.message || JSON.stringify(data.error) : data.error;
      setError(errorMsg || "Could not reset password.");
      return;
    }

    setDone(true);
  }

  return (
    <Card className="glass-strong p-7">
      <div className="mb-7 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-mint/12 text-mint">
          <KeyRound className="h-7 w-7" />
        </div>
        <h2 className="font-display text-3xl font-extrabold">Set New Password</h2>
        <p className="mt-2 text-sm text-muted">Reset links expire in 15 minutes.</p>
      </div>

      {done ? (
        <div className="space-y-4 text-center">
          <p className="rounded-2xl border border-mint/20 bg-mint/10 p-4 text-sm font-bold text-mint">
            Password updated. You can now log in.
          </p>
          <Link href="/login" className="text-sm font-bold text-cyan">
            Return to login
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {!token ? (
            <p className="rounded-xl border border-danger/25 bg-danger/10 p-3 text-sm font-bold text-danger">
              Missing reset token. Request a fresh link.
            </p>
          ) : null}
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-muted">New password</span>
            <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            <PasswordStrength password={password} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-muted">Confirm new password</span>
            <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
          </label>
          {error ? <p className="rounded-xl border border-danger/25 bg-danger/10 p-3 text-sm font-bold text-danger">{error}</p> : null}
          <Button className="w-full" size="lg" disabled={loading || !token}>
            {loading ? "Updating..." : "Update Password"}
          </Button>
        </form>
      )}
    </Card>
  );
}
