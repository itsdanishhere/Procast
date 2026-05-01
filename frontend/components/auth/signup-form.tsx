"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Rocket } from "lucide-react";
import { toast } from "sonner";

import { PasswordStrength } from "@/components/auth/password-strength";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-client";

export function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await apiFetch("/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        fullName: form.fullName,
        email: form.email,
        username: form.username,
        password: form.password,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
      })
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      const errorMsg = typeof data.error === "object" ? data.error.message || JSON.stringify(data.error) : data.error;
      setError(errorMsg || "Account creation failed.");
      return;
    }

    toast.success("Account created. Empty Land unlocked.");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="glass-strong p-7">
      <div className="mb-7 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-mint/12 text-mint">
          <Rocket className="h-7 w-7" />
        </div>
        <h2 className="font-display text-3xl font-extrabold">Create Account</h2>
        <p className="mt-2 text-sm text-muted">Start with empty land. Build from completed sessions.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-muted">Full name</span>
          <Input value={form.fullName} onChange={(event) => update("fullName", event.target.value)} required />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-muted">Email</span>
          <Input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} required />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-muted">Username</span>
          <Input value={form.username} onChange={(event) => update("username", event.target.value)} required />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-muted">Password</span>
          <Input
            type="password"
            value={form.password}
            onChange={(event) => update("password", event.target.value)}
            required
            autoComplete="new-password"
          />
          <PasswordStrength password={form.password} />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-muted">Confirm password</span>
          <Input
            type="password"
            value={form.confirmPassword}
            onChange={(event) => update("confirmPassword", event.target.value)}
            required
            autoComplete="new-password"
          />
        </label>
        {error ? <p className="rounded-xl border border-danger/25 bg-danger/10 p-3 text-sm font-bold text-danger">{error}</p> : null}
        <Button className="w-full" size="lg" disabled={loading}>
          {loading ? "Creating..." : "Create Account"}
          <ArrowRight className="h-5 w-5" />
        </Button>
      </form>
    </Card>
  );
}
