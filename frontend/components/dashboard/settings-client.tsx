"use client";

import { useState } from "react";
import { Bell, Headphones, Save, ShieldAlert, UserCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-client";
import type { SettingsDTO } from "@/lib/types";

export function SettingsClient({
  user,
  initialSettings
}: {
  user: { fullName: string; email: string; username: string; emailVerified: boolean };
  initialSettings: SettingsDTO;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof SettingsDTO>(key: K, value: SettingsDTO[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    const response = await apiFetch("/users/me", {
      method: "PATCH",
      body: JSON.stringify(settings)
    });
    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      const errorMsg = typeof data.error === "object" ? data.error.message || JSON.stringify(data.error) : data.error;
      toast.error(errorMsg || "Could not save settings.");
      return;
    }

    setSettings(data.settings);
    toast.success("Settings saved.");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <Card className="h-fit">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-cyan/12 text-cyan">
            <UserCircle className="h-9 w-9" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-extrabold">{user.fullName}</h2>
            <p className="text-sm text-muted">@{user.username}</p>
          </div>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <span className="text-muted">Email</span>
            <span className="font-bold">{user.email}</span>
          </div>
          <div className="flex justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <span className="text-muted">Verification</span>
            <Badge className={user.emailVerified ? "border-mint/25 bg-mint/10 text-mint" : "border-amber/25 bg-amber/10 text-amber"}>
              {user.emailVerified ? "Verified" : "Ready"}
            </Badge>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-6">
          <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-cyan">Product settings</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold">Tune your discipline system.</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <span className="mb-2 flex items-center gap-2 text-sm font-bold text-muted">
              <ShieldAlert className="h-4 w-4 text-amber" />
              Daily focus goal
            </span>
            <Input
              type="number"
              min={1}
              max={12}
              value={settings.dailyFocusGoal}
              onChange={(event) => update("dailyFocusGoal", Number(event.target.value))}
            />
          </label>
          <label className="block rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <span className="mb-2 flex items-center gap-2 text-sm font-bold text-muted">
              <Headphones className="h-4 w-4 text-cyan" />
              Deep focus minutes
            </span>
            <Input
              type="number"
              min={30}
              max={120}
              value={settings.deepFocusMinutes}
              onChange={(event) => update("deepFocusMinutes", Number(event.target.value))}
            />
          </label>
          <label className="block rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <span className="mb-2 flex items-center gap-2 text-sm font-bold text-muted">
              <Bell className="h-4 w-4 text-mint" />
              Reminder hour
            </span>
            <Input
              type="number"
              min={0}
              max={23}
              value={settings.notificationHour}
              onChange={(event) => update("notificationHour", Number(event.target.value))}
            />
          </label>
          <label className="block rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <span className="mb-2 block text-sm font-bold text-muted">Ambient sound</span>
            <select
              value={settings.preferredAmbientSound}
              onChange={(event) => update("preferredAmbientSound", event.target.value)}
              className="h-11 w-full rounded-xl border border-white/10 bg-[#11131d] px-4 text-sm text-foreground"
            >
              <option value="rain">Rain</option>
              <option value="brown-noise">Brown noise</option>
              <option value="lofi">Lo-fi</option>
              <option value="silence">Silence</option>
            </select>
          </label>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            ["remindersEnabled", "Smart reminders"],
            ["focusSoundsEnabled", "Focus sounds"],
            ["lockBackEnabled", "Lock-back pressure"]
          ].map(([key, label]) => (
            <label key={key} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm font-bold text-muted">
              {label}
              <input
                type="checkbox"
                checked={Boolean(settings[key as keyof SettingsDTO])}
                onChange={(event) => update(key as keyof SettingsDTO, event.target.checked as never)}
                className="h-5 w-5 accent-cyan"
              />
            </label>
          ))}
        </div>

        <Button className="mt-6" onClick={save} disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save settings"}
        </Button>
      </Card>
    </div>
  );
}
