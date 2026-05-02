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

  function validateForm() {
    if (form.fullName.trim().length < 2) return "Full name must be at least 2 characters.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "Enter a valid email address.";
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(form.username.trim())) {
      return "Username must be 3-30 characters and use only letters, numbers, or underscore.";
    }
    if (form.password.length < 9) return "Password must be at least 9 characters.";
    if (!/[A-Z]/.test(form.password)) return "Password must include at least one uppercase letter.";
    if (!/[0-9]/.test(form.password)) return "Password must include at least one number.";
    if (form.password !== form.confirmPassword) return "Password and confirm password must match.";
    return "";
  }

  function parseBackendError(data: any) {
    const fallback = "Account creation failed.";
    if (!data?.error) return fallback;
    if (typeof data.error === "string") return data.error;
    if (data.error.message !== "Please check the submitted fields.") return data.error.message || fallback;
    const fieldErrors = data.error?.details?.fieldErrors;
    if (!fieldErrors || typeof fieldErrors !== "object") return data.error.message || fallback;
    const orderedFields = ["fullName", "email", "username", "password", "timezone"];
    for (const field of orderedFields) {
      const messages = fieldErrors[field];
      if (Array.isArray(messages) && messages.length > 0) return String(messages[0]);
    }
    return data.error.message || fallback;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

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
      setError(parseBackendError(data));
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
            minLength={9}
            autoComplete="new-password"
          />
          <PasswordStrength password={form.password} />
          <p className="mt-2 text-xs text-muted">Use at least 9 characters, one uppercase letter, and one number.</p>
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
