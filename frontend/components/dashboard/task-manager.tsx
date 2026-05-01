"use client";

import { FormEvent, useMemo, useState } from "react";
import { CalendarDays, Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-client";
import type { TaskDTO } from "@/lib/types";
import { cn } from "@/lib/cn";

const priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export function TaskManager({ tasks, onTasksChange }: { tasks: TaskDTO[]; onTasksChange: (tasks: TaskDTO[]) => void }) {
  const [title, setTitle] = useState("");
  const [avoidance, setAvoidance] = useState("");
  const [priority, setPriority] = useState<(typeof priorities)[number]>("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);

  const stats = useMemo(() => {
    const completed = tasks.filter((task) => task.status === "COMPLETED").length;
    return { completed, total: tasks.length };
  }, [tasks]);

  async function addTask(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setLoading(true);

    const response = await apiFetch("/tasks", {
      method: "POST",
      body: JSON.stringify({
        title,
        avoidancePrompt: avoidance,
        priority,
        dueAt: dueDate ? new Date(dueDate).toISOString() : undefined,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      })
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      toast.error(data.error || "Could not add task.");
      return;
    }

    onTasksChange([
      {
        ...data.task,
        dueDate: data.task.dueDate,
        completedAt: data.task.completedAt,
        createdAt: data.task.createdAt
      },
      ...tasks
    ]);
    setTitle("");
    setAvoidance("");
    setTags("");
    toast.success("Task added. Avoidance is now visible.");
  }

  async function updateTask(taskId: string, payload: Partial<TaskDTO>) {
    const response = await apiFetch(`/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!response.ok) {
      toast.error(data.error || "Could not update task.");
      return;
    }

    onTasksChange(tasks.map((task) => (task.id === taskId ? { ...task, ...data.task } : task)));
    if (payload.status === "COMPLETED") toast.success("Task completed. +12 XP added.");
  }

  async function deleteTask(taskId: string) {
    const response = await apiFetch(`/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "DELETED" })
    });
    if (!response.ok) {
      toast.error("Could not delete task.");
      return;
    }
    onTasksChange(tasks.filter((task) => task.id !== taskId));
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Task Manager</CardTitle>
          <CardDescription>Confront avoidance before planning. This is where procrastination loses shape.</CardDescription>
        </div>
        <Badge>
          {stats.completed}/{stats.total} done
        </Badge>
      </CardHeader>

      <form onSubmit={addTask} className="mb-5 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
        <label className="mb-3 block">
          <span className="mb-2 block text-sm font-extrabold text-amber">What are you avoiding right now?</span>
          <Input value={avoidance} onChange={(event) => setAvoidance(event.target.value)} placeholder="e.g. starting the math assignment" />
        </label>
        <div className="grid gap-3 md:grid-cols-[1fr_150px]">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Turn it into a concrete task" required />
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value as typeof priority)}
            className="h-11 rounded-xl border border-white/10 bg-[#11131d] px-4 text-sm font-bold text-foreground outline-none"
          >
            {priorities.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-[180px_1fr_auto]">
          <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          <Input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="tags: study, thesis" />
          <Button disabled={loading}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </form>

      <div className="focus-scrollbar max-h-[420px] space-y-3 overflow-y-auto pr-1">
        {tasks.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-center text-sm text-muted">
            No tasks yet. Add the thing you are delaying.
          </p>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition",
                task.status === "COMPLETED" && "opacity-60"
              )}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => updateTask(task.id, { status: task.status === "COMPLETED" ? "ACTIVE" : "COMPLETED" })}
                  className={cn(
                    "mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition",
                    task.status === "COMPLETED" ? "border-mint bg-mint/15 text-mint" : "border-white/15 text-transparent hover:text-cyan"
                  )}
                >
                  <Check className="h-4 w-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={cn("font-bold", task.status === "COMPLETED" && "line-through")}>{task.title}</p>
                    <Badge className="px-2 py-0.5">{task.priority}</Badge>
                  </div>
                  {task.avoidance ? <p className="mt-1 text-sm text-amber">Avoidance: {task.avoidance}</p> : null}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
                    {task.dueDate ? (
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    ) : null}
                    {task.tags.map((tag) => (
                      <span key={tag}>#{tag}</span>
                    ))}
                  </div>
                </div>
                <button type="button" onClick={() => deleteTask(task.id)} className="text-white/35 transition hover:text-danger">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
