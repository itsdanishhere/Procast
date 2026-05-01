"use client";

import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api-client";

export function ReflectionModal({
  open,
  sessionId,
  onClose
}: {
  open: boolean;
  sessionId: string | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ distraction: "", wentWell: "", improve: "" });
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    const response = await apiFetch("/reflections", {
      method: "POST",
      body: JSON.stringify({
        focusSessionId: sessionId,
        distraction: form.distraction,
        wentWell: form.wentWell,
        improveTomorrow: form.improve
      })
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      const errorMsg = typeof data.error === "object" ? data.error.message || JSON.stringify(data.error) : data.error;
      toast.error(errorMsg || "Could not save reflection.");
      return;
    }

    toast.success("Reflection saved. +8 XP for self-awareness.");
    setForm({ distraction: "", wentWell: "", improve: "" });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="glass-strong w-full max-w-xl rounded-[28px] p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-cyan">Post-session reflection</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold">Lock in the lesson.</h2>
            <p className="mt-2 text-sm text-muted">This is where distraction patterns stop hiding.</p>
          </div>
          <Button size="icon" variant="secondary" onClick={onClose} aria-label="Close reflection">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-muted">What distracted you today?</span>
            <Textarea value={form.distraction} onChange={(event) => update("distraction", event.target.value)} required />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-muted">What went well?</span>
            <Textarea value={form.wentWell} onChange={(event) => update("wentWell", event.target.value)} required />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-muted">What will improve tomorrow?</span>
            <Textarea value={form.improve} onChange={(event) => update("improve", event.target.value)} required />
          </label>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Skip
            </Button>
            <Button disabled={loading}>{loading ? "Saving..." : "Save Reflection"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
