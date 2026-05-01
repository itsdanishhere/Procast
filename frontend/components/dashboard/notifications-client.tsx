"use client";

import { useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/cn";

type NotificationDTO = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export function NotificationsClient({ initialNotifications }: { initialNotifications: NotificationDTO[] }) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const unread = notifications.filter((notification) => !notification.readAt).length;

  async function markAllRead() {
    const response = await apiFetch("/notifications/read", {
      method: "PATCH",
      body: JSON.stringify({})
    });
    if (!response.ok) {
      toast.error("Could not mark notifications read.");
      return;
    }
    const now = new Date().toISOString();
    setNotifications(notifications.map((notification) => ({ ...notification, readAt: notification.readAt || now })));
  }

  return (
    <div className="space-y-6">
      <Card className="glass-strong">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan/12 text-cyan">
              <Bell className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-cyan">Notification center</p>
              <h2 className="font-display text-3xl font-extrabold">Signals that protect your habit.</h2>
            </div>
          </div>
          <Button variant="secondary" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Card className="h-fit text-center">
          <p className="font-display text-5xl font-extrabold text-cyan">{unread}</p>
          <p className="mt-2 text-sm font-bold text-muted">Unread alerts</p>
        </Card>
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <Card className="p-8 text-center text-muted">No notifications yet.</Card>
          ) : (
            notifications.map((notification) => (
              <Card
                key={notification.id}
                className={cn(
                  "transition",
                  !notification.readAt && "border-cyan/25 bg-cyan/[0.045]"
                )}
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge>{notification.type.replace("_", " ")}</Badge>
                      {!notification.readAt ? <Badge className="border-cyan/25 bg-cyan/10 text-cyan">New</Badge> : null}
                    </div>
                    <h3 className="font-display text-xl font-extrabold">{notification.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{notification.body}</p>
                  </div>
                  <p className="shrink-0 text-xs font-bold text-muted">{new Date(notification.createdAt).toLocaleString()}</p>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
