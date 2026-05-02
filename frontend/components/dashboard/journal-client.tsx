"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArchiveRestore, BookOpen, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { fetchAndEmitCurrentProgress, fetchDeletedReflections, fetchReflections, normalizeReflection } from "@/lib/live-data";
import { appDataRefreshEvent, emitReflectionSaved, reflectionSavedEvent } from "@/lib/timer-events";
import type { ReflectionDTO } from "@/lib/types";

const clayIconButton =
  "inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.08] text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-10px_20px_rgba(0,0,0,0.22),0_12px_26px_rgba(0,0,0,0.26)] transition hover:border-cyan/35 hover:bg-white/[0.13] hover:text-foreground active:translate-y-[1px]";

const stopWords = new Set([
  "and",
  "the",
  "for",
  "that",
  "this",
  "with",
  "from",
  "today",
  "tomorrow",
  "will",
  "what",
  "well",
  "test",
  "more",
  "less",
  "very",
  "then",
  "than",
  "into"
]);

function topWords(reflections: ReflectionDTO[], field: "distraction" | "wentWell" | "improve" | "notes", limit = 5) {
  const counts = new Map<string, number>();
  for (const reflection of reflections) {
    const value = field === "notes" ? reflection.notes : reflection[field];
    String(value ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word))
      .forEach((word) => counts.set(word, (counts.get(word) ?? 0) + 1));
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function daysLeftInBin(deletedAt?: string | null) {
  if (!deletedAt) return 3;
  const purgeAt = new Date(deletedAt).getTime() + 3 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((purgeAt - Date.now()) / (24 * 60 * 60 * 1000)));
}

export function JournalClient({ initialReflections }: { initialReflections: ReflectionDTO[] }) {
  const [reflections, setReflections] = useState(initialReflections);
  const [deletedReflections, setDeletedReflections] = useState<ReflectionDTO[]>([]);
  const [form, setForm] = useState({ focusRating: 3, distraction: "", wentWell: "", improve: "", notes: "" });
  const [loading, setLoading] = useState(false);

  const loadReflections = useCallback(async () => {
    const [active, deleted] = await Promise.all([fetchReflections(), fetchDeletedReflections()]);
    setReflections(active);
    setDeletedReflections(deleted);
  }, []);

  const pattern = useMemo(() => {
    const distractions = topWords(reflections, "distraction", 5);
    const wins = topWords(reflections, "wentWell", 5);
    const improvements = topWords(reflections, "improve", 5);
    const notes = topWords(reflections, "notes", 5);
    const maxDistraction = Math.max(1, ...distractions.map((item) => item.count));
    const rated = reflections.filter((reflection) => typeof reflection.focusRating === "number");
    const averageFocus = rated.length
      ? Math.round((rated.reduce((sum, reflection) => sum + (reflection.focusRating ?? 0), 0) / rated.length) * 10) / 10
      : 0;
    return { distractions, wins, improvements, notes, maxDistraction, averageFocus };
  }, [reflections]);

  useEffect(() => {
    void loadReflections();
    window.addEventListener(appDataRefreshEvent, loadReflections);
    window.addEventListener(reflectionSavedEvent, loadReflections);
    return () => {
      window.removeEventListener(appDataRefreshEvent, loadReflections);
      window.removeEventListener(reflectionSavedEvent, loadReflections);
    };
  }, [loadReflections]);

  function update(field: keyof typeof form, value: string | number) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    const response = await apiFetch("/reflections", {
      method: "POST",
      body: JSON.stringify({
        focusRating: form.focusRating,
        distraction: form.distraction,
        wentWell: form.wentWell,
        improveTomorrow: form.improve,
        reflectionNotes: form.notes || undefined
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
    setForm({ focusRating: 3, distraction: "", wentWell: "", improve: "", notes: "" });
    await fetchAndEmitCurrentProgress();
    emitReflectionSaved();
    toast.success("Reflection saved.");
  }

  async function moveToRecycleBin(reflection: ReflectionDTO) {
    const response = await apiFetch(`/reflections/${reflection.id}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorMsg = typeof data.error === "object" ? data.error.message || JSON.stringify(data.error) : data.error;
      toast.error(errorMsg || "Could not delete reflection.");
      return;
    }

    const deleted = normalizeReflection(data.reflection);
    setReflections((current) => current.filter((item) => item.id !== reflection.id));
    setDeletedReflections((current) => [deleted, ...current.filter((item) => item.id !== reflection.id)]);
    toast.success("Reflection moved to recycle bin.");
  }

  async function restoreReflection(reflection: ReflectionDTO) {
    const response = await apiFetch(`/reflections/${reflection.id}/restore`, {
      method: "POST",
      body: JSON.stringify({})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorMsg = typeof data.error === "object" ? data.error.message || JSON.stringify(data.error) : data.error;
      toast.error(errorMsg || "Could not restore reflection.");
      return;
    }

    const restored = normalizeReflection(data.reflection);
    setDeletedReflections((current) => current.filter((item) => item.id !== reflection.id));
    setReflections((current) => [restored, ...current.filter((item) => item.id !== reflection.id)]);
    toast.success("Reflection restored.");
  }

  async function permanentlyDeleteReflection(reflection: ReflectionDTO) {
    const response = await apiFetch(`/reflections/${reflection.id}/permanent`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const errorMsg = typeof data.error === "object" ? data.error.message || JSON.stringify(data.error) : data.error;
      toast.error(errorMsg || "Could not permanently delete reflection.");
      return;
    }

    setDeletedReflections((current) => current.filter((item) => item.id !== reflection.id));
    toast.success("Reflection permanently deleted.");
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-5 border-b border-white/10 pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.4rem] border border-cyan/20 bg-cyan/10 text-cyan shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_18px_36px_rgba(37,99,235,0.16)]">
              <BookOpen className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-cyan">Reflection Journal</p>
              <h2 className="mt-1 font-display text-3xl font-extrabold">Pattern finder</h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-muted">
                Capture what pulled attention away, what worked, and what tomorrow should protect.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted">Entries</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-foreground">{reflections.length}</p>
            </div>
            <div className="rounded-2xl border border-cyan/15 bg-cyan/10 px-4 py-3">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-cyan">Avg focus</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-cyan">{pattern.averageFocus || "-"}</p>
            </div>
            <div className="rounded-2xl border border-amber/15 bg-amber/10 px-4 py-3">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-amber">Recycle</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-amber">{deletedReflections.length}</p>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="pt-6">
          <div className="grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)]">
            <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4">
              <span className="mb-3 block text-sm font-bold text-muted">Focus rating</span>
              <div className="grid grid-cols-5 gap-2 xl:grid-cols-1">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => update("focusRating", rating)}
                    className={cn(
                      "flex h-11 items-center justify-center rounded-full border text-sm font-extrabold transition",
                      form.focusRating === rating
                        ? "border-cyan bg-cyan text-[#071019] shadow-[0_12px_28px_rgba(37,99,235,0.24)]"
                        : "border-white/10 bg-white/[0.06] text-muted hover:border-cyan/30 hover:text-foreground"
                    )}
                  >
                    {rating}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block rounded-[1.25rem] border border-danger/15 bg-danger/[0.055] p-4">
                <span className="mb-2 block text-sm font-bold text-muted">What distracted you today?</span>
                <Textarea
                  className="min-h-24 border-danger/15 bg-[#151722]/65 focus:border-danger focus:ring-danger/15"
                  value={form.distraction}
                  onChange={(event) => update("distraction", event.target.value)}
                  required
                />
              </label>
              <label className="block rounded-[1.25rem] border border-mint/15 bg-mint/[0.055] p-4">
                <span className="mb-2 block text-sm font-bold text-muted">What went well?</span>
                <Textarea
                  className="min-h-24 border-mint/15 bg-[#151722]/65 focus:border-mint focus:ring-mint/15"
                  value={form.wentWell}
                  onChange={(event) => update("wentWell", event.target.value)}
                  required
                />
              </label>
              <label className="block rounded-[1.25rem] border border-cyan/15 bg-cyan/[0.055] p-4">
                <span className="mb-2 block text-sm font-bold text-muted">What will improve tomorrow?</span>
                <Textarea
                  className="min-h-24 border-cyan/15 bg-[#151722]/65"
                  value={form.improve}
                  onChange={(event) => update("improve", event.target.value)}
                  required
                />
              </label>
              <label className="block rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4">
                <span className="mb-2 block text-sm font-bold text-muted">Optional notes</span>
                <Textarea className="min-h-24 bg-[#151722]/65" value={form.notes} onChange={(event) => update("notes", event.target.value)} />
              </label>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-muted">Reflections feed the pattern map and future focus insights.</p>
            <Button disabled={loading} className="w-full sm:w-auto sm:min-w-56">
              <Plus className="h-4 w-4" />
              {loading ? "Saving..." : "Save Reflection"}
            </Button>
          </div>
        </form>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <Card className="min-h-[320px]">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-cyan">Pattern map</p>
              <h3 className="mt-2 font-display text-2xl font-extrabold">What your reflections are repeating.</h3>
            </div>
            <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-full border border-cyan/25 bg-cyan/10 text-cyan shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_16px_34px_rgba(37,99,235,0.16)]">
              <span className="font-display text-2xl font-extrabold">{pattern.averageFocus || "-"}</span>
              <span className="text-[9px] font-extrabold uppercase tracking-[0.12em]">focus</span>
            </div>
          </div>
          {reflections.length === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm text-muted">
              Save a few reflections to reveal distraction loops, focus wins, and tomorrow-improvement patterns.
            </p>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-3 rounded-[1.35rem] border border-danger/10 bg-danger/[0.045] p-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-danger">Distraction frequency</p>
                {pattern.distractions.length === 0 ? (
                  <p className="text-sm text-muted">No repeated distraction words yet.</p>
                ) : (
                  pattern.distractions.map((item) => (
                    <div key={item.label} className="rounded-2xl border border-danger/15 bg-[#181923]/80 p-3">
                      <div className="mb-2 flex items-center justify-between text-xs font-bold">
                        <span className="capitalize text-foreground">{item.label}</span>
                        <span className="text-danger">{item.count}x</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-danger to-amber"
                          style={{ width: `${Math.max(14, (item.count / pattern.maxDistraction) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-[1.35rem] border border-mint/15 bg-mint/[0.055] p-4">
                  <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.16em] text-mint">What works</p>
                  <div className="flex flex-wrap gap-2">
                    {pattern.wins.length ? (
                      pattern.wins.map((item) => (
                        <span key={item.label} className="rounded-full border border-mint/20 bg-mint/10 px-3 py-1.5 text-xs font-bold text-mint">
                          {item.label}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-muted">No win pattern yet.</span>
                    )}
                  </div>
                </div>
                <div className="rounded-[1.35rem] border border-cyan/15 bg-cyan/[0.055] p-4">
                  <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.16em] text-cyan">Improve next</p>
                  <div className="flex flex-wrap gap-2">
                    {pattern.improvements.length ? (
                      pattern.improvements.map((item) => (
                        <span key={item.label} className="rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1.5 text-xs font-bold text-cyan">
                          {item.label}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-muted">No improvement pattern yet.</span>
                    )}
                  </div>
                </div>
                <div className="rounded-[1.35rem] border border-amber/15 bg-amber/[0.055] p-4 sm:col-span-2 lg:col-span-1">
                  <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.16em] text-amber">Notes signal</p>
                  <div className="grid grid-cols-5 items-end gap-2">
                    {(pattern.notes.length ? pattern.notes : [{ label: "none", count: 0 }]).map((item) => (
                      <div key={item.label} className="text-center">
                        <div
                          className="mx-auto w-full rounded-t-full bg-gradient-to-t from-amber/25 to-amber"
                          style={{ height: `${item.count ? 24 + item.count * 10 : 16}px` }}
                        />
                        <p className="mt-2 truncate text-[10px] font-bold text-muted">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card className="min-h-[320px]">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-amber">Recycle bin</p>
              <h3 className="mt-2 font-display text-xl font-extrabold">Recover deleted reflections.</h3>
              <p className="mt-2 text-sm text-muted">Deleted reflections can be restored for 3 days.</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-amber/20 bg-amber/10 text-amber">
              <ArchiveRestore className="h-5 w-5" />
            </div>
          </div>
          {deletedReflections.length === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm text-muted">Recycle bin is empty.</p>
          ) : (
            <div className="space-y-3">
              {deletedReflections.map((reflection) => (
                <div key={reflection.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{reflection.distraction || reflection.notes || "Deleted reflection"}</p>
                    <p className="mt-1 text-xs font-bold text-muted">
                      Permanent deletion in {daysLeftInBin(reflection.deletedAt)} day{daysLeftInBin(reflection.deletedAt) === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button className={clayIconButton} type="button" onClick={() => void restoreReflection(reflection)} aria-label="Restore reflection">
                      <RotateCcw className="h-5 w-5" />
                    </button>
                    <button
                      className={cn(clayIconButton, "border-danger/25 bg-danger/10 text-danger hover:bg-danger/18 hover:text-danger")}
                      type="button"
                      onClick={() => void permanentlyDeleteReflection(reflection)}
                      aria-label="Permanently delete reflection"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-cyan">Reflection history</p>
            <h3 className="mt-1 font-display text-2xl font-extrabold">Saved journal entries</h3>
          </div>
          <p className="text-sm font-semibold text-muted">{reflections.length} active entr{reflections.length === 1 ? "y" : "ies"}</p>
        </div>

        {reflections.length === 0 ? (
          <Card className="p-8 text-center text-muted">No reflections yet. Complete a session or add one manually.</Card>
        ) : (
          <div className="grid gap-4">
            {reflections.map((reflection) => (
              <Card key={reflection.id} className="overflow-hidden">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-cyan">
                    {new Date(reflection.createdAt).toLocaleDateString()}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {reflection.focusRating ? <span className="rounded-full border border-amber/20 bg-amber/10 px-3 py-1 text-xs font-bold text-amber">{reflection.focusRating}/5 focus</span> : null}
                    {reflection.sessionId ? <span className="rounded-full border border-mint/20 bg-mint/10 px-3 py-1 text-xs font-bold text-mint">Session-linked</span> : null}
                    <button
                      className={cn(clayIconButton, "border-danger/25 bg-danger/10 text-danger hover:bg-danger/18 hover:text-danger")}
                      type="button"
                      onClick={() => void moveToRecycleBin(reflection)}
                      aria-label="Delete reflection"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
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
                {reflection.notes ? (
                  <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Notes</p>
                    <p className="mt-2 text-sm leading-6 text-muted">{reflection.notes}</p>
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
