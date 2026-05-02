"use client";

import { useEffect, useState } from "react";
import { Globe2, Save, ShieldCheck, UserCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { emitAppDataRefresh } from "@/lib/timer-events";

type ProfileDetails = {
  roleTitle: string;
  country: string;
  city: string;
  phone: string;
  website: string;
  focusMission: string;
  bio: string;
};

type ProfileForm = {
  fullName: string;
  username: string;
  email: string;
  timezone: string;
  roleTitle: string;
  country: string;
  city: string;
  phone: string;
  website: string;
  focusMission: string;
  bio: string;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function textValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function toForm(userPayload: unknown): ProfileForm {
  const user = asObject(userPayload);
  const profile = asObject(user.profile);
  const productivityPreferences = asObject(profile.productivityPreferences);
  const details = asObject(productivityPreferences.profileDetails) as Record<keyof ProfileDetails, unknown>;

  return {
    fullName: textValue(profile.fullName, textValue(user.username, "ProCast User")),
    username: textValue(user.username, ""),
    email: textValue(user.email, ""),
    timezone: textValue(profile.timezone, "UTC"),
    roleTitle: textValue(details.roleTitle),
    country: textValue(details.country),
    city: textValue(details.city),
    phone: textValue(details.phone),
    website: textValue(details.website),
    focusMission: textValue(details.focusMission),
    bio: textValue(details.bio)
  };
}

export function ProfileClient() {
  const [form, setForm] = useState<ProfileForm>({
    fullName: "ProCast User",
    username: "connected",
    email: "connected@procast.app",
    timezone: "UTC",
    roleTitle: "",
    country: "",
    city: "",
    phone: "",
    website: "",
    focusMission: "",
    bio: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const response = await apiFetch("/users/me");
      if (!response.ok) {
        setLoading(false);
        return;
      }
      const data = await response.json();
      setForm(toForm(data.user));
      setLoading(false);
    }

    void loadProfile();
  }, []);

  function update<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveProfile() {
    setSaving(true);
    const payload = {
      fullName: form.fullName.trim(),
      timezone: form.timezone.trim(),
      roleTitle: form.roleTitle.trim(),
      country: form.country.trim(),
      city: form.city.trim(),
      phone: form.phone.trim(),
      website: form.website.trim(),
      focusMission: form.focusMission.trim(),
      bio: form.bio.trim()
    };

    const response = await apiFetch("/users/me", {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      const errorMsg = typeof data.error === "object" ? data.error.message || JSON.stringify(data.error) : data.error;
      toast.error(errorMsg || "Could not update profile.");
      return;
    }

    emitAppDataRefresh("profile-updated");
    toast.success("Profile updated.");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
      <Card className="h-fit">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-cyan/12 text-cyan">
            <UserCircle2 className="h-9 w-9" />
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-cyan">Profile Console</p>
            <h2 className="font-display text-2xl font-extrabold">{form.fullName}</h2>
            <p className="text-sm text-muted">@{form.username}</p>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <span className="text-muted">Email</span>
            <span className="truncate pl-3 font-bold">{form.email}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <span className="text-muted">Timezone</span>
            <span className="font-bold">{form.timezone || "UTC"}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <span className="inline-flex items-center gap-2 text-muted">
              <ShieldCheck className="h-4 w-4 text-mint" />
              Account state
            </span>
            <span className="font-bold text-mint">Active</span>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-6">
          <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-cyan">User profile</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold">Edit your command identity.</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <span className="mb-2 block text-sm font-bold text-muted">Full name</span>
            <Input value={form.fullName} onChange={(event) => update("fullName", event.target.value)} disabled={loading || saving} />
          </label>
          <label className="block rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <span className="mb-2 block text-sm font-bold text-muted">Timezone (IANA)</span>
            <Input
              value={form.timezone}
              onChange={(event) => update("timezone", event.target.value)}
              placeholder="Asia/Kolkata"
              disabled={loading || saving}
            />
          </label>
          <label className="block rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <span className="mb-2 block text-sm font-bold text-muted">Role</span>
            <Input value={form.roleTitle} onChange={(event) => update("roleTitle", event.target.value)} disabled={loading || saving} />
          </label>
          <label className="block rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <span className="mb-2 block text-sm font-bold text-muted">Country</span>
            <Input value={form.country} onChange={(event) => update("country", event.target.value)} disabled={loading || saving} />
          </label>
          <label className="block rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <span className="mb-2 block text-sm font-bold text-muted">City</span>
            <Input value={form.city} onChange={(event) => update("city", event.target.value)} disabled={loading || saving} />
          </label>
          <label className="block rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <span className="mb-2 block text-sm font-bold text-muted">Phone</span>
            <Input value={form.phone} onChange={(event) => update("phone", event.target.value)} disabled={loading || saving} />
          </label>
          <label className="block rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:col-span-2">
            <span className="mb-2 flex items-center gap-2 text-sm font-bold text-muted">
              <Globe2 className="h-4 w-4 text-cyan" />
              Website
            </span>
            <Input
              value={form.website}
              onChange={(event) => update("website", event.target.value)}
              placeholder="https://example.com"
              disabled={loading || saving}
            />
          </label>
          <label className="block rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:col-span-2">
            <span className="mb-2 block text-sm font-bold text-muted">Focus mission</span>
            <Textarea
              value={form.focusMission}
              onChange={(event) => update("focusMission", event.target.value)}
              placeholder="What discipline are you building right now?"
              className="min-h-24"
              disabled={loading || saving}
            />
          </label>
          <label className="block rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:col-span-2">
            <span className="mb-2 block text-sm font-bold text-muted">Bio</span>
            <Textarea
              value={form.bio}
              onChange={(event) => update("bio", event.target.value)}
              placeholder="Add details that shape your profile."
              className="min-h-32"
              disabled={loading || saving}
            />
          </label>
        </div>

        <Button className="mt-6" onClick={saveProfile} disabled={loading || saving}>
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save profile"}
        </Button>
      </Card>
    </div>
  );
}
