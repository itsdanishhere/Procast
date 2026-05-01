"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { BookOpen, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api-client";
import { fetchAndEmitCurrentProgress, fetchReflections, normalizeReflection } from "@/lib/live-data";
import { appDataRefreshEvent, emitReflectionSaved, reflectionSavedEvent } from "@/lib/timer-events";
import type { ReflectionDTO } from "@/lib/types";

export function JournalClient({ initialReflections }: { initialReflections: ReflectionDTO[] }) {
  const [reflections, setReflections] = useState(initialReflections);
  const [form, setForm] = useState({ distraction: "", wentWell: "", improve: "" });
  const [loading, setLoading] = useState(false);

  const loadReflections = useCallback(async () => {
    setReflections(await fetchReflections());
  }, []);

  useEffect(() => {
    void loadReflections();
    window.addEventListener(appDataRefreshEvent, loadReflections);
    window.addEventListener(reflectionSavedEvent, loadReflections);
    return () => {
      window.removeEventListener(appDataRefreshEvent, loadReflections);
      window.removeEventListener(reflectionSavedEvent, loadReflections);
    };
  }, [loadReflections]);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    const response = await apiFetch("/reflections", {
      method: "POST",
      body: JSON.stringify({
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

    setReflections((current) => [normalizeReflection(data.reflection), ...current.filter((item) => item.id !== data.reflection.id)]);
    setForm({ distraction: "", wentWell: "", improve: "" });
    await fetchAndEmitCurrentProgress();
    emitReflectionSaved();
    toast.success("Reflection saved.");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <Card className="h-fit">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan/10 text-cyan">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-cyan">Reflection Journal</p>
            <h2 className="font-display text-2xl font-extrabold">Pattern finder</h2>
          </div>
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
          <Button disabled={loading} className="w-full">
            <Plus className="h-4 w-4" />
            {loading ? "Saving..." : "Save Reflection"}
          </Button>
        </form>
      </Card>

      <div className="space-y-4">
        {reflections.length === 0 ? (
          <Card className="p-8 text-center text-muted">No reflections yet. Complete a session or add one manually.</Card>
        ) : (
          reflections.map((reflection) => (
            <Card key={reflection.id}>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-cyan">
                  {new Date(reflection.createdAt).toLocaleDateString()}
                </p>
                {reflection.sessionId ? <span className="text-xs font-bold text-mint">Session-linked</span> : null}
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-danger/20 bg-danger/10 p-4">
                  <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-danger">Distraction</p>
                  <p className="mt-2 text-sm leading-6 text-muted">{reflection.distraction}</p>
                </div>
                <div className="rounded-2xl border border-mint/20 bg-mint/10 p-4">
                  <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-mint">Went well</p>
                  <p className="mt-2 text-sm leading-6 text-muted">{reflection.wentWell}</p>
                </div>
                <div className="rounded-2xl border border-cyan/20 bg-cyan/10 p-4">
                  <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-cyan">Improve</p>
                  <p className="mt-2 text-sm leading-6 text-muted">{reflection.improve}</p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
